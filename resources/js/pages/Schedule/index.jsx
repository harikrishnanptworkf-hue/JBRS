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
    let todaySchedule = false;
    try {
        todaySchedule = localStorage.getItem('todaySchedule') === 'true';
    } catch (e) { todaySchedule = false; }

    // Listen for filter button event from Navbar
    useEffect(() => {
        const handler = () => setShowFullControls(v => !v);
        window.addEventListener('toggleExamcodeControls', handler);
        return () => window.removeEventListener('toggleExamcodeControls', handler);
    }, []);
    // State for toggling filter/search controls
    const [showFullControls, setShowFullControls] = useState(false);
    document.title = "Schedule";

    // On full page refresh, reset Today Schedule mode to false in localStorage
    useEffect(() => {
        try { localStorage.setItem('todaySchedule', 'false'); } catch (e) {}
    }, []);


    const handleStatusUpdated = (e) => {
        const eventId = e.id ?? e.s_id;
        const newStatus = e.status;
        setSchedules(prev => {
            return prev.reduce((acc, row) => {
                if (row.s_id === eventId) {
                    // If remote system marks DONE or REVOKE remove row from table
                    if (newStatus === 'DONE' || newStatus === 'REVOKE') {
                        return acc; // skip adding
                    }
                    acc.push({
                        ...row,
                        status: newStatus,
                        system_name: e.system_name,
                        access_code: e.access_code,
                        done_by: e.done_by
                    });
                } else {
                    acc.push(row);
                }
                return acc;
            }, []);
        });
    };

    const handleClientChange = () => {
        // If this computer has "Today Schedule" mode enabled, auto-focus to today's range
        let isToday = false;
        try { isToday = localStorage.getItem('todaySchedule') === 'true'; } catch (e) { isToday = false; }
        if (isToday) {
            const today = new Date();
            setFilterAgent('');
            setFilterUser('');
            setFilterGroup('');
            setFilterExamCode('');
            setFilterStatus('');
            setSearch("");
            setFilterStartDate(today);
            setFilterEndDate(today);
            setCurrentPage(1);
            // fetchSchedules will be triggered by filter state change
            return;
        }
        // Otherwise, keep current filters and just refresh
        fetchSchedules(currentPage, customPageSize, sortState.sortBy, sortState.sortOrder, search);
    };

    // On delete: if Today Schedule mode is active, focus to today's range; else refresh with current filters
    const handleClientDelete = () => {
        let isToday = false;
        try { isToday = localStorage.getItem('todaySchedule') === 'true'; } catch (e) { isToday = false; }
        if (isToday) {
            const today = new Date();
            setFilterAgent('');
            setFilterUser('');
            setFilterGroup('');
            setFilterExamCode('');
            setFilterStatus('');
            setSearch("");
            setFilterStartDate(today);
            setFilterEndDate(today);
            setCurrentPage(1);
            // fetchSchedules will be triggered by filter state change
            return;
        }
        // Otherwise, keep current filters and just refresh
        fetchSchedules(currentPage, customPageSize, sortState.sortBy, sortState.sortOrder, search);
    };


    // Removed duplicate Echo listener for StatusUpdated

    // Main state
    const [modal, setModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [schedule, setSchedule] = useState(null);
    const [customPageSize, setCustomPageSize] = useState(50);
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
    const handleRefresh = () => {
        // setActiveTab('defaultTab'); 
            setCurrentPage(1);
            setCustomPageSize(50);
            setSortState({ sortBy: 'indian_time', sortOrder: 'asc' });
            setFilterAgent('');
            setFilterUser('');
            setFilterGroup('');
            setFilterExamCode('');
            setFilterStatus('');
            setFilterStartDate(null);
            setFilterEndDate(null);
            setSearch("");
            setShowFullControls(false);
            window.scrollTo({ top: 0, behavior: 'auto' });
        };
        window.addEventListener('forcePageRefresh', handleRefresh);
        return () => window.removeEventListener('forcePageRefresh', handleRefresh);
    }, []);


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
    const [exportLoading, setExportLoading] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();


    useEffect(() => {
        const obj = JSON.parse(sessionStorage.getItem("authUser"));
        if (obj && obj.role_id) {
            setRoleId(obj.role_id);
        }
    }, []);

    // Enquiry results (to show under Schedule when filters/search are applied)
    const [enqLoading, setEnqLoading] = useState(false);
    const [enquiries, setEnquiries] = useState([]);
    const [enqTotalRecords, setEnqTotalRecords] = useState(0);
    const [enqCurrentPage, setEnqCurrentPage] = useState(1);
    const [enqPageSize, setEnqPageSize] = useState(10);
    const [enqFromRecord, setEnqFromRecord] = useState(0);
    const [enqToRecord, setEnqToRecord] = useState(0);
    const [enqSortBy, setEnqSortBy] = useState('e_id');
    const [enqSortOrder, setEnqSortOrder] = useState('desc');

    useEffect(() => {
        if (!window.Echo) {
            console.error('window.Echo is not defined!');
            return;
        }

        const channelMap = [
            { channel: 'schedulechange', event: '.StatusUpdated', handler: handleStatusUpdated },
            { channel: 'clientcreate', event: '.ClientCreated', handler: handleClientChange },
            { channel: 'clientupdate', event: '.ClientUpdated', handler: handleClientChange },
            { channel: 'clientdelete', event: '.ClientDeleted', handler: handleClientDelete }
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

        // Include filter/search dependencies so the event handlers always capture the latest filter state
    }, [currentPage, customPageSize, sortState, search, filterAgent, filterUser, filterGroup, filterExamCode, filterStatus, filterStartDate, filterEndDate]);

    // Fetch filter options for dropdowns
    useEffect(() => {
        api.get('/schedule/filter-managed-data').then(res => {
            setGroupOptions(res.data.groups || []);
            setExamCodeOptions(res.data.examcodes || []);
            setAgentOptions(res.data.agents || []);
            setUserOptions(res.data.users || []);
        });
    }, []);

    // Fetch enquiries matching current Schedule filters/search
    const fetchEnquiriesForSchedule = (page = enqCurrentPage, pageSize = enqPageSize, sortField = enqSortBy, sortDir = enqSortOrder, searchVal = search) => {
        // Only fetch when some filter/search is applied to avoid loading full list always
        const hasAnyFilter = !!(searchVal || filterAgent || filterUser || filterGroup || filterExamCode || filterStartDate || filterEndDate);
        if (!hasAnyFilter) {
            setEnquiries([]);
            setEnqTotalRecords(0);
            setEnqFromRecord(0);
            setEnqToRecord(0);
            return;
        }
        setEnqLoading(true);
        const formatDate = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
        api.get('/enquiries', {
            params: {
                page,
                pageSize,
                search: searchVal,
                sortBy: sortField,
                sortOrder: sortDir,
                agent_id: filterAgent,
                user_id: filterUser,
                group_id: filterGroup,
                examcode_id: filterExamCode,
                startdate: formatDate(filterStartDate),
                enddate: formatDate(filterEndDate)
            }
        })
        .then(res => {
            setEnqTotalRecords(res.data.total || 0);
            setEnqCurrentPage(res.data.current_page || 1);
            setEnqPageSize(res.data.per_page || pageSize);
            setEnqFromRecord(res.data.from || 0);
            setEnqToRecord(res.data.to || 0);
            setEnquiries(res.data.data || []);
            setEnqLoading(false);
        })
        .catch(() => setEnqLoading(false));
    };

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
        // Also fetch matching enquiries using the same filters/search
        fetchEnquiriesForSchedule(enqCurrentPage, enqPageSize, enqSortBy, enqSortOrder, search);
    }, [currentPage, customPageSize, sortState, search, filterAgent, filterUser, filterGroup, filterExamCode, filterStatus, filterStartDate, filterEndDate]);

    // Keep enquiry pagination/sort independent
    useEffect(() => {
        fetchEnquiriesForSchedule(enqCurrentPage, enqPageSize, enqSortBy, enqSortOrder, search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enqCurrentPage, enqPageSize, enqSortBy, enqSortOrder]);

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

    // Enquiry actions (edit, convert, delete) re-used here
    const handleEditEnquiry = async (row) => {
        try {
            const res = await api.get(`/enquiries/${row.id}`);
            navigate('/client-create', { state: { editId: row.id, editType: 'enquiry', enquiryData: res.data } });
        } catch (err) {
            toast.error('Failed to fetch enquiry details.');
        }
    };

    const handleConvertToSchedule = async (row) => {
        try {
            const res = await api.get(`/enquiries/${row.id}`);
            navigate('/client-create', { state: { editId: row.id, editType: 'enquiry', enquiryData: res.data, forceSchedule: true } });
        } catch (err) {
            toast.error('Failed to open convert-to-schedule view.');
        }
    };

    const [enqDeleteModal, setEnqDeleteModal] = useState(false);
    const [enqToDelete, setEnqToDelete] = useState(null);
    const handleDeleteEnquiry = async () => {
        if (enqToDelete && enqToDelete.id) {
            try {
                await api.delete(`/enquiries/${enqToDelete.id}`);
                toast.success('Enquiry deleted successfully!');
                fetchEnquiriesForSchedule(enqCurrentPage, enqPageSize, enqSortBy, enqSortOrder, search);
            } catch {
                toast.error('Failed to delete enquiry.');
            }
            setEnqDeleteModal(false);
            setEnqToDelete(null);
        }
    };

    // Draft vs commit editing logic
    const handleFieldDraft = (s_id, field, value) => {
        setRowEdits(prev => ({
            ...prev,
            [s_id]: {
                ...prev[s_id],
                [field]: value,
                __dirty: true
            }
        }));
    };

const handleFieldCommit = async (s_id, field, value) => {
    const currentValue =
        schedules.find(r => r.s_id === s_id)?.[field];

    // ✅ Skip ONLY if value truly unchanged
    if (currentValue === value) {
        setRowEdits(prev => {
            if (!prev[s_id]) return prev;
            const clone = { ...prev };
            delete clone[s_id][field];

            const keysLeft = Object.keys(clone[s_id] || {}).filter(k => k !== '__dirty');
            if (keysLeft.length === 0) delete clone[s_id];
            else delete clone[s_id].__dirty;

            return clone;
        });
        return;
    }

    try {
        await api.patch(`/schedule/${s_id}/fields`, {
            [field]: value
        });

        // ✅ Update schedules FIRST (single source of truth)
        setSchedules(prev =>
            prev.map(row =>
                row.s_id === s_id
                    ? { ...row, [field]: value }
                    : row
            )
        );

        // ✅ Clean rowEdits safely
        setRowEdits(prev => {
            if (!prev[s_id]) return prev;

            const clone = { ...prev };
            delete clone[s_id][field];

            const keysLeft = Object.keys(clone[s_id] || {}).filter(k => k !== '__dirty');
            if (keysLeft.length === 0) delete clone[s_id];
            else if (keysLeft.every(
                k => schedules.find(r => r.s_id === s_id)?.[k] === clone[s_id][k]
            )) delete clone[s_id].__dirty;

            return clone;
        });
    } catch (e) {
        toast.error('Failed to update field.');
    }
};


    const [statusChangeModal, setStatusChangeModal] = useState(false);
    const [statusChangeData, setStatusChangeData] = useState({});

    const [revokeModal, setRevokeModal] = useState(false);
    const [revokeReason, setRevokeReason] = useState("");

    // Helper to commit status changes to backend (replaces removed debouncedSaveField)
    const commitStatus = async (s_id, value, rowData) => {
        try {
            await api.patch(`/schedule/${s_id}/fields`, { status: value });
            // Update schedules
            setSchedules(prev => prev.map(r => r.s_id === s_id ? { ...r, status: value } : r));
            // Clean rowEdits entry for status
            setRowEdits(prev => {
                const clone = { ...prev };
                if (clone[s_id]) {
                    delete clone[s_id].status;
                    // Remove __dirty if no other pending fields
                    const remainingKeys = Object.keys(clone[s_id]).filter(k => k !== '__dirty');
                    if (remainingKeys.length === 0) delete clone[s_id];
                    else if (remainingKeys.length === 0 && clone[s_id].__dirty) delete clone[s_id].__dirty;
                }
                return clone;
            });
        } catch (e) {
            toast.error('Failed to update status.');
        }
    };

    const handleStatusChange = (s_id, value, rowData) => {
        // For confirmation-required statuses, defer saving until user confirms
        if (value === 'DONE') {
            setStatusChangeData({ s_id, value, rowData });
            setStatusChangeModal(true);
            return;
        }
        if (value === 'REVOKE') {
            setStatusChangeData({ s_id, value, rowData });
            setRevokeModal(true);
            return;
        }
        // Immediate save for other status values
        setRowEdits(prev => ({
            ...prev,
            [s_id]: {
                ...prev[s_id],
                status: value
            }
        }));
    commitStatus(s_id, value, rowData);
    };

    const confirmStatusChange = () => {
        const { s_id, value, rowData } = statusChangeData;
        // Persist only now that user confirmed
        setRowEdits(prev => ({
            ...prev,
            [s_id]: {
                ...prev[s_id],
                status: value
            }
        }));
    commitStatus(s_id, value, rowData);
        if (value === 'DONE') {
            // Remove row after slight delay for UX
            setTimeout(() => {
                setSchedules(prev => prev.filter(row => row.s_id !== s_id));
            }, 400);
        }
        setStatusChangeModal(false);
        setStatusChangeData({});
    };

    const confirmRevokeStatusChange = () => {
        const { s_id, value, rowData } = statusChangeData;
        if (!revokeReason.trim()) {
            toast.error('Please provide the reason for revoking.');
            return;
        }
        setRowEdits(prev => ({
            ...prev,
            [s_id]: {
                ...prev[s_id],
                status: value
            }
        }));
    commitStatus(s_id, value, rowData);
        api.post(`/schedule/${s_id}/revoke-reason`, { s_revoke_reason: revokeReason })
            .then(r => toast.success(r.data.message))
            .catch(err => toast.error(err.response?.data?.message || 'Failed to save revoke reason'));
        setTimeout(() => {
            setSchedules(prev => prev.filter(row => row.s_id !== s_id));
        }, 400);
        setRevokeModal(false);
        setRevokeReason('');
        setStatusChangeData({});
    };

    const cancelStatusChange = () => {
        // Simply close modal; no persistence happened yet
        setStatusChangeModal(false);
        setStatusChangeData({});
        // Ensure any optimistic status edit is removed (we didn't set it, but defensive cleanup)
        setRowEdits(prev => {
            const { s_id } = statusChangeData;
            if (!s_id) return prev;
            const clone = { ...prev };
            if (clone[s_id]) {
                const { status, ...rest } = clone[s_id];
                // If only status existed and was pending, remove whole entry
                if (Object.keys(rest).length === 0) delete clone[s_id]; else clone[s_id] = rest;
            }
            return clone;
        });
    };

    // Inline editable cell
const EditableCell = React.memo(
  ({
    value: initialValue,
    cellKey,
    isFocused,
    onFocusCell,
    onCommit,
    rowId,
    field
  }) => {
    const [value, setValue] = React.useState(initialValue);
    const inputRef = React.useRef(null);
    const isEditingRef = React.useRef(false);

    // 🔒 Sync from parent ONLY when not editing
    React.useEffect(() => {
      if (!isEditingRef.current) {
        setValue(initialValue);
      }
    }, [initialValue]);

    // Focus control
    React.useEffect(() => {
      if (isFocused && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isFocused]);

    const handleChange = (e) => {
      isEditingRef.current = true;
      setValue(e.target.value);
    };

    const handleBlur = () => {
    if (!isEditingRef.current) return;
    isEditingRef.current = false;
    onCommit(rowId, field, value);
    };
    return (
      <input
        ref={inputRef}
        type="text"
        className="form-control form-control-sm reminder-input"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => onFocusCell(cellKey)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur(); // triggers save
          }
          if (e.key === "Escape") {
            isEditingRef.current = false;
            setValue(initialValue); // revert
            e.currentTarget.blur();
          }
        }}
      />
    );
  }
);

