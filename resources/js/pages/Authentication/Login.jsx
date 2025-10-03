import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";
import CryptoJS from "crypto-js";

import { Row, Col, CardBody, Card, Alert, Container, Form, Input, FormFeedback, Label } from "reactstrap";

//redux
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import withRouter from "../../components/Common/withRouter";

// Formik validation
import * as Yup from "yup";
import { useFormik } from "formik";

//Toast
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// actions
import { loginUser } from "../../store/actions";

// import images
import profile from "../../../images/profile-img.png";
import logo from "../../../images/logo.svg";
import { createSelector } from "reselect";
import { useNavigate } from "react-router-dom";

const Login = props => {
  // Prevent navigating to login if already authenticated
  // Do NOT clear sessionStorage here, only clear on explicit logout!
  if (sessionStorage.getItem('authUser')) {
    window.location.replace('/dashboard');
    return null;
  }

  const navigate = useNavigate();
  //meta title
  document.title = "Login ";
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleClick = () => {
    setUsername('admin');
    setPassword('12345678');
  };
  const [userLogin, setUserLogin] = useState({ username: username, password: '' });

    const registerSelector = createSelector(
      state => state.Account,
      account => ({
        user: account.user
      })
    );
    const {
      user
    } = useSelector(registerSelector);

    useEffect(() => {
      if (user) {
        setUserLogin({
          username: user.username || username,
          password: user.password || password
        });
      }
    }, [user, username, password]);
    
  const validation = useFormik({
    // enableReinitialize : use this  flag when initial values needs to be changed
    enableReinitialize: true,

    initialValues: {
      username: userLogin.username || username,
      password: userLogin.password || password,
    },
    validationSchema: Yup.object({
      username: Yup.string().required("Please Enter Your Username"),
      password: Yup.string().required("Please Enter Your Password"),
    }),
    onSubmit: (values) => {
      // Trim whitespaces from username and password
      const trimmedUsername = values.username.trim();
      const trimmedPassword = values.password.trim();
      const secret = "mySecretKey12345"; // 16 chars for AES-128
      const encrypted = CryptoJS.AES.encrypt(
        trimmedPassword,
        CryptoJS.enc.Utf8.parse(secret),
        {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        }
      ).toString();
      dispatch(loginUser({ ...values, username: trimmedUsername, password: encrypted }, props.router.navigate));
    }
  });

  return (
    <React.Fragment>
      <style>{`
        .login-modern-bg {
          min-height: 100vh;
          background: #f6f8fa;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-modern-card {
          border-radius: 18px;
          box-shadow: 0 4px 24px rgba(44, 62, 80, 0.10), 0 1.5px 4px rgba(44, 62, 80, 0.08);
          background: #fff;
          padding: 0;
        }
        .login-modern-title {
          font-size: 2.1rem;
          font-weight: 700;
          color: #1a2942;
          margin-bottom: 0.5rem;
          letter-spacing: 0.01em;
          text-align: left;
        }
        .login-modern-divider {
          width: 60px;
          height: 4px;
          background: #2ba8fb;
          border-radius: 2px;
          margin: 18px 0 0 0;
          opacity: 0.8;
        }
        .login-modern-input {
          border-radius: 10px !important;
          border: 1.5px solid #e3e6ef !important;
          box-shadow: 0 1.5px 8px rgba(44,62,80,0.04);
          font-size: 1.05rem;
          padding: 10px 16px;
          background: #fafdff !important;
          transition: border-color 0.2s;
          height: 44px !important;
        }
        .login-modern-btn {
          background: #2ba8fb;
          color: #fff;
          border: none;
          border-radius: 100px;
          font-weight: 600;
          font-size: 1rem;
          padding: 10px 0;
          box-shadow: 0 1.5px 8px rgba(44,62,80,0.04);
          transition: background 0.2s, box-shadow 0.2s;
        }
        .login-modern-btn:hover {
          background: #6fc5ff;
          box-shadow: 0 0 12px #6fc5ff50;
        }
        .login-modern-btn:active {
          background: #3d94cf;
        }
      `}</style>
      <div className="login-modern-bg">
        <Container>
          <Row className="justify-content-center">
            <Col md={8} lg={6} xl={5}>
              <Card className="login-modern-card overflow-hidden">
                <div className="inner">
                  <div style={{ padding: '32px 32px 0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                    <div className="login-modern-title">JBRS</div>
                    <div className="login-modern-divider"></div>
                  </div>
                </div>
                <CardBody className="pt-0">
                  <div className="p-2">
                    <Form
                      className="form-horizontal"
                      onSubmit={(e) => {
                        e.preventDefault();
                        validation.handleSubmit();
                        return false;
                      }}
                    >
                      <ToastContainer closeButton={false} limit={1} />
                      <div className="mb-3">
                        <Label className="form-label">Username</Label>
                        <Input
                          name="username"
                          className="login-modern-input"
                          placeholder="Enter username"
                          type="text"
                          onChange={validation.handleChange}
                          onBlur={validation.handleBlur}
                          value={validation.values.username || ""}
                          invalid={
                            validation.touched.username && validation.errors.username ? true : false
                          }
                        />
                        {validation.touched.username && validation.errors.username ? (
                          <FormFeedback type="invalid">{validation.errors.username}</FormFeedback>
                        ) : null}
                      </div>
                      <div className="mb-3">
                        <Label className="form-label">Password</Label>
                        <Input
                          name="password"
                          className="login-modern-input"
                          value={validation.values.password || ""}
                          type="password"
                          placeholder="Enter Password"
                          onChange={validation.handleChange}
                          onBlur={validation.handleBlur}
                          invalid={
                            validation.touched.password && validation.errors.password ? true : false
                          }
                        />
                        {validation.touched.password && validation.errors.password ? (
                          <FormFeedback type="invalid">{validation.errors.password}</FormFeedback>
                        ) : null}
                      </div>
                      <div className="mt-3 d-grid">
                        <button
                          className="login-modern-btn btn-block"
                          type="submit"
                        >
                          Log In
                        </button>
                      </div>
                    </Form>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default withRouter(Login);

Login.propTypes = {
  history: PropTypes.object,
};
