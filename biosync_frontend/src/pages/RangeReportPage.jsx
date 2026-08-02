import React, { useState } from 'react';
import { api } from '../utils/api';
import { 
  Building2, Users, UserSquare2, 
  CalendarDays, Play, Loader2, Info, CheckCircle2, AlertCircle
} from 'lucide-react';

export default function RangeReportPage() {
  const [form, setForm] = useState({
    department: '',
    class_name: '',
    emp_code: '',
    start_date: '',
    end_date: ''
  });

  const [status, setStatus] = useState('idle'); // idle | running | success
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const validateConfig = () => {
    const hasDept = !!form.department.trim();
    const hasClass = !!form.class_name.trim();
    const hasEmp = !!form.emp_code.trim();

    if (hasDept && !hasClass && !hasEmp) return true; // Department Report
    if (!hasDept && hasClass && !hasEmp) return true; // Class Report
    if (!hasDept && hasClass && hasEmp) return true; // Student Report

    return false;
  };

  const handleGenerate = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!form.start_date || !form.end_date) {
      setErrorMsg('Start Date and End Date are required.');
      return;
    }

    if (!validateConfig()) {
      setErrorMsg('Invalid report configuration');
      return;
    }

    setStatus('running');

    try {
      // Step 1: PUT Config
      const configPayload = {
        department: form.department.trim() || null,
        class_name: form.class_name.trim() || null,
        emp_code: form.emp_code.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date
      };

      await api.put('/report/config', configPayload);

      // Step 2: POST Generation
      await api.post('/run/report', { trigger: true });

      setStatus('success');
      setSuccessMsg('Report generation started. Check terminal.');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to generate report. Server error.');
      setStatus('idle');
    }
  };

  // ─── STYLES ───
  const colors = {
    bgStart: '#0f1115',
    bgEnd: '#1a1c23',
    cardBg: '#171a21',
    border: '#2a2e37',
    textPrimary: '#ffffff',
    textMuted: '#8b949e',
    blue: '#3b82f6',
    blueHover: '#2563eb',
    red: '#ef4444',
    green: '#10b981'
  };

  const cssInputContainer = {
    position: 'relative',
    marginBottom: '1.25rem'
  };

  const cssLabel = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: '0.5rem'
  };

  const cssInput = {
    width: '100%',
    background: '#0d0f13',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '0.8rem 1rem 0.8rem 2.6rem',
    color: colors.textPrimary,
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s ease',
  };

  const iconStyle = {
    position: 'absolute',
    left: '0.9rem',
    top: '2.5rem',
    color: '#555'
  };

  return (
    <div style={{
      minHeight: '100%',
      background: `linear-gradient(135deg, ${colors.bgStart} 0%, ${colors.bgEnd} 100%)`,
      color: colors.textPrimary,
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '3rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>

      {/* Page Title */}
      <h1 style={{ 
        fontSize: '1.75rem', 
        fontWeight: '800', 
        letterSpacing: '0.05em',
        marginBottom: '2.5rem',
        textAlign: 'center'
      }}>
        BIOSYNC RANGE REPORT ENGINE
      </h1>

      {/* Centered Main Card */}
      <div className="fade-in" style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>

        {/* Validation Error */}
        {errorMsg && (
          <div className="shake" style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${colors.red}44`,
            color: colors.red,
            padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem',
            fontWeight: '600', fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} />
            {errorMsg}
          </div>
        )}

        {/* Success Message */}
        {successMsg && (
          <div className="fade-in" style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${colors.green}44`,
            color: colors.green,
            padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem',
            fontWeight: '600', fontSize: '0.85rem'
          }}>
            <CheckCircle2 size={18} />
            {successMsg}
          </div>
        )}

        {/* Form Fields */}
        <div style={cssInputContainer}>
          <label style={cssLabel}>Department</label>
          <Building2 size={18} style={iconStyle} />
          <input 
            type="text" 
            className="input-focus"
            style={cssInput} 
            value={form.department}
            onChange={e => setForm({...form, department: e.target.value})}
            placeholder="e.g. AIML"
            disabled={status === 'running'}
          />
        </div>

        <div style={cssInputContainer}>
          <label style={cssLabel}>Class Name</label>
          <Users size={18} style={iconStyle} />
          <input 
            type="text" 
            className="input-focus"
            style={cssInput} 
            value={form.class_name}
            onChange={e => setForm({...form, class_name: e.target.value})}
            placeholder="e.g. III AIML"
            disabled={status === 'running'}
          />
        </div>

        <div style={cssInputContainer}>
          <label style={cssLabel}>Employee Code</label>
          <UserSquare2 size={18} style={iconStyle} />
          <input 
            type="text" 
            className="input-focus"
            style={cssInput} 
            value={form.emp_code}
            onChange={e => setForm({...form, emp_code: e.target.value})}
            placeholder="e.g. 23148033"
            disabled={status === 'running'}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ ...cssInputContainer, flex: 1, marginBottom: 0 }}>
            <label style={cssLabel}>Start Date</label>
            <CalendarDays size={18} style={iconStyle} />
            <input 
              type="date" 
              className="input-focus dark-cal"
              style={cssInput} 
              value={form.start_date}
              onChange={e => setForm({...form, start_date: e.target.value})}
              disabled={status === 'running'}
            />
          </div>
          <div style={{ ...cssInputContainer, flex: 1, marginBottom: 0 }}>
            <label style={cssLabel}>End Date</label>
            <CalendarDays size={18} style={iconStyle} />
            <input 
              type="date" 
              className="input-focus dark-cal"
              style={cssInput} 
              value={form.end_date}
              onChange={e => setForm({...form, end_date: e.target.value})}
              disabled={status === 'running'}
            />
          </div>
        </div>

        {/* Generate Button */}
        <button 
          onClick={handleGenerate}
          disabled={status === 'running'}
          className="btn-primary"
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            background: colors.blue,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: status === 'running' ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: status === 'running' ? 0.7 : 1
          }}
        >
          {status === 'running' ? (
            <>
              <Loader2 size={20} className="spin" />
              Processing Report...
            </>
          ) : (
            <>
              <Play size={20} fill="currentColor" />
              GENERATE REPORT
            </>
          )}
        </button>
      </div>

      {/* Instructions Below */}
      <div style={{
        marginTop: '2rem',
        maxWidth: '520px',
        width: '100%',
        display: 'flex',
        gap: '1rem',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${colors.border}`,
        padding: '1.25rem',
        borderRadius: '12px',
        color: colors.textMuted
      }}>
        <Info size={20} color={colors.textMuted} style={{ flexShrink: 0 }} />
        <div>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '0.85rem', color: '#ccc' }}>Examples:</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', lineHeight: '1.7' }}>
            <li>Department = AIML <span style={{color: '#666'}}>→</span> <strong>Department report</strong></li>
            <li>Class = III AIML <span style={{color: '#666'}}>→</span> <strong>Class report</strong></li>
            <li>Class + Emp Code <span style={{color: '#666'}}>→</span> <strong>Student report</strong></li>
          </ul>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease-out; }

        @keyframes shake { 
          0%, 100% { transform: translateX(0); } 
          25% { transform: translateX(-5px); } 
          75% { transform: translateX(5px); } 
        }
        .shake { animation: shake 0.3s ease-in-out; }

        .input-focus:focus {
          border-color: ${colors.blue} !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          background: #11141a !important;
        }

        .input-focus::placeholder {
          color: #444;
        }

        .dark-cal::-webkit-calendar-picker-indicator { 
          filter: invert(0.6); 
          cursor: pointer; 
        }

        .btn-primary:hover:not(:disabled) {
          background: ${colors.blueHover} !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }
      `}} />
    </div>
  );
}
