import React, { useState } from 'react';
import { api } from '../utils/api';
import { ArrowDownToLine, RefreshCw, FileSpreadsheet, Server, Layers } from 'lucide-react';

export default function CombinePage() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  const handleRunCombine = async () => {
    try {
      setRunning(true);
      setStatus({ type: 'info', text: 'INITIALIZING DATA COMPILATION...' });
      
      await api.post('/run/combine', { action: 'combine_monthly' });
      
      setStatus({ type: 'success', text: 'COMPILATION SEQUENCE COMPLETE: MONTHLY SHEETS GENERATED' });
    } catch (err) {
      setStatus({ type: 'error', text: `FAULT DETECTED: ${err.message || 'PROCESS INTERRUPTED'}` });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Header Info */}
      <div style={{ marginBottom: '3rem', borderBottom: '1px solid #222', paddingBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          DATA_COMPILATION_UTILITY
        </h1>
        <p style={{ color: '#444', fontSize: '0.75rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Consolidate distributed device logs into centralized monthly architecture.
        </p>
      </div>

      <div className="ud-card" style={{ padding: '0', border: '1px solid #222', borderRadius: '2px', background: '#141414' }}>
        
        {/* Header Bar */}
        <div style={{ 
          padding: '1.25rem 2rem', 
          borderBottom: '1px solid #222', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: '#1a1a1a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Layers size={18} color="#fff" />
            <h2 style={{ fontSize: '0.875rem', fontWeight: '900', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase' }}>COMPILATION_INTERFACE</h2>
          </div>
        </div>

        <div style={{ padding: '3rem 2.5rem', textAlign: 'center', background: '#141414' }}>
          
          <div style={{ 
            width: '64px',
            height: '64px',
            borderRadius: '2px',
            background: '#0a0a0a',
            border: '1px solid #222',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem auto',
            color: '#fff'
          }}>
            <FileSpreadsheet size={32} />
          </div>

          <p style={{ 
            color: '#888', 
            marginBottom: '2.5rem', 
            lineHeight: '1.6', 
            fontSize: '0.875rem', 
            maxWidth: '450px', 
            margin: '0 auto 3rem auto',
            fontWeight: '500'
          }}>
            This operation will recursively scan internal directories for individual session logs and perform a structured merge into monthly telemetry sheets. 
            Execution time scale is proportional to dataset complexity.
          </p>

          {status.text && (
            <div style={{
              padding: '1rem 1.5rem',
              marginBottom: '3rem',
              background: status.type === 'error' ? '#221111' : status.type === 'success' ? '#111' : '#1a1a1a',
              borderLeft: `2px solid ${status.type === 'error' ? '#f87171' : status.type === 'success' ? '#fff' : '#444'}`,
              color: status.type === 'error' ? '#f87171' : '#fff',
              fontSize: '0.75rem',
              fontWeight: '700',
              textAlign: 'left',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.type === 'error' ? '#f87171' : '#fff' }}></div>
              {status.text}
            </div>
          )}

          <button 
            className="btn-solid" 
            onClick={handleRunCombine}
            disabled={running}
            style={{ 
              width: '100%', 
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              fontSize: '0.875rem',
              fontWeight: '900',
              backgroundColor: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '2px'
            }}
          >
            {running ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                INITIALIZING_SYNC...
              </>
            ) : (
              <>
                <Server size={18} />
                EXECUTE_COMBINE_PROCEDURE
              </>
            )}
          </button>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}} />
    </div>
  );
}
