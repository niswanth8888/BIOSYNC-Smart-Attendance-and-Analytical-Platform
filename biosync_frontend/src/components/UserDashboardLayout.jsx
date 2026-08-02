import React, { useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import { useAuth } from '../utils/AuthContext';
import { Bell, LogOut, UserCircle, Menu } from 'lucide-react';

export default function UserDashboardLayout() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarWidth = sidebarCollapsed ? '72px' : '252px';

  return (
    <div style={{ display: 'flex', width: '100%', backgroundColor: '#0f0f0f', minHeight: '100vh' }}>

      {/* Sidebar */}
      <UserSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
      />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        marginLeft: sidebarWidth,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Top Header */}
        <header style={{
          height: '64px',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#111',
          borderBottom: '1px solid #2c2c2c',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}>

          {/* Left: Toggle + Page label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              style={{
                background: 'transparent', border: 'none',
                color: '#9ca3af', cursor: 'pointer', display: 'flex',
                alignItems: 'center', padding: '0.4rem', borderRadius: '6px',
                transition: 'all 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
            >
              <Menu size={20} />
            </button>
            <span style={{
              fontSize: '0.875rem', fontWeight: '600', color: '#9ca3af',
              letterSpacing: '0.05em',
            }}>
              Department Analytics Portal
            </span>
          </div>

          {/* Right: Notification + User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

            {/* Bell */}
            <button style={{
              background: 'transparent', border: 'none', color: '#9ca3af',
              cursor: 'pointer', position: 'relative', display: 'flex',
              alignItems: 'center', padding: '0.4rem', borderRadius: '6px',
              transition: 'all 0.15s',
            }}
              onMouseOver={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
            >
              <Bell size={18} />
              <span style={{
                position: 'absolute', top: '4px', right: '4px',
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: '#6366f1', border: '2px solid #111',
              }} />
            </button>

            <div style={{ width: '1px', height: '24px', backgroundColor: '#2c2c2c' }} />

            {/* User chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.4rem 0.9rem',
              background: '#1a1a1a', borderRadius: '10px', border: '1px solid #2c2c2c',
            }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <UserCircle size={18} color="#fff" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fff', lineHeight: 1.2 }}>
                  Computer Science
                </span>
                <span style={{ fontSize: '0.68rem', color: '#9ca3af', fontWeight: '500' }}>
                  Department User
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', color: '#9ca3af',
                cursor: 'pointer', padding: '0.4rem', borderRadius: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#2a1515'; e.currentTarget.style.color = '#f87171'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
            >
              <LogOut size={18} />
            </button>

          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '2.5rem', flex: 1 }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </div>

      </main>
    </div>
  );
}
