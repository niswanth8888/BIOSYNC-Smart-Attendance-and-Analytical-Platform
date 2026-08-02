import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { Play, Save, Settings2, RefreshCw, Terminal, Cpu } from 'lucide-react';

export default function SdkControlPage() {
  const pollIntervalRef = useRef(null);
  const pollingEndTimeRef = useRef(null);
  const previousRunRef = useRef(null);
  const [sdkConfig, setSdkConfig] = useState({
    TARGET_DEVICES: null,
    AUTO_CLEAR_LOGS: false,
    FETCH_DATE: new Date().toISOString().split('T')[0]
  });
  const [targetDevicesText, setTargetDevicesText] = useState('null');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [sdkStatus, setSdkStatus] = useState({
    successful_devices: [],
    offline_devices: [],
    no_log_devices: [],
    error_devices: [],
    last_run: null
  });
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetchSdkBootstrap();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const fetchSdkLastStatus = async (silent = false) => {
    try {
      if (!silent) setStatusLoading(true);
      const data = await api.request(`/sdk/last-status?_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      console.log('full /sdk/last-status response:', data);
      
      if (data && typeof data === 'object') {
        if (Array.isArray(data.offline_devices)) {
          console.log('sdkStatus.last_run:', data.last_run);
          console.log('offline_devices:', data.offline_devices);
          console.log('error_devices:', data.error_devices);
          console.log('no_log_devices:', data.no_log_devices);
          
          if (previousRunRef.current && data.last_run === previousRunRef.current) {
            console.log('Ignoring stale old run data during active poll...', previousRunRef.current);
            return;
          }
          
          if (data.last_run) {
            previousRunRef.current = data.last_run;
          }
          
          const combined = Array.from(new Set([
            ...(data.offline_devices || []),
            ...(data.error_devices || []),
            ...(data.no_log_devices || [])
          ]));
          console.log('final combinedIssueDevices:', combined);

          setSdkStatus({
            successful_devices: data.successful_devices || [],
            offline_devices: data.offline_devices || [],
            no_log_devices: data.no_log_devices || [],
            error_devices: data.error_devices || [],
            last_run: data.last_run || null
          });
          
          setStatusLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to load SDK last status:', err);
      if (!silent) setStatusLoading(false);
    }
  };

  const fetchSdkBootstrap = async () => {
    try {
      setLoading(true);
      setStatusLoading(true);
      const data = await api.request(`/sdk/bootstrap?_=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (data && typeof data === 'object') {
        if (data.config) {
          setSdkConfig((prev) => ({
            ...prev,
            ...data.config
          }));
          
          const devices = data.config.TARGET_DEVICES !== undefined ? data.config.TARGET_DEVICES : data.config.TARGET_DEVICE;
          if (devices === null) {
            setTargetDevicesText('null');
          } else if (Array.isArray(devices)) {
            setTargetDevicesText(JSON.stringify(devices));
          } else {
            setTargetDevicesText(devices ? JSON.stringify(devices) : 'null');
          }
        }
        
        if (data.status && Array.isArray(data.status.offline_devices)) {
          if (previousRunRef.current) {
            console.log('Ignoring bootstrap status to prevent overwrite of active run data.');
          } else {
            if (data.status.last_run) previousRunRef.current = data.status.last_run;
            setSdkStatus({
              successful_devices: data.status.successful_devices || [],
              offline_devices: data.status.offline_devices || [],
              no_log_devices: data.status.no_log_devices || [],
              error_devices: data.status.error_devices || [],
              last_run: data.status.last_run || null
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load SDK bootstrap:', err);
      showMessage('error', 'Failed to load configuration. Using defaults.');
    } finally {
      setLoading(false);
      setStatusLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleSaveSettings = async () => {
    try {
      let parsedValue = null;
      const textVal = targetDevicesText.trim();
      
      if (textVal && textVal.toLowerCase() !== 'null') {
        try {
          parsedValue = JSON.parse(textVal);
        } catch (e) {
          showMessage('error', 'Invalid TARGET_DEVICES format');
          return;
        }
      }

      setSaving(true);
      const payload = {
        TARGET_DEVICES: parsedValue,
        AUTO_CLEAR_LOGS: sdkConfig.AUTO_CLEAR_LOGS,
        FETCH_DATE: sdkConfig.FETCH_DATE
      };
      
      await api.request('/sdk/config', {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload)
      });
      
      showMessage('success', 'CONFIGURATION PARAMETERS UPDATED');
    } catch (err) {
      showMessage('error', err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    pollIntervalRef.current = setInterval(() => {
      if (pollingEndTimeRef.current && Date.now() >= pollingEndTimeRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        pollingEndTimeRef.current = null;
        setRunning(false);
        return;
      }
      fetchSdkLastStatus(true);
    }, 2000); // 2 seconds
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (pollingEndTimeRef.current && Date.now() < pollingEndTimeRef.current) {
          fetchSdkLastStatus(true);
          startPolling();
        } else if (pollingEndTimeRef.current && Date.now() >= pollingEndTimeRef.current) {
          setRunning(false);
          pollingEndTimeRef.current = null;
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } else {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleRunPull = async () => {
    try {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      setSdkStatus({
        successful_devices: [],
        offline_devices: [],
        no_log_devices: [],
        error_devices: [],
        last_run: null
      });
      
      setRunning(true);
      setStatusLoading(true);
      
      const res = await api.request('/run/sdk_pull', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ run: true })
      });
      
      showMessage('success', 'SDK TELEMETRY PULL INITIALIZED');
      
      // 30 seconds active polling window
      pollingEndTimeRef.current = Date.now() + 30000;
      
      // Initial fetch immediately once
      fetchSdkLastStatus(true);
      
      startPolling();
      
    } catch (err) {
      showMessage('error', err.message || 'Failed to trigger SDK Pull');
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '1rem' }}>
        <RefreshCw className="animate-spin" size={32} color="#fff" />
        <span style={{ fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.2em', color: '#666' }}>SYNCING SYSTEM CONFIG...</span>
      </div>
    );
  }

  const combinedIssueDevices = Array.from(new Set([
    ...(sdkStatus.offline_devices || []),
    ...(sdkStatus.error_devices || []),
    ...(sdkStatus.no_log_devices || [])
  ]));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Status Alert Area */}
      {message.text && (
        <div style={{
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
          background: message.type === 'success' ? '#111' : '#221111',
          borderLeft: `2px solid ${message.type === 'success' ? '#fff' : '#f87171'}`,
          color: message.type === 'success' ? '#fff' : '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.75rem',
          fontWeight: '700',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: message.type === 'success' ? '#fff' : '#f87171', boxShadow: '0 0 10px rgba(255,255,255,0.5)' }}></div>
          {message.text}
        </div>
      )}

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
            <Cpu size={18} color="#fff" />
            <h2 style={{ fontSize: '0.875rem', fontWeight: '900', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase' }}>SDK CORE CONFIGURATION</h2>
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#444', letterSpacing: '0.1em' }}>SYS_REF: BIOSYNC_01</span>
        </div>

        <div style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '2.5rem', background: '#141414' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Device Selection */}
            <div style={{ gridColumn: 'span 2' }}>
              <label className="input-label" htmlFor="targetDevicesText">TARGET_DEVICES_ARRAY</label>
              <textarea
                id="targetDevicesText"
                className="input-tech"
                value={targetDevicesText}
                onChange={(e) => setTargetDevicesText(e.target.value)}
                placeholder='null (ALL) | ["DEVICE_A", "DEVICE_B"]'
                rows={5}
                style={{ 
                  resize: 'none', 
                  backgroundColor: '#0a0a0a', 
                  border: '1px solid #222', 
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  padding: '1rem' 
                }}
              />
              <div style={{ fontSize: '0.7rem', color: '#444', marginTop: '0.75rem', fontWeight: '600' }}>
                INFO: Use <code style={{ color: '#fff' }}>null</code> for broad casting. Use JSON formatted array for specific identifiers.
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="input-label" htmlFor="fetchDate">TARGET_FETCH_PERIOD</label>
              <input 
                type="date"
                id="fetchDate"
                className="input-tech"
                value={sdkConfig.FETCH_DATE}
                onChange={(e) => setSdkConfig({ ...sdkConfig, FETCH_DATE: e.target.value })}
                style={{ backgroundColor: '#0a0a0a', border: '1px solid #222' }}
              />
            </div>

            {/* Auto Clear Toggle */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              background: '#0a0a0a',
              border: '1px solid #222',
              borderRadius: '2px'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#fff', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AUTO_PURGE_LOGS</div>
                <div style={{ fontSize: '0.6rem', color: '#444', fontWeight: '700' }}>DATA IS DELETED AFTER SYNC</div>
              </div>
              
              <button 
                type="button"
                onClick={() => setSdkConfig({ ...sdkConfig, AUTO_CLEAR_LOGS: !sdkConfig.AUTO_CLEAR_LOGS })}
                style={{
                  width: '40px',
                  height: '20px',
                  borderRadius: '2px',
                  background: sdkConfig.AUTO_CLEAR_LOGS ? '#fff' : '#222',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '1px',
                  background: sdkConfig.AUTO_CLEAR_LOGS ? '#000' : '#444',
                  position: 'absolute',
                  top: '4px',
                  left: sdkConfig.AUTO_CLEAR_LOGS ? '24px' : '4px',
                  transition: 'all 0.2s ease'
                }}></div>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            paddingTop: '2.5rem',
            borderTop: '1px solid #222'
          }}>
            <button 
              className="btn-solid" 
              onClick={handleSaveSettings}
              disabled={saving}
              style={{ 
                flex: 1, 
                backgroundColor: '#222', 
                color: '#fff', 
                height: '50px',
                border: '1px solid #333'
              }}
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              COMMMIT PARAMETERS
            </button>
            
            <button 
              className="btn-solid" 
              onClick={handleRunPull}
              disabled={running}
              style={{ 
                flex: 1, 
                backgroundColor: '#fff', 
                color: '#000', 
                height: '50px',
                border: 'none',
                fontWeight: '900'
              }}
            >
              {running ? <RefreshCw className="animate-spin" size={16} /> : <Terminal size={16} />}
              {running ? 'PULL IN PROGRESS...' : 'EXECUTE SDK PULL'}
            </button>
          </div>

        </div>
      </div>

      {/* Offline Devices Section */}
      <div className="ud-card" style={{ padding: '0', border: '1px solid #222', borderRadius: '2px', background: '#141414', marginTop: '2rem' }}>
        <div style={{ 
          padding: '1.25rem 2rem', 
          borderBottom: '1px solid #222', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: '#1a1a1a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Terminal size={18} color="#f87171" />
            <h2 style={{ fontSize: '0.875rem', fontWeight: '900', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase', color: '#fff' }}>ISSUE DEVICES</h2>
          </div>
        </div>
        
        <div style={{ padding: '2.5rem 2rem', background: '#141414' }}>
          {statusLoading ? (
            <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: '700', letterSpacing: '0.05em' }}>LOADING STATUS...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ 
                background: '#0a0a0a', 
                padding: '1.25rem', 
                border: '1px solid #222', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: '#f87171',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '400px',
                overflowY: 'auto',
                lineHeight: '1.5'
              }}>
                {JSON.stringify(combinedIssueDevices)}
              </div>
              
              {sdkStatus.last_run && (
                <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: '800', letterSpacing: '0.1em' }}>
                  LAST RUN: {sdkStatus.last_run}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
