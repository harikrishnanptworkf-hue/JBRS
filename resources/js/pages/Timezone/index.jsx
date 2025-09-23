import React, { useEffect, useMemo, useState } from "react";
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import TableContainer from '../../components/Common/TableContainer';
import * as Yup from "yup";
import { useFormik } from "formik";
import api from '../../helpers/api';
import DeleteModal from '../../components/Common/DeleteModal';
import { Col, Row, UncontrolledTooltip, Modal, ModalHeader, ModalBody, Form, Input, FormFeedback, Label, Card, CardBody } from "reactstrap";
import Spinners from "../../components/Common/Spinner";
import { ToastContainer, toast } from "react-toastify";

function TimezoneList() {
    //meta title
    document.title = "Timezone";

    const [modal, setModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [timezone, setTimezone] = useState(null);
    const [customPageSize, setCustomPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [timezones, setTimezones] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [fromRecord, setFromRecord] = useState(0);
    const [toRecord, setToRecord] = useState(0);
    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState('desc');
    const [deleteModal, setDeleteModal] = useState(false);

    const fetchTimezones = (page = 1, pageSize = customPageSize, sortField = sortBy, sortDir = sortOrder) => {
        setLoading(true);
        api.get(`/timezone?page=${page}&pageSize=${pageSize}&sortBy=${sortField}&sortOrder=${sortDir}`)
            .then(res => {
                setTotalRecords(res.data.total || res.data.length || 0);
                setCurrentPage(res.data.current_page || 1);
                setCustomPageSize(res.data.per_page || pageSize);
                setFromRecord(res.data.from || 0);
                setToRecord(res.data.to || 0);
                setTimezones(res.data.data || res.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchTimezones(currentPage, customPageSize, sortBy, sortOrder);
    }, [currentPage, customPageSize, sortBy, sortOrder]);

    // validation
    const validation = useFormik({
        enableReinitialize: true,
        initialValues: {
            area: (timezone && timezone.area) || '',
            offset: (timezone && timezone.offset) || '',
        },
        validationSchema: Yup.object({
            area: Yup.string().required("Area is required"),
            offset: Yup.string()
                .required("Offset is required")
                .matches(/^([+-])([01][0-9]|2[0-3]):[0-5][0-9]$/, "Offset must be in format +HH:MM or -HH:MM"),
        }),
        onSubmit: async (values, { resetForm, setFieldValue }) => {
            // Normalize offset: pad hour to two digits, add :00 if missing
            let offset = values.offset.trim();
            let match = offset.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
            if (match) {
                const sign = match[1];
                const hour = match[2].padStart(2, '0');
                const min = match[3] !== undefined ? match[3] : '00';
                offset = `${sign}${hour}:${min}`;
                setFieldValue('offset', offset, false); // update field for user
            }
            const submitValues = { ...values, offset };
            try {
                if (isEdit && timezone && timezone.id) {
                    await api.put(`/timezone/${timezone.id}`, submitValues);
                    toast.success('Timezone updated successfully');
                } else {
                    await api.post('/timezone', submitValues);
                    toast.success('Timezone added successfully');
                }
                fetchTimezones(currentPage, customPageSize, sortBy, sortOrder);
                setModal(false);
                setIsEdit(false);
                setTimezone(null);
                resetForm();
            } catch (err) {
                // Optionally show error toast
            }
        },
    });

    const toggle = () => {
        if (modal) {
            setModal(false);
            setTimezone(null);
            setIsEdit(false);
        } else {
            setModal(true);
            setTimezone(null);
            setIsEdit(false);
            validation.resetForm();
        }
    };

    const handleTimezoneClick = tz => {
        setTimezone(tz);
        setIsEdit(true);
        setModal(true);
    };

    //delete Job
    const onClickDelete = (tz) => {
        setTimezone(tz);
        setDeleteModal(true);
    };

    const handleDeleteTimezone = async () => {
        if (timezone && timezone.id) {
            setLoading(true);
            try {
                const res = await api.delete(`//${timezone.id}`);
                fetchTimezones(currentPage, customPageSize, sortBy, sortOrder);
                toast.success('Timezone deleted successfully');
            } catch (err) {
                // Optionally show error toast
            }
            setLoading(false);
        }
        setDeleteModal(false);
        setTimezone(null);
    };

    const columns = useMemo(
        () => [
            {
                header: 'SNo',
                accessorKey: "id",
                enableColumnFilter: false,
                enableSorting: true,
                cell: (cellProps) => <span>{cellProps.row.original.id}</span>
            },
            {
                header: 'Area',
                accessorKey: "area",
                enableColumnFilter: false,
                enableSorting: true,
            },
            {
                header: 'Offset',
                accessorKey: "offset",
                enableColumnFilter: false,
                enableSorting: true,
            },
            {
                header: 'Action',
                enableColumnFilter: false,
                enableSorting: false,
                cell: (cellProps) => (
                    <ul className="list-unstyled hstack gap-1 mb-0">
                        <li>
                            <Link
                                to="#"
                                className="btn btn-sm btn-soft-info"
                                onClick={() => handleTimezoneClick(cellProps.row.original)}
                                id={`edittooltip-${cellProps.row.original.id}`}
                            >
                                <i className="mdi mdi-pencil-outline" />
                                <UncontrolledTooltip placement="top" target={`edittooltip-${cellProps.row.original.id}`} >
                                    Edit
                                </UncontrolledTooltip>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="#"
                                className="btn btn-sm btn-soft-danger"
                                onClick={() => onClickDelete(cellProps.row.original)}
                                id={`deletetooltip-${cellProps.row.original.id}`}
                            >
                                <i className="mdi mdi-delete-outline" />
                                <UncontrolledTooltip placement="top" target={`deletetooltip-${cellProps.row.original.id}`}>
                                    Delete
                                </UncontrolledTooltip>
                            </Link>
                        </li>
                    </ul>
                )
            },
        ],
        []
    );

    const handlePageSizeChange = (newPageSize) => {
        setCustomPageSize(newPageSize);
        setCurrentPage(1); // Optionally reset to first page when page size changes
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handleSortChange = (field, order) => {
        setSortBy(field);
        setSortOrder(order);
    };

    // Dedicated function to open Add New modal and clear form
    const openAddModal = () => {
        setTimezone(null);
        setIsEdit(false);
        validation.resetForm();
        setModal(true);
    };

    return (
        <React.Fragment>
            <DeleteModal
                section = 'Timezone'
                show={deleteModal}
                onDeleteClick={handleDeleteTimezone}
                onCloseClick={() => setDeleteModal(false)}
            />
            <div className="page-content">
                {
                    isLoading ? <Spinners setLoading={setLoading} />
                        :
                        <Row>
                            <Col lg="12">
                                <Card>
                                    <CardBody className="border-bottom">
                                        <div className="d-flex align-items-center">
                                            <h5 className="mb-0 card-title flex-grow-1" style={{fontSize: "1.5rem"}}>Timezone</h5>
                                            <div className="flex-shrink-0">
                                                <Link
                                                to="#!"
                                                onClick={openAddModal}
                                                className="btn me-1"
                                                style={{ backgroundColor: "#ff851b", color: "white", border: "none" }}
                                                >
                                                Add New
                                                </Link>
                                            </div>
                                        </div>
                                    </CardBody>
                                    <CardBody>
                                        <TableContainer
                                            columns={columns}
                                            data={timezones || []}
                                            isCustomPageSize={true}
                                            isGlobalFilter={true}
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
                                            onSortChange={handleSortChange}
                                        />
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                }
                <Modal isOpen={modal} toggle={toggle}>
                    <ModalHeader toggle={toggle} tag="h4">
                        {!!isEdit ? "Edit Timezone" : "Add Timezone"}
                    </ModalHeader>
                    <ModalBody>
                        <Form
                            onSubmit={(e) => {
                                e.preventDefault();
                                validation.handleSubmit();
                                return false;
                            }}
                        >
                            <Row>
                                <Col className="col-12">
                                    <div className="mb-3">
                                        <Label className="form-label">Area</Label>
                                        <Input
                                            name="area"
                                            type="text"
                                            placeholder="Enter Area"
                                            onChange={validation.handleChange}
                                            onBlur={validation.handleBlur}
                                            value={validation.values.area || ""}
                                            invalid={validation.touched.area && validation.errors.area ? true : false}
                                        />
                                        {validation.touched.area && validation.errors.area ? (
                                            <FormFeedback type="invalid">
                                                {validation.errors.area}
                                            </FormFeedback>
                                        ) : null}
                                    </div>
                                    <div className="mb-3">
                                        <Label className="form-label">Offset</Label>
                                        <Input
                                            name="offset"
                                            type="text"
                                            placeholder="Enter Offset (e.g. +05:30)"
                                            onChange={validation.handleChange}
                                            onBlur={e => {
                                                // Normalize on blur
                                                let value = e.target.value.trim();
                                                let match = value.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
                                                if (match) {
                                                    const sign = match[1];
                                                    const hour = match[2].padStart(2, '0');
                                                    const min = match[3] !== undefined ? match[3] : '00';
                                                    value = `${sign}${hour}:${min}`;
                                                }
                                                validation.setFieldValue('offset', value, true);
                                                validation.handleBlur(e);
                                            }}
                                            value={validation.values.offset || ""}
                                            invalid={validation.touched.offset && validation.errors.offset ? true : false}
                                        />
                                        {validation.touched.offset && validation.errors.offset ? (
                                            <FormFeedback type="invalid">
                                                {validation.errors.offset}
                                            </FormFeedback>
                                        ) : null}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <div className="text-end">
                                        <button
                                            type="submit"
                                            className="btn btn-success save-user"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </Col>
                            </Row>
                        </Form>
                    </ModalBody>
                </Modal>
            </div>
            <ToastContainer />
        </React.Fragment>
    );
}

export default TimezoneList;