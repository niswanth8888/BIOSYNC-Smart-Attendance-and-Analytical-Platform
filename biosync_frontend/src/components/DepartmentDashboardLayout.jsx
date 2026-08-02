import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import DepartmentSidebar from './DepartmentSidebar';
import { useAuth } from '../utils/AuthContext';
import { Bell, User } from 'lucide-react';

export default function DepartmentDashboardLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Route protection
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Helper to get page title based on path
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/department/dashboard': return 'Department Dashboard';
      case '/department/range-report': return 'Range Attendance Analytics';
      default: return 'BIOSYNC Department Portal';
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: '#0f0f0f' }}>
      {/* Sidebar - Fixed width */}
      <DepartmentSidebar />
      
      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        marginLeft: '260px', 
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        
        {/* Top Header */}
        <header style={{
          height: '70px',
          padding: '0 2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1a1a1a',
          borderBottom: '1px solid #222',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <div>
            <h1 style={{ 
              fontSize: '1rem', 
              fontWeight: '800',
              color: '#fff',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              {getPageTitle()}
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <button style={{ 
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Bell size={18} />
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#fff'
              }}></span>
            </button>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              padding: '0.4rem 1rem',
              background: '#222',
              borderRadius: '2px',
              border: '1px solid #333'
            }}>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                borderRadius: '2px', 
                background: '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <User size={14} />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                DEPT. MODERATOR
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ 
          padding: '3rem', 
          flex: 1,
          overflowY: 'auto'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </div>
        
      </main>
    </div>
  );
}
