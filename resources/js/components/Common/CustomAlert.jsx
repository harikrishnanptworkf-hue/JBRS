import React from 'react';

const CustomAlert = ({ open, message, severity, onClose, duration = 3000 }) => {
  const [visible, setVisible] = React.useState(open);
  const [fade, setFade] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setVisible(true);
      setFade(false);
      const timer = setTimeout(() => setFade(true), duration - 400);
      const closeTimer = setTimeout(() => {
        setVisible(false);
        onClose && onClose();
      }, duration);
      return () => { clearTimeout(timer); clearTimeout(closeTimer); };
    }
  }, [open, duration, onClose]);
  if (!visible) return null;
  const iconClass = severity === 'success' ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline';
  return (
    <div style={{
      position: 'fixed',
      top: 80,
      left: 0,
      right: 0,
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
      transition: 'opacity 0.4s',
      opacity: fade ? 0 : 1,
    }}>
      <div style={{
        minWidth: 340,
        maxWidth: '90vw',
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 8px 32px rgba(44,62,80,0.18)',
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        pointerEvents: 'auto',
        borderLeft: severity === 'success' ? '6px solid #27ae60' : '6px solid #ff4d4f',
      }}>
        <span style={{ fontSize: 32, color: severity === 'success' ? '#27ae60' : '#ff4d4f' }}>
          <i className={'mdi ' + iconClass}></i>
        </span>
        <span style={{ fontWeight: 600, color: '#1a2942', fontSize: 18 }}>{message}</span>
        <button onClick={() => { setVisible(false); onClose && onClose(); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 22, color: '#aaa', cursor: 'pointer' }}>&times;</button>
      </div>
    </div>
  );
};

export default CustomAlert;
