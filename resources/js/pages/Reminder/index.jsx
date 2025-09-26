import React, { useEffect, useMemo, useState } from "react";
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
import Spinners from "../../components/Common/Spinner";
import { ToastContainer, toast } from "react-toastify";
import { Row, Col, Input, Label } from 'reactstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function ReminderList() {
    //meta title
    document.title = "Reminders";

    const [customPageSize, setCustomPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [reminders, setReminders] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [fromRecord, setFromRecord] = useState(0);
    const [toRecord, setToRecord] = useState(0);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("");
    const [sortDirection, setSortDirection] = useState("asc");

    // Filter state for each column
    const [filterAgent, setFilterAgent] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterGroup, setFilterGroup] = useState('');
    const [filterExamCode, setFilterExamCode] = useState('');
    const [filterStartDate, setFilterStartDate] = useState(null);
    const [filterEndDate, setFilterEndDate] = useState(null);
    // Options for select filters (should be fetched from backend in real app)
    const [agentOptions, setAgentOptions] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [groupOptions, setGroupOptions] = useState([]);
    const [examCodeOptions, setExamCodeOptions] = useState([]);

    // Edit state
    const [editRowId, setEditRowId] = useState(null);
    const [editRemindDate, setEditRemindDate] = useState(null);

    // Fetch filter options on mount (simulate API call)
    useEffect(() => {
        api.get('/reminders/filters').then(res => {
            setAgentOptions(res.data.agents || []);
            setUserOptions(res.data.users || []);
            setGroupOptions(res.data.groups || []);
            setExamCodeOptions(res.data.examcodes || []);
        });
    }, []);

    // Add filter params to fetchReminders
    const fetchReminders = (page = 1, pageSize = customPageSize, searchVal = search, sortByVal = sortBy, sortDirVal = sortDirection) => {
        setLoading(true);
        const formatDate = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
        api.get(`/reminders`, {
            params: {
                page,
                pageSize,
                search: searchVal,
                sortBy: sortByVal,
                sortDirection: sortDirVal,
                agent: filterAgent,
                user: filterUser,
                group: filterGroup,
                examcode: filterExamCode,
                date_start: formatDate(filterStartDate),
                date_end: formatDate(filterEndDate)
            }
        })
                        .then(res => {
                                setTotalRecords(res.data.total || res.data.length || 0);
                                setCurrentPage(res.data.page || 1);
                                setCustomPageSize(res.data.pageSize || pageSize);
                                setFromRecord((res.data.page - 1) * res.data.pageSize + 1);
                                setToRecord(((res.data.page - 1) * res.data.pageSize) + (res.data.data ? res.data.data.length : 0));
                                setReminders((res.data.data || []).map(r => ({
                                    ...r,
                                    id: r.s_id 
                                })));
                                setLoading(false);
                        })
                        .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchReminders(currentPage, customPageSize, search, sortBy, sortDirection);
    }, [currentPage, customPageSize, search, sortBy, sortDirection]);

    // Refetch reminders when filters change
    useEffect(() => {
        setCurrentPage(1);
        fetchReminders(1, customPageSize, search, sortBy, sortDirection);
    }, [filterAgent, filterUser, filterGroup, filterExamCode, filterStartDate, filterEndDate]);

    const columns = useMemo(() => [
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('agent')}>
                    Agent
                    {sortBy === 'agent' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#2ba8fb' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'agent',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.agent?.name || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('user')}>
                    User
                    {sortBy === 'user' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#2ba8fb' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'user',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.user?.name || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('groupname')}>
                    Group Name
                    {sortBy === 'groupname' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#2ba8fb' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'groupname',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.e_group_name || cellProps.row.original.s_group_name || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('examcode')}>
                    Exam Code
                    {sortBy === 'examcode' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#2ba8fb' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'examcode',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.e_exam_code || cellProps.row.original.s_exam_code || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('date')}>
                    Date
                    {sortBy === 'date' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#2ba8fb' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'date',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.formatted_e_date || cellProps.row.original.formatted_s_date || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('reminddate')}>
                    Remind Date
                    {sortBy === 'reminddate' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#2ba8fb' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'reminddate',
            enableSorting: true,
            cell: (cellProps) => {
                const rowId = cellProps.row.original.id;
                // Robust date parser for DD/MM/YYYY and YYYY-MM-DD
                                                function parseDate(str) {
                                                    if (!str) return null;
                                                    // Strict DD/MM/YYYY
                                                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                                                        const [day, month, year] = str.split('/');
                                                        return new Date(Number(year), Number(month) - 1, Number(day));
                                                    }
                                                    // Strict YYYY-MM-DD or ISO (YYYY-MM-DDTHH:mm:ss)
                                                    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
                                                    if (isoMatch) {
                                                        const [_, year, month, day] = isoMatch;
                                                        return new Date(Number(year), Number(month) - 1, Number(day));
                                                    }
                                                    return null;
                                                }
                                                function formatDMY(dateStr) {
                                                    const d = parseDate(dateStr);
                                                    if (!d) return '';
                                                    const day = String(d.getDate()).padStart(2, '0');
                                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                                    const year = d.getFullYear();
                                                    return `${day}/${month}/${year}`;
                                                }
                if (editRowId === rowId) {
                    // Use react-datepicker for editing, like Examcode
                    let dateObj = null;
                    if (editRemindDate instanceof Date && !isNaN(editRemindDate)) {
                        dateObj = editRemindDate;
                    } else if (typeof editRemindDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(editRemindDate)) {
                        const [year, month, day] = editRemindDate.split('-');
                        dateObj = new Date(Number(year), Number(month) - 1, Number(day));
                    } else if (cellProps.row.original.s_remind_date) {
                        if (/^\d{2}\/\d{2}\/\d{4}$/.test(cellProps.row.original.s_remind_date)) {
                            const [day, month, year] = cellProps.row.original.s_remind_date.split('/');
                            dateObj = new Date(Number(year), Number(month) - 1, Number(day));
                        } else if (/^\d{4}-\d{2}-\d{2}$/.test(cellProps.row.original.s_remind_date)) {
                            const [year, month, day] = cellProps.row.original.s_remind_date.split('-');
                            dateObj = new Date(Number(year), Number(month) - 1, Number(day));
                        }
                    }
                    let displayDMY = '';
                    if (dateObj instanceof Date && !isNaN(dateObj)) {
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const year = dateObj.getFullYear();
                        displayDMY = `${day}/${month}/${year}`;
                    }
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <DatePicker
                                className="reminder-input"
                                selected={dateObj}
                                onChange={date => setEditRemindDate(date)}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Select remind date"
                                style={{ minWidth: 160 }}
                            />
                        </div>
                    );
                }
                return formatDMY(cellProps.row.original.s_remind_date);
            }
        },
        {
            header: 'Action',
            accessorKey: 'action',
            enableSorting: false,
            cell: (cellProps) => {
                const rowId = cellProps.row.original.id;
                if (editRowId === rowId) {
                    return (
                        <div>
                            <button className="examcode-update-btn" onClick={() => handleEditSave(rowId)} type="button">Update</button>
                            <button className="examcode-cancel-btn" onClick={handleEditCancel} type="button">Cancel</button>
                        </div>
                    );
                }
                return (
                    <button
                        type="button"
                        className="examcode-action-btn edit"
                        title="Edit Remind Date"
                        onClick={e => { e.preventDefault(); handleEditClick(cellProps.row.original); }}
                    >
                        <i className="mdi mdi-pencil-outline"></i>
                    </button>
                );
            }
        },
    ], [sortBy, sortDirection, currentPage, customPageSize, editRowId, editRemindDate]);

    const handlePageSizeChange = (newPageSize) => {
        setCustomPageSize(newPageSize);
        setCurrentPage(1);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handleSortChange = (columnId) => {
        setSortBy(columnId);
        setSortDirection(sortBy === columnId && sortDirection === 'asc' ? 'desc' : 'asc');
    };

    // Edit handlers
    const handleEditClick = (row) => {
        setEditRowId(row.id);
        // Set editRemindDate as Date object for react-datepicker
        if (row.s_remind_date) {
            let dateObj = null;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(row.s_remind_date)) {
                const [day, month, year] = row.s_remind_date.split('/');
                dateObj = new Date(Number(year), Number(month) - 1, Number(day));
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(row.s_remind_date)) {
                const [year, month, day] = row.s_remind_date.split('-');
                dateObj = new Date(Number(year), Number(month) - 1, Number(day));
            }
            setEditRemindDate(dateObj);
        } else {
            setEditRemindDate(null);
        }
    };
    const handleEditCancel = () => {
        setEditRowId(null);
        setEditRemindDate(null);
    };
    const handleEditSave = async (id) => {
        if (!editRemindDate || !(editRemindDate instanceof Date) || isNaN(editRemindDate)) {
            toast.error('Please select remind date');
            return;
        }
        setLoading(true);
        try {
            // Convert to YYYY-MM-DD for API
            const year = editRemindDate.getFullYear();
            const month = String(editRemindDate.getMonth() + 1).padStart(2, '0');
            const day = String(editRemindDate.getDate()).padStart(2, '0');
            const apiDate = `${year}-${month}-${day}`;
            await api.put(`/reminders/${id}`, { remind_date: apiDate });
            toast.success('Remind date updated');
            setEditRowId(null);
            setEditRemindDate(null);
            fetchReminders(currentPage, customPageSize, search, sortBy, sortDirection);
        } catch (err) {
            toast.error('Failed to update remind date');
        }
        setLoading(false);
    };

    const handleClearFilters = () => {
        setFilterAgent('');
        setFilterUser('');
        setFilterGroup('');
        setFilterExamCode('');
        setFilterStartDate(null);
        setFilterEndDate(null);
    };

    return (
        <div className="page-content" style={{ minHeight: '100vh', background: '#f6f8fa', padding: 0, width: '100vw', overflowX: 'hidden', paddingTop: '64px' }}>
            <style>{`
                .reminder-header-bar {
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
                .reminder-title-text {
                  font-size: 2.1rem;
                  font-weight: 700;
                  color: #1a2942;
                  margin-bottom: 0.5rem;
                  letter-spacing: 0.01em;
                  text-align: left;
                }
                .reminder-title-divider {
                  width: 60px;
                  height: 4px;
                  background: #2ba8fb;
                  border-radius: 2px;
                  margin: 18px 0 0 0;
                  opacity: 0.8;
                }
                .reminder-tablebar {
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
                .reminder-table-shadow {
                  box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08);
                  border-radius: 18px;
                  background: #fff;
                }
                .reminder-input {
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
                @media (max-width: 700px) {
                  .reminder-header-bar, .reminder-tablebar, .reminder-filterbar {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 16px;
                  }
                }
            `}</style>
            {/* Header Bar: Title only */}
            <div className="reminder-header-bar">
                <div>
                    <div className="reminder-title-text">Reminders</div>
                    <div className="reminder-title-divider"></div>
                </div>
            </div>
            {/* Filter Bar */}
            <div className="reminder-filterbar" style={{ width: '100vw', background: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, padding: '18px 32px 0 32px' }}>
                <div style={{ fontWeight: 600, fontSize: 21, color: '#1a2942', marginRight: 18 }}>Filter</div>
                    <select className="reminder-input" value={filterAgent} onChange={e => setFilterAgent(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">All Agents</option>
                        {agentOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                    <select className="reminder-input" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">All Users</option>
                        {userOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                    <select className="reminder-input" value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">All Groups</option>
                        {groupOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                    <select className="reminder-input" value={filterExamCode} onChange={e => setFilterExamCode(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">All Exam Codes</option>
                        {examCodeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.code}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <DatePicker
                                className="reminder-input examcode-date"
                                selected={filterStartDate}
                                onChange={setFilterStartDate}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Start Date"
                                isClearable
                                style={{ minWidth: 140 }}
                            />
                          
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <DatePicker
                                className="reminder-input examcode-date"
                                selected={filterEndDate}
                                onChange={setFilterEndDate}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="End Date"
                                isClearable
                                style={{ minWidth: 140 }}
                            />
                           
                        </div>
                    </div>
                    {(!!filterAgent || !!filterUser || !!filterGroup || !!filterExamCode || !!filterStartDate || !!filterEndDate) && (
                        <button className="examcode-cancel-btn" onClick={handleClearFilters} type="button">Clear</button>
                    )}
            </div>
            {/* Search + Page Size Controls */}
            <div className="reminder-tablebar">
                <div>
                    <Label className="me-2 fw-semibold">Page size</Label>
                    <select
                        className="form-select d-inline-block w-auto reminder-input"
                        value={customPageSize}
                        onChange={e => handlePageSizeChange(Number(e.target.value))}
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
                        className="form-control d-inline-block w-auto reminder-input"
                        style={{ minWidth: 280, maxWidth: 340, width: 320 }}
                        placeholder="Search..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                </div>
            </div>
            {/* Table Section */}
            <div style={{ padding: '32px 32px 32px 32px', width: '100%', background: '#fff' }}>
                {isLoading ? <Spinners setLoading={setLoading} /> :
                    <Row>
                        <Col xs={12} className="reminder-table-shadow">
                            <TableContainer
                                columns={columns}
                                data={reminders || []}
                                isCustomPageSize={false}
                                isGlobalFilter={false}
                                isJobListGlobalFilter={false}
                                isPagination={true}
                                tableClass="align-middle table-nowrap dt-responsive nowrap w-100 table-check dataTable no-footer dtr-inline mt-4 border-top"
                                pagination="pagination"
                                paginationWrapper="dataTables_paginate paging_simple_numbers pagination-rounded"
                                customPageSize={customPageSize}
                                currentPage={currentPage}
                                totalRecords={totalRecords}
                                onPageSizeChange={handlePageSizeChange}
                                onPageChange={handlePageChange}
                                fromRecord={fromRecord}
                                toRecord={toRecord}
                                onSortChange={handleSortChange}
                                sortBy={sortBy}
                                sortDirection={sortDirection}
                                noDataComponent={<tr><td colSpan={5} className="text-center">No reminders found</td></tr>}
                            />
                        </Col>
                    </Row>
                }
            </div>
            <ToastContainer />
        </div>
    );
}

export default ReminderList;