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
import { useNavigate } from 'react-router-dom';
import TableContainer from '../../components/Common/TableContainer';
import { format } from 'date-fns';
import CustomAlert from '../../components/Common/CustomAlert';
import AdminList from './agent';
import UserList from './user';

const Settings = () => {
  //meta title
  document.title="Settings";

  const navigate = useNavigate();
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
      console.log('API /settings/custom-holidays result:', res.data); // DEBUG
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

          {/* <div className="examcode-header-bar">
            <div>
              <div className="examcode-title-text">Admin Settings</div>
              <div className="examcode-title-divider"></div>
            </div>
          </div> */}
          <Row>
            <Col lg="12">
              <Card className="examcode-table-shadow">
                <CardBody>
                  <Nav tabs>
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === '1' })} onClick={() => setActiveTab('1')} style={{ cursor: 'pointer' }}>General Settings</NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === '2' })} onClick={() => setActiveTab('2')} style={{ cursor: 'pointer' }}>Agent Management</NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === '3' })} onClick={() => setActiveTab('3')} style={{ cursor: 'pointer' }}>User Management</NavLink>
                    </NavItem>
                  </Nav>
                  <TabContent activeTab={activeTab} className="pt-4">
                    <TabPane tabId="1">
                      <CardTitle className="mb-4 text-left ps-4" style={{fontSize: "1.5rem"}}>General Settings</CardTitle>
                      {/* Sub-tabs for General Settings */}
                      <div className="examcode-tablebar" style={{alignItems:'center', justifyContent: 'flex-start', display: 'flex', gap: 16, minHeight: 56, padding: '18px 32px 0 32px', width: '100%', boxSizing: 'border-box'}}>
                        <button className={generalSubTab==='office' ? 'examcode-update-btn' : 'examcode-cancel-btn'} style={{minWidth:120}} onClick={()=>setGeneralSubTab('office')}>Office Time</button>
                        <button className={generalSubTab==='holiday' ? 'examcode-update-btn' : 'examcode-cancel-btn'} style={{minWidth:180}} onClick={()=>setGeneralSubTab('holiday')}>Holiday Management</button>
                        <button className={generalSubTab==='custom' ? 'examcode-update-btn' : 'examcode-cancel-btn'} style={{minWidth:180}} onClick={()=>setGeneralSubTab('custom')}>Custom Holiday</button>
                      </div>
                      {/* Office Time Tab */}
                      {generalSubTab === 'office' && (
                        <>
                        <h5 className="ps-4" style={{marginTop: '40px',marginLeft: '17px'}}>Office time</h5>
                        <Row style={{ marginLeft: '70px', marginTop: '22px' }} className="mb-3 align-items-end g-4">
                          <Col md={6} lg={5} xl={4} className="d-flex align-items-end gap-4">
                            <div style={{ flex: 1 }}>
                              <Label>From time</Label>
                              <Row className="g-2 align-items-end">
                                <Col xs={4}>
                                  <select className="form-control" value={officeFromHour} onChange={e => setOfficeFromHour(e.target.value)}>
                                    {[...Array(12)].map((_, i) => (
                                      <option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>
                                    ))}
                                  </select>
                                </Col>
                                <Col xs={4}>
                                  <select className="form-control" value={officeFromMinute} onChange={e => setOfficeFromMinute(e.target.value)}>
                                    {[...Array(60)].map((_, i) => (
                                      <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                                    ))}
                                  </select>
                                </Col>
                                <Col xs={4}>
                                  <select className="form-control" value={officeFromPeriod} onChange={e => setOfficeFromPeriod(e.target.value)}>
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                  </select>
                                </Col>
                              </Row>
                            </div>
                            <div style={{ flex: 1 }}>
                              <Label>To time</Label>
                              <Row className="g-2 align-items-end">
                                <Col xs={4}>
                                  <select className="form-control" value={officeToHour} onChange={e => setOfficeToHour(e.target.value)}>
                                    {[...Array(12)].map((_, i) => (
                                      <option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>
                                    ))}
                                  </select>
                                </Col>
                                <Col xs={4}>
                                  <select className="form-control" value={officeToMinute} onChange={e => setOfficeToMinute(e.target.value)}>
                                    {[...Array(60)].map((_, i) => (
                                      <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                                    ))}
                                  </select>
                                </Col>
                                <Col xs={4}>
                                  <select className="form-control" value={officeToPeriod} onChange={e => setOfficeToPeriod(e.target.value)}>
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                  </select>
                                </Col>
                              </Row>
                            </div>
                          </Col>
                        </Row>
                        <div style={{ marginLeft: '500px', marginTop: '20px'}}>
                          <button className="examcode-save-btn examcode-create-btn btn btn-secondary"  onClick={handleSaveWeekHolidays} type="button">Save</button>
                        </div>
                        </>
                      )}
                      {/* Holiday Management Tab */}
                      {generalSubTab === 'holiday' && (
                        <>
                        <h5 className="ps-4" style={{marginTop: '40px',marginLeft: '17px'}}>Holiday management by day</h5>
                        <Row style={{ marginLeft: '70px', marginTop: '22px' }} className="mb-3 align-items-center">
                          <Col md={8} lg={6} xl={5}>
                            <ul className="list-group list-group-flush">
                              {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => (
                                <li key={day} className="list-group-item d-flex align-items-center gap-3 py-2 px-0 border-0">
                                  <input
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    id={`chk-${day}`}
                                    checked={weekHolidays[day]}
                                    onChange={() => handleWeekHolidayChange(day)}
                                  />
                                  <label className="form-check-label" htmlFor={`chk-${day}`}>{day}</label>
                                </li>
                              ))}
                            </ul>
                          </Col>
                        </Row>
                        <div style={{ marginLeft: '500px', marginTop: '20px'}}>
                          <button className=" examcode-create-btn btn btn-secondary"  onClick={handleSaveWeekHolidays} type="button">Save</button>
                        </div>
                        </>
                      )}
                      {/* Custom Holiday Tab */}
                      {generalSubTab === 'custom' && (
                        <>
                        <h5 className="ps-4" style={{marginTop: '40px',marginLeft: '17px'}}>Custom day holiday</h5>
                        <Row style={{ marginLeft: '70px', marginTop: '22px', maxWidth: 900, gap: 0, alignItems: 'end', display: 'flex' }} className="mb-3">
                          <Col md={4} className="mb-2" style={{marginRight: '16px', minWidth: 220}}>
                            <Label className="fw-semibold">Date</Label>
                            <DatePicker
                              className="examcode-input"
                              selected={customDate}
                              onChange={setCustomDate}
                              dateFormat="dd/MM/yyyy"
                              placeholderText="Select date"
                            />
                          </Col>
                          <Col md={5} className="mb-2" style={{minWidth: 220}}>
                            <Label className="fw-semibold">Reason</Label>
                            <Input
                              className="examcode-input"
                              type="text"
                              value={customReason}
                              onChange={e => setCustomReason(e.target.value)}
                              placeholder="Enter reason"
                            />
                          </Col>
                          <Col md={2} className="mb-2 d-flex align-items-end" style={{minWidth: 140, justifyContent: 'flex-end'}}>
                            <button className="examcode-save-btn examcode-create-btn btn btn-secondary"  onClick={handleSaveWeekHolidays} type="button">Create</button>
                          </Col>
                        </Row>
                        <h5 className="ps-4" style={{marginTop: '40px',marginLeft: '17px'}}>Custom holiday listing</h5>
                        <Row style={{ marginLeft: '70px', marginTop: '22px' }}>
                          <Col xs={12} className="examcode-table-shadow">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              {/* Page size selector left */}
                              <div>
                                <Label className="me-2 fw-semibold" style={{marginBottom:0}}>Page size</Label>
                                <select
                                  className="form-select d-inline-block w-auto examcode-input"
                                  value={customPageSize}
                                  onChange={e => { setCustomPageSize(Number(e.target.value)); setCustomCurrentPage(1); }}
                                  style={{ minWidth: 80 }}
                                >
                                  {[5, 10, 20, 50, 100].map(size => (
                                    <option key={size} value={size}>{size}</option>
                                  ))}
                                </select>
                              </div>
                              {/* Search right */}
                              <div>
                                <Input
                                  type="search"
                                  className="form-control d-inline-block w-auto examcode-input"
                                  style={{ minWidth: 280, maxWidth: 340, width: 320, marginLeft: 'auto' }}
                                  placeholder="Search..."
                                  value={customSearch || ''}
                                  onChange={e => { setCustomSearch(e.target.value); setCustomCurrentPage(1); }}
                                />
                              </div>
                            </div>
                            <TableContainer
                              columns={columns}
                              data={customHolidays}
                              isCustomPageSize={false}
                              isGlobalFilter={false}
                              isJobListGlobalFilter={false}
                              isPagination={true}
                              tableClass="align-middle table-nowrap dt-responsive nowrap w-100 table-check dataTable no-footer dtr-inline mt-4 border-top"
                              pagination="pagination"
                              paginationWrapper="dataTables_paginate paging_simple_numbers pagination-rounded"
                              customPageSize={customPageSize}
                              currentPage={customCurrentPage}
                              totalRecords={customTotalRecords}
                              onPageSizeChange={setCustomPageSize}
                              onPageChange={setCustomCurrentPage}
                              fromRecord={(customCurrentPage - 1) * customPageSize + 1}
                              toRecord={Math.min(customCurrentPage * customPageSize, customTotalRecords)}
                              onSortChange={(field, order) => {
                                // Toggle between desc, asc, and no sort
                                if (customSortBy === field && customSortOrder === 'desc') {
                                  setCustomSortOrder('asc');
                                } else if (customSortBy === field && customSortOrder === 'asc') {
                                  setCustomSortBy('ch_date'); // default sort field
                                  setCustomSortOrder('desc'); // default sort order
                                } else {
                                  setCustomSortBy(field);
                                  setCustomSortOrder(order);
                                }
                                setCustomCurrentPage(1);
                              }}
                            />
                          </Col>
                        </Row>
                        </>
                      )}
                    </TabPane>
                    <TabPane tabId="2">
                      {/* <CardTitle className="mb-4" style={{fontSize: "1.5rem"}}>Agent Management</CardTitle> */}
                      <div>
                        <AdminList />
                      </div>
                    </TabPane>
                    <TabPane tabId="3">
                      {/* <CardTitle  className="mb-4" style={{fontSize: "1.5rem"}}>User Management</CardTitle> */}
                      <div>
                        <UserList />
                      </div>
                    </TabPane>
                  </TabContent>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Delete confirmation modal (Examcode style) */}
          {showDeleteModal && (
            <div className="examcode-modal-backdrop" style={{zIndex: 2000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(44,62,80,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <div className="examcode-modal" style={{minWidth: 340, maxWidth: '90vw', borderRadius: 18, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '24px 32px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <div className="examcode-modal-icon" style={{fontSize: 48, color: '#ff4d4f', marginBottom: 12}}>
                  <i className="mdi mdi-alert-circle-outline"></i>
                </div>
                <div className="examcode-modal-title" style={{fontWeight: 700, fontSize: 22, color: '#1a2942', marginBottom: 8}}>Delete Custom Holiday?</div>
                <div className="examcode-modal-message" style={{fontSize: 16, color: '#1a2942', marginBottom: 24, textAlign: 'center'}}>Are you sure you want to delete this custom holiday? This action cannot be undone.</div>
                <div className="examcode-modal-btns" style={{display: 'flex', gap: 16}}>
                  <button className="examcode-cancel-btn" onClick={() => setShowDeleteModal(false)} type="button">Cancel</button>
                  <button className="examcode-save-btn" style={{background:'#ff4d4f', color:'#fff', border:'none', borderRadius:100, fontWeight:600, fontSize:'1rem', padding:'8px 28px'}} onClick={() => handleDeleteCustomHoliday(deleteRowId)} type="button">Delete</button>
                </div>
              </div>
            </div>
          )}

          <CustomAlert open={notification.open} message={notification.message} severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} />
      </div>
    </>
  )
}

export default Settings
