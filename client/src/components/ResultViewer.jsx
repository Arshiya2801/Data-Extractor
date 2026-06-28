import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, DollarSign, Fingerprint } from 'lucide-react';

const StatusBadge = ({ status }) => {
  let color, bg, Icon, label;
  
  switch (status) {
    case 'ok':
      color = 'var(--status-ok)';
      bg = 'var(--status-ok-bg)';
      Icon = CheckCircle;
      label = 'OK';
      break;
    case 'low_confidence':
    case 'missing':
      color = 'var(--status-warn)';
      bg = 'var(--status-warn-bg)';
      Icon = AlertTriangle;
      label = status === 'missing' ? 'Missing' : 'Low Confidence';
      break;
    case 'failed':
      color = 'var(--status-error)';
      bg = 'var(--status-error-bg)';
      Icon = XCircle;
      label = 'Failed Check';
      break;
    default:
      color = 'var(--text-secondary)';
      bg = 'rgba(255,255,255,0.05)';
      Icon = AlertTriangle;
      label = status || 'Unknown';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: bg,
      color: color,
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      <Icon size={12} />
      {label}
    </span>
  );
};

const FieldRow = ({ name, data, depth = 0 }) => {
  // If it's an array of objects
  if (Array.isArray(data.value)) {
    return (
      <div style={{ marginLeft: depth * 16, marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{name}</span>
          <StatusBadge status={data.status} />
        </div>
        {data.sanity_error && (
          <div style={{ color: 'var(--status-warn)', fontSize: '0.8rem', marginBottom: '8px' }}>
            Warning: {data.sanity_error}
          </div>
        )}
        <div style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: '16px' }}>
          {data.value.map((item, i) => (
            <div key={i} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Item {i + 1}
              </span>
              {Object.entries(item).map(([k, v]) => (
                <FieldRow key={k} name={k} data={v} depth={0} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single value
  return (
    <div style={{ 
      marginLeft: depth * 16, 
      marginBottom: '12px',
      padding: '12px',
      backgroundColor: 'rgba(0,0,0,0.15)',
      borderRadius: '6px',
      border: '1px solid var(--border-color)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
          <StatusBadge status={data.status} />
        </div>
        {data.value !== null && (
          <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '1rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
            {String(data.value)}
          </span>
        )}
      </div>
      
      {data.sanity_error && (
         <div style={{ color: 'var(--status-warn)', fontSize: '0.85rem', marginTop: '4px' }}>
           ⚠ {data.sanity_error}
         </div>
      )}
      
      {data.source_text && (
        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderTop: '1px dotted var(--border-color)', paddingTop: '8px' }}>
          Source: "{data.source_text}"
        </div>
      )}
    </div>
  );
};

const ResultViewer = ({ result }) => {
  if (!result) return null;

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Extraction Results
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Fingerprint size={14} />
            Job: <span style={{ fontFamily: 'monospace' }}>{result.jobId || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--status-ok)' }}>
            <DollarSign size={14} />
            Cost: ${(result.costUsd || 0).toFixed(4)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>
          Document Status: <StatusBadge status={result.documentStatus === 'success' ? 'ok' : result.documentStatus === 'partial' ? 'low_confidence' : 'failed'} />
        </h3>
      </div>

      <div>
        {result.fields && Object.entries(result.fields).map(([name, data]) => (
           <FieldRow key={name} name={name} data={data} />
        ))}
      </div>
    </div>
  );
};

export default ResultViewer;
