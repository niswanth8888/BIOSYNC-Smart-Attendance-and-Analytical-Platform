import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { api } from '../utils/api';
import { LogIn, Fingerprint, ChevronDown } from 'lucide-react';

export default function LoginPage() {
  const [role, setRole] = useState('admin'); // 'admin' or 'department_user'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (role === 'admin') {
        const response = await api.post('/admin/login', { username, password });
        login(role);
        navigate('/');
      } else if (role === 'department_user') {
        const response = await api.post('/department/login', { username, password });
        
        // Store the returned department user data
        localStorage.setItem('biosync_department_user', JSON.stringify({
          role: response?.role || 'department',
          department: response?.department || '',
          display_name: response?.display_name || '',
          username: username
        }));
        
        login(role);
        navigate('/department/dashboard');
      } else {
        // Fallback for any other user role
        const endpoint = '/user/login';
        await api.post(endpoint, { username, password });
        login(role);
        navigate('/user');
      }
    } catch (err) {
      setError(err.message || 'Invalid username or password');
      
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        console.warn('Backend unreachable. Using demo login.');
        if (username === 'admin' && password === 'admin') {
          if (role === 'admin') {
            login(role);
            navigate('/');
          } else if (role === 'department_user') {
            localStorage.setItem('biosync_department_user', JSON.stringify({
              role: 'department',
              department: 'DEMO',
              display_name: 'Demo Department',
              username: 'admin'
            }));
            login(role);
            navigate('/department/dashboard');
          } else {
            login(role);
            navigate('/user');
          }
        } else {
          setError('Backend offline. Use admin/admin to login to UI demo.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: 'Inter, sans-serif'
    }}>
      
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '3rem 2.5rem',
        backgroundColor: '#141414',
        border: '1px solid #222',
        borderRadius: '2px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        
        {/* Brand Area */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-flex',
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: '1.5rem',
            color: '#fff'
          }}>
            <Fingerprint size={48} strokeWidth={1.5} />
          </div>
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '800', 
            letterSpacing: '0.2em', 
            color: '#fff', 
            textTransform: 'uppercase',
            margin: '0 0 0.5rem 0' 
          }}>
            BIOSYNC
          </h1>
          <p style={{ 
            color: '#888', 
            fontSize: '0.75rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            fontWeight: '600',
            margin: 0 
          }}>
            Secure Biometric Platform
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {error && (
            <div style={{ 
              padding: '0.75rem', 
              background: '#2a0000', 
              borderLeft: '2px solid #ff4444',
              color: '#ffaaaa',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {error}
            </div>
          )}
          
          {/* Role Selector */}
          <div>
            <label className="input-label" htmlFor="role">Terminal Access</label>
            <div style={{ position: 'relative' }}>
              <select 
                id="role"
                className="input-tech"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ 
                  appearance: 'none', 
                  cursor: 'pointer',
                  backgroundColor: '#0f0f0f',
                  border: '1px solid #222',
                  fontSize: '0.875rem'
                }}
              >
                <option value="admin">System Administrator</option>
                <option value="department_user">Departmental User</option>
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666' }} />
            </div>
          </div>

          <div>
            <label className="input-label" htmlFor="username">Identification</label>
            <input
              id="username"
              type="text"
              className="input-tech"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username / ID"
              style={{ backgroundColor: '#0f0f0f', border: '1px solid #222', fontSize: '0.875rem' }}
              required
            />
          </div>
          
          <div>
            <label className="input-label" htmlFor="password">Security Code</label>
            <input
              id="password"
              type="password"
              className="input-tech"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ backgroundColor: '#0f0f0f', border: '1px solid #222', fontSize: '0.875rem' }}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-solid" 
            style={{ 
              marginTop: '1rem',
              backgroundColor: '#fff',
              color: '#000',
              border: 'none',
              height: '48px',
              fontSize: '0.875rem',
              fontWeight: '800'
            }}
            disabled={loading}
          >
            {loading ? 'VERIFYING...' : 'INITIALIZE LOGIN'}
          </button>
        </form>

        <div style={{ textAlign: 'center', borderTop: '1px solid #222', paddingTop: '1.5rem' }}>
          <p style={{ color: '#444', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Authorized Access Only. All transactions recorded.
          </p>
        </div>
      </div>
    </div>
  );
}
