import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  Input,
  FormGroup,
  Label,
  Button,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  UncontrolledTooltip
} from "reactstrap";
import classnames from 'classnames';

//Import Date Picker
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

//Import Breadcrumb
import Breadcrumbs from "../../components/Common/Breadcrumb"
import api from '../../helpers/api';
import { useNavigate, useLocation } from 'react-router-dom';
import TableContainer from '../../components/Common/TableContainer';
import { format } from 'date-fns';
import CustomAlert from '../../components/Common/CustomAlert';
import Pending from './pending';
import Completed from './completed';

const Settings = () => {
  //meta title
  document.title="Settings";

  const navigate = useNavigate();
  const location = useLocation();
  // Redirect to dashboard if role_id is 2 or 3
  const authUser = sessionStorage.getItem("authUser");
  if (authUser) {
    try {
      const obj = JSON.parse(authUser);
      if (obj && (obj.role_id === 2 || obj.role_id === 3)) {
        navigate("/dashboard", { replace: true });
        return null;
      }
    } catch (e) {}
  }

  // Tabs state
  const [activeTab, setActiveTab] = useState('1');

  // Initialize active tab from query (?tab=completed|pending) or navigation state
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const tabParam = params.get('tab') || (location.state && location.state.activeTab);
      if (tabParam) {
        const normalized = String(tabParam).toLowerCase();
        if (normalized === 'completed' || normalized === '2') setActiveTab('2');
        else if (normalized === 'pending' || normalized === '1') setActiveTab('1');
      }
    } catch (e) { /* no-op */ }
  }, [location.search, location.state]);

  // Show toast when coming back from invoice generation (state or query flag)
  useEffect(() => {
    try {
      const stateFlag = location.state && location.state.invoiceGenerated;
      const params = new URLSearchParams(location.search || '');
      const queryFlag = params.get('invoiceGenerated');
      if (stateFlag || queryFlag) {
        // Force Pending tab (where toast requested) then show notification
        if (activeTab !== '1') setActiveTab('1');
        showNotification('Invoice generated successfully', 'success');
      }
    } catch (e) { /* no-op */ }
  }, [location.state, location.search]);
  // Sub-tabs for General Settings
  const [generalSubTab, setGeneralSubTab] = useState('office');

  // Holiday management by day
  const [weekHolidays, setWeekHolidays] = useState({
    Sunday: false, Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false, Saturday: false
  });
  const handleWeekHolidayChange = (day) => {
    setWeekHolidays(prev => {
      const updated = { ...prev, [day]: !prev[day] };
      return updated;
    });
  };

  // Custom day holiday
  const [customDate, setCustomDate] = useState(null);
  const [customReason, setCustomReason] = useState('');
  const [customHolidays, setCustomHolidays] = useState([]);

  // Office time state
  const [officeFromHour, setOfficeFromHour] = useState('09');
  const [officeFromMinute, setOfficeFromMinute] = useState('00');
  const [officeFromPeriod, setOfficeFromPeriod] = useState('AM');
  const [officeToHour, setOfficeToHour] = useState('06');
  const [officeToMinute, setOfficeToMinute] = useState('00');
  const [officeToPeriod, setOfficeToPeriod] = useState('PM');

  // Edit mode state
  const [editRowId, setEditRowId] = useState(null);
  const [editDate, setEditDate] = useState(null);
  const [editReason, setEditReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRowId, setDeleteRowId] = useState(null);

  // Pagination and sorting for custom holiday listing (move these to the top, before any function that uses them)
  const [customPageSize, setCustomPageSize] = useState(10);
  const [customCurrentPage, setCustomCurrentPage] = useState(1);
  const [customSortBy, setCustomSortBy] = useState('ch_date');
  const [customSortOrder, setCustomSortOrder] = useState('desc');
  const [customSearch, setCustomSearch] = useState('');
  const [customTotalRecords, setCustomTotalRecords] = useState(0);
  const [customLastPage, setCustomLastPage] = useState(1);

  // Add TanStack Table sorting state
  const [sorting, setSorting] = useState([
    { id: customSortBy, desc: customSortOrder === 'desc' }
  ]);

  // Keep TanStack Table sorting state in sync with backend sort fields
  useEffect(() => {
    setSorting([{ id: customSortBy, desc: customSortOrder === 'desc' }]);
  }, [customSortBy, customSortOrder]);

  // Update sorting state and backend sort fields when user clicks header
  const handleSortingChange = (updater) => {
    let newSorting = typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(newSorting);
    if (newSorting && newSorting.length > 0) {
      setCustomSortBy(newSorting[0].id);
      setCustomSortOrder(newSorting[0].desc ? 'desc' : 'asc');
      setCustomCurrentPage(1);
    }
  };

  // Helper to get time string in HH:mm format
  const getTimeString = (hour, minute, period) => {
    let h = parseInt(hour, 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute}`;
  };

  // --- Fix: Only fetch week holidays and office time on mount ---
  useEffect(() => {
    let isMounted = true;
    api.get('/settings/week-holidays').then(res => {
      if (isMounted && res.data && typeof res.data === 'object') {
        setWeekHolidays({
          Sunday: !!res.data.Sunday,
          Monday: !!res.data.Monday,
          Tuesday: !!res.data.Tuesday,
          Wednesday: !!res.data.Wednesday,
          Thursday: !!res.data.Thursday,
          Friday: !!res.data.Friday,
          Saturday: !!res.data.Saturday
        });
      }
    });
    api.get('/settings/office-time').then(res => {
      try {
        if (res.data) {
          let fh = '09', fm = '00', th = '06', tm = '00';
          let fPeriod = 'AM', tPeriod = 'PM';
          if (res.data.from && res.data.from.includes(':')) {
            [fh, fm] = res.data.from.split(':');
            fh = fh.padStart(2, '0');
            fm = fm.padStart(2, '0');
          }
          if (res.data.f_format) fPeriod = res.data.f_format;
          if (res.data.to && res.data.to.includes(':')) {
            [th, tm] = res.data.to.split(':');
            th = th.padStart(2, '0');
            tm = tm.padStart(2, '0');
          }
          if (res.data.t_format) tPeriod = res.data.t_format;
          if (isMounted) {
            setOfficeFromHour(fh);
            setOfficeFromMinute(fm);
            setOfficeFromPeriod(fPeriod);
            setOfficeToHour(th);
            setOfficeToMinute(tm);
            setOfficeToPeriod(tPeriod);
          }
        }
      } catch (e) {
        // Log error for debugging
        console.error('Error parsing office time:', e, res.data);
      }
    });
    return () => { isMounted = false; };
  }, []); // <-- Only run once on mount

  // --- Fix: Save week holidays and office time, then refresh week holidays from API ---
  const handleSaveWeekHolidays = async () => {
    try {
      await api.post('/settings/week-holidays', weekHolidays);
      await api.post('/settings/office-time', {
        from: `${officeFromHour}:${officeFromMinute}`,
        f_format: officeFromPeriod,
        to: `${officeToHour}:${officeToMinute}`,
        t_format: officeToPeriod
      });
      // Refresh week holidays and office time from backend
      const [weekRes, officeRes] = await Promise.all([
        api.get('/settings/week-holidays'),
        api.get('/settings/office-time')
      ]);
      if (weekRes.data && typeof weekRes.data === 'object') {
        setWeekHolidays({
          Sunday: !!weekRes.data.Sunday,
          Monday: !!weekRes.data.Monday,
          Tuesday: !!weekRes.data.Tuesday,
          Wednesday: !!weekRes.data.Wednesday,
          Thursday: !!weekRes.data.Thursday,
          Friday: !!weekRes.data.Friday,
          Saturday: !!weekRes.data.Saturday
        });
      }
      if (officeRes.data) {
        let fh = '09', fm = '00', th = '06', tm = '00';
        let fPeriod = 'AM', tPeriod = 'PM';
        if (officeRes.data.from && officeRes.data.from.includes(':')) {
          [fh, fm] = officeRes.data.from.split(':');
          fh = fh.padStart(2, '0');
          fm = fm.padStart(2, '0');
        }
        if (officeRes.data.f_format) fPeriod = officeRes.data.f_format;
        if (officeRes.data.to && officeRes.data.to.includes(':')) {
          [th, tm] = officeRes.data.to.split(':');
          th = th.padStart(2, '0');
          tm = tm.padStart(2, '0');
        }
        if (officeRes.data.t_format) tPeriod = officeRes.data.t_format;
        setOfficeFromHour(fh);
        setOfficeFromMinute(fm);
        setOfficeFromPeriod(fPeriod);
        setOfficeToHour(th);
        setOfficeToMinute(tm);
        setOfficeToPeriod(tPeriod);
      }
      showNotification('Settings saved successfully!', 'success');
    } catch (e) {
      showNotification('Failed to save week holidays or office time', 'error');
      console.error('Failed to save week holidays or office time', e);
    }
  };

  const handleAddCustomHoliday = async () => {
    if (!customDate || !customReason) {
      showNotification('Please select a date and enter a reason.', 'warning');
      return;
    }
    const payload = {
      date: format(customDate, 'yyyy-MM-dd'),
      reason: customReason
    };
    try {
      await api.post('/settings/custom-holidays', payload);
      setCustomDate(null);
      setCustomReason('');
      // Always refresh the list after add using fetchCustomHolidays
      await fetchCustomHolidays(customCurrentPage, customPageSize, customSortBy, customSortOrder, customSearch);
      showNotification('Custom holiday added!');
    } catch (e) {
      if (e.response && e.response.status === 422 && e.response.data && e.response.data.message) {
        showNotification(e.response.data.message, 'error');
      } else {
        showNotification('Failed to add custom holiday', 'error');
      }
    }
  };

  // Fetch paginated/sorted custom holidays from backend
  const fetchCustomHolidays = async (page = 1, pageSize = customPageSize, sortBy = customSortBy, sortOrder = customSortOrder, search = customSearch) => {
    const params = {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
    };
    try {
      const res = await api.get('/settings/custom-holidays', { params });
      if (Array.isArray(res.data.data)) {
        setCustomHolidays(res.data.data);
        setCustomTotalRecords(res.data.total || res.data.data.length);
        setCustomLastPage(res.data.last_page || 1);
      } else {
        setCustomHolidays([]);
        setCustomTotalRecords(0);
        setCustomLastPage(1);
      }
    } catch (e) {
      setCustomHolidays([]);
      setCustomTotalRecords(0);
      setCustomLastPage(1);
      showNotification('Failed to load custom holidays', 'error');
      console.error('Failed to load custom holidays', e);
    }
  };

  useEffect(() => {
    fetchCustomHolidays(customCurrentPage, customPageSize, customSortBy, customSortOrder, customSearch);
  }, [customCurrentPage, customPageSize, customSortBy, customSortOrder, customSearch]);

  const handleEditClick = (row) => {
    // DEBUG: log the row object
    console.log('Edit clicked row:', row);
    // Use id as the unique row identifier
    const rowId = row.id;
    setEditRowId(rowId);
    let rawDate = row.ch_date;
    if (!rawDate && row.formatted_date) {
      const [d, m, y] = row.formatted_date.split('/');
      rawDate = `${y}-${m}-${d}`;
    }
    setEditDate(rawDate ? new Date(rawDate) : null);
    setEditReason(row.ch_reason || '');
  };

  const handleEditCancel = () => {
    setEditRowId(null);
    setEditDate(null);
    setEditReason('');
  };

  const handleEditSave = async (id) => {
    if (!editDate || !editReason) {
      showNotification('Please select a date and enter a reason.', 'warning');
      return;
    }
    try {
      const payload = {
        date: format(editDate, 'yyyy-MM-dd'),
        reason: editReason
      };
      console.log('PUT /settings/custom-holidays/' + id, payload); // DEBUG
      await api.put(`/settings/custom-holidays/${id}`, payload);
      setEditRowId(null);
      setEditDate(null);
      setEditReason('');
      await fetchCustomHolidays(customCurrentPage, customPageSize, customSortBy, customSortOrder, customSearch);
      showNotification('Custom holiday updated!');
    } catch (e) {
      showNotification('Failed to update custom holiday', 'error');
      console.error('Failed to update custom holiday', e);
    }
  };

  const handleDeleteCustomHoliday = async (id) => {
    setShowDeleteModal(false);
    try {
      await api.delete(`/settings/custom-holidays/${id}`);
      await fetchCustomHolidays(customCurrentPage, customPageSize, customSortBy, customSortOrder, customSearch);
      showNotification('Custom holiday deleted!');
    } catch (e) {
      showNotification('Failed to delete custom holiday', 'error');
    }
  };

  // --- Fix: Defensive TableContainer columns for custom holidays ---
  const columns = [
    {
      header: 'Date',
      accessorKey: 'ch_date',
      enableSorting: true,
      cell: row => {
        if (editRowId === row.row.original.id) {
          return (
            <DatePicker
              className="form-control"
              selected={editDate}
              onChange={setEditDate}
              dateFormat="dd/MM/yyyy"
            />
          );
        }
        // Show formatted_date if available, else ch_date
        return row.row.original.formatted_date || row.row.original.ch_date || '';
      },
    },
    {
      header: 'Reason',
      accessorKey: 'ch_reason',
      enableSorting: true,
      cell: row => {
        if (editRowId === row.row.original.id) {
          return (
            <Input
              type="text"
              value={editReason}
              onChange={e => setEditReason(e.target.value)}
              placeholder="Enter reason"
              autoFocus
            />
          );
        }
        return row.row.original.ch_reason || '';
      },
    },
    {
      header: 'Action',
      id: 'action',
      enableSorting: false,
      cell: row => {
        const rowId = row.row.original.id;
        if (editRowId === rowId) {
          return (
            <div className="d-flex gap-2">
              <button className="examcode-update-btn"  onClick={() => handleEditSave(rowId)}>Update</button>
              <button className="examcode-cancel-btn" onClick={handleEditCancel}>Cancel</button>
            </div>
          );
        }
        return (
          <div className="gap-2">
            <button
              type="button"
              className="examcode-action-btn edit"
              title="Edit"
              onClick={e => { e.preventDefault(); handleEditClick(row.row.original); }}
            >
              <i className="mdi mdi-pencil-outline"></i>
            </button>
            {/* <button
              className="examcode-action-btn"
              style={{ background: '#FFEBEE', border: 'none', borderRadius: 6, padding: '6px 10px', color: '#D32F2F', display: 'flex', alignItems: 'center' }}
              onClick={() => { setDeleteRowId(rowId); setShowDeleteModal(true); }}
              title="Delete"
            > */}

              <button
              type="button"
              className="examcode-action-btn delete"
              title="Delete"
              onClick={e => { e.preventDefault(); setDeleteRowId(rowId); setShowDeleteModal(true); }}
            >
              <i className="mdi mdi-delete-outline"></i>
            </button>
       
          </div>
        );
      },
    },
  ];

  // Notification state and handlers
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  return (
    <>
      <style>{`
        .examcode-header-bar { width: 100vw; background: #fff; box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08); border-radius: 0 0 18px 18px; padding: 32px 32px 0 32px; display: flex; flex-direction: column; align-items: center; gap: 0; }
        .examcode-title-text { font-size: 2.1rem; font-weight: 700; color: #1a2942; margin-bottom: 0.5rem; letter-spacing: 0.01em; text-align: center; }
        .examcode-title-divider { width: 60px; height: 4px; background: #2ba8fb; border-radius: 2px; margin: 18px auto 0 auto; opacity: 0.8; }
        .examcode-form-row { width: 100vw; background: #fff; display: flex; justify-content: center; align-items: flex-end; gap: 24px; padding: 24px 32px 0 32px; }
        .examcode-form-row .form-group, .examcode-form-row .mb-2 { margin-bottom: 0 !important; }
        .examcode-input { border-radius: 10px !important; border: 1.5px solid #e3e6ef !important; box-shadow: 0 1.5px 8px rgba(44,62,80,0.04); font-size: 1.05rem; padding: 10px 16px; background: #fafdff !important; transition: border-color 0.2s; height: 44px !important; min-width: 220px; max-width: 220px; width: 100%; box-sizing: border-box; }
        .examcode-create-btn { background: #27ae60; color: #fff; border: none; border-radius: 100px; font-weight: 600; font-size: 1rem; padding: 8px 28px; box-shadow: 0 1.5px 8px rgba(44,62,80,0.04); transition: background 0.2s, box-shadow 0.2s; }
        .examcode-create-btn:hover { background: #2ecc71; box-shadow: 0 0 12px #2ecc7150; }
        .examcode-create-btn:active { background: #219150; }
        .examcode-update-btn { background: #2ba8fb; color: #fff; border: none; border-radius: 100px; font-weight: 600; font-size: 1rem; padding: 8px 28px; box-shadow: 0 1.5px 8px rgba(44,62,80,0.04); transition: background 0.2s, box-shadow 0.2s; margin-right: 8px; }
        .examcode-update-btn:hover { background: #6fc5ff; box-shadow: 0 0 12px #6fc5ff50; }
        .examcode-update-btn:active { background: #3d94cf; }
        .examcode-cancel-btn { background: #f6f8fa; color: #1a2942; border: 1.5px solid #e3e6ef; border-radius: 100px; font-weight: 600; font-size: 1rem; padding: 8px 28px; transition: background 0.2s, color 0.2s; }
        .examcode-cancel-btn:hover { background: #e3e6ef; color: #2ba8fb; }
        .examcode-cancel-btn:active { background: #d0e7fa; }
        .examcode-action-btn { border: none; background: #f6f8fa; color: #2ba8fb; border-radius: 50%; width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.25rem; box-shadow: 0 1.5px 8px rgba(44,62,80,0.04); transition: background 0.2s, color 0.2s, box-shadow 0.2s; margin-right: 4px; position: relative; }
        .examcode-action-btn.edit { color: #2ba8fb; }
        .examcode-action-btn.delete { color: #ff4d4f; }
        .examcode-action-btn:hover { background: #e3e6ef; box-shadow: 0 2px 12px rgba(44,62,80,0.10); }
        .examcode-action-btn:active { background: #d0e7fa; }
        .examcode-action-btn .mdi { margin: 0; }
        .examcode-tablebar { width: 100vw; background: #fff; display: flex; justify-content: flex-start; align-items: flex-end; gap: 16px; padding: 18px 32px 0 32px; margin-bottom: 0; border-radius: 0; box-shadow: none; }
        .examcode-table-shadow { box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08); border-radius: 18px; background: #fff; }
      `}</style>
        <div className="page-content" style={{  background: '#fff', padding: 0, width: '100vw', overflowX: 'hidden', marginTop: "0px" }}>

          <Row>
            <Col lg="12">
              <Card className="examcode-table-shadow">
                <CardBody>
                  <Nav tabs>
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === '1' })} onClick={() => setActiveTab('1')} style={{ cursor: 'pointer' }}>
                        <i className="mdi mdi-clock-outline" style={{ marginRight: 6 }}></i>
                        <span style={{ color: activeTab === '1' ? '#2ba8fb' : undefined, fontWeight: activeTab === '1' ? 'bold' : undefined }}>Pending</span>
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === '2' })} onClick={() => setActiveTab('2')} style={{ cursor: 'pointer' }}>
                        <i className="mdi mdi-check-circle-outline" style={{ marginRight: 6 }}></i>
                        <span style={{ color: activeTab === '2' ? '#2ba8fb' : undefined, fontWeight: activeTab === '2' ? 'bold' : undefined }}>Completed</span>
                      </NavLink>
                    </NavItem>
                  </Nav>
                </CardBody>
              </Card>
            </Col>
          </Row>

     

      {activeTab === '1' && <Pending />}
      {activeTab === '2' && <Completed />}
      <CustomAlert open={notification.open} message={notification.message} severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} />
    </div>
    </>
  )
}

export default Settings