// Separate editable cell for enquiries to support date type
const EnquiryEditableCell = React.memo(
    ({
        value: initialValue,
        cellKey,
        isFocused,
        onFocusCell,
        onCommit,
        rowId,
        field,
        inputType = 'text'
    }) => {
        const [value, setValue] = React.useState(initialValue);
        const inputRef = React.useRef(null);
        const isEditingRef = React.useRef(false);
        const userFocusedRef = React.useRef(false);

        React.useEffect(() => {
            if (!isEditingRef.current) {
                setValue(initialValue);
            }
        }, [initialValue]);

        React.useEffect(() => {
            if (isFocused && inputRef.current && !userFocusedRef.current) {
                inputRef.current.focus();
            }
        }, [isFocused]);

        const handleChange = (e) => {
            isEditingRef.current = true;
            setValue(e.target.value);
        };

        const handleBlur = () => {
            if (!isEditingRef.current) return;
            isEditingRef.current = false;
            userFocusedRef.current = false;
            onCommit(rowId, field, value);
        };

        // Date variant
        if (inputType === 'date') {
            const toDate = (val) => {
                if (!val) return null;
                if (val instanceof Date) return isNaN(val) ? null : val;
                if (typeof val === 'string') {
                    const isoLike = val.includes('T') ? val : val.replace(' ', 'T');
                    const d = new Date(isoLike);
                    return isNaN(d) ? null : d;
                }
                try { const d = new Date(val); return isNaN(d) ? null : d; } catch { return null; }
            };
            const formatDateToYMD = (date) => {
                if (!date) return '';
                let d = date;
                if (typeof d === 'string') {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
                    d = new Date(d);
                }
                if (!(d instanceof Date) || isNaN(d)) return '';
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            };
            const selectedDate = toDate(value);
            return (
                <DatePicker
                    selected={selectedDate}
                    onChange={(date) => {
                        isEditingRef.current = true;
                        const ymd = date ? formatDateToYMD(date) : null;
                        setValue(ymd || '');
                        onCommit(rowId, field, ymd);
                        isEditingRef.current = false;
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="dd/mm/yyyy"
                    className="form-control form-control-sm reminder-input"
                    onFocus={() => { userFocusedRef.current = true; onFocusCell(cellKey); }}
                    isClearable
                />
            );
        }

        return (
            <input
                ref={inputRef}
                type={inputType}
                className="form-control form-control-sm reminder-input"
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={() => { userFocusedRef.current = true; onFocusCell(cellKey); }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.currentTarget.blur();
                    }
                    if (e.key === "Escape") {
                        isEditingRef.current = false;
                        setValue(initialValue);
                        e.currentTarget.blur();
                    }
                }}
            />
        );
    }
);

