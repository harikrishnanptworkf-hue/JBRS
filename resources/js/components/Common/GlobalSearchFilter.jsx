import React from 'react';
import { Col } from 'reactstrap';
import { format } from 'date-fns';

//Date Picker
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';

const JobListGlobalFilter = ({ setGlobalFilter, users = [], agents = [], selectedUser, setSelectedUser, selectedAgent, setSelectedAgent, startDate, setStartDate, endDate, setEndDate, selectedStatus, setSelectedStatus }) => {

    const handleAgentChange = (e) => {
        setSelectedAgent && setSelectedAgent(e.target.value);
    };
    const handleUserChange = (e) => {
        setSelectedUser && setSelectedUser(e.target.value);
    };
    const handleStartDateChange = (date) => {
        setStartDate && setStartDate(date ? format(date, 'yyyy-MM-dd') : '');
    };
    const handleEndDateChange = (date) => {
        setEndDate && setEndDate(date ? format(date, 'yyyy-MM-dd') : '');
    };

    const handleSelectStatus = (ele) => {
        const selectedValue = ele.value;
        setGlobalFilter(selectedValue === 'all' ? '' : selectedValue);
    };

    return (
        <React.Fragment>
            <div className="mb-3">
                <div className="row gx-1 gy-2 align-items-center flex-nowrap" style={{ minWidth: '1200px' }}>
                    <div className="col-md-2 d-flex align-items-baseline" style={{ minWidth: '200px' }}>
                        <DatePicker
                            placeholderText='Start Date'
                            className="form-control"
                            selected={startDate ? new Date(startDate) : null}
                            onChange={handleStartDateChange}
                            dateFormat="dd/MM/yyyy"
                            isClearable
                            style={{ height: '38px' }}
                        />
                    </div>
                    <div className="col-md-2 d-flex align-items-baseline" style={{ minWidth: '200px' }}>
                        <DatePicker
                            placeholderText='End Date'
                            className="form-control"
                            selected={endDate ? new Date(endDate) : null}
                            onChange={handleEndDateChange}
                            dateFormat="dd/MM/yyyy"
                            isClearable
                            style={{ height: '38px' }}
                        />
                    </div>
                    <div className="col-md-2 d-flex align-items-baseline" style={{ minWidth: '200px' }}>
                        <Select
                            id="agent"
                            name="agent"
                            options={agents.map(agent => ({ value: agent.id, label: agent.name }))}
                            value={agents.map(agent => ({ value: agent.id, label: agent.name })).find(opt => opt.value === selectedAgent) || null}
                            onChange={opt => setSelectedAgent(opt ? opt.value : '')}
                            isClearable
                            placeholder="Select agent..."
                            styles={{ container: (base) => ({ ...base, width: '100%' }), control: (base) => ({ ...base, minHeight: '38px', height: '38px' }) }}
                        />
                    </div>
                    <div className="col-md-2 d-flex align-items-baseline" style={{ minWidth: '200px' }}>
                        <Select
                            id="user"
                            name="user"
                            options={users.map(user => ({ value: user.id, label: user.name }))}
                            value={users.map(user => ({ value: user.id, label: user.name })).find(opt => opt.value === selectedUser) || null}
                            onChange={opt => setSelectedUser(opt ? opt.value : '')}
                            isClearable
                            placeholder="Select user..."
                            styles={{ container: (base) => ({ ...base, width: '100%' }), control: (base) => ({ ...base, minHeight: '38px', height: '38px' }) }}
                        />
                    </div>
                    <div className="col-md-2 d-flex align-items-baseline" style={{ minWidth: '200px' }}>
                        <Select
                            id="exam_code"
                            name="exam_code"
                            options={[]}
                            onChange={opt => setGlobalFilter(opt ? opt.value : '')}
                            isClearable
                            placeholder="Select exam code..."
                            styles={{ container: (base) => ({ ...base, width: '100%' }), control: (base) => ({ ...base, minHeight: '38px', height: '38px' }) }}
                        />
                    </div>
                    <div className="col-md-2 d-flex align-items-center" style={{ minWidth: '200px' }}>
                        <select
                            id="status"
                            name="status"
                            className="form-select reminder-input"
                            style={{ minHeight: '38px', height: '38px', width: '100%', fontSize: '1rem' }}
                            value={selectedStatus || ''}
                            onChange={e => {
                                setSelectedStatus(e.target.value);
                                setGlobalFilter(e.target.value);
                            }}
                        >
                            <option value="">Select status...</option>
                            <option value="TAKEN">TAKEN</option>
                            <option value="REVOKE">REVOKE</option>
                            <option value="DONE">DONE</option>
                            <option value="RESCHEDULE">RESCHEDULE</option>
                        </select>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
};
export default JobListGlobalFilter;

