
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Label, Input } from 'reactstrap';
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
import { toast } from 'react-toastify';

const AgentList = () => {
  const [agents, setAgents] = useState([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editRowId, setEditRowId] = useState(null);
  const [editFields, setEditFields] = useState({ name: '', username: '', password: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRowId, setDeleteRowId] = useState(null);
  const [sortBy, setSortBy] = useState({ column: 'name', order: 'asc' });
  const [sortDirection, setSortDirection] = useState('asc');
  const [totalRecords, setTotalRecords] = useState(0);
  // Assign User modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningAgent, setAssigningAgent] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  // Fetch available users for assignment


  // --- Fix: use local state for edit fields per row ---
  const handleEditClick = useCallback((row) => {
    setEditRowId(row.id);
    setEditFields({
      name: row.name || '',
      username: row.username || '',
      password: row.password || ''
    });
  }, []);

  const handleEditFieldChange = useCallback((field, value) => {
    setEditFields(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditRowId(null);
    setEditFields({ name: '', username: '', password: '' });
  }, []);

  const handleEditSave = useCallback(async (id) => {
    if (!editFields.name || !editFields.username || !editFields.password) return toast.error('Please enter all fields');
    setLoading(true);
    try {
      await api.put(`/agents/${id}`, { name: editFields.name, username: editFields.username, password: editFields.password });
      toast.success('Agent updated');
      setEditRowId(null);
      setEditFields({ name: '', username: '', password: '' });
      setCurrentPage(1);
      const res = await api.get('/agents', { params: { page: 1, pageSize, search } });
      let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setAgents(rows);
    } catch (err) {
      toast.error('Failed to update agent');
      console.error('Update agent error:', err);
    }
    setLoading(false);
  }, [editFields, pageSize, search]);

  const handleSort = (column) => {
    if (column !== 'name') return;
    setSortBy(prev => {
      let order = prev.order === 'asc' ? 'desc' : 'asc';
      if (prev.column !== column) order = 'asc';
      setSortDirection(order);
      return { column, order };
    });
    setCurrentPage(1);
  };


  useEffect(() => {
    setLoading(true);
    api.get('/agents', {
      params: {
        page: currentPage,
        pageSize,
        search,
        sortBy: sortBy.column,
        sortOrder: sortDirection
      }
    })
      .then(res => {
        let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setAgents(rows);
        setTotalRecords(res.data.total || rows.length);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        setAgents([]);
        setTotalRecords(0);
        console.error('API error:', err);
        toast.error('Failed to load agents');
      });
  }, [currentPage, pageSize, search, sortBy, sortDirection]);


  const handleAddAgent = async () => {
    if (!name || !username || !password) return toast.error('Please enter all fields');
    setLoading(true);
    try {
      await api.post('/agents', { name, username, password });
      toast.success('Agent added successfully');
      setName(''); setUsername(''); setPassword('');
      setCurrentPage(1);
      const res = await api.get('/agents', { params: { page: 1, pageSize, search } });
      let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setAgents(rows);
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
      setAgents(rows);
    } catch (err) {
      toast.error('Failed to delete agent');
      console.error('Delete agent error:', err);
    }
    setLoading(false);
  };


  const columns = useMemo(() => [
    {
      header: (
        <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('name')}>
          Name
          {sortBy.column === 'name' && (
            <span style={{ marginLeft: 6, fontSize: 16, color: '#1a2942' }}>
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </span>
      ),
      accessorKey: 'name',
      enableSorting: true,
      cell: row => {
        if (editRowId === row.row.original.id) {
          return (
            <Input
              className="examcode-input"
              value={editFields.name}
              onChange={e => handleEditFieldChange('name', e.target.value)}
              placeholder="Name"
            />
          );
        }
        return row.row.original.name || '';
      },
    },
    {
      header: <span>Username</span>,
      accessorKey: 'username',
      enableSorting: false,
      cell: row => editRowId === row.row.original.id ? (
        <Input className="examcode-input" value={editFields.username} onChange={e => handleEditFieldChange('username', e.target.value)} placeholder="Username" style={{maxWidth:"1000px"}} />
      ) : (row.row.original.username || ''),
    },
    {
      header: <span>Password</span>,
      accessorKey: 'password',
      enableSorting: false,
      cell: row => editRowId === row.row.original.id ? (
        <Input className="examcode-input" value={editFields.password} onChange={e => handleEditFieldChange('password', e.target.value)} placeholder="Password" type="text" style={{maxWidth:"1000px"}} />
      ) : (row.row.original.password || ''),
    },
    {
      header: <span>Action</span>,
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
            <button
              type="button"
              className="examcode-action-btn"
              title="Assign User"
              style={{ color: '#27ae60', marginLeft: 4 }}
              onClick={e => { e.preventDefault(); openAssignModal(row.row.original); }}
            >
              <i className="mdi mdi-account-multiple-plus-outline"></i>
            </button>
          </div>
        );
      }
    },
  ], [editRowId, editFields, sortBy, sortDirection, handleEditFieldChange, handleEditClick, handleSort, handleEditSave, handleEditCancel, setDeleteRowId, setShowDeleteModal]);

  // const handleSort = (column) => {
  //   setSortBy(prev => {
  //     const order = prev.column === column && prev.order === 'asc' ? 'desc' : 'asc';
  //     return { column, order };
  //   });
  //   setCurrentPage(1);
  // };

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

  // const handleDelete = async (id) => {
  //   setLoading(true);
  //   try {
  //     await api.delete(`/agents/${id}`);
  //     toast.success('Agent deleted');
  //     setCurrentPage(1);
  //     setShowDeleteModal(false);
  //     setDeleteRowId(null);
  //     const res = await api.get('/agents', { params: { page: 1, pageSize, search } });
  //     let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
  //     setUsers(rows);
  //   } catch (err) {
  //     toast.error('Failed to delete agent');
  //     console.error('Delete agent error:', err);
  //   }
  //   setLoading(false);
  // };

  // const handleEditClick = (row) => {
  //   setEditRowId(row.id);
  //   setEditName(row.name);
  //   setEditUsername(row.username);
  //   setEditPassword(row.password);
  // };

  // const handleEditCancel = () => {
  //   setEditRowId(null);
  //   setEditName('');
  //   setEditUsername('');
  //   setEditPassword('');
  // };

  // const handleEditSave = async (id) => {
  //   if (!editName || !editUsername || !editPassword) return toast.error('Please enter all fields');
  //   setLoading(true);
  //   try {
  //     await api.put(`/agents/${id}`, { name: editName, username: editUsername, password: editPassword });
  //     toast.success('Agent updated');
  //     setEditRowId(null);
  //     setEditName('');
  //     setEditUsername('');
  //     setEditPassword('');
  //     setCurrentPage(1);
  //     const res = await api.get('/agents', { params: { page: 1, pageSize, search } });
  //     let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
  //     setUsers(rows);
  //   } catch (err) {
  //     toast.error('Failed to update agent');
  //     console.error('Update agent error:', err);
  //   }
  //   setLoading(false);
  // };

  // Fetch available users for assignment
  const fetchAvailableUsers = async () => {
    try {
      const res = await api.get('/users', { params: { role_id: 3, agent_id: null } });
      setAvailableUsers(Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    } catch (err) {
      toast.error('Failed to load users for assignment');
    }
  };

const openAssignModal = async (agent) => {
  setAssigningAgent(agent);
  setAssignModalOpen(true);

  try {
    // Fetch all users for the checkbox list
    const allRes = await api.get('/users', { params: { role_id: 3 } });
    const allUsers = Array.isArray(allRes.data.data) ? allRes.data.data : (Array.isArray(allRes.data) ? allRes.data : []);
    setAvailableUsers(allUsers);

    // Fetch users assigned to this agent
    const assignedRes = await api.get(`/agents/${agent.id}/users`);
    const assignedUsers = Array.isArray(assignedRes.data.data) ? assignedRes.data.data : (Array.isArray(assignedRes.data) ? assignedRes.data : []);
    const assignedIds = assignedUsers.map(u => u.id);
    setSelectedUserIds(assignedIds);
  } catch (err) {
    toast.error('Failed to load users for assignment');
    setAvailableUsers([]);
    setSelectedUserIds([]);
  }
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
    <React.Fragment>
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

      {/* Header Bar: Title and divider */}
      <div className="examcode-header-bar">
        <div>
          <div className="examcode-title-text">Agent Management</div>
          <div className="examcode-title-divider"></div>
        </div>
      </div>

      {/* Create Agent Section centered (Examcode style) */}
      <div className="examcode-form-row">
        <div style={{ minWidth: 220, maxWidth: 220 }}>
          <Label className="fw-semibold">Name</Label>
          <Input className="examcode-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" />
        </div>
        <div style={{ minWidth: 220, maxWidth: 220 }}>
          <Label className="fw-semibold">Username</Label>
          <Input className="examcode-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" />
        </div>
        <div style={{ minWidth: 220, maxWidth: 220 }}>
          <Label className="fw-semibold">Password</Label>
          <Input className="examcode-input" type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
        </div>
        <div>
          <button className="examcode-create-btn" onClick={handleAddAgent} disabled={loading} type="button">Create</button>
        </div>
      </div>
      {/* Table Bar: Page Size + Search (Examcode style) */}
      <div className="examcode-tablebar" style={{alignItems:'center', justifyContent: 'space-between', display: 'flex', minHeight: 56, padding: '18px 32px 0 32px', width: '100%', boxSizing: 'border-box'}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <Label className="me-2 fw-semibold" style={{marginBottom:0}}>Page size</Label>
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
        <div style={{display:'flex',alignItems:'center',marginRight:8}}>
          <Input
            type="search"
            className="form-control d-inline-block w-auto examcode-input"
            style={{ minWidth: 280, maxWidth: 340, width: 320, marginLeft: 'auto' }}
            placeholder="Search..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>
      {/* Table Section */}
      <div style={{ padding: '32px 0 32px 0', width: '100%', background: '#fff', boxSizing: 'border-box' }}>
        <Row>
          <Col xs={12} className="examcode-table-shadow">
            {Array.isArray(agents) ? (
              <TableContainer
                columns={columns}
                data={agents}
                isCustomPageSize={false}
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
                fromRecord={agents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                toRecord={agents.length === 0 ? 0 : (currentPage - 1) * pageSize + agents.length}
                onSortChange={handleSort}
                sortBy={sortBy.column}
                sortDirection={sortDirection}
              />
            ) : (
              <div style={{ color: 'red', padding: '20px' }}>Error loading data. Please check your API response.</div>
            )}
          </Col>
        </Row>
      </div>
      {/* Delete confirmation modal (Examcode style) */}
      {showDeleteModal && (
        <div className="examcode-modal-backdrop" style={{zIndex: 2000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(44,62,80,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="examcode-modal" style={{minWidth: 340, maxWidth: '90vw', borderRadius: 18, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '24px 32px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div className="examcode-modal-icon" style={{fontSize: 48, color: '#ff4d4f', marginBottom: 12}}>
              <i className="mdi mdi-alert-circle-outline"></i>
            </div>
            <div className="examcode-modal-title" style={{fontWeight: 700, fontSize: 22, color: '#1a2942', marginBottom: 8}}>Delete Agent?</div>
            <div className="examcode-modal-message" style={{fontSize: 16, color: '#1a2942', marginBottom: 24, textAlign: 'center'}}>Are you sure you want to delete this agent? This action cannot be undone.</div>
            <div className="examcode-modal-btns" style={{display: 'flex', gap: 16}}>
              <button className="examcode-cancel-btn" onClick={() => setShowDeleteModal(false)} type="button">Cancel</button>
              <button className="examcode-save-btn" style={{background:'#ff4d4f', color:'#fff', border:'none', borderRadius:100, fontWeight:600, fontSize:'1rem', padding:'8px 28px'}} onClick={() => handleDelete(deleteRowId)} type="button">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign User Modal (Examcode style) */}
      {assignModalOpen && (
        <div className="examcode-modal-backdrop" style={{zIndex: 2000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(44,62,80,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="examcode-modal" style={{minWidth: 340, maxWidth: '90vw', borderRadius: 18, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '24px 32px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div className="examcode-modal-icon" style={{fontSize: 48, color: '#27ae60', marginBottom: 12}}>
              <i className="mdi mdi-account-multiple-plus-outline"></i>
            </div>
            <div className="examcode-modal-title" style={{fontWeight: 700, fontSize: 22, color: '#1a2942', marginBottom: 8}}>Assign Users to Agent</div>
            <div className="examcode-modal-message" style={{fontSize: 16, color: '#1a2942', marginBottom: 24, textAlign: 'center'}}>Select users to assign to this agent.</div>
            <div style={{width:'100%', maxHeight: 220, overflowY: 'auto', marginBottom: 24, border: '1.5px solid #e3e6ef', borderRadius: 10, padding: 12, background: '#fafdff'}}>
              {availableUsers.length === 0 ? (
                <div style={{color:'#888'}}>No available users to assign.</div>
              ) : (
                availableUsers.map(user => (
                  <div key={user.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedUserIds(prev => [...prev, user.id]);
                        } else {
                          setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                        }
                      }}
                      id={`assign-user-${user.id}`}
                      style={{marginRight:6}}
                    />
                    <label htmlFor={`assign-user-${user.id}`} style={{margin:0, fontWeight:500, color:'#1a2942'}}>{user.name} <span style={{color:'#888',fontWeight:400}}>{user.username}</span></label>
                  </div>
                ))
              )}
            </div>
            <div className="examcode-modal-btns" style={{display: 'flex', gap: 16}}>
              <button className="examcode-cancel-btn" onClick={() => { setAssignModalOpen(false); setAssigningAgent(null); setSelectedUserIds([]); }} type="button">Cancel</button>
              <button className="examcode-save-btn" style={{background:'#27ae60', color:'#fff', border:'none', borderRadius:100, fontWeight:600, fontSize:'1rem', padding:'8px 28px'}} onClick={handleAssignUsers} type="button" disabled={selectedUserIds.length === 0}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign User Modal (Examcode style) */}
      {assignModalOpen && (
        <div className="examcode-modal-backdrop" style={{zIndex: 2000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(44,62,80,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="examcode-modal" style={{minWidth: 340, maxWidth: '90vw', borderRadius: 18, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '24px 32px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div className="examcode-modal-icon" style={{fontSize: 48, color: '#27ae60', marginBottom: 12}}>
              <i className="mdi mdi-account-multiple-plus-outline"></i>
            </div>
            <div className="examcode-modal-title" style={{fontWeight: 700, fontSize: 22, color: '#1a2942', marginBottom: 8}}>Assign Users to Agent</div>
            <div className="examcode-modal-message" style={{fontSize: 16, color: '#1a2942', marginBottom: 24, textAlign: 'center'}}>Select users to assign to this agent.</div>
            <div style={{width:'100%', maxHeight: 220, overflowY: 'auto', marginBottom: 24, border: '1.5px solid #e3e6ef', borderRadius: 10, padding: 12, background: '#fafdff'}}>
              {availableUsers.length === 0 ? (
                <div style={{color:'#888'}}>No available users to assign.</div>
              ) : (
                availableUsers.map(user => (
                  <div key={user.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedUserIds(prev => [...prev, user.id]);
                        } else {
                          setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                        }
                      }}
                      id={`assign-user-${user.id}`}
                      style={{marginRight:6}}
                    />
                    <label htmlFor={`assign-user-${user.id}`} style={{margin:0, fontWeight:500, color:'#1a2942'}}>{user.name} <span style={{color:'#888',fontWeight:400}}>{user.username}</span></label>
                  </div>
                ))
              )}
            </div>
            <div className="examcode-modal-btns" style={{display: 'flex', gap: 16}}>
              <button className="examcode-cancel-btn" onClick={() => { setAssignModalOpen(false); setAssigningAgent(null); setSelectedUserIds([]); }} type="button">Cancel</button>
              <button className="examcode-save-btn" style={{background:'#27ae60', color:'#fff', border:'none', borderRadius:100, fontWeight:600, fontSize:'1rem', padding:'8px 28px'}} onClick={handleAssignUsers} type="button" disabled={selectedUserIds.length === 0}>Save</button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default AgentList;
