
import PropTypes from 'prop-types';
import React from "react";

const DeleteModal = ({ section, show, onDeleteClick, onCloseClick }) => {
  if (!show) return null;
  return (
    <div className="examcode-modal-backdrop" style={{zIndex: 2000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(44,62,80,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <style>{`
        .examcode-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(44,62,80,0.18);
          z-index: 1050;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .examcode-modal {
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 8px 32px rgba(44,62,80,0.18);
          padding: 24px 32px;
          min-width: 340px;
          max-width: 90vw;
          text-align: center;
          z-index: 1060;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .examcode-modal-icon {
          font-size: 2.8rem;
          color: #ff4d4f;
          margin-bottom: 12px;
        }
        .examcode-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a2942;
          margin-bottom: 8px;
        }
        .examcode-modal-message {
          color: #5a5a5a;
          margin-bottom: 24px;
          font-size: 1.05rem;
        }
        .examcode-modal-btns {
          display: flex;
          gap: 16px;
          justify-content: center;
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
        .examcode-save-btn {
          background: #ff4d4f;
          color: #fff;
          border: none;
          border-radius: 100px;
          font-weight: 600;
          font-size: 1rem;
          padding: 8px 28px;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .examcode-save-btn:hover {
          background: #e84118;
        }
      `}</style>
      <div className="examcode-modal" style={{minWidth: 340, maxWidth: '90vw', borderRadius: 18, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: '24px 32px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div className="examcode-modal-icon" style={{fontSize: 48, color: '#ff4d4f', marginBottom: 12}}>
          <i className="mdi mdi-alert-circle-outline"></i>
        </div>
        <div className="examcode-modal-title" style={{fontWeight: 700, fontSize: 22, color: '#1a2942', marginBottom: 8}}>Delete {section ? section.charAt(0).toUpperCase() + section.slice(1) : 'Item'}?</div>
        <div className="examcode-modal-message" style={{fontSize: 16, color: '#1a2942', marginBottom: 24, textAlign: 'center'}}>Are you sure you want to delete this {section || 'item'}? This action cannot be undone.</div>
        <div className="examcode-modal-btns" style={{display: 'flex', gap: 16}}>
          <button className="examcode-cancel-btn" onClick={onCloseClick} type="button">Cancel</button>
          <button className="examcode-save-btn" onClick={onDeleteClick} type="button">Delete</button>
        </div>
      </div>
    </div>
  );
};


DeleteModal.propTypes = {
  onCloseClick: PropTypes.func,
  onDeleteClick: PropTypes.func,
  show: PropTypes.any,
  section: PropTypes.any
};

export default DeleteModal;
