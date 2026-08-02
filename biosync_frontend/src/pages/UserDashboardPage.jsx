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
import {
  Users, UserCheck, UserX, Calendar,
  RefreshCw, AlertTriangle,
} from 'lucide-react';
import { api } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DEPT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
  '#a855f7', '#84cc16',
];

export default function UserDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/analytics/today');
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Analytics unavailable. Please check the server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // ─── Build stat cards from API response ───────────────────────────────────
  const totalStudents = analytics?.total_students ?? 0;
  const totalPresent  = analytics?.total_present  ?? 0;
  const totalAbsent   = analytics?.total_absent   ?? 0;
  const presentPct    = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
  const absentPct     = totalStudents > 0 ? Math.round((totalAbsent  / totalStudents) * 100) : 0;

  const statCards = [
    {
      label:  'Total Present Today',
      value:  totalPresent,
      icon:   <UserCheck size={22} />,
      color:  '#10b981',
      glow:   'rgba(16,185,129,0.15)',
      sub:    `${presentPct}% attendance rate`,
    },
    {
      label:  'Total Absent Today',
      value:  totalAbsent,
      icon:   <UserX size={22} />,
      color:  '#ef4444',
      glow:   'rgba(239,68,68,0.15)',
      sub:    `${absentPct}% absence rate`,
    },
    {
      label:  'Total Students',
      value:  totalStudents,
      icon:   <Users size={22} />,
      color:  '#6366f1',
      glow:   'rgba(99,102,241,0.15)',
      sub:    'Enrolled this academic year',
    },
  ];

  // ─── Build chart from department_chart array ───────────────────────────────
  // Expected shape: [{ department: "CSE", attendance_pct: 87 }, ...]
  const deptChart = analytics?.department_chart ?? [];

  const barData = {
    labels: deptChart.map(d => d.department),
    datasets: [
      {
        label: 'Attendance %',
        data: deptChart.map(d => d.attendance_pct),
        backgroundColor: deptChart.map((_, i) => DEPT_COLORS[i % DEPT_COLORS.length]),
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: deptChart.map(
          (_, i) => DEPT_COLORS[i % DEPT_COLORS.length] + 'bb',
        ),
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleColor: '#fff',
        bodyColor: '#9ca3af',
        borderColor: '#2c2c2c',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: { label: ctx => ` ${ctx.parsed.y}% attendance` },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: '#1e1e1e' },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Inter', size: 12 },
          callback: v => v + '%',
        },
        border: { color: '#2c2c2c' },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Inter', size: 12, weight: '600' },
        },
        border: { color: '#2c2c2c' },
      },
    },
  };

  // ─── Shared styles ─────────────────────────────────────────────────────────
  const cardBase = {
    background: '#1a1a1a',
    border: '1px solid #2c2c2c',
    borderRadius: '16px',
    padding: '2rem',
  };

  const centeredBox = {
    ...cardBase,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    gap: '1rem',
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', margin: 0 }}>
            Today's Analytics
          </h1>
          <p style={{ color: '#9ca3af', margin: '0.25rem 0 0 0', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} /> {today}
          </p>
        </div>
        <div style={{ ...centeredBox, minHeight: '360px' }}>
          <RefreshCw size={32} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#9ca3af', margin: 0, fontWeight: '600' }}>Fetching analytics...</p>
          <p style={{ color: '#666', margin: 0, fontSize: '0.8rem' }}>
            GET /analytics/today
          </p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', margin: 0 }}>
            Today's Analytics
          </h1>
          <p style={{ color: '#9ca3af', margin: '0.25rem 0 0 0', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} /> {today}
          </p>
        </div>
        <div style={{ ...centeredBox, minHeight: '360px', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={28} color="#ef4444" />
          </div>
          <p style={{ color: '#fff', margin: 0, fontWeight: '700', fontSize: '1rem' }}>
            Analytics Unavailable
          </p>
          <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.85rem', textAlign: 'center', maxWidth: '380px' }}>
            {error}
          </p>
          <button
            onClick={fetchAnalytics}
            style={{
              marginTop: '0.5rem',
              padding: '0.65rem 1.5rem',
              background: '#1e1e2e',
              border: '1px solid #6366f1',
              borderRadius: '8px',
              color: '#818cf8',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#2a2a3e'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#1e1e2e'; }}
          >
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Main dashboard ────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
            Today's Analytics
          </h1>
          <p style={{ color: '#9ca3af', margin: '0.25rem 0 0 0', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} /> {today}
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: '1px solid #2c2c2c',
            borderRadius: '8px',
            color: '#9ca3af',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#818cf8'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#2c2c2c';  e.currentTarget.style.color = '#9ca3af'; }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {statCards.map((card, i) => (
          <div
            key={i}
            style={{
              background: '#1a1a1a',
              border: `1px solid ${card.color}33`,
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: `0 0 20px ${card.glow}`,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'default',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 12px 30px ${card.glow}`;
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 0 20px ${card.glow}`;
            }}
          >
            {/* Decorative glow orb */}
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '100px', height: '100px', borderRadius: '50%',
              background: card.glow, pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', position: 'relative' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px',
                background: card.color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: card.color,
              }}>
                {card.icon}
              </div>
              <div style={{
                fontSize: '0.7rem', fontWeight: '600', color: card.color,
                background: card.color + '15', padding: '3px 8px',
                borderRadius: '20px', border: `1px solid ${card.color}33`,
              }}>
                Live
              </div>
            </div>

            <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#fff', lineHeight: 1, marginBottom: '0.4rem', position: 'relative' }}>
              {card.value.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#9ca3af', marginBottom: '0.25rem' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '0.75rem', color: card.color + 'bb' }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Department Bar Chart ── */}
      <div style={cardBase}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: 0 }}>
              Department Attendance Average — Today
            </h2>
            <p style={{ color: '#9ca3af', margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
              Live from <code style={{ color: '#818cf8', fontSize: '0.78rem' }}>/analytics/today</code>
            </p>
          </div>
          {/* Color legend */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {deptChart.map((d, i) => (
              <div key={d.department} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#9ca3af' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                {d.department}
              </div>
            ))}
          </div>
        </div>

        {deptChart.length === 0 ? (
          <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: '0.75rem' }}>
            <AlertTriangle size={28} color="#f59e0b" />
            <p style={{ margin: 0, fontWeight: '600' }}>No department data returned by the API.</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
              Check that <code>/analytics/today</code> returns a <code>department_chart</code> array.
            </p>
          </div>
        ) : (
          <div style={{ height: '320px' }}>
            <Bar data={barData} options={barOptions} />
          </div>
        )}

        {/* Department detail tiles */}
        {deptChart.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', borderTop: '1px solid #2c2c2c', paddingTop: '1.5rem' }}>
            {deptChart.map((d, i) => (
              <div key={d.department} style={{
                flex: '1 1 120px',
                background: '#0f0f0f',
                border: `1px solid ${DEPT_COLORS[i % DEPT_COLORS.length]}33`,
                borderRadius: '10px',
                padding: '0.9rem 1.1rem',
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: DEPT_COLORS[i % DEPT_COLORS.length], marginBottom: '0.35rem' }}>
                  {d.department}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', lineHeight: 1 }}>
                  {d.attendance_pct}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
