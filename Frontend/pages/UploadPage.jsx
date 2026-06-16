// pages/UploadPage.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function UploadPage() {
  const { shopId } = useParams();
  const [shop, setShop] = useState(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State for files list
  const [files, setFiles] = useState([]);
  const [priorityPrint, setPriorityPrint] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  // Fetch shop details (Public Endpoint)
  useEffect(() => {
    const fetchShop = async () => {
      try {
        const res = await axios.get(`${API}/api/shops/public/${shopId}`);
        setShop(res.data);
      } catch (err) {
        if (err.response?.status === 403) {
          setErrorMsg(err.response.data.error || "This shop has been temporarily blocked by the admin.");
        } else {
          setErrorMsg("Shop not found or not approved");
          toast.error("Shop not found or not approved");
        }
      } finally {
        setShopLoading(false);
      }
    };
    fetchShop();
  }, [shopId]);

  // Client-side PDF page count extractor
  const countPDFPages = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function () {
        const readerResult = reader.result;
        // Search for PDF page markers: /Type /Page
        const matches = readerResult.match(/\/Type\s*\/Page\b/g);
        const pageCount = matches ? matches.length : 1;
        resolve(pageCount);
      };
      reader.onerror = () => resolve(1);
      reader.readAsBinaryString(file);
    });
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    toast.loading("Processing files...", { id: "fileLoad" });
    const newFiles = [];
    
    for (const file of selectedFiles) {
      let pages = 1;
      if (file.type === 'application/pdf') {
        pages = await countPDFPages(file);
      }
      newFiles.push({
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        size: file.size,
        pages,
        colorMode: 'bw', // default B&W
        copies: 1,       // default 1 copy
        sides: 'single'  // default single-sided
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
    toast.dismiss("fileLoad");
    toast.success("Files added!");
  };

  const deleteFileItem = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    toast.success("File removed");
  };

  const updateFileSetting = (id, key, val) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  // Recalculate Total Amount
  useEffect(() => {
    if (!shop) return;
    const bwRate = shop.pricing?.bwRate || 2;
    const colorRate = shop.pricing?.colorRate || 8;

    let subtotal = 0;
    files.forEach(f => {
      const baseRate = f.colorMode === 'color' ? colorRate : bwRate;
      let finalRate = baseRate;
      if (f.sides === 'double') {
        finalRate = Math.round(baseRate * 0.6); // Double-sided discount logic matching backend
      }
      const fileAmount = Math.round(f.pages * f.copies * finalRate);
      subtotal += fileAmount;
    });

    if (priorityPrint) {
      subtotal += 10;
    }
    setTotalAmount(subtotal);
  }, [files, priorityPrint, shop]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Please add at least one file");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    // Add all files
    files.forEach(f => {
      formData.append('files', f.file);
    });

    // Add structured file settings
    const settings = files.map(f => ({
      fileName: f.name,
      copies: f.copies,
      colorMode: f.colorMode,
      sides: f.sides,
      pages: f.pages
    }));
    
    formData.append('fileSettings', JSON.stringify(settings));
    formData.append('priority', priorityPrint);
    formData.append('notes', customerNotes);

    try {
      const res = await axios.post(`${API}/api/upload/${shopId}`, formData);
      setToken(res.data.token);
      setSuccess(true);
      toast.success("Files submitted successfully!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  if (shopLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (errorMsg || !shop || shop.status !== 'approved') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.iconCircle, background: '#fee2e2', color: '#ef4444' }}>
            <AlertCircle size={36} />
          </div>
          <h2 style={styles.title}>{errorMsg && !errorMsg.includes("not found") ? 'Shop Blocked' : 'Shop Inactive'}</h2>
          <p style={styles.subtitle}>
            {errorMsg || "This print shop is currently not active or pending approval. Please check the Shop ID and try again."}
          </p>
        </div>
      </div>
    );
  }

  // Token Success Screen
  if (success && token) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: 'center', padding: '48px 36px' }}>
          <div style={{ ...styles.iconCircle, background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle size={36} />
          </div>
          <h2 style={styles.title}>Upload Successful!</h2>
          <p style={styles.subtitle}>Show this token at the counter to get your printouts.</p>

          <div style={styles.tokenBox}>
            <p style={styles.tokenLabel}>YOUR TOKEN</p>
            <p style={styles.tokenValue}>{token}</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            style={styles.btnPrimaryLarge}
          >
            Upload More Files
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page-container" style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 480px) {
          .upload-page-container {
            padding: 12px !important;
          }
          .upload-card {
            padding: 24px 16px !important;
            border-radius: 16px !important;
          }
          .price-summary-row {
            flex-direction: column !important;
            gap: 12px !important;
            align-items: stretch !important;
            text-align: center;
          }
          .price-summary-row button {
            width: 100% !important;
            justify-content: center;
          }
        }
      `}</style>
      <div className="upload-card" style={styles.card}>
        {/* Title */}
        <h2 style={styles.title}>{shop.shopName}</h2>
        <p style={styles.subtitle}>Privacy first - Quick & Easy Printing</p>

        {files.length === 0 ? (
          /* INITIAL VIEW: UPLOAD BOX */
          <div style={styles.initialUploadBox}>
            <div style={styles.dashedUploadBox}>
              <Upload size={48} style={{ color: '#0d9488', marginBottom: '16px' }} />
              <input
                type="file"
                multiple
                id="filesInput"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <label htmlFor="filesInput" style={styles.selectBtn}>
                Select Files
              </label>
              <p style={styles.uploadText}>Tap to select files for printing</p>
              <p style={styles.uploadSecText}>🔒 Your files are secure & auto-deleted</p>
            </div>
            
            <div style={styles.dividerRow}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>OR</span>
              <div style={styles.dividerLine} />
            </div>

            <button 
              onClick={() => toast("WhatsApp bot feature coming soon!", { icon: "💬" })} 
              style={styles.btnWhatsapp}
            >
              Upload via WhatsApp
            </button>
          </div>
        ) : (
          /* SELECTED FILES VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header row to add more files */}
            <div style={styles.selectedFilesHeader}>
              <span style={{ fontWeight: 700, color: '#021a36', fontSize: '15px' }}>
                Selected Files ({files.length})
              </span>
              <label htmlFor="filesInputMore" style={styles.addMoreBtn}>
                <Plus size={16} /> Add More Files
              </label>
              <input
                type="file"
                multiple
                id="filesInputMore"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
            </div>

            {/* List of files */}
            <div style={styles.filesList}>
              {files.map(f => (
                <div key={f.id} style={styles.fileCard}>
                  {/* Row 1: File metadata & Delete */}
                  <div style={styles.fileMetaRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <FileText size={20} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={styles.fileNameText}>{f.name}</p>
                        <p style={styles.fileSizeText}>
                          {(f.size / 1024 / 1024).toFixed(2)} MB &bull; {f.pages} Pages
                        </p>
                      </div>
                    </div>
                    <button onClick={() => deleteFileItem(f.id)} style={styles.deleteBtn}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Row 2: File options */}
                  <div style={styles.fileOptionsRow}>
                    {/* B&W vs Color Toggle */}
                    <div style={styles.toggleGroup}>
                      <button
                        type="button"
                        onClick={() => updateFileSetting(f.id, 'colorMode', 'bw')}
                        style={{
                          ...styles.toggleBtn,
                          ...(f.colorMode === 'bw' ? styles.toggleBtnActive : {})
                        }}
                      >
                        B&W
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFileSetting(f.id, 'colorMode', 'color')}
                        style={{
                          ...styles.toggleBtn,
                          ...(f.colorMode === 'color' ? styles.toggleBtnActive : {})
                        }}
                      >
                        Color
                      </button>
                    </div>

                    {/* Copies adjustment */}
                    <div style={styles.copiesAdjuster}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Copies</span>
                      <button
                        type="button"
                        onClick={() => updateFileSetting(f.id, 'copies', Math.max(1, f.copies - 1))}
                        style={styles.adjusterBtn}
                      >
                        -
                      </button>
                      <span style={styles.copiesDisplay}>{f.copies}</span>
                      <button
                        type="button"
                        onClick={() => updateFileSetting(f.id, 'copies', f.copies + 1)}
                        style={styles.adjusterBtn}
                      >
                        +
                      </button>
                    </div>

                    {/* Double-sided selector */}
                    <label style={styles.doubleSidedLabel}>
                      <input
                        type="checkbox"
                        checked={f.sides === 'double'}
                        onChange={(e) => updateFileSetting(f.id, 'sides', e.target.checked ? 'double' : 'single')}
                        style={{ marginRight: '6px' }}
                      />
                      Double-sided
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Priority Print option */}
            <div style={styles.priorityCard}>
              <label style={styles.priorityLabel}>
                <input
                  type="checkbox"
                  checked={priorityPrint}
                  onChange={(e) => setPriorityPrint(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 700, color: '#92400e', fontSize: '14px' }}>
                    ⭐ Priority Print (+₹10)
                  </span>
                  <span style={{ fontSize: '11px', color: '#b45309' }}>
                    Skip the queue — your order prints first
                  </span>
                </div>
              </label>
            </div>

            {/* Note block */}
            <div style={styles.field}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Instructions (Optional)</label>
              <textarea
                value={customerNotes}
                onChange={e => setCustomerNotes(e.target.value)}
                placeholder="Any special print instructions..."
                style={styles.notesTextarea}
              />
            </div>

            {/* Bottom sticky/floating total bar */}
            <div className="price-summary-row" style={styles.actionFooter}>
              <div style={styles.priceSummary}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Total</span>
                <span style={styles.totalPriceText}>₹{totalAmount}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Pay at counter</span>
              </div>
              
              <button 
                onClick={handleSubmit} 
                disabled={loading} 
                style={styles.btnPrimarySend}
              >
                <Send size={16} /> Send Files
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Styles ── */
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: "'Outfit', 'Inter', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
    padding: '36px 28px',
    width: '100%',
    maxWidth: '480px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#021a36',
    textAlign: 'center',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: '32px',
  },
  initialUploadBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  dashedUploadBox: {
    border: '2px dashed #cbd5e1',
    borderRadius: '20px',
    padding: '40px 24px',
    textAlign: 'center',
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  selectBtn: {
    background: '#0d9488',
    color: '#fff',
    padding: '12px 32px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: '16px',
    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.15)',
  },
  uploadText: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '8px',
  },
  uploadSecText: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '8px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#e2e8f0',
  },
  dividerText: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 700,
  },
  btnWhatsapp: {
    background: '#ffffff',
    border: '1.5px solid #25D366',
    color: '#25D366',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  selectedFilesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addMoreBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#0d9488',
    fontWeight: 700,
    cursor: 'pointer',
  },
  filesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fileCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '14px',
  },
  fileMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '8px',
  },
  fileNameText: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileSizeText: {
    fontSize: '11px',
    color: '#94a3b8',
    margin: '2px 0 0',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
    padding: '4px',
  },
  fileOptionsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
  },
  toggleGroup: {
    display: 'flex',
    background: '#e2e8f0',
    borderRadius: '8px',
    padding: '2px',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  toggleBtnActive: {
    background: '#fff',
    color: '#0f172a',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  copiesAdjuster: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '4px 8px',
  },
  adjusterBtn: {
    background: 'none',
    border: 'none',
    fontWeight: 700,
    color: '#0d9488',
    cursor: 'pointer',
    padding: '0 6px',
  },
  copiesDisplay: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#0f172a',
  },
  doubleSidedLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  priorityCard: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '16px',
    padding: '12px 14px',
  },
  priorityLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    cursor: 'pointer',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  notesTextarea: {
    padding: '10px 12px',
    border: '1.5px solid #cbd5e1',
    borderRadius: '12px',
    fontSize: '13px',
    height: '60px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'none',
  },
  actionFooter: {
    display: 'flex',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '12px 16px',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
  },
  priceSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  totalPriceText: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#0d9488',
    lineHeight: 1.1,
  },
  btnPrimarySend: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#0d9488',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '2px solid #e2e8f0',
    borderTopColor: '#0d9488',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  iconCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  tokenBox: {
    background: '#f8fafc',
    border: '2px dashed #cbd5e1',
    borderRadius: '16px',
    padding: '24px',
    margin: '24px 0 32px',
  },
  tokenLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.1em',
    marginBottom: '6px',
  },
  tokenValue: {
    fontSize: '40px',
    fontFamily: 'monospace',
    fontWeight: 800,
    color: '#0f172a',
  },
  btnPrimaryLarge: {
    width: '100%',
    padding: '14px',
    background: '#0d9488',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  }
};