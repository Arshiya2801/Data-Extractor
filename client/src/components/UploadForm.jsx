import React, { useRef, useState } from 'react';
import { UploadCloud, File, X } from 'lucide-react';

const UploadForm = ({ file, setFile }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="glass-panel" style={{ flex: 1 }}>
      <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <UploadCloud size={24} color="var(--accent-primary)" />
        1. Upload Document
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
        Upload a PDF (scanned or native) or a Spreadsheet (xlsx/csv).
      </p>

      {!file ? (
        <div 
          className="upload-dropzone"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <UploadCloud size={48} color={dragActive ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
          <div>
            <p style={{ fontWeight: 500, fontSize: '1.1rem', marginBottom: '4px' }}>
              Drag & Drop your file here
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              or click to browse
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            onChange={handleChange}
            style={{ display: 'none' }}
            accept=".pdf,.csv,.xlsx,.xls"
          />
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              padding: '10px', 
              backgroundColor: 'var(--accent-glow)', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <File size={24} color="var(--accent-primary)" />
            </div>
            <div>
              <p style={{ fontWeight: 500 }}>{file.name}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '8px' }} 
            onClick={removeFile}
            title="Remove file"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