// Commit enquiry field update
const commitEnquiryFieldUpdate = async (enquiryId, field, value) => {
        try {
                const currentRow = enquiries.find(r => (r.e_id || r.id) === enquiryId);
                const currentValue = (currentRow ? currentRow[field] : undefined);
                if ((currentValue ?? '') === (value ?? '')) return;
                await api.patch(`/enquiries/${enquiryId}/fields`, { [field]: value });
                setEnquiries(prev => prev.map(r => {
                        const rid = r.e_id || r.id;
                        return rid === enquiryId ? { ...r, [field]: value } : r;
                }));
        } catch (e) {
                toast.error('Failed to save field');
        }
};


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
                    rowId={row.s_id}
                    field="system_name"
                    onDraft={handleFieldDraft}
                    onCommit={(id, f, v) => handleFieldCommit(id, f, v, row)}
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
                    rowId={row.s_id}
                    field="access_code"
                    onDraft={handleFieldDraft}
                    onCommit={(id, f, v) => handleFieldCommit(id, f, v, row)}
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
                    rowId={row.s_id}
                    field="done_by"
                    onDraft={handleFieldDraft}
                    onCommit={(id, f, v) => handleFieldCommit(id, f, v, row)}
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

const handleEnqSortChange = (columnId) => {
    let newOrder = 'asc';
    if (enqSortBy === columnId) {
        newOrder = enqSortOrder === 'asc' ? 'desc' : 'asc';
    }
    setEnqSortBy(columnId);
    setEnqSortOrder(newOrder);
    setEnqCurrentPage(1);
};

