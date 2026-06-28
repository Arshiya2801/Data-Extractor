import React, { useState } from 'react';
import UploadForm from './components/UploadForm';
import SchemaEditor from './components/SchemaEditor';
import ResultViewer from './components/ResultViewer';
import { extractData } from './api/client';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [schemaText, setSchemaText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleExtract = async () => {
    if (!file) {
      setError("Please upload a document first.");
      return;
    }
    if (!schemaText.trim()) {
      setError("Please define what fields you want to extract.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await extractData(file, schemaText);
      setResult(data);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ 
            padding: '16px', 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
            borderRadius: '16px',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <FileText size={48} color="var(--text-primary)" />
          </div>
        </div>
        <h1>Data Extractor Engine</h1>
        <p>Intelligent document parsing with self-correcting validation and confidence tracking.</p>
      </header>

      <div style={{ display: 'flex', gap: '24px', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '24px' }}>
        <UploadForm file={file} setFile={setFile} />
        <SchemaEditor schemaText={schemaText} setSchemaText={setSchemaText} />
      </div>

      {error && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'var(--status-error-bg)', 
          border: '1px solid var(--status-error)', 
          borderRadius: 'var(--radius-md)',
          color: 'var(--status-error)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px', marginBottom: '32px' }}>
        <button 
          className="btn btn-primary" 
          style={{ padding: '16px 48px', fontSize: '1.1rem', borderRadius: '30px' }}
          onClick={handleExtract}
          disabled={loading || !file || !schemaText.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="lucide-spin" size={20} style={{ animation: 'spin 2s linear infinite' }} />
              Extracting & Validating...
            </>
          ) : (
            'Run Extraction Pipeline'
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {result && <ResultViewer result={result} />}
    </div>
  );
}

export default App;
