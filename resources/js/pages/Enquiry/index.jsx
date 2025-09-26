import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isEmpty } from "lodash";
import 'bootstrap/dist/css/bootstrap.min.css';
import TableContainer from '../../components/Common/TableContainer';
import * as Yup from "yup";
import { useFormik } from "formik";
import api from '../../helpers/api';
import DeleteModal from '../../components/Common/DeleteModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Row, Col, Modal, ModalHeader, ModalBody, Form, Input, FormFeedback, Label } from "reactstrap";
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

    // Add filter/search state for modern UI
    const [search, setSearch] = useState("");
    const [filterAgent, setFilterAgent] = useState("");
    const [filterUser, setFilterUser] = useState("");
    const [filterGroup, setFilterGroup] = useState("");
    const [filterExamCode, setFilterExamCode] = useState("");
    const [filterStartDate, setFilterStartDate] = useState(null);
    const [filterEndDate, setFilterEndDate] = useState(null);
    const [groupOptions, setGroupOptions] = useState([]);
    const [examCodeOptions, setExamCodeOptions] = useState([]);

    const location = useLocation();
    const navigate = useNavigate();

    // Fetch filter options
    useEffect(() => {
        api.get('/enquiries/filter-managed-data', { params: { enq: 1 } }).then(res => {
            setUsers(res.data.users || []);
            setAgents(res.data.agents || []);
            setGroupOptions(res.data.groups || []);
            setExamCodeOptions(res.data.examcodes || []);
        });
    }, []);

    // Fetch data with filters
    const fetchEnquiries = (page = 1, pageSize = customPageSize, sortField = sortBy, sortDir = sortOrder, searchVal = search) => {
        setLoading(true);
        const formatDate = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
        api.get(`/enquiries`, {
            params: {
                page,
                pageSize,
                search: searchVal,
                sortBy: sortField,
                sortOrder: sortDir,
                agent_id: filterAgent, // Ensure param names match backend
                user_id: filterUser,
                group_id: filterGroup,
                examcode_id: filterExamCode,
                startdate: formatDate(filterStartDate),
                enddate: formatDate(filterEndDate)
            }
        })
            .then(res => {
                setTotalRecords(res.data.total);
                setCurrentPage(res.data.current_page);
                setCustomPageSize(res.data.per_page);
                setFromRecord(res.data.from);
                setToRecord(res.data.to);
                setEnquiries(res.data.data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    // Only one useEffect for all dependencies
    useEffect(() => {
        fetchEnquiries(currentPage, customPageSize, sortBy, sortOrder, search);
        // eslint-disable-next-line
    }, [currentPage, customPageSize, sortBy, sortOrder, search, filterAgent, filterUser, filterGroup, filterExamCode, filterStartDate, filterEndDate]);

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
                //dispatch(onUpdateJobList(updateJobList));
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
                //dispatch(onAddNewJobList(newJobList));
                validation.resetForm();
            }
            toggle();
        },
    });

    const [isDataLoading, setDataLoading] = useState(isLoading);


    useEffect(() => {
        if (!isEmpty(enquiries) && !!isEdit) {
            setIsEdit(false);
        }
    }, [enquiries]);

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

    // Fix: Edit button logic
    const handleEditEnquiry = async (row) => {
        try {
            // Always fetch latest data for edit
            const res = await api.get(`/enquiries/${row.id}`);
            navigate('/client-create', { state: { editId: row.id, editType: 'enquiry', enquiryData: res.data } });
        } catch (err) {
            toast.error('Failed to fetch enquiry details.');
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

    // Modern columns with clickable sort headers
    const columns = useMemo(() => [
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('agent')}>
                    Agent
                    {sortBy === 'agent' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {sortOrder === 'asc' ? '▲' : '▼'}
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
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {sortOrder === 'asc' ? '▲' : '▼'}
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
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'groupname',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.e_group_name || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('examcode')}>
                    Exam Code
                    {sortBy === 'examcode' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'examcode',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.e_exam_code || ''}</span>
        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('date')}>
                    Date
                    {sortBy === 'date' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'date',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.formatted_e_date || ''}</span>
        },
        {
            header: 'Action',
            accessorKey: 'action',
            enableSorting: false,
            cell: (cellProps) => {
                // Use e_id as the unique identifier for edit/delete
                const enquiryId = cellProps.row.original.e_id || cellProps.row.original.id;
                return (
                    <ul className="list-unstyled hstack gap-1 mb-0" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%' }}>
                        <li>
                            <button
                                type="button"
                                className="examcode-action-btn edit"
                                style={{ color: '#1a8cff', background: '#e6f2ff' }}
                                onClick={() => handleEditEnquiry({ ...cellProps.row.original, id: enquiryId })}
                                id={`edittooltip-${enquiryId}`}
                            >
                                <i className="mdi mdi-pencil-outline" style={{ color: '#1a8cff' }} />
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                className="examcode-action-btn"
                                style={{ color: '#ff4d4f', background: '#fff1f0' }}
                                onClick={() => {
                                    setJob({ ...cellProps.row.original, id: enquiryId });
                                    setDeleteModal(true);
                                }}
                                id={`deletetooltip-${enquiryId}`}
                            >
                                <i className="mdi mdi-delete-outline" style={{ color: '#ff4d4f' }} />
                            </button>
                        </li>
                    </ul>
                );
            }
        },
    ], [sortBy, sortOrder, handleEditEnquiry]);

    // Fix: Sorting logic should only update state, let useEffect handle API call
    const handleSortChange = (columnId) => {
        let newOrder = 'asc';
        if (sortBy === columnId) {
            newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        }
        setSortBy(columnId);
        setSortOrder(newOrder);
        setCurrentPage(1); // Reset to first page on sort
    };

    const handleClearFilters = () => {
        setFilterAgent('');
        setFilterUser('');
        setFilterGroup('');
        setFilterExamCode('');
        setFilterStartDate(null);
        setFilterEndDate(null);
    };

    const handlePageSizeChange = (newPageSize) => {
        setCustomPageSize(newPageSize);
        setCurrentPage(1); // Optionally reset to first page when page size changes
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    useEffect(() => {
        if (location.state && location.state.created) {
            toast.success('New enquiry created successfully!');
            // Remove the state so the toast doesn't show again on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Examcode-style Delete Modal
    const ReminderDeleteModal = ({ show, onDeleteClick, onCloseClick }) => (
        show ? (
            <div className="examcode-modal-backdrop">
                <div className="examcode-modal">
                    <div className="examcode-modal-icon">
                        <i className="mdi mdi-alert-circle-outline"></i>
                    </div>
                    <div className="examcode-modal-title">Delete Enquiry?</div>
                    <div className="examcode-modal-message">Are you sure you want to delete this enquiry? This action cannot be undone.</div>
                    <div className="examcode-modal-btns">
                        <button className="examcode-cancel-btn" onClick={onCloseClick} type="button">Cancel</button>
                        <button className="examcode-delete-btn" onClick={onDeleteClick} type="button">Delete</button>
                    </div>
                </div>
            </div>
        ) : null
    );

    return (
        <React.Fragment>
                        <style>{`
                                .reminder-header-bar { width: 100vw; background: #fff; box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08); border-radius: 0 0 18px 18px; padding: 32px 32px 0 32px; display: flex; flex-direction: column; align-items: center; gap: 0; }
                                .reminder-title-text { font-size: 2.1rem; font-weight: 700; color: #1a2942; margin-bottom: 0.5rem; letter-spacing: 0.01em; text-align: left; }
                                .reminder-title-divider { width: 60px; height: 4px; background: #2ba8fb; border-radius: 2px; margin: 18px 0 0 0; opacity: 0.8; }
                                .reminder-tablebar { width: 100vw; background: #fff; display: flex; justify-content: space-between; align-items: center; padding: 18px 32px 0 32px; margin-bottom: 0; border-radius: 0; box-shadow: none; }
                                .reminder-table-shadow { box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08); border-radius: 18px; background: #fff; }
                                .reminder-input { border-radius: 10px !important; border: 1.5px solid #e3e6ef !important; box-shadow: 0 1.5px 8px rgba(44,62,80,0.04); font-size: 1.05rem; padding: 10px 16px; background: #fafdff !important; transition: border-color 0.2s; height: 44px !important; min-width: 220px; max-width: 352px; width: 100%; box-sizing: border-box; }
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
                                /* Examcode modal styles for delete modal */
                                .examcode-modal-backdrop {
                                    position: fixed;
                                    top: 0; left: 0; right: 0; bottom: 0;
                                    background: rgba(44,62,80,0.18);
                                    z-index: 1050;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                }
                                .examcode-modal {
                                    background: #fff;
                                    border-radius: 18px;
                                    box-shadow: 0 8px 32px rgba(44,62,80,0.18);
                                    padding: 36px 32px 28px 32px;
                                    min-width: 340px;
                                    max-width: 90vw;
                                    text-align: center;
                                    z-index: 1060;
                                    position: relative;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                }
                                .examcode-modal-icon {
                                    font-size: 2.8rem;
                                    color: #ff4d4f;
                                    margin-bottom: 12px;
                                }
                                .examcode-modal-title {
                                    font-size: 1.25rem;
                                    font-weight: 700;
                                    color: #1a2942;
                                    margin-bottom: 8px;
                                }
                                .examcode-modal-message {
                                    color: #5a5a5a;
                                    margin-bottom: 24px;
                                    font-size: 1.05rem;
                                }
                                .examcode-modal-btns {
                                    display: flex;
                                    gap: 16px;
                                    justify-content: center;
                                }
                                .examcode-delete-btn {
                                    background: #ff4d4f;
                                    color: #fff;
                                    border: none;
                                    border-radius: 100px;
                                    font-weight: 600;
                                    font-size: 1rem;
                                    padding: 8px 28px;
                                    box-shadow: 0 1.5px 8px rgba(44,62,80,0.04);
                                    transition: background 0.2s, box-shadow 0.2s;
                                }
                                .examcode-delete-btn:hover {
                                    background: #ff7875;
                                    box-shadow: 0 0 12px #ff787550;
                                }
                                .examcode-delete-btn:active {
                                    background: #d9363e;
                                }
                                @media (max-width: 700px) {
                                    .examcode-header-bar, .examcode-tablebar, .examcode-form-row {
                                        flex-direction: column;
                                        align-items: stretch;
                                        gap: 16px;
                                    }
                                }
                        `}</style>


            <ReminderDeleteModal show={deleteModal} onDeleteClick={handleDeleteEnquiry} onCloseClick={() => setDeleteModal(false)} />
            <div className="page-content" style={{ minHeight: '100vh', background: '#f6f8fa', padding: 0, width: '100vw', overflowX: 'hidden', paddingTop: '64px' }}>
                {/* Header Bar */}
                <div className="reminder-header-bar">
                    <div>
                        <div className="reminder-title-text">Enquiry</div>
                        <div className="reminder-title-divider"></div>
                    </div>
                </div>
                {/* Filter Bar */}
                <div className="reminder-filterbar" style={{ width: '100vw', background: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, padding: '18px 32px 0 32px' }}>
                    <div style={{ fontWeight: 600, fontSize: 21, color: '#1a2942', marginRight: 18 }}>Filter</div>
                    <select className="reminder-input" value={filterAgent} onChange={e => setFilterAgent(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">All Agents</option>
                        {agents.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                    <select className="reminder-input" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">All Users</option>
                        {users.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                    <select className="reminder-input" value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">All Groups</option>
                        {groupOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                    <select className="reminder-input" value={filterExamCode} onChange={e => setFilterExamCode(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">All Exam Codes</option>
                        {examCodeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.ex_code}</option>)}
                    </select>
                    <DatePicker
                        className="reminder-input examcode-date"
                        selected={filterStartDate}
                        onChange={setFilterStartDate}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Start Date"
                        isClearable
                        style={{ minWidth: 160 }}
                        calendarStartDay={1}
                        renderCustomHeader={(
                            { date, changeYear, changeMonth, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => (
                            <div style={{ margin: 10, display: "flex", justifyContent: "center" }}>
                                <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>{'<'}</button>
                                <span style={{ margin: '0 8px' }}>{date.toLocaleString('default', { month: 'long' })} {date.getFullYear()}</span>
                                <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>{'>'}</button>
                            </div>
                        )}
                    />
                    <DatePicker
                        className="reminder-input examcode-date"
                        selected={filterEndDate}
                        onChange={setFilterEndDate}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="End Date"
                        isClearable
                        style={{ minWidth: 160 }}
                        calendarStartDay={1}
                        renderCustomHeader={(
                            { date, changeYear, changeMonth, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => (
                            <div style={{ margin: 10, display: "flex", justifyContent: "center" }}>
                                <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>{'<'}</button>
                                <span style={{ margin: '0 8px' }}>{date.toLocaleString('default', { month: 'long' })} {date.getFullYear()}</span>
                                <button onClick={increaseMonth} disabled={nextMonthButtonDisabled}>{'>'}</button>
                            </div>
                        )}
                    />
                    {(filterAgent || filterUser || filterGroup || filterExamCode || filterStartDate || filterEndDate) && (
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
                        <>
                            <Row>
                                <Col xs={12} className="reminder-table-shadow">
                                    <TableContainer
                                        columns={columns}
                                        data={enquiries || []}
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
                                        sortDirection={sortOrder}
                                        noDataComponent={<tr><td colSpan={5} className="text-center">No enquiries found</td></tr>}
                                    />
                                </Col>
                            </Row>
                        </>
                    }
                </div>
                {/* Modal and ToastContainer remain unchanged */}
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
                            <div className="mb-3">
                                <Label className="form-label">Job ID</Label>
                                <Input
                                    name="jobId"
                                    placeholder="Enter Job ID"
                                    value={validation.values.jobId}
                                    onChange={validation.handleChange}
                                    onBlur={validation.handleBlur}
                                    invalid={validation.touched.jobId && !!validation.errors.jobId}
                                />
                                <FormFeedback>{validation.errors.jobId}</FormFeedback>
                            </div>
                            <div className="mb-3">
                                <Label className="form-label">Job Title</Label>
                                <Input
                                    name="jobTitle"
                                    placeholder="Enter Job Title"
                                    value={validation.values.jobTitle}
                                    onChange={validation.handleChange}
                                    onBlur={validation.handleBlur}
                                    invalid={validation.touched.jobTitle && !!validation.errors.jobTitle}
                                />
                                <FormFeedback>{validation.errors.jobTitle}</FormFeedback>
                            </div>
                            <div className="mb-3">
                                <Label className="form-label">Company Name</Label>
                                <Input
                                    name="companyName"
                                    placeholder="Enter Company Name"
                                    value={validation.values.companyName}
                                    onChange={validation.handleChange}
                                    onBlur={validation.handleBlur}
                                    invalid={validation.touched.companyName && !!validation.errors.companyName}
                                />
                                <FormFeedback>{validation.errors.companyName}</FormFeedback>
                            </div>
                            <div className="mb-3">
                                <Label className="form-label">Location</Label>
                                <Input
                                    name="location"
                                    placeholder="Enter Location"
                                    value={validation.values.location}
                                    onChange={validation.handleChange}
                                    onBlur={validation.handleBlur}
                                    invalid={validation.touched.location && !!validation.errors.location}
                                />
                                <FormFeedback>{validation.errors.location}</FormFeedback>
                            </div>
                            <div className="mb-3">
                                <Label className="form-label">Experience</Label>
                                <Input
                                    name="experience"
                                    placeholder="Enter Experience"
                                    value={validation.values.experience}
                                    onChange={validation.handleChange}
                                    onBlur={validation.handleBlur}
                                    invalid={validation.touched.experience && !!validation.errors.experience}
                                />
                                <FormFeedback>{validation.errors.experience}</FormFeedback>
                            </div>
                            <div className="mb-3">
                                <Label className="form-label">Position</Label>
                                <Input
                                    name="position"
                                    placeholder="Enter Position"
                                    value={validation.values.position}
                                    onChange={validation.handleChange}
                                    onBlur={validation.handleBlur}
                                    invalid={validation.touched.position && !!validation.errors.position}
                                />
                                <FormFeedback>{validation.errors.position}</FormFeedback>
                            </div>
                            <div className="mb-3">
                                <Label className="form-label">Type</Label>
                                <Input
                                    name="type"
                                    placeholder="Enter Type"
                                    value={validation.values.type}
                                    onChange={validation.handleChange}
                                    onBlur={validation.handleBlur}
                                    invalid={validation.touched.type && !!validation.errors.type}
                                />
                                <FormFeedback>{validation.errors.type}</FormFeedback>
                            </div>
                            <div className="mb-3">
                                <Label className="form-label">Status</Label>
                                <Input
                                    name="status"
                                    placeholder="Enter Status"
                                    value={validation.values.status}
                                    onChange={validation.handleChange}
                                    onBlur={validation.handleBlur}
                                    invalid={validation.touched.status && !!validation.errors.status}
                                />
                                <FormFeedback>{validation.errors.status}</FormFeedback>
                            </div>
                            <div className="d-flex justify-content-end">
                                <button type="button" className="examcode-cancel-btn me-2" onClick={toggle}>
                                    Cancel
                                </button>
                                <button type="submit" className="examcode-update-btn">
                                    {!!isEdit ? "Update Job" : "Save Job"}
                                </button>
                            </div>
                        </Form>
                    </ModalBody>
                </Modal>
                <ToastContainer />
            </div>
        </React.Fragment>
    );
}

export default EnquiryList;
