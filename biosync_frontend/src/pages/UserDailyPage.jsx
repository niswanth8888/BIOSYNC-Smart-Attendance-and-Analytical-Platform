import React, { useState } from 'react';
import { Calendar, Search, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';

export default function UserDailyPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const dailyData = [
    { id: 'STU_001', name: 'Michael Chang', sector: 'CS-B', check_in: '08:42:15', status: 'PRESENT' },
    { id: 'STU_002', name: 'Sarah Jenkins', sector: 'CS-B', check_in: '09:12:33', status: 'LATE' },
    { id: 'STU_003', name: 'David Miller', sector: 'CS-B', check_in: '-', status: 'ABSENT' },
    { id: 'STU_004', name: 'Jessica Wong', sector: 'CS-B', check_in: '08:30:11', status: 'PRESENT' },
    { id: 'STU_005', name: 'Robert Taylor', sector: 'CS-B', check_in: '08:55:00', status: 'PRESENT' },
    { id: 'STU_006', name: 'Emma Wilson', sector: 'CS-B', check_in: '-', status: 'ABSENT' },
  ];

  const filteredData = dailyData.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '3rem', borderBottom: '1px solid #222', paddingBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            DAILY_TRANSACTION_LOG
          </h1>
          <p style={{ color: '#444', fontSize: '0.75rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active monitoring of attendance packets for current temporal cycle.
          </p>
        </div>
        <div style={{ 
          padding: '0.75rem 1.5rem', 
          background: '#111', 
          border: '1px solid #222', 
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Calendar size={16} color="#666" />
          <span style={{ fontSize: '0.875rem', fontWeight: '900', color: '#fff', fontFamily: 'monospace' }}>{today}</span>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        {[
          { label: 'EXPECTED_OBJECTS', value: '420', color: '#fff' },
          { label: 'DETECTED_PRESENT', value: '388', color: '#fff' },
          { label: 'ANOMALY_ABSENT', value: '32', color: '#f87171' },
          { label: 'LATE_SYNC', value: '14', color: '#fbbf24' },
        ].map((stat, i) => (
          <div key={i} style={{ background: '#141414', border: '1px solid #222', padding: '1.25rem', borderRadius: '2px' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: '800', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{stat.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div style={{ background: '#141414', border: '1px solid #222', borderRadius: '2px' }}>
        
        {/* Table Header / Search */}
        <div style={{ padding: '2rem', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <UserCheck size={18} color="#fff" />
            <h2 style={{ fontSize: '0.875rem', fontWeight: '900', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase' }}>REALTIME_STREAM</h2>
          </div>
          
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
            <input 
              type="text" 
              placeholder="SEARCH OBJECT_ID..." 
              className="ud-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', backgroundColor: '#0a0a0a', border: '1px solid #222', fontSize: '0.7rem', fontWeight: '700' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#111', borderBottom: '2px solid #222' }}>
                <th style={{ padding: '1.25rem 2rem', fontSize: '0.65rem', color: '#444', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: '900' }}>OBJECT_ID</th>
                <th style={{ padding: '1.25rem 2rem', fontSize: '0.65rem', color: '#444', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: '900' }}>IDENTIFIER_NAME</th>
                <th style={{ padding: '1.25rem 2rem', fontSize: '0.65rem', color: '#444', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: '900' }}>PUNCH_COORD</th>
                <th style={{ padding: '1.25rem 2rem', fontSize: '0.65rem', color: '#444', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: '900' }}>STATUS_CODE</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr 
                  key={row.id} 
                  style={{ borderBottom: '1px solid #222', transition: 'background-color 0.1s ease' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#1e1e1e'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '1.25rem 2rem', color: '#666', fontSize: '0.7rem', fontWeight: '800', fontFamily: 'monospace' }}>
                    {row.id}
                  </td>
                  <td style={{ padding: '1.25rem 2rem', color: '#fff', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.05em' }}>
                    {row.name.toUpperCase()}
                  </td>
                  <td style={{ padding: '1.25rem 2rem', color: row.check_in === '-' ? '#444' : '#fff', fontSize: '0.75rem', fontWeight: '900', fontFamily: 'monospace' }}>
                    {row.check_in}
                  </td>
                  <td style={{ padding: '1.25rem 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {row.status === 'PRESENT' && <CheckCircle2 size={14} color="#fff" />}
                      {row.status === 'ABSENT' && <XCircle size={14} color="#f87171" />}
                      {row.status === 'LATE' && <Clock size={14} color="#fbbf24" />}
                      <span style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: '900',
                        color: row.status === 'PRESENT' ? '#fff' : row.status === 'ABSENT' ? '#f87171' : '#fbbf24',
                        letterSpacing: '0.05em'
                      }}>
                        {row.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #222', background: '#0a0a0a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: '#444', fontWeight: '800', textTransform: 'uppercase' }}>
            LOG_BUFFER: {filteredData.length} ACTIVE_RECORDS
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ width: '24px', height: '24px', background: '#111', border: '1px solid #222', color: '#444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={12} />
            </button>
            <button style={{ width: '24px', height: '24px', background: '#fff', border: '1px solid #fff', color: '#000', fontWeight: '900', fontSize: '0.6rem' }}>01</button>
            <button style={{ width: '24px', height: '24px', background: '#111', border: '1px solid #222', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
