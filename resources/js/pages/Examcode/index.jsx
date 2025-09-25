import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Label, Input } from 'reactstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
import { format } from 'date-fns';

// Custom notification alert styled like modal with fade-out
const CustomAlert = ({ open, message, severity, onClose, duration = 3000 }) => {
  const [visible, setVisible] = React.useState(open);
  const [fade, setFade] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setVisible(true);
      setFade(false);
      const timer = setTimeout(() => setFade(true), duration - 400); // start fade before close
      const closeTimer = setTimeout(() => {
        setVisible(false);
        onClose && onClose();
      }, duration);
      return () => { clearTimeout(timer); clearTimeout(closeTimer); };
    }
  }, [open, duration, onClose]);
  if (!visible) return null;
  const iconClass = severity === 'success' ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline';
  return (
    <div style={{
      position: 'fixed',
      top: 80,
      left: 0,
      right: 0,
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
      transition: 'opacity 0.4s',
      opacity: fade ? 0 : 1,
    }}>
      <div style={{
        minWidth: 340,
        maxWidth: '90vw',
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 8px 32px rgba(44,62,80,0.18)',
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        pointerEvents: 'auto',
        borderLeft: severity === 'success' ? '6px solid #27ae60' : '6px solid #ff4d4f',
      }}>
        <span style={{ fontSize: 32, color: severity === 'success' ? '#27ae60' : '#ff4d4f' }}>
          <i className={'mdi ' + iconClass}></i>
        </span>
        <span style={{ fontWeight: 600, color: '#1a2942', fontSize: 18 }}>{message}</span>
        <button onClick={() => { setVisible(false); onClose && onClose(); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 22, color: '#aaa', cursor: 'pointer' }}>&times;</button>
      </div>
    </div>
  );
};

