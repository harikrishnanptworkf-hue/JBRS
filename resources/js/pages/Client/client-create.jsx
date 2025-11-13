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
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

function formatDateToYMDHMS(date) {
  if (!date) return '';
  let d = date;
  if (typeof d === 'string') {
    // If already in correct format, return as is
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(d)) return d;
    // If ISO string, convert to Date
    d = new Date(d);
  }
  if (!(d instanceof Date) || isNaN(d)) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

const ClientCreate = () => {
  document.title = "Client";
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [examCodeOptions, setExamCodeOptions] = useState([]);
  const [accounts, setAccounts] = useState([]);
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
  const [pendingAccountHolder, setPendingAccountHolder] = useState('');
  // Invoice generate confirmation modal state
  const [showInvoiceConfirm, setShowInvoiceConfirm] = useState(false);
  // Inline error state for invoice actions instead of alert popups
  const [invoiceGeneralError, setInvoiceGeneralError] = useState('');

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
      const isEdit = location.state && location.state.editId;
      if (!isEdit && !validation.values.timezone && Array.isArray(res.data)) {
        const kolkata = res.data.find(tz => tz.area && tz.area.toLowerCase() === 'asia/kolkata');
        if (kolkata) {
          validation.setFieldValue('timezone', kolkata.area);
        }
      }
    });
      api.get('/examcodes', { params: { pageSize: 'All' } }).then(res => {
      const options = Array.isArray(res.data.data)
        ? res.data.data.map(ec => ({ value: ec.id, label: ec.ex_code }))
        : [];
      setExamCodeOptions(options);
    });
    // Try to load accounts for the Account select (optional, non-blocking)
    api.get('/accounts', { params: { pageSize: 100 } }).then(res => {
      const list = (res?.data?.data || res?.data || [])
      setAccounts(Array.isArray(list) ? list : []);
    }).catch(() => setAccounts([]));
  }, []);

  // If we have a pending account holder name from record load, try to preselect matching account once accounts are available
  useEffect(() => {
    if (!pendingAccountHolder || !Array.isArray(accounts) || accounts.length === 0) return;
    // Only set if account field is not already set
    if (validation.values.account) return;
    const holder = String(pendingAccountHolder).trim().toLowerCase();
    const match = accounts.find(acc => {
      const nameFields = [acc?.account_name, acc?.name, acc?.title, acc?.label];
      return nameFields.some(n => n && String(n).trim().toLowerCase() === holder);
    });
    if (match && (match.id ?? match.value)) {
      validation.setFieldValue('account', String(match.id ?? match.value));
      setPendingAccountHolder('');
    }
  }, [accounts, pendingAccountHolder]);

  // Fetch users for selected agent
  const handleAgentChange = async (e) => {
    const agentId = e.target.value;
    validation.setFieldValue('agent', agentId);
    validation.setFieldValue('user', ''); // Reset user selection
    if (agentId) {
      try {
        const res = await api.get(`/agents/${agentId}/users`);
        const userList = res.data.data || [];
        setUsers(userList);
        if (userList.length === 1) {
          validation.setFieldValue('user', userList[0].id);
          // Do NOT setTouched here; only set on submit
        }
      } catch {
        setUsers([]);
      }
    } else {
      setUsers([]);
    }
  };

  const validation = useFormik({
    initialValues: {
      group_name: '',
      bill_to: '',
      exam_name: '',
      exam_code: '',
      date: '',
      support_fee: '',
      voucher_fee: '',
      total_fee: '',
      amount: '',
      email: '',
      phone: '',
      agent: '',
      user: '',
      account: '',
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
  bill_to: Yup.string().when([], { is: () => location.state?.from === 'invoice', then: s => s.required('Bill to is required'), otherwise: s => s.notRequired() }),
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
      amount: Yup.number()
        .typeError('Amount must be a number')
        .min(0, 'Amount cannot be negative')
        .nullable(true),
      email: Yup.string().email('Invalid email'),
      phone: Yup.string()
        .matches(/^[+]?\d{10,15}$/, 'Invalid phone number')
    }),
    onSubmit: async (values) => {
      try {
        const formattedDate = formatDateToYMDHMS(values.date);
        const redirectToInvoicePending = () => {
          // Prefer query param (more universal), also pass state for pages reading from state
          navigate('/invoice?tab=pending', { state: { activeTab: 'pending' } });
        };

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
        // Prepare payload with normalized date and exam_code_id
        const payload = { ...values, date: formattedDate, exam_code_id, exam_code: exam_code_text };
        if (location.state?.editType === 'enquiry' && formType === 'schedule') {
          await api.post('/schedule', payload);
          await api.delete(`/enquiries/${location.state.editId}`);
          if (location.state?.from === 'invoice') {
            redirectToInvoicePending();
          } else {
            navigate('/schedule');
          }
        } else if (!location.state?.editType && formType === 'enquiry') {
          try {
            const res = await api.post('/enquiries', payload);
            navigate('/enquiry', { state: { created: true } });
          } catch (err) {
            alert('Failed to save enquiry: ' + (err?.message || 'Unknown error'));
          }
        } else if (!location.state?.editType && formType === 'schedule') {
          await api.post('/schedule', payload);
          if (location.state?.from === 'invoice') {
            redirectToInvoicePending();
          } else {
            navigate('/schedule');
          }
        } else if (location.state?.editType === 'schedule') {
          // Use PUT to update existing schedule instead of POST
          await api.put(`/schedule/${location.state.editId}`, payload);
          if (location.state?.from === 'invoice') {
            redirectToInvoicePending();
          } else {
            navigate('/schedule');
          }
        }
      } catch (err) {
        alert('Error: ' + (err?.message || 'Unknown error'));
      }
      return;
    },
  });

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    // Mark user as touched so error only shows after submit
    validation.setTouched({ ...validation.touched, user: true });
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

  // Invoice actions
  const handleInvoiceGenerate = async () => {
    try {
      // Client-side guards for invoice context
      if (location.state?.from === 'invoice') {
        const amountVal = parseFloat(validation.values.amount);
        setInvoiceGeneralError('');
        let blocked = false;
        if (!validation.values.exam_name || String(validation.values.exam_name).trim() === '') {
          validation.setFieldTouched('exam_name', true, false);
          validation.setFieldError('exam_name', 'Exam name is required');
          blocked = true;
        }
        if (!validation.values.bill_to || String(validation.values.bill_to).trim() === '') {
          validation.setFieldTouched('bill_to', true, false);
          validation.setFieldError('bill_to', 'Bill to is required');
          blocked = true;
        }
        if (isNaN(amountVal) || amountVal <= 0) {
          validation.setFieldTouched('amount', true, false);
          validation.setFieldError('amount', 'Amount must be greater than 0');
          blocked = true;
        }
        // Account optional: backend will use default if missing
        if (blocked) {
          // Field-specific errors already set; no generic banner needed
          return;
        }
      }
      // 1. Persist or update schedule before generating invoice (per request)
      const persistScheduleBeforeInvoice = async () => {
        // Only attempt if in schedule context or converting enquiry to schedule
        const isScheduleContext = formType === 'schedule';
        if (!isScheduleContext) return location.state?.editId || null; // nothing to save, try to use existing id
        // Build exam code (id + text) similar to submit logic
        let exam_code_id = '';
        let exam_code_text = '';
        const rawExamCode = validation.values.exam_code;
        const selectedOption = examCodeOptions.find(opt => opt.value === rawExamCode || opt.label === rawExamCode);
        if (selectedOption) {
          exam_code_id = selectedOption.value;
          exam_code_text = selectedOption.label;
        } else if (rawExamCode) {
          try {
            const checkRes = await api.get('/examcodes', { params: { search: rawExamCode } });
            const found = Array.isArray(checkRes.data.data) && checkRes.data.data.find(e => e.ex_code === rawExamCode);
            if (found) {
              exam_code_id = found.id;
              exam_code_text = found.ex_code;
            } else {
              const createRes = await api.post('/examcodes', { exam_code: rawExamCode });
              if (createRes.data?.id) {
                exam_code_id = createRes.data.id;
              } else if (createRes.data?.data?.id) {
                exam_code_id = createRes.data.data.id;
              }
              exam_code_text = rawExamCode;
            }
          } catch (e) {
            setInvoiceGeneralError('Failed resolving exam code before invoice generation.');
            return false;
          }
        }
        const formattedDate = formatDateToYMDHMS(validation.values.date);
        const schedulePayload = {
          ...validation.values,
          date: formattedDate,
          exam_code_id,
          exam_code: exam_code_text,
          // Ensure backend receives account holder if it expects it
          account_holder: validation.values.account,
          bill_to: validation.values.bill_to || validation.values.group_name,
        };
        try {
          if (location.state?.editType === 'enquiry' && formType === 'schedule') {
            const createRes = await api.post('/schedule', schedulePayload);
            const newId = createRes?.data?.data?.s_id || createRes?.data?.data?.id || null;
            await api.delete(`/enquiries/${location.state.editId}`);
            return newId;
          } else if (!location.state?.editType && formType === 'schedule') {
            const createRes = await api.post('/schedule', schedulePayload);
            const newId = createRes?.data?.data?.s_id || createRes?.data?.data?.id || null;
            return newId;
          } else if (location.state?.editType === 'schedule') {
            await api.put(`/schedule/${location.state.editId}`, schedulePayload);
            return location.state.editId;
          }
          return location.state?.editId || null;
        } catch (err) {
          setInvoiceGeneralError('Failed to save/update schedule before invoice generation.');
          return null;
        }
      };
      const scheduleId = await persistScheduleBeforeInvoice();
      if (!scheduleId) return; // Abort invoice generation if we couldn't determine an id

      const amountVal = parseFloat(validation.values.amount);
      if (isNaN(amountVal) || amountVal <= 0) {
        validation.setFieldTouched('amount', true, false);
        validation.setFieldError('amount', 'Amount must be greater than 0');
        return;
                                <label htmlFor="exam_name" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Exam Name <span style={{ color: 'red' }}>*</span></label>
      }

      // First generate and persist the PDF; backend returns metadata including invoice number
  const res = await api.post('/invoice/generate-pdf', { schedule_id: scheduleId });
  const invoiceNumber = res?.data?.invoice_number || `invoice_${scheduleId}`;
  // Then download using the dedicated download endpoint to avoid corrupted files
  const dl = await api.get(`/invoice/download/${scheduleId}`, { responseType: 'blob' });
      const blob = new Blob([dl.data], { type: dl.headers['content-type'] || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
  // After generating, go back to Invoice page Pending tab and trigger success toast
  navigate('/invoice?tab=pending&invoiceGenerated=1', { state: { activeTab: 'pending', invoiceGenerated: true } });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to generate invoice PDF';
      setInvoiceGeneralError(msg);
    }
  };
  const handleInvoiceView = () => {
    try {
      // Resolve exam code text
      let examCodeText = '';
      const opt = examCodeOptions.find(o => o.value === validation.values.exam_code || o.label === validation.values.exam_code);
      if (opt) {
        examCodeText = opt.label;
      } else if (validation.values.exam_code) {
        examCodeText = validation.values.exam_code;
      }

      // Resolve account number (optional; backend falls back to ***********)
      let accountNumber = '';
      const selectedAcc = accounts.find(acc => String(acc?.id ?? acc?.value ?? '') === String(validation.values.account ?? ''));
      accountNumber = selectedAcc?.account_number || selectedAcc?.number || selectedAcc?.name || selectedAcc?.account_name || validation.values.account || '';

      const amount = validation.values.amount;
      setInvoiceGeneralError('');
      let blocked = false;
      if (!amount) {
        validation.setFieldTouched('amount', true, false);
        validation.setFieldError('amount', 'Amount is required');
        blocked = true;
      }
      if (!examCodeText) {
        validation.setFieldTouched('exam_code', true, false);
        validation.setFieldError('exam_code', 'Exam code is required');
        blocked = true;
      }
      if (!validation.values.bill_to || String(validation.values.bill_to).trim() === '') {
        validation.setFieldTouched('bill_to', true, false);
        validation.setFieldError('bill_to', 'Bill to is required');
        blocked = true;
      }
      if (!validation.values.exam_name || String(validation.values.exam_name).trim() === '') {
        validation.setFieldTouched('exam_name', true, false);
        validation.setFieldError('exam_name', 'Exam name is required');
        blocked = true;
      }
      // Account optional for preview as well
      if (blocked) {
        // Field-specific errors already set; no generic banner needed for view action
        return;
      }

      const params = new URLSearchParams({
        amount: String(amount),
        account_number: String(accountNumber),
        exam_code: String(examCodeText),
        bill_to: String(validation.values.bill_to || validation.values.group_name || 'Customer'),
        amount_paid: String(amount),
      });
      const base = window.location.origin;
      const url = `${base}/api/invoice/preview?${params.toString()}`;
      window.open(url, '_blank', 'noopener');
    } catch (e) {}
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
        label: tz.area + (tz.abbreviation ? ` (${tz.abbreviation}` : '') + (tz.offset ? ` ${tz.offset})` : ''),
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
                bill_to: data.s_bill_to || data.s_group_name || '',
                exam_name: data.s_exam_name || data.exam_name || '',
                exam_code: data.s_exam_code || '',
                date: dateValue,
                support_fee: data.s_support_fee || '',
                voucher_fee: data.s_voucher_fee || '',
                total_fee: data.total_fee || '',
                amount: data.s_amount || data.amount || '',
                email: data.s_email || '',
                phone: data.s_phone || '',
                agent: data.s_agent_id || '',
                user: data.s_user_id || '',
                account: data.s_account_id || data.account_id || data.s_account || '',
                timezone: timezone,
                location: data.s_location || '',
                comment: data.s_comment || '',
                remind_date: data.s_remind_date || '',
                remind_remark: data.s_remind_remark || '',
              });
              // If we have only the account holder name, preselect matching account once list loads
              if (!data?.s_account_id && !data?.account_id && data?.s_account_holder) {
                setPendingAccountHolder(data.s_account_holder);
              }
              setFormType('schedule');
            } else if (location.state.editType === 'enquiry') {
              validation.setValues({
                group_name: data.e_group_name || '',
                bill_to: data.e_bill_to || data.e_group_name || '',
                exam_name: data.e_exam_name || data.exam_name || '',
                exam_code: data.e_exam_code || '',
                date: '',
                support_fee: data.e_support_fee || '',
                voucher_fee: data.e_voucher_fee || '',
                total_fee: data.total_fee || '',
                amount: data.e_amount || data.amount || '',
                email: data.e_email || '',
                phone: data.e_phone || '',
                agent: data.e_agent_id || '',
                user: data.e_user_id || '',
                account: data.e_account_id || data.account_id || data.e_account || '',
                timezone: '',
                location: data.e_location || '',
                comment: data.e_comment || '',
                remind_date: data.e_remind_date || '',
                remind_remark: data.e_remind_remark || '',
              });
              // For enquiry context, also respect an account holder value if present
              if (!data?.e_account_id && !data?.account_id && data?.e_account_holder) {
                setPendingAccountHolder(data.e_account_holder);
              }
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
          <div className="page-content" style={{  background: '#fff', padding: 0, width: '100vw', overflowX: 'hidden', marginTop: "0px" }}>
            <Row className="justify-content-center">
              <Col lg="10" className="mx-auto" style={{width: "100%"}}>
                <Card className="shadow rounded border-0">
                  <CardBody>
                    {/* <h2 className="fw-bold text-center" style={{color: '#232b46'}}>Client Create</h2> */}
                    {/* <div className="mx-auto mb-4" style={{width: 70, height: 4, background: '#22a6f7', borderRadius: 2}}></div> */}
                    <form className="container" onSubmit={handleFormSubmit} autoComplete="off">
                      {/* Type & Support Fee */}
                      <div className="row">
                        <div className="col-md-8 col-12">
                            <div>
                              <label className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>
                                Type <span style={{ color: 'red'}}>*</span>
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
                          <label htmlFor="support_fee" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Support fee</label>
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
                          <label htmlFor="agent" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Agent <span style={{ color: 'red' }}>*</span></label>
                          <select className="form-control rounded-pill px-3 py-2 reminder-input" value={validation.values.agent} onChange={handleAgentChange}>
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
                          <label htmlFor="voucher_fee" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Voucher fee</label>
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
                          <label htmlFor="user" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>User <span style={{ color: 'red' }}>*</span></label>
                          <select className="form-control rounded-pill px-3 py-2 reminder-input" value={validation.values.user} onChange={e => validation.setFieldValue('user', e.target.value)}>
                            {!validation.values.agent && <option value="">Select User</option>}
                            {validation.values.agent && users.length !== 1 && <option value="">Select User</option>}
                            {validation.values.agent && users.map(user => (
                              <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                          </select>
                          {validation.touched.user && validation.errors.user && (
                            <div className="text-danger small mt-1">{validation.errors.user}</div>
                          )}
                        </div>
                        <div className="col-md-4 col-12">
                          <label htmlFor="total_fee" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Total Fee</label>
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
                          <label htmlFor="group_name" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Group Name <span style={{ color: 'red' }}>*</span></label>
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
                          <label htmlFor="comment" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Comment</label>
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
                          <label htmlFor="exam_code" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Exam code <span style={{ color: 'red' }}>*</span></label>
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
                          <label htmlFor="phone" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Phone</label>
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
                            <label htmlFor="timezone" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Timezone <span style={{ color: 'red' }}>*</span></label>
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
                            <label htmlFor="email" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Email</label>
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
                          <label className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Date <span style={{ color: 'red' }}>*</span></label>
                          <DatePicker
                            className="form-control rounded-pill px-3 py-2 reminder-input"
                            selected={validation.values.date ? new Date(validation.values.date) : null}
                            onChange={date => {
                              setstartDate(date);
                              validation.setFieldValue('date', formatDateToYMDHMS(date));
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
                          {location.state?.from === 'invoice' && (
                            <>
                              <div className="mt-3">
                                <label htmlFor="bill_to" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Bill To <span style={{ color: 'red' }}>*</span></label>
                                <Input
                                  id="bill_to"
                                  name="bill_to"
                                  type="text"
                                  className="form-control rounded-pill px-3 py-2 reminder-input"
                                  placeholder="Enter Bill To..."
                                  value={validation.values.bill_to}
                                  onChange={validation.handleChange}
                                />
                                {validation.touched.bill_to && validation.errors.bill_to && (
                                  <div className="text-danger small mt-1">{validation.errors.bill_to}</div>
                                )}
                              </div>
                              <div className="mt-3">
                                <label htmlFor="exam_name" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Exam Name <span style={{ color: 'red' }}>*</span></label>
                                <Input
                                  id="exam_name"
                                  name="exam_name"
                                  type="text"
                                  className="form-control rounded-pill px-3 py-2 reminder-input"
                                  placeholder="Enter exam name..."
                                  value={validation.values.exam_name}
                                  onChange={validation.handleChange}
                                />
                              </div>
                            </>
                          )}

                          {location.state?.from === 'invoice' && (
                            <>
                              {/* Amount under Date */}
                              <div className="mt-3">
                                <label htmlFor="amount" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Amount <span style={{ color: 'red' }}>*</span></label>
                                <Input
                                  id="amount"
                                  name="amount"
                                  type="number"
                                  step="0.01"
                                  className="form-control rounded-pill px-3 py-2 reminder-input"
                                  placeholder="Enter amount..."
                                  value={validation.values.amount}
                                  onChange={validation.handleChange}
                                  onBlur={validation.handleBlur}
                                  invalid={validation.touched.amount && !!validation.errors.amount}
                                />
                                {validation.touched.amount && validation.errors.amount && (
                                  <div className="text-danger small mt-1">{validation.errors.amount}</div>
                                )}
                              </div>

                              {/* Account under Amount */}
                              <div className="mt-3">
                                <label htmlFor="account" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Account (optional)</label>
                                <select
                                  id="account"
                                  name="account"
                                  className="form-control rounded-pill px-3 py-2 reminder-input"
                                  value={validation.values.account}
                                  onChange={e => validation.setFieldValue('account', e.target.value)}
                                >
                                  <option value="">Select Account</option>
                                  {accounts.map(acc => {
                                    const label = acc?.name || acc?.account_name || acc?.title || acc?.label || (acc?.id ? `Account ${acc.id}` : 'Unknown');
                                    const value = acc?.id ?? acc?.value ?? '';
                                    return (
                                      <option key={`${value}-${label}`} value={value}>{label}</option>
                                    );
                                  })}
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                      ) : <div className="col-md-8 col-12"></div>}
                        <div className="col-md-4 col-12">
                          <label htmlFor="remind_remark" className="col-form-label fw-semibold form-label text-start" style={{fontWeight : '600', fontSize : '16px'}}>Remind remark</label>
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
                        <div className={`col-lg-12 d-flex align-items-center gap-2 ${location.state?.from === 'invoice' ? 'flex-nowrap' : 'justify-content-center'}`}>
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
                          {location.state?.from === 'invoice' && (
                            <>
                              <Button type="button" style={{backgroundColor:'#2ba8fb'}} onClick={() => setShowInvoiceConfirm(true)} className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm">
                                Invoice Generate
                              </Button>
                              <span role="button" onClick={handleInvoiceView} className="d-inline-flex align-items-center ms-2 text-primary fw-bold" style={{cursor: 'pointer'}}>
                                <i className="mdi mdi-file-document-outline me-1" />
                                View Invoice
                              </span>
                              {invoiceGeneralError && (
                                <div className="text-danger ms-3 small fw-semibold" style={{maxWidth:'300px'}}>{invoiceGeneralError}</div>
                              )}
                            </>
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
                    {showInvoiceConfirm && (
                      <div className="examcode-modal-backdrop" style={{zIndex: 2100, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(44,62,80,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <div className="examcode-modal" style={{minWidth: 360, maxWidth: '90vw', borderRadius: 18, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '28px 34px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                          <div className="examcode-modal-icon" style={{fontSize: 52, color: '#ffb300', marginBottom: 14}}>
                            <i className="mdi mdi-alert-outline"></i>
                          </div>
                          <div className="examcode-modal-title" style={{fontWeight: 700, fontSize: 24, color: '#1a2942', marginBottom: 10}}>Warning</div>
                          <div className="examcode-modal-message" style={{fontSize: 16, color: '#1a2942', marginBottom: 16, textAlign: 'center'}}>
                            Generating the invoice PDF cannot be reverted. Make sure all details (Amount, Exam Code, Account, Group Name, Exam Name) are correct.
                          </div>
                          <div className="mb-3" style={{fontSize: 14, color: '#6c7a89'}}>Do you want to proceed?</div>
                          <div className="examcode-modal-btns" style={{display: 'flex', gap: 16}}>
                            <button
                              className="examcode-save-btn"
                              style={{background:'#2ba8fb', color:'#fff', border:'none', borderRadius:100, fontWeight:600, fontSize:'1rem', padding:'8px 28px'}}
                              type="button"
                              onClick={async () => { setShowInvoiceConfirm(false); await handleInvoiceGenerate(); }}
                            >Proceed</button>
                            <button
                              className="examcode-cancel-btn"
                              type="button"
                              onClick={() => setShowInvoiceConfirm(false)}
                            >Cancel</button>
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
