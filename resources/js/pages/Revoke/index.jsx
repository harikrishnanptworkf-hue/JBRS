import React, { useEffect, useMemo, useState } from "react";
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
import { Col, Row, Card, CardBody } from "reactstrap";
import Spinners from "../../components/Common/Spinner";
import { ToastContainer } from "react-toastify";

function RevokedScheduleList() {
    document.title = "Revoked Schedules";

    const [customPageSize, setCustomPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [fromRecord, setFromRecord] = useState(0);
    const [toRecord, setToRecord] = useState(0);

    const fetchSchedules = (page = 1, pageSize = customPageSize) => {
        setLoading(true);
        api.get(`/revoked?page=${page}&pageSize=${pageSize}`)
            .then(res => {
                setTotalRecords(res.data.total || res.data.length || 0);
                setCurrentPage(res.data.page || 1);
                setCustomPageSize(res.data.pageSize || pageSize);
                setFromRecord((res.data.page - 1) * res.data.pageSize + 1);
                setToRecord(((res.data.page - 1) * res.data.pageSize) + (res.data.data ? res.data.data.length : 0));
                setSchedules(res.data.data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchSchedules(currentPage, customPageSize);
    }, [currentPage, customPageSize]);

    const columns = useMemo(() => [
        {
            header: 'S No',
            accessorKey: 'sno',
            enableColumnFilter: false,
            enableSorting: false,
            cell: (cellProps) => <span>{cellProps.row.index + 1 + ((currentPage - 1) * customPageSize)}</span>
        },
        {
            header: 'Agent',
            accessorKey: 'agent',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.agent?.name || cellProps.row.original.agent || ''}</span>
        },
        {
            header: 'User',
            accessorKey: 'user',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.user?.name || cellProps.row.original.user || ''}</span>
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
            accessorKey: 'exam_code',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.exam_code || cellProps.row.original.e_exam_code || cellProps.row.original.s_exam_code || ''}</span>
        },
        {
            header: 'Timezone',
            accessorKey: 'timezone',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.s_area || ''}</span>
        },
        {
            header: 'Time',
            accessorKey: 'time',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.formatted_s_date_original || cellProps.row.original.time || cellProps.row.original.indian_time || ''}</span>
        },
        {
            header: 'Indian Time',
            accessorKey: 'indian_time',
            enableColumnFilter: false,
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.formatted_s_date || ''}</span>
        },
        {
            header: 'Action',
            accessorKey: 'action',
            enableColumnFilter: false,
            enableSorting: false,
            cell: (cellProps) => (
                <ul className="list-unstyled hstack gap-1 mb-0">
                    <li>
                        <Link
                            to="#"
                            className="btn btn-sm btn-soft-info"
                            // onClick={() => handleEdit(cellProps.row.original)}
                        >
                            <i className="mdi mdi-pencil-outline" />
                        </Link>
                    </li>
                    <li>
                        <Link
                            to="#"
                            className="btn btn-sm btn-soft-danger"
                            // onClick={() => handleDelete(cellProps.row.original)}
                        >
                            <i className="mdi mdi-delete-outline" />
                        </Link>
                    </li>
                </ul>
            )
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
                                        <h5 className="mb-0 card-title flex-grow-1" style={{fontSize: "1.5rem"}}>Revoked Schedules</h5>
                                    </CardBody>
                                    <CardBody>
                                        <TableContainer
                                            columns={columns}
                                            data={schedules || []}
                                            isCustomPageSize={true}
                                            isGlobalFilter={false}
                                            isJobListGlobalFilter={false}
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
                                            noDataComponent={<tr><td colSpan={5} className="text-center">No revoked schedules found</td></tr>}
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

export default RevokedScheduleList;
