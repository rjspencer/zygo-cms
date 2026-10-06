import { useState } from 'react';

export const Dropdown = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Options
        </button>
      </div>

      {isOpen && (
        <div
          data-testid="dropdown-menu"
          style={{
            position: 'absolute',
            right: 0,
            marginTop: '8px',
            width: '224px',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            borderRadius: '4px',
            border: '1px solid #e5e7eb',
            zIndex: 10
          }}
        >
          <div style={{ padding: '4px 0' }}>
            <a href="#" style={{ display: 'block', padding: '8px 16px', color: '#374151', textDecoration: 'none' }}>Account settings</a>
            <a href="#" style={{ display: 'block', padding: '8px 16px', color: '#374151', textDecoration: 'none' }}>Support</a>
            <a href="#" style={{ display: 'block', padding: '8px 16px', color: '#374151', textDecoration: 'none' }}>License</a>
          </div>
        </div>
      )}
    </div>
  );
};
