import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isEmpty } from "lodash";
import 'bootstrap/dist/css/bootstrap.min.css';
import TableContainer from '../../components/Common/TableContainer';
import * as Yup from "yup";
import { useFormik } from "formik";
import axios from 'axios';
import api from '../../helpers/api';

//import components
import DeleteModal from '../../components/Common/DeleteModal';

import {
    getJobList as onGetJobList,
    addNewJobList as onAddNewJobList,
    updateJobList as onUpdateJobList,
    deleteJobList as onDeleteJobList,
} from "../../store/actions";

//redux
import { useSelector, useDispatch } from "react-redux";

import { Col, Row, UncontrolledTooltip, Modal, ModalHeader, ModalBody, Form, Input, FormFeedback, Label, Card, CardBody, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Badge } from "reactstrap";
import { createSelector } from "reselect";
import Spinners from "../../components/Common/Spinner";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function EnquiryList() {

    //meta title
    document.title = "Enquiry";

    const [modal, setModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [job, setJob] = useState(null);
    const [customPageSize, setCustomPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [enquiries, setEnquiries] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [fromRecord, setFromRecord] = useState(0);
    const [toRecord, setToRecord] = useState(0);
    const [sortBy, setSortBy] = useState('e_id');
    const [sortOrder, setSortOrder] = useState('desc');
    const [users, setUsers] = useState([]);
    const [agents, setAgents] = useState([]);

    const location = useLocation();
    const navigate = useNavigate();

    const fetchEnquiries = (page = 1, pageSize = customPageSize, sortField = sortBy, sortDir = sortOrder) => {
        setLoading(true);
        api.get(`/enquiries?page=${page}&pageSize=${pageSize}&sortBy=${sortField}&sortOrder=${sortDir}`)
            .then(res => {
                setTotalRecords(res.data.total);
                setCurrentPage(res.data.current_page);
                setCustomPageSize(res.data.per_page); // sync page size with backend
                setFromRecord(res.data.from);
                setToRecord(res.data.to);
                const mapped = res.data.data.map((item, idx) => ({
                    id: item.e_id,
                    jobTitle: item.agent.name, // or fetch agent name if available
                    companyName: item.user.name, // or fetch user name if available
                    location: item.e_group_name || '',
                    experience: item.e_exam_code || '',
                    position: item.formatted_e_date,
                }));
                setEnquiries(mapped);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchEnquiries(currentPage, customPageSize, sortBy, sortOrder);
        api.get('/enquiries/filter-managed-data').then(res => {
            setUsers(res.data.users || []);
            setAgents(res.data.agents || []);
        });
    }, [currentPage, customPageSize, sortBy, sortOrder]);

    // validation
    const validation = useFormik({  
        // enableReinitialize : use this flag when initial values needs to be changed
        enableReinitialize: true,

        initialValues: {
            jobId: (job && job.jobId) || '',
            jobTitle: (job && job.jobTitle) || '',
            companyName: (job && job.companyName) || '',
            location: (job && job.location) || '',
            experience: (job && job.experience) || '',
            position: (job && job.position) || '',
            type: (job && job.type) || '',
            status: (job && job.status) || '',

        },
        validationSchema: Yup.object({
            jobId: Yup.string().matches(
                /[0-9\.\-\s+\/()]+/,
                "Please Enter Valid Job Id"
            ).required("Please Enter Your Job Id"),
            jobTitle: Yup.string().required("Please Enter Your Job Title"),
            companyName: Yup.string().required("Please Enter Your Company Name"),
            location: Yup.string().required("Please Enter Your Location"),
            experience: Yup.string().required("Please Enter Your Experience"),
            position: Yup.string().required("Please Enter Your Position"),
            type: Yup.string().required("Please Enter Your Type"),
            status: Yup.string().required("Please Enter Your Status"),
        }),
        onSubmit: (values) => {
            if (isEdit) {
                const updateJobList = {
                    id: job ? job.id : 0,
                    jobId: values.jobId,
                    jobTitle: values.jobTitle,
                    companyName: values.companyName,
                    location: values.location,
                    experience: values.experience,
                    position: values.position,
                    type: values.type,
                    postedDate: "02 June 2021",
                    lastDate: "25 June 2021",
                    status: values.status,
                };
                // update Job
                dispatch(onUpdateJobList(updateJobList));
                validation.resetForm();
            } else {
                const newJobList = {
                    id: Math.floor(Math.random() * (30 - 20)) + 20,
                    jobId: values["jobId"],
                    jobTitle: values["jobTitle"],
                    companyName: values["companyName"],
                    location: values["location"],
                    experience: values["experience"],
                    position: values["position"],
                    type: values["type"],
                    postedDate: "02 June 2021",
                    lastDate: "25 June 2021",
                    status: values["status"],
                };
                // save new Job
                dispatch(onAddNewJobList(newJobList));
                validation.resetForm();
            }
            toggle();
        },
    });

    const dispatch = useDispatch();
    const jobsSelector = createSelector(
        state => state.JobReducer,
        (jobReducer) => ({
            jobs: jobReducer.jobs,
            loading: jobReducer.loading
        })
    );

    const { jobs, loading } = useSelector(jobsSelector);
    const [isDataLoading, setDataLoading] = useState(loading);


    useEffect(() => {
        if (jobs && !jobs.length) {
            dispatch(onGetJobList());
        }
    }, [dispatch, jobs]);

    useEffect(() => {
        if (!isEmpty(jobs) && !!isEdit) {
            setIsEdit(false);
        }
    }, [jobs]);

    const toggle = () => {
        if (modal) {
            setModal(false);
            setJob(null);
        } else {
            setModal(true);
        }
    };

    const handleJobClick = arg => {
        const job = arg;
        setJob({
            id: job.id,
            jobId: job.jobId,
            jobTitle: job.jobTitle,
            companyName: job.companyName,
            location: job.location,
            experience: job.experience,
            position: job.position,
            type: job.type,
            status: job.status,
        });

        setIsEdit(true);

        toggle();
    };

    const handleEditEnquiry = async (row) => {
        // Always fetch the latest data from the API for prepopulation
        try {
            const res = await api.get(`/enquiries/${row.id}`);
            const data = res.data;
            navigate('/client-create', { state: { editId: row.id, editType: 'enquiry' } });
        } catch (err) {
            // Optionally show error toast
        }
    };

    //delete Job
    const [deleteModal, setDeleteModal] = useState(false);

    const onClickDelete = (job) => {
        setJob(job);
        setDeleteModal(true);
    };

    const handleDeleteEnquiry = async () => {
        if (job && job.id) {
            try {
                await api.delete(`/enquiries/${job.id}`);
                toast.success('Enquiry deleted successfully!');
                fetchEnquiries(currentPage, customPageSize, sortBy, sortOrder);
            } catch {
                toast.error('Failed to delete enquiry.');
            }
            setDeleteModal(false);
        }
    };

    const columns = useMemo(
        () => [
            {
                header: 'SNo',
                accessorKey: "e_id",
                enableColumnFilter: false,
                enableSorting: true,
                cell: (cellProps) => {
                    return <Link to="#" className="text-body fw-bold">{cellProps.row.original.id}</Link>;
                }
            },
            {
                header: "Agent",
                accessorKey: "jobTitle",
                enableColumnFilter: false,
                enableSorting: true,
            },
            {
                header: 'User',
                accessorKey: "companyName",
                enableColumnFilter: false,
                enableSorting: true,
            },
            {
                header: 'Group Name',
                enableColumnFilter: false,
                enableSorting: true,
                accessorKey: "location"
            },
            {
                header: 'Exam code',
                enableColumnFilter: false,
                enableSorting: true,
                accessorKey: "experience"
            },
            {
                header: 'Date',
                enableColumnFilter: false,
                enableSorting: true,
                accessorKey: "position"
            },
            {
                header: 'Action',
                enableColumnFilter: false,
                enableSorting: false,
                cell: (cellProps) => {
                    return (
                        <ul className="list-unstyled hstack gap-1 mb-0">
                            <li>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-soft-info"
                                    onClick={() => handleEditEnquiry(cellProps.row.original)}
                                    id={`edittooltip-${cellProps.row.original.id}`}
                                >
                                    <i className="mdi mdi-pencil-outline" />
                                    <UncontrolledTooltip placement="top" target={`edittooltip-${cellProps.row.original.id}`} >
                                        Edit
                                    </UncontrolledTooltip>
                                </button>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-soft-danger"
                                    onClick={() => {
                                        setJob(cellProps.row.original);
                                        setDeleteModal(true);
                                    }}
                                    id={`deletetooltip-${cellProps.row.original.id}`}
                                >
                                    <i className="mdi mdi-delete-outline" />
                                    <UncontrolledTooltip placement="top" target={`deletetooltip-${cellProps.row.original.id}`}>
                                        Delete
                                    </UncontrolledTooltip>
                                </button>
                            </li>
                        </ul>
                    );
                }
            },
        ],
        [handleEditEnquiry]
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

    useEffect(() => {
        if (location.state && location.state.created) {
            toast.success('New enquiry created successfully!');
            // Remove the state so the toast doesn't show again on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    return (
        <React.Fragment>
            <DeleteModal
                show={deleteModal}
                onDeleteClick={handleDeleteEnquiry}
                onCloseClick={() => setDeleteModal(false)}
            />
            <div className="page-content">
                    {
                        isDataLoading ? <Spinners setLoading={setLoading} />
                            :
                            <Row>
                                <Col lg="12">
                                    <Card>
                                        <CardBody className="border-bottom">
                                            <div className="d-flex align-items-center">
                                                <h5 className="mb-0 card-title flex-grow-1" style={{fontSize: "1.5rem"}}>Enquiry Register</h5>
                                            </div>
                                        </CardBody>
                                        <CardBody>
                                            <TableContainer
                                                columns={columns}
                                                data={enquiries || []}
                                                isCustomPageSize={true}
                                                isGlobalFilter={true}
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
                                                onSortChange={handleSortChange}
                                                users={users}
                                                agents={agents}
                                            />
                      
                                        </CardBody>
                                    </Card>
                                </Col>
                            </Row>
                    }
                    <Modal isOpen={modal} toggle={toggle}>
                        <ModalHeader toggle={toggle} tag="h4">
                            {!!isEdit ? "Edit Job" : "Add Job"}
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
                                            <Label className="form-label"> Job Id</Label>
                                            <Input
                                                name="jobId"
                                                type="text"
                                                placeholder="Insert Job Id"
                                                validate={{
                                                    required: { value: true },
                                                }}
                                                onChange={validation.handleChange}
                                                onBlur={validation.handleBlur}
                                                value={validation.values.jobId || ""}
                                                invalid={
                                                    validation.touched.jobId && validation.errors.jobId
                                                        ? true
                                                        : false
                                                }
                                            />
                                            {validation.touched.jobId && validation.errors.jobId ? (
                                                <FormFeedback type="invalid">
                                                    {validation.errors.jobId}
                                                </FormFeedback>
                                            ) : null}
                                        </div>
                                        <div className="mb-3">
                                            <Label className="form-label">Job Title</Label>
                                            <Input
                                                name="jobTitle"
                                                type="text"
                                                placeholder="Insert Job Title"
                                                validate={{
                                                    required: { value: true },
                                                }}
                                                onChange={validation.handleChange}
                                                onBlur={validation.handleBlur}
                                                value={validation.values.jobTitle || ""}
                                                invalid={
                                                    validation.touched.jobTitle &&
                                                        validation.errors.jobTitle
                                                        ? true
                                                        : false
                                                }
                                            />
                                            {validation.touched.jobTitle &&
                                                validation.errors.jobTitle ? (
                                                <FormFeedback type="invalid">
                                                    {validation.errors.jobTitle}
                                                </FormFeedback>
                                            ) : null}
                                        </div>
                                        <div className="mb-3">
                                            <Label className="form-label">Company Name</Label>
                                            <Input
                                                name="companyName"
                                                type="text"
                                                placeholder="Insert Company Name"
                                                onChange={validation.handleChange}
                                                onBlur={validation.handleBlur}
                                                value={validation.values.companyName || ""}
                                                invalid={
                                                    validation.touched.companyName &&
                                                        validation.errors.companyName
                                                        ? true
                                                        : false
                                                }
                                            />
                                            {validation.touched.companyName &&
                                                validation.errors.companyName ? (
                                                <FormFeedback type="invalid">
                                                    {validation.errors.companyName}
                                                </FormFeedback>
                                            ) : null}
                                        </div>
                                        <div className="mb-3">
                                            <Label className="form-label">Location</Label>
                                            <Input
                                                name="location"
                                                type="text"
                                                placeholder="Insert Location"
                                                onChange={validation.handleChange}
                                                onBlur={validation.handleBlur}
                                                value={validation.values.location || ""}
                                                invalid={
                                                    validation.touched.location &&
                                                        validation.errors.location
                                                        ? true
                                                        : false
                                                }
                                            />
                                            {validation.touched.location &&
                                                validation.errors.location ? (
                                                <FormFeedback type="invalid">
                                                    {validation.errors.location}
                                                </FormFeedback>
                                            ) : null}
                                        </div>
                                        <div className="mb-3">
                                            <Label className="form-label">Experience</Label>
                                            <Input
                                                name="experience"
                                                type="text"
                                                placeholder="Insert Experience"
                                                onChange={validation.handleChange}
                                                onBlur={validation.handleBlur}
                                                value={validation.values.experience || ""}
                                                invalid={
                                                    validation.touched.experience &&
                                                        validation.errors.experience
                                                        ? true
                                                        : false
                                                }
                                            />
                                            {validation.touched.experience &&
                                                validation.errors.experience ? (
                                                <FormFeedback type="invalid">
                                                    {validation.errors.experience}
                                                </FormFeedback>
                                            ) : null}
                                        </div>
                                        <div className="mb-3">
                                            <Label className="form-label">Position</Label>
                                            <Input
                                                name="position"
                                                type="text"
                                                placeholder="Insert Position"
                                                onChange={validation.handleChange}
                                                onBlur={validation.handleBlur}
                                                value={validation.values.position || ""}
                                                invalid={
                                                    validation.touched.position &&
                                                        validation.errors.position
                                                        ? true
                                                        : false
                                                }
                                            />
                                            {validation.touched.position &&
                                                validation.errors.position ? (
                                                <FormFeedback type="invalid">
                                                    {validation.errors.position}
                                                </FormFeedback>
                                            ) : null}
                                        </div>
                                        <div className="mb-3">
                                            <Label className="form-label">Type</Label>
                                            <Input
                                                name="type"
                                                type="select"
                                                className="form-select"
                                                onChange={validation.handleChange}
                                                onBlur={validation.handleBlur}
                                                value={validation.values.type || ""}
                                                invalid={
                                                    validation.touched.type && validation.errors.type
                                                        ? true
                                                        : false
                                                }
                                            >
                                                <option>Full Time</option>
                                                <option>Part Time</option>
                                                <option>Freelance</option>
                                                <option>Internship</option>
                                            </Input>
                                            {validation.touched.type && validation.errors.type ? (
                                                <FormFeedback type="invalid">
                                                    {validation.errors.type}
                                                </FormFeedback>
                                            ) : null}
                                        </div>
                                        <div className="mb-3">
                                            <Label className="form-label">Status</Label>
                                            <Input
                                                name="status"
                                                type="select"
                                                onChange={validation.handleChange}
                                                onBlur={validation.handleBlur}
                                                value={validation.values.status || ""}
                                                invalid={
                                                    validation.touched.status && validation.errors.status
                                                        ? true
                                                        : false
                                                }
                                            >
                                                <option>Active</option>
                                                <option>New</option>
                                                <option>Close</option>
                                            </Input>
                                            {validation.touched.status && validation.errors.status ? (
                                                <FormFeedback status="invalid">
                                                    {validation.errors.status}
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


export default EnquiryList;