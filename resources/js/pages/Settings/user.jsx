import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Label, Input, Card, CardBody } from 'reactstrap';
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
import { toast } from 'react-toastify';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editRowId, setEditRowId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRowId, setDeleteRowId] = useState(null);
  const [sortBy, setSortBy] = useState({ column: 'id', order: 'desc' });
  const [totalRecords, setTotalRecords] = useState(0);

  const columns = [
    { header: 'Name', accessorKey: 'name', enableSorting: true,
      cell: row => editRowId === row.row.original.id ? (
        <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" autoFocus />
      ) : (row.row.original.name || ''),
      onSort: () => handleSort('name')
    },
    { header: 'Username', accessorKey: 'username', enableSorting: true,
      cell: row => editRowId === row.row.original.id ? (
        <Input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="Username" />
      ) : (row.row.original.username || ''),
      onSort: () => handleSort('username')
    },
    { header: 'Password', accessorKey: 'password', enableSorting: false,
      cell: row => editRowId === row.row.original.id ? (
        <Input value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Password" type="text" />
      ) : (row.row.original.password || '')
    },
    { header: 'Action', id: 'action', enableSorting: false,
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
      }
    },
  ];

  const handleSort = (column) => {
    setSortBy(prev => {
      const order = prev.column === column && prev.order === 'asc' ? 'desc' : 'asc';
      return { column, order };
    });
    setCurrentPage(1);
  };

  useEffect(() => {
    setLoading(true);
    api.get('/users', {
      params: { page: currentPage, pageSize, search, sortBy: sortBy.column, sortOrder: sortBy.order }
    })
      .then(res => {
        let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setUsers(rows);
        setTotalRecords(res.data.total || rows.length);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        setUsers([]);
        setTotalRecords(0);
        console.error('API error:', err);
        toast.error('Failed to load users');
      });
  }, [currentPage, pageSize, search, sortBy]);

  const handleAddUser = async () => {
    if (!name || !username || !password) return toast.error('Please enter all fields');
    setLoading(true);
    try {
      await api.post('/users', { name, username, password });
      toast.success('User added successfully');
      setName(''); setUsername(''); setPassword('');
      setCurrentPage(1);
      const res = await api.get('/users', { params: { page: 1, pageSize, search } });
      let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setUsers(rows);
    } catch (err) {
      toast.error('Failed to add user');
      console.error('Add user error:', err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      setCurrentPage(1);
      setShowDeleteModal(false);
      setDeleteRowId(null);
      const res = await api.get('/users', { params: { page: 1, pageSize, search } });
      let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setUsers(rows);
    } catch (err) {
      toast.error('Failed to delete user');
      console.error('Delete user error:', err);
    }
    setLoading(false);
  };

  const handleEditClick = (row) => {
    setEditRowId(row.id);
    setEditName(row.name);
    setEditUsername(row.username);
    setEditPassword(row.password);
  };

  const handleEditCancel = () => {
    setEditRowId(null);
    setEditName('');
    setEditUsername('');
    setEditPassword('');
  };

  const handleEditSave = async (id) => {
    if (!editName || !editUsername || !editPassword) return toast.error('Please enter all fields');
    setLoading(true);
    try {
      await api.put(`/users/${id}`, { name: editName, username: editUsername, password: editPassword });
      toast.success('User updated');
      setEditRowId(null);
      setEditName('');
      setEditUsername('');
      setEditPassword('');
      setCurrentPage(1);
      const res = await api.get('/users', { params: { page: 1, pageSize, search } });
      let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setUsers(rows);
    } catch (err) {
      toast.error('Failed to update user');
      console.error('Update user error:', err);
    }
    setLoading(false);
  };

  return (
    <div>
      <Card>
        <CardBody>
          <hr style={{marginTop: '0', marginBottom: '8px'}} />
          <Row className="align-items-end mb-3" style={{marginTop: '8px'}}>
            <Col md={3} className="mb-2">
              <Label>Name</Label>
              <Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" />
            </Col>
            <Col md={3} className="mb-2">
              <Label>Username</Label>
              <Input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" />
            </Col>
            <Col md={3} className="mb-2">
              <Label>Password</Label>
              <Input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
            </Col>
            <Col md={2} className="mb-2">
              <Button color="success" onClick={handleAddUser} disabled={loading}>Add</Button>
            </Col>
          </Row>
          <Row style={{ marginTop: '22px' }}>
            <Col xs={12}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                {/* <div>
                  <Label className="me-2">Page size</Label>
                  <select
                    className="form-select d-inline-block w-auto"
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  >
                    {[5, 10, 20, 50, 100].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div> */}
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
              </div>
              {Array.isArray(users) ? (
                <TableContainer
                  columns={columns}
                  data={users}
                  isCustomPageSize={true}
                  isGlobalFilter={false}
                  isJobListGlobalFilter={false}
                  isPagination={true}
                  tableClass="align-middle table-nowrap dt-responsive nowrap w-100 table-check dataTable no-footer dtr-inline mt-4 border-top"
                  pagination="pagination"
                  paginationWrapper="dataTables_paginate paging_simple_numbers pagination-rounded"
                  customPageSize={pageSize > 0 ? pageSize : 1}
                  currentPage={currentPage}
                  totalRecords={totalRecords}
                  onPageSizeChange={setPageSize}
                  onPageChange={setCurrentPage}
                  fromRecord={users.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  toRecord={users.length === 0 ? 0 : (currentPage - 1) * pageSize + users.length}
                  onSortChange={handleSort}
                />
              ) : (
                <div style={{ color: 'red', padding: '20px' }}>Error loading data. Please check your API response.</div>
              )}
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                Are you sure you want to delete this user?
              </div>
              <div className="modal-footer">
                <Button color="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                <Button color="danger" onClick={() => handleDelete(deleteRowId)}>Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
