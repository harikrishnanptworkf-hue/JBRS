import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import TableContainer from '../../components/Common/TableContainer';
import * as Yup from "yup";
import { useFormik } from "formik";
import api from '../../helpers/api';
import DeleteModal from '../../components/Common/DeleteModal';
import { Col, Row, UncontrolledTooltip, Modal, ModalHeader, ModalBody, Form, Input, FormFeedback, Label, Card, CardBody } from "reactstrap";
import Spinners from "../../components/Common/Spinner";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import debounce from 'lodash.debounce';

function ScheduleList() {
    document.title = "Schedule";

    const [modal, setModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [schedule, setSchedule] = useState(null);
    const [customPageSize, setCustomPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [fromRecord, setFromRecord] = useState(0);
    const [toRecord, setToRecord] = useState(0);
    const [sortBy, setSortBy] = useState('s_id');
    const [sortOrder, setSortOrder] = useState('desc');
    const [deleteModal, setDeleteModal] = useState(false);
    const [timezones, setTimezones] = useState([]);
    const [rowEdits, setRowEdits] = useState({});
    const [focusedCell, setFocusedCell] = useState(null);

    const location = useLocation();
    const navigate = useNavigate();

    const fetchSchedules = (page = 1, pageSize = customPageSize, sortField = sortBy, sortDir = sortOrder) => {
        setLoading(true);
        api.get(`/schedule?page=${page}&pageSize=${pageSize}&sortBy=${sortField}&sortOrder=${sortDir}`)
            .then(res => {
                setTotalRecords(res.data.total);
                setCurrentPage(res.data.current_page);
                setCustomPageSize(res.data.per_page);
                setFromRecord(res.data.from);
                setToRecord(res.data.to);
                const mapped = res.data.data.map((item) => ({
                    s_id: item.s_id,
                    agent: item.agent.name,
                    user: item.user.name,
                    group_name: item.s_group_name,
                    exam_code: item.s_exam_code,
                    timezone: item.s_area,
                    indian_time: item.formatted_s_date,
                    status: item.s_status,
                    system_name: item.s_system_name,
                    access_code: item.s_access_code,
                    done_by: item.s_done_by,
                    _rowClass: item.s_status && item.s_status.toUpperCase() === 'TAKEN' ? 'font-maroon' : '',
                }));
                setSchedules(mapped);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchSchedules(currentPage, customPageSize, sortBy, sortOrder);
        api.get('/timezone/get-full-timezones').then(res => {
            setTimezones(res.data || []);
        });
    }, [currentPage, customPageSize, sortBy, sortOrder]);

    const validation = useFormik({
        enableReinitialize: true,
        initialValues: {
            title: (schedule && schedule.title) || '',
            date: (schedule && schedule.date) || '',
            status: (schedule && schedule.status) || '',
        },
        validationSchema: Yup.object({
            title: Yup.string().required("Please Enter Schedule Title"),
            date: Yup.string().required("Please Enter Date"),
            status: Yup.string().required("Please Enter Status"),
        }),
        onSubmit: async (values) => {
            if (isEdit) {
                try {
                    await api.put(`/schedule/${schedule.id}`, values);
                    toast.success('Schedule updated successfully!');
                    fetchSchedules(currentPage, customPageSize, sortBy, sortOrder);
                } catch {
                    toast.error('Failed to update schedule.');
                }
            } else {
                try {
                    await api.post('/schedule', values);
                    toast.success('Schedule created successfully!');
                    fetchSchedules(currentPage, customPageSize, sortBy, sortOrder);
                } catch {
                    toast.error('Failed to create schedule.');
                }
            }
            validation.resetForm();
            toggle();
        },
    });

    const toggle = () => {
        if (modal) {
            setModal(false);
            setSchedule(null);
            setIsEdit(false);
        } else {
            setModal(true);
        }
    };

    const handleScheduleClick = arg => {
        setSchedule({
            id: arg.id,
            title: arg.title,
            date: arg.date,
            status: arg.status,
        });
        setIsEdit(true);
        toggle();
    };

    const handleEditSchedule = async (row) => {
        // Always fetch the latest data from the API for prepopulation
        try {
            const res = await api.get(`/schedule/${row.s_id}`);
            const data = res.data;
            navigate('/client-create', { state: { editId: row.s_id, editType: 'schedule' } });
        } catch (err) {
            // Optionally show error toast
        }
    };

    const onClickDelete = (schedule) => {
        setSchedule(schedule);
        setDeleteModal(true);
    };

    const handleDeleteSchedule = async () => {
        if (schedule && schedule.s_id) {
            try {
                await api.delete(`/schedule/${schedule.s_id}`);
                toast.success('Schedule deleted successfully!');
                fetchSchedules(currentPage, customPageSize, sortBy, sortOrder);
            } catch {
                toast.error('Failed to delete schedule.');
            }
            setDeleteModal(false);
        }
    };

    // Debounced save for inline fields
    const debouncedSaveField = useMemo(() => debounce(async (s_id, field, value, rowData) => {
        try {
            await api.patch(`/schedule/${s_id}/fields`, {
                [field]: value
            });
            // Update the main schedules state for immediate UI feedback
            setSchedules(prev => prev.map(row =>
                row.s_id === s_id ? { ...row, [field]: value } : row
            ));
            // Clear the edit state for this field only, not the whole row
            setRowEdits(prev => {
                if (!prev[s_id]) return prev;
                const updated = { ...prev };
                updated[s_id] = { ...updated[s_id] };
                delete updated[s_id][field];
                if (Object.keys(updated[s_id]).length === 0) delete updated[s_id];
                return updated;
            });
        } catch {
            toast.error('Failed to update field.');
        }
    }, 500), []);

    const handleFieldEdit = (s_id, field, value, rowData) => {
        setRowEdits(prev => ({
            ...prev,
            [s_id]: {
                ...prev[s_id],
                [field]: value
            }
        }));
        debouncedSaveField(s_id, field, value, rowData);
    };

    const handleStatusChange = (s_id, value, rowData) => {
        // Update local state for instant feedback
        setRowEdits(prev => ({
            ...prev,
            [s_id]: {
                ...prev[s_id],
                status: value
            }
        }));
        debouncedSaveField(s_id, 'status', value, rowData);
    };

    // Inline editable cell with local state for fast typing and debounced save on typing stop
    const EditableCell = React.memo(
      ({ value: initialValue, onSave, cellKey, isFocused, onFocusCell }) => {
        const [value, setValue] = React.useState(initialValue);
        const inputRef = React.useRef(null);
        // Debounce the save so it triggers after typing stops
        const debouncedSave = React.useMemo(() => debounce(onSave, 500), [onSave]);
        React.useEffect(() => { setValue(initialValue); }, [initialValue]);
        React.useEffect(() => { return () => debouncedSave.cancel(); }, [debouncedSave]);
        // Focus input if this is the focused cell
        React.useEffect(() => {
          if (isFocused && inputRef.current) {
            inputRef.current.focus();
            // Optionally move caret to end
            inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
          }
        }, [isFocused]);
        const handleChange = e => {
          setValue(e.target.value);
          debouncedSave(e.target.value);
        };
        const handleFocus = () => {
          onFocusCell(cellKey);
        };
        return (
          <input
            ref={inputRef}
            key={cellKey}
            type="text"
            className="form-control form-control-sm"
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
          />
        );
      },
      (prevProps, nextProps) => prevProps.value === nextProps.value && prevProps.isFocused === nextProps.isFocused // Only rerender if value or focus changes
    );

    const columns = useMemo(
        () => [
            { header: 'SNo', accessorKey: 's_id', enableColumnFilter: false, enableSorting: true },
            { header: 'Agent', accessorKey: 'agent', enableColumnFilter: false, enableSorting: true },
            { header: 'User', accessorKey: 'user', enableColumnFilter: false, enableSorting: true },
            { header: 'Group Name', accessorKey: 'group_name', enableColumnFilter: false, enableSorting: true },
            { header: 'Exam Code', accessorKey: 'exam_code', enableColumnFilter: false, enableSorting: true },
            { header: 'Indian Time', accessorKey: 'indian_time', enableColumnFilter: false, enableSorting: true },
            {
                header: 'Status',
                accessorKey: 'status',
                enableColumnFilter: false,
                enableSorting: true,
                cell: (cellProps) => {
                    const row = cellProps.row.original;
                    const edits = rowEdits[row.s_id] || {};
                    const value = edits.status !== undefined ? edits.status : row.status || '';
                    const isTaken = value === 'TAKEN';
                    return (
                        <select
                            value={value}
                            onChange={e => handleStatusChange(row.s_id, e.target.value, row)}
                            className="form-select form-select-sm"
                            style={{ minWidth: 120 }}
                        >
                            <option value="REVOKE">SELECT</option>
                            <option value="TAKEN" style={isTaken ? { color: 'maroon', fontWeight: 'bold' } : {}}>TAKEN</option>
                            <option value="REVOKE">REVOKE</option>
                            <option value="DONE">DONE</option>
                            <option value="RESCHEDULE">RESCHEDULE</option>
                        </select>
                    );
                }
            },
            {
                header: 'System Name',
                accessorKey: 'system_name',
                enableColumnFilter: false,
                enableSorting: true,
                cell: (cellProps) => {
                    const row = cellProps.row.original;
                    const edits = rowEdits[row.s_id] || {};
                    const cellKey = `${row.s_id}-system_name`;
                    return (
                        <EditableCell
                          value={edits.system_name ?? row.system_name ?? ''}
                          onSave={val => handleFieldEdit(row.s_id, 'system_name', val, row)}
                          cellKey={cellKey}
                          isFocused={focusedCell === cellKey}
                          onFocusCell={setFocusedCell}
                        />
                    );
                }
            },
            {
                header: 'Access Code',
                accessorKey: 'access_code',
                enableColumnFilter: false,
                enableSorting: true,
                cell: (cellProps) => {
                    const row = cellProps.row.original;
                    const edits = rowEdits[row.s_id] || {};
                    const cellKey = `${row.s_id}-access_code`;
                    return (
                        <EditableCell
                          value={edits.access_code ?? row.access_code ?? ''}
                          onSave={val => handleFieldEdit(row.s_id, 'access_code', val, row)}
                          cellKey={cellKey}
                          isFocused={focusedCell === cellKey}
                          onFocusCell={setFocusedCell}
                        />
                    );
                }
            },
            {
                header: 'Done By',
                accessorKey: 'done_by',
                enableColumnFilter: false,
                enableSorting: true,
                cell: (cellProps) => {
                    const row = cellProps.row.original;
                    const edits = rowEdits[row.s_id] || {};
                    const cellKey = `${row.s_id}-done_by`;
                    return (
                        <EditableCell
                          value={edits.done_by ?? row.done_by ?? ''}
                          onSave={val => handleFieldEdit(row.s_id, 'done_by', val, row)}
                          cellKey={cellKey}
                          isFocused={focusedCell === cellKey}
                          onFocusCell={setFocusedCell}
                        />
                    );
                }
            },
            {
                header: 'Actions',
                enableColumnFilter: false,
                enableSorting: false,
                cell: (cellProps) => (
                    <ul className="list-unstyled hstack gap-1 mb-0">
                        <li>
                            <button
                                type="button"
                                className="btn btn-sm btn-soft-info"
                                onClick={() => handleEditSchedule(cellProps.row.original)}
                                id={`edittooltip-${cellProps.row.original.s_id}`}
                            >
                                <i className="mdi mdi-pencil-outline" />
                                <UncontrolledTooltip placement="top" target={`edittooltip-${cellProps.row.original.s_id}`} >
                                    Edit
                                </UncontrolledTooltip>
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                className="btn btn-sm btn-soft-danger"
                                onClick={() => {
                                    setSchedule(cellProps.row.original);
                                    setDeleteModal(true);
                                }}
                                id={`deletetooltip-${cellProps.row.original.s_id}`}
                            >
                                <i className="mdi mdi-delete-outline" />
                                <UncontrolledTooltip placement="top" target={`deletetooltip-${cellProps.row.original.s_id}`}>
                                    Delete
                                </UncontrolledTooltip>
                            </button>
                        </li>
                    </ul>
                )
            },
        ],
        [handleEditSchedule, rowEdits, focusedCell]
    );

    const handlePageSizeChange = (newPageSize) => {
        setCustomPageSize(newPageSize);
        setCurrentPage(1);
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
            toast.success('New schedule created successfully!');
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Only depend on schedules for tableData, not liveTime
    const tableData = useMemo(() => schedules.map(row => ({
        ...row,
        _rowClass: (row.status && row.status.toUpperCase() === 'TAKEN' ? 'font-maroon' : '')
    })), [schedules]);

    return (
        <React.Fragment>
            <style>{`.font-maroon { color: Maroon !important; }`}</style>
            <DeleteModal
                show={deleteModal}
                onDeleteClick={handleDeleteSchedule}
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
                                            <h5 className="mb-0 card-title flex-grow-1" style={{ fontSize: "1.5rem" }}>Schedule</h5>

                                        </div>
                                    </CardBody>
                                    <CardBody>
                                        <TableContainer
                                            columns={columns}
                                            data={tableData}
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
                                        />
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                }
                <Modal isOpen={modal} toggle={toggle}>
                    <ModalHeader toggle={toggle} tag="h4">
                        {!!isEdit ? "Edit Schedule" : "Add Schedule"}
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
                                        <Label className="form-label">Title</Label>
                                        <Input
                                            name="title"
                                            type="text"
                                            placeholder="Insert Schedule Title"
                                            onChange={validation.handleChange}
                                            onBlur={validation.handleBlur}
                                            value={validation.values.title || ""}
                                            invalid={validation.touched.title && validation.errors.title ? true : false}
                                        />
                                        {validation.touched.title && validation.errors.title ? (
                                            <FormFeedback type="invalid">
                                                {validation.errors.title}
                                            </FormFeedback>
                                        ) : null}
                                    </div>
                                    <div className="mb-3">
                                        <Label className="form-label">Date</Label>
                                        <Input
                                            name="date"
                                            type="date"
                                            placeholder="Insert Date"
                                            onChange={validation.handleChange}
                                            onBlur={validation.handleBlur}
                                            value={validation.values.date || ""}
                                            invalid={validation.touched.date && validation.errors.date ? true : false}
                                        />
                                        {validation.touched.date && validation.errors.date ? (
                                            <FormFeedback type="invalid">
                                                {validation.errors.date}
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
                                            invalid={validation.touched.status && validation.errors.status ? true : false}
                                        >
                                            <option value="">Select Status</option>
                                            <option>Active</option>
                                            <option>Inactive</option>
                                        </Input>
                                        {validation.touched.status && validation.errors.status ? (
                                            <FormFeedback status="invalid">
                                                {validation.errors.status}
                                            </FormFeedback>
                                        ) : null}
                                    </div>
                                    <div className="mb-3">
                                        <Label className="form-label">Timezone</Label>
                                        <Input
                                            name="timezone"
                                            type="select"
                                            onChange={validation.handleChange}
                                            onBlur={validation.handleBlur}
                                            value={validation.values.timezone || ""}
                                            invalid={validation.touched.timezone && validation.errors.timezone ? true : false}
                                        >
                                            <option value="">Select Timezone</option>
                                            {Array.isArray(timezones) && timezones.length > 0 ? (
                                                timezones.map(tz => (
                                                    <option key={tz.area || tz.id} value={tz.area || tz.id}>{tz.area} {tz.offset ? `(${tz.offset})` : ''}</option>
                                                ))
                                            ) : (
                                                <option disabled>No timezones found</option>
                                            )}
                                        </Input>
                                        {validation.touched.timezone && validation.errors.timezone ? (
                                            <FormFeedback type="invalid">
                                                {validation.errors.timezone}
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
                                            className="btn btn-success btn-lg   save-user"
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

export default ScheduleList;
