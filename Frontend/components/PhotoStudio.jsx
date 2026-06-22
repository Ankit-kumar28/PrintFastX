// components/PhotoStudio.jsx  ·  High-Fidelity Unified Photo Studio Orchestrator
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Scissors, Sun, Grid } from 'lucide-react';
import DocumentEditor from './DocumentEditor';
import PassportPhotoMaker from './PassportPhotoMaker';
import IDCardEditor from './IDCardEditor';

export default function PhotoStudio({ imageSource, onClose, onSave, mode = 'customer', batchFiles = [] }) {
  const [editorMode, setEditorMode] = useState('document'); // 'document' | 'passport'
  const [wizardStep, setWizardStep] = useState(1);
  const [originalImage, setOriginalImage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imageSource) return;
    setLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setImageLoaded(true);
      setLoading(false);
    };
    img.onerror = () => {
      toast.error('Failed to load target image');
      setLoading(false);
    };
    img.src = imageSource instanceof File ? URL.createObjectURL(imageSource) : imageSource;
  }, [imageSource]);

  return (
    <div style={S.overlay} onClick={onClose}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        .studio-modal * { box-sizing: border-box; }
        
        .btn-action { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-action:hover { transform: translateY(-1.5px); filter: brightness(1.1); }
        .btn-action:active { transform: translateY(0); }
        
        @keyframes spinner-spin {
          to { transform: rotate(360deg); }
        }
        .spinner { animation: spinner-spin 1s linear infinite; }
      `}</style>

      <div className="studio-modal" style={S.card} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h3 style={S.title}>⚙️ Photo Studio</h3>
              <select 
                value={editorMode}
                onChange={e => {
                  setEditorMode(e.target.value);
                  setWizardStep(1);
                }}
                style={S.modeDropdown}
              >
                <option value="document">Standard Document Editor</option>
                <option value="passport">Passport Photo Maker</option>
                <option value="idcard">ID Card Printer</option>
              </select>
            </div>
            <p style={S.subtitle}>
              {editorMode === 'document' 
                ? 'Edit, tune, and export your documents easily' 
                : editorMode === 'passport' 
                  ? 'Professional-grade photo centering & matrix layout' 
                  : 'Crop and format front/back ID cards for standard CR80 printing'}
            </p>
          </div>

          {/* Stepper Steps UI (Only in Passport / ID Card Mode) */}
          {editorMode === 'passport' && (
            <div style={S.stepperContainer}>
              <div style={{ ...S.stepBubble, ...(wizardStep >= 1 ? S.stepActive : {}) }}>
                <Scissors size={14}/> <span>Crop & Size</span>
              </div>
              <div style={S.stepLine}/>
              <div style={{ ...S.stepBubble, ...(wizardStep >= 2 ? S.stepActive : {}) }}>
                <Sun size={14}/> <span>Tone & Background</span>
              </div>
              <div style={S.stepLine}/>
              <div style={{ ...S.stepBubble, ...(wizardStep >= 3 ? S.stepActive : {}) }}>
                <Grid size={14}/> <span>Matrix Layout</span>
              </div>
            </div>
          )}

          {editorMode === 'idcard' && (
            <div style={S.stepperContainer}>
              <div style={{ ...S.stepBubble, ...(wizardStep >= 1 ? S.stepActive : {}) }}>
                <Scissors size={14}/> <span>Crop & Tune</span>
              </div>
              <div style={S.stepLine}/>
              <div style={{ ...S.stepBubble, ...(wizardStep >= 2 ? S.stepActive : {}) }}>
                <Grid size={14}/> <span>Layout Sheet</span>
              </div>
            </div>
          )}

          <button onClick={onClose} style={S.closeBtn} className="btn-action">
            <X size={20} />
          </button>
        </div>

        {/* Content Workspace */}
        <div style={S.bodyContainer}>
          {loading ? (
            <div style={S.loadingOverlay}>
              <div className="spinner" style={S.spinnerElement} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginTop: '12px' }}>
                Loading image...
              </span>
            </div>
          ) : (
            editorMode === 'document' ? (
              <DocumentEditor
                originalImage={originalImage}
                imageLoaded={imageLoaded}
                onClose={onClose}
                onSave={onSave}
                mode={mode}
              />
            ) : editorMode === 'passport' ? (
              <PassportPhotoMaker
                originalImage={originalImage}
                imageLoaded={imageLoaded}
                onClose={onClose}
                onSave={onSave}
                mode={mode}
                wizardStep={wizardStep}
                setWizardStep={setWizardStep}
              />
            ) : (
              <IDCardEditor
                originalImage={originalImage}
                imageLoaded={imageLoaded}
                onClose={onClose}
                onSave={onSave}
                mode={mode}
                wizardStep={wizardStep}
                setWizardStep={setWizardStep}
                batchFiles={batchFiles}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px'
  },
  card: {
    background: '#ffffff',
    borderRadius: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '1080px',
    height: '92vh',
    maxHeight: '780px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    color: '#0f172a',
    fontFamily: "'Outfit', sans-serif"
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
    flexShrink: 0
  },
  title: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#64748b',
    margin: '3px 0 0'
  },
  modeDropdown: {
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#0f172a',
    cursor: 'pointer',
    outline: 'none'
  },
  stepperContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#f1f5f9',
    padding: '6px 12px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  stepBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#94a3b8',
    padding: '4px 8px',
    borderRadius: '8px',
    transition: 'all 0.3s'
  },
  stepActive: {
    color: '#0d9488',
    background: '#ffffff',
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
  },
  stepLine: {
    width: '16px',
    height: '2px',
    background: '#cbd5e1'
  },
  closeBtn: {
    background: '#f1f5f9',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748b'
  },
  bodyContainer: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative'
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  spinnerElement: {
    width: '36px',
    height: '36px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #0d9488',
    borderRadius: '50%'
  }
};
