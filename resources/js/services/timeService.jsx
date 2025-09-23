// timeService.jsx
import { useEffect, useState } from 'react';

// Returns the current time as a Date object
export function getCurrentTime() {
  return new Date();
}

// Returns the current time as a formatted string (e.g. 'YYYY-MM-DD HH:mm:ss')
export function getCurrentTimeString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// React hook: returns the current time, updates every second
export function useLiveTime() {
  const [time, setTime] = useState(getCurrentTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}
