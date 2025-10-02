import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  Input,
  FormGroup,
  Label,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
} from "reactstrap";
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import Breadcrumbs from "../../components/Common/Breadcrumb"
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../../helpers/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDateToTimezone } from './moment-timezone';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

const ClientCreate = () => {
  document.title = "Client";
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [examCodeOptions, setExamCodeOptions] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [submitType, setSubmitType] = useState('');
  const [formType, setFormType] = useState('schedule');
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');
  const [checkReason, setCheckReason] = useState('');
  const [pendingSubmitValues, setPendingSubmitValues] = useState(null);
  const [ISTDisplay, setISTDisplay] = useState('');
  const [startDate, setstartDate] = useState(null);

  useEffect(() => {
    api.get('/enquiries/filter-managed-data').then(res => {
      setAgents(res.data.agents || []);
      setUsers(res.data.users || []);
      // Auto-select agent if not already set and only one agent or roleId is 2
      if (!validation.values.agent && res.data.agents && res.data.agents.length === 1) {
        validation.setFieldValue('agent', res.data.agents[0].id);
      } else if (!validation.values.agent && res.roleId === 2 && res.data.agents && res.data.agents.length > 0) {
        validation.setFieldValue('agent', res.data.agents[0].id);
      }
      // Auto-select user if not already set and only one user or roleId is 3
      if (!validation.values.user && res.data.users && res.data.users.length === 1) {
        validation.setFieldValue('user', res.data.users[0].id);
      } else if (!validation.values.user && res.roleId === 3 && res.data.users && res.data.users.length > 0) {
        validation.setFieldValue('user', res.data.users[0].id);
      }
    });
    api.get('/timezone/get-full-timezones').then(res => {
      setTimezones(res.data || []);
    });
    api.get('/examcodes', { params: { pageSize: 100 } }).then(res => {
      const options = Array.isArray(res.data.data)
        ? res.data.data.map(ec => ({ value: ec.id, label: ec.ex_code }))
        : [];
      setExamCodeOptions(options);
    });
  }, []);

  const validation = useFormik({
    initialValues: {
      group_name: '',
      exam_code: '',
      date: '',
      support_fee: '',
      voucher_fee: '',
      total_fee: '',
      email: '',
      phone: '',
      agent: '',
      user: '',
      timezone: '',
      location: '',
      comment: '',
      remind_date: '',
      remind_remark: '',
    },
    validationSchema: Yup.object({
      agent: Yup.string().required('Agent is required'),
      user: Yup.string().required('User is required'),
      timezone: Yup.string().when([], {
        is: () => formType === 'schedule',
        then: schema => schema.required('Timezone is required'),
        otherwise: schema => schema.notRequired()
      }),
      group_name: Yup.string().required('Group name is required'),
      exam_code: Yup.string().required('Exam code is required'),
      date: Yup.mixed().when([], {
        is: () => formType === 'schedule',
        then: schema => schema.required('Date is required').test('is-date', 'Date is required', val => !!val),
        otherwise: schema => schema.notRequired()
      }),
      support_fee: Yup.number()
        .typeError('Support fee must be a number')
        .min(0, 'Support fee cannot be negative'),
      voucher_fee: Yup.number()
        .typeError('Voucher fee must be a number')
        .min(0, 'Voucher fee cannot be negative'),
      email: Yup.string().email('Invalid email'),
      phone: Yup.string()
        .matches(/^[+]?\d{10,15}$/, 'Invalid phone number')
    }),
    onSubmit: async (values) => {
      try {
        let exam_code_id = '';
        let exam_code_text = '';
        // Find selected exam code option
        const selectedOption = examCodeOptions.find(opt => opt.value === values.exam_code || opt.label === values.exam_code);
        if (selectedOption) {
          exam_code_id = selectedOption.value;
          exam_code_text = selectedOption.label;
        } else if (values.exam_code) {
          // Check if exam code exists
          const checkRes = await api.get('/examcodes', { params: { search: values.exam_code } });
          const found = Array.isArray(checkRes.data.data) && checkRes.data.data.find(e => e.ex_code === values.exam_code);
          if (found) {
            exam_code_id = found.id;
            exam_code_text = found.ex_code;
          } else {
            // Create new exam code and get its ID
            const createRes = await api.post('/examcodes', { exam_code: values.exam_code });
            if (createRes.data && createRes.data.id) {
              exam_code_id = createRes.data.id;
              exam_code_text = values.exam_code;
            } else if (createRes.data && createRes.data.data && createRes.data.data.id) {
              exam_code_id = createRes.data.data.id;
              exam_code_text = values.exam_code;
            }
          }
        }
        // Prepare payload with exam_code_id
        const payload = { ...values, exam_code_id, exam_code: exam_code_text };
        if (location.state?.editType === 'enquiry' && formType === 'schedule') {
          await api.post('/schedule', payload);
          await api.delete(`/enquiries/${location.state.editId}`);
          navigate('/schedule');
        } else if (!location.state?.editType && formType === 'enquiry') {
          try {
            const res = await api.post('/enquiries', payload);
            navigate('/enquiry', { state: { created: true } });
          } catch (err) {
            alert('Failed to save enquiry: ' + (err?.message || 'Unknown error'));
          }
        } else if (!location.state?.editType && formType === 'schedule') {
          await api.post('/schedule', payload);
          navigate('/schedule');
        } else if (location.state?.editType === 'schedule') {
          await api.post('/schedule', payload);
          navigate('/schedule');
        }
      } catch (err) {
        alert('Error: ' + (err?.message || 'Unknown error'));
      }
      return;
    },
  });

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    // Always call enquiry API if formType is 'enquiry'
    if (formType === 'enquiry') {
      validation.handleSubmit();
      return;
    }
    // ...existing code for schedule...
    let checkDate = validation.values.date;
    if (formType === 'schedule' && validation.values.date) {
      const localDate = new Date(validation.values.date);
      const yyyy = localDate.getFullYear();
      const mm = String(localDate.getMonth() + 1).padStart(2, '0');
      const dd = String(localDate.getDate()).padStart(2, '0');
      const hh = String(localDate.getHours()).padStart(2, '0');
      const min = String(localDate.getMinutes()).padStart(2, '0');
      const ss = String(localDate.getSeconds()).padStart(2, '0');
      checkDate = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    }
    if (formType === 'schedule' && validation.values.date && validation.values.timezone) {
      try {
        const checkRes = await api.post('/schedule/check-office-time', {
          date: checkDate,
          timezone: validation.values.timezone
        });
        if (checkRes.data && checkRes.data.warning) {
          const localDate = new Date(validation.values.date);
          const dd = String(localDate.getDate()).padStart(2, '0');
          const mm = String(localDate.getMonth() + 1).padStart(2, '0');
          const yyyy = localDate.getFullYear();
          let hours = localDate.getHours();
          const minutes = String(localDate.getMinutes()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const timeStr = `${hours}:${minutes} ${ampm}`;
          const formattedDisplayDate = `${dd}/${mm}/${yyyy} ${timeStr}`;
          let formattedIST = '';
          if (checkRes.data.ist) {
            formattedIST = checkRes.data.ist;
          } else {
            const istDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            const ist_dd = String(istDate.getDate()).padStart(2, '0');
            const ist_mm = String(istDate.getMonth() + 1).padStart(2, '0');
            const ist_yyyy = istDate.getFullYear();
            let ist_hours = istDate.getHours();
            const ist_minutes = String(istDate.getMinutes()).padStart(2, '0');
            const ist_ampm = ist_hours >= 12 ? 'PM' : 'AM';
            ist_hours = ist_hours % 12;
            ist_hours = ist_hours ? ist_hours : 12;
            formattedIST = `${ist_dd}/${ist_mm}/${ist_yyyy} ${ist_hours}:${ist_minutes} ${ist_ampm}`;
          }
          let message = checkRes.data.warning.replace(/\(.*?\)/, `(${formattedDisplayDate})`);
          setCheckMessage(message);
          setCheckReason(checkRes.data.reason || '');
          setPendingSubmitValues({ ...validation.values });
          setShowCheckModal(true);
          setISTDisplay(formattedIST);
          return;
        }
      } catch (err) {}
    }
    if (formType === 'schedule' && validation.values.date) {
      const localDate = new Date(validation.values.date);
      const yyyy = localDate.getFullYear();
      const mm = String(localDate.getMonth() + 1).padStart(2, '0');
      const dd = String(localDate.getDate()).padStart(2, '0');
      const hh = String(localDate.getHours()).padStart(2, '0');
      const min = String(localDate.getMinutes()).padStart(2, '0');
      const ss = String(localDate.getSeconds()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
      validation.setFieldValue('date', formattedDate, false);
    }
    validation.handleSubmit();
  };

  const handleCheckModalOk = async () => {
    setShowCheckModal(false);
    if (pendingSubmitValues) {
      if (formType === 'schedule' && pendingSubmitValues.date) {
        const localDate = new Date(pendingSubmitValues.date);
        const yyyy = localDate.getFullYear();
        const mm = String(localDate.getMonth() + 1).padStart(2, '0');
        const dd = String(localDate.getDate()).padStart(2, '0');
        const hh = String(localDate.getHours()).padStart(2, '0');
        const min = String(localDate.getMinutes()).padStart(2, '0');
        const ss = String(localDate.getSeconds()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
        validation.setFieldValue('date', formattedDate, false);
      }
      validation.handleSubmit();
      setPendingSubmitValues(null);
    }
  };
  const handleCheckModalCancel = () => {
    setShowCheckModal(false);
    setPendingSubmitValues(null);
  };

  useEffect(() => {
    const s = parseFloat(validation.values.support_fee) || 0;
    const v = parseFloat(validation.values.voucher_fee) || 0;
    const total = s + v ? (s + v).toString() : '';
    validation.setFieldValue('total_fee', total);
  }, [validation.values.support_fee, validation.values.voucher_fee]);

  const timezoneOptions = Array.isArray(timezones)
    ? timezones.map(tz => ({
        value: tz.area || tz.id,
        label: tz.area + (tz.offset ? ` (${tz.offset})` : '')
      }))
    : [];

  const customSelectStyles = {
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? 'rgb(2, 113, 185)'
        : state.isFocused
        ? 'rgba(2, 113, 185, 0.1)'
        : undefined,
      color: state.isSelected ? 'white' : 'black',
    }),
    control: (provided) => ({
      ...provided,
      borderColor: 'rgb(2, 113, 185)',
      boxShadow: 'none',
      '&:hover': { borderColor: 'rgb(2, 113, 185)' },
    }),
  };

  useEffect(() => {
    if (formType === 'enquiry') {
      validation.setFieldValue('date', '', false);
      validation.setFieldValue('timezone', '', false);
    }
  }, [formType]);

  useEffect(() => {
    async function fetchAndPopulate() {
      if (location.state && location.state.editType && location.state.editId) {
        let apiUrl = '';
        if (location.state.editType === 'schedule') {
          apiUrl = `/schedule/${location.state.editId}`;
        } else if (location.state.editType === 'enquiry') {
          apiUrl = `/enquiries/${location.state.editId}`;
        }
        if (apiUrl) {
          try {
            const res = await api.get(apiUrl);
            const data = res.data;
            if (location.state.editType === 'schedule') {
              let dateValue = '';
              let timezone = '';
              if (data.s_date) {
                dateValue = data.s_date;
                timezone = data.s_area || data.timezone || '';
                if (dateValue && timezone) {
                  try {
                    const utcDate = new Date(dateValue.replace(' ', 'T') + 'Z');
                    const tzDateStr = utcDate.toLocaleString('en-US', { timeZone: timezone });
                    const tzDate = new Date(tzDateStr);
                    dateValue = tzDate;
                  } catch (e) {
                    dateValue = new Date(dateValue.replace(' ', 'T'));
                  }
                } else if (dateValue) {
                  dateValue = new Date(dateValue.replace(' ', 'T'));
                }
              }
              validation.setValues({
                group_name: data.s_group_name || '',
                exam_code: data.s_exam_code || '',
                date: dateValue,
                support_fee: data.s_support_fee || '',
                voucher_fee: data.s_voucher_fee || '',
                total_fee: data.total_fee || '',
                email: data.s_email || '',
                phone: data.s_phone || '',
                agent: data.s_agent_id || '',
                user: data.s_user_id || '',
                timezone: timezone,
                location: data.s_location || '',
                comment: data.s_comment || '',
                remind_date: data.s_remind_date || '',
                remind_remark: data.s_remind_remark || '',
              });
              setFormType('schedule');
            } else if (location.state.editType === 'enquiry') {
              validation.setValues({
                group_name: data.e_group_name || '',
                exam_code: data.e_exam_code || '',
                date: '',
                support_fee: data.e_support_fee || '',
                voucher_fee: data.e_voucher_fee || '',
                total_fee: data.total_fee || '',
                email: data.e_email || '',
                phone: data.e_phone || '',
                agent: data.e_agent_id || '',
                user: data.e_user_id || '',
                timezone: '',
                location: data.e_location || '',
                comment: data.e_comment || '',
                remind_date: data.e_remind_date || '',
                remind_remark: data.e_remind_remark || '',
              });
              setFormType('schedule');
            }
          } catch (err) {}
        }
      }
    }
    fetchAndPopulate();
  }, []);

  return (
    <>
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
                @media (max-width: 700px) { .reminder-header-bar, .reminder-tablebar, .reminder-filterbar { flex-direction: column; align-items: stretch; gap: 16px; } }
            `}</style>
      <div className="client-create-center-container">
        <div className="client-create-card">
          <div className="page-content" style={{marginTop:"63px",paddingBottom:"0px"}}>
            <Row className="justify-content-center">
              <Col lg="10" className="mx-auto" style={{width:"100%"}}>
                <Card className="shadow rounded border-0">
                  <CardBody>
                    <h2 className="fw-bold text-center" style={{color: '#232b46'}}>Client Create</h2>
                    <div className="mx-auto mb-4" style={{width: 70, height: 4, background: '#22a6f7', borderRadius: 2}}></div>
                    <form className="container" onSubmit={handleFormSubmit} autoComplete="off">
                      {/* Type & Support Fee */}
                      <div className="row">
                        <div className="col-md-8 col-12">
                            <div>
                              <label className="col-form-label fw-semibold form-label text-start">
                                Type <span style={{ color: 'red' }}>*</span>
                              </label>
                              <select className="form-control rounded-pill px-3 py-2 reminder-input" value={formType} onChange={e => setFormType(e.target.value)}>
                                <option value="schedule">Schedule</option>
                                 {!(location.state && location.state.editType) && (
                                   <option value="enquiry">Enquiry</option>
                                 )}
                              </select>
                            </div>
                        </div>
                        <div className="col-md-4 col-12">
                          <label htmlFor="support_fee" className="col-form-label fw-semibold form-label text-start">Support fee</label>
                          <Input
                            id="support_fee"
                            name="support_fee"
                            type="number"
                            className="form-control rounded-pill px-3 py-2 reminder-input"
                            placeholder="Enter support fee..."
                            value={validation.values.support_fee}
                            onChange={validation.handleChange}
                            onBlur={validation.handleBlur}
                            invalid={validation.touched.support_fee && !!validation.errors.support_fee}
                          />
                          {validation.touched.support_fee && validation.errors.support_fee && (
                            <div className="text-danger small mt-1">{validation.errors.support_fee}</div>
                          )}
                        </div>
                      </div>
                      {/* Agent & Voucher Fee */}
                      <div className="row">
                        <div className="col-md-8 col-12">
                          <label htmlFor="agent" className="col-form-label fw-semibold form-label text-start">Agent <span style={{ color: 'red' }}>*</span></label>
                          <select className="form-control rounded-pill px-3 py-2 reminder-input" value={validation.values.agent} onChange={e => validation.setFieldValue('agent', e.target.value)}>
                            {agents.length !== 1 && <option value="">Select Agent</option>}
                            {agents.map(agent => (
                              <option key={agent.id} value={agent.id}>{agent.name}</option>
                            ))}
                          </select>
                          {validation.touched.agent && validation.errors.agent && (
                            <div className="text-danger small mt-1">{validation.errors.agent}</div>
                          )}
                        </div>
                        <div className="col-md-4 col-12">
                          <label htmlFor="voucher_fee" className="col-form-label fw-semibold form-label text-start">Voucher fee</label>
                          <Input
                            id="voucher_fee"
                            name="voucher_fee"
                            type="number"
                            className="form-control rounded-pill px-3 py-2 reminder-input"
                            placeholder="Enter voucher fee..."
                            value={validation.values.voucher_fee}
                            onChange={validation.handleChange}
                            onBlur={validation.handleBlur}
                            invalid={validation.touched.voucher_fee && !!validation.errors.voucher_fee}
                          />
                          {validation.touched.voucher_fee && validation.errors.voucher_fee && (
                            <div className="text-danger small mt-1">{validation.errors.voucher_fee}</div>
                          )}
                        </div>
                      </div>
                      {/* User & Total Fee */}
                      <div className="row">
                        <div className="col-md-8 col-12">
                          <label htmlFor="user" className="col-form-label fw-semibold form-label text-start">User <span style={{ color: 'red' }}>*</span></label>
                          <select className="form-control rounded-pill px-3 py-2 reminder-input" value={validation.values.user} onChange={e => validation.setFieldValue('user', e.target.value)}>
                            {users.length !== 1 && <option value="">Select Agent</option>}
                            {users.map(user => (
                              <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                          </select>
                          {validation.touched.user && validation.errors.user && (
                            <div className="text-danger small mt-1">{validation.errors.user}</div>
                          )}
                        </div>
                        <div className="col-md-4 col-12">
                          <label htmlFor="total_fee" className="col-form-label fw-semibold form-label text-start">Total Fee</label>
                          <Input
                            id="total_fee"
                            name="total_fee"
                            type="number"
                            className="form-control rounded-pill px-3 py-2 reminder-input"
                            placeholder="Enter total fee..."
                            value={validation.values.total_fee}
                            readOnly
                            onBlur={validation.handleBlur}
                            invalid={validation.touched.total_fee && !!validation.errors.total_fee}
                          />
                          {validation.touched.total_fee && validation.errors.total_fee && (
                            <div className="text-danger small mt-1">{validation.errors.total_fee}</div>
                          )}
                        </div>
                      </div>
                      {/* Group Name & Comment */}
                      <div className="row">
                        <div className="col-md-8 col-12">
                          <label htmlFor="group_name" className="col-form-label fw-semibold form-label text-start">Group Name <span style={{ color: 'red' }}>*</span></label>
                          <Input
                            id="group_name"
                            name="group_name"
                            type="text"
                            className="form-control rounded-pill px-3 py-2 reminder-input"
                            placeholder="Enter group name..."
                            value={validation.values.group_name}
                            onChange={validation.handleChange}
                            onBlur={validation.handleBlur}
                            invalid={validation.touched.group_name && !!validation.errors.group_name}
                          />
                          {validation.touched.group_name && validation.errors.group_name && (
                            <div className="text-danger small mt-1">{validation.errors.group_name}</div>
                          )}
                        </div>
                        <div className="col-md-4 col-12">
                          <label htmlFor="comment" className="col-form-label fw-semibold form-label text-start">Comment</label>
                          <Input
                            id="comment"
                            name="comment"
                            type="text"
                            className="form-control rounded-pill px-3 py-2 reminder-input"
                            placeholder="Enter comment..."
                            value={validation.values.comment}
                            onChange={validation.handleChange}
                          />
                        </div>
                      </div>
                      {/* Exam Code & Phone */}
                      <div className="row">
                        <div className="col-md-8 col-12">
                          <label htmlFor="exam_code" className="col-form-label fw-semibold form-label text-start">Exam code <span style={{ color: 'red' }}>*</span></label>
                          <CreatableSelect
                            id="exam_code"
                            name="exam_code"
                            options={examCodeOptions}
                            value={examCodeOptions.find(opt => opt.value === validation.values.exam_code) || (validation.values.exam_code ? { value: validation.values.exam_code, label: validation.values.exam_code } : null)}
                            onChange={opt => {
                              validation.setFieldValue('exam_code', opt ? opt.value : '');
                            }}
                            isClearable
                            placeholder="Select or type exam code..."
                            styles={{...customSelectStyles, container: base => ({...base, maxWidth: 350})}}
                            isSearchable
                            classNamePrefix="react-select"
                          />
                          {validation.touched.exam_code && validation.errors.exam_code && (
                            <div className="text-danger small mt-1">{validation.errors.exam_code}</div>
                          )}
                        </div>
                        <div className="col-md-4 col-12">
                          <label htmlFor="phone" className="col-form-label fw-semibold form-label text-start">Phone</label>
                          <Input
                            id="phone"
                            name="phone"
                            type="text"
                            className="form-control rounded-pill px-3 py-2 reminder-input"
                            placeholder="Enter phone..."
                            value={validation.values.phone}
                            onChange={validation.handleChange}
                            onBlur={validation.handleBlur}
                            onKeyDown={e => !(/[0-9]/.test(e.key) || (e.key === '+' && e.currentTarget.selectionStart === 0 && !e.currentTarget.value.includes('+')) || ['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key) || e.ctrlKey) && e.preventDefault()}
                            onPaste={e => !/^\+?[0-9]*$/.test(e.clipboardData.getData("text")) && e.preventDefault()}                              invalid={validation.touched.phone && !!validation.errors.phone}
                          />
                          {validation.touched.phone && validation.errors.phone && (
                            <div className="text-danger small mt-1">{validation.errors.phone}</div>
                          )}
                        </div>
                      </div>
                      {/* Timezone & Email */}
                        <div className="row">
                      {(location.state?.editType || formType === 'schedule') ? (
                          <div className="col-md-8 col-12">
                            <label htmlFor="timezone" className="col-form-label fw-semibold form-label text-start">Timezone <span style={{ color: 'red' }}>*</span></label>
                            <Select
                              id="timezone"
                              name="timezone"
                              options={timezoneOptions}
                              value={timezoneOptions.find(opt => opt.value === validation.values.timezone) || null}
                              onChange={opt => validation.setFieldValue('timezone', opt ? opt.value : '')}
                              isClearable
                              placeholder="Select or search timezone..."
                              styles={{...customSelectStyles, container: base => ({...base, maxWidth: 350})}}
                              classNamePrefix="react-select"
                            />
                            {validation.touched.timezone && validation.errors.timezone && (
                              <div className="text-danger small mt-1">{validation.errors.timezone}</div>
                            )}
                          </div>
                      ) : <div className="col-md-8 col-12"></div>}
                          <div className="col-md-4 col-12">
                            <label htmlFor="email" className="col-form-label fw-semibold form-label text-start">Email</label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              className="form-control rounded-pill px-3 py-2 reminder-input"
                              placeholder="Enter email..."
                              value={validation.values.email}
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              invalid={validation.touched.email && !!validation.errors.email}
                            />
                            {validation.touched.email && validation.errors.email && (
                              <div className="text-danger small mt-1">{validation.errors.email}</div>
                            )}
                          </div>
                        </div>
                      {/* Date & Remind Remark */}
                      <div className="row">
                      {(location.state?.editType || formType === 'schedule') ? (
                        <div className="col-md-8 col-12">
                          <label className="col-form-label fw-semibold form-label text-start">Date <span style={{ color: 'red' }}>*</span></label>
                          <DatePicker
                            className="form-control rounded-pill px-3 py-2 reminder-input"
                            selected={validation.values.date || null}
                            onChange={date => {
                              setstartDate(date);
                              validation.setFieldValue('date', date);
                            }}
                            onBlur={validation.handleBlur}
                            dateFormat="dd/MM/yyyy h:mm aa"
                            showTimeSelect
                            timeFormat="HH:mm"
                            placeholderText="Select date and time..."
                          />
                          {validation.touched.date && validation.errors.date && (
                            <div className="text-danger small mt-1">{validation.errors.date}</div>
                          )}
                        </div>
                      ) : <div className="col-md-8 col-12"></div>}
                        <div className="col-md-4 col-12">
                          <label htmlFor="remind_remark" className="col-form-label fw-semibold form-label text-start">Remind remark</label>
                          <Input
                            id="remind_remark"
                            name="remind_remark"
                            type="text"
                            className="form-control rounded-pill px-3 py-2 reminder-input"
                            placeholder="Enter remind remark..."
                            value={validation.values.remind_remark}
                            onChange={validation.handleChange}
                          />
                        </div>
                      </div>
                      <div className="row justify-content-center mt-4">
                        <div className="col-lg-4">
                          {location.state && location.state.editType && (
                            <Button type="submit" className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm">
                              Save Schedule
                            </Button>
                          )}
                          {!location.state?.editType && formType === 'schedule' && (
                            <Button type="submit" className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm">
                              Save Schedule
                            </Button>
                          )}
                          {!location.state?.editType && formType === 'enquiry' && (
                            <Button type="submit" className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm">
                              Save Enquiry
                            </Button>
                          )}
                        </div>
                      </div>
                    </form>
                    {/* Modal remains unchanged */}
                    {showCheckModal && (
                      <div className="examcode-modal-backdrop" style={{zIndex: 2000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(44,62,80,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <div className="examcode-modal" style={{minWidth: 340, maxWidth: '90vw', borderRadius: 18, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '24px 32px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                          <div className="examcode-modal-icon" style={{fontSize: 48, color: '#ffb300', marginBottom: 12}}>
                            <i className="mdi mdi-alert-outline"></i>
                          </div>
                          <div className="examcode-modal-title" style={{fontWeight: 700, fontSize: 22, color: '#1a2942', marginBottom: 8}}>Warning</div>
                          <div className="examcode-modal-message" style={{fontSize: 16, color: '#1a2942', marginBottom: 12, textAlign: 'center'}}>{checkMessage}</div>
                          {checkReason && (
                            <div className="mb-2"><b>Reason:</b> {checkReason}</div>
                          )}
                          {ISTDisplay && (
                            <div className="mb-2"><b>Indian Time:</b> {ISTDisplay}</div>
                          )}
                          <div className="mb-3">Do you want to proceed anyway?</div>
                          <div className="examcode-modal-btns" style={{display: 'flex', gap: 16}}>
                            <button className="examcode-save-btn" style={{background:'#2ba8fb', color:'#fff', border:'none', borderRadius:100, fontWeight:600, fontSize:'1rem', padding:'8px 28px'}} onClick={handleCheckModalOk} type="button">OK</button>
                            <button className="examcode-cancel-btn" onClick={handleCheckModalCancel} type="button">Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      </div>
    </>
  )
}

export default ClientCreate
