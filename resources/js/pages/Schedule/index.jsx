import React, { useEffect, useMemo, useState } from "react";
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
    // State for toggling filter/search controls
    const [showFullControls, setShowFullControls] = useState(false);
    document.title = "Schedule";

    // Main state
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
    const fetchSchedules = (page = 1, pageSize = customPageSize, sortField = sortBy, sortDir = sortOrder, searchVal = search) => {
        setLoading(true);
        const formatDate = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
        // Map frontend sort keys to backend sort keys
        const sortKeyMap = {
            agent: 'agent',
            user: 'user',
            exam_code: 'examcode',
            group_name: 'group_name',
            s_id: 's_id',
            s_group_name: 's_group_name',
            s_exam_code: 's_exam_code',
            s_date: 's_date',
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
                enddate: formatDate(filterEndDate)
            }
        })
            .then(res => {
                setTotalRecords(res.data.total);
                setCurrentPage(res.data.current_page);
                setCustomPageSize(res.data.per_page);
                setFromRecord(res.data.from);
                setToRecord(res.data.to);
                setSchedules(res.data.data.map((item) => ({
                    s_id: item.s_id,
                    agent: item.agent?.name || "",
                    user: item.user?.name || "",
                    group_name: item.s_group_name,
                    exam_code: item.examcode.ex_code,
                    timezone: item.s_area,
                    indian_time: item.formatted_s_date,
                    status: item.s_status,
                    system_name: item.s_system_name,
                    access_code: item.s_access_code,
                    done_by: item.s_done_by,
                    _rowClass: item.s_status && item.s_status.toUpperCase() === 'TAKEN' ? 'font-maroon' : '',
                })));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    // Refetch on filter/search change
    useEffect(() => {
        fetchSchedules(currentPage, customPageSize, sortBy, sortOrder, search);
        // eslint-disable-next-line
    }, [currentPage, customPageSize, sortBy, sortOrder, search, filterAgent, filterUser, filterGroup, filterExamCode, filterStatus, filterStartDate, filterEndDate]);

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

    const handleStatusChange = (s_id, value, rowData) => {
        setRowEdits(prev => ({
            ...prev,
            [s_id]: {
                ...prev[s_id],
                status: value
            }
        }));
        debouncedSaveField(s_id, 'status', value, rowData);
        if (value === 'DONE') {
            // Remove from list after a short delay to allow backend update
            setTimeout(() => {
                setSchedules(prev => prev.filter(row => row.s_id !== s_id));
            }, 600); // match debounce delay
        }
    };

    // Inline editable cell
    const EditableCell = React.memo(
      ({ value: initialValue, onSave, cellKey, isFocused, onFocusCell }) => {
        const [value, setValue] = React.useState(initialValue);
        const inputRef = React.useRef(null);
        const debouncedSave = React.useMemo(() => debounce(onSave, 500), [onSave]);
        React.useEffect(() => { setValue(initialValue); }, [initialValue]);
        React.useEffect(() => { return () => debouncedSave.cancel(); }, [debouncedSave]);
        React.useEffect(() => {
          if (isFocused && inputRef.current) {
            inputRef.current.focus();
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
            className="form-control form-control-sm reminder-input "
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
          />
        );
      },
      (prevProps, nextProps) => prevProps.value === nextProps.value && prevProps.isFocused === nextProps.isFocused
    );
const handleSortChange = React.useCallback((field) => {
    if (sortBy === field) {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
        setSortBy(field);
        setSortOrder('asc');
    }
    // setCurrentPage(1); // Optionally reset to first page on sort
}, [sortBy]);

const columns = useMemo(() => [
    {
        header: (
            <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('s_id')}>
                SNo
                {sortBy === 's_id' && (
                    <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                        {sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
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
                    <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                        {sortOrder === 'asc' ? '▲' : '▼'}
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
                {sortBy === 'user' && (
                    <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                        {sortOrder === 'asc' ? '▲' : '▼'}
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
                {sortBy === 'group_name' && (
                    <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                        {sortOrder === 'asc' ? '▲' : '▼'}
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
                {sortBy === 'exam_code' && (
                    <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                        {sortOrder === 'asc' ? '▲' : '▼'}
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
            <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('indian_time')}>
                Indian Time
                {sortBy === 'indian_time' && (
                    <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                        {sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                )}
            </span>
        ),
        accessorKey: 'indian_time',
        enableSorting: true,
        cell: (cellProps) => <span>{cellProps.row.original.indian_time}</span>
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
            </ul>
        )
    },  
], [sortBy, sortOrder, handleEditSchedule, rowEdits, focusedCell, handleSortChange]);

    const handlePageSizeChange = (newPageSize) => {
        setCustomPageSize(newPageSize);
        setCurrentPage(1);
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

    const tableData = useMemo(() => schedules.map(row => ({
        ...row,
        _rowClass: (row.status && row.status.toUpperCase() === 'TAKEN' ? 'font-maroon' : '')
    })), [schedules]);

    return (
        <React.Fragment>
            <style>{`
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
            `}</style>
            <ReminderDeleteModal
                show={deleteModal}
                onDeleteClick={handleDeleteSchedule}
                onCloseClick={() => setDeleteModal(false)}
            />
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
                            <div className="reminder-title-text">Schedule</div>
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