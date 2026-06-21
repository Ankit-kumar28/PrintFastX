// pages/UploadPage.jsx
import { useState, useEffect } from 'react';
import PhotoStudio from '../components/PhotoStudio';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { logEvent } from '../src/utils/analytics';
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

/**
 * Returns a styled emoji icon representing the type of file.
 * 
 * @param {string} fileName - Name of the file
 * @returns {React.ReactElement} Emoji element wrapper
 */
const getFileIcon = (fileName) => {
  const name = fileName.toLowerCase();
  if (name.endsWith('.pdf')) {
    return <span style={{ fontSize: '22px', marginRight: '6px', flexShrink: 0 }} title="PDF Document">📕</span>;
  }
  if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) {
    return <span style={{ fontSize: '22px', marginRight: '6px', flexShrink: 0 }} title="Image File">🖼️</span>;
  }
  if (name.endsWith('.doc') || name.endsWith('.docx')) {
    return <span style={{ fontSize: '22px', marginRight: '6px', flexShrink: 0 }} title="Word Document">📘</span>;
  }
  return <span style={{ fontSize: '22px', marginRight: '6px', flexShrink: 0 }} title="File">📄</span>;
};

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

  // UI drag state & detailed fare breakdown visibility toggles
  const [isDragging, setIsDragging] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Passport Photo Maker states
  const [passportImage, setPassportImage] = useState(null);
  const [passportTargetFileId, setPassportTargetFileId] = useState(null);

  const handleSavePassportSheet = ({ file, name }) => {
    const newFileItem = {
      id: Math.random().toString(36).substring(7),
      file,
      name,
      size: file.size,
      pages: 1,
      colorMode: 'color',
      copies: 1,
      sides: 'single',
      imageType: 'passport'
    };

    setFiles(prev => {
      const updated = prev.filter(item => item.id !== passportTargetFileId);
      return [...updated, newFileItem];
    });

    setPassportImage(null);
    setPassportTargetFileId(null);
  };

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

  /**
   * Processes a list of selected or dropped files.
   * Validates supported extensions (PDF, Word DOC/DOCX, JPEG/PNG),
   * counts pages dynamically, and inserts them into state.
   * 
   * @param {Array<File>} selectedFiles - File objects list
   */
  const processSelectedFiles = async (selectedFiles) => {
    toast.loading("Processing files...", { id: "fileLoad" });
    const newFiles = [];

    for (const file of selectedFiles) {
      // Clean extensions check to restrict unsupported file drops
      const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
      const fileNameLower = file.name.toLowerCase();
      const isValid = validExtensions.some(ext => fileNameLower.endsWith(ext));

      if (!isValid) {
        toast.error(`Unsupported format: ${file.name}. Please select PDF, DOCX, or JPEG/PNG.`, { duration: 4000 });
        continue;
      }

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
        colorMode: 'bw',
        copies: 1,
        sides: 'single',
        imageType: 'normal' // 'normal' | 'passport' — only for images
      });
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      toast.success("Files added successfully!");
    }
    toast.dismiss("fileLoad");
  };

  /**
   * Triggered when selecting files manually via the OS file explorer dialog.
   */
  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    await processSelectedFiles(selectedFiles);
  };

  /* ── Drag & Drop Event Handlers ── */

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (!droppedFiles.length) return;
    await processSelectedFiles(droppedFiles);
  };

  /**
   * Removes a selected file from the local state array.
   */
  const deleteFileItem = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    toast.success("File removed");
  };

  /**
   * Updates print settings (color mode, copies count) for a specific file ID.
   */
  const updateFileSetting = (id, key, val) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  // Recalculate Total Amount (incorporating custom shop priority pricing)
  useEffect(() => {
    if (!shop) return;
    const bwRate = shop.pricing?.bwRate || 2;
    const colorRate = shop.pricing?.colorRate || 8;
    const passportRate = shop.pricing?.passportRate || 30;
    const photoBwRate = shop.pricing?.photoBwRate !== undefined ? shop.pricing.photoBwRate : 5;
    const photoColorRate = shop.pricing?.photoColorRate !== undefined ? shop.pricing.photoColorRate : 10;

    let subtotal = 0;
    files.forEach(f => {
      const isPassport = f.imageType === 'passport' || f.name.toLowerCase().startsWith('passport');
      const isImage = !isPassport && ['.jpg', '.jpeg', '.png'].some(ext => f.name.toLowerCase().endsWith(ext));
      if (isPassport) {
        // Passport photo: flat rate per set regardless of copies
        subtotal += passportRate;
      } else if (isImage) {
        // Normal image print
        const baseRate = f.colorMode === 'color' ? photoColorRate : photoBwRate;
        subtotal += Math.round(f.copies * baseRate);
      } else {
        const baseRate = f.colorMode === 'color' ? colorRate : bwRate;
        const fileAmount = Math.round(f.pages * f.copies * baseRate);
        subtotal += fileAmount;
      }
    });

    if (priorityPrint) {
      const fee = shop.pricing?.priorityFee !== undefined ? shop.pricing.priorityFee : 10;
      subtotal += fee;
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
      pages: f.pages,
      imageType: f.imageType || 'normal'
    }));

    formData.append('fileSettings', JSON.stringify(settings));
    formData.append('priority', priorityPrint);
    formData.append('notes', customerNotes);

    try {
      const res = await axios.post(`${API}/api/upload/${shopId}`, formData);
      setToken(res.data.token);
      setSuccess(true);
      toast.success("Files submitted successfully!");
      logEvent('upload_files', 'User Action', priorityPrint ? 'Priority' : 'Standard', files.length);
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
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
          /* INITIAL VIEW: UPLOAD BOX WITH DRAG & DROP SUPPORT */
          <div style={styles.initialUploadBox}>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                ...styles.dashedUploadBox,
                ...(isDragging ? styles.dashedUploadBoxActive : {})
              }}
            >
              <Upload size={48} style={{ color: isDragging ? '#0f766e' : '#0d9488', marginBottom: '16px', transition: 'color 0.2s' }} />
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
              <p style={styles.uploadText}>Drag & drop files here, or tap to browse</p>
              <p style={styles.uploadSecText}>🔒 PDF, Word (DOC/DOCX), or JPEG/PNG only</p>
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
              {files.map(f => {
                const isPassport = f.imageType === 'passport' || f.name.toLowerCase().startsWith('passport');
                const isFormatImage = ['.jpg', '.jpeg', '.png'].some(ext => f.name.toLowerCase().endsWith(ext));
                const isImage = isFormatImage && !isPassport;

                return (
                  <div key={f.id} style={{
                    ...styles.fileCard,
                    borderLeft: isPassport ? '4px solid #7c3aed' : isImage ? '4px solid #0d9488' : '4px solid #e2e8f0',
                    background: isPassport ? '#faf5ff' : isImage ? '#f0fdfa' : '#ffffff'
                  }}>
                    {/* Row 1: File metadata & Delete */}
                    <div style={styles.fileMetaRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        {isPassport || isImage ? (
                          <span style={{
                            fontSize: '22px', marginRight: '2px', flexShrink: 0,
                            background: isPassport ? '#ede9fe' : '#ccfbf1',
                            borderRadius: '8px', padding: '4px 6px'
                          }}>
                            {isPassport ? '🪪' : '🖼️'}
                          </span>
                        ) : getFileIcon(f.name)}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={styles.fileNameText}>{f.name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <p style={{ ...styles.fileSizeText, margin: 0 }}>
                              {(f.size / 1024 / 1024).toFixed(2)} MB
                              {isPassport ? (
                                <span style={{
                                  marginLeft: '6px', fontSize: '10px', fontWeight: 700,
                                  background: '#ede9fe',
                                  color: '#7c3aed',
                                  borderRadius: '4px', padding: '1px 6px'
                                }}>
                                  📸 Passport
                                </span>
                              ) : isImage ? (
                                <span style={{
                                  marginLeft: '6px', fontSize: '10px', fontWeight: 700,
                                  background: '#ccfbf1',
                                  color: '#0d9488',
                                  borderRadius: '4px', padding: '1px 6px'
                                }}>
                                  🖼️ Photo Print
                                </span>
                              ) : (
                                <span style={{ marginLeft: '6px' }}>• {f.pages} Pages</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => deleteFileItem(f.id)} style={styles.deleteBtn}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Row 2: File options */}
                    <div style={{ ...styles.fileOptionsRow, flexWrap: 'wrap', gap: '8px' }}>
                      {/* Image Type Selector — shown only for image files */}
                      {isFormatImage && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Print As:</span>
                          <button
                            type="button"
                            onClick={() => updateFileSetting(f.id, 'imageType', 'normal')}
                            style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                              border: f.imageType === 'normal' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                              background: f.imageType === 'normal' ? '#f0fdfa' : '#f8fafc',
                              color: f.imageType === 'normal' ? '#0d9488' : '#64748b'
                            }}
                          >
                            🖼️ Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFileSetting(f.id, 'imageType', 'passport')}
                            style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                              border: f.imageType === 'passport' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                              background: f.imageType === 'passport' ? '#faf5ff' : '#f8fafc',
                              color: f.imageType === 'passport' ? '#7c3aed' : '#64748b'
                            }}
                          >
                            📸 Passport
                          </button>
                        </div>
                      )}

                      {/* B&W vs Color Toggle — only for non-passport images & docs */}
                      {!isPassport && (
                        <div style={styles.toggleGroup}>
                          <button
                            type="button"
                            onClick={() => updateFileSetting(f.id, 'colorMode', 'bw')}
                            style={{ ...styles.toggleBtn, ...(f.colorMode === 'bw' ? styles.toggleBtnActive : {}) }}
                          >B&W</button>
                          <button
                            type="button"
                            onClick={() => updateFileSetting(f.id, 'colorMode', 'color')}
                            style={{ ...styles.toggleBtn, ...(f.colorMode === 'color' ? styles.toggleBtnActive : {}) }}
                          >Color</button>
                        </div>
                      )}

                      {/* Copies — only for non-passport */}
                      {!isPassport && (
                        <div style={styles.copiesAdjuster}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Copies</span>
                          <button type="button" onClick={() => updateFileSetting(f.id, 'copies', Math.max(1, f.copies - 1))} style={styles.adjusterBtn}>-</button>
                          <span style={styles.copiesDisplay}>{f.copies}</span>
                          <button type="button" onClick={() => updateFileSetting(f.id, 'copies', f.copies + 1)} style={styles.adjusterBtn}>+</button>
                        </div>
                      )}

                      {/* Flat rate info for passport */}
                      {isPassport && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ede9fe', borderRadius: '8px', padding: '4px 10px' }}>
                          <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 700 }}>
                            ₹{shop.pricing?.passportRate || 30} flat rate
                          </span>
                          <span style={{ fontSize: '10px', color: '#a78bfa' }}>• All copies included</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
                    ⭐ Priority Print (+₹{shop.pricing?.priorityFee !== undefined ? shop.pricing.priorityFee : 10})
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

            {/* Detailed price breakdown list (collapsible accordion) */}
            {showBreakdown && (
              <div style={styles.breakdownBox}>
                <p style={styles.breakdownTitle}>Fare Breakdown</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {files.map(f => {
                    const bwRate = shop.pricing?.bwRate || 2;
                    const colorRate = shop.pricing?.colorRate || 8;
                    const passportRate = shop.pricing?.passportRate || 30;
                    const photoBwRate = shop.pricing?.photoBwRate !== undefined ? shop.pricing.photoBwRate : 5;
                    const photoColorRate = shop.pricing?.photoColorRate !== undefined ? shop.pricing.photoColorRate : 10;
                    const isPassport = f.imageType === 'passport' || f.name.toLowerCase().startsWith('passport');
                    const isFormatImage = ['.jpg', '.jpeg', '.png'].some(ext => f.name.toLowerCase().endsWith(ext));
                    const isImage = isFormatImage && !isPassport;
                    
                    let cost = 0;
                    let displayFormula = '';
                    if (isPassport) {
                      cost = passportRate;
                      displayFormula = `₹${cost} (flat rate)`;
                    } else if (isImage) {
                      const rate = f.colorMode === 'color' ? photoColorRate : photoBwRate;
                      cost = f.copies * rate;
                      displayFormula = `${f.copies} copies (${f.colorMode === 'color' ? 'Color' : 'B&W'} Photo) = ₹${cost}`;
                    } else {
                      const rate = f.colorMode === 'color' ? colorRate : bwRate;
                      cost = Math.round(f.pages * f.copies * rate);
                      displayFormula = `${f.pages} pg × ${f.copies} (${f.colorMode === 'color' ? 'Color' : 'B&W'}) = ₹${cost}`;
                    }

                    return (
                      <div key={f.id} style={styles.breakdownRow}>
                        <span style={styles.breakdownFileName}>
                          {f.name}
                          {(isPassport || isImage) && (
                            <span style={{
                              marginLeft: '6px', fontSize: '10px',
                              background: isPassport ? '#faf5ff' : '#f0fdfa',
                              color: isPassport ? '#7c3aed' : '#0d9488',
                              border: `1px solid ${isPassport ? '#e9d5ff' : '#99f6e4'}`,
                              borderRadius: '4px', padding: '1px 5px', fontWeight: 700
                            }}>
                              {isPassport ? 'PASSPORT' : 'PHOTO'}
                            </span>
                          )}
                        </span>
                        <span style={styles.breakdownVal}>
                          {displayFormula}
                        </span>
                      </div>
                    );
                  })}
                  {priorityPrint && (
                    <div style={{ ...styles.breakdownRow, borderTop: '1px dashed #e2e8f0', paddingTop: '8px', color: '#b45309', fontWeight: 600 }}>
                      <span>⭐ Priority Print Premium</span>
                      <span>+₹{shop.pricing?.priorityFee !== undefined ? shop.pricing.priorityFee : 10}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom sticky/floating total bar */}
            <div className="price-summary-row" style={styles.actionFooter}>
              <div style={styles.priceSummary}>
                <div
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  title="Click to toggle price breakdown details"
                >
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: '10px', color: '#0d9488', textDecoration: 'underline' }}>
                    {showBreakdown ? 'Hide Details' : 'View Details'}
                  </span>
                </div>
                <span style={styles.totalPriceText}>₹{totalAmount}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Pay at counter</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  ...styles.btnPrimarySend,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <>
                    <span style={styles.spinnerMini} />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Files</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      {passportImage && (
        <PhotoStudio
          imageSource={passportImage}
          onClose={() => {
            setPassportImage(null);
            setPassportTargetFileId(null);
          }}
          onSave={handleSavePassportSheet}
          mode="customer"
        />
      )}
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
    transition: 'all 0.2s ease-in-out',
  },
  dashedUploadBoxActive: {
    borderColor: '#0d9488',
    background: '#f0fdfa',
    transform: 'scale(1.01)',
    boxShadow: '0 4px 20px rgba(13, 148, 136, 0.05)',
  },
  breakdownBox: {
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: '16px',
    padding: '16px',
    textAlign: 'left',
    marginTop: '4px',
  },
  breakdownTitle: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '10px',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '6px',
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#475569',
    gap: '12px',
  },
  breakdownFileName: {
    fontWeight: 600,
    color: '#1e293b',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  breakdownVal: {
    flexShrink: 0,
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
  spinnerMini: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
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