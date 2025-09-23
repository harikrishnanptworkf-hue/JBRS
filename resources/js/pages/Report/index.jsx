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
            <div className="page-content">
                {
                    isLoading ? <Spinners setLoading={setLoading} />
                        :
                        <Row>
                            <Col lg="12">
                                <Card>
                                    <CardBody className="border-bottom">
                                        <h5 className="mb-0 card-title flex-grow-1" style={{fontSize: "1.5rem"}}>Report</h5>
                                    </CardBody>
                                    <CardBody>
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
                                        />
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                }
            </div>
            <ToastContainer />
        </React.Fragment>
    );
}

export default ReportList;
