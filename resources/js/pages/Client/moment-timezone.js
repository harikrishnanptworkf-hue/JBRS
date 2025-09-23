// Utility to format date in selected timezone for backend
import { time } from 'echarts';
import moment from 'moment-timezone';

export function formatDateToTimezone(date, timezone) {
  if (!date || !timezone) return '';
  // Parse the date string first, then convert to timezone
  const m = moment(date);
  console.log(m,timezone)
  if (!m.isValid()) return '';
  return m.tz(timezone).format('YYYY-MM-DD HH:mm:ss');
}
