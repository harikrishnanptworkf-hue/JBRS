import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Label, Input, Card, CardBody, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
import { toast } from 'react-toastify';

const AgentList = () => {
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
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningAgent, setAssigningAgent] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // For Add Agent modal user assignment
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addAgentAssignModalOpen, setAddAgentAssignModalOpen] = useState(false);
  const [addAgentSelectedUserIds, setAddAgentSelectedUserIds] = useState([]);
  const [allAssignableUsers, setAllAssignableUsers] = useState([]);

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
              <Button color="info" size="sm" onClick={() => openAssignModal(row.row.original)}>Assign Users</Button>
            </li>
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
    api.get('/agents', {
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
        toast.error('Failed to load agents');
      });
  }, [currentPage, pageSize, search, sortBy]);

  // Fetch all users for assignment in Add Agent modal
  useEffect(() => {
    const fetchAllAssignableUsers = async () => {
      try {
        const res = await api.get('/users', { params: { role_id: 3 } });
        setAllAssignableUsers(Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
      } catch (err) {
        toast.error('Failed to load users for assignment');
      }
    };
    fetchAllAssignableUsers();
  }, []);

  const handleAddUser = async () => {
    if (!name || !username || !password) return toast.error('Please enter all fields');
    setLoading(true);
    try {
      const res = await api.post('/agents', { name, username, password });
      const agentId = res.data.id;
      if (addAgentSelectedUserIds.length > 0) {
        await api.post(`/agents/${agentId}/assign-users`, { user_ids: addAgentSelectedUserIds });
      }
      toast.success('Agent added successfully');
      setAddModalOpen(false);
      setName(''); setUsername(''); setPassword(''); setAddAgentSelectedUserIds([]);
      setCurrentPage(1);
      const res2 = await api.get('/agents', { params: { page: 1, pageSize, search } });
      let rows = Array.isArray(res2.data.data) ? res2.data.data : (Array.isArray(res2.data) ? res2.data : []);
      setUsers(rows);
    } catch (err) {
      toast.error('Failed to add agent');
      console.error('Add agent error:', err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await api.delete(`/agents/${id}`);
      toast.success('Agent deleted');
      setCurrentPage(1);
      setShowDeleteModal(false);
      setDeleteRowId(null);
      const res = await api.get('/agents', { params: { page: 1, pageSize, search } });
      let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setUsers(rows);
    } catch (err) {
      toast.error('Failed to delete agent');
      console.error('Delete agent error:', err);
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
      await api.put(`/agents/${id}`, { name: editName, username: editUsername, password: editPassword });
      toast.success('Agent updated');
      setEditRowId(null);
      setEditName('');
      setEditUsername('');
      setEditPassword('');
      setCurrentPage(1);
      const res = await api.get('/agents', { params: { page: 1, pageSize, search } });
      let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setUsers(rows);
    } catch (err) {
      toast.error('Failed to update agent');
      console.error('Update agent error:', err);
    }
    setLoading(false);
  };

  // Fetch available users for assignment
  const fetchAvailableUsers = async () => {
    try {
      const res = await api.get('/users', { params: { role_id: 3, agent_id: null } });
      setAvailableUsers(Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    } catch (err) {
      toast.error('Failed to load users for assignment');
    }
  };

  const openAssignModal = (agent) => {
    setAssigningAgent(agent);
    setSelectedUserIds([]);
    setAssignModalOpen(true);
    fetchAvailableUsers();
  };

  const handleAssignUsers = async () => {
    if (!assigningAgent || selectedUserIds.length === 0) return;
    try {
      await api.post(`/agents/${assigningAgent.id}/assign-users`, { user_ids: selectedUserIds });
      toast.success('Users assigned to agent');
      setAssignModalOpen(false);
      setAssigningAgent(null);
      setSelectedUserIds([]);
      // Optionally refresh agent list
      const res = await api.get('/agents', { params: { page: currentPage, pageSize, search } });
      let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setUsers(rows);
    } catch (err) {
      toast.error('Failed to assign users');
    }
  };

  const handleCloseAddModal = () => {
    setAddModalOpen(false);
    setName('');
    setUsername('');
    setPassword('');
    setAddAgentSelectedUserIds([]);
  };

  return (
    <div>
      <Card>
        <CardBody>
          <hr style={{marginTop: '0', marginBottom: '8px'}} />
          <Row className="align-items-end mb-3" style={{marginTop: '8px'}}>
            <Col md={3} className="mb-2">
              <Label>Agent Name</Label>
              <Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter agent name" />
            </Col>
            <Col md={3} className="mb-2">
              <Label>Agent Username</Label>
              <Input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter agent username" />
            </Col>
            <Col md={3} className="mb-2">
              <Label>Password</Label>
              <Input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
            </Col>
            <Col md={2} className="mb-2">
              <Button color="success" onClick={handleAddUser} disabled={loading}>Add Agent</Button>
            </Col>
          </Row>
          <Row style={{ marginTop: '22px' }}>
            <Col xs={12}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <Input
                    type="search"
                    className="form-control d-inline-block w-auto"
                    style={{ minWidth: 200 }}
                    placeholder="Search agents..."
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
                Are you sure you want to delete this agent?
              </div>
              <div className="modal-footer">
                <Button color="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                <Button color="danger" onClick={() => handleDelete(deleteRowId)}>Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Agent modal */}
      <Modal isOpen={addModalOpen} toggle={handleCloseAddModal}>
        <ModalHeader toggle={handleCloseAddModal}>Add Agent</ModalHeader>
        <ModalBody>
          <Label>Agent Name</Label>
          <Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter agent name" className="mb-2" />
          <Label>Agent Username</Label>
          <Input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter agent username" className="mb-2" />
          <Label>Password</Label>
          <Input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="mb-2" />
          <Button color="info" className="mb-2" onClick={() => setAddAgentAssignModalOpen(true)}>Assign Users</Button>
          <div>
            {addAgentSelectedUserIds.length > 0 && (
              <div className="mb-2">
                <strong>Selected Users:</strong> {allAssignableUsers.filter(u => addAgentSelectedUserIds.includes(String(u.id))).map(u => u.name + ' (' + u.username + ')').join(', ')}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={handleAddUser} disabled={loading}>Add</Button>
          <Button color="secondary" onClick={handleCloseAddModal}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Add Agent Assign Users Modal
      <Modal isOpen={addAgentAssignModalOpen} toggle={() => setAddAgentAssignModalOpen(false)}>
        <ModalHeader toggle={() => setAddAgentAssignModalOpen(false)}>Assign Users</ModalHeader>
        <ModalBody>
          {allAssignableUsers.filter(u => !u.agent_id).length === 0 ? (
            <div className="text-muted">No users available for assignment.</div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {allAssignableUsers.filter(u => !u.agent_id).map(user => (
                <div key={user.id} className="d-flex align-items-center justify-content-between border-bottom py-1">
                  <span>{user.name}</span>
                  <Input
                    type="checkbox"
                    checked={addAgentSelectedUserIds.includes(String(user.id))}
                    onChange={e => {
                      if (e.target.checked) {
                        setAddAgentSelectedUserIds([...addAgentSelectedUserIds, String(user.id)]);
                      } else {
                        setAddAgentSelectedUserIds(addAgentSelectedUserIds.filter(id => id !== String(user.id)));
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={() => setAddAgentAssignModalOpen(false)}>Done</Button>
        </ModalFooter>
      </Modal> */}

      {/* Assign Users modal */}
      <Modal isOpen={assignModalOpen} toggle={() => setAssignModalOpen(false)}>
        <ModalHeader toggle={() => setAssignModalOpen(false)}>
          Assign Users to Agent
        </ModalHeader>
        <ModalBody>
          {availableUsers.length === 0 ? (
            <div className="text-muted">No users available for assignment.</div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {availableUsers.map(user => (
                <div key={user.id} className="d-flex align-items-center justify-content-between border-bottom py-1">
                  <span>{user.name}</span>
                  <Input
                    type="checkbox"
                    checked={selectedUserIds.includes(String(user.id))} style={{marginRight:'30px'}}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedUserIds([...selectedUserIds, String(user.id)]);
                      } else {
                        setSelectedUserIds(selectedUserIds.filter(id => id !== String(user.id)));
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={handleAssignUsers} disabled={selectedUserIds.length === 0}>Assign</Button>
          <Button color="secondary" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default AgentList;
