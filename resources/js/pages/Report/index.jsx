import React, { useEffect, useMemo, useState } from "react";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
import { Col, Row, Card, CardBody, Input, Label } from "reactstrap";
import Spinners from "../../components/Common/Spinner";
import { ToastContainer } from "react-toastify";

function ReportList() {
    // State for toggling filter/search controls
    const [showFullControls, setShowFullControls] = useState(false);
    document.title = "Report";

    const [customPageSize, setCustomPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [reports, setReports] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [fromRecord, setFromRecord] = useState(0);
    const [toRecord, setToRecord] = useState(0);
    const [users, setUsers] = useState([]);
    const [agents, setAgents] = useState([]);
    const [groupOptions, setGroupOptions] = useState([]);
    const [examCodeOptions, setExamCodeOptions] = useState([]);
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedAgent, setSelectedAgent] = useState("");
    const [selectedGroup, setSelectedGroup] = useState("");
    const [selectedExamCode, setSelectedExamCode] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState('s_id');
    const [sortOrder, setSortOrder] = useState('desc');
    const [roleId, setRoleId] = useState(null);


    const fetchReports = (page = 1, pageSize = customPageSize, sortField = sortBy, sortDir = sortOrder, searchVal = search) => {
        setLoading(true);
        const formatDate = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
        api.get(`/report`, {
            params: {
                page,
                pageSize,
                search: searchVal,
                sortBy: sortField,
                sortOrder: sortDir,
                agent_id: selectedAgent,
                user_id: selectedUser,
                s_group_name: selectedGroup,
                s_exam_code: selectedExamCode,
                s_status: selectedStatus,
                start_date: formatDate(startDate),
                end_date: formatDate(endDate)
            }
        })
            .then(res => {
                const data = res.data.data || [];
                const total = res.data.total || data.length;
                const pageNum = res.data.current_page || page;
                const pageSizeNum = res.data.per_page || pageSize;
                // Calculate from/to if not provided
                let from = res.data.from;
                let to = res.data.to;
                if (!from || !to) {
                    from = data.length > 0 ? (pageNum - 1) * pageSizeNum + 1 : 0;
                    to = data.length > 0 ? from + data.length - 1 : 0;
                }
                setTotalRecords(total);
                setCurrentPage(pageNum);
                setCustomPageSize(pageSizeNum);
                setFromRecord(from);
                setToRecord(to);
                setReports(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        const obj = JSON.parse(sessionStorage.getItem("authUser"));
        if (obj && obj.role_id) {
            setRoleId(obj.role_id);
        }
    }, []);

    useEffect(() => {
        fetchReports(currentPage, customPageSize, sortBy, sortOrder, search);
        // eslint-disable-next-line
    }, [currentPage, customPageSize, sortBy, sortOrder, search, selectedAgent, selectedUser, selectedGroup, selectedExamCode, selectedStatus, startDate, endDate]);

    useEffect(() => {
        // Fetch users, agents, groups, exam codes for dropdowns
        api.get('/schedule/filter-managed-data').then(res => {
            setUsers(res.data.users || []);
            setAgents(res.data.agents || []);
            setGroupOptions(res.data.groups || []);
            setExamCodeOptions(res.data.examcodes || []);
        });
    }, []);

    const handleSortChange = React.useCallback((field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    }, [sortBy]);

    const columns = useMemo(() => [
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('s_id')}>
                    SNo
                    {sortBy === 's_id' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 's_id',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_id}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('agent')}>
                    Agent
                    {sortBy === 'agent' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'agent',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.agent?.name || cellProps.row.original.agent || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('user')}>
                    User
                    {sortBy === 'user' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'user',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.user?.name || cellProps.row.original.user || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('group_name')}>
                    Group Name
                    {sortBy === 'group_name' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'group_name',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.group_name || cellProps.row.original.e_group_name || cellProps.row.original.s_group_name || ''}</span>
        },
        {
            header: (   
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('exam_code')}>
                    Exam Code
                    {sortBy === 'exam_code' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'exam_code',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.examcode?.ex_code || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('timezone')}>
                    Timezone
                    {sortBy === 'timezone' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'timezone',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_area || cellProps.row.original.timezone || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('date')}>
                    Date
                    {sortBy === 'date' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'date',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.formatted_s_date_original || cellProps.row.original.date || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('indian_time')}>
                    Indian Time
                    {sortBy === 'indian_time' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'indian_time',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.formatted_s_date || cellProps.row.original.indian_time || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('comment')}>
                    Comment
                    {sortBy === 'comment' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'comment',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_comment || cellProps.row.original.comment || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('done_by')}>
                    Done By
                    {sortBy === 'done_by' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'done_by',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_done_by || cellProps.row.original.done_by || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('voucher_fee')}>
                    Voucher Fee
                    {sortBy === 'voucher_fee' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'voucher_fee',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_voucher_fee || cellProps.row.original.voucher_fee || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('support_fee')}>
                    Support Fee
                    {sortBy === 'support_fee' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'support_fee',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_support_fee || cellProps.row.original.support_fee || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('total_fees')}>
                    Total Fees
                    {sortBy === 'total_fees' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 'total_fees',
            enableSorting: true,
            cell: (cellProps) => {
                const voucher = parseFloat(cellProps.row.original.s_voucher_fee || cellProps.row.original.voucher_fee || 0);
                const support = parseFloat(cellProps.row.original.s_support_fee || cellProps.row.original.support_fee || 0);
                return <span>{voucher + support}</span>;
            }
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('s_status')}>
                    Status
                    {sortBy === 's_status' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                </span>
            ),
            accessorKey: 's_status',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_status || cellProps.row.original.status || cellProps.row.original.e_status || ''}</span>
        },
    ], [sortBy, sortOrder, handleSortChange]);

    const handlePageSizeChange = (newPageSize) => {
        setCustomPageSize(newPageSize);
        setCurrentPage(1);
    };
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };
    const handleClearFilters = () => {
        setSelectedAgent("");
        setSelectedUser("");
        setSelectedGroup("");
        setSelectedExamCode("");
        setSelectedStatus("");
        setStartDate(null);
        setEndDate(null);
        setSearch("");
    };

    return (
        <React.Fragment>
            <style>{`
                .reminder-header-bar { width: 100vw; background: #fff; box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08); border-radius: 0 0 18px 18px; padding: 32px 32px 0 32px; display: flex; flex-direction: column; align-items: center; gap: 0; }
                .reminder-title-text { font-size: 2.1rem; font-weight: 700; color: #1a2942; margin-bottom: 0.5rem; letter-spacing: 0.01em; text-align: left; }
                .reminder-title-divider { width: 60px; height: 4px; background: #2ba8fb; border-radius: 2px; margin: 18px 0 0 0; opacity: 0.8; }
                .reminder-filterbar { width: 100vw; background: #fff; display: flex; justify-content: center; align-items: flex-end; gap: 18px; padding: 18px 32px 0 32px; flex-wrap: wrap; flex-direction: row; }
                .reminder-input { border-radius: 10px !important; border: 1.5px solid #e3e6ef !important; box-shadow: 0 1.5px 8px rgba(44,62,80,0.04); font-size: 1.05rem; padding: 10px 16px; background: #fafdff !important; transition: border-color 0.2s; height: 44px !important; min-width: 140px; max-width: 220px; width: 100%; box-sizing: border-box; }
                .reminder-table-shadow { box-shadow: 0 4px 24px rgba(44,62,80,0.10), 0 1.5px 4px rgba(44,62,80,0.08); border-radius: 18px; overflow: hidden; }
                .reminder-table-shadow table { border-radius: 18px !important; overflow: hidden; background: #fff; }
                .reminder-table-shadow th, .reminder-table-shadow td { border-radius: 0 !important; }
                .table-edit-input, .table-edit-select { border-radius: 8px !important; border: 1.5px solid #e3e6ef !important; box-shadow: 0 1.5px 8px rgba(44,62,80,0.04); font-size: 1rem; padding: 7px 12px; background: #fafdff !important; transition: border-color 0.2s; height: 36px !important; min-width: 80px; max-width: 180px; width: 100%; box-sizing: border-box; }
                .table-edit-select { padding-right: 28px; }
                .examcode-action-btn { border: none; background: #f6f8fa; color: #2ba8fb; border-radius: 50%; width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.25rem; box-shadow: 0 1.5px 8px rgba(44,62,80,0.04); transition: background 0.2s, color 0.2s, box-shadow 0.2s; margin-right: 4px; position: relative; }
                .examcode-action-btn.edit { color: #2ba8fb; }
                .examcode-action-btn:hover { background: #e3e6ef; box-shadow: 0 2px 12px rgba(44,62,80,0.10); }
                .examcode-action-btn:active { background: #d0e7fa; }
                .examcode-action-btn .mdi { margin: 0; }
                .examcode-update-btn { background: #2ba8fb; color: #fff; border: none; border-radius: 100px; font-weight: 600; font-size: 1rem; padding: 8px 28px; box-shadow: 0 1.5px 8px rgba(44,62,80,0.04); transition: background 0.2s, box-shadow 0.2s; margin-right: 8px; }
                .examcode-update-btn:hover { background: #6fc5ff; box-shadow: 0 0 12px #6fc5ff50; }
                .examcode-update-btn:active { background: #3d94cf; }
                .examcode-cancel-btn { background: #f6f8fa; color: #1a2942; border: 1.5px solid #e3e6ef; border-radius: 100px; font-weight: 600; font-size: 1rem; padding: 8px 28px; transition: background 0.2s, color 0.2s; }
                .examcode-cancel-btn:hover { background: #e3e6ef; color: #2ba8fb; }
                .examcode-cancel-btn:active { background: #d0e7fa; }
                @media (max-width: 700px) { .reminder-header-bar, .reminder-filterbar { flex-direction: column; align-items: stretch; gap: 16px; } }
            `}</style>
            <div className="page-content" style={{ minHeight: '100vh', background: '#f6f8fa', padding: 0, width: '100vw', overflowX: 'hidden', paddingTop: '64px' }}>
                {/* Header Bar */}
                <div className="reminder-header-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, justifyContent: 'flex-start' }}>
                        <button
                            type="button"
                            className="examcode-action-btn"
                            style={{ background: '#f6f8fa', color: '#2ba8fb', borderRadius: '50%', width: 44, height: 44, fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', boxShadow: '0 1.5px 8px rgba(44,62,80,0.04)', marginRight: 12 }}
                            title={showFullControls ? 'Hide filters' : 'Show filters'}
                            onClick={() => setShowFullControls(v => !v)}
                        >
                            <i className={showFullControls ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'}></i>
                        </button>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div className="reminder-title-text">Report</div>
                            <div className="reminder-title-divider"></div>
                        </div>
                    </div>
                </div>
                {/* Filter Bar (Enquiry style) */}
                {showFullControls && (
                <div className="reminder-filterbar" style={{ width: '100vw', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '18px 32px 0 32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, width: '100%' }}>
                        <div style={{ fontWeight: 600, fontSize: 21, color: '#1a2942', marginRight: 18 }}>Filter</div>
                    { roleId !== 2 && roleId !== 3 && (
                        <select className="reminder-input" value={selectedAgent} onChange={e => { setSelectedAgent(e.target.value); setCurrentPage(1); }} style={{ minWidth: 180 }}>
                            <option value="">All Agents</option>
                            {agents.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                        </select>
                    )}
                    {roleId !== 3 && (
                        <select className="reminder-input" value={selectedUser} onChange={e => { setSelectedUser(e.target.value); setCurrentPage(1); }} style={{ minWidth: 180 }}>
                            <option value="">All Users</option>
                            {users.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                        </select>
                    )}
                        <select className="reminder-input" value={selectedGroup} onChange={e => { setSelectedGroup(e.target.value); setCurrentPage(1); }} style={{ minWidth: 180 }}>
                            <option value="">All Groups</option>
                            {groupOptions.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
                        </select>
                        <select className="reminder-input" value={selectedExamCode} onChange={e => { setSelectedExamCode(e.target.value); setCurrentPage(1); }} style={{ minWidth: 180 }}>
                            <option value="">All Exam Codes</option>
                            {examCodeOptions.map(opt => <option key={opt.id} value={opt.ex_code}>{opt.ex_code}</option>)}
                        </select>
                        <select className="reminder-input" value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }} style={{ minWidth: 180 }}>
                            <option value="">All Status</option>
                            <option value="TAKEN">TAKEN</option>
                            <option value="REVOKE">REVOKE</option>
                            <option value="DONE">DONE</option>
                            <option value="RESCHEDULE">RESCHEDULE</option>
                        </select>
                        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <DatePicker
                                    className="reminder-input examcode-date"
                                    selected={startDate}
                                    onChange={date => { setStartDate(date); setCurrentPage(1); }}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Start Date"
                                    isClearable
                                    style={{ minWidth: 160 }}
                                    calendarStartDay={1}
                                    renderCustomHeader={({ date, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => (
                                        <div style={{ margin: 10, display: "flex", justifyContent: "center" }}>
                                            <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>{'<'}</button>
                                            <span style={{ margin: '0 8px' }}>{date.toLocaleString('default', { month: 'long' })} {date.getFullYear()}</span>
                                            <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>{'>'}</button>
                                        </div>
                                    )}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <DatePicker
                                    className="reminder-input examcode-date"
                                    selected={endDate}
                                    onChange={date => { setEndDate(date); setCurrentPage(1); }}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="End Date"
                                    isClearable
                                    style={{ minWidth: 160 }}
                                    calendarStartDay={1}
                                    renderCustomHeader={({ date, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => (
                                        <div style={{ margin: 10, display: "flex", justifyContent: "center" }}>
                                            <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>{'<'}</button>
                                            <span style={{ margin: '0 8px' }}>{date.toLocaleString('default', { month: 'long' })} {date.getFullYear()}</span>
                                            <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>{'>'}</button>
                                        </div>
                                    )}
                                />
                            </div>
                        </div>

                        {(selectedAgent || selectedUser || selectedGroup || selectedExamCode || selectedStatus || startDate || endDate || search) && (
                            <button
                                type="button"
                                className="examcode-cancel-btn"
                                style={{ marginLeft: 12, minWidth: 120, height: 44 }}
                                onClick={handleClearFilters}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="reminder-tablebar" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
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
                </div>
                )}
                {/* Table Section (Enquiry/Examcode style) */}
                <div style={{ padding: '32px 32px 32px 32px', width: '100%', background: '#fff' }}>
                    {isLoading ? <Spinners setLoading={setLoading} /> :
                        <>
                            <Row>
                                <Col xs={12} className="reminder-table-shadow">
                                    <TableContainer
                                        columns={columns}
                                        data={reports || []}
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
                                        // Add sortBy and sortDirection props for full parity if needed
                                        sortBy={sortBy}
                                        sortDirection={sortOrder}
                                        // Optionally add noDataComponent for empty state
                                        noDataComponent={<tr><td colSpan={columns.length} className="text-center">No reports found</td></tr>}
                                    />
                                </Col>
                            </Row>
                        </>
                    }
                </div>
                <ToastContainer />
            </div>
        </React.Fragment>
    );
}

export default ReportList;
