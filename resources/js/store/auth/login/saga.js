import { put, takeEvery, fork, cancel, race, take, delay, call } from "redux-saga/effects";
import { eventChannel } from 'redux-saga';
import axios from "../../../helpers/api";
import ogaxios from "axios";

// Login Redux States
import { LOGIN_USER, LOGOUT_USER } from "./actionTypes";
import { apiError, logoutUserSuccess } from "./actions";

//Toast
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const INACTIVITY_LIMIT_MS = 60000; 

function createActivityChannel() {
  return eventChannel((emit) => {
    const handler = () => emit(true);
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel', 'visibilitychange'];
    events.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
    return () => events.forEach(ev => window.removeEventListener(ev, handler));
  });
}

// Emit a tick every intervalMs milliseconds so we can log idle seconds
function createTickChannel(intervalMs = 1000) {
  return eventChannel((emit) => {
    const id = setInterval(() => emit(Date.now()), intervalMs);
    return () => clearInterval(id);
  });
}

function clickLogoutLink() {
  try {
    const selectors = [
      'a.dropdown-item[href="/logout"]',
      'a[href="/logout"]',
      '[data-testid="logout-link"]',
      '#logout-link',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && typeof el.click === 'function') {
        el.click();
        return true;
      }
    }
  } catch (e) {}
  return false;
}

function* watchInactivity(history) {
  const activityChannel = yield call(createActivityChannel);
  const tickChannel = yield call(createTickChannel, 1000);
  let lastActivityAt = Date.now();
  const limitSeconds = Math.floor(INACTIVITY_LIMIT_MS / 1000);
  console.log(`[Inactivity] Watcher started. Limit: ${limitSeconds}s. Waiting for idle...`);
  try {
    while (true) {
      const { activity, tick } = yield race({
        activity: take(activityChannel),
        tick: take(tickChannel),
      });

      if (activity) {
        lastActivityAt = Date.now();
        console.info('[Inactivity] Activity detected. Counter reset to 0s.');
        continue;
      }

      if (tick) {
        const now = Date.now();
        const idleMs = now - lastActivityAt;
        const secondsIdle = Math.floor(idleMs / 1000);
        console.log(`[Inactivity] Idle for ${secondsIdle}s`);
        if (idleMs >= INACTIVITY_LIMIT_MS) {
          // Try to use the existing UI logout link
          const clicked = yield call(clickLogoutLink);
          if (!clicked) {
            yield put({ type: LOGOUT_USER, payload: { history } });
          }
          break;
        }
      }
    }
  } finally {
    activityChannel.close();
    tickChannel.close();
  }
}

let idleTask = null;

function* loginUser({ payload: { user, history } }) {
  try {

    // Token-based login
    const response = yield axios.post('/login', user);
    const data = response.data;

    if (data.success && data.message === 'success') {
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      const logged_user = {
        login: true,
        user_id: data.data.id,
        name: data.data.name,
        email: data.data.email,
        role_id: data.data.role_id,
      };
      sessionStorage.setItem('authUser', JSON.stringify(logged_user));
      yield put(logoutUserSuccess(logged_user));

      yield new Promise((resolve) => {
        toast.success("Login Successfully", {
          position: "top-right",
          autoClose: 3000,
          onClose: resolve,
        });
      });

      // Start inactivity tracking after successful login
      if (idleTask) {
        yield cancel(idleTask);
      }
      idleTask = yield fork(watchInactivity, history);

      history('/dashboard');
    } else {
      toast.error(data.message || 'Login failed', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  } catch (error) {
    toast.error(
      error.response?.data?.message || error.message || 'Login failed',
      { position: "top-right", autoClose: 3000 }
    );
    yield put(apiError(error));
  }
}


// Listen for token changes in other tabs and sync logout
window.addEventListener('storage', (event) => {
  if (event.key === 'auth_token' && event.newValue === null) {
    // Token was removed in another tab, force logout
    window.location.href = '/login';
  }
});

function* logoutUser({ payload: { history } }) {
  try {
    localStorage.removeItem('auth_token');
    window.localStorage.setItem('auth_token_event', Date.now().toString());
    sessionStorage.removeItem("authUser");
    if (idleTask) {
      yield cancel(idleTask);
      idleTask = null;
    }
    if (history) {
      history('/login');
    } else {
      window.location.href = '/login';
    }
  } catch (error) {
    yield put(apiError(error));
  }
}

function* authSaga() {
  // Start inactivity watcher if a session already exists on page load (e.g., refresh)
  yield fork(function* bootstrapInactivityOnLoad() {
    try {
      const hasToken = !!localStorage.getItem('auth_token');
      const hasUser = !!sessionStorage.getItem('authUser');
      if ((hasToken || hasUser) && !idleTask) {
        console.log('[Inactivity] Bootstrapping watcher from existing session.');
        idleTask = yield fork(watchInactivity, undefined);
      }
    } catch (e) {
      // no-op
    }
  });

  yield takeEvery(LOGIN_USER, loginUser);
  yield takeEvery(LOGOUT_USER, logoutUser);
}

export default authSaga;
