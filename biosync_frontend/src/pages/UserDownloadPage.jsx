import React from 'react';
import { FileDown, FileSpreadsheet, FileText, Lock, ShieldCheck, Database, Server } from 'lucide-react';

export default function UserDownloadPage() {
  const reportModules = [
    { id: 'RPT_MTL_01', title: 'MONTHLY_SECTOR_AUDIT', format: 'EXCEL', size: '2.4MB', icon: <FileSpreadsheet size={24} /> },
    { id: 'RPT_SUM_02', title: 'QUARTERLY_SUMMARY_LOG', format: 'PDF', size: '1.8MB', icon: <FileText size={24} /> },
    { id: 'RPT_ANM_03', title: 'ANOMALY_DETECTION_REPORT', format: 'PDF', size: '0.9MB', icon: <ShieldCheck size={24} /> },
    { id: 'DB_RAW_04', title: 'RAW_TRANSACTION_DUMP', format: 'CSV', size: '12.6MB', icon: <Database size={24} /> },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '3rem', borderBottom: '1px solid #222', paddingBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          DOCUMENT_RETRIEVAL_CENTER
        </h1>
        <p style={{ color: '#444', fontSize: '0.75rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Authorized terminal for generating and downloading authenticated attendance intelligence.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Left: Report Generator Configuration */}
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid #222', background: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Server size={18} color="#fff" />
            <h2 style={{ fontSize: '0.875rem', fontWeight: '900', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase' }}>GENERATOR_INPUTS</h2>
          </div>
          
          <div style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <label className="input-label">SELECT_TEMPORAL_DOMAIN</label>
              <select className="input-tech" style={{ backgroundColor: '#0a0a0a', border: '1px solid #222' }}>
                <option>MARCH_2026</option>
                <option>FEBRUARY_2026</option>
                <option>JANUARY_2026</option>
                <option>Q1_CONSOLIDATED_2026</option>
              </select>
            </div>

            <div>
              <label className="input-label">SPECIFY_OBJECT_CLASS</label>
              <select className="input-tech" style={{ backgroundColor: '#0a0a0a', border: '1px solid #222' }}>
                <option>ALL_DEPARTMENTS (MASTER)</option>
                <option>COMPUTER_SCIENCE_DEPT</option>
                <option>INFORMATION_TECHNOLOGY</option>
                <option>ELECTRONICS_ENGINEERING</option>
              </select>
            </div>

            <div>
              <label className="input-label">AUTHENTICATION_PROTOCOL</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#0a0a0a', border: '1px solid #222' }}>
                <Lock size={16} color="#444" />
                <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: '800', letterSpacing: '0.05em' }}>ENCRYPTED_PDF_GENERATION_ENABLED</span>
              </div>
            </div>

            <button className="btn-solid" style={{ height: '54px', backgroundColor: '#fff', color: '#000', fontWeight: '900', border: 'none', borderRadius: '2px', marginTop: '1rem' }}>
              INITIALIZE_GENERATION_SEQUENCE
            </button>
          </div>
        </div>

        {/* Right: Available Downloads List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {reportModules.map((report) => (
            <div 
              key={report.id} 
              className="ud-card" 
              style={{ 
                background: '#141414', 
                border: '1px solid #222', 
                borderRadius: '2px', 
                padding: '1.5rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => {
                e.currentTarget.style.borderColor = '#444';
                e.currentTarget.style.background = '#1a1a1a';
              }}
              onMouseOut={e => {
                e.currentTarget.style.borderColor = '#222';
                e.currentTarget.style.background = '#141414';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ color: '#666' }}>
                  {report.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fff', margin: '0 0 0.25rem 0', letterSpacing: '0.05em' }}>
                    {report.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6rem', color: '#444', fontWeight: '900', letterSpacing: '0.05em' }}>{report.id}</span>
                    <span style={{ width: '4px', height: '4px', background: '#222', borderRadius: '50%' }}></span>
                    <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: '900', padding: '2px 6px', background: '#222', borderRadius: '2px' }}>{report.format}</span>
                    <span style={{ fontSize: '0.6rem', color: '#666', fontWeight: '800' }}>{report.size}</span>
                  </div>
                </div>
              </div>

              <button 
                style={{ 
                  background: 'transparent', 
                  border: '1px solid #333', 
                  color: '#fff', 
                  padding: '0.75rem', 
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#fff';
                }}
              >
                <FileDown size={18} />
              </button>
            </div>
          ))}

          <div style={{ marginTop: 'auto', padding: '1.5rem', background: '#0a0a0a', border: '1px dashed #222', borderRadius: '2px', textAlign: 'center' }}>
            <p style={{ color: '#444', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              Older archives moving to cold storage. Contact IT for records prior to 2025.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
