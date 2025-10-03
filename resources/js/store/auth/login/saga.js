import { put, takeEvery } from "redux-saga/effects";
import axios from "../../../helpers/api";
import ogaxios from "axios";

// Login Redux States
import { LOGIN_USER, LOGOUT_USER } from "./actionTypes";
import { apiError, logoutUserSuccess } from "./actions";

//Toast
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
    history('/login');
  } catch (error) {
    yield put(apiError(error));
  }
}

function* authSaga() {
  yield takeEvery(LOGIN_USER, loginUser);
  yield takeEvery(LOGOUT_USER, logoutUser);
}

export default authSaga;
