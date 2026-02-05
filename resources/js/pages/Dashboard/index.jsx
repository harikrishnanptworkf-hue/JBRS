import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  CardBody,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Table,
} from "reactstrap";
import { Link } from "react-router-dom";
import { 
  MdCalendarMonth,
  MdQuestionAnswer,
  MdNotificationsActive,
  MdPersonAdd,
  MdAssessment,
  MdDashboard,
  MdQrCodeScanner,
  MdAccountBalance,
  MdSettings,
  MdRequestQuote
} from "react-icons/md";
import classNames from "classnames";

//import action
import { getChartsData as onGetChartsData } from "../../store/actions";

//Import Breadcrumb
import Breadcrumbs from "../../components/Common/Breadcrumb";

//i18n
import { withTranslation } from "react-i18next";

//redux
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "reselect";

const Dashboard = (props) => {
  const [modal, setmodal] = useState(false);
  const [subscribemodal, setSubscribemodal] = useState(false);

  const dashboardSelector = createSelector(
    (state) => state.Dashboard,
    (dashboard) => ({
      chartsData: dashboard.chartsData,
    })
  );

  const { chartsData } = useSelector(dashboardSelector);

  const reports = [
    { title: "Orders", iconClass: "bx-copy-alt", description: "1,235" },
    { title: "Revenue", iconClass: "bx-archive-in", description: "$35, 723" },
    {
      title: "Average Price",
      iconClass: "bx-purchase-tag-alt",
      description: "$16.2",
    },
  ];

  useEffect(() => {
    setTimeout(() => {
      setSubscribemodal(true);
    }, 2000);
  }, []);

  const [periodData, setPeriodData] = useState([]);
  const [periodType, setPeriodType] = useState("Year");
  const [hoveredTile, setHoveredTile] = useState(null);

  useEffect(() => {
    setPeriodData(chartsData);
  }, [chartsData]);

  // Role-based visibility for certain tiles (compare roleId as string)
  const [roleId, setRoleId] = useState(null);
  useEffect(() => {
    try {
      const sessionObj = JSON.parse(sessionStorage.getItem('authUser'));
      const localObj = JSON.parse(localStorage.getItem('authUser'));
      const obj = sessionObj || localObj;
      if (obj && obj.role_id != null) {
        setRoleId(String(obj.role_id));
      }
    } catch (e) {}
  }, []);

  const onChangeChartPeriod = (pType) => {
    setPeriodType(pType);
    dispatch(onGetChartsData(pType));
  };

  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(onGetChartsData("Year"));
  }, [dispatch]);

  //meta title
  document.title = "Dashboard ";

  return (
    <React.Fragment>
        <div className="page-content" style={{ background: '#fff', padding: '24px', width: '100vw', overflowX: 'hidden', marginTop: "0px" }}>
          <Container fluid>

            {/* Dashboard tiles */}
            <Row className="g-3 g-md-4 ">
              {[
                { path: '/schedule', label: 'Scheduled', Icon: MdCalendarMonth, color: '#2ba8fb' },
                { path: '/enquiry', label: 'Enquiry', Icon: MdQuestionAnswer, color: '#6c5ce7' },
                { path: '/reminders', label: 'Reminder', Icon: MdNotificationsActive, color: '#ff9f43' },
                { path: '/client-create', label: 'Client Create', Icon: MdPersonAdd, color: '#00b894' },
                // Group: Report then Settings underneath in order
                { path: '/report', label: 'Report', Icon: MdAssessment, color: '#0984e3' },
                { path: '/settings', label: 'Settings', Icon: MdSettings, color: '#b2bec3' },
                // Group: Dashboard; then Examcode & Accounts under Report/Settings alignment
                { path: '/dashboard', label: 'Dashboard', Icon: MdDashboard, color: '#636e72' },
                { path: '/examcode', label: 'Examcode', Icon: MdQrCodeScanner, color: '#e84393' },
                { path: '/accounts', label: 'Bank Accounts', Icon: MdAccountBalance, color: '#2d3436' },
                { path: '/invoice', label: 'Invoice', Icon: MdRequestQuote, color: '#fdcb6e' },
              ].filter(({ path }) => {
                const restrictedPaths = ['/examcode', '/accounts', '/invoice', '/settings'];
                const isRestricted = restrictedPaths.includes(path);
                const isBlockedRole = roleId === '2' || roleId === '3';
                return !(isRestricted && isBlockedRole);
              }).map(({ path, label, Icon, color }, idx) => (
                <Col key={`${path}-${idx}`} xs="12" sm="6" md="4" lg="3" className="d-flex">
                  <Link to={path} className="text-decoration-none w-100 h-100 d-flex">
                    <Card
                      className="w-100 h-100 border-0 shadow-sm tile-card"
                      onMouseEnter={() => setHoveredTile(idx)}
                      onMouseLeave={() => setHoveredTile(null)}
                      style={{
                        borderRadius: '16px',
                        minHeight: 160,
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                        transform: hoveredTile === idx ? 'translateY(-2px)' : 'none',
                        boxShadow: hoveredTile === idx ? '0 12px 24px rgba(0,0,0,0.12)' : undefined,
                        border: hoveredTile === idx ? `1px solid ${color}` : '1px solid transparent',
                      }}
                    >
                      <CardBody
                        className="d-flex flex-column align-items-center justify-content-center text-center p-4"
                        style={{ minHeight: 160 }}
                      >
                        <div
                          className="d-flex align-items-center justify-content-center mb-3"
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 14,
                            background: hoveredTile === idx ? `${color}26` : `${color}1A`, // slightly stronger on hover
                            color: color,
                            transition: 'transform 0.2s ease, background-color 0.2s ease',
                            transform: hoveredTile === idx ? 'scale(1.05)' : 'none',
                          }}
                        >
                          <Icon size={30} />
                        </div>
                        <div className="fw-bold" style={{ fontSize: '1rem', color: '#2b2b2b' }}>{label}</div>
                      </CardBody>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          </Container>
      </div>
    </React.Fragment>
  );
};

Dashboard.propTypes = {
  t: PropTypes.any,
  chartsData: PropTypes.any,
  onGetChartsData: PropTypes.func,
};

export default withTranslation()(Dashboard);
