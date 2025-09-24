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
    });
    api.get('/timezone/get-full-timezones').then(res => {
      setTimezones(res.data || []);
    });
    api.get('/examcodes', { params: { pageSize: 100 } }).then(res => {
      const options = Array.isArray(res.data.data)
        ? res.data.data.map(ec => ({ value: ec.ex_code, label: ec.ex_code }))
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
      timezone: Yup.string().required('Timezone is required'),
      group_name: Yup.string().required('Group name is required'),
      exam_code: Yup.string().required('Exam code is required'),
      date: Yup.date().required('Date is required'),
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
        if (values.exam_code) {
          const checkRes = await api.get('/examcodes', { params: { search: values.exam_code } });
          const exists = Array.isArray(checkRes.data.data) && checkRes.data.data.some(e => e.ex_code === values.exam_code);
          if (!exists) {
            await api.post('/examcodes', {
              exam_code: values.exam_code
            });
          }
        }
        if (location.state?.editType === 'enquiry' && formType === 'schedule') {
          await api.post('/schedule', values);
          await api.delete(`/enquiries/${location.state.editId}`);
          navigate('/schedule');
        } else if (!location.state?.editType && formType === 'enquiry') {
          await api.post('/enquiries', values);
          navigate('/enquiry', { state: { created: true } }); 
        } else if (!location.state?.editType && formType === 'schedule') {
          await api.post('/schedule', values);
          navigate('/schedule');
        } else if (location.state?.editType === 'schedule') {
          await api.post('/schedule', values);
          navigate('/schedule');
        }
      } catch (err) {}
      return
    },
  });

  const handleFormSubmit = async (e) => {
    e.preventDefault();
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
      <div className="page-content">
          <Row>
            <Col lg="12">
              <Card>
                <CardBody>
                  <CardTitle className="mb-4" style={{fontSize: "1.5rem", }}>Client Create</CardTitle>
                  <form className="outer-repeater" onSubmit={handleFormSubmit}>
                    {!(location.state && location.state.editType) && (
                      <FormGroup className="mb-4" row>
                        <Label className="col-form-label col-lg-2">Type <span style={{color:'red'}}>*</span></Label>
                        <Col lg="5">
                          <select className="form-control" value={formType} onChange={e => setFormType(e.target.value)}>
                            <option value="schedule">Schedule</option>
                            <option value="enquiry">Enquiry</option>
                          </select>
                        </Col>
                      </FormGroup>
                    )}
                    <div data-repeater-list="outer-group" className="outer">
                      <div data-repeater-item className="outer">
                        <FormGroup className="mb-4" row>
                          <Label
                            htmlFor="agent"
                            className="col-form-label col-lg-2"
                          >
                            Agent <span style={{color:'red'}}>*</span>
                          </Label>
                          <Col lg="5">
                             <select className="form-control select2 mb-3 mb-xxl-0" value={validation.values.agent} onChange={e => validation.setFieldValue('agent', e.target.value)}>
                                <option value="">Select Agent</option>
                                {agents.map(agent => (
                                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))}
                            </select>
                            {validation.touched.agent && validation.errors.agent && (
                              <div className="text-danger">{validation.errors.agent}</div>
                            )}
                          </Col>
                        </FormGroup>

                        <FormGroup className="mb-4" row>
                          <Label
                            htmlFor="user"
                            className="col-form-label col-lg-2"
                          >
                            User <span style={{color:'red'}}>*</span>
                          </Label>
                          <Col lg="5">
                             <select className="form-control select2 mb-3 mb-xxl-0" value={validation.values.user} onChange={e => validation.setFieldValue('user', e.target.value)}>
                                <option value="">Select User</option>
                                {users.map(user => (
                                  <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                            {validation.touched.user && validation.errors.user && (
                              <div className="text-danger">{validation.errors.user}</div>
                            )}
                          </Col>
                        </FormGroup>


                        <FormGroup className="mb-4" row>
                          <Label htmlFor="group_name" className="col-form-label col-lg-2">
                            Group Name <span style={{color:'red'}}>*</span>
                          </Label>
                          <Col lg="5">
                            <Input
                              id="group_name"
                              name="group_name"
                              type="text"
                              className="form-control"
                              placeholder="Enter group name..."
                              value={validation.values.group_name}
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              invalid={validation.touched.group_name && !!validation.errors.group_name}
                            />
                            {validation.touched.group_name && validation.errors.group_name && (
                              <div className="text-danger">{validation.errors.group_name}</div>
                            )}
                          </Col>
                        </FormGroup>

                        <FormGroup className="mb-4" row>
                          <Label htmlFor="exam_code" className="col-form-label col-lg-2">
                            Exam code <span style={{color:'red'}}>*</span>
                          </Label>
                          <Col lg="5">
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
                              styles={customSelectStyles}
                              isSearchable
                            />
                            {validation.touched.exam_code && validation.errors.exam_code && (
                              <div className="text-danger">{validation.errors.exam_code}</div>
                            )}
                          </Col>
                        </FormGroup>

                        {(location.state?.editType || formType === 'schedule') && (
                          <>
                            <FormGroup className="mb-4" row>
                              <Label htmlFor="timezone" className="col-form-label col-lg-2">
                                Timezone <span style={{color:'red'}}>*</span> 
                              </Label>
                              <Col lg="5">
                                <Select
                                  id="timezone"
                                  name="timezone"
                                  options={timezoneOptions}
                                  value={timezoneOptions.find(opt => opt.value === validation.values.timezone) || null}
                                  onChange={opt => validation.setFieldValue('timezone', opt ? opt.value : '')}
                                  isClearable
                                  placeholder="Select or search timezone..."
                                  styles={customSelectStyles}
                                />
                                {validation.touched.timezone && validation.errors.timezone && (
                                  <div className="text-danger">{validation.errors.timezone}</div>
                                )}
                              </Col>
                            </FormGroup>
                              <FormGroup className="mb-4" row>
                                <Label className="col-form-label col-lg-2">
                                  Date <span style={{color:'red'}}>*</span>
                                </Label>
                                <Col lg="10">
                                  <Row>
                                    <Col md={6} className="pr-0">
                                      <DatePicker
                                        className="form-control"
                                        selected={validation.values.date || null}
                                        onChange={date => {
                                          setstartDate(date);
                                          validation.setFieldValue('date', date);
                                        }}
                                        onBlur={validation.handleBlur}
                                        dateFormat="dd/MM/yyyy h:mm aa"
                                        showTimeSelect
                                        timeFormat="HH:mm"
                                      />
                                      {validation.touched.date && validation.errors.date && (
                                        <div className="text-danger">{validation.errors.date}</div>
                                      )}
                                    </Col>
                                  </Row>
                                </Col>
                              </FormGroup>
                          </>
                        )}

                        <FormGroup className="mb-4" row>
                          <Label htmlFor="support_fee" className="col-form-label col-lg-2">
                            Support fee
                          </Label>
                          <Col lg="5">
                            <Input
                              id="support_fee"
                              name="support_fee"
                              type="number"
                              className="form-control"
                              placeholder="Enter support fee..."
                              value={validation.values.support_fee}
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              invalid={validation.touched.support_fee && !!validation.errors.support_fee}
                            />
                            {validation.touched.support_fee && validation.errors.support_fee && (
                              <div className="text-danger">{validation.errors.support_fee}</div>
                            )}
                          </Col>
                        </FormGroup>

                        <FormGroup className="mb-4" row>
                          <Label htmlFor="voucher_fee" className="col-form-label col-lg-2">
                            Voucher fee
                          </Label>
                          <Col lg="5">
                            <Input
                              id="voucher_fee"
                              name="voucher_fee"
                              type="number"
                              className="form-control"
                              placeholder="Enter voucher fee..."
                              value={validation.values.voucher_fee}
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              invalid={validation.touched.voucher_fee && !!validation.errors.voucher_fee}
                            />
                            {validation.touched.voucher_fee && validation.errors.voucher_fee && (
                              <div className="text-danger">{validation.errors.voucher_fee}</div>
                            )}
                          </Col>
                        </FormGroup>

                        <FormGroup className="mb-4" row>
                          <Label htmlFor="total_fee" className="col-form-label col-lg-2">
                            Total Fee
                          </Label>
                          <Col lg="5">
                            <Input
                              id="total_fee"
                              name="total_fee"
                              type="number"
                              className="form-control"
                              placeholder="Enter total fee..."
                              value={validation.values.total_fee}
                              readOnly
                              onBlur={validation.handleBlur}
                              invalid={validation.touched.total_fee && !!validation.errors.total_fee}
                            />
                            {validation.touched.total_fee && validation.errors.total_fee && (
                              <div className="text-danger">{validation.errors.total_fee}</div>
                            )}
                          </Col>
                        </FormGroup>

                        <FormGroup className="mb-4" row>
                          <Label
                            htmlFor="taskname"
                            className="col-form-label col-lg-2"
                          >
                            Comment
                          </Label>
                          <Col lg="5">
                            <Input
                              id="comment"
                              name="comment"
                              type="text"
                              className="form-control"
                              placeholder="Enter comment..."
                              value={validation.values.comment}
                              onChange={validation.handleChange}
                            />
                          </Col>
                        </FormGroup>

                        <FormGroup className="mb-4" row>
                          <Label
                            htmlFor="email" className="col-form-label col-lg-2"
                          >
                            Email 
                          </Label>
                          <Col lg="5">
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              className="form-control"
                              placeholder="Enter email..."
                              value={validation.values.email}
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              invalid={validation.touched.email && !!validation.errors.email}
                            />
                            {validation.touched.email && validation.errors.email && (
                              <div className="text-danger">{validation.errors.email}</div>
                            )}
                          </Col>
                        </FormGroup>

                        <FormGroup className="mb-4" row>
                          <Label
                            htmlFor="phone" className="col-form-label col-lg-2"
                          >
                            Phone
                          </Label>
                          <Col lg="5">
                            <Input
                              id="phone"
                              name="phone"
                              type="text"
                              className="form-control"
                              placeholder="Enter phone..."
                              value={validation.values.phone}
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              onKeyDown={e => !(/[0-9]/.test(e.key) || (e.key === '+' && e.currentTarget.selectionStart === 0 && !e.currentTarget.value.includes('+')) || ['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key) || e.ctrlKey) && e.preventDefault()}
                              onPaste={e => !/^\+?[0-9]*$/.test(e.clipboardData.getData("text")) && e.preventDefault()}                              invalid={validation.touched.phone && !!validation.errors.phone}
                            />
                            {validation.touched.phone && validation.errors.phone && (
                              <div className="text-danger">{validation.errors.phone}</div>
                            )}
                          </Col>
                        </FormGroup>

                        <FormGroup className="mb-4" row>
                          <Label className="col-form-label col-lg-2">
                            Remind Date
                          </Label>
                          <Col lg="10">
                            <Row>
                              <Col md={6} className="pr-0">
                                <DatePicker
                                  className="form-control"
                                  selected={validation.values.remind_date}
                                  onChange={date => validation.setFieldValue('remind_date', date)}
                                />
                              </Col>
                            </Row>
                          </Col>
                        </FormGroup>

                        <FormGroup className="mb-4" row>
                          <Label
                            htmlFor="taskname"
                            className="col-form-label col-lg-2"
                          >
                            Remind remark
                          </Label>
                          <Col lg="5">
                            <Input
                              id="remind_remark"
                              name="remind_remark"
                              type="text"
                              className="form-control"
                              placeholder="Enter remind remark..."
                              value={validation.values.remind_remark}
                              onChange={validation.handleChange}
                            />
                          </Col>
                        </FormGroup>

                        
               
                      </div>
                    </div>
                    <Row className="justify-content-end">
                      <Col lg="10">
                        {location.state && location.state.editType && (
                          <Button type="submit" className="btn btn-success">
                            Save Schedule
                          </Button>
                        )}
                        {!location.state?.editType && formType === 'schedule' && (
                          <Button type="submit" className="btn btn-success">
                            Save Schedule
                          </Button>
                        )}
                        {!location.state?.editType && formType === 'enquiry' && (
                          <Button type="submit" className="btn btn-success">
                            Save Enquiry
                          </Button>
                        )}
                      </Col>
                    </Row>
                  </form>
                  <Modal isOpen={showCheckModal} toggle={handleCheckModalCancel}>
                    <ModalHeader toggle={handleCheckModalCancel}>Warning</ModalHeader>
                    <ModalBody>
                      {checkMessage}
                      {checkReason && (
                        <div className="mt-2"><b>Reason:</b> {checkReason}</div>
                      )}
                      {ISTDisplay && (
                        <div className="mt-2"><b>Indian Time:</b> {ISTDisplay}</div>
                      )}
                      <div className="mt-2">Do you want to proceed anyway?</div>
                    </ModalBody>
                    <ModalFooter>
                      <Button color="primary" onClick={handleCheckModalOk}>OK</Button>{' '}
                      <Button color="secondary" onClick={handleCheckModalCancel}>Cancel</Button>
                    </ModalFooter>
                  </Modal>
                </CardBody>
              </Card>
            </Col>
          </Row>
      </div>
    </>
  )
}

export default ClientCreate