// Enquiry columns (same as Enquiry page)
const enqColumns = useMemo(() => {
    const cols = [];
    if (roleId !== 2) {
        cols.push({
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleEnqSortChange('agent')}>
                    Agent
                    {enqSortBy === 'agent' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {enqSortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'agent',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.agent?.name || ''}</span>
        });
    }
    cols.push(
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleEnqSortChange('user')}>
                    User
                    {enqSortBy === 'user' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {enqSortOrder === 'asc' ? '▲' : '▼'}
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
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleEnqSortChange('groupname')}>
                    Group Name
                    {enqSortBy === 'groupname' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {enqSortOrder === 'asc' ? '▲' : '▼'}
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
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleEnqSortChange('examcode')}>
                    Exam Code
                    {enqSortBy === 'examcode' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {enqSortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'examcode',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.examcode?.ex_code || ''}</span>

        },
        {
            header: (
                <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleEnqSortChange('date')}>
                    Date
                    {enqSortBy === 'date' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {enqSortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'date',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.formatted_e_date || ''}</span>
        },
        {
            header: 'Remind Date',
            accessorKey: 'e_enq_remind_date',
            enableSorting: false,
            cell: (cellProps) => {
                const row = cellProps.row.original;
                const enquiryId = row.e_id || row.id;
                const cellKey = `${enquiryId}-e_enq_remind_date`;
                return (
                    <EnquiryEditableCell
                        value={row.e_enq_remind_date ?? ''}
                        rowId={enquiryId}
                        field="e_enq_remind_date"
                        onCommit={(id, _f, v) => commitEnquiryFieldUpdate(id, 'e_enq_remind_date', v)}
                        cellKey={cellKey}
                        isFocused={focusedCell === cellKey}
                        onFocusCell={setFocusedCell}
                        inputType="date"
                    />
                );
            }
        },
        {
            header: 'Enquiry Comment',
            accessorKey: 'e_enq_comment',
            enableSorting: false,
            cell: (cellProps) => {
                const row = cellProps.row.original;
                const enquiryId = row.e_id || row.id;
                const cellKey = `${enquiryId}-e_enq_comment`;
                return (
                    <EnquiryEditableCell
                        value={row.e_enq_comment ?? ''}
                        rowId={enquiryId}
                        field="e_enq_comment"
                        onCommit={(id, _f, v) => commitEnquiryFieldUpdate(id, 'e_enq_comment', v)}
                        cellKey={cellKey}
                        isFocused={focusedCell === cellKey}
                        onFocusCell={setFocusedCell}
                    />
                );
            }
        },
        {
            header: 'Action',
            accessorKey: 'action',
            enableSorting: false,
            cell: (cellProps) => {
                const enquiryId = cellProps.row.original.e_id || cellProps.row.original.id;
                return (
                    <ul className="list-unstyled hstack gap-1 mb-0" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%' }}>
                        <li>
                            <button
                                type="button"
                                className="examcode-action-btn"
                                style={{ color: '#2ba8fb', background: '#e6f7ff' }}
                                onClick={() => handleConvertToSchedule({ ...cellProps.row.original, id: enquiryId })}
                                id={`converttoschedule-${enquiryId}`}
                                title="Convert to Schedule"
                            >
                                <i className="mdi mdi-calendar-arrow-right" style={{ color: '#2ba8fb' }} />
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                className="examcode-action-btn edit"
                                style={{ color: '#1a8cff', background: '#e6f2ff' }}
                                onClick={() => handleEditEnquiry({ ...cellProps.row.original, id: enquiryId })}
                                id={`edittooltip-${enquiryId}`}
                                title="Edit Enquiry"
                            >
                                <i className="mdi mdi-pencil-outline" style={{ color: '#1a8cff' }} />
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                className="examcode-action-btn"
                                style={{ color: '#ff4d4f', background: '#fff1f0' }}
                                onClick={() => { setEnqToDelete({ ...cellProps.row.original, id: enquiryId }); setEnqDeleteModal(true); }}
                                id={`deletetooltip-${enquiryId}`}
                            >
                                <i className="mdi mdi-delete-outline" style={{ color: '#ff4d4f' }} />
                            </button>
                        </li>
                    </ul>
                );
            },
        }
    );
    return cols;
}, [roleId, enqSortBy, enqSortOrder, focusedCell]);

    const handlePageSizeChange = (newPageSizeRaw) => {
        if (newPageSizeRaw === 'All') {
            const allSize = 10000;
            todaySchedule = false;
            setCustomPageSize(allSize);
            setCurrentPage(1);
        } else {
            const newPageSize = Number(newPageSizeRaw) || 50;
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
        try { localStorage.setItem('todaySchedule', 'false'); } catch (e) {}
    };

    // Export current filtered schedule list to Excel (mirrors Report export semantics)
    const exportToExcel = async () => {
        setExportLoading(true);
        try {
            // Determine pageSize to send (if user chose 'All', we just pass current customPageSize which may be large)
            const pageSizeToUse = customPageSize;
            const params = {
                page: currentPage,
                pageSize: pageSizeToUse,
                search,
                sortBy: sortState.sortBy,
                sortOrder: sortState.sortOrder,
                agent_id: filterAgent || undefined,
                user_id: filterUser || undefined,
                group_id: filterGroup || undefined,
                examcode_id: filterExamCode || undefined,
                status: filterStatus || undefined,
                startdate: filterStartDate ? `${filterStartDate.getFullYear()}-${String(filterStartDate.getMonth()+1).padStart(2,'0')}-${String(filterStartDate.getDate()).padStart(2,'0')}` : undefined,
                enddate: filterEndDate ? `${filterEndDate.getFullYear()}-${String(filterEndDate.getMonth()+1).padStart(2,'0')}-${String(filterEndDate.getDate()).padStart(2,'0')}` : undefined,
            };
            const response = await api.get('/schedule/export', { params, responseType: 'blob' });
            const contentType = response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            const blob = new Blob([response.data], { type: contentType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = response.headers['content-disposition'] ? response.headers['content-disposition'].split('filename=')[1] : `schedule_${new Date().toISOString().slice(0,10)}.${contentType.includes('sheet') ? 'xlsx' : (contentType.includes('csv') ? 'csv' : 'dat')}`;
            a.download = filename.replace(/"/g,'');
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Schedule export failed', err);
            try { toast.error('Schedule export failed. Please try again.'); } catch(e){}
        } finally {
            setExportLoading(false);
        }
    };

    // Add event listener for Today's Schedule button

// Robust Today Schedule event handler: clear all filters, set both start/end date to today, reload table for today
useEffect(() => {
    const handleTodaySchedule = () => {
        const today = new Date();
        setFilterAgent('');
        setFilterUser('');
        setFilterGroup('');
        setFilterExamCode('');
        setFilterStatus('');
        setSearch("");
        setFilterStartDate(today);
        setFilterEndDate(today);
        setCurrentPage(1);
        try { localStorage.setItem('todaySchedule', 'true'); } catch (e) {}
        // fetchSchedules will be triggered by the filter state change effect
    };
    window.addEventListener('filterTodaySchedule', handleTodaySchedule);
    return () => window.removeEventListener('filterTodaySchedule', handleTodaySchedule);
}, []);

    const handleTodaySchedule = () => {
        const today = new Date();
        const formatDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        setFilterStartDate(today);
        setFilterEndDate(today);
        todaySchedule = true;
    };

    // Realtime IST timer for row highlight (update every 60 seconds for smooth UX)
    const [realtimeIST, setRealtimeIST] = useState(() => new Date().toISOString());
    useEffect(() => {
        const interval = setInterval(() => {
            setRealtimeIST(new Date().toISOString());
        }, 60000); // update every 60 seconds
        return () => clearInterval(interval);
    }, []);
    // Highlight row red if IST time >= indian_time column
    const tableData = useMemo(() => {
        const serverDate = new Date(realtimeIST);
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
                    if (serverDate.getTime() >= rowDate.getTime() && (row.status == 'SELECT' || row.status == null)) highlight = true;
                }
            }
            return {
                ...row,
                _rowClass: highlight ? 'font-red' : (row.status && row.status.toUpperCase() === 'TAKEN' ? 'font-maroon' : ''),
            };
        });
    }, [schedules, realtimeIST]);
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
                /* Disable table row hover background change */
                .reminder-table-shadow .table-hover tbody tr:hover { background-color: inherit !important; }
                .reminder-table-shadow .table-hover tbody tr:hover > td,
                .reminder-table-shadow .table-hover tbody tr:hover > th { background-color: inherit !important; }
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
                /* Export button styles (same as Report page) */
                .export-btn { background: linear-gradient(180deg,#168a13 0%,#0f5c0b 100%); color: #fff !important; border: none; border-radius: 10px; font-weight: 700; font-size: 0.95rem; padding: 8px 16px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 6px 18px rgba(15,92,11,0.15); transition: transform 0.08s ease, box-shadow 0.12s ease; }
                .export-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(15,92,11,0.18); }
                .export-btn:active { transform: translateY(0); }
                .export-btn:disabled { opacity: 0.75; cursor: not-allowed; box-shadow: none; }
                .export-btn .mdi { font-size: 18px; color: #fff; }
                .export-btn .spinner-border { width: 18px; height: 18px; border-width: 2px; color: #fff; }
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
            {/* Enquiry Delete Modal */}
            {enqDeleteModal && (
                <div className="examcode-modal-backdrop">
                    <div className="examcode-modal">
                        <div className="examcode-modal-icon">
                            <i className="mdi mdi-alert-circle-outline"></i>
                        </div>
                        <div className="examcode-modal-title">Delete Enquiry?</div>
                        <div className="examcode-modal-message">Are you sure you want to delete this enquiry? This action cannot be undone.</div>
                        <div className="examcode-modal-btns">
                            <button className="examcode-cancel-btn" onClick={() => setEnqDeleteModal(false)} type="button">Cancel</button>
                            <button className="examcode-delete-btn" onClick={handleDeleteEnquiry} type="button">Delete</button>
                        </div>
                    </div>
                </div>
            )}
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
                                {[5, 10, 20, 50, 100, 500].map(size => (
                                    <option key={size} value={String(size)}>{size}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="export-btn ms-2"
                                title="Export to Excel"
                                onClick={() => exportToExcel()}
                                aria-label="Export to Excel"
                                disabled={exportLoading}
                            >
                                {exportLoading ? (
                                    <span className="spinner-border me-1" role="status" aria-hidden="true"></span>
                                ) : (
                                    <i className="mdi mdi-file-excel me-1" aria-hidden="true"></i>
                                )}
                                <span>{exportLoading ? 'Exporting...' : 'Export'}</span>
                            </button>
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
                            {/* Matching Enquiries Section (shown when filters/search applied) */}
                            {(search || filterAgent || filterUser || filterGroup || filterExamCode || filterStartDate || filterEndDate) && (
                                <div style={{ marginTop: 32 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                        <span className="reminder-title-text" style={{ fontSize: '1.4rem' }}>Matching Enquiries</span>
                                        <div className="reminder-title-divider" style={{ width: 40, marginTop: 0 }}></div>
                                    </div>
                                    {enqLoading ? (
                                        <Spinners setLoading={setEnqLoading} />
                                    ) : (
                                        <Row>
                                            <Col xs={12} className="reminder-table-shadow">
                                                <TableContainer
                                                    columns={enqColumns}
                                                    data={enquiries || []}
                                                    isCustomPageSize={false}
                                                    isGlobalFilter={false}
                                                    isJobListGlobalFilter={false}
                                                    isPagination={true}
                                                    tableClass="align-middle table-nowrap dt-responsive nowrap w-100 table-check dataTable no-footer dtr-inline mt-4 border-top"
                                                    pagination="pagination"
                                                    paginationWrapper="dataTables_paginate paging_simple_numbers pagination-rounded"
                                                    customPageSize={enqPageSize}
                                                    currentPage={enqCurrentPage}
                                                    totalRecords={enqTotalRecords}
                                                    onPageSizeChange={(size) => setEnqPageSize(size === 'All' ? 10000 : Number(size) || 10)}
                                                    onPageChange={(p) => setEnqCurrentPage(p)}
                                                    fromRecord={enqFromRecord}
                                                    toRecord={enqToRecord}
                                                    onSortChange={handleEnqSortChange}
                                                    sortBy={enqSortBy}
                                                    sortDirection={enqSortOrder}
                                                    noDataComponent={<tr><td colSpan={5} className="text-center">No matching enquiries</td></tr>}
                                                />
                                            </Col>
                                        </Row>
                                    )}
                                </div>
                            )}
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