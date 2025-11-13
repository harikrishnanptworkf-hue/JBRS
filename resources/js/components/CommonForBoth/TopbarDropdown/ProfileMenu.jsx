import React, { useState, useEffect, useRef } from "react";
import PropTypes from 'prop-types';
import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";

//i18n
import { withTranslation } from "react-i18next";
// Redux
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import withRouter from "../../Common/withRouter";

// users
import user1 from "../../../../images/users/avatar.png";

const ProfileMenu = props => {
  const [menu, setMenu] = useState(false);
  const [closing, setClosing] = useState(false); // State to handle closing animation
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!menu) return;
    const handleClickAway = (e) => {
      if (
        btnRef.current &&
        typeof btnRef.current.contains === 'function' &&
        !btnRef.current.contains(e.target) &&
        menuRef.current &&
        typeof menuRef.current.contains === 'function' &&
        !menuRef.current.contains(e.target)
      ) {
        setMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [menu]);

  // Declare a new state variable, which we'll call "menu"
  const [username, setusername] = useState("Admin");
  const [roleId, setRoleId] = useState(null); // Use state for roleId

  useEffect(() => {
    const obj = JSON.parse(sessionStorage.getItem("authUser"));
    if (obj) {
      setusername(obj.name);
      setRoleId(obj.role_id); // Set roleId in state
    }
  }, []);

  const handleClose = () => {
    setClosing(true); // Trigger closing animation
    setTimeout(() => {
      setMenu(false); // Close the menu after animation
      setClosing(false); // Reset closing state
    }, 300); // Match the duration of the CSS animation
  };

  return (
    <React.Fragment>
      <Dropdown
        isOpen={menu}
        toggle={() => setMenu(!menu)}
        className="d-inline-block"
        ref={menuRef} // Replace innerRef with ref
      >
        <DropdownToggle
          className="btn header-item d-flex align-items-center"
          id="page-header-user-dropdown"
          tag="button"
          style={{
            color: 'white',
            background: 'transparent',
            border: 'none',
          }}
          ref={btnRef} // Replace innerRef with ref
        >
          <img
            className="rounded-circle header-profile-user"
            src={user1}
            alt="Header Avatar"
          />
          <span className="d-none d-xl-inline-block ms-2 me-1">{username}</span>
          <i className="mdi mdi-menu-down d-none d-xl-inline-block" style={{ fontSize: '1.2rem', color: '#fff' }} />
        </DropdownToggle>
        <DropdownMenu
          className={`dropdown-menu-end ${closing ? 'dropdown-closing' : ''}`} // Add class for closing animation
          style={{
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(44,62,80,0.18)',
            padding: '10px 0',
          }}
          onClick={handleClose} // Ensure dropdown closes on click
          aria-hidden={!menu} // Dynamically set aria-hidden based on menu state
        >
          {roleId !== 2 && roleId !== 3 && ( // Ensure roleId is compared as a string
            <>

             <Link
                to="/invoice"
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose(); // Use handleClose to close with animation
                }}
              >
              <i className="mdi mdi-file-document-outline me-2" style={{ fontSize: '1.2rem' }}></i>                
              <span>{props.t("Invoice")}</span>
              </Link>
              <Link
                to="/accounts"
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose(); // Use handleClose to close with animation
                }}
              >
                <i className="mdi mdi-bank-outline me-2" style={{ fontSize: '1.2rem' }}></i>
                <span>{props.t("Accounts")}</span>
              </Link>

              <Link
                to="/examcode"
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose(); // Use handleClose to close with animation
                }}
              >
                <i className="mdi mdi-key-outline me-2" style={{ fontSize: '1.2rem' }}></i>
                <span>{props.t("Examcode")}</span>
              </Link>
              
              <Link
                to="/settings"
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose(); // Use handleClose to close with animation
                }}
              >
                <i className="mdi mdi-cog-outline me-2" style={{ fontSize: '1.2rem' }}></i>
                <span>{props.t("Settings")}</span>
              </Link>
            </>
          )}
          <Link
            to="/logout"
            className="dropdown-item"
            onClick={(e) => {
              e.stopPropagation();
              setMenu(false);
            }}
          >
            <i className="mdi mdi-power me-2 text-danger" style={{ fontSize: '1.2rem' }}></i>
            <span>{props.t("Logout")}</span>
          </Link>
        </DropdownMenu>
      </Dropdown>
    </React.Fragment>
  );
};

ProfileMenu.propTypes = {
  success: PropTypes.any,
  t: PropTypes.any
};


export default withRouter(
  (withTranslation()(ProfileMenu))
);
