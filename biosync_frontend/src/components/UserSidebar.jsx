import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, LogOut, Fingerprint, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../utils/AuthContext';

export default function UserSidebar({ collapsed, onToggle }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/user', label: 'Dashboard', icon: <LayoutDashboard size={20} />, exact: true },
    { path: '/user/historical', label: 'Historical Analytics', icon: <BarChart2 size={20} />, exact: false },
  ];

  const sidebarWidth = collapsed ? '72px' : '252px';

  return (
    <aside style={{
      width: sidebarWidth,
      minWidth: sidebarWidth,
      backgroundColor: '#111',
      borderRight: '1px solid #2c2c2c',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 40,
      transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
    }}>

      {/* Brand / Logo */}
      <div style={{
        padding: collapsed ? '1.5rem 0' : '1.75rem 1.5rem',
        borderBottom: '1px solid #2c2c2c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: '0.75rem',
        minHeight: '72px',
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #2d4a65, #4f6f8f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Fingerprint size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#fff', letterSpacing: '0.05em', lineHeight: 1.1 }}>
                BIOSYNC
              </div>
              <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: '500', letterSpacing: '0.1em' }}>
                DEPT. PORTAL
              </div>
            </div>
          </div>
        )}

        {collapsed && (
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #2d4a65, #4f6f8f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Fingerprint size={20} color="#fff" />
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: collapsed ? '1.25rem 0' : '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            title={collapsed ? item.label : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '0.85rem',
              padding: collapsed ? '0.85rem 0' : '0.75rem 1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? '#7ca3c2' : '#9ca3af',
              backgroundColor: isActive ? '#172030' : 'transparent',
              fontWeight: isActive ? '700' : '500',
              fontSize: '0.875rem',
              transition: 'all 0.15s ease',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: isActive ? '0 0 10px rgba(61,90,122,0.25)' : 'none',
              borderLeft: isActive && !collapsed ? '3px solid #3d5a7a' : isActive && collapsed ? 'none' : '3px solid transparent',
            })}
            onMouseOver={e => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.backgroundColor = '#1a1a1a';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseOut={e => {
              const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#9ca3af';
              }
            }}
          >
            <span style={{ flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div style={{ padding: collapsed ? '1rem 0' : '1rem 0.75rem', borderTop: '1px solid #2c2c2c' }}>
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '0.75rem',
            padding: collapsed ? '0.75rem 0' : '0.75rem 1rem',
            background: 'transparent',
            border: '1px solid #2c2c2c',
            color: '#9ca3af',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            transition: 'all 0.15s ease',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseOver={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#444'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#2c2c2c'; }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '0.75rem',
            padding: collapsed ? '0.75rem 0' : '0.75rem 1rem',
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'all 0.15s ease',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseOver={e => { e.currentTarget.style.background = '#2a1515'; e.currentTarget.style.color = '#f87171'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
