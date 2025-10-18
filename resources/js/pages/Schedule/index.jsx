import React, { useEffect, useMemo, useState } from "react";
import Echo from 'laravel-echo';

import { useLocation, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import TableContainer from '../../components/Common/TableContainer';
import * as Yup from "yup";
import { useFormik } from "formik";
import api from '../../helpers/api';
import DeleteModal from '../../components/Common/DeleteModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Col, Row, UncontrolledTooltip, Modal, ModalHeader, ModalBody, Form, Input, FormFeedback, Label, Card, CardBody } from "reactstrap";
import Spinners from "../../components/Common/Spinner";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import debounce from 'lodash.debounce';

function ScheduleList() {
    // Listen for filter button event from Navbar
    useEffect(() => {
        const handler = () => setShowFullControls(v => !v);
        window.addEventListener('toggleExamcodeControls', handler);
        return () => window.removeEventListener('toggleExamcodeControls', handler);
    }, []);
    // State for toggling filter/search controls
    const [showFullControls, setShowFullControls] = useState(false);
    document.title = "Schedule";

    // NOTE: Echo subscription effect moved below state declarations to avoid referencing
    // variables (like currentPage/customPageSize/sortState) before they're initialized.


    const handleStatusUpdated = (e) => {
        setSchedules(prev => {
            const eventId = e.id ?? e.s_id;
            return prev.map(row =>
                row.s_id === eventId
                    ? { ...row, status: e.status, system_name: e.system_name, access_code: e.access_code, done_by: e.done_by }
                    : row
            );
        });
    };

    const handleClientChange = () => {
        fetchSchedules(currentPage, customPageSize, sortState.sortBy, sortState.sortOrder);
    };


    // Removed duplicate Echo listener for StatusUpdated

    // Main state
    const [modal, setModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [schedule, setSchedule] = useState(null);
    const [customPageSize, setCustomPageSize] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [fromRecord, setFromRecord] = useState(0);
    const [toRecord, setToRecord] = useState(0);
    // Default sort: Indian Time column, latest first
    const [sortState, setSortState] = useState({ sortBy: 'indian_time', sortOrder: 'asc' });
    const [deleteModal, setDeleteModal] = useState(false);
    const [timezones, setTimezones] = useState([]);
    const [rowEdits, setRowEdits] = useState({});
    const [focusedCell, setFocusedCell] = useState(null);

    useEffect(() => {
        if (!window.Echo) {
            console.error('window.Echo is not defined!');
            return;
        }

        const channelMap = [
            { channel: 'schedulechange', event: '.StatusUpdated', handler: handleStatusUpdated },
            { channel: 'clientcreate', event: '.ClientCreated', handler: handleClientChange },
            { channel: 'clientupdate', event: '.ClientUpdated', handler: handleClientChange },
            { channel: 'clientdelete', event: '.ClientDeleted', handler: handleClientChange }
        ];

        channelMap.forEach(({ channel, event, handler }) => {
            try {
                window.Echo.channel(channel).listen(event, handler);
            } catch (e) {
                console.error('Failed to attach Echo listener for', channel, event, e);
            }
        });

        return () => {
            channelMap.forEach(({ channel, event, handler }) => {
                try {
                    window.Echo.channel(channel).stopListening(event, handler);
                } catch (e) {
                    // ignore cleanup errors
                }
            });
        };

    }, [currentPage, customPageSize, sortState]);

    // Filter/search state
    const [search, setSearch] = useState("");
    const [filterAgent, setFilterAgent] = useState("");
    const [filterUser, setFilterUser] = useState("");
    const [filterGroup, setFilterGroup] = useState("");
    const [filterExamCode, setFilterExamCode] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterStartDate, setFilterStartDate] = useState(null);
    const [filterEndDate, setFilterEndDate] = useState(null);
    const [groupOptions, setGroupOptions] = useState([]);
    const [examCodeOptions, setExamCodeOptions] = useState([]);
    const [agentOptions, setAgentOptions] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [roleId, setRoleId] = useState(null);

    const location = useLocation();
    const navigate = useNavigate();


    useEffect(() => {
        const obj = JSON.parse(sessionStorage.getItem("authUser"));
        if (obj && obj.role_id) {
            setRoleId(obj.role_id);
        }
    }, []);

    // Fetch filter options for dropdowns
    useEffect(() => {
        api.get('/schedule/filter-managed-data').then(res => {
            setGroupOptions(res.data.groups || []);
            setExamCodeOptions(res.data.examcodes || []);
            setAgentOptions(res.data.agents || []);
            setUserOptions(res.data.users || []);
        });
    }, []);

    // Fetch timezones
    useEffect(() => {
        api.get('/timezone/get-full-timezones').then(res => {
            setTimezones(res.data || []);
        });
    }, []);

    // Fetch data with filters (Enquiry style)
    const [serverIST, setServerIST] = useState(null);
    const fetchSchedules = (page = 1, pageSize = customPageSize, sortField = sortState.sortBy, sortDir = sortState.sortOrder, searchVal = search, dateFilter = null) => {
        setLoading(true);
        const formatDate = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
        // Map frontend sort keys to backend sort keys
        const sortKeyMap = {
            agent: 'agent',
            user: 'user',
            exam_code: 'examcode',
            group_name: 's_group_name', // Fix: map to actual DB column
            s_id: 's_id',
            s_group_name: 's_group_name',
            s_exam_code: 's_exam_code',
            s_date: 's_date',
            indian_time: 's_date', // Map frontend 'indian_time' to backend 's_date'
            s_agent_id: 's_agent_id',
            s_user_id: 's_user_id',
            s_status: 's_status',
            system_name: 'system_name',
            access_code: 'access_code',
            done_by: 'done_by',
        };
        const backendSortBy = sortKeyMap[sortField] || sortField;
        api.get(`/schedule`, {
            params: {
                page,
                pageSize,
                search: searchVal,
                sortBy: backendSortBy,
                sortOrder: sortDir,
                agent_id: filterAgent,
                user_id: filterUser,
                group_id: filterGroup,
                examcode_id: filterExamCode,
                status: filterStatus,
                startdate: formatDate(filterStartDate),
                enddate: formatDate(filterEndDate),
                date: dateFilter ? formatDate(new Date(dateFilter)) : undefined // Add date filter
            }
        })
            .then(res => {
                setTotalRecords(res.data.total);
                // Only update currentPage if changed
                if (res.data.current_page !== currentPage) setCurrentPage(res.data.current_page);
                // Only update customPageSize if changed
                if (res.data.per_page !== customPageSize) setCustomPageSize(res.data.per_page);
                setFromRecord(res.data.from);
                setToRecord(res.data.to);
                setServerIST(res.data.server_time_ist || null);
                const mapped = (res.data.data || []).map((item) => ({
                    s_id: item.s_id,
                    agent: item.agent?.name || "",
                    user: item.user?.name || "",
                    group_name: item.s_group_name,
                    exam_code: item.examcode?.ex_code || '',
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

    // Refetch on filter/search change
    useEffect(() => {
        fetchSchedules(currentPage, customPageSize, sortState.sortBy, sortState.sortOrder, search);
    }, [currentPage, customPageSize, sortState, search, filterAgent, filterUser, filterGroup, filterExamCode, filterStatus, filterStartDate, filterEndDate]);

    // Formik for modal
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
                    fetchSchedules(currentPage, customPageSize, sortState.sortBy, sortState.sortOrder);
                } catch {
                    toast.error('Failed to update schedule.');
                }
            } else {
                try {
                    await api.post('/schedule', values);
                    toast.success('Schedule created successfully!');
                    fetchSchedules(currentPage, customPageSize, sortState.sortBy, sortState.sortOrder);
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

    const handleEditSchedule = async (row) => {
        try {
            const res = await api.get(`/schedule/${row.s_id}`);
            navigate('/client-create', { state: { editId: row.s_id, editType: 'schedule' } });
        } catch (err) {}
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
                fetchSchedules(currentPage, customPageSize, sortState.sortBy, sortState.sortOrder);
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
            setSchedules(prev => prev.map(row =>
                row.s_id === s_id ? { ...row, [field]: value } : row
            ));
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

    const [statusChangeModal, setStatusChangeModal] = useState(false);
    const [statusChangeData, setStatusChangeData] = useState({});

    const [revokeModal, setRevokeModal] = useState(false);
    const [revokeReason, setRevokeReason] = useState("");

    const handleStatusChange = (s_id, value, rowData) => {
        if (value === 'REVOKE') {
            setStatusChangeData({ s_id, value, rowData });
            setRevokeModal(true);
            return;
        }

        setRowEdits(prev => ({
            ...prev,
            [s_id]: {
                ...prev[s_id],
                status: value
            }
        }));
        debouncedSaveField(s_id, 'status', value, rowData);

        if (value === 'DONE') {
            setStatusChangeModal(true); // Show the modal for DONE status
            setStatusChangeData({ s_id, value, rowData });
            return; // Exit to prevent immediate filtering
        }
    };

    const confirmStatusChange = () => {
        const { s_id, value, rowData } = statusChangeData;
        setRowEdits(prev => ({
            ...prev,
            [s_id]: {
                ...prev[s_id],
                status: value
            }
        }));
        debouncedSaveField(s_id, 'status', value, rowData);

        if (value === 'DONE' || value === 'REVOKE') {
            setTimeout(() => {
                setSchedules(prev => prev.filter(row => row.s_id !== s_id));
            }, 600);
        }
        setStatusChangeModal(false);
    };

    const confirmRevokeStatusChange = () => {
        const { s_id, value, rowData } = statusChangeData;
        if (!revokeReason.trim()) { 
            toast.error("Please provide the reason for revoking.");
            return;
        }

        setRowEdits(prev => ({
            ...prev,
            [s_id]: {
                ...prev[s_id],
                status: value
            }
        }));
        debouncedSaveField(s_id, 'status', value, rowData);

        // Save revoke reason to the backend
        api.post(`/schedule/${s_id}/revoke-reason`, { s_revoke_reason: revokeReason })
            .then(response => {
                toast.success(response.data.message);
            })
            .catch(error => {
                toast.error(error.response?.data?.message || 'Failed to save revoke reason');
            });

        setTimeout(() => {
            setSchedules(prev => prev.filter(row => row.s_id !== s_id));
        }, 600);

        setRevokeModal(false);
        setRevokeReason("");
    };

    const cancelStatusChange = () => {
        const { s_id, rowData } = statusChangeData;
        // Revert to the previous status
        setRowEdits(prev => ({
            ...prev,
            [s_id]: {
                ...prev[s_id],
                status: rowData.status // Restore the original status
            }
        }));
        setStatusChangeModal(false);
        setStatusChangeData({});
    };

    // Inline editable cell
    const EditableCell = React.memo(
      ({ value: initialValue, onSave, cellKey, isFocused, onFocusCell }) => {
        const [value, setValue] = React.useState(initialValue);
        const inputRef = React.useRef(null);
    // Remove debounce: save immediately for smooth typing
                        // Only update value if cellKey changes (row changes), not on every render
                        const prevCellKey = React.useRef(cellKey);
                        React.useEffect(() => {
                            if (prevCellKey.current !== cellKey) {
                                setValue(initialValue);
                                prevCellKey.current = cellKey;
                            }
                        }, [cellKey, initialValue]);
    // Do not cancel debounce on unmount to avoid losing unsaved input
        React.useEffect(() => {
          if (isFocused && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
          }
        }, [isFocused]);
                        const handleChange = e => {
                            const newValue = e.target.value;
                            setValue(newValue);
                            onSave(newValue); // save immediately
                        };
        const handleFocus = () => {
          onFocusCell(cellKey);
        };
        return (
          <input
            ref={inputRef}
            key={cellKey}
            type="text"
            className="form-control form-control-sm reminder-input "
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
          />
        );
      },
      (prevProps, nextProps) => prevProps.value === nextProps.value && prevProps.isFocused === nextProps.isFocused
    );
const handleSortChange = columnId => {
    setSortState(prev => {
        if (prev.sortBy === columnId) {
            // Toggle direction
            return { sortBy: columnId, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' };
        } else {
            // Switch column, always start with ascending
            return { sortBy: columnId, sortOrder: 'asc' };
        }
    });
};

const columns = useMemo(() => [
    {
        header: (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                SNo
            </span>
        ),
        accessorKey: 'sno',
        enableSorting: false,
        cell: (cellProps) => <span>{(currentPage - 1) * customPageSize + cellProps.row.index + 1}</span>
    },
    {
        header: (
            <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('agent')}>
                Agent
                {sortState.sortBy === 'agent' && (
                    <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                        {sortState.sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                )}
            </span>
        ),
        accessorKey: 'agent',
        enableSorting: true,
        cell: (cellProps) => <span>{cellProps.row.original.agent}</span>
    },
    {
        header: (
            <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('user')}>
                User
                {sortState.sortBy === 'user' && (
                    <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                        {sortState.sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                )}
            </span>
        ),
        accessorKey: 'user',
        enableSorting: true,
        cell: (cellProps) => <span>{cellProps.row.original.user}</span>
    },
    {
        header: (
            <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('group_name')}>
                Group Name
                {sortState.sortBy === 'group_name' && (
                    <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                        {sortState.sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                )}
            </span>
        ),
        accessorKey: 'group_name',
        enableSorting: true,
        cell: (cellProps) => <span>{cellProps.row.original.group_name}</span>
    },
    {
        header: (
            <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('exam_code')}>
                Exam Code
                {sortState.sortBy === 'exam_code' && (
                    <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                        {sortState.sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                )}
            </span>
        ),
        accessorKey: 'exam_code',
        enableSorting: true,
        cell: (cellProps) => <span>{cellProps.row.original.exam_code || ''}</span>
    },
    {
        header: (
            <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer'}} onClick={() => handleSortChange('indian_time')}>
                Indian Time
                {sortState.sortBy === 'indian_time' && (
                    <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                        {sortState.sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                )}
            </span>
        ),
        accessorKey: 'indian_time',
        enableSorting: true,
        cell: (cellProps) => <span style={{ fontWeight: 'bold' }}>{cellProps.row.original.indian_time}</span>
    },
    {
        header: 'Status',
        accessorKey: 'status',
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
                    className="form-select form-select-sm reminder-input"
                    style={{ minWidth: 120 }}
                >
                    <option value="SELECT">SELECT</option>
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
        enableSorting: false,
        cell: (cellProps) => (
            <ul className="list-unstyled hstack gap-1 mb-0" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%' }}>
                <li>
                    <button
                        type="button"
                        className="examcode-action-btn edit"
                        style={{ color: '#1a8cff', background: '#e6f2ff' }}
                        onClick={() => handleEditSchedule(cellProps.row.original)}
                        id={`edittooltip-${cellProps.row.original.s_id}`}
                    >
                        <i className="mdi mdi-pencil-outline" />
                    </button>
                </li>
                <li>
                    <button
                        type="button"
                        className="examcode-action-btn"
                        style={{ color: '#ff4d4f', background: '#fff1f0' }}
                        onClick={() => {
                            setSchedule(cellProps.row.original);
                            setDeleteModal(true);
                        }}
                        id={`deletetooltip-${cellProps.row.original.s_id}`}
                    >
                        <i className="mdi mdi-delete-outline" />
                    </button>
                </li>
                <li>
                    {/* Add InfoButton to rows where status is REVOKE and reason is not empty */}
                    {cellProps.row.original.status === 'REVOKE' && cellProps.row.original.reason && (
                        <InfoButton reason={cellProps.row.original.reason} />
                    )}
                </li>
            </ul>
        )
    },  
], [sortState, handleEditSchedule, rowEdits, focusedCell, handleSortChange]);

    const handlePageSizeChange = (newPageSizeRaw) => {
        if (newPageSizeRaw === 'All') {
            const allSize = totalRecords && totalRecords > 0 ? totalRecords : 1000000;
            setCustomPageSize(allSize);
            setCurrentPage(1);
        } else {
            const newPageSize = Number(newPageSizeRaw) || 20;
            setCustomPageSize(newPageSize);
            setCurrentPage(1);
        }
    };
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };
    // handleSortChange is now memoized above

    // Examcode-style Delete Modal (matching Enquiry)
    const ReminderDeleteModal = ({ show, onDeleteClick, onCloseClick }) => (
        show ? (
            <div className="examcode-modal-backdrop">
                <div className="examcode-modal">
                    <div className="examcode-modal-icon">
                        <i className="mdi mdi-alert-circle-outline"></i>
                    </div>
                    <div className="examcode-modal-title">Delete Schedule?</div>
                    <div className="examcode-modal-message">Are you sure you want to delete this schedule? This action cannot be undone.</div>
                    <div className="examcode-modal-btns">
                        <button className="examcode-cancel-btn" onClick={onCloseClick} type="button">Cancel</button>
                        <button className="examcode-delete-btn" onClick={onDeleteClick} type="button">Delete</button>
                    </div>
                </div>
            </div>
        ) : null
    );

    // New Reminder Warning Modal
    const ReminderWarningModal = ({ show, onConfirmClick, onCloseClick }) => {
        const modalRef = React.useRef(null);
        const confirmRef = React.useRef(null);
        const prevActiveRef = React.useRef(null);

        React.useEffect(() => {
            if (show) {
                // save previously focused element
                prevActiveRef.current = document.activeElement;
                // clear any focused editable cell to prevent focus steal
                try { if (typeof setFocusedCell === 'function') setFocusedCell(null); } catch (e) {}
                try { prevActiveRef.current && prevActiveRef.current.blur(); } catch (e) {}

                // focus confirm button
                setTimeout(() => {
                    if (confirmRef.current) confirmRef.current.focus();
                }, 0);

                // disable focus outside modal
                disableFocusOutside(modalRef, true);

                const handleKeyDown = (e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        onCloseClick();
                        return;
                    }
                    if (e.key !== 'Tab') return;
                    const focusable = modalRef.current.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
                    if (!focusable || focusable.length === 0) return;
                    const nodes = Array.prototype.slice.call(focusable);
                    const idx = nodes.indexOf(document.activeElement);
                    let nextIdx = 0;
                    if (e.shiftKey) {
                        nextIdx = (idx <= 0) ? nodes.length - 1 : idx - 1;
                    } else {
                        nextIdx = (idx === -1 || idx === nodes.length - 1) ? 0 : idx + 1;
                    }
                    e.preventDefault();
                    nodes[nextIdx].focus();
                };
                document.addEventListener('keydown', handleKeyDown);
                return () => document.removeEventListener('keydown', handleKeyDown);
            } else {
                // restore previous focus
                try { if (prevActiveRef.current && typeof prevActiveRef.current.focus === 'function') prevActiveRef.current.focus(); } catch (e) {}
            }
        }, [show, onCloseClick]);

        return (
            show ? (
                <div className="examcode-modal-backdrop">
                    <div className="examcode-modal" ref={modalRef} role="dialog" aria-modal="true">
                        <div className="examcode-modal-icon" style={{ color: 'orange' }}>
                            <i className="mdi mdi-alert-outline"></i> {/* Warning triangle icon */}
                        </div>
                        <div className="examcode-modal-title" style={{ color: 'orange' }}>Warning</div>
                        <div className="examcode-modal-message">Are you sure you want to mark this schedule as <b>DONE</b>?</div>
                        <div className="examcode-modal-btns">
                            <button className="examcode-cancel-btn" onClick={onCloseClick} type="button">Cancel</button>
                            <button ref={confirmRef} className="examcode-delete-btn" onClick={onConfirmClick} type="button" style={{ backgroundColor: 'orange', color: 'white' }}>Confirm</button>
                        </div>
                    </div>
                </div>
            ) : null
        );
    };

    // New Reminder Revoke Modal
    const ReminderRevokeModal = ({ show, onConfirmClick, onCloseClick, reason, setReason }) => {
        const textareaRef = React.useRef(null);
        const modalRef = React.useRef(null);
        const prevActiveRef = React.useRef(null);

        React.useEffect(() => {
            if (show) {
                // store previously focused element so we can restore on close
                prevActiveRef.current = document.activeElement;
                // clear any focused editable cell to prevent focus steal
                try { if (typeof setFocusedCell === 'function') setFocusedCell(null); } catch(e){}
                // blur previous active element
                try { prevActiveRef.current && prevActiveRef.current.blur(); } catch (e) {}

                // focus textarea at end
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                        const len = typeof reason === 'string' ? reason.length : 0;
                        try { textareaRef.current.setSelectionRange(len, len); } catch (e) {}
                    }
                }, 0);

                // disable focus outside modal
                disableFocusOutside(modalRef, true);

                // attach keydown listener for focus trap
                const handleKeyDown = (e) => {
                    if (e.key !== 'Tab') return;
                    const focusable = modalRef.current.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
                    if (!focusable || focusable.length === 0) return;
                    const nodes = Array.prototype.slice.call(focusable);
                    const idx = nodes.indexOf(document.activeElement);
                    let nextIdx = 0;
                    if (e.shiftKey) {
                        nextIdx = (idx <= 0) ? nodes.length - 1 : idx - 1;
                    } else {
                        nextIdx = (idx === -1 || idx === nodes.length - 1) ? 0 : idx + 1;
                    }
                    e.preventDefault();
                    nodes[nextIdx].focus();
                };
                document.addEventListener('keydown', handleKeyDown);
                return () => {
                    document.removeEventListener('keydown', handleKeyDown);
                    disableFocusOutside(modalRef, false);
                };
            } else {
                // restore previous focus
                try { if (prevActiveRef.current && typeof prevActiveRef.current.focus === 'function') prevActiveRef.current.focus(); } catch (e) {}
                disableFocusOutside(modalRef, false);
            }
        }, [show, onCloseClick]);

        return (
            show ? (
                <div className="examcode-modal-backdrop">
                    <div className="examcode-modal" ref={modalRef} role="dialog" aria-modal="true">
                        <div className="examcode-modal-icon" style={{ color: 'orange' }}>
                            <i className="mdi mdi-alert-outline"></i> {/* Warning triangle icon */}
                        </div>
                        <div className="examcode-modal-title" style={{ color: 'orange' }}>Warning</div>
                        <div className="examcode-modal-message">Are you sure you want to change the status to REVOKE? Please provide the reason below:</div>
                        <textarea
                            ref={textareaRef} // Attach ref to the textarea
                            className="examcode-reason-textarea"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Enter reason here..."
                            style={{ width: '100%', marginTop: '10px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                        />
                        <div className="examcode-modal-btns" style={{ marginTop: '10px' }}>
                            <button className="examcode-cancel-btn" onClick={onCloseClick} type="button">Cancel</button>
                            <button className="examcode-delete-btn" onClick={onConfirmClick} type="button" style={{ backgroundColor: 'orange', color: 'white' }}>Confirm</button>
                        </div>
                    </div>
                </div>
            ) : null
        );
    };

    // Helper to disable focusable elements outside a modal while it's open
    const modifiedFocusableRef = React.useRef(new Set());
    // store previous disabled/tabindex state for restoration
    const priorFocusableStateRef = React.useRef(new Map());
    const disableFocusOutside = (modalEl, disable) => {
        // We'll target form controls and focusable elements.
        const allSelector = 'input, textarea, select, button, a[href], [tabindex]';
        if (disable) {
            modifiedFocusableRef.current = new Set();
            priorFocusableStateRef.current = new Map();
            const all = Array.from(document.querySelectorAll(allSelector));
            all.forEach(el => {
                // If modal ref isn't ready, skip
                if (!modalEl || !modalEl.current) return;
                // Skip elements that are inside the modal
                if (modalEl.current.contains(el)) return;

                // Remember this element so we can restore it later
                modifiedFocusableRef.current.add(el);

                const prev = { prevDisabled: undefined, prevTabindex: undefined };

                // If the element has a disabled property (inputs, buttons, selects, textarea), store and disable it
                try {
                    if ('disabled' in el) {
                        prev.prevDisabled = el.disabled;
                        el.disabled = true; // prevent typing/clicks
                    }
                } catch (e) {}

                // Store previous tabindex (if any) and set to -1 to remove from tab order
                try {
                    if (el.hasAttribute && el.hasAttribute('tabindex')) {
                        prev.prevTabindex = el.getAttribute('tabindex');
                    } else {
                        prev.prevTabindex = null;
                    }
                    el.setAttribute('tabindex', '-1');
                } catch (e) {}

                priorFocusableStateRef.current.set(el, prev);
            });

            const page = document.querySelector('.page-content');
            if (page) page.classList.add('modal-inactive');
        } else {
            // Restore previous states
            priorFocusableStateRef.current.forEach((prev, el) => {
                try {
                    if ('disabled' in el && typeof prev.prevDisabled !== 'undefined') {
                        el.disabled = prev.prevDisabled;
                    }
                } catch (e) {}
                try {
                    if (prev.prevTabindex === null) {
                        el.removeAttribute('tabindex');
                    } else if (typeof prev.prevTabindex !== 'undefined') {
                        el.setAttribute('tabindex', prev.prevTabindex);
                    }
                } catch (e) {}
            });
            priorFocusableStateRef.current.clear();
            modifiedFocusableRef.current.clear();
            const page = document.querySelector('.page-content');
            if (page) page.classList.remove('modal-inactive');
        }
    };

    useEffect(() => {
        if (location.state && location.state.created) {
            toast.success('New schedule created successfully!');
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleClearFilters = () => {
        setFilterAgent('');
        setFilterUser('');
        setFilterGroup('');
        setFilterExamCode('');
        setFilterStatus('');
        setFilterStartDate(null);
        setFilterEndDate(null);
        setSearch("");
    };

    // Add event listener for Today's Schedule button
useEffect(() => {
    const handleTodaySchedule = () => {
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        fetchSchedules(1, customPageSize, sortState.sortBy, sortState.sortOrder, search, formattedDate);
    };
    window.addEventListener('filterTodaySchedule', handleTodaySchedule);
    return () => window.removeEventListener('filterTodaySchedule', handleTodaySchedule);
}, [customPageSize, sortState, search]);

    const handleTodaySchedule = () => {
        const today = new Date();
        const formatDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        setFilterStartDate(today);
        setFilterEndDate(today);
    };

    // Highlight row red if IST time >= indian_time column
    const tableData = useMemo(() => {
        if (!serverIST) return schedules;
        const serverDate = new Date(serverIST);
        return schedules.map(row => {
            let highlight = false;
            if (row.indian_time) {
                let rowDate = null;
                // Handle format: DD/MM/YYYY-HH:mm AM
                const match = row.indian_time.match(/^(\d{2})\/(\d{2})\/(\d{4})-(\d{2}):(\d{2}) (AM|PM)$/i);
                if (match) {
                    let [_, dd, mm, yyyy, hh, min, ampm] = match;
                    let hour = parseInt(hh, 10);
                    if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
                    if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
                    // Parse as local IST time (not UTC)
                    rowDate = new Date(
                        parseInt(yyyy, 10),
                        parseInt(mm, 10) - 1,
                        parseInt(dd, 10),
                        hour,
                        parseInt(min, 10),
                        0
                    );
                } else if (/^\d{4}-\d{2}-\d{2}/.test(row.indian_time)) {
                    rowDate = new Date(row.indian_time.replace(/-/g, '/'));
                }
                // Only compare if both dates are valid
                if (rowDate instanceof Date && !isNaN(rowDate) && serverDate instanceof Date && !isNaN(serverDate)) {
                    if (serverDate.getTime() >= rowDate.getTime()) highlight = true;
                }
            }
            return {
                ...row,
                _rowClass: highlight ? 'font-red' : (row.status && row.status.toUpperCase() === 'TAKEN' ? 'font-maroon' : ''),
            };
        });
    }, [schedules, serverIST]);
            {/* Add red color for highlight */}

    return (
        <React.Fragment>
            <style>{`
                .font-red { background: #ffeaea !important; color: #d32f2f !important; }
                .reminder-header-bar { width: 100vw; background: #fff; box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08);  padding: 32px 32px 0 32px; display: flex; flex-direction: column; align-items: center; gap: 0; }
                .reminder-title-text { font-size: 2.1rem; font-weight: 700; color: #1a2942; margin-bottom: 0.5rem; letter-spacing: 0.01em; text-align: left; }
                .reminder-title-divider { width: 60px; height: 4px; background: #2ba8fb; border-radius: 2px; margin: 18px 0 0 0; opacity: 0.8; }
                .reminder-filterbar { width: 100vw; background: #fff; display: flex; justify-content: center; align-items: flex-end; gap: 18px; padding: 18px 32px 0 32px; flex-wrap: wrap; flex-direction: row; }
                .reminder-input { border-radius: 10px !important; border: 1.5px solid #e3e6ef !important; box-shadow: 0 1.5px 8px rgba(44,62,80,0.04); font-size: 1.05rem; padding: 10px 16px; background: #fafdff !important; transition: border-color 0.2s; height: 44px !important; min-width: 140px; max-width: 220px; width: 100%; box-sizing: border-box; }
                .reminder-table-shadow { box-shadow: 0 4px 24px rgba(44,62,80,0.10), 0 1.5px 4px rgba(44,62,80,0.08); border-radius: 18px; overflow: hidden; }
                .reminder-table-shadow table {overflow: hidden; background: #fff; }
                .reminder-table-shadow th, .reminder-table-shadow td { border-radius: 0 !important; }
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
                    .reminder-header-bar, .reminder-filterbar, .examcode-modal {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 16px;
                    }
                }
                .font-maroon { color: Maroon !important; }
                .modal-inactive { pointer-events: none; user-select: none; filter: blur(0.2px); }
            `}</style>
            <ReminderDeleteModal
                show={deleteModal}
                onDeleteClick={handleDeleteSchedule}
                onCloseClick={() => setDeleteModal(false)}
            />
            <ReminderWarningModal
                show={statusChangeModal}
                onConfirmClick={confirmStatusChange}
                onCloseClick={cancelStatusChange}
            />
            <ReminderRevokeModal
                show={revokeModal}
                onConfirmClick={confirmRevokeStatusChange}
                onCloseClick={() => setRevokeModal(false)}
                reason={revokeReason}
                setReason={setRevokeReason}
            />
                <div className="page-content" style={{  background: '#fff', padding: 0, width: '100vw', overflowX: 'hidden', marginTop: "0px" }}>
                {/* Header Bar */}
                {/* <div className="reminder-header-bar"> */}
                    {/* <div style={{ display: 'flex', alignItems: 'center', gap: 18, justifyContent: 'flex-start' }}>
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
                            <div className="reminder-title-text">Schedule</div>
                            <div className="reminder-title-divider"></div>
                        </div>
                    </div> */}
                {/* </div> */}
                {/* Filter Bar (Enquiry style) */}
                {showFullControls && (
                <div className="reminder-filterbar" style={{ width: '100vw', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '18px 32px 0 32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, width: '100%' }}>
                        <div style={{ fontWeight: 600, fontSize: 18, color: '#1a2942', marginRight: 18 }}>Filter</div>
                         { roleId !== 2 && roleId !== 3 && (
                        <select className="reminder-input" value={filterAgent} onChange={e => setFilterAgent(e.target.value)} style={{ minWidth: 180 }}>
                            <option value="">All Agents</option>
                            {agentOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                        </select>
                        )}
                        { roleId !== 3 && (
                            <select className="reminder-input" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ minWidth: 180 }}>
                                <option value="">All Users</option>
                                {userOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                        )}
                        <select className="reminder-input" value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ minWidth: 180 }}>
                            <option value="">All Groups</option>
                            {groupOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                        </select>
                        <select className="reminder-input" value={filterExamCode} onChange={e => setFilterExamCode(e.target.value)} style={{ minWidth: 180 }}>
                            <option value="">All Exam Codes</option>
                            {examCodeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.ex_code}</option>)}
                        </select>
                        <select className="reminder-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: 180 }}>
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
                                    selected={filterStartDate}
                                    onChange={setFilterStartDate}
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
                                    selected={filterEndDate}
                                    onChange={setFilterEndDate}
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
                       

                        {(filterAgent || filterUser || filterGroup || filterExamCode || filterStatus || filterStartDate || filterEndDate) && (
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
                                value={String(customPageSize)}
                                onChange={e => handlePageSizeChange(e.target.value)}
                                style={{ minWidth: 80 }}
                            >
                                <option key={'All'} value={'All'}>{'All'}</option>
                                {[5, 10, 20, 50, 100].map(size => (
                                    <option key={size} value={String(size)}>{size}</option>
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
                {/* Table Section (Enquiry style) */}
                <div style={{ padding: '32px 32px 32px 32px', width: '100%', background: '#fff' }}>
                    {isLoading ? <Spinners setLoading={setLoading} /> :
                        <>
                            <Row>
                                <Col xs={12} className="reminder-table-shadow">
                                    <TableContainer
                                        columns={columns}
                                        data={tableData}
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
                                        editableInputClassName="table-edit-input"
                                        editableSelectClassName="table-edit-select"
                                    />
                                </Col>
                            </Row>
                        </>
                    }
                </div>
                {/* Modal */}
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
                                            <option>TAKEN</option>
                                            <option>REVOKE</option>
                                            <option>DONE</option>
                                            <option>RESCHEDULE</option>
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
                            <div className="d-flex justify-content-end gap-2">
                                <button type="button" className="examcode-cancel-btn" onClick={toggle}>
                                    Cancel
                                </button>
                                <button type="submit" className="examcode-update-btn">
                                    {!!isEdit ? "Update Schedule" : "Create Schedule"}
                                </button>
                            </div>
                        </Form>
                    </ModalBody>
                </Modal>
            </div>
        </React.Fragment>
    );
}

export default ScheduleList;