import React from 'react';
import './Modal.scss';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  className = ''
}) => {
  if (!isOpen) return null;

  return (
    <div className="mapa-mesas-modal-bg" onClick={onClose}>
      <div 
        className={`mapa-mesas-modal ${className}`} 
        onClick={e => e.stopPropagation()}
      >
        <button 
          className="mapa-mesas-modal-close" 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            width: '32px',
            height: '32px',
            borderRadius: '16px',
            background: '#f3f4f6',
            border: 'none',
            color: '#18181b',
            fontSize: '20px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
          onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
        >
          ×
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default Modal; 