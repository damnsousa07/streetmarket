// ================================================================
// SOCIALFLOAT.JSX – Componente flutuante com redes sociais
// ================================================================
// Exibe um botao flutuante no canto inferior direito com links para
// Instagram e Email (abre Gmail web com destinatario preenchido).
// ================================================================

import { useState } from 'react';

export default function SocialFloat() {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen(!open);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
    }}>
      {/* Botao principal que abre/fecha o popover */}
      <button
        onClick={toggle}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#007bff',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s',
        }}
        aria-label="Redes sociais"
      >
        {open ? '✕' : '📱'}
      </button>

      {/* Popover com os links sociais */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '0',
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '140px',
          }}
        >
          {/* Link para Instagram */}
          <a
            href="https://instagram.com/streetmarketpt"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: '#333',
              padding: '6px 8px',
              borderRadius: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ fontSize: '20px' }}>📸</span> Instagram
          </a>

          {/* Link para Email (abre Gmail web) */}
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=streetmarketptt@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: '#333',
              padding: '6px 8px',
              borderRadius: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ fontSize: '20px' }}>✉️</span> Email
          </a>
        </div>
      )}
    </div>
  );
}