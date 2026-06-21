import { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import {
  ZoomIn, ZoomOut, RotateCw, RotateCcw, Download,
  Check, FileText, Maximize, Crop as CropIcon, RefreshCw,
  Sun, Droplets, Contrast
} from 'lucide-react';

const CANVAS_W = 1350;
const CANVAS_H = 1500;

export default function DocumentEditor({ originalImage, imageLoaded, onClose, onSave, mode = 'customer' }) {
  // ── States ──────────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [dragMode, setDragMode] = useState('crop'); // 'crop' | 'pan'
  const [cropActive, setCropActive] = useState(true);
  const [cropRect, setCropRect] = useState({ x: 20, y: 20, w: CANVAS_W - 40, h: CANVAS_H - 40 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  const [dpi, setDpi] = useState(300);
  const [processing, setProcessing] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const editorCanvasRef = useRef(null);
  const cropDragRef = useRef({ active: false, handle: null, startX: 0, startY: 0, startRect: null });
  const panDragRef = useRef({ active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });

  // ── Helper Math Functions ──────────────────────────────────────────────────
  const calcFitDims = (img, cW, cH) => {
    if (!img) return { drawW: cW, drawH: cH };
    const ratio = img.width / img.height;
    return ratio > cW / cH ? { drawW: cW, drawH: cW / ratio } : { drawW: cH * ratio, drawH: cH };
  };

  const drawCheckerboard = (ctx, w, h) => {
    ctx.fillStyle = '#e2e8f0'; // Solid light gray background
    ctx.fillRect(0, 0, w, h);
  };

  const mmToPx = (mm) => Math.round((mm / 25.4) * dpi);

  const applySharpness = (ctx, w, h, amount) => {
    if (amount <= 0) return;
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const mix = amount / 100.0;
    const copy = new Uint8ClampedArray(d);
    const w4 = w * 4;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w4 + x * 4;
        if (copy[i + 3] === 0) continue;
        for (let c = 0; c < 3; c++) {
          const val = 5 * copy[i + c] - copy[i - 4 + c] - copy[i + 4 + c] - copy[i - w4 + c] - copy[i + w4 + c];
          d[i + c] = copy[i + c] + (val - copy[i + c]) * mix;
        }
      }
    }
    ctx.putImageData(id, 0, 0);
  };

  // ── Canvas Rendering pipeline ──────────────────────────────────────────────
  const drawEditor = useCallback(() => {
    const canvas = editorCanvasRef.current;
    if (!canvas || !originalImage || !imageLoaded) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width, h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    drawCheckerboard(ctx, w, h);

    // Render Original Image with filters
    ctx.save();
    ctx.filter = `brightness(${brightness}%) saturate(${saturation}%) contrast(${contrast}%)`;
    ctx.translate(w / 2 + panX, h / 2 + panY);
    ctx.rotate((rotation * Math.PI) / 180);

    const { drawW, drawH } = calcFitDims(originalImage, w, h);
    const scaleVal = zoom / 100;
    const dW = drawW * scaleVal;
    const dH = drawH * scaleVal;

    ctx.drawImage(originalImage, -dW / 2, -dH / 2, dW, dH);
    ctx.restore();

    // Render Crop Overlay
    if (cropRect) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)'; // Translucent background
      ctx.fillRect(0, 0, w, cropRect.y);
      ctx.fillRect(0, cropRect.y + cropRect.h, w, h - cropRect.y - cropRect.h);
      ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h);
      ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, w - cropRect.x - cropRect.w, cropRect.h);

      // Crop box outline
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 7.5;
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

      // Rule-of-Thirds Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 3;
      for (let t = 1; t <= 2; t++) {
        ctx.beginPath();
        ctx.moveTo(cropRect.x + (cropRect.w * t) / 3, cropRect.y);
        ctx.lineTo(cropRect.x + (cropRect.w * t) / 3, cropRect.y + cropRect.h);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cropRect.x, cropRect.y + (cropRect.h * t) / 3);
        ctx.lineTo(cropRect.x + cropRect.w, cropRect.y + (cropRect.h * t) / 3);
        ctx.stroke();
      }

      // Draw L-shaped Corner handles and edge bars with white backing
      const thick = 10;
      const len = 40;
      const { x: cx, y: cy, w: cw, h: ch } = cropRect;

      const drawCropHandle = (hx, hy, hw, hh) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - 2, hy - 2, hw + 4, hh + 4);
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(hx, hy, hw, hh);
      };

      // 1. Corner L-brackets
      drawCropHandle(cx - thick / 2, cy - thick / 2, len, thick);
      drawCropHandle(cx - thick / 2, cy - thick / 2, thick, len);

      drawCropHandle(cx + cw - len + thick / 2, cy - thick / 2, len, thick);
      drawCropHandle(cx + cw - thick / 2, cy - thick / 2, thick, len);

      drawCropHandle(cx - thick / 2, cy + ch - thick / 2, len, thick);
      drawCropHandle(cx - thick / 2, cy + ch - len + thick / 2, thick, len);

      drawCropHandle(cx + cw - len + thick / 2, cy + ch - thick / 2, len, thick);
      drawCropHandle(cx + cw - thick / 2, cy + ch - len + thick / 2, thick, len);

      // 2. Edge straight bars
      drawCropHandle(cx + cw / 2 - len / 2, cy - thick / 2, len, thick);
      drawCropHandle(cx + cw / 2 - len / 2, cy + ch - thick / 2, len, thick);
      drawCropHandle(cx - thick / 2, cy + ch / 2 - len / 2, thick, len);
      drawCropHandle(cx + cw - thick / 2, cy + ch / 2 - len / 2, thick, len);

      ctx.restore();
    }
  }, [originalImage, imageLoaded, zoom, rotation, panX, panY, cropRect, brightness, contrast, saturation]);

  // Update canvas on parameter updates
  useEffect(() => {
    drawEditor();
  }, [drawEditor]);

  // ── Drag & Hover Events ────────────────────────────────────────────────────
  const getCanvasXY = (e) => {
    const rect = editorCanvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.round(((cx - rect.left) / rect.width) * CANVAS_W),
      y: Math.round(((cy - rect.top) / rect.height) * CANVAS_H),
    };
  };

  const getHandleAt = (x, y) => {
    if (!cropRect) return null;
    const hs = 15;
    const { x: cx, y: cy, w: cw, h: ch } = cropRect;
    const inRect = (px, py, rx, ry, rw, rh) => px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;

    if (inRect(x, y, cx - hs, cy - hs, hs * 2, hs * 2)) return 'tl';
    else if (inRect(x, y, cx + cw - hs, cy - hs, hs * 2, hs * 2)) return 'tr';
    else if (inRect(x, y, cx - hs, cy + ch - hs, hs * 2, hs * 2)) return 'bl';
    else if (inRect(x, y, cx + cw - hs, cy + ch - hs, hs * 2, hs * 2)) return 'br';
    else if (inRect(x, y, cx + cw / 2 - hs, cy - hs, hs * 2, hs * 2)) return 't';
    else if (inRect(x, y, cx + cw / 2 - hs, cy + ch - hs, hs * 2, hs * 2)) return 'b';
    else if (inRect(x, y, cx - hs, cy + ch / 2 - hs, hs * 2, hs * 2)) return 'l';
    else if (inRect(x, y, cx + cw - hs, cy + ch / 2 - hs, hs * 2, hs * 2)) return 'r';
    else if (inRect(x, y, cx, cy, cw, ch)) return 'move';
    return null;
  };

  const handleStartDrag = (e) => {
    const { x, y } = getCanvasXY(e);
    const handle = getHandleAt(x, y);

    if (handle) {
      cropDragRef.current = { active: true, handle, startX: x, startY: y, startRect: { ...cropRect } };
    } else {
      panDragRef.current = {
        active: true,
        startX: e.touches ? e.touches[0].clientX : e.clientX,
        startY: e.touches ? e.touches[0].clientY : e.clientY,
        startPanX: panX,
        startPanY: panY
      };
    }
  };

  const handleDrag = (e) => {
    const { x, y } = getCanvasXY(e);

    // Mouse Hover cursor styling
    if (!cropDragRef.current.active && !panDragRef.current.active && editorCanvasRef.current) {
      const handle = getHandleAt(x, y);
      if (handle === 'move') {
        editorCanvasRef.current.style.cursor = 'move';
      } else if (handle === 'tl' || handle === 'br') {
        editorCanvasRef.current.style.cursor = 'nwse-resize';
      } else if (handle === 'tr' || handle === 'bl') {
        editorCanvasRef.current.style.cursor = 'nesw-resize';
      } else if (handle === 't' || handle === 'b') {
        editorCanvasRef.current.style.cursor = 'ns-resize';
      } else if (handle === 'l' || handle === 'r') {
        editorCanvasRef.current.style.cursor = 'ew-resize';
      } else {
        editorCanvasRef.current.style.cursor = 'grab';
      }
    } else if (panDragRef.current.active && editorCanvasRef.current) {
      editorCanvasRef.current.style.cursor = 'grabbing';
    } else if (cropDragRef.current.active && editorCanvasRef.current) {
      const h = cropDragRef.current.handle;
      if (h === 'move') editorCanvasRef.current.style.cursor = 'move';
      else if (h === 'tl' || h === 'br') editorCanvasRef.current.style.cursor = 'nwse-resize';
      else if (h === 'tr' || h === 'bl') editorCanvasRef.current.style.cursor = 'nesw-resize';
      else if (h === 't' || h === 'b') editorCanvasRef.current.style.cursor = 'ns-resize';
      else if (h === 'l' || h === 'r') editorCanvasRef.current.style.cursor = 'ew-resize';
    }

    if (panDragRef.current.active) {
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = cx - panDragRef.current.startX;
      const dy = cy - panDragRef.current.startY;
      setPanX(panDragRef.current.startPanX + dx);
      setPanY(panDragRef.current.startPanY + dy);
      return;
    }

    if (cropDragRef.current.active) {
      const { handle, startX, startY, startRect } = cropDragRef.current;
      const dx = x - startX;
      const dy = y - startY;

      let nx = startRect.x;
      let ny = startRect.y;
      let nw = startRect.w;
      let nh = startRect.h;

      if (handle === 'move') {
        nx = Math.max(0, Math.min(CANVAS_W - nw, nx + dx));
        ny = Math.max(0, Math.min(CANVAS_H - nh, ny + dy));
      } else {
        if (handle.includes('r')) nw += dx;
        if (handle.includes('b')) nh += dy;
        if (handle.includes('l')) { nx += dx; nw -= dx; }
        if (handle.includes('t')) { ny += dy; nh -= dy; }
      }

      nw = Math.max(40, Math.min(CANVAS_W - nx, nw));
      nh = Math.max(40, Math.min(CANVAS_H - ny, nh));

      setCropRect({ x: nx, y: ny, w: nw, h: nh });
    }
  };

  const handleStopDrag = () => {
    cropDragRef.current.active = false;
    panDragRef.current.active = false;
  };

  const resetTransforms = () => {
    setZoom(100);
    setRotation(0);
    setPanX(0);
    setPanY(0);
  };

  // ── Crop and Export ────────────────────────────────────────────────────────
  const executeCrop = () => {
    if (!cropRect || !editorCanvasRef.current || !originalImage) return null;
    const { x, y, w, h } = cropRect;
    if (w < 20 || h < 20) return null;

    const cropped = document.createElement('canvas');
    const ctx = cropped.getContext('2d');

    const { drawW, drawH } = calcFitDims(originalImage, CANVAS_W, CANVAS_H);
    const hrScale = originalImage.width / drawW;
    
    const hrCanvasW = Math.round(CANVAS_W * hrScale);
    const hrCanvasH = Math.round(CANVAS_H * hrScale);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = hrCanvasW;
    tempCanvas.height = hrCanvasH;
    const tCtx = tempCanvas.getContext('2d');
    
    tCtx.save();
    tCtx.filter = `brightness(${brightness}%) saturate(${saturation}%) contrast(${contrast}%)`;
    tCtx.translate(hrCanvasW / 2 + panX * hrScale, hrCanvasH / 2 + panY * hrScale);
    tCtx.rotate((rotation * Math.PI) / 180);
    
    const scaleVal = zoom / 100;
    const dW = drawW * scaleVal * hrScale;
    const dH = drawH * scaleVal * hrScale;
    tCtx.drawImage(originalImage, -dW / 2, -dH / 2, dW, dH);
    tCtx.restore();

    if (sharpness > 0) applySharpness(tCtx, hrCanvasW, hrCanvasH, sharpness);

    const hrX = Math.round(x * hrScale);
    const hrY = Math.round(y * hrScale);
    const hrW = Math.round(w * hrScale);
    const hrH = Math.round(h * hrScale);

    cropped.width = hrW;
    cropped.height = hrH;
    ctx.drawImage(tempCanvas, hrX, hrY, hrW, hrH, 0, 0, hrW, hrH);

    const img = new Image();
    img.src = cropped.toDataURL('image/jpeg', 0.95);
    return img;
  };

  const handleDocumentDownload = (format) => {
    const cropped = executeCrop();
    if (!cropped) {
      toast.error("Please select a crop area");
      return;
    }
    
    cropped.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropped.width;
      canvas.height = cropped.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(cropped, 0, 0);

      if (format === 'pdf') {
        const doc = new jsPDF({
          orientation: cropped.width > cropped.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [cropped.width, cropped.height]
        });
        doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, cropped.width, cropped.height);
        doc.save(`document_edit_${Date.now()}.pdf`);
        toast.success("Downloaded PDF!");
      } else {
        const type = format === 'png' ? 'image/png' : 'image/jpeg';
        const a = document.createElement('a');
        a.href = canvas.toDataURL(type, 0.95);
        a.download = `document_edit_${Date.now()}.${format}`;
        a.click();
        toast.success(`Downloaded ${format.toUpperCase()}!`);
      }
    };
  };

  const handleApplyChanges = () => {
    const cropped = executeCrop();
    if (cropped) {
      cropped.onload = () => {
        onSave({ file: new File([cropped.src], `edited_${Date.now()}.jpg`, { type: 'image/jpeg' }), name: `edited_${Date.now()}.jpg` });
        onClose();
      };
    } else {
      toast.error("Please select a crop area");
    }
  };

  return (
    <div style={S.screenWrapper}>
      {/* Left Column: Canvas Area */}
      <div style={S.leftPane}>
        <div style={S.canvasOuter}>
          {processing && (
            <div style={S.loadingOverlay}>
              <RefreshCw size={36} className="spinner" color="#0d9488" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginTop: '10px' }}>
                Processing image...
              </span>
            </div>
          )}
          
          <canvas
            ref={editorCanvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onMouseDown={handleStartDrag}
            onMouseMove={handleDrag}
            onMouseUp={handleStopDrag}
            onMouseLeave={handleStopDrag}
            onTouchStart={handleStartDrag}
            onTouchMove={handleDrag}
            onTouchEnd={handleStopDrag}
            style={{
              ...S.mainCanvas,
              cursor: dragMode === 'pan' ? 'grab' : 'crosshair'
            }}
          />
        </div>

        {/* Toolbar under Canvas */}
        <div style={S.sliderToolbar}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => setCropRect({ x: 20, y: 20, w: CANVAS_W - 40, h: CANVAS_H - 40 })}
              style={S.btnSecondary}
              className="btn-action"
            >
              <Maximize size={14} style={{ marginRight: '6px' }} />
              Full Size Selection
            </button>
            <button
              onClick={() => setRotation(r => r - 90)}
              style={S.btnSecondary}
              className="btn-action"
            >
              <RotateCcw size={14} style={{ marginRight: '6px' }} />
              Rotate Left
            </button>
            <button
              onClick={() => setRotation(r => r + 90)}
              style={S.btnSecondary}
              className="btn-action"
            >
              <RotateCw size={14} style={{ marginRight: '6px' }} />
              Rotate Right
            </button>
          </div>

          <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
            <div style={{ flex: 1 }}>
              <div style={S.sliderLabelRow}>
                <span>🔍 Zoom Preview</span>
                <span>{zoom}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="250"
                value={zoom}
                onChange={e => setZoom(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDragMode('crop')}
                style={{ ...S.modeTab, ...(dragMode === 'crop' ? S.modeTabActive : {}) }}
              >
                <CropIcon size={13} style={{ marginRight: '4px' }} /> Crop Frame
              </button>
              <button
                type="button"
                onClick={() => setDragMode('pan')}
                style={{ ...S.modeTab, ...(dragMode === 'pan' ? S.modeTabActive : {}) }}
              >
                <Maximize size={13} style={{ marginRight: '4px' }} /> Pan Image
              </button>
              <button
                type="button"
                onClick={resetTransforms}
                style={{ ...S.modeTab, color: '#f43f5e' }}
              >
                Reset Position
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Settings Panel */}
      <div style={S.rightPane}>
        <div style={S.paneContent} className="studio-scroll">
          <h4 style={S.settingsTitle}>Tuning & Export</h4>

          <div style={S.panelSegment}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ ...S.segmentTitle, margin: 0 }}>🎨 Image Tuning</h4>
              <button
                onClick={() => {
                  setBrightness(100);
                  setContrast(100);
                  setSaturation(100);
                  setSharpness(0);
                }}
                style={S.microBtn}
                className="btn-action"
              >
                🔄 Reset Tuning
              </button>
            </div>

            <div style={S.slidersGrid}>
              <div style={S.sliderControlGroup}>
                <div style={S.sliderLabelRow}>
                  <span>🔆 Brightness</span>
                  <span>{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={e => setBrightness(parseInt(e.target.value))}
                />
              </div>

              <div style={S.sliderControlGroup}>
                <div style={S.sliderLabelRow}>
                  <span>⚡ Contrast</span>
                  <span>{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={e => setContrast(parseInt(e.target.value))}
                />
              </div>

              <div style={S.sliderControlGroup}>
                <div style={S.sliderLabelRow}>
                  <span>🌈 Saturation</span>
                  <span>{saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={e => setSaturation(parseInt(e.target.value))}
                />
              </div>

              <div style={S.sliderControlGroup}>
                <div style={S.sliderLabelRow}>
                  <span>✨ Sharpness</span>
                  <span>{sharpness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sharpness}
                  onChange={e => setSharpness(parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div style={S.panelSegment}>
            <h4 style={S.segmentTitle}>📥 Export & Download</h4>
            <div style={{ ...S.sliderControlGroup, marginBottom: '16px' }}>
              <div style={S.sliderLabelRow}>
                <span>🖨️ Export DPI (Quality)</span>
                <span>{dpi} DPI</span>
              </div>
              <input
                type="range"
                min="72"
                max="1200"
                step="24"
                value={dpi}
                onChange={e => setDpi(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => handleDocumentDownload('jpg')} style={S.btnSecondary} className="btn-action">
                <Download size={14} style={{ marginRight: '6px' }} /> Download as JPG
              </button>
              <button onClick={() => handleDocumentDownload('png')} style={S.btnSecondary} className="btn-action">
                <Download size={14} style={{ marginRight: '6px' }} /> Download as PNG
              </button>
              <button onClick={() => handleDocumentDownload('pdf')} style={S.btnSecondary} className="btn-action">
                <FileText size={14} style={{ marginRight: '6px' }} /> Download as PDF
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={S.paneFooter}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <button
              onClick={handleApplyChanges}
              style={S.btnPrimaryLarge}
              className="btn-action"
            >
              <Check size={16} style={{ marginRight: '6px' }} /> Apply Changes & Add to Queue
            </button>
            <button
              onClick={onClose}
              style={{ ...S.btnPrimaryLarge, background: '#64748b', boxShadow: 'none' }}
              className="btn-action"
            >
              Cancel & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles (Copied from S) ───────────────────────────────────────────────────
const S = {
  screenWrapper: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    width: '100%'
  },
  leftPane: {
    flex: '7',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    background: '#f8fafc'
  },
  rightPane: {
    flex: '3',
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff'
  },
  canvasOuter: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: '0',
    background: '#e2e8f0'
  },
  mainCanvas: {
    maxWidth: '100%',
    maxHeight: '100%',
    background: 'transparent'
  },
  sliderToolbar: {
    padding: '16px 20px',
    background: '#ffffff',
    borderTop: '1px solid #e2e8f0'
  },
  btnSecondary: {
    background: '#f8fafc',
    color: '#0f172a',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center'
  },
  modeTab: {
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: 700,
    borderRadius: '8px',
    background: '#f1f5f9',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modeTabActive: {
    background: '#0d9488',
    color: '#ffffff',
    borderColor: '#0d9488',
    boxShadow: '0 0 10px rgba(13, 148, 136, 0.2)'
  },
  sliderLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    fontWeight: 700,
    color: '#475569',
    marginBottom: '4px'
  },
  paneContent: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  settingsTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  panelSegment: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '18px'
  },
  segmentTitle: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#0d9488',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0 0 12px'
  },
  microBtn: {
    background: 'none',
    border: 'none',
    color: '#0d9488',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '0'
  },
  slidersGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  sliderControlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  paneFooter: {
    padding: '18px 24px',
    borderTop: '1px solid #e2e8f0',
    background: '#ffffff',
    flexShrink: 0
  },
  btnPrimaryLarge: {
    width: '100%',
    background: '#0d9488',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(13, 148, 136, 0.25)'
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  }
};
