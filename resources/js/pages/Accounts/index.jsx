import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Label, Input } from 'reactstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
// import { format } from 'date-fns';
import DeleteModal from '../../components/Common/DeleteModal';

// Custom notification alert styled like modal with fade-out
const CustomAlert = ({ open, message, severity, onClose, duration = 3000 }) => {
  const [visible, setVisible] = React.useState(open);
  const [fade, setFade] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setVisible(true);
      setFade(false);
      const timer = setTimeout(() => setFade(true), duration - 400);
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

const Accounts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Listen for filter button event from Navbar
  useEffect(() => {
    const handler = () => setShowFullControls(v => !v);
    window.addEventListener('toggleExamcodeControls', handler);
    return () => window.removeEventListener('toggleExamcodeControls', handler);
  }, []);
  const [showFullControls, setShowFullControls] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  // Inline edit states removed for Accounts list; using dedicated form page
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRowId, setDeleteRowId] = useState(null);
  const [sortBy, setSortBy] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [totalRecords, setTotalRecords] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [defaultAccountId, setDefaultAccountId] = useState(null);
  const [togglingDefaultId, setTogglingDefaultId] = useState(null);

  const showSnackbar = (message, severity = 'success') => {
    let finalMessage = message;
    if (message === 'Exam code added successfully') {
      finalMessage = 'Exam code created successfully';
    }
    setSnackbar({ open: true, message: finalMessage, severity });
  };

  const columns = React.useMemo(() => [
    {
      id: 'default_toggle',
      header: (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          
        </span>
      ),
      accessorKey: 'id',
      enableSorting: false,
      cell: row => {
        const rowId = row.row.original.id;
        const checked = defaultAccountId != null && Number(rowId) === Number(defaultAccountId);
        const busy = togglingDefaultId === rowId;
        return (
          <input
            type="checkbox"
            className="form-check-input"
            checked={!!checked}
            disabled={busy}
            onChange={async (e) => {
              const makeDefault = e.target.checked;
              await toggleDefault(rowId, makeDefault);
            }}
          />
        );
      },
    },
    {
      id: 'account_name',
      header: (
        <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('account_name')}>
          Account Name
          {sortBy === 'account_name' && (
            <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </span>
      ),
      accessorKey: 'account_name',
      enableSorting: true,
      cell: row => {
        const original = row.row.original;
        const isDefault = defaultAccountId != null && Number(original.id) === Number(defaultAccountId);
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: isDefault ? 700 : 500, color: isDefault ? '#1e7e34' : '#1a2942' }}>
              {original.account_name || '-'}
            </span>
            {isDefault && (
              <span style={{
                marginLeft: 10,
                background: '#eaffea',
                color: '#1e7e34',
                border: '1px solid #b6e1b6',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 700,
              }}>
                Default
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'bank_name',
      header: (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          Bank
        </span>
      ),
      accessorKey: 'bank_name',
      enableSorting: false,
      cell: row => row.row.original.bank_name || '-',
    },
    {
      id: 'account_number',
      header: (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          Account Number
        </span>
      ),
      accessorKey: 'account_number',
      enableSorting: false,
      cell: row => row.row.original.account_number || '-',
    },
    {
      id: 'account_type',
      header: (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          Account Type
        </span>
      ),
      accessorKey: 'account_type',
      enableSorting: false,
      cell: row => row.row.original.account_type || '-',
    },
    {
      id: 'swift_code',
      header: (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          SWIFT Code
        </span>
      ),
      accessorKey: 'swift_code',
      enableSorting: false,
      cell: row => row.row.original.swift_code || '-',
    },
    {
      id: 'ifsc_code',
      header: (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          IFSC
        </span>
      ),
      accessorKey: 'ifsc_code',
      enableSorting: false,
      cell: row => row.row.original.ifsc_code || '-',
    },
      {
      id: 'action',
      header: 'Actions',
      enableSorting: false,
      cell: row => {
        const rowId = row.row.original.id;
        return (
          <ul className="list-unstyled hstack gap-1 mb-0" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%' }}>
            <li>
              <button
                type="button"
                className="examcode-action-btn edit"
                style={{ color: '#1a8cff', background: '#e6f2ff' }}
                title="Edit"
                onClick={() => navigate('/accounts/create', { state: { editId: rowId } })}
                id={`edit-tooltip-${rowId}`}
              >
                <i className="mdi mdi-pencil-outline" />
              </button>
            </li>
            <li>
              <button
                type="button"
                className="examcode-action-btn delete"
                style={{ color: '#ff4d4f', background: '#fff1f0' }}
                title="Delete"
                onClick={() => { setDeleteRowId(rowId); setShowDeleteModal(true); }}
                id={`delete-tooltip-${rowId}`}
              >
                <i className="mdi mdi-delete-outline" />
              </button>
            </li>
          </ul>
        );
      },
    },
  ], [navigate, sortBy, sortDirection, defaultAccountId, togglingDefaultId]);

  // Removed inline edit focus management for Accounts list
  // Memoize table data
  const memoAccounts = React.useMemo(() => accounts, [accounts]);

  // Fetch accounts from backend
  useEffect(() => {
    setLoading(true);
    api.get('/accounts', {
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
  setAccounts(rows);
        setTotalRecords(res.data.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
  setAccounts([]);
        setTotalRecords(0);
        console.error('API error:', err);
      });
  }, [currentPage, pageSize, search, sortBy, sortDirection]);

  // Fetch default account id for highlighting
  useEffect(() => {
    api.get('/settings/default-account')
      .then(res => setDefaultAccountId(res?.data?.account_id ?? null))
      .catch(() => setDefaultAccountId(null));
  }, []);

  // Show toast when returning from create/update
  useEffect(() => {
    const state = location.state;
    if (state?.created) {
      showSnackbar('Account created successfully', 'success');
      navigate(location.pathname, { replace: true, state: {} });
    } else if (state?.updated) {
      showSnackbar('Account updated successfully', 'success');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Removed exam code creation; Accounts are created via dedicated form

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await api.delete(`/accounts/${id}`);
      showSnackbar('Account deleted', 'success');
      // If deleted account was default, clear default setting
      try {
        if (defaultAccountId != null && Number(id) === Number(defaultAccountId)) {
          await api.post('/settings/default-account', { account_id: null });
          setDefaultAccountId(null);
        }
      } catch {}
      setCurrentPage(1);
      setShowDeleteModal(false);
      setDeleteRowId(null);
      // Refetch and update totalRecords
      const res = await api.get('/accounts', {
        params: { page: 1, pageSize, search }
      });
  setAccounts(res.data.data || []);
      setTotalRecords(res.data.total || (res.data.data ? res.data.data.length : 0));
    } catch (err) {
      showSnackbar('Failed to delete account', 'error');
    }
    setLoading(false);
  };

  const toggleDefault = async (id, makeDefault) => {
    try {
      setTogglingDefaultId(id);
      if (makeDefault) {
        await api.post('/settings/default-account', { account_id: Number(id) });
        setDefaultAccountId(Number(id));
        showSnackbar('Default account set', 'success');
      } else {
        await api.post('/settings/default-account', { account_id: null });
        setDefaultAccountId(null);
        showSnackbar('Default cleared', 'success');
      }
    } catch (e) {
      showSnackbar('Failed to update default account', 'error');
    } finally {
      setTogglingDefaultId(null);
    }
  };

  // Inline edit not used on accounts page; edits happen in the form page

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
      padding: 6px 18px;
      border: 0;
  border-radius: 100px;
      background-color: #27ae60;
      color: #ffffff;
      font-weight: 500;
      font-size: 1rem;
      min-width: 80px;
      transition: all 0.3s;
      display: inline-block;
    }
    .examcode-create-btn:hover {
      background-color: #2ecc71;
      box-shadow: 0 0 10px #2ecc7150;
      transform: scale(1.05);
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
    /* Subtle highlight for default row first cell via left border */
    td:has(span + span) {
      /* no-op for compatibility */
    }
  `;

  return (
  <div className="page-content" style={{  background: '#fff', padding: 0, width: '100vw', overflowX: 'hidden', marginTop: "0px" }}>
      <style>{addButtonCss}</style>
      {/* Controls: Page Size + Search */}
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
          <div>
            <Button className="examcode-create-btn" onClick={() => navigate('/accounts/create')}>
              Add Account
            </Button>
          </div>
      </div>
      {/* Listing Section */}
  <div style={{ padding: '32px 32px 0 32px', width: '100%', background: '#fff' }}>
        <Row className="mb-2">
          <Col xs={12} className="examcode-table-shadow">
            {Array.isArray(memoAccounts) ? (
              <TableContainer
                columns={columns.map(col => ({ ...col, headerClassName: 'text-center' }))}
                data={memoAccounts}
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
      <DeleteModal
        section="account"
        show={showDeleteModal}
        onDeleteClick={() => { handleDelete(deleteRowId); setShowDeleteModal(false); setDeleteRowId(null); }}
        onCloseClick={() => { setShowDeleteModal(false); setDeleteRowId(null); }}
      />

      <CustomAlert open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </div>
  );
};

export default Accounts;
