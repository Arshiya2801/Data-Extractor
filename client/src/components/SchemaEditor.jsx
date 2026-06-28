import React, { useState } from 'react';
import { Database, List, Edit3 } from 'lucide-react';

const SchemaEditor = ({ schemaText, setSchemaText }) => {
  const [mode, setMode] = useState('text'); // 'text' or 'builder'

  return (
    <div className="glass-panel" style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={24} color="var(--accent-primary)" />
          2. Define Extraction Fields
        </h2>
      </div>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
        Describe what you want to extract in plain English, or provide a JSON schema.
      </p>

      <div className="input-group">
        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Edit3 size={14} />
          Extraction Prompt / Schema
        </label>
        <textarea
          className="input-field"
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          placeholder="e.g. 'I need the invoice number, the date, the vendor name, and a list of line items with their amounts.'"
          style={{ minHeight: '180px', fontFamily: schemaText.startsWith('{') ? 'monospace' : 'inherit' }}
        />
      </div>
      
      {schemaText.startsWith('{') && (
        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--status-ok)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--status-ok)' }}></div>
          Valid JSON Schema Detected
        </div>
      )}
    </div>
  );
};

export default SchemaEditor;
