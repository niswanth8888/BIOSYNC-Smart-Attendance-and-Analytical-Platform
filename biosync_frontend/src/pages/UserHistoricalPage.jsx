import React, { useState, useRef, useEffect } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  BarChart2, Download, FileText, FileSpreadsheet,
  TrendingUp, RefreshCw, AlertTriangle, ChevronDown,
  X, Check, Calendar,
} from 'lucide-react';
import { api } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_DEPARTMENTS = [
  'AIML','CSE','IT','MECH','CIVIL','ECE','EEE',
  'BIOTECH','CHEMICAL','AIDS','CSBS','MBA','MCA',
];

const YEAR_OPTIONS = [
  { label: 'All Years', value: 'ALL' },
  { label: 'I Year',    value: 'I'   },
  { label: 'II Year',   value: 'II'  },
  { label: 'III Year',  value: 'III' },
  { label: 'IV Year',   value: 'IV'  },
];

// Muted blue-gray bar palette (not bright)
const BAR_COLORS = [
  '#4f6080', '#5a7a9e', '#3d5a7a', '#6b8fad',
  '#7ca3c2', '#3a5068', '#8eafc8', '#507090',
  '#628caa', '#4a6882',
];

// ─── Custom Multi-Select Dropdown ─────────────────────────────────────────────
function MultiSelectDropdown({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = val => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };
  const clear = e => { e.stopPropagation(); onChange([]); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#0b0b0b', border: '1px solid #2a2a2a',
          borderRadius: '8px', padding: '0.65rem 1rem',
          cursor: 'pointer', minHeight: '42px', gap: '0.5rem',
          transition: 'border-color 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.borderColor = '#3d5a7a'}
        onMouseOut={e => e.currentTarget.style.borderColor = '#2a2a2a'}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', flex: 1 }}>
          {selected.length === 0
            ? <span style={{ color: '#555', fontSize: '0.85rem' }}>{placeholder}</span>
            : selected.map(s => (
                <span key={s} style={{
                  background: '#1e2e3e', color: '#7ca3c2', border: '1px solid #3d5a7a',
                  borderRadius: '4px', padding: '1px 6px', fontSize: '0.72rem', fontWeight: '600',
                }}>
                  {s}
                </span>
              ))
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          {selected.length > 0 && (
            <X size={13} color="#666" onClick={clear} style={{ cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.color = '#fff'}
              onMouseOut={e => e.currentTarget.style.color = '#666'}
            />
          )}
          <ChevronDown size={14} color="#555"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </div>
      </div>

      {/* Dropdown list */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#161616', border: '1px solid #2a2a2a',
          borderRadius: '8px', zIndex: 100, maxHeight: '220px', overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          {options.map(opt => {
            const sel = selected.includes(opt);
            return (
              <div
                key={opt}
                onClick={() => toggle(opt)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.875rem',
                  color: sel ? '#7ca3c2' : '#9ca3af',
                  background: sel ? '#1a2535' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#1a1a1a'; }}
                onMouseOut={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
              >
                <span>{opt}</span>
                {sel && <Check size={13} color="#7ca3c2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function UserHistoricalPage() {
  const today = new Date().toISOString().split('T')[0];
  const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate]       = useState(sevenAgo);
  const [endDate, setEndDate]           = useState(today);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [year, setYear]                 = useState('ALL');
  const [classInput, setClassInput]     = useState('');

  const [status, setStatus]     = useState('idle'); // idle | loading | success | error
  const [chartData, setChartData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [rangeLabel, setRangeLabel] = useState('');

  // ─── Validate ───────────────────────────────────────────────────────────────
  const validate = () => {
    if (!startDate)        return 'Start Date is required.';
    if (!endDate)          return 'End Date is required.';
    if (endDate < startDate) return 'End Date must be on or after Start Date.';
    return null;
  };

  // ─── API Call ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const err = validate();
    if (err) { setErrorMsg(err); setStatus('error'); return; }

    setChartData(null);   // clear old chart immediately
    setStatus('loading');
    setErrorMsg('');
    setRangeLabel(`${startDate} → ${endDate}`);

    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const data = await api.get(`/analytics/history?${params.toString()}`);
      const raw = Array.isArray(data) ? data : (data?.department_chart ?? []);
      setChartData(raw);
      setStatus('success');
    } catch (e) {
      setErrorMsg(e.message || 'Failed to fetch analytics data.');
      setStatus('error');
    }
  };

  // ─── Chart config ────────────────────────────────────────────────────────────
  const barConfig = chartData && chartData.length > 0 ? {
    labels: chartData.map(d => d.department),
    datasets: [{
      label: 'Attendance %',
      data: chartData.map(d => d.attendance_pct),
      backgroundColor: chartData.map((_, i) => BAR_COLORS[i % BAR_COLORS.length]),
      borderRadius: 6,
      borderSkipped: false,
      hoverBackgroundColor: chartData.map((_, i) => BAR_COLORS[i % BAR_COLORS.length] + 'ee'),
      barThickness: 36,
    }],
  } : null;

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#161616',
        titleColor: '#e2e8f0',
        bodyColor: '#9ca3af',
        borderColor: '#2a2a2a',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: { label: ctx => ` ${ctx.parsed.y}% attendance` },
      },
    },
    scales: {
      y: {
        min: 0, max: 100,
        grid: { color: '#1a1a1a' },
        ticks: { color: '#666', font: { family: 'Inter', size: 11 }, callback: v => v + '%' },
        border: { color: '#2a2a2a' },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { family: 'Inter', size: 12, weight: '600' } },
        border: { color: '#2a2a2a' },
      },
    },
  };

  // ─── Shared styles ────────────────────────────────────────────────────────────
  const card = {
    background: '#161616',
    border: '1px solid #2a2a2a',
    borderRadius: '14px',
    padding: '2rem',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };

  const inputStyle = {
    background: '#0b0b0b',
    border: '1px solid #2a2a2a',
    color: '#e2e8f0',
    padding: '0.65rem 1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontFamily: 'Inter, sans-serif',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: '600',
    color: '#666',
    marginBottom: '0.45rem',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: '#1a2535', border: '1px solid #2a3a4a',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <BarChart2 size={22} color="#7ca3c2" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#e2e8f0', margin: 0, letterSpacing: '-0.01em' }}>
            Historical Attendance Analytics
          </h1>
          <p style={{ color: '#555', margin: '0.2rem 0 0 0', fontSize: '0.875rem' }}>
            Analyze attendance trends across departments, years and classes.
          </p>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      <div style={{ ...card, marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
          <div style={{ width: '3px', height: '18px', background: '#3d5a7a', borderRadius: '2px' }} />
          <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#9ca3af', margin: 0, letterSpacing: '0.03em' }}>
            FILTERS
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem' }}>

          {/* Start Date */}
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#3d5a7a')}
              onBlur={e  => (e.target.style.borderColor = '#2a2a2a')}
            />
          </div>

          {/* End Date */}
          <div>
            <label style={labelStyle}>End Date</label>
            <input type="date" value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#3d5a7a')}
              onBlur={e  => (e.target.style.borderColor = '#2a2a2a')}
            />
          </div>

          {/* Department Multi-Select */}
          <div>
            <label style={labelStyle}>Departments</label>
            <MultiSelectDropdown
              options={ALL_DEPARTMENTS}
              selected={selectedDepts}
              onChange={setSelectedDepts}
              placeholder="All Departments"
            />
          </div>

          {/* Year Dropdown */}
          <div>
            <label style={labelStyle}>Year</label>
            <select value={year} onChange={e => setYear(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
              onFocus={e => (e.target.style.borderColor = '#3d5a7a')}
              onBlur={e  => (e.target.style.borderColor = '#2a2a2a')}
            >
              {YEAR_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Specific Class Input */}
          <div>
            <label style={labelStyle}>Specific Classes</label>
            <input type="text" value={classInput}
              onChange={e => setClassInput(e.target.value)}
              placeholder='e.g. III AIML, II CSE A'
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#3d5a7a')}
              onBlur={e  => (e.target.style.borderColor = '#2a2a2a')}
            />
            <span style={{ fontSize: '0.68rem', color: '#444', marginTop: '0.3rem', display: 'block' }}>
              Comma-separated. Leave blank for all.
            </span>
          </div>

          {/* Generate Button */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <button
              onClick={handleGenerate}
              disabled={status === 'loading'}
              style={{
                width: '100%', height: '42px',
                background: status === 'loading' ? '#1e2e3e' : '#3d5a7a',
                color: '#e2e8f0',
                border: '1px solid transparent',
                borderRadius: '8px',
                fontWeight: '700', fontSize: '0.875rem',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                boxShadow: status === 'loading' ? 'none' : '0 0 0 0 #3d5a7a',
              }}
              onMouseOver={e => {
                if (status !== 'loading') {
                  e.currentTarget.style.background = '#4f6f8f';
                  e.currentTarget.style.boxShadow = '0 0 14px rgba(61,90,122,0.55)';
                }
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = status === 'loading' ? '#1e2e3e' : '#3d5a7a';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {status === 'loading'
                ? <><RefreshCw size={14} style={{ animation: 'spin .9s linear infinite' }} /> Generating...</>
                : <><TrendingUp size={14} /> Generate Analytics</>
              }
            </button>
          </div>

        </div>

        {/* Inline error (validation / API) */}
        {status === 'error' && (
          <div style={{
            marginTop: '1.25rem', padding: '0.75rem 1rem',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.6rem',
            color: '#fca5a5', fontSize: '0.85rem', fontWeight: '500',
          }}>
            <AlertTriangle size={15} /> {errorMsg}
          </div>
        )}
      </div>

      {/* ── Chart Card ── */}
      <div style={{ ...card, marginBottom: '2rem', minHeight: '420px' }}>

        {/* Chart header */}
        <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid #1e1e1e', paddingBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#c9d5e0', margin: '0 0 0.25rem 0' }}>
            Attendance Trend — Selected Range
          </h2>
          <p style={{ color: '#444', margin: 0, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={13} />
            {rangeLabel
              ? <span style={{ color: '#5a7a9e' }}>{rangeLabel}</span>
              : 'No range selected yet'}
          </p>
        </div>

        {/* IDLE */}
        {status === 'idle' && (
          <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <BarChart2 size={44} color="#1e1e1e" />
            <p style={{ color: '#444', margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>
              Select filters and click Generate Analytics
            </p>
            <p style={{ color: '#333', margin: 0, fontSize: '0.8rem' }}>
              Results will appear here as a bar chart.
            </p>
          </div>
        )}

        {/* LOADING */}
        {status === 'loading' && (
          <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <RefreshCw size={32} color="#3d5a7a" style={{ animation: 'spin .9s linear infinite' }} />
            <p style={{ color: '#666', margin: 0, fontWeight: '600' }}>
              Fetching analytics data...
            </p>
            <code style={{ color: '#3d5a7a', fontSize: '0.78rem' }}>
              GET /analytics/history?start_date={startDate}&end_date={endDate}
            </code>
          </div>
        )}

        {/* ERROR (no chart) */}
        {status === 'error' && (
          <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={32} color="#ef4444" />
            <p style={{ color: '#fca5a5', margin: 0, fontWeight: '600' }}>Could not load chart data</p>
            <p style={{ color: '#666', margin: 0, fontSize: '0.8rem' }}>{errorMsg}</p>
          </div>
        )}

        {/* SUCCESS — empty */}
        {status === 'success' && chartData && chartData.length === 0 && (
          <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <BarChart2 size={36} color="#f59e0b" />
            <p style={{ color: '#e2e8f0', margin: 0, fontWeight: '600' }}>No Records Found</p>
            <p style={{ color: '#666', margin: 0, fontSize: '0.8rem' }}>
              The API returned no data for this date range. Try a broader range.
            </p>
          </div>
        )}

        {/* SUCCESS — chart */}
        {status === 'success' && barConfig && (
          <div style={{ height: '320px' }}>
            <Bar data={barConfig} options={barOptions} />
          </div>
        )}

        {/* Department value tiles */}
        {status === 'success' && chartData && chartData.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '0.85rem',
            marginTop: '1.75rem',
            borderTop: '1px solid #1e1e1e',
            paddingTop: '1.5rem',
          }}>
            {chartData.map((d, i) => (
              <div key={d.department} style={{
                background: '#0b0b0b',
                border: `1px solid ${BAR_COLORS[i % BAR_COLORS.length]}44`,
                borderRadius: '8px',
                padding: '0.85rem 1rem',
              }}>
                <div style={{ fontSize: '0.68rem', fontWeight: '700', color: BAR_COLORS[i % BAR_COLORS.length], marginBottom: '0.3rem', letterSpacing: '0.06em' }}>
                  {d.department}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#e2e8f0', lineHeight: 1 }}>
                  {d.attendance_pct}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Export Buttons ── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Download Department Report', icon: <BarChart2 size={15} /> },
          { label: 'Download Year Report',       icon: <FileSpreadsheet size={15} /> },
          { label: 'Download Class Report',      icon: <FileText size={15} /> },
        ].map((btn, i) => (
          <button key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              color: '#666',
              border: '1px solid #2a2a2a',
              borderRadius: '10px',
              fontWeight: '600', fontSize: '0.85rem',
              cursor: 'pointer', transition: 'all 0.2s ease',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#161616';
              e.currentTarget.style.borderColor = '#4f6f8f';
              e.currentTarget.style.color = '#9ca3af';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#2a2a2a';
              e.currentTarget.style.color = '#666';
            }}
          >
            <Download size={14} />
            {btn.label}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
        select option { background: #161616; color: #e2e8f0; }
      `}</style>
    </div>
  );
}
