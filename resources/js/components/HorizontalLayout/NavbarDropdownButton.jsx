import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaCog, FaKey } from "react-icons/fa"; // Import icons for settings and examcode

const menuOptions = [
  { label: "Scheduled", to: "/schedule" },
  { label: "Enquiry", to: "/enquiry" },
  { label: "Reminder", to: "/reminders" },
  { label: "Client Create", to: "/client-create" },
  { label: "Report", to: "/report" },
];
  
const NavbarDropdownButton = ({ roleId, t, setSelectedMenu }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handleClickAway = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [open]);
  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        className="navbar-dropdown-btn"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "#fff",
          border: "none",
          borderRadius: "50%",
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: open ? "0 0 16px #0271b950" : "0 1.5px 8px rgba(44,62,80,0.08)",
          transition: "box-shadow 0.3s, transform 0.3s",
          transform: open ? "scale(1.08) rotate(90deg)" : "scale(1)",
          cursor: "pointer",
          outline: "none",
        }}
      >
        <i className={open ? "mdi mdi-menu-open" : "mdi mdi-menu"} style={{ fontSize: "1.7rem", color: "#0271b9", transition: "color 0.3s" }} />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="navbar-dropdown-menu"
          style={{
            position: "absolute",
            top: 52,
            right: 0,
            minWidth: 180,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(44,62,80,0.18)",
            zIndex: 999,
            padding: "10px 0",
            animation: "dropdownFadeIn 0.3s",
          }}
        >
          {menuOptions.filter(opt => !(opt.hideFor && opt.hideFor.includes(roleId))).map(opt => (
            <Link
              key={opt.label}
              to={opt.to}
              className="navbar-dropdown-item"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 24px",
                color: "#1a2942",
                fontWeight: 500,
                fontSize: "1.08rem",
                textDecoration: "none",
                transition: "background 0.2s, color 0.2s",
              }}
              onClick={() => {
                setOpen(false);
                if (setSelectedMenu) setSelectedMenu(t ? t(opt.label) : opt.label);
              }}
            >
              {opt.icon} {t ? t(opt.label) : opt.label}
            </Link>
          ))}
        </div>
      )}
      <style>{`
        .navbar-dropdown-btn:active {
          background: #e3e6ef;
        }
        .navbar-dropdown-item:hover {
          background: #f6f8fa;
          color: #0271b9;
        }
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NavbarDropdownButton;