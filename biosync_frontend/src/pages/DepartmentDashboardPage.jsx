import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Users, UserX, UserCheck, Activity, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../utils/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function DepartmentDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      // Safely read from localStorage using the same key as login
      const rawUser = localStorage.getItem('biosync_department_user');

      if (!rawUser) {
        throw new Error('Missing department: User not found in local storage.');
      }

      // Parse the localStorage value safely
      let parsedUser;
      try {
        parsedUser = JSON.parse(rawUser);
      } catch (parseError) {
        throw new Error('Missing department: Invalid user format in local storage.');
      }

      // Extract department value
      const departmentName = parsedUser?.department;

      if (!departmentName) {
         throw new Error('Missing department: Department name not found in user data.');
      }

      // Build the request path safely and encode
      const encodedDept = encodeURIComponent(departmentName);
      const endpoint = `/department/dashboard-summary/${encodedDept}?_=${Date.now()}`;

      // Using the exact shared API utility pattern like Range Report
      // Since api.get doesn't allow custom options and ngrok blocks browser GET requests
      // without ngrok-skip-browser-warning, using api.request to bypass ngrok warning page
      const response = await api.request(endpoint, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      // Handle the case where ngrok bypass didn't work and it returned HTML (null from api.js)
      if (!response) {
        throw new Error('Failed to fetch valid JSON. Check backend connectivity or ngrok warnings.');
      }

      setData(response);
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let intervalId = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        fetchDashboardData();
      }, 60000); // 60 seconds
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData();
        startPolling();
      } else {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    // Initial fetch on mount
    fetchDashboardData().then((success) => {
      if (success && document.visibilityState === 'visible') {
        startPolling();
      }
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={32} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem' }}>Loading Live Data...</p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin { 100% { transform: rotate(360deg); } }
        ` }} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: '2rem', background: '#1a0505', border: '1px solid #3a0e0e', borderRadius: '4px', textAlign: 'center' }}>
        <AlertTriangle size={32} color="#f87171" style={{ marginBottom: '1rem' }} />
        <h3 style={{ color: '#fff', margin: '0 0 0.5rem 0', fontWeight: '700' }}>Error Loading Dashboard</h3>
        <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>
        <button 
          onClick={async () => { 
            setLoading(true); 
            await fetchDashboardData(); 
          }}
          style={{ marginTop: '1rem', background: '#fff', color: '#000', border: 'none', padding: '0.5rem 1rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px' }}
        >
          RETRY
        </button>
      </div>
    );
  }

  const { college, department, comparison } = data || {};

  // Sort comparison so logged-in department is first
  let sortedComparison = [];
  if (comparison && department) {
    const mainDept = comparison.find(d => d.name === department.name);
    const others = comparison.filter(d => d.name !== department.name);
    if (mainDept) {
      sortedComparison = [mainDept, ...others];
    } else {
      sortedComparison = [...others];
    }
  }

  const deptData = {
    labels: sortedComparison.map(d => d.name),
    datasets: [
      {
        label: 'Attendance %',
        data: sortedComparison.map(d => d.attendance_percentage),
        backgroundColor: sortedComparison.map(d => d.name === department?.name ? '#60a5fa' : '#4ade80'),
        borderRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#222',
        titleColor: '#fff',
        bodyColor: '#aaa',
        borderColor: '#444',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => `Attendance: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      x: {
        grid: { color: '#222', drawBorder: false },
        ticks: { color: '#888', font: { size: 10 } }
      },
      y: {
        grid: { color: '#222', drawBorder: false },
        ticks: { color: '#888', font: { size: 10 }, stepSize: 20 },
        max: 100
      }
    }
  };

  const StatCard = ({ title, value, icon }) => (
    <div style={{
      background: '#141414',
      border: '1px solid #222',
      borderRadius: '4px',
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <div>
        <p style={{ 
          color: '#888', 
          fontSize: '0.7rem', 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em', 
          margin: '0 0 0.5rem 0',
          fontWeight: '600'
        }}>
          {title}
        </p>
        <h3 style={{ 
          color: '#fff', 
          fontSize: '1.75rem', 
          fontWeight: '800', 
          margin: 0 
        }}>
          {value}
        </h3>
      </div>
      <div style={{
        background: '#1a1a1a',
        padding: '0.75rem',
        borderRadius: '4px',
        border: '1px solid #222'
      }}>
        {icon}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '800', 
            color: '#fff', 
            margin: '0 0 0.5rem 0',
            letterSpacing: '0.05em' 
          }}>
            Department Command Center
          </h2>
          <p style={{ 
            color: '#888', 
            margin: 0, 
            fontSize: '0.875rem', 
            letterSpacing: '0.02em' 
          }}>
            Daily attendance intelligence for {department?.name || 'your department'}
          </p>
        </div>
        {loading && (
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1a1a1a', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #222' }}>
             <Loader2 size={14} color="#4ade80" style={{ animation: 'spin 1s linear infinite' }} />
             <span style={{ color: '#4ade80', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.05em' }}>LIVE UPDATING</span>
           </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: '#2a0000', borderLeft: '2px solid #ff4444', color: '#ffaaaa', fontSize: '0.75rem', fontWeight: '600' }}>
          Data refresh failed: {error}. Showing last known data.
        </div>
      )}

      {/* College Totals */}
      <div>
        <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: '700', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={16} color="#60a5fa" />
          Entire College
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '1.5rem' 
        }}>
          <StatCard title="College Present" value={college?.present || 0} icon={<UserCheck size={20} color="#4ade80" />} />
          <StatCard title="College Absent" value={college?.absent || 0} icon={<UserX size={20} color="#f87171" />} />
        </div>
      </div>

      {/* Department Totals */}
      <div>
        <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: '700', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={16} color="#fbbf24" />
          {department?.name || 'Department'} Only
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '1.5rem' 
        }}>
          <StatCard title={`${department?.name || 'Department'} Present`} value={department?.present || 0} icon={<UserCheck size={20} color="#4ade80" />} />
          <StatCard title={`${department?.name || 'Department'} Absent`} value={department?.absent || 0} icon={<UserX size={20} color="#f87171" />} />
        </div>
      </div>

      {/* Chart Section */}
      <div style={{
        background: '#141414',
        border: '1px solid #222',
        borderRadius: '4px',
        padding: '2rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.25rem 0' }}>
            Department Comparison – Today
          </h3>
          <p style={{ color: '#666', fontSize: '0.75rem', margin: 0 }}>
            Attendance percentage across all departments (Logged-in department shown first and highlighted)
          </p>
        </div>
        
        <div style={{ height: '350px', width: '100%' }}>
          <Bar data={deptData} options={chartOptions} />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      ` }} />
    </div>
  );
}

