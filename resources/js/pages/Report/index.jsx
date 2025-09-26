import React, { useEffect, useMemo, useState } from "react";
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
import { Col, Row, Card, CardBody, Input, Label } from "reactstrap";
import Spinners from "../../components/Common/Spinner";
import { ToastContainer } from "react-toastify";

function ReportList() {
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
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedAgent, setSelectedAgent] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [columnFilters, setColumnFilters] = useState([]);

    const fetchReports = (page = 1, pageSize = customPageSize, user = selectedUser, agent = selectedAgent, start = startDate, end = endDate, filters = columnFilters) => {
        setLoading(true);
        let url = `/report?page=${page}&pageSize=${pageSize}`;
        if (user) url += `&user_id=${user}`;
        if (agent) url += `&agent_id=${agent}`;
        if (start) url += `&start_date=${start}`;
        if (end) url += `&end_date=${end}`;
        // Add backend filters for s_exam_code and s_status
        filters.forEach(f => {
            if (f.id === 's_exam_code' && f.value) url += `&s_exam_code=${encodeURIComponent(f.value)}`;
            if (f.id === 's_status' && f.value) url += `&s_status=${encodeURIComponent(f.value)}`;
        });
        api.get(url)
            .then(res => {
                setTotalRecords(res.data.total || res.data.length || 0);
                setCurrentPage(res.data.page || 1);
                setCustomPageSize(res.data.pageSize || pageSize);
                setFromRecord((res.data.page - 1) * res.data.pageSize + 1);
                setToRecord(((res.data.page - 1) * res.data.pageSize) + (res.data.data ? res.data.data.length : 0));
                setReports(res.data.data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchReports(currentPage, customPageSize, selectedUser, selectedAgent, startDate, endDate, columnFilters);
    }, [currentPage, customPageSize, selectedUser, selectedAgent, startDate, endDate, columnFilters]);

    useEffect(() => {
        // Fetch users and agents for dropdowns
        api.get('/enquiries/filter-managed-data').then(res => {
            setUsers(res.data.users || []);
            setAgents(res.data.agents || []);
        });
    }, []);

    const columns = useMemo(() => [
        {
            header: 'S No',
            accessorKey: 'sno',
            enableColumnFilter: false,
            enableSorting: false,
            cell: (cellProps) => <span>{cellProps.row.index + 1 + ((currentPage - 1) * customPageSize)}</span>
        },
        {
            header: 'User',
            accessorKey: 'user',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.user?.name || cellProps.row.original.user || ''}</span>
        },
        {
            header: 'Agent',
            accessorKey: 'agent',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.agent?.name || cellProps.row.original.agent || ''}</span>
        },
        {
            header: 'Group Name',
            accessorKey: 'group_name',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.group_name || cellProps.row.original.e_group_name || cellProps.row.original.s_group_name || ''}</span>
        },
        {
            header: 'Exam Code',
            accessorKey: 's_exam_code',
            enableColumnFilter: true,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_exam_code || cellProps.row.original.exam_code || cellProps.row.original.e_exam_code || ''}</span>
        },
        {
            header: 'Timezone',
            accessorKey: 'timezone',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_area || cellProps.row.original.timezone || ''}</span>
        },
        {
            header: 'Date',
            accessorKey: 'date',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.formatted_s_date_original || cellProps.row.original.date || ''}</span>
        },
        {
            header: 'Indian Time',
            accessorKey: 'indian_time',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.formatted_s_date || cellProps.row.original.indian_time || ''}</span>
        },
        {
            header: 'Comment',
            accessorKey: 'comment',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_comment || cellProps.row.original.comment || ''}</span>
        },
        {
            header: 'Done By',
            accessorKey: 'done_by',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_done_by || cellProps.row.original.done_by || ''}</span>
        },
        {
            header: 'Voucher Fee',
            accessorKey: 'voucher_fee',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_voucher_fee || cellProps.row.original.voucher_fee || ''}</span>
        },
        {
            header: 'Support Fee',
            accessorKey: 'support_fee',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_support_fee || cellProps.row.original.support_fee || ''}</span>
        },
        {
            header: 'Total Fees',
            accessorKey: 'total_fees',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => {
                const voucher = parseFloat(cellProps.row.original.s_voucher_fee || cellProps.row.original.voucher_fee || 0);
                const support = parseFloat(cellProps.row.original.s_support_fee || cellProps.row.original.support_fee || 0);
                return <span>{voucher + support}</span>;
            }
        },
        {
            header: 'Status',
            accessorKey: 's_status',
            enableColumnFilter: true,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_status || cellProps.row.original.status || cellProps.row.original.e_status || ''}</span>
        },
    ], [currentPage, customPageSize]);

    const handlePageSizeChange = (newPageSize) => {
        setCustomPageSize(newPageSize);
        setCurrentPage(1);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
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
                    <div>
                        <div className="reminder-title-text">Report</div>
                        <div className="reminder-title-divider"></div>
                    </div>
                </div>
                {/* Filter/Search/Page Size Bar */}
                <div className="reminder-filterbar" style={{gap: 18, alignItems: 'flex-end', flexWrap: 'wrap'}}>
                    <span style={{ fontWeight: 600, marginRight: 8, marginBottom: 0 }}>Filter</span>
                    <select className="reminder-input" value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                        <option value="">All Agents</option>
                        {agents.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                    <select className="reminder-input" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                        <option value="">All Users</option>
                        {users.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                    <input className="reminder-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Start Date" />
                    <input className="reminder-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="End Date" />
                    {/* Add more filters as needed */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24, marginBottom: 0 }}>
                        <span style={{ fontWeight: 500 }}>Page size</span>
                        <input
                            type="number"
                            min={1}
                            max={100}
                            className="reminder-input"
                            style={{ width: 80, minWidth: 60, maxWidth: 100 }}
                            value={customPageSize}
                            onChange={e => handlePageSizeChange(Number(e.target.value))}
                        />
                    </div>
                    <input
                        className="reminder-input"
                        type="text"
                        placeholder="Search..."
                        value={columnFilters.find(f => f.id === 'search')?.value || ''}
                        onChange={e => setColumnFilters(prev => {
                            const val = e.target.value;
                            const others = prev.filter(f => f.id !== 'search');
                            return val ? [...others, { id: 'search', value: val }] : others;
                        })}
                        style={{ maxWidth: 220, marginLeft: 0 }}
                    />
                </div>
                {/* Table Section */}
                <div style={{ padding: '32px 32px 32px 32px', width: '100%', background: '#fff' }}>
                    {isLoading ? <Spinners setLoading={setLoading} /> :
                        <Row>
                            <Col xs={12} className="reminder-table-shadow">
                                <TableContainer
                                    columns={columns}
                                    data={reports || []}
                                    isCustomPageSize={true}
                                    isGlobalFilter={false}
                                    isJobListGlobalFilter={true}
                                    isPagination={true}
                                    SearchPlaceholder="Search ..."
                                    tableClass="align-middle table-nowrap dt-responsive nowrap w-100 table-check dataTable no-footer dtr-inline mt-4 border-top"
                                    pagination="pagination"
                                    paginationWrapper="dataTables_paginate paging_simple_numbers pagination-rounded"
                                    customPageSize={customPageSize}
                                    onPageSizeChange={handlePageSizeChange}
                                    currentPage={currentPage}
                                    totalRecords={totalRecords}
                                    onPageChange={handlePageChange}
                                    fromRecord={fromRecord}
                                    toRecord={toRecord}
                                    noDataComponent={<tr><td colSpan={5} className="text-center">No report data found</td></tr>}
                                    users={users}
                                    agents={agents}
                                    selectedUser={selectedUser}
                                    setSelectedUser={setSelectedUser}
                                    selectedAgent={selectedAgent}
                                    setSelectedAgent={setSelectedAgent}
                                    startDate={startDate}
                                    setStartDate={setStartDate}
                                    endDate={endDate}
                                    setEndDate={setEndDate}
                                    columnFilters={columnFilters}
                                    setColumnFilters={setColumnFilters}
                                    editableInputClassName="table-edit-input"
                                    editableSelectClassName="table-edit-select"
                                />
                            </Col>
                        </Row>
                    }
                </div>
                <ToastContainer />
            </div>
        </React.Fragment>
    );
}

export default ReportList;
