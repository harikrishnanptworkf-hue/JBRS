import PropTypes from "prop-types";
import React, { useState, useEffect } from "react";
import { Row, Col, Collapse } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import withRouter from "../Common/withRouter";
import ProfileMenu from "../CommonForBoth/TopbarDropdown/ProfileMenu";
import NavbarDropdownButton from "./NavbarDropdownButton";

//i18n
import { withTranslation } from "react-i18next";

import { connect } from "react-redux";

const Navbar = props => {
  const navigate = useNavigate();

  const [filterBtnClicked, setFilterBtnClicked] = useState(false);
  // Reset filter button animation on route change
  useEffect(() => {
    setFilterBtnClicked(false);
  }, [window.location.pathname]);
  // Eye button visibility: hide on settings page
  const [showEyeButton, setShowEyeButton] = useState(true);
  useEffect(() => {
    const path = window.location.pathname;
    setShowEyeButton(path !== '/settings');
  }, [window.location.pathname]);
  const [selectedMenu, setSelectedMenu] = useState('');

  // Detect current route and set menu name on mount and route change
  useEffect(() => {
    const path = window.location.pathname;
    const menuMap = {
      '/schedule': 'Scheduled',
      '/enquiry': 'Enquiry',
      '/reminders': 'Reminder',
      '/client-create': 'Client Create',
      '/report': 'Report',
      '/dashboard': 'Dashboard',
      '/examcode': 'Examcode',
      '/settings': 'Settings',
    };
    if (menuMap[path]) {
      setSelectedMenu(menuMap[path]);
    } else {
      setSelectedMenu('');
    }
  }, [window.location.pathname]);

  const [dashboard, setdashboard] = useState(false);
  const [ui, setui] = useState(false);
  const [app, setapp] = useState(false);
  const [email, setemail] = useState(false);
  const [ecommerce, setecommerce] = useState(false);
  const [crypto, setcrypto] = useState(false);
  const [project, setproject] = useState(false);
  const [task, settask] = useState(false);
  const [contact, setcontact] = useState(false);
  const [blog, setBlog] = useState(false);
  const [job, setJob] = useState(false);
  const [candidate, setCandidate] = useState(false);
  const [component, setcomponent] = useState(false);
  const [form, setform] = useState(false);
  const [table, settable] = useState(false);
  const [chart, setchart] = useState(false);
  const [icon, seticon] = useState(false);
  const [map, setmap] = useState(false);
  const [extra, setextra] = useState(false);
  const [invoice, setinvoice] = useState(false);
  const [auth, setauth] = useState(false);
  const [utility, setutility] = useState(false);

  const [roleId, setRoleId] = useState(null);

  useEffect(() => {
    const obj = JSON.parse(sessionStorage.getItem("authUser"));
    if (obj) {
      setRoleId(obj.role_id); // Save role_id for conditional rendering
    }
    console.log(obj)
  }, []);

  useEffect(() => {
    var matchingMenuItem = null;
    var ul = document.getElementById("navigation");
    var items = ul.getElementsByTagName("a");
    removeActivation(items);
    for (var i = 0; i < items.length; ++i) {
      if (window.location.pathname === items[i].pathname) {
        matchingMenuItem = items[i];
        break;
      }
    }
    if (matchingMenuItem) {
      activateParentDropdown(matchingMenuItem);
    }
  });

  const removeActivation = items => {
    for (var i = 0; i < items.length; ++i) {
      var item = items[i];
      const parent = items[i].parentElement;
      if (item && item.classList.contains("active")) {
        item.classList.remove("active");
      }
      if (parent) {
        if (parent.classList.contains("active")) {
          parent.classList.remove("active");
        }
      }
    }
  };

  function activateParentDropdown(item) {
    item.classList.add("active");
    const parent = item.parentElement;
    if (parent) {
      parent.classList.add("active"); // li
      const parent2 = parent.parentElement;
      parent2.classList.add("active"); // li
      const parent3 = parent2.parentElement;
      if (parent3) {
        parent3.classList.add("active"); // li
        const parent4 = parent3.parentElement;
        if (parent4) {
          parent4.classList.add("active"); // li
          const parent5 = parent4.parentElement;
          if (parent5) {
            parent5.classList.add("active"); // li
            const parent6 = parent5.parentElement;
            if (parent6) {
              parent6.classList.add("active"); // li
            }
          }
        }
      }
    }
    return false;
  }


  return (
    <React.Fragment>
      <div className="topnav d-flex align-items-center justify-content-between" style={{
        background: "linear-gradient(90deg, #0271b9 80%, #2ba8fb 100%)",
        padding: "0 24px",
        minHeight: "56px",
        marginTop: 0,
        position: "relative",
        borderRadius: 0,
        boxShadow: "0 4px 24px rgba(44,62,80,0.10)",
        fontFamily: "'Inter', 'Segoe UI', 'Roboto', 'Arial', sans-serif",
      }}>
        {/* Top left selected menu name - modern pill style */}
        <div style={{
          position: 'absolute',
          left: 24,
          top: 'calc(50% - 18px)',
          minWidth: 140,
          minHeight: 36,
          display: 'flex',
          alignItems: 'center',
          fontWeight: 700,
          fontSize: '1.45rem',
          color: '#fff',
          letterSpacing: '0.01em',
          zIndex: 10,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '24px',
          boxShadow: '0 2px 8px rgba(44,62,80,0.08)',
          padding: '0 24px',
          transition: 'background 0.2s',
          fontFamily: "'Inter', 'Segoe UI', 'Roboto', 'Arial', sans-serif",
        }}>
          <span style={{flex: 'none'}}>{selectedMenu ? selectedMenu : ''}</span>
        </div>

        <nav
          className="navbar navbar-light navbar-expand-lg topnav-menu flex-grow-1"
          id="navigation"
          style={{fontSize: "1.3rem", minHeight: "70px"}}
        >
          <Collapse
            isOpen={props.leftMenu}
            className="navbar-collapse"
            id="topnav-menu-content"
          >
            {/* Navigation links removed as requested */}
          </Collapse>
        </nav>

        {/* Right-aligned navbar button + filter button + profile menu */}
        <div className="ms-auto me-3 d-flex align-items-center" style={{gap: '18px'}}>
          {window.location.pathname === '/schedule' && (
            <>
              <button
                type="button"
                className="btn btn-primary standard-btn me-2 d-flex align-items-center"
                style={{
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  padding: '8px 16px',
                }}
                onClick={() => {
                  const today = new Date();
                  const formatDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                  window.dispatchEvent(new CustomEvent('filterTodaySchedule', {
                    detail: {
                      startDate: formatDate(today),
                      endDate: formatDate(today),
                    },
                  }));
                }}
              >
                <i className="mdi mdi-calendar-today me-1" style={{ fontSize: '1.2rem' }}></i> Today's Schedule
              </button>
              <button
                type="button"
                className="btn btn-success standard-btn me-2 d-flex align-items-center"
                style={{
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  padding: '8px 16px',
                }}
                onClick={() => navigate('/client-create')}
              >
                <i className="mdi mdi-account-plus-outline me-1" style={{ fontSize: '1.2rem' }}></i> Client Create
              </button>
            </>
          )}

          {/* Standard filter button, visible except on settings page */}
          {showEyeButton && (
            <button
              type="button"
              className={`examcode-action-btn navbar-filter-animate${filterBtnClicked ? ' clicked' : ''}`}
              style={{
                background: '#f6f8fa',
                color: '#2ba8fb',
                borderRadius: '50%',
                width: 44,
                height: 44,
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                boxShadow: '0 1.5px 8px rgba(44,62,80,0.04)',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
              title="Show/hide filters & create"
              aria-label="Show or hide filters and create section"
              onClick={() => {
                setFilterBtnClicked(true);
                window.dispatchEvent(new CustomEvent('toggleExamcodeControls'));
                setTimeout(() => setFilterBtnClicked(false), 200);
              }}
              onMouseOver={e => e.currentTarget.style.background = '#e3e6ef'}
              onMouseOut={e => e.currentTarget.style.background = '#f6f8fa'}
            >
              <i className="mdi mdi-filter-variant"></i>
              <style>{`
                .navbar-filter-animate.clicked {
                  transform: scale(0.88);
                  box-shadow: 0 0 16px #2ba8fb50;
                  transition: transform 0.18s, box-shadow 0.18s;
                }
              `}</style>
            </button>
          )}
          {/* Standard Navbar Dropdown Button */}
          <NavbarDropdownButton roleId={roleId} t={props.t} setSelectedMenu={setSelectedMenu} />
          <ProfileMenu />
        </div>
      </div>
    </React.Fragment>
  );
};

Navbar.propTypes = {
  leftMenu: PropTypes.any,
  location: PropTypes.any,
  menuOpen: PropTypes.any,
  t: PropTypes.any,
};

const mapStatetoProps = state => {
  const { leftMenu } = state.Layout;
  return { leftMenu };
};

export default withRouter(
  connect(mapStatetoProps, {})(withTranslation()(Navbar))
);
