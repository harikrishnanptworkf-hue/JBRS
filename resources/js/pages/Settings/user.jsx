import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Button, Label, Input } from 'reactstrap';
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
import DeleteModal from '../../components/Common/DeleteModal';

const CustomAlert = ({ open, message, severity, onClose, duration = 3000 }) => {
	const [visible, setVisible] = useState(open);
	const [fade, setFade] = useState(false);
	useEffect(() => {
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
		<div style={{ position: 'fixed', top: 80, left: 0, right: 0, zIndex: 2000, display: 'flex', justifyContent: 'center', pointerEvents: 'none', transition: 'opacity 0.4s', opacity: fade ? 0 : 1 }}>
			<div style={{ minWidth: 340, maxWidth: '90vw', background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 18, pointerEvents: 'auto', borderLeft: severity === 'success' ? '6px solid #27ae60' : '6px solid #ff4d4f' }}>
				<span style={{ fontSize: 32, color: severity === 'success' ? '#27ae60' : '#ff4d4f' }}>
					<i className={'mdi ' + iconClass}></i>
				</span>
				<span style={{ fontWeight: 600, color: '#1a2942', fontSize: 18 }}>{message}</span>
				<button onClick={() => { setVisible(false); onClose && onClose(); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 22, color: '#aaa', cursor: 'pointer' }}>&times;</button>
			</div>
		</div>
	);
};

const UserCore = () => {
	const [showFullControls, setShowFullControls] = useState(false);
	const [users, setUsers] = useState([]);
	const [agents, setAgents] = useState([]);
	const [name, setName] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [agentId, setAgentId] = useState('');
	const [pageSize, setPageSize] = useState(10);
	const [currentPage, setCurrentPage] = useState(1);
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(false);
	const [editRowId, setEditRowId] = useState(null);
	const [editName, setEditName] = useState('');
	const [editUsername, setEditUsername] = useState('');
	const [editPassword, setEditPassword] = useState('');
	const [editAgentId, setEditAgentId] = useState('');
	const editNameRef = useRef(null);
	const editUsernameRef = useRef(null);
	const editPasswordRef = useRef(null);
	const editAgentRef = useRef(null);
	const lastFocusedEditInputRef = useRef('');
	const editCursorPosRef = useRef(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleteRowId, setDeleteRowId] = useState(null);
	const [sortBy, setSortBy] = useState('name');
	const [sortDirection, setSortDirection] = useState('asc');
	const [totalRecords, setTotalRecords] = useState(0);
	const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

	const showSnackbar = (message, severity = 'success') => {
		setSnackbar({ open: true, message, severity });
	};

	const columns = [
		{
			id: 'name',
			header: (
				<span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('name')}>
					Name
					{sortBy === 'name' && (
						<span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
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
							type="text"
							value={editName}
							innerRef={editNameRef}
							onChange={e => {
								setEditName(e.target.value);
								lastFocusedEditInputRef.current = 'name';
								editCursorPosRef.current = { field: 'name', pos: e.target.selectionStart };
							}}
							placeholder="Enter name"
							className="examcode-input"
							style={{ height: 44, textAlign: 'center' }}
							onFocus={e => {
								lastFocusedEditInputRef.current = 'name';
								editCursorPosRef.current = { field: 'name', pos: e.target.selectionStart };
							}}
						/>
					);
				}
				return row.row.original.name || '';
			},
		},
		{
			id: 'username',
			header: (
				<span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('username')}>
					Username
					{sortBy === 'username' && (
						<span style={{ marginLeft: 6, fontSize: 16, color: '#1a2942' }}>
							{sortDirection === 'asc' ? '▲' : '▼'}
						</span>
					)}
				</span>
			),
			accessorKey: 'username',
			enableSorting: true,
			cell: row => {
				if (editRowId === row.row.original.id) {
					return (
						<Input
							type="text"
							value={editUsername}
							innerRef={editUsernameRef}
							onChange={e => {
								setEditUsername(e.target.value);
								lastFocusedEditInputRef.current = 'username';
								editCursorPosRef.current = { field: 'username', pos: e.target.selectionStart };
							}}
							placeholder="Enter username"
							className="examcode-input"
							style={{ height: 44, textAlign: 'center' }}
							onFocus={e => {
								lastFocusedEditInputRef.current = 'username';
								editCursorPosRef.current = { field: 'username', pos: e.target.selectionStart };
							}}
						/>
					);
				}
				return row.row.original.username || '';
			},
		},
			{
				id: 'password',
				header: (
					<span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('password')}>
						Password
						{sortBy === 'password' && (
							<span style={{ marginLeft: 6, fontSize: 16, color: '#1a2942' }}>
								{sortDirection === 'asc' ? '▲' : '▼'}
							</span>
						)}
					</span>
				),
				accessorKey: 'password',
				enableSorting: true,
				cell: row => {
					if (editRowId === row.row.original.id) {
						return (
							<Input
								type="text"
								value={editPassword}
								innerRef={editPasswordRef}
								onChange={e => {
									setEditPassword(e.target.value);
									lastFocusedEditInputRef.current = 'password';
									editCursorPosRef.current = { field: 'password', pos: e.target.selectionStart };
								}}
								placeholder="Enter password"
								className="examcode-input"
								style={{ height: 44, textAlign: 'center' }}
								onFocus={e => {
									lastFocusedEditInputRef.current = 'password';
									editCursorPosRef.current = { field: 'password', pos: e.target.selectionStart };
								}}
							/>
						);
					}
					// Truncate long password hashes for display
					const val = row.row.original.password || '';
					return val.length > 18 ? val.slice(0, 18) + '...' : val;
				},
			},
				{
					id: 'agent_id',
					header: (
						<span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', minWidth: 120, justifyContent: 'center' }}>
							Agent
						</span>
					),
					accessorKey: 'agent_id',
					enableSorting: false,
					cell: row => {
						if (editRowId === row.row.original.id) {
							return (
								<Input
									type="select"
									value={editAgentId}
									innerRef={editAgentRef}
									onChange={e => setEditAgentId(e.target.value)}
									className="examcode-input"
									style={{ height: 44, textAlign: 'center', minWidth: 120 }}
								>
									<option value="">Select agent</option>
									{agents.map(agent => (
										<option key={agent.id} value={agent.id}>{agent.name}</option>
									))}
								</Input>
							);
						}
						const agent = agents.find(a => a.id === row.row.original.agent_id);
						return (
							<div style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								{agent ? agent.name : <span style={{ color: '#aaa' }}>-</span>}
							</div>
						);
					},
				},
		{
			id: 'action',
			header: 'Actions',
			enableSorting: false,
			cell: row => {
				const rowId = row.row.original.id;
				if (editRowId === rowId) {
					return (
						<div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
							<button type="button" className="examcode-update-btn" onClick={() => handleEditSave(rowId)} disabled={loading} style={{ minWidth: 100 }}>Update</button>
							<button type="button" className="examcode-cancel-btn" onClick={handleEditCancel} style={{ minWidth: 100 }}>Cancel</button>
						</div>
					);
				}
				return (
					<ul className="list-unstyled hstack gap-1 mb-0" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%' }}>
						<li>
							<button type="button" className="examcode-action-btn edit" style={{ color: '#1a8cff', background: '#e6f2ff' }} title="Edit" onClick={() => handleEditClick(row.row.original)} id={`edit-tooltip-${rowId}`}><i className="mdi mdi-pencil-outline" /></button>
						</li>
						<li>
							<button type="button" className="examcode-action-btn delete" style={{ color: '#ff4d4f', background: '#fff1f0' }} title="Delete" onClick={() => { setDeleteRowId(rowId); setShowDeleteModal(true); }} id={`delete-tooltip-${rowId}`}><i className="mdi mdi-delete-outline" /></button>
						</li>
					</ul>
				);
			},
		},
	];

	useEffect(() => {
		// Fetch agents for dropdown
		api.get('/agents', { params: { page: 1, pageSize: 100 } })
			.then(res => {
				setAgents(Array.isArray(res.data.data) ? res.data.data : []);
			});
	}, []);

	useEffect(() => {
		if (editRowId !== null) {
			let ref = null;
			if (lastFocusedEditInputRef.current === 'name') ref = editNameRef.current;
			else if (lastFocusedEditInputRef.current === 'username') ref = editUsernameRef.current;
			else if (lastFocusedEditInputRef.current === 'password') ref = editPasswordRef.current;
			else if (lastFocusedEditInputRef.current === 'agent_id') ref = editAgentRef.current;
			if (ref) {
				ref.focus();
				if (editCursorPosRef.current && typeof editCursorPosRef.current.pos === 'number') {
					ref.setSelectionRange(editCursorPosRef.current.pos, editCursorPosRef.current.pos);
				}
			}
		}
	}, [editRowId, editName, editUsername, editPassword, editAgentId]);

	useEffect(() => {
		setLoading(true);
		api.get('/users', {
			params: { page: currentPage, pageSize, search, sortBy, sortDirection }
		})
			.then(res => {
				let rows = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
				setUsers(rows);
				setTotalRecords(res.data.total || 0);
				setLoading(false);
			})
			.catch((err) => {
				setLoading(false);
				setUsers([]);
				setTotalRecords(0);
				console.error('API error:', err);
			});
	}, [currentPage, pageSize, search, sortBy, sortDirection]);

	const handleAddUser = async () => {
		if (!name.trim() || !username.trim() || !password.trim() || !agentId) {
			showSnackbar('Please enter all fields', 'error');
			return;
		}
		setLoading(true);
		try {
			await api.post('/users', { name, username, password, agent_id: agentId });
			showSnackbar('User created successfully', 'success');
			setName('');
			setUsername('');
			setPassword('');
			setAgentId('');
			setCurrentPage(1);
			const res = await api.get('/users', { params: { page: 1, pageSize, search } });
			setUsers(res.data.data || []);
			setTotalRecords(res.data.total || (res.data.data ? res.data.data.length : 0));
		} catch (err) {
			showSnackbar('Failed to add user', 'error');
		}
		setLoading(false);
	};

	const handleDelete = async (id) => {
		setLoading(true);
		try {
			await api.delete(`/users/${id}`);
			showSnackbar('User deleted', 'success');
			setCurrentPage(1);
			setShowDeleteModal(false);
			setDeleteRowId(null);
			const res = await api.get('/users', { params: { page: 1, pageSize, search } });
			setUsers(res.data.data || []);
			setTotalRecords(res.data.total || (res.data.data ? res.data.data.length : 0));
		} catch (err) {
			showSnackbar('Failed to delete user', 'error');
		}
		setLoading(false);
	};

	const handleEditClick = (row) => {
		setEditRowId(row.id);
		setEditName(row.name);
		setEditUsername(row.username);
		setEditPassword(row.password);
		setEditAgentId(row.agent_id || '');
		lastFocusedEditInputRef.current = 'name';
		editCursorPosRef.current = { field: 'name', pos: 0 };
	};

	const handleEditCancel = () => {
		setEditRowId(null);
		setEditName('');
		setEditUsername('');
		setEditPassword('');
		setEditAgentId('');
	};

	const handleEditSave = async (id) => {
		if (!editName.trim() || !editUsername.trim() || !editPassword.trim() || !editAgentId) {
			showSnackbar('Please enter all fields', 'error');
			return;
		}
		setLoading(true);
		try {
			await api.put(`/users/${id}`, { name: editName, username: editUsername, password: editPassword, agent_id: editAgentId });
			showSnackbar('User updated', 'success');
			setEditRowId(null);
			setEditName('');
			setEditUsername('');
			setEditPassword('');
			setEditAgentId('');
			const res = await api.get('/users', { params: { page: currentPage, pageSize, search } });
			setUsers(res.data.data || []);
			setTotalRecords(res.data.total || (res.data.data ? res.data.data.length : 0));
		} catch (err) {
			showSnackbar('Failed to update user', 'error');
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
		<div className="" style={{ background: '#f6f8fa', overflowX: 'hidden' }}>
			{/* Header Bar: Title only */}
			<div className="examcode-header-bar" style={{borderRadius:"0px"}}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 18, justifyContent: 'flex-start' }}>
					<button type="button" className="examcode-action-btn" style={{ background: '#f6f8fa', color: '#2ba8fb', borderRadius: '50%', width: 44, height: 44, fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', boxShadow: '0 1.5px 8px rgba(44,62,80,0.04)', marginRight: 12 }} title={showFullControls ? 'Hide filters & create' : 'Show filters & create'} onClick={() => setShowFullControls(v => !v)}>
						<i className={showFullControls ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'}></i>
					</button>
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
						<div className="examcode-title-text">User</div>
						<div className="examcode-title-divider" style={{ width: 60, height: 4, background: '#2ba8fb', borderRadius: 2, margin: '8px 0 0 0', opacity: 0.8 }}></div>
					</div>
				</div>
			</div>
			{/* Animated show/hide for create/filter sections */}
			<div style={{ maxHeight: showFullControls ? 800 : 0, opacity: showFullControls ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.5s cubic-bezier(.4,0,.2,1), opacity 0.4s' }}>
				{/* Form Row: Name/Username/Password/Agent/Add */}
				<div className="examcode-form-row">
					<div style={{ minWidth: 220, maxWidth: 220 }}>
						<Label className="fw-semibold">Name</Label>
						<Input type="text" className="examcode-input" style={{ height: 44 }} value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" />
					</div>
					<div style={{ minWidth: 220, maxWidth: 220 }}>
						<Label className="fw-semibold">Username</Label>
						<Input type="text" className="examcode-input" style={{ height: 44 }} value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" />
					</div>
					<div style={{ minWidth: 220, maxWidth: 220 }}>
						<Label className="fw-semibold">Password</Label>
						<Input type="text" className="examcode-input" style={{ height: 44 }} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
					</div>
					<div style={{ minWidth: 220, maxWidth: 220 }}>
						<Label className="fw-semibold">Agent</Label>
						<Input type="select" className="examcode-input" style={{ height: 44 }} value={agentId} onChange={e => setAgentId(e.target.value)}>
							<option value="">Select agent</option>
							{agents.map(agent => (
								<option key={agent.id} value={agent.id}>{agent.name}</option>
							))}
						</Input>
					</div>
					<div>
						<Button className="examcode-create-btn" onClick={handleAddUser} disabled={loading}>Create</Button>
					</div>
				</div>
				{/* Table Bar: Page Size + Search */}
				<div className="examcode-tablebar" style={{justifyContent:"space-between"}}>
					<div>
						<Label className="me-2 fw-semibold">Page size</Label>
						<select className="form-select d-inline-block w-auto examcode-input" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} style={{ minWidth: 80 }}>
							{[5, 10, 20, 50, 100].map(size => (
								<option key={size} value={size}>{size}</option>
							))}
						</select>
					</div>
					<div>
						<Input type="search" className="form-control d-inline-block w-auto examcode-input" style={{ minWidth: 280, maxWidth: 340, width: 320 }} placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
					</div>
				</div>
			</div>
			{/* Listing Section */}
			<div style={{ width: '100%', background: '#fff' }}>
				<Row className="mb-2">
					<Col xs={12} className="examcode-table-shadow" style={{marginTop:'20px'}}>
						{Array.isArray(users) ? (
									<TableContainer
										columns={columns.map(col => ({ ...col, headerClassName: 'text-center', cellClassName: 'align-middle', style: { minHeight: 44, verticalAlign: 'middle' } }))}
										data={users}
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
				section="user"
				show={showDeleteModal}
				onDeleteClick={() => { handleDelete(deleteRowId); setShowDeleteModal(false); setDeleteRowId(null); }}
				onCloseClick={() => { setShowDeleteModal(false); setDeleteRowId(null); }}
			/>
			<CustomAlert open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
		</div>
	);
};

export default UserCore;
