import { 
  MdCalendarMonth,
  MdQuestionAnswer,
  MdNotificationsActive,
  MdPersonAdd,
  MdAssessment,
  MdDashboard,
  MdQrCodeScanner,
  MdAccountBalance,
  MdSettings,
  MdRequestQuote
} from "react-icons/md";

// Centralized menu items with optional role-based visibility
// rolesExclude: array of role_ids to hide this item from
export const MENU_ITEMS = [
  { path: '/schedule', label: 'Scheduled', Icon: MdCalendarMonth, color: '#2ba8fb' },
  { path: '/enquiry', label: 'Enquiry', Icon: MdQuestionAnswer, color: '#6c5ce7' },
  { path: '/reminders', label: 'Reminder', Icon: MdNotificationsActive, color: '#ff9f43' },
  { path: '/client-create', label: 'Client Create', Icon: MdPersonAdd, color: '#00b894' },
  { path: '/report', label: 'Report', Icon: MdAssessment, color: '#0984e3' },
  { path: '/settings', label: 'Settings', Icon: MdSettings, color: '#b2bec3' },
  { path: '/dashboard', label: 'Dashboard', Icon: MdDashboard, color: '#636e72' },
  // Examcode restricted: previously redirected role_id 2 or 3 to dashboard
  { path: '/examcode', label: 'Examcode', Icon: MdQrCodeScanner, color: '#e84393', rolesExclude: [2, 3] },
  { path: '/accounts', label: 'Bank Accounts', Icon: MdAccountBalance, color: '#2d3436' },
  { path: '/invoice', label: 'Invoice', Icon: MdRequestQuote, color: '#fdcb6e' },
];

// Label map for navbar selected menu display
export const MENU_MAP = MENU_ITEMS.reduce((acc, item) => {
  acc[item.path] = item.label;
  return acc;
}, { '/': 'Dashboard' });

// Utility: filter items by roleId
export function getVisibleMenuItems(roleId) {
  return MENU_ITEMS.filter(item => {
    if (Array.isArray(item.rolesExclude) && item.rolesExclude.includes(roleId)) return false;
    return true;
  });
}
