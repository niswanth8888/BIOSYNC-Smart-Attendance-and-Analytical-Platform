import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { 
  ServerCog, 
  CalendarRange, 
  LogOut,
  Fingerprint
} from 'lucide-react';

export default function DepartmentSidebar() {
  const { logout } = useAuth();

  const navItems = [
    { path: '/department/dashboard', label: 'DASHBOARD', icon: <ServerCog size={18} /> },
    { path: '/department/range-report', label: 'RANGE REPORT', icon: <CalendarRange size={18} /> },
  ];

  return (
    <aside style={{
      width: '260px',
      background: '#141414',
      borderRight: '1px solid #222',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 40
    }}>
      
      {/* Brand area */}
      <div style={{
        padding: '2.5rem 1.5rem',
        borderBottom: '1px solid #222',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '2px',
          background: '#fff',
          color: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Fingerprint size={20} />
        </div>
        <div>
          <h2 style={{ 
            fontSize: '1rem', 
            fontWeight: '900', 
            margin: 0,
            letterSpacing: '0.2em',
            color: '#fff'
          }}>
            BIOSYNC
          </h2>
          <span style={{ 
            fontSize: '0.6rem', 
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: '700'
          }}>Department Portal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `dept-nav-link ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        .dept-nav-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.8rem 1rem;
          border-radius: 6px;
          text-decoration: none;
          color: #888;
          background: transparent;
          border-left: 3px solid transparent;
          font-weight: 600;
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          transition: all 0.2s ease;
        }
        .dept-nav-link:hover:not(.active) {
          background: #1a1a1a;
          color: #bbb;
        }
        .dept-nav-link.active {
          color: #fff;
          background: #1a1a1a;
          border-left: 3px solid #888;
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.05);
          font-weight: 800;
        }
      ` }} />

      {/* Footer */ }
      <div style={{ padding: '1.5rem', borderTop: '1px solid #222' }}>
        <button 
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            width: '100%',
            padding: '0.75rem',
            background: 'transparent',
            border: '1px solid #333',
            color: '#888',
            borderRadius: '2px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: '700',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#222';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = '#444';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#888';
            e.currentTarget.style.borderColor = '#333';
          }}
        >
          <LogOut size={16} />
          <span>Terminate Session</span>
        </button>
      </div>
    </aside>
  );
}