const Examcode = () => {
  const [examcodes, setExamcodes] = useState([]);
  const [examDate, setExamDate] = useState(null);
  const [examCode, setExamCode] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editRowId, setEditRowId] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [editDate, setEditDate] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRowId, setDeleteRowId] = useState(null);
  const [sortBy, setSortBy] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [totalRecords, setTotalRecords] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => {
    let finalMessage = message;
    if (message === 'Exam code added successfully') {
      finalMessage = 'Exam code created successfully';
    }
    setSnackbar({ open: true, message: finalMessage, severity });
  };

  const columns = [
    {
      header: (
        <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('ex_code')}>
          Exam Code
          {sortBy === 'ex_code' && (
            <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </span>
      ),
      accessorKey: 'ex_code',
      enableSorting: true,
      cell: row => {
        if (editRowId === row.row.original.id) {
          return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Input
                type="text"
                value={editCode}
                onChange={e => setEditCode(e.target.value)}
                placeholder="Enter exam code"
                autoFocus
                className="examcode-input"
                style={{ height: 44, textAlign: 'center' }}
              />
            </div>
          );
        }
        return row.row.original.ex_code || '';
      },
    },
    {
      header: (
        <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('ex_validity')}>
          Validity
          {sortBy === 'ex_validity' && (
            <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </span>
      ),
      accessorKey: 'ex_validity',
      enableSorting: true,
      cell: row => {
        if (editRowId === row.row.original.id) {
          return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <DatePicker
                className="examcode-input examcode-date"
                selected={editDate}
                onChange={setEditDate}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select validity date"
                style={{ height: 44, minWidth: 220, maxWidth: 220, width: '100%', textAlign: 'center' }}
              />
            </div>
          );
        }
        return row.row.original.ex_validity ? format(new Date(row.row.original.ex_validity), 'dd/MM/yyyy') : '';
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
            <div className="">
              <button className="examcode-update-btn" onClick={() => handleEditSave(rowId)} type="button">Update</button>
              <button className="examcode-cancel-btn" onClick={handleEditCancel} type="button">Cancel</button>
            </div>
          );
        }
        return (
          <div className="">
            <button
              type="button"
              className="examcode-action-btn edit"
              title="Edit"
              onClick={e => { e.preventDefault(); handleEditClick(row.row.original); }}
            >
              <i className="mdi mdi-pencil-outline"></i>
            </button>
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

  // Fetch examcodes from backend
  useEffect(() => {
    setLoading(true);
    api.get('/examcodes', {
      params: {
        page: currentPage,
        pageSize,
        search,
        sortBy,
        sortDirection
      }
    })
      .then(res => {
        let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setExamcodes(rows);
        setTotalRecords(res.data.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        setExamcodes([]);
        setTotalRecords(0);
        console.error('API error:', err);
      });
  }, [currentPage, pageSize, search, sortBy, sortDirection]);

  const handleAddExamcode = async () => {
    if (!examCode.trim()) {
      showSnackbar('Please enter exam code', 'error');
      return;
    }
    if (!examDate) {
      showSnackbar('Please select validity date', 'error');
      return;
    }
    setLoading(true);
    try {
      // Check if exam code exists in backend
      const checkRes = await api.get('/examcodes', {
        params: { search: examCode }
      });
      const exists = Array.isArray(checkRes.data.data) && checkRes.data.data.some(e => e.ex_code === examCode);
      if (exists) {
        setLoading(false);
        showSnackbar('Exam code already exists', 'error');
        return;
      }
      await api.post('/examcodes', {
        exam_code: examCode,
        validity: format(examDate, 'yyyy-MM-dd')
      });
      showSnackbar('Exam code created successfully', 'success');
      setExamCode('');
      setExamDate(null);
      setCurrentPage(1);
      // Refetch
      const res = await api.get('/examcodes', {
        params: { page: 1, pageSize, search }
      });
      setExamcodes(res.data.data || []);
    } catch (err) {
      showSnackbar('Failed to add exam code', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await api.delete(`/examcodes/${id}`);
      showSnackbar('Exam code deleted', 'success');
      setCurrentPage(1);
      setShowDeleteModal(false);
      setDeleteRowId(null);
      // Refetch
      const res = await api.get('/examcodes', {
        params: { page: 1, pageSize, search }
      });
      setExamcodes(res.data.data || []);
    } catch (err) {
      showSnackbar('Failed to delete exam code', 'error');
    }
    setLoading(false);
  };

  const handleEditClick = (row) => {
    setEditRowId(row.id);
    setEditCode(row.ex_code);
    setEditDate(row.ex_validity ? new Date(row.ex_validity) : null);
  };

  const handleEditCancel = () => {
    setEditRowId(null);
    setEditCode('');
    setEditDate(null);
  };

  const handleEditSave = async (id) => {
    if (!editCode.trim()) {
      showSnackbar('Please enter exam code', 'error');
      return;
    }
    if (!editDate) {
      showSnackbar('Please select validity date', 'error');
      return;
    }
    setLoading(true);
    try {
      // Check if exam code exists in backend (excluding current row)
      const checkRes = await api.get('/examcodes', {
        params: { search: editCode }
      });
      const exists = Array.isArray(checkRes.data.data) && checkRes.data.data.some(e => e.ex_code === editCode && e.id !== id);
      if (exists) {
        setLoading(false);
        showSnackbar('Exam code already exists', 'error');
        return;
      }
      await api.put(`/examcodes/${id}`, {
        exam_code: editCode,
        validity: format(editDate, 'yyyy-MM-dd')
      });
      showSnackbar('Exam code updated', 'success');
      setEditRowId(null);
      setEditCode('');
      setEditDate(null);
      setCurrentPage(1);
      // Refetch
      const res = await api.get('/examcodes', {
        params: { page: 1, pageSize, search }
      });
      setExamcodes(res.data.data || []);
    } catch (err) {
      showSnackbar('Failed to update exam code', 'error');
    }
    setLoading(false);
  };

  const handleSortChange = (columnId) => {
    if (sortBy === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnId);
      setSortDirection('asc');
    }
  };

  const addButtonCss = `
    .examcode-create-btn {
      padding: 12.5px 38px;
      border: 0;
      border-radius: 100px;
      background-color: #27ae60;
      color: #ffffff;
      font-weight: bold;
      font-size: 1.08rem;
      min-width: 140px;
      transition: all 0.5s;
      display: inline-block;
    }
    .examcode-create-btn:hover {
      background-color: #2ecc71;
      box-shadow: 0 0 20px #2ecc7150;
      transform: scale(1.1);
    }
    .examcode-create-btn:active {
      background-color: #219150;
      transition: all 0.25s;
      box-shadow: none;
      transform: scale(0.98);
    }
    .examcode-update-btn {
      background: #2ba8fb;
      color: #fff;
      border: none;
      border-radius: 100px;
      font-weight: 600;
      font-size: 1rem;
      padding: 8px 28px;
      box-shadow: 0 1.5px 8px rgba(44,62,80,0.04);
      transition: background 0.2s, box-shadow 0.2s;
      margin-right: 8px;
    }
    .examcode-update-btn:hover {
      background: #6fc5ff;
      box-shadow: 0 0 12px #6fc5ff50;
    }
    .examcode-update-btn:active {
      background: #3d94cf;
    }
    .examcode-header-bar {
      width: 100vw;
      background: #fff;
      box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08);
      border-radius: 0 0 18px 18px;
      padding: 32px 32px 0 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }
    .examcode-title-text {
      font-size: 2.1rem;
      font-weight: 700;
      color: #1a2942;
      margin-bottom: 0.5rem;
      letter-spacing: 0.01em;
      text-align: left;
    }
    .examcode-title-divider {
      width: 60px;
      height: 4px;
      background: #2ba8fb;
      border-radius: 2px;
      margin: 18px 0 0 0;
      opacity: 0.8;
    }
    .examcode-form-row {
      width: 100vw;
      background: #fff;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 24px;
      padding: 24px 32px 0 32px;
    }
    .examcode-form-row .form-group,
    .examcode-form-row .mb-2 {
      margin-bottom: 0 !important;
    }
    .examcode-input, .examcode-date {
      border-radius: 10px !important;
      border: 1.5px solid #e3e6ef !important;
      box-shadow: 0 1.5px 8px rgba(44,62,80,0.04);
      font-size: 1.05rem;
      padding: 10px 16px;
      background: #fafdff !important;
      transition: border-color 0.2s;
      height: 44px !important;
      min-width: 220px;
      max-width: 220px;
      width: 100%;
      box-sizing: border-box;
    }
    .examcode-date input {
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      padding: 0 !important;
      height: 100% !important;
    }
    .MuiInputBase-root {
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    .MuiInput-underline:before, .MuiInput-underline:after {
      border-bottom: none !important;
    }
    .examcode-tablebar {
      width: 100vw;
      background: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 32px 0 32px;
      margin-bottom: 0;
      border-radius: 0;
      box-shadow: none;
    }
    .examcode-table-shadow {
      box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08);
      border-radius: 18px;
      background: #fff;
    }
    .examcode-action-btn {
      border: none;
      background: #f6f8fa;
      color: #2ba8fb;
      border-radius: 50%;
      width: 38px;
      height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      box-shadow: 0 1.5px 8px rgba(44,62,80,0.04);
      transition: background 0.2s, color 0.2s, box-shadow 0.2s;
      margin-right: 4px;
      position: relative;
    }
    .examcode-action-btn.edit {
      color: #2ba8fb;
    }
    .examcode-action-btn.delete {
      color: #ff4d4f;
    }
    .examcode-action-btn:hover {
      background: #e3e6ef;
      box-shadow: 0 2px 12px rgba(44,62,80,0.10);
    }
    .examcode-action-btn:active {
      background: #d0e7fa;
    }
    .examcode-action-btn .mdi {
      margin: 0;
    }
    .examcode-save-btn {
      background: #27ae60;
      color: #fff;
      border: none;
      border-radius: 100px;
      font-weight: 600;
      font-size: 1rem;
      padding: 8px 28px;
      box-shadow: 0 1.5px 8px rgba(44,62,80,0.04);
      transition: background 0.2s, box-shadow 0.2s;
      margin-right: 8px;
    }
    .examcode-save-btn:hover {
      background: #2ecc71;
      box-shadow: 0 0 12px #2ecc7150;
    }
    .examcode-save-btn:active {
      background: #219150;
    }
    .examcode-cancel-btn {
      background: #f6f8fa;
      color: #1a2942;
      border: 1.5px solid #e3e6ef;
      border-radius: 100px;
      font-weight: 600;
      font-size: 1rem;
      padding: 8px 28px;
      transition: background 0.2s, color 0.2s;
    }
    .examcode-cancel-btn:hover {
      background: #e3e6ef;
      color: #2ba8fb;
    }
    .examcode-cancel-btn:active {
      background: #d0e7fa;
    }
    .examcode-modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(44,62,80,0.18);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .examcode-modal {
      background: #fff;
      border-radius: 18px;
      box-shadow: 0 8px 32px rgba(44,62,80,0.18);
      padding: 36px 32px 28px 32px;
      min-width: 340px;
      max-width: 90vw;
      text-align: center;
      z-index: 1060;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .examcode-modal-icon {
      font-size: 2.8rem;
      color: #ff4d4f;
      margin-bottom: 12px;
    }
    .examcode-modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1a2942;
      margin-bottom: 8px;
    }
    .examcode-modal-message {
      color: #5a5a5a;
      margin-bottom: 24px;
      font-size: 1.05rem;
    }
    .examcode-modal-btns {
      display: flex;
      gap: 16px;
      justify-content: center;
    }
    @media (max-width: 700px) {
      .examcode-header-bar, .examcode-tablebar, .examcode-form-row {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }
    }
  `;

  return (
    <div className="page-content" style={{ minHeight: '100vh', background: '#f6f8fa', padding: 0, width: '100vw', overflowX: 'hidden', paddingTop: '64px' }}>
      <style>{addButtonCss}</style>
      {/* Header Bar: Title only */}
      <div className="examcode-header-bar">
        <div>
          <div className="examcode-title-text">Exam Code</div>
          <div className="examcode-title-divider"></div>
        </div>
      </div>
      {/* Form Row: Exam Code/Validity/Add */}
      <div className="examcode-form-row">
        <div style={{ minWidth: 220, maxWidth: 220 }}>
          <Label className="fw-semibold">Exam Code</Label>
          <Input
            type="text"
            className="examcode-input"
            style={{ height: 44 }}
            value={examCode}
            onChange={e => setExamCode(e.target.value)}
            placeholder="Enter exam code"
          />
        </div>
        <div style={{ minWidth: 220, maxWidth: 220 }}>
          <Label className="fw-semibold">Validity</Label>
          <DatePicker
            className="examcode-input examcode-date"
            selected={examDate}
            onChange={setExamDate}
            dateFormat="dd/MM/yyyy"
            placeholderText="Select validity date"
            style={{ height: 44, minWidth: 220, maxWidth: 220, width: '100%' }}
          />
        </div>
        <div>
          <Button className="examcode-create-btn" onClick={handleAddExamcode} disabled={loading}>Create</Button>
        </div>
      </div>
      {/* Table Bar: Page Size + Search */}
      <div className="examcode-tablebar">
        <div>
          <Label className="me-2 fw-semibold">Page size</Label>
          <select
            className="form-select d-inline-block w-auto examcode-input"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            style={{ minWidth: 80 }}
          >
            {[5, 10, 20, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        <div>
          <Input
            type="search"
            className="form-control d-inline-block w-auto examcode-input"
            style={{ minWidth: 280, maxWidth: 340, width: 320 }}
            placeholder="Search..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>
      {/* Listing Section */}
      <div style={{ padding: '32px 32px 32px 32px', width: '100%', background: '#fff' }}>
        <Row className="mb-2">
          <Col xs={12} className="examcode-table-shadow">
            {Array.isArray(examcodes) ? (
              <TableContainer
                columns={columns.map(col => ({ ...col, headerClassName: 'text-center' }))}
                data={examcodes}
                isCustomPageSize={false}
                isGlobalFilter={false}
                isJobListGlobalFilter={false}
                isPagination={true}
                tableClass="align-middle table-nowrap dt-responsive nowrap w-100 table-check dataTable no-footer dtr-inline mt-4 border-top"
                pagination="pagination"
                paginationWrapper="dataTables_paginate paging_simple_numbers pagination-rounded"
                customPageSize={pageSize}
                currentPage={currentPage}
                totalRecords={totalRecords}
                onPageSizeChange={setPageSize}
                onPageChange={setCurrentPage}
                fromRecord={(currentPage - 1) * pageSize + 1}
                toRecord={Math.min(currentPage * pageSize, totalRecords)}
                onSortChange={handleSortChange}
                sortBy={sortBy}
                sortDirection={sortDirection}
              />
            ) : (
              <div style={{ color: 'red', padding: '20px', background: '#fff' }}>Error loading data. Please check your API response.</div>
            )}
          </Col>
        </Row>
      </div>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="examcode-modal-backdrop">
          <div className="examcode-modal">
            <div className="examcode-modal-icon">
              <i className="mdi mdi-alert-circle-outline"></i>
            </div>
            <div className="examcode-modal-title">Delete Exam Code?</div>
            <div className="examcode-modal-message">Are you sure you want to delete this exam code? This action cannot be undone.</div>
            <div className="examcode-modal-btns">
              <button className="examcode-cancel-btn" onClick={() => { setShowDeleteModal(false); setDeleteRowId(null); }} type="button">Cancel</button>
              <button className="examcode-save-btn" style={{background:'#ff4d4f'}} onClick={() => handleDelete(deleteRowId)} type="button">Delete</button>
            </div>
          </div>
        </div>
      )}
      <CustomAlert open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </div>
  );
};

export default Examcode;
