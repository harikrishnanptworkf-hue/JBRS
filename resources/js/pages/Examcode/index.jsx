import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Label, Input, Card, CardBody } from 'reactstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
import { format } from 'date-fns';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

  const columns = [
    {
      header: 'Exam Code',
      accessorKey: 'ex_code',
      enableSorting: true,
      cell: row => {
        if (editRowId === row.row.original.id) {
          return (
            <Input
              type="text"
              value={editCode}
              onChange={e => setEditCode(e.target.value)}
              placeholder="Enter exam code"
              autoFocus
            />
          );
        }
        return row.row.original.ex_code || '';
      },
    },
    {
      header: 'Validity',
      accessorKey: 'ex_validity',
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
            <div className="d-flex gap-2">
              <Button color="primary" size="sm" onClick={() => handleEditSave(rowId)}>Save</Button>
              <Button color="secondary" size="sm" onClick={handleEditCancel}>Cancel</Button>
            </div>
          );
        }
        return (
          <ul className="list-unstyled hstack gap-1 mb-0">
            <li>
              <a className="btn btn-sm btn-soft-info" href="#" onClick={e => { e.preventDefault(); handleEditClick(row.row.original); }}>
                <i className="mdi mdi-pencil-outline"></i>
              </a>
            </li>
            <li>
              <a className="btn btn-sm btn-soft-danger" href="#" onClick={e => { e.preventDefault(); setDeleteRowId(rowId); setShowDeleteModal(true); }}>
                <i className="mdi mdi-delete-outline"></i>
              </a>
            </li>
          </ul>
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
    if (!examCode || !examDate) return toast.error('Please enter exam code and validity date');
    setLoading(true);
    try {
      // Check if exam code exists in backend
      const checkRes = await api.get('/examcodes', {
        params: { search: examCode }
      });
      const exists = Array.isArray(checkRes.data.data) && checkRes.data.data.some(e => e.ex_code === examCode);
      if (exists) {
        setLoading(false);
        return toast.error('Exam code already exists');
      }
      await api.post('/examcodes', {
        exam_code: examCode,
        validity: format(examDate, 'yyyy-MM-dd')
      });
      toast.success('Exam code added successfully');
      setExamCode('');
      setExamDate(null);
      setCurrentPage(1);
      // Refetch
      const res = await api.get('/examcodes', {
        params: { page: 1, pageSize, search }
      });
      setExamcodes(res.data.data || []);
    } catch (err) {
      toast.error('Failed to add exam code');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await api.delete(`/examcodes/${id}`);
      toast.success('Exam code deleted');
      setCurrentPage(1);
      setShowDeleteModal(false);
      setDeleteRowId(null);
      // Refetch
      const res = await api.get('/examcodes', {
        params: { page: 1, pageSize, search }
      });
      setExamcodes(res.data.data || []);
    } catch (err) {
      toast.error('Failed to delete exam code');
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
    if (!editCode || !editDate) return toast.error('Please enter exam code and validity date');
    setLoading(true);
    try {
      // Check if exam code exists in backend (excluding current row)
      const checkRes = await api.get('/examcodes', {
        params: { search: editCode }
      });
      const exists = Array.isArray(checkRes.data.data) && checkRes.data.data.some(e => e.ex_code === editCode && e.id !== id);
      if (exists) {
        setLoading(false);
        return toast.error('Exam code already exists');
      }
      await api.put(`/examcodes/${id}`, {
        exam_code: editCode,
        validity: format(editDate, 'yyyy-MM-dd')
      });
      toast.success('Exam code updated');
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
      toast.error('Failed to update exam code');
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

  return (
    <div className="page-content" style={{ minHeight: '100vh', background: '#fff', padding: 0, width: '100vw', overflowX: 'hidden', margin: 0, paddingTop: '64px' }}>
      {/* Main Heading */}
      <div style={{ width: '100vw', background: '#fff', padding: '24px 32px 0 32px' }}>
        <h1 style={{ fontWeight: 800, fontSize: '2.2rem', margin: 0, color: '#1a237e', letterSpacing: 0.5, textAlign: 'left' }}>Exam Code</h1>
      </div>
      {/* Add + Listing Section (full width, unified border, white background) */}
      <div style={{ width: '100vw', margin: 0, padding: 0, background: '#fff' }}>
        <div style={{ overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', width: '100vw', maxWidth: '100vw' }}>
          {/* Page Heading */}
          <div style={{ padding: '24px 32px 0 32px', background: '#fff' }}>
            {/* Heading moved to top, removed here */}
          </div>
          {/* Add Exam Code Form */}
          <div style={{ /* borderBottom: '2px solid #dee2e6', */ padding: '24px 32px 8px 32px', width: '100%', background: '#fff' }}>
            <Row className="align-items-end g-3">
              <Col md={5} className="mb-2">
                <Label className="fw-semibold">Exam Code</Label>
                <Input
                  type="text"
                  value={examCode}
                  onChange={e => setExamCode(e.target.value)}
                  placeholder="Enter exam code"
                />
              </Col>
              <Col md={4} className="mb-2">
                <Label className="fw-semibold">Validity</Label>
                <DatePicker
                  className="form-control"
                  selected={examDate}
                  onChange={setExamDate}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select validity date"
                />
              </Col>
              <Col md={3} className="mb-2 d-flex align-items-end">
                <Button color="success" onClick={handleAddExamcode} disabled={loading} style={{ width: '60%', minWidth: 120, fontWeight: 600, fontSize: '1.1rem', padding: '10px 0' }}>Add</Button>
              </Col>
            </Row>
          </div>
          {/* Listing Section */}
          <div style={{ padding: '16px 32px 32px 32px', width: '100%', background: '#fff' }}>
            <Row className="mb-2">
              <Col xs={12} className="d-flex justify-content-between align-items-center">
                <div>
                  <Label className="me-2 fw-semibold">Page size</Label>
                  <select
                    className="form-select d-inline-block w-auto"
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  >
                    {[5, 10, 20, 50, 100].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Input
                    type="search"
                    className="form-control d-inline-block w-auto"
                    style={{ minWidth: 200 }}
                    placeholder="Search..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                {Array.isArray(examcodes) ? (
                  <TableContainer
                    columns={columns}
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
          {/* Footer color match */}
        </div>
      </div>
      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="modal fade show" tabIndex="-1" role="dialog" style={{ display: "block", background: "rgba(0,0,0,0.6)" }} aria-modal="true">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#dc3545' }}>
                <h5 className="modal-title text-white">
                  <i className="bi bi-exclamation-triangle me-2"></i> Confirm Delete
                </h5>
                <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">Are you sure you want to delete this <strong>exam code</strong>?</p>
                <p className="small text-secondary mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(deleteRowId)}>
                  <i className="bi bi-trash me-1"></i> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={2000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
};

export default Examcode;
