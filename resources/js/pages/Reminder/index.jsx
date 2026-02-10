import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';
import TableContainer from '../../components/Common/TableContainer';
import api from '../../helpers/api';
import Spinners from "../../components/Common/Spinner";
import { ToastContainer, toast } from "react-toastify";
import { Row, Col, Input, Label } from 'reactstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Local date formatter for DD-MM-YYYY
function formatDMY(input) {
    if (!input) return '';
    try {
        const d = new Date(input);
        if (isNaN(d.getTime())) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    } catch (e) {
        return '';
    }
}
function ReminderList() {
    const navigate = useNavigate();
    // Listen for filter button event from Navbar
    document.title = "Reminders";

    useEffect(() => {
        const handler = () => setShowFullControls(v => !v);
        window.addEventListener('toggleExamcodeControls', handler);
        return () => window.removeEventListener('toggleExamcodeControls', handler);
    }, []);


    const [customPageSize, setCustomPageSize] = useState(100);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [reminders, setReminders] = useState([]);
    const [isLoading, setLoading] = useState(true);
    const [fromRecord, setFromRecord] = useState(0);
    const [toRecord, setToRecord] = useState(0);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("");
    const [sortDirection, setSortDirection] = useState("asc");
    // Inline edit focus management (match Schedule page behavior: commit on blur/Enter only)
    const [focusedCell, setFocusedCell] = useState(null);
    // Helpers
    const toDate = (value) => {
        if (!value) return null;
        if (value instanceof Date) return isNaN(value) ? null : value;
        if (typeof value === 'string') {
            // Support 'DD/MM/YYYY'
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                const [dd, mm, yyyy] = value.split('/');
                const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
                return isNaN(d) ? null : d;
            }
            // Support 'DD-MM-YYYY'
            if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
                const [dd, mm, yyyy] = value.split('-');
                const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
                return isNaN(d) ? null : d;
            }
            // Normalize 'YYYY-MM-DD HH:MM:SS' to ISO-like by replacing space with 'T'
            const isoLike = value.includes('T') ? value : value.replace(' ', 'T');
            const d = new Date(isoLike);
            return isNaN(d) ? null : d;
        }
        try {
            const d = new Date(value);
            return isNaN(d) ? null : d;
        } catch { return null; }
    };
    const formatDateToYMD = (date) => {
        if (!date) return '';
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    const commitRemindDate = async (row, pickedDate) => {
        try {
            const ymd = pickedDate ? formatDateToYMD(pickedDate) : null;
            const isEnquiry = !!row.e_id || (!row.s_date && !!row.e_date);
            if (isEnquiry) {
                const eid = row.e_id || row.id;
                // Update enquiry-specific remind date field and reflect locally
                await api.put(`/enquiries/${eid}`, { e_enq_remind_date: ymd });
                setReminders(prev => prev.map(r => {
                    const rid = r.id ?? r.s_id ?? r.e_id;
                    if (rid === (row.id || row.s_id || row.e_id)) {
                        const ist = pickedDate ? `${String(pickedDate.getDate()).padStart(2,'0')}/${String(pickedDate.getMonth()+1).padStart(2,'0')}/${pickedDate.getFullYear()}` : '';
                        return { ...r, s_remind_date: ymd, s_remind_date_ist: ist };
                    }
                    return r;
                }));
                return;
            }
            const sid = row.s_id || row.id;
            // Save schedule remind date directly to schedule endpoint
            await api.put(`/schedule/${sid}`, { remind_date: ymd });
            setReminders(prev => prev.map(r => {
                const rid = r.id ?? r.s_id ?? r.e_id;
                if (rid === (row.id || row.s_id || row.e_id)) {
                    const ist = pickedDate ? `${String(pickedDate.getDate()).padStart(2,'0')}/${String(pickedDate.getMonth()+1).padStart(2,'0')}/${pickedDate.getFullYear()}` : '';
                    return { ...r, s_remind_date: ymd, s_remind_date_ist: ist };
                }
                return r;
            }));
        } catch (e) {
            toast.error('Failed to update remind date');
        }
    };

    const commitRemindRemark = async (rowId, value) => {
        try {
            // Find row to detect type
            const row = reminders.find(r => (r.id === rowId || r.s_id === rowId || r.e_id === rowId));
            const isEnquiry = !!row?.e_id || (!row?.s_date && !!row?.e_date);
            const currentValue = (row?.s_remind_remark ?? row?.e_remind_remark ?? '').trim();
            const nextValue = String(value ?? '').trim();
            // Skip if nothing changed
            if (currentValue === nextValue) {
                return;
            }
            if (isEnquiry) {
                const eid = row?.e_id || rowId;
                await api.put(`/enquiries/${eid}`, { remind_remark: nextValue });
            } else {
                const sid = row?.s_id || rowId;
                await api.put(`/schedule/${sid}`, { remind_remark: nextValue });
            }
            // Update local state
            setReminders(prev => prev.map(r => {
                const rid = r.id ?? r.s_id ?? r.e_id;
                return rid === rowId ? { ...r, s_remind_remark: nextValue, e_remind_remark: nextValue } : r;
            }));
        } catch (e) {
            toast.error('Failed to save remind remark');
        }
    };

    // Filter state for each column
    const [filterAgent, setFilterAgent] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterGroup, setFilterGroup] = useState('');
    const [filterExamCode, setFilterExamCode] = useState('');
    const [filterStartDate, setFilterStartDate] = useState(null);
    const [filterEndDate, setFilterEndDate] = useState(null);
    // Options for select filters (should be fetched from backend in real app)
    const [agentOptions, setAgentOptions] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [groupOptions, setGroupOptions] = useState([]);
    const [examCodeOptions, setExamCodeOptions] = useState([]);

    // Edit state
    const [editRowId, setEditRowId] = useState(null);
    const [editRemindDate, setEditRemindDate] = useState(null);

    // Add roleId state
    const [roleId, setRoleId] = useState(null);

    // Show/hide filter section (like Examcode)
    const [showFullControls, setShowFullControls] = useState(false);

    // Safe local formatter to avoid ReferenceError in cell renderers
    const formatDMYLocal = (input) => {
        if (!input) return '';
        try {
            const d = new Date(input);
            if (isNaN(d.getTime())) return '';
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
        } catch (e) {
            return '';
        }
    };

    // Fetch filter options on mount (simulate API call)
    useEffect(() => {
        api.get('/schedule/filter-managed-data').then(res => {
            setAgentOptions(res.data.agents || []);
            setUserOptions(res.data.users || []);
            setGroupOptions(res.data.groups || []);
            setExamCodeOptions(res.data.examcodes || []);
        });
    }, []);

    useEffect(() => {
        // Get role_id from sessionStorage
        const obj = JSON.parse(sessionStorage.getItem("authUser"));
        if (obj && obj.role_id) {
            setRoleId(obj.role_id);
        }
    }, []);

    // Add filter params to fetchReminders
    const fetchReminders = (page = 1, pageSize = customPageSize, searchVal = search, sortByVal = sortBy, sortDirVal = sortDirection) => {
        setLoading(true);
        const formatDate = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
        api.get(`/reminders`, {
            params: {
                page,
                pageSize,
                search: searchVal,
                sortBy: sortByVal,
                sortDirection: sortDirVal,
                agent: filterAgent,
                user: filterUser,
                group: filterGroup,
                examcode: filterExamCode,
                date_start: formatDate(filterStartDate),
                date_end: formatDate(filterEndDate)
            }
        })
        .then(res => {
            setTotalRecords(res.data.total || res.data.length || 0);
            setCurrentPage(res.data.page || 1);
            setCustomPageSize(res.data.pageSize || pageSize);
            setFromRecord((res.data.page - 1) * res.data.pageSize + 1);
            setToRecord(((res.data.page - 1) * res.data.pageSize) + (res.data.data ? res.data.data.length : 0));
            setReminders((res.data.data || []).map(r => {
                const isEnquiry = !!r.e_id || (!r.s_date && !!r.e_date);
                return {
                    ...r,
                    id: r.s_id,
                    type: isEnquiry ? 'enquiry' : 'schedule',
                    remind_date_ist: r.s_remind_date_ist,
                    remind_date_utc: r.s_remind_date
                };
            }));
            setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchReminders(currentPage, customPageSize, search, sortBy, sortDirection);
    }, [currentPage, customPageSize, search, sortBy, sortDirection]);

    // Refetch reminders when filters change
    useEffect(() => {
        setCurrentPage(1);
        fetchReminders(1, customPageSize, search, sortBy, sortDirection);
    }, [filterAgent, filterUser, filterGroup, filterExamCode, filterStartDate, filterEndDate]);

const columns = useMemo(() => {
    const cols = [];

    // Show Agent column only if roleId !== 2
    if (roleId !== 2) {
        cols.push({
            header: (
                <span
                    style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleSortChange('agent')}
                >
                    Agent
                    {sortBy === 'agent' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'agent',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.agent?.name || ''}</span>,
        });
    }

    cols.push(
        {
            header: (
                <span
                    style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleSortChange('user')}
                >
                    User
                    {sortBy === 'user' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'user',
            enableSorting: true,
            cell: (cellProps) => <span>{cellProps.row.original.user?.name || ''}</span>,
        },
        {
            header: (
                <span
                    style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleSortChange('groupname')}
                >
                    Group Name
                    {sortBy === 'groupname' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'groupname',
            enableSorting: true,
            cell: (cellProps) => (
                <span>{cellProps.row.original.e_group_name || cellProps.row.original.s_group_name || ''}</span>
            ),
        },
        {
            header: (
                <span
                    style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleSortChange('examcode')}
                >
                    Exam Code
                    {sortBy === 'examcode' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'examcode',
            enableSorting: true,
            cell: (cellProps) => (
                <span>{cellProps.row.original.examcode.ex_code || ''}</span>
            ),
        },
        {
            header: (
                <span
                    style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleSortChange('reminddate')}
                >
                    Remind Date (IST)
                    {sortBy === 'reminddate' && (
                        <span style={{ marginLeft: 6, fontSize: 16, color: '#ffffffff' }}>
                            {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                    )}
                </span>
            ),
            accessorKey: 'reminddate',
            enableSorting: true,
            cell: (cellProps) => {
                const row = cellProps.row.original;
                const cellKey = `${(row.id || row.s_id || row.e_id)}-s_remind_date`;
                const selected = toDate(row.s_remind_date_ist);
                const isEnquiry = row.type ? row.type === 'enquiry' : (!!row.e_id || (!row.s_date && !!row.e_date));
                return (
                    <DatePicker
                        selected={selected}
                        onChange={(date) => {
                            // Allow clearing via isClearable: when date is null, commit clear
                            if (!date) {
                                commitRemindDate(row, null);
                                return;
                            }
                            if (!(date instanceof Date) || isNaN(date)) {
                                return;
                            }
                            commitRemindDate(row, date);
                        }}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="dd/mm/yyyy"
                        className="form-control form-control-sm reminder-input"
                        onFocus={() => setFocusedCell(cellKey)}
                        isClearable
                        disabled={false}
                    />
                );
            },
        },
        {
            header: 'Remind Remark',
            accessorKey: 'remindremark',
            enableSorting: false,
            cell: (cellProps) => {
                const row = cellProps.row.original;
                const rowId = row.id || row.s_id || row.e_id;
                const cellKey = `${rowId}-s_remind_remark`;
                const initial = row.s_remind_remark ?? row.e_remind_remark ?? '';
                return (
                    <EditableCell
                        value={initial}
                        rowId={rowId}
                        field="s_remind_remark"
                        onCommit={(id, _f, v) => commitRemindRemark(id, v)}
                        cellKey={cellKey}
                        isFocused={focusedCell === cellKey}
                        onFocusCell={(key) => setFocusedCell(prev => (prev === key ? prev : key))}
                        inputType="text"
                    />
                );
            },
        },
        {
            header: 'Action',
            accessorKey: 'action',
            enableSorting: false,
            cell: (cellProps) => {
                const row = cellProps.row.original;
                // Determine type based on date fields to avoid normalized s_id on enquiries
                const isEnquiry = row.type ? row.type === 'enquiry' : (!!row.e_id || (!row.s_date && !!row.e_date));
                const isSchedule = !!row.s_date && !row.e_id;
                // IDs: prefer native ids for each type, avoid cross-assigning
                const enquiryId = isEnquiry ? (row.e_id || row.id) : null;
                const scheduleId = isSchedule ? (row.s_id || row.id) : null;
                return (
                    <div className="d-flex align-items-center gap-2" style={{justifyContent:'center'}}>
                        {isEnquiry && (
                            <button
                                type="button"
                                className="examcode-action-btn"
                                style={{ color: '#2ba8fb', background: '#e6f7ff' }}
                                title="Convert to Schedule"
                                onClick={() => navigate('/client-create', { state: { editId: enquiryId, editType: 'enquiry', forceSchedule: true } })}
                            >
                                <i className="mdi mdi-calendar-arrow-right" style={{ color: '#2ba8fb' }} />
                            </button>
                        )}
                        {isEnquiry && (
                            <button
                                type="button"
                                className="examcode-action-btn edit"
                                title="Edit Enquiry"
                                onClick={() => navigate('/client-create', { state: { editId: enquiryId, editType: 'enquiry' } })}
                            >
                                <i className="mdi mdi-pencil-outline"></i>
                            </button>
                        )}
                        {isSchedule && (
                            <button
                                type="button"
                                className="examcode-action-btn edit"
                                title="Edit Schedule"
                                onClick={() => navigate('/client-create', { state: { editId: scheduleId, editType: 'schedule' } })}
                            >
                                <i className="mdi mdi-pencil-outline"></i>
                            </button>
                        )}
                    </div>
                );
            }
        },
        // {
        //     header: 'Action',
        //     accessorKey: 'action',
        //     enableSorting: false,
        //     cell: (cellProps) => {
        //         const rowId = cellProps.row.original.id;
        //         if (editRowId === rowId) {
        //             return (
        //                 <div>
        //                     <button className="examcode-update-btn" onClick={() => handleEditSave(rowId)} type="button">
        //                         Update
        //                     </button>
        //                     <button className="examcode-cancel-btn" onClick={handleEditCancel} type="button">
        //                         Cancel
        //                     </button>
        //                 </div>
        //             );
        //         }
        //         return (
        //             <button
        //                 type="button"
        //                 className="examcode-action-btn edit"
        //                 title="Edit Remind Date"
        //                 onClick={(e) => {
        //                     e.preventDefault();
        //                     handleEditClick(cellProps.row.original);
        //                 }}
        //             >
        //                 <i className="mdi mdi-pencil-outline"></i>
        //             </button>
        //         );
        //     },
        // }
    );

    return cols;
}, [roleId, sortBy, sortDirection, currentPage, customPageSize, editRowId, editRemindDate, focusedCell]);

    const handlePageSizeChange = (newPageSizeRaw) => {
        // Support 'All' option similar to Schedule page
        if (newPageSizeRaw === 'All') {
            const allSize = 10000;
            setCustomPageSize(allSize);
            setCurrentPage(1);
        } else {
            const newPageSize = Number(newPageSizeRaw) || 100;
            setCustomPageSize(newPageSize);
            setCurrentPage(1);
        }
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    // Inline editable cell component (mirrors Enquiry page behavior)
    const EditableCell = React.memo(({ 
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
            if (!isEditingRef.current) setValue(initialValue);
        }, [initialValue]);

        React.useEffect(() => {
            // Only programmatically focus when requested by parent and not from user click
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

        return (
            <input
                ref={inputRef}
                type={inputType}
                className="form-control form-control-sm reminder-input"
                style = {{maxWidth:'1000px'}}
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={() => { userFocusedRef.current = true; onFocusCell(cellKey); }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') {
                        isEditingRef.current = false;
                        setValue(initialValue);
                        e.currentTarget.blur();
                    }
                }}
            />
        );
    });

    const handleSortChange = (columnId) => {
        setSortBy(columnId);
        setSortDirection(sortBy === columnId && sortDirection === 'asc' ? 'desc' : 'asc');
    };

    // Edit handlers
    const handleEditClick = (row) => {
        setEditRowId(row.id);
        // Set editRemindDate as Date object for react-datepicker
        if (row.s_remind_date) {
            let dateObj = null;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(row.s_remind_date)) {
                const [day, month, year] = row.s_remind_date.split('/');
                dateObj = new Date(Number(year), Number(month) - 1, Number(day));
            } else if (/^\d{4}-\d{2}-\d{2}/.test(row.s_remind_date)) {
                const [year, month, day] = row.s_remind_date.split('-');
                dateObj = new Date(Number(year), Number(month) - 1, Number(day));
            }
            setEditRemindDate(dateObj);
        } else if (row.s_remind_date_ist) {
            // fallback to IST if UTC not present
            let dateObj = null;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(row.s_remind_date_ist)) {
                const [day, month, year] = row.s_remind_date_ist.split('/');
                dateObj = new Date(Number(year), Number(month) - 1, Number(day));
            } else if (/^\d{4}-\d{2}-\d{2}/.test(row.s_remind_date_ist)) {
                const [year, month, day] = row.s_remind_date_ist.split('-');
                dateObj = new Date(Number(year), Number(month) - 1, Number(day));
            }
            setEditRemindDate(dateObj);
        } else {
            setEditRemindDate(null);
        }
    };
    const handleEditCancel = () => {
        setEditRowId(null);
        setEditRemindDate(null);
    };
    const handleEditSave = async (id) => {
        if (!editRemindDate || !(editRemindDate instanceof Date) || isNaN(editRemindDate)) {
            toast.error('Please select remind date');
            return;
        }
        setLoading(true);
        try {
            // Convert to YYYY-MM-DD for API
            const year = editRemindDate.getFullYear();
            const month = String(editRemindDate.getMonth() + 1).padStart(2, '0');
            const day = String(editRemindDate.getDate()).padStart(2, '0');
            const apiDate = `${year}-${month}-${day}`;
            await api.put(`/reminders/${id}`, { remind_date: apiDate });
            toast.success('Remind date updated');
            setEditRowId(null);
            setEditRemindDate(null);
            fetchReminders(currentPage, customPageSize, search, sortBy, sortDirection);
        } catch (err) {
            toast.error('Failed to update remind date');
        }
        setLoading(false);
    };

    const handleClearFilters = () => {
        setFilterAgent('');
        setFilterUser('');
        setFilterGroup('');
        setFilterExamCode('');
        setFilterStartDate(null);
        setFilterEndDate(null);
    };

    return (
        <div className="page-content" style={{ minHeight: '100vh', background: '#fff', padding:'0px',marginTop:'0px', width: '100vw', overflowX: 'hidden',}}>
            <style>{`
                .reminder-header-bar {
                  width: 100vw;
                  background: #fff;
                  box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08);
                  padding: 32px 32px 0 32px;
                  display: flex;
                  flex-direction: column;   
                  align-items: center;
                  gap: 0;
                }
                .reminder-title-text {
                  font-size: 2.1rem;
                  font-weight: 700;
                  color: #1a2942;
                  margin-bottom: 0.5rem;
                  letter-spacing: 0.01em;
                  text-align: left;
                }
                .reminder-title-divider {
                  width: 60px;
                  height: 4px;
                  background: #2ba8fb;
                  border-radius: 2px;
                  margin: 18px 0 0 0;
                  opacity: 0.8;
                }
                .reminder-tablebar {
                  width: 100vw;
                  background: #fff;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 18px 32px 0 32px;
                  margin-bottom: 0;
                  border-radius: 0;
                  box-shadow: none;
                }
                .reminder-table-shadow {
                  box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08);
                  border-radius: 18px;
                  background: #fff;
                }
                .reminder-input {
                  border-radius: 10px !important;
                  border: 1.5px solid #e3e6ef !important;
                  box-shadow: 0 1.5px 8px rgba(44,62,80,0.04);
                  font-size: 1.05rem;
                  padding: 10px 16px;
                  background: #fafdff !important;
                  transition: border-color 0.2s;
                  height: 44px !important;
                  min-width: 220px;
                  max-width: 220px;
                  width: 100%;
                  box-sizing: border-box;
                }
                .examcode-action-btn {
                  border: none;
                  background: #f6f8fa;
                  color: #2ba8fb;
                  border-radius: 50%;
                  width: 38px;
                  height: 38px;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 1.25rem;
                  box-shadow: 0 1.5px 8px rgba(44,62,80,0.04);
                  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
                  margin-right: 4px;
                  position: relative;
                }
                .examcode-action-btn.edit {
                  color: #2ba8fb;
                }
                .examcode-action-btn:hover {
                  background: #e3e6ef;
                  box-shadow: 0 2px 12px rgba(44,62,80,0.10);
                }
                .examcode-action-btn:active {
                  background: #d0e7fa;
                }
                .examcode-action-btn .mdi {
                  margin: 0;
                }
                .examcode-update-btn {
                  background: #2ba8fb;
                  color: #fff;
                  border: none;
                  border-radius: 100px;
                  font-weight: 600;
                  font-size: 1rem;
                  padding: 8px 28px;
                  box-shadow: 0 1.5px 8px rgba(44,62,80,0.04);
                  transition: background 0.2s, box-shadow 0.2s;
                  margin-right: 8px;
                }
                .examcode-update-btn:hover {
                  background: #6fc5ff;
                  box-shadow: 0 0 12px #6fc5ff50;
                }
                .examcode-update-btn:active {
                  background: #3d94cf;
                }
                .examcode-cancel-btn {
                  background: #f6f8fa;
                  color: #1a2942;
                  border: 1.5px solid #e3e6ef;
                  border-radius: 100px;
                  font-weight: 600;
                  font-size: 1rem;
                  padding: 8px 28px;
                  transition: background 0.2s, color 0.2s;
                }
                .examcode-cancel-btn:hover {
                  background: #e3e6ef;
                  color: #2ba8fb;
                }
                .examcode-cancel-btn:active {
                  background: #d0e7fa;
                }
                @media (max-width: 700px) {
                  .reminder-header-bar, .reminder-tablebar, .reminder-filterbar {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 16px;
                  }
                }
            `}</style>
            {/* Header Bar: Title only */}
            {/* <div className="reminder-header-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, justifyContent: 'flex-start' }}>
                </div>
            </div> */}
            {/* Animated show/hide for filter/search sections */}
            <div
                style={{
                    maxHeight: showFullControls ? 800 : 0,
                    opacity: showFullControls ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.5s cubic-bezier(.4,0,.2,1), opacity 0.4s',
                }}
            >
                <div className="reminder-filterbar" style={{ width: '100vw', background: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, padding: '18px 32px 0 32px' }}>
                    <div style={{ fontWeight: 600, fontSize: 18, color: '#1a2942', marginRight: 18 }}>Filter</div>
                        {/* Hide All Agents filter if role_id is 2 or 3 */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                { roleId !== 3 && roleId !== 2  && (
                                    <select
                                        className="reminder-input"
                                        value={filterAgent}
                                        onChange={e => setFilterAgent(e.target.value)}
                                        style={{ minWidth: 180 }}
                                    >
                                        <option value="">All Agents</option>
                                        {agentOptions.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                                        ))}
                                    </select>
                                  )}
                                { roleId !== 3  && (
                                    <select
                                        className="reminder-input"
                                        value={filterUser}
                                        onChange={e => setFilterUser(e.target.value)}
                                        style={{ minWidth: 180 }}
                                    >
                                        <option value="">All Users</option>
                                        {userOptions.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                                        ))}
                                    </select>
                                  )}
                            </div>

                        <select className="reminder-input" value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ minWidth: 180 }}>
                            <option value="">All Groups</option>
                            {groupOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                        </select>
                        <select className="reminder-input" value={filterExamCode} onChange={e => setFilterExamCode(e.target.value)} style={{ minWidth: 180 }}>
                            <option value="">All Exam Codes</option>
                            {examCodeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.ex_code}</option>)}
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
                                    style={{ minWidth: 140 }}
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
                                    style={{ minWidth: 140 }}
                                />
                            </div>
                        </div>
                        {(!!filterAgent || !!filterUser || !!filterGroup || !!filterExamCode || !!filterStartDate || !!filterEndDate) && (
                            <button className="examcode-cancel-btn" onClick={handleClearFilters} type="button">Clear</button>
                        )}
                </div>
                {/* Search + Page Size Controls */}
                <div className="reminder-tablebar">
                    <div>
                        <Label className="me-2 fw-semibold">Page size</Label>
                        <select
                            className="form-select d-inline-block w-auto reminder-input"
                            value={String(customPageSize)}
                            onChange={e => handlePageSizeChange(e.target.value)}
                            style={{ minWidth: 80 }}
                        >
                            <option key={'All'} value={'All'}>All</option>
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
            {/* Search + Page Size Controls */}
            {/* <div className="reminder-tablebar">
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
            </div> */}
            {/* Table Section */}
            <div style={{ padding: '32px 32px 32px 32px', width: '100%', background: '#fff' }}>
                {isLoading ? <Spinners setLoading={setLoading} /> :
                    <Row>
                        <Col xs={12} className="reminder-table-shadow">
                            <TableContainer
                                columns={columns}
                                data={reminders || []}
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
                                sortDirection={sortDirection}
                                noDataComponent={<tr><td colSpan={5} className="text-center">No reminders found</td></tr>}
                            />
                        </Col>
                    </Row>
                }
            </div>
            <ToastContainer />
        </div>
    );
}

export default ReminderList;