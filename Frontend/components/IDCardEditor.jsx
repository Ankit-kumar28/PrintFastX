// components/IDCardEditor.jsx  ·  High-Fidelity ID Card Printer Studio v2
// Screen 1: Perspective Crop and Individual Side Color Tuning (Front & Back)
// Screen 2: Live Matrix Generation & Printable Layout Sheet (side-by-side / stacked pairs, paper select, rounded corners/guidelines)

import { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import {
  X, ZoomIn, ZoomOut, RotateCw, RotateCcw, Download,
  Check, FileText, Image as ImageIcon, RefreshCw, Sun,
  Contrast, Grid, Minus, Plus, Crop as CropIcon, Scissors,
  ArrowRight, ArrowLeft, Trash2, Printer, Maximize
} from 'lucide-react';

const CANVAS_W = 2000;
const CANVAS_H = 1800;

// ── Gaussian Elimination Solver for 8x8 Linear Systems ───────────────────────
function gaussElimination(A, B) {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    // Search for maximum in this column
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    // Swap maximum row with current row (column by column)
    for (let k = i; k < n; k++) {
      const tmp = A[maxRow][k];
      A[maxRow][k] = A[i][k];
      A[i][k] = tmp;
    }
    const tmp = B[maxRow];
    B[maxRow] = B[i];
    B[i] = tmp;

    // Make all rows below this one 0 in current column
    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
      B[k] += c * B[i];
    }
  }

  // Solve equation Ax=B for an upper triangular matrix
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = B[i] / A[i][i];
    for (let k = i - 1; k >= 0; k--) {
      B[k] -= A[k][i] * x[i];
    }
  }
  return x;
}

// Maps destination card corners to user perspective handles
function solvePerspectiveMatrix(src, dst) {
  const M = [];
  const D = [];
  for (let i = 0; i < 4; i++) {
    const s = src[i];
    const d = dst[i];
    M.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y]);
    D.push(d.x);
    M.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y]);
    D.push(d.y);
  }
  return gaussElimination(M, D);
}

// ── Bilinear Interpolation Warp Perspective ──────────────────────────────────
const warpPerspective = (srcCanvas, dstCanvas, coef) => {
  const srcCtx = srcCanvas.getContext('2d');
  const dstCtx = dstCanvas.getContext('2d');
  const sW = srcCanvas.width;
  const sH = srcCanvas.height;
  const dW = dstCanvas.width;
  const dH = dstCanvas.height;

  const srcData = srcCtx.getImageData(0, 0, sW, sH);
  const dstData = dstCtx.createImageData(dW, dH);

  const sData = srcData.data;
  const dData = dstData.data;

  const [a0, a1, a2, a3, a4, a5, b0, b1] = coef;

  for (let v = 0; v < dH; v++) {
    for (let u = 0; u < dW; u++) {
      const denom = b0 * u + b1 * v + 1;
      const x = (a0 * u + a1 * v + a2) / denom;
      const y = (a3 * u + a4 * v + a5) / denom;

      // Bilinear interpolation
      const x0 = Math.floor(x);
      const x1 = x0 + 1;
      const y0 = Math.floor(y);
      const y1 = y0 + 1;

      if (x0 >= 0 && x1 < sW && y0 >= 0 && y1 < sH) {
        const dx = x - x0;
        const dy = y - y0;

        const idx00 = (y0 * sW + x0) * 4;
        const idx01 = (y0 * sW + x1) * 4;
        const idx10 = (y1 * sW + x0) * 4;
        const idx11 = (y1 * sW + x1) * 4;

        const dstIdx = (v * dW + u) * 4;

        for (let c = 0; c < 4; c++) {
          const val = (1 - dx) * (1 - dy) * sData[idx00 + c] +
                      dx * (1 - dy) * sData[idx01 + c] +
                      (1 - dx) * dy * sData[idx10 + c] +
                      dx * dy * sData[idx11 + c];
          dData[dstIdx + c] = Math.round(val);
        }
      } else {
        const dstIdx = (v * dW + u) * 4;
        dData[dstIdx + 3] = 0; // Alpha = 0
      }
    }
  }
  dstCtx.putImageData(dstData, 0, 0);
};

// Helper to calculate fit dimensions
const calcFitDims = (img, cW, cH) => {
  if (!img) return { drawW: cW, drawH: cH };
  const ratio = img.width / img.height;
  return ratio > cW / cH ? { drawW: cW, drawH: cW / ratio } : { drawW: cH * ratio, drawH: cH };
};

// Helper to apply sharpness kernel on canvas 2d context
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

// Helper to draw a rounded rectangle on a canvas context
const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

// ── Auto Perspective Crop (Corner Detection) Helper ────────────────────────
const detectDocumentCorners = (img, canvasW, canvasH) => {
  try {
    const tempCanvas = document.createElement('canvas');
    const tempW = 150;
    const tempH = 150;
    tempCanvas.width = tempW;
    tempCanvas.height = tempH;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, tempW, tempH);
    const imgData = ctx.getImageData(0, 0, tempW, tempH);
    const data = imgData.data;

    // 1. Compute average background color from the outer border (outer 6 pixels)
    let totalR = 0, totalG = 0, totalB = 0, sampleCount = 0;
    const borderThickness = 6;
    for (let y = 0; y < tempH; y++) {
      for (let x = 0; x < tempW; x++) {
        if (x < borderThickness || x >= tempW - borderThickness || y < borderThickness || y >= tempH - borderThickness) {
          const idx = (y * tempW + x) * 4;
          totalR += data[idx];
          totalG += data[idx + 1];
          totalB += data[idx + 2];
          sampleCount++;
        }
      }
    }
    const bgR = totalR / sampleCount;
    const bgG = totalG / sampleCount;
    const bgB = totalB / sampleCount;

    // 2. Scan from 4 edges to find color transition points
    const points = [];
    const threshold = 35; // color distance threshold

    // Top-to-Bottom scan
    for (let x = Math.round(tempW * 0.15); x < Math.round(tempW * 0.85); x += 2) {
      for (let y = 0; y < Math.round(tempH * 0.5); y++) {
        const idx = (y * tempW + x) * 4;
        if (Math.sqrt((data[idx] - bgR)**2 + (data[idx+1] - bgG)**2 + (data[idx+2] - bgB)**2) > threshold) {
          points.push({ x, y });
          break;
        }
      }
    }

    // Bottom-to-Top scan
    for (let x = Math.round(tempW * 0.15); x < Math.round(tempW * 0.85); x += 2) {
      for (let y = tempH - 1; y > Math.round(tempH * 0.5); y--) {
        const idx = (y * tempW + x) * 4;
        if (Math.sqrt((data[idx] - bgR)**2 + (data[idx+1] - bgG)**2 + (data[idx+2] - bgB)**2) > threshold) {
          points.push({ x, y });
          break;
        }
      }
    }

    // Left-to-Right scan
    for (let y = Math.round(tempH * 0.15); y < Math.round(tempH * 0.85); y += 2) {
      for (let x = 0; x < Math.round(tempW * 0.5); x++) {
        const idx = (y * tempW + x) * 4;
        if (Math.sqrt((data[idx] - bgR)**2 + (data[idx+1] - bgG)**2 + (data[idx+2] - bgB)**2) > threshold) {
          points.push({ x, y });
          break;
        }
      }
    }

    // Right-to-Left scan
    for (let y = Math.round(tempH * 0.15); y < Math.round(tempH * 0.85); y += 2) {
      for (let x = tempW - 1; x > Math.round(tempW * 0.5); x--) {
        const idx = (y * tempW + x) * 4;
        if (Math.sqrt((data[idx] - bgR)**2 + (data[idx+1] - bgG)**2 + (data[idx+2] - bgB)**2) > threshold) {
          points.push({ x, y });
          break;
        }
      }
    }

    if (points.length < 25) return null; // not enough transition points

    // 3. Find corners using projection metrics
    let tl = points[0], tr = points[0], br = points[0], bl = points[0];
    let minTL = tl.x + tl.y;
    let maxTR = tr.x - tr.y;
    let maxBR = br.x + br.y;
    let maxBL = bl.y - bl.x;

    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const valTL = p.x + p.y;
      const valTR = p.x - p.y;
      const valBR = p.x + p.y;
      const valBL = p.y - p.x;

      if (valTL < minTL) { minTL = valTL; tl = p; }
      if (valTR > maxTR) { maxTR = valTR; tr = p; }
      if (valBR > maxBR) { maxBR = valBR; br = p; }
      if (valBL > maxBL) { maxBL = valBL; bl = p; }
    }

    // Scale points back to the editor canvas coordinate space
    const scaleX = canvasW / tempW;
    const scaleY = canvasH / tempH;

    return {
      p0: { x: Math.round(tl.x * scaleX), y: Math.round(tl.y * scaleY) },
      p1: { x: Math.round(tr.x * scaleX), y: Math.round(tr.y * scaleY) },
      p2: { x: Math.round(br.x * scaleX), y: Math.round(br.y * scaleY) },
      p3: { x: Math.round(bl.x * scaleX), y: Math.round(bl.y * scaleY) }
    };
  } catch (e) {
    console.error("Auto-crop detection error:", e);
    return null;
  }
};

export default function IDCardEditor({
  originalImage,
  imageLoaded,
  onClose,
  onSave,
  mode = 'customer',
  wizardStep: propsWizardStep,
  setWizardStep: propsSetWizardStep,
  batchFiles = []
}) {
  // ── Wizard Workflow ────────────────────────────────────────────────────────
  // step 1: Crop and color-tune front / back side
  // step 2: Printable sheet layout matrix
  const [localWizardStep, setLocalWizardStep] = useState(1);
  const wizardStep = propsWizardStep !== undefined ? propsWizardStep : localWizardStep;
  const setWizardStep = propsSetWizardStep !== undefined ? propsSetWizardStep : setLocalWizardStep;

  const [currentCropTarget, setCurrentCropTarget] = useState('front'); // 'front' | 'back'

  const renderRangeSlider = (label, value, min, max, step, onChange, unit = '') => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        <div style={S.sliderLabelRow}>
          <span>{label}</span>
          <span>{value}{unit}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <button
            type="button"
            onClick={() => onChange(Math.max(min, value - step))}
            style={S.sliderStepBtn}
            className="btn-action"
          >
            -
          </button>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(parseInt(e.target.value) || 0)}
            style={{ flex: 1, cursor: 'pointer' }}
          />
          <button
            type="button"
            onClick={() => onChange(Math.min(max, value + step))}
            style={S.sliderStepBtn}
            className="btn-action"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  // ── Card Image Assets ──────────────────────────────────────────────────────
  const [frontOriginalImage, setFrontOriginalImage] = useState(null); // Optional separate front image
  const [backOriginalImage, setBackOriginalImage] = useState(null); // Optional separate back image
  const [frontCroppedImage, setFrontCroppedImage] = useState(null);
  const [backCroppedImage, setBackCroppedImage] = useState(null);
  const [processing, setProcessing] = useState(false);

  // ── Sizing Geometry ────────────────────────────────────────────────────────
  const [cardOrientation, setCardOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [dragMode, setDragMode] = useState('crop'); // 'crop' | 'pan'

  const getInitialPerspectivePoints = useCallback((orient) => {
    const isPortrait = orient === 'portrait';
    const aspect = isPortrait ? (53.98 / 85.60) : (85.60 / 53.98);
    const h = Math.round(CANVAS_H * 0.5);
    const w = Math.round(h * aspect);
    const x0 = Math.round((CANVAS_W - w) / 2);
    const y0 = Math.round((CANVAS_H - h) / 2);
    return {
      p0: { x: x0, y: y0 },
      p1: { x: x0 + w, y: y0 },
      p2: { x: x0 + w, y: y0 + h },
      p3: { x: x0, y: y0 + h }
    };
  }, []);

  // Independent configurations (perspective corners & tuning) per-side
  const [frontConfig, setFrontConfig] = useState({
    zoom: 100,
    rotation: 0,
    panX: 0,
    panY: 0,
    p0: { x: 247, y: 480 },
    p1: { x: 1103, y: 480 },
    p2: { x: 1103, y: 1020 },
    p3: { x: 247, y: 1020 },
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpness: 0
  });

  const [backConfig, setBackConfig] = useState({
    zoom: 100,
    rotation: 0,
    panX: 0,
    panY: 0,
    p0: { x: 247, y: 480 },
    p1: { x: 1103, y: 480 },
    p2: { x: 1103, y: 1020 },
    p3: { x: 247, y: 1020 },
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpness: 0
  });

  // Helpers for current side
  const activeConfig = currentCropTarget === 'front' ? frontConfig : backConfig;
  const activeImage = currentCropTarget === 'front' ? (frontOriginalImage || originalImage) : (backOriginalImage || originalImage);

  // Dragging refs
  const cropDragRef = useRef({ active: false, handle: null, startX: 0, startY: 0, startPoints: null });
  const panDragRef = useRef({ active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
  const stateRef = useRef({
    wizardStep, currentCropTarget, frontConfig, backConfig,
    frontOriginalImage, backOriginalImage, originalImage, imageLoaded
  });
  const rafRef = useRef(null);

  stateRef.current = {
    wizardStep, currentCropTarget, frontConfig, backConfig,
    frontOriginalImage, backOriginalImage, originalImage, imageLoaded
  };

  // ── Sheet styling options ──────────────────────────────────────────────────
  const [roundedCorners, setRoundedCorners] = useState(true);
  const [drawGuidelines, setDrawGuidelines] = useState(true);

  // ── Layout Matrix Settings ─────────────────────────────────────────────────
  const [copies, setCopies] = useState(1);
  const [paperSize, setPaperSize] = useState('a4');
  const [sheetLayout, setSheetLayout] = useState('side-by-side'); // 'side-by-side' | 'stacked'
  const [customPaperW, setCustomPaperW] = useState(210);
  const [customPaperH, setCustomPaperH] = useState(297);
  const [gapX, setGapX] = useState(5);
  const [gapY, setGapY] = useState(5);
  const [marginTop, setMarginTop] = useState(10);
  const [marginLeft, setMarginLeft] = useState(10);
  const [dpi, setDpi] = useState(300);

  const editorCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const cardW_mm = cardOrientation === 'landscape' ? 85.60 : 53.98;
  const cardH_mm = cardOrientation === 'landscape' ? 53.98 : 85.60;

  const mmToPx = useCallback((mm) => Math.round((mm / 25.4) * dpi), [dpi]);

  // ── Auto-Detect and Initialize Front Config ────────────────────────────────
  useEffect(() => {
    const img = frontOriginalImage || originalImage;
    if (!img || !imageLoaded) return;
    const detected = detectDocumentCorners(img, CANVAS_W, CANVAS_H);
    const pts = detected || getInitialPerspectivePoints(cardOrientation);
    setFrontConfig(prev => ({
      ...prev,
      ...pts,
      zoom: 100,
      rotation: 0,
      panX: 0,
      panY: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      sharpness: 0
    }));
    if (detected) {
      toast.success("Front card border detected!");
    }
  }, [frontOriginalImage, originalImage, imageLoaded, cardOrientation, getInitialPerspectivePoints]);

  // ── Auto-Detect and Initialize Back Config ─────────────────────────────────
  useEffect(() => {
    const img = backOriginalImage || originalImage;
    if (!img || !imageLoaded) return;
    const detected = detectDocumentCorners(img, CANVAS_W, CANVAS_H);
    const pts = detected || getInitialPerspectivePoints(cardOrientation);
    setBackConfig(prev => ({
      ...prev,
      ...pts,
      zoom: 100,
      rotation: 0,
      panX: 0,
      panY: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      sharpness: 0
    }));
    if (detected) {
      toast.success("Back card border detected!");
    }
  }, [backOriginalImage, originalImage, imageLoaded, cardOrientation, getInitialPerspectivePoints]);

  // ── Clear Cropped and Separate Images on Base Image Change ─────────────────
  useEffect(() => {
    setFrontCroppedImage(null);
    setBackCroppedImage(null);
    setFrontOriginalImage(null);
    setBackOriginalImage(null);
  }, [originalImage]);

  // ── Canvas Rendering Pipeline ──────────────────────────────────────────────
  const drawEditor = useCallback(() => {
    const canvas = editorCanvasRef.current;
    const {
      wizardStep, currentCropTarget, frontConfig, backConfig,
      frontOriginalImage, backOriginalImage, originalImage, imageLoaded
    } = stateRef.current;
    const activeConfig = currentCropTarget === 'front' ? frontConfig : backConfig;
    const activeImage = currentCropTarget === 'front' ? (frontOriginalImage || originalImage) : (backOriginalImage || originalImage);
    if (!canvas || !activeImage || !imageLoaded) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width, h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // ── Checkerboard base overlay ──
    ctx.fillStyle = '#a7caf7ff';
    ctx.fillRect(0, 0, w, h);

    // Draw original image with active configurations
    ctx.save();
    // Render color adjustments live on screen
    ctx.filter = `brightness(${activeConfig.brightness}%) saturate(${activeConfig.saturation}%) contrast(${activeConfig.contrast}%)`;
    ctx.translate(w / 2 + activeConfig.panX, h / 2 + activeConfig.panY);
    ctx.rotate((activeConfig.rotation * Math.PI) / 180);

    const { drawW, drawH } = calcFitDims(activeImage, w, h);
    const scaleVal = activeConfig.zoom / 100;
    const dW = drawW * scaleVal;
    const dH = drawH * scaleVal;

    ctx.drawImage(activeImage, -dW / 2, -dH / 2, dW, dH);
    ctx.restore();

    // ── Draw perspective quadrilateral overlay ──
    const { p0, p1, p2, p3 } = activeConfig;

    ctx.save();
    // Dark outer overlay, transparent inner
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill('evenodd');

    // Quad boundaries
    ctx.strokeStyle = '#1d5ff8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.stroke();

    // Magnifier implementation
    if (cropDragRef.current && cropDragRef.current.active && cropDragRef.current.handle) {
      const idx = parseInt(cropDragRef.current.handle.substring(1));
      const activePt = [p0, p1, p2, p3][idx];
      if (activePt) {
        const magSize = 160;
        const magRadius = magSize / 2;
        const magScale = 2;
        
        let mx = activePt.x - magRadius;
        let my = activePt.y - magSize - 40;
        
        if (my < 0) my = activePt.y + 40;
        if (mx < 0) mx = 10;
        if (mx + magSize > w) mx = w - magSize - 10;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        
        ctx.beginPath();
        ctx.arc(mx + magRadius, my + magRadius, magRadius, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#1d5ff8';
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(mx + magRadius, my + magRadius, magRadius - 2, 0, 2 * Math.PI);
        ctx.clip();
        
        // Draw checkered background
        ctx.fillStyle = '#dfe8f5ff';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(mx + magRadius, my + magRadius);
        ctx.scale(magScale, magScale);
        ctx.translate(-activePt.x, -activePt.y);
        ctx.filter = `brightness(${activeConfig.brightness}%) saturate(${activeConfig.saturation}%) contrast(${activeConfig.contrast}%)`;
        ctx.translate(w / 2 + activeConfig.panX, h / 2 + activeConfig.panY);
        ctx.rotate((activeConfig.rotation * Math.PI) / 180);
        ctx.drawImage(activeImage, -dW / 2, -dH / 2, dW, dH);
        ctx.restore();

        // Crosshair
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx + magRadius - 10, my + magRadius);
        ctx.lineTo(mx + magRadius + 10, my + magRadius);
        ctx.moveTo(mx + magRadius, my + magRadius - 10);
        ctx.lineTo(mx + magRadius, my + magRadius + 10);
        ctx.stroke();
        
        ctx.restore();
      }
    }

    // Draggable corner handles
    const drawPerspectiveHandle = (pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 16, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#1d5ff8';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#1d5ff8';
      ctx.fill();
    };

    drawPerspectiveHandle(p0);
    drawPerspectiveHandle(p1);
    drawPerspectiveHandle(p2);
    drawPerspectiveHandle(p3);

    ctx.restore();
  }, []);

  useEffect(() => {
    if (wizardStep === 1 && !cropDragRef.current.active && !panDragRef.current.active) {
      drawEditor();
    }
  }, [wizardStep, drawEditor, currentCropTarget, frontConfig, backConfig, frontOriginalImage, backOriginalImage, originalImage, imageLoaded]);

  // ── Drag & Hover event listeners ───────────────────────────────────────────
  const getCanvasXY = (e) => {
    const rect = editorCanvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.round(((cx - rect.left) / rect.width) * CANVAS_W),
      y: Math.round(((cy - rect.top) / rect.height) * CANVAS_H),
    };
  };

  const handleStartDrag = (e) => {
    if (wizardStep !== 1) return;
    const { x, y } = getCanvasXY(e);
    
    const dist = (pt1, pt2) => Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2);
    const hs = 45; // hit area
    const activeCfg = currentCropTarget === 'front' ? stateRef.current.frontConfig : stateRef.current.backConfig;
    const pts = [activeCfg.p0, activeCfg.p1, activeCfg.p2, activeCfg.p3];
    
    let selectedIdx = -1;
    for (let i = 0; i < 4; i++) {
      if (dist({ x, y }, pts[i]) < hs) {
        selectedIdx = i;
        break;
      }
    }

    if (selectedIdx !== -1) {
      cropDragRef.current = {
        active: true,
        handle: `p${selectedIdx}`,
        startX: x,
        startY: y,
        startPoints: pts.map(p => ({ ...p }))
      };
    } else {
      panDragRef.current = {
        active: true,
        startX: e.touches ? e.touches[0].clientX : e.clientX,
        startY: e.touches ? e.touches[0].clientY : e.clientY,
        startPanX: activeCfg.panX,
        startPanY: activeCfg.panY
      };
    }
  };

  useEffect(() => {
    const handleWindowMove = (e) => {
      if (!cropDragRef.current.active && !panDragRef.current.active) return;
      if (e.cancelable && e.type !== 'mousemove') e.preventDefault?.();

      const rect = editorCanvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;

      const { currentCropTarget, frontConfig, backConfig } = stateRef.current;
      const activeCfg = currentCropTarget === 'front' ? frontConfig : backConfig;
      const updateCfg = (updater) => {
        if (currentCropTarget === 'front') setFrontConfig(prev => updater(prev));
        else setBackConfig(prev => updater(prev));
      };

      if (panDragRef.current.active) {
        const dx = cx - panDragRef.current.startX;
        const dy = cy - panDragRef.current.startY;
        const newPanX = panDragRef.current.startPanX + dx;
        const newPanY = panDragRef.current.startPanY + dy;
        activeCfg.panX = newPanX;
        activeCfg.panY = newPanY;
        updateCfg(prev => ({ ...prev, panX: newPanX, panY: newPanY }));
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            drawEditor();
          });
        }
        return;
      }

      if (cropDragRef.current.active) {
        const x = Math.round(((cx - rect.left) / rect.width) * CANVAS_W);
        const y = Math.round(((cy - rect.top) / rect.height) * CANVAS_H);

        const { handle, startX, startY, startPoints } = cropDragRef.current;
        const dx = x - startX;
        const dy = y - startY;

        const idx = parseInt(handle.substring(1));
        let rawX = startPoints[idx].x + dx;
        let rawY = startPoints[idx].y + dy;

        const { frontOriginalImage, backOriginalImage, originalImage } = stateRef.current;
        const img = currentCropTarget === 'front' ? (frontOriginalImage || originalImage) : (backOriginalImage || originalImage);
        if (img) {
          const { drawW, drawH } = calcFitDims(img, CANVAS_W, CANVAS_H);
          const scaleVal = activeCfg.zoom / 100;
          const dW = drawW * scaleVal;
          const dH = drawH * scaleVal;

          const centerW = CANVAS_W / 2;
          const centerH = CANVAS_H / 2;

          let tx = rawX - (centerW + activeCfg.panX);
          let ty = rawY - (centerH + activeCfg.panY);

          const angle = -(activeCfg.rotation * Math.PI) / 180;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          let lx = tx * cosA - ty * sinA;
          let ly = tx * sinA + ty * cosA;

          lx = Math.max(-dW / 2, Math.min(dW / 2, lx));
          ly = Math.max(-dH / 2, Math.min(dH / 2, ly));

          const angleFwd = (activeCfg.rotation * Math.PI) / 180;
          const cosFwd = Math.cos(angleFwd);
          const sinFwd = Math.sin(angleFwd);
          let ftx = lx * cosFwd - ly * sinFwd;
          let fty = lx * sinFwd + ly * cosFwd;

          rawX = ftx + centerW + activeCfg.panX;
          rawY = fty + centerH + activeCfg.panY;
        }

        const targetPt = {
          x: Math.round(Math.max(0, Math.min(CANVAS_W, rawX))),
          y: Math.round(Math.max(0, Math.min(CANVAS_H, rawY)))
        };

        const updatedPoints = [...startPoints];
        updatedPoints[idx] = targetPt;

        activeCfg.p0 = updatedPoints[0];
        activeCfg.p1 = updatedPoints[1];
        activeCfg.p2 = updatedPoints[2];
        activeCfg.p3 = updatedPoints[3];

        updateCfg(prev => ({
          ...prev,
          p0: updatedPoints[0],
          p1: updatedPoints[1],
          p2: updatedPoints[2],
          p3: updatedPoints[3]
        }));

        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            drawEditor();
          });
        }
      }
    };

    const handleWindowUp = () => {
      if (cropDragRef.current.active || panDragRef.current.active) {
        cropDragRef.current.active = false;
        panDragRef.current.active = false;
        if (editorCanvasRef.current) editorCanvasRef.current.style.cursor = 'grab';
      }
    };

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchmove', handleWindowMove, { passive: false });
    window.addEventListener('touchend', handleWindowUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchmove', handleWindowMove);
      window.removeEventListener('touchend', handleWindowUp);
    };
  }, [drawEditor]);

  const handleCanvasHover = (e) => {
    if (wizardStep !== 1 || cropDragRef.current.active || panDragRef.current.active || !editorCanvasRef.current) return;
    const { x, y } = getCanvasXY(e);
    const dist = (pt1, pt2) => Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2);
    const hs = 45;
    const activeCfg = currentCropTarget === 'front' ? stateRef.current.frontConfig : stateRef.current.backConfig;
    const pts = [activeCfg.p0, activeCfg.p1, activeCfg.p2, activeCfg.p3];
    let onCorner = false;
    for (let i = 0; i < 4; i++) {
      if (dist({ x, y }, pts[i]) < hs) {
        onCorner = true;
        break;
      }
    }
    editorCanvasRef.current.style.cursor = onCorner ? 'crosshair' : 'grab';
  };



  // ── Projective Warp Perspective Crop ────────────────────────────────────────
  const executeCrop = (img, config) => {
    // 1. Render currently positioned image onto a temporary full-density canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_W;
    tempCanvas.height = CANVAS_H;
    const tCtx = tempCanvas.getContext('2d');

    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    tCtx.save();
    tCtx.filter = `brightness(${config.brightness}%) saturate(${config.saturation}%) contrast(${config.contrast}%)`;
    tCtx.translate(CANVAS_W / 2 + config.panX, CANVAS_H / 2 + config.panY);
    tCtx.rotate((config.rotation * Math.PI) / 180);

    const { drawW, drawH } = calcFitDims(img, CANVAS_W, CANVAS_H);
    const scaleVal = config.zoom / 100;
    const dW = drawW * scaleVal;
    const dH = drawH * scaleVal;

    tCtx.drawImage(img, -dW / 2, -dH / 2, dW, dH);
    tCtx.restore();

    // 2. Perform sharpness filter on temporary canvas
    if (config.sharpness > 0) {
      applySharpness(tCtx, CANVAS_W, CANVAS_H, config.sharpness);
    }

    // 3. Create destination card canvas to map projective transform output
    const cropped = document.createElement('canvas');
    const outW = cardOrientation === 'landscape' ? 1013 : 638;
    const outH = cardOrientation === 'landscape' ? 638 : 1013;
    cropped.width = outW;
    cropped.height = outH;

    // Source coordinates are destination card corners
    const srcPoints = [
      { x: 0, y: 0 },
      { x: outW, y: 0 },
      { x: outW, y: outH },
      { x: 0, y: outH }
    ];

    // Destination coordinates are user perspective handles on the preview canvas
    const dstPoints = [config.p0, config.p1, config.p2, config.p3];

    // Compute coefficients for destination (card rect) -> source (skewed preview quad)
    const coef = solvePerspectiveMatrix(srcPoints, dstPoints);

    // Warp perspective directly
    warpPerspective(tempCanvas, cropped, coef);

    const croppedImg = new Image();
    croppedImg.src = cropped.toDataURL('image/jpeg', 0.95);
    return croppedImg;
  };

  const saveActiveCutout = () => {
    const cropped = executeCrop(activeImage, activeConfig);
    if (!cropped) {
      toast.error('Invalid perspective dimensions');
      return;
    }
    cropped.onload = () => {
      if (currentCropTarget === 'front') {
        setFrontCroppedImage(cropped);
        toast.success('Front Card side crop and colors saved!');
      } else {
        setBackCroppedImage(cropped);
        toast.success('Back Card side crop and colors saved!');
      }
    };
  };

  const handleSeparateBackUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setBackOriginalImage(img);
      setProcessing(false);
      toast.success('Separate Back Image loaded!');
      const pts = getInitialPerspectivePoints(cardOrientation);
      setBackConfig(prev => ({ ...prev, ...pts, zoom: 100, rotation: 0, panX: 0, panY: 0, brightness: 100, contrast: 100, saturation: 100, sharpness: 0 }));
    };
    img.onerror = () => {
      setProcessing(false);
      toast.error('Failed to load separate back image');
    };
    img.src = URL.createObjectURL(file);
  };

  const handleSelectBatchBackImage = (fileItem) => {
    setProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setBackOriginalImage(img);
      setProcessing(false);
      toast.success(`Loaded "${fileItem.fileName}" as Back Side!`);
      const pts = getInitialPerspectivePoints(cardOrientation);
      setBackConfig(prev => ({ ...prev, ...pts, zoom: 100, rotation: 0, panX: 0, panY: 0, brightness: 100, contrast: 100, saturation: 100, sharpness: 0 }));
    };
    img.onerror = () => {
      setProcessing(false);
      toast.error('Failed to load selected batch image');
    };
    img.src = fileItem.url instanceof File ? URL.createObjectURL(fileItem.url) : fileItem.url;
  };

  const handleSeparateFrontUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setFrontOriginalImage(img);
      setProcessing(false);
      toast.success('Separate Front Image loaded!');
      const pts = getInitialPerspectivePoints(cardOrientation);
      setFrontConfig(prev => ({ ...prev, ...pts, zoom: 100, rotation: 0, panX: 0, panY: 0, brightness: 100, contrast: 100, saturation: 100, sharpness: 0 }));
    };
    img.onerror = () => {
      setProcessing(false);
      toast.error('Failed to load separate front image');
    };
    img.src = URL.createObjectURL(file);
  };

  const handleSelectBatchFrontImage = (fileItem) => {
    setProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setFrontOriginalImage(img);
      setProcessing(false);
      toast.success(`Loaded "${fileItem.fileName}" as Front Side!`);
      const pts = getInitialPerspectivePoints(cardOrientation);
      setFrontConfig(prev => ({ ...prev, ...pts, zoom: 100, rotation: 0, panX: 0, panY: 0, brightness: 100, contrast: 100, saturation: 100, sharpness: 0 }));
    };
    img.onerror = () => {
      setProcessing(false);
      toast.error('Failed to load selected batch image');
    };
    img.src = fileItem.url instanceof File ? URL.createObjectURL(fileItem.url) : fileItem.url;
  };

  const handleNextToStep2 = () => {
    if (!frontCroppedImage) {
      toast.error('Please crop and save the Front Side first');
      return;
    }
    if (!backCroppedImage) {
      toast.error('Please crop and save the Back Side first');
      return;
    }
    setWizardStep(2);
  };

  // ── Sheet Layout Preview (Matrix Generation) ──────────────────────────────
  const getSheetSize = () => {
    if (paperSize === 'a4') return { w: 210, h: 297 };
    if (paperSize === '4x6') return { w: 101.6, h: 152.4 };
    if (paperSize === '5x7') return { w: 127, h: 177.8 };
    if (paperSize === 'a5') return { w: 148, h: 210 };
    if (paperSize === 'letter') return { w: 215.9, h: 279.4 };
    if (paperSize === 'custom') return { w: Number(customPaperW) || 210, h: Number(customPaperH) || 297 };
    return { w: 210, h: 297 };
  };

  const calculateIDCardLayout = (sheetW, sheetH, cW, cH, spacingX, spacingY, mLeft, mTop, maxCopies) => {
    const placements = [];
    let pairCount = 0;

    const pairW = sheetLayout === 'side-by-side' ? (2 * cW + spacingX) : cW;
    const pairH = sheetLayout === 'side-by-side' ? cH : (2 * cH + spacingY);

    const cols = Math.max(1, Math.floor((sheetW - 2 * mLeft + spacingX) / (pairW + spacingX)));
    const rows = Math.max(1, Math.floor((sheetH - 2 * mTop + spacingY) / (pairH + spacingY)));

    for (let r = 0; r < rows && pairCount < maxCopies; r++) {
      for (let c = 0; c < cols && pairCount < maxCopies; c++) {
        const x = mLeft + c * (pairW + spacingX);
        const y = mTop + r * (pairH + spacingY);

        if (sheetLayout === 'side-by-side') {
          placements.push({
            front: { x, y, w: cW, h: cH },
            back: { x: x + cW + spacingX, y, w: cW, h: cH }
          });
        } else {
          placements.push({
            front: { x, y, w: cW, h: cH },
            back: { x, y: y + cH + spacingY, w: cW, h: cH }
          });
        }
        pairCount++;
      }
    }
    return placements;
  };

  // Renders a pre-cropped card cutout onto a canvas with corners & guidelines
  const buildSingleCardCanvas = (img) => {
    const canvas = document.createElement('canvas');
    const w = mmToPx(cardW_mm);
    const h = mmToPx(cardH_mm);
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Image is already warped and filter-adjusted when cutout was saved
    ctx.save();
    if (roundedCorners) {
      const rad = Math.round(w * 0.045);
      drawRoundedRect(ctx, 0, 0, w, h, rad);
      ctx.clip();
    }
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();

    if (drawGuidelines) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = Math.max(1, Math.round(w * 0.003));
      if (roundedCorners) {
        const rad = Math.round(w * 0.045);
        drawRoundedRect(ctx, 0, 0, w, h, rad);
        ctx.stroke();
      } else {
        ctx.strokeRect(0, 0, w, h);
      }
    }

    return canvas;
  };

  const buildSheetCanvas = () => {
    const sDims = getSheetSize();
    const sheetW = mmToPx(sDims.w);
    const sheetH = mmToPx(sDims.h);

    const sheet = document.createElement('canvas');
    sheet.width = sheetW;
    sheet.height = sheetH;

    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetW, sheetH);

    const cW_px = mmToPx(cardW_mm);
    const cH_px = mmToPx(cardH_mm);
    const gapX_px = mmToPx(gapX);
    const gapY_px = mmToPx(gapY);
    const mTop_px = mmToPx(marginTop);
    const mLeft_px = mmToPx(marginLeft);

    const singleFront = buildSingleCardCanvas(frontCroppedImage);
    const singleBack = buildSingleCardCanvas(backCroppedImage);

    const placements = calculateIDCardLayout(
      sheetW, sheetH, cW_px, cH_px, gapX_px, gapY_px, mLeft_px, mTop_px, copies
    );

    placements.forEach(p => {
      ctx.drawImage(singleFront, p.front.x, p.front.y, p.front.w, p.front.h);
      ctx.drawImage(singleBack, p.back.x, p.back.y, p.back.w, p.back.h);
    });

    return sheet;
  };

  const drawLayoutPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !frontCroppedImage || !backCroppedImage) return;

    const ctx = canvas.getContext('2d');
    const PREVIEW_W = canvas.width;
    const sDims = getSheetSize();
    const paperAspect = sDims.h / sDims.w;
    const PREVIEW_H = PREVIEW_W * paperAspect;

    canvas.height = PREVIEW_H;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 4, PREVIEW_W - 8, PREVIEW_H - 8);

    const sheetW = mmToPx(sDims.w);
    const scale = (PREVIEW_W - 8) / sheetW;

    const cW_px = mmToPx(cardW_mm);
    const cH_px = mmToPx(cardH_mm);
    const gapX_px = mmToPx(gapX);
    const gapY_px = mmToPx(gapY);
    const mTop_px = mmToPx(marginTop);
    const mLeft_px = mmToPx(marginLeft);

    const singleFront = buildSingleCardCanvas(frontCroppedImage);
    const singleBack = buildSingleCardCanvas(backCroppedImage);

    const placements = calculateIDCardLayout(
      sheetW, mmToPx(sDims.h), cW_px, cH_px, gapX_px, gapY_px, mLeft_px, mTop_px, copies
    );

    placements.forEach(p => {
      const fX = 4 + p.front.x * scale;
      const fY = 4 + p.front.y * scale;
      const fW = p.front.w * scale;
      const fH = p.front.h * scale;

      const bX = 4 + p.back.x * scale;
      const bY = 4 + p.back.y * scale;
      const bW = p.back.w * scale;
      const bH = p.back.h * scale;

      ctx.drawImage(singleFront, fX, fY, fW, fH);
      ctx.drawImage(singleBack, bX, bY, bW, bH);
    });
  }, [
    paperSize, cardOrientation, sheetLayout, customPaperW, customPaperH,
    gapX, gapY, marginTop, marginLeft, copies, dpi, roundedCorners, drawGuidelines,
    frontCroppedImage, backCroppedImage
  ]);

  useEffect(() => {
    if (wizardStep === 2) {
      drawLayoutPreview();
    }
  }, [wizardStep, drawLayoutPreview]);

  // ── Outputs & Save Handlers ────────────────────────────────────────────────
  const downloadLayoutSheet = () => {
    const canvas = buildSheetCanvas();
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/jpeg', 0.95);
    a.download = `idcard_layout_${paperSize}.jpg`;
    a.click();
    toast.success('Downloaded HD print layout sheet!');
  };

  const handleSavePrintFile = async () => {
    setProcessing(true);
    const tid = toast.loading('Baking print layout sheet...');
    try {
      const canvas = buildSheetCanvas();
      const sDims = getSheetSize();
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: paperSize === 'custom' ? [sDims.w, sDims.h] : paperSize
      });

      doc.addImage(
        canvas.toDataURL('image/jpeg', 0.92),
        'JPEG',
        0, 0,
        sDims.w, sDims.h,
        undefined,
        'FAST'
      );

      const pdfBlob = doc.output('blob');
      const fileName = `idcard_print_${Date.now()}.pdf`;

      onSave({
        file: new File([pdfBlob], fileName, { type: 'application/pdf' }),
        name: fileName
      });

      toast.success('ID Card print sheet sent to queue!', { id: tid });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to compile ID Card PDF', { id: tid });
    } finally {
      setProcessing(false);
    }
  };

  const handleDirectPrint = async () => {
    setProcessing(true);
    const tid = toast.loading('Compiling direct print file...');
    try {
      const canvas = buildSheetCanvas();
      const sDims = getSheetSize();
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: paperSize === 'custom' ? [sDims.w, sDims.h] : paperSize
      });

      doc.addImage(
        canvas.toDataURL('image/jpeg', 0.92),
        'JPEG',
        0, 0,
        sDims.w, sDims.h,
        undefined,
        'FAST'
      );

      const pdfUrl = doc.output('bloburl');
      window.open(pdfUrl, '_blank');
      toast.success('Sent to printer!', { id: tid });
    } catch (err) {
      console.error(err);
      toast.error('Direct print failed', { id: tid });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={S.screenWrapper}>
      {wizardStep === 1 && (
        <div style={S.screenWrapper}>
          {/* Left Column: Canvas View with fullPane background styling */}
          <div style={S.leftPaneFull}>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
              <canvas
                ref={editorCanvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                onMouseDown={handleStartDrag}
                onMouseMove={handleCanvasHover}
                onTouchStart={handleStartDrag}
                style={S.fullCanvas}
              />
            </div>

            {/* Sub-canvas Control Bar */}
            <div style={{ ...S.sliderToolbar, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    const pts = getInitialPerspectivePoints(cardOrientation);
                    const updater = currentCropTarget === 'front' ? setFrontConfig : setBackConfig;
                    updater(prev => ({ ...prev, ...pts }));
                  }}
                  style={S.btnSecondary}
                  className="btn-action"
                >
                  <Maximize size={14} style={{ marginRight: '6px' }}/>
                  Reset Perspective Corners
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updater = currentCropTarget === 'front' ? setFrontConfig : setBackConfig;
                    updater(prev => ({ ...prev, rotation: prev.rotation - 90 }));
                  }}
                  style={S.btnSecondary}
                  className="btn-action"
                >
                  <RotateCcw size={14} style={{ marginRight: '6px' }}/>
                  Rotate Left
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updater = currentCropTarget === 'front' ? setFrontConfig : setBackConfig;
                    updater(prev => ({ ...prev, rotation: prev.rotation + 90 }));
                  }}
                  style={S.btnSecondary}
                  className="btn-action"
                >
                  <RotateCw size={14} style={{ marginRight: '6px' }}/>
                  Rotate Right
                </button>
              </div>

              {/* Geometry sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '420px' }}>
                {renderRangeSlider(
                  "🔎 Zoom Level",
                  activeConfig.zoom,
                  20,
                  250,
                  5,
                  val => {
                    const updater = currentCropTarget === 'front' ? setFrontConfig : setBackConfig;
                    updater(prev => ({ ...prev, zoom: val }));
                  },
                  "%"
                )}

                {renderRangeSlider(
                  "🔄 Fine-Grain Rotation",
                  activeConfig.rotation,
                  -180,
                  180,
                  1,
                  val => {
                    const updater = currentCropTarget === 'front' ? setFrontConfig : setBackConfig;
                    updater(prev => ({ ...prev, rotation: val }));
                  },
                  "°"
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Settings */}
          <div style={S.rightPane}>
            <div className="studio-scroll" style={S.paneContent}>
              
              {/* Target Crop Switcher */}
              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>🏷️ Choose Card Face</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentCropTarget('front')}
                    style={{
                      ...S.tabButton,
                      ...(currentCropTarget === 'front' ? S.tabButtonActive : {}),
                      flex: 1
                    }}
                  >
                    Front Side {frontCroppedImage ? '✅' : ''}
                  </button>
                  <button
                    onClick={() => setCurrentCropTarget('back')}
                    style={{
                      ...S.tabButton,
                      ...(currentCropTarget === 'back' ? S.tabButtonActive : {}),
                      flex: 1
                    }}
                  >
                    Back Side {backCroppedImage ? '✅' : ''}
                  </button>
                </div>
              </div>

              {/* Sizing Presets */}
              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>📏 Card Geometry</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Orientation</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setCardOrientation('landscape')}
                      style={{
                        ...S.tabButton,
                        ...(cardOrientation === 'landscape' ? S.tabButtonActive : {}),
                        flex: 1,
                        fontSize: '11px'
                      }}
                    >
                      💳 Landscape (Standard CR80)
                    </button>
                    <button
                      onClick={() => setCardOrientation('portrait')}
                      style={{
                        ...S.tabButton,
                        ...(cardOrientation === 'portrait' ? S.tabButtonActive : {}),
                        flex: 1,
                        fontSize: '11px'
                      }}
                    >
                      📛 Portrait (Vertical Badge)
                    </button>
                  </div>
                </div>
              </div>

              {/* Separate Back/Front Image Upload */}
              {(currentCropTarget === 'back' || currentCropTarget === 'front') && (
                <div style={S.panelSegment}>
                  <h4 style={S.segmentTitle}>
                    📤 Optional: Upload Separate {currentCropTarget === 'front' ? 'Front' : 'Back'} Side
                  </h4>
                  <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 10px' }}>
                    If the {currentCropTarget === 'front' ? 'front' : 'back'} of your ID card is in a different file, upload it here.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={currentCropTarget === 'front' ? handleSeparateFrontUpload : handleSeparateBackUpload}
                    style={{ fontSize: '12px', marginBottom: '14px' }}
                  />

                  {/* Batch Files Selector list */}
                  {batchFiles && batchFiles.length > 0 && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '10px' }}>
                      <h4 style={{ ...S.segmentTitle, fontSize: '11px', color: '#4f46e5' }}>
                        📋 Select {currentCropTarget === 'front' ? 'Front' : 'Back'} from Order Batch
                      </h4>
                      <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 10px' }}>
                        Or choose from other images in this order batch:
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: '8px' }}>
                        {batchFiles.map((f, i) => {
                          const isLocal = f.url instanceof File;
                          const thumbUrl = isLocal ? URL.createObjectURL(f.url) : f.url;
                          return (
                            <button
                              key={f.id || i}
                              onClick={() => {
                                if (currentCropTarget === 'front') {
                                  handleSelectBatchFrontImage(f);
                                } else {
                                  handleSelectBatchBackImage(f);
                                }
                              }}
                              style={{
                                border: '2px solid #cbd5e1',
                                borderRadius: '8px',
                                background: '#f8fafc',
                                padding: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                overflow: 'hidden'
                              }}
                              className="btn-action"
                              title={f.fileName}
                            >
                              <img
                                src={thumbUrl}
                                alt="Thumb"
                                style={{ width: '100%', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                              />
                              <span style={{ fontSize: '8px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                                {f.fileName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(currentCropTarget === 'front' ? frontOriginalImage : backOriginalImage) && (
                    <button
                      onClick={() => {
                        if (currentCropTarget === 'front') {
                          setFrontOriginalImage(null);
                          toast.success('Removed separate front image.');
                        } else {
                          setBackOriginalImage(null);
                          toast.success('Removed separate back image.');
                        }
                      }}
                      style={{ ...S.clearFilterBtn, marginTop: '14px' }}
                    >
                      🗑️ Revert to Shared Original Image
                    </button>
                  )}
                </div>
              )}

              {/* INDEPENDENT SIDE COLOR TUNING */}
              <div style={S.panelSegment}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ ...S.segmentTitle, margin: 0 }}>🎨 {currentCropTarget === 'front' ? 'Front' : 'Back'} Color Tuning</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const updater = currentCropTarget === 'front' ? setFrontConfig : setBackConfig;
                      updater(prev => ({ ...prev, brightness: 100, contrast: 100, saturation: 100, sharpness: 0 }));
                    }}
                    style={S.microBtn}
                    className="btn-action"
                  >
                    🔄 Reset Filters
                  </button>
                </div>
                <div style={S.slidersGrid}>
                  {renderRangeSlider(
                    "🔆 Brightness",
                    activeConfig.brightness,
                    50,
                    150,
                    2,
                    val => {
                      const updater = currentCropTarget === 'front' ? setFrontConfig : setBackConfig;
                      updater(prev => ({ ...prev, brightness: val }));
                    },
                    "%"
                  )}

                  {renderRangeSlider(
                    "⚡ Contrast",
                    activeConfig.contrast,
                    50,
                    150,
                    2,
                    val => {
                      const updater = currentCropTarget === 'front' ? setFrontConfig : setBackConfig;
                      updater(prev => ({ ...prev, contrast: val }));
                    },
                    "%"
                  )}

                  {renderRangeSlider(
                    "🌈 Saturation",
                    activeConfig.saturation,
                    0,
                    200,
                    5,
                    val => {
                      const updater = currentCropTarget === 'front' ? setFrontConfig : setBackConfig;
                      updater(prev => ({ ...prev, saturation: val }));
                    },
                    "%"
                  )}

                  {renderRangeSlider(
                    "✨ Sharpness",
                    activeConfig.sharpness,
                    0,
                    100,
                    5,
                    val => {
                      const updater = currentCropTarget === 'front' ? setFrontConfig : setBackConfig;
                      updater(prev => ({ ...prev, sharpness: val }));
                    },
                    "%"
                  )}
                </div>
              </div>

              {/* Save Card side crops */}
              <div style={S.panelSegment}>
                <button
                  onClick={saveActiveCutout}
                  style={{ ...S.btnPrimaryLarge, background: '#4f46e5', boxShadow: 'none' }}
                  className="btn-action"
                >
                  <Scissors size={14} style={{ marginRight: '6px' }}/>
                  Save {currentCropTarget === 'front' ? 'Front' : 'Back'} Card Cutout
                </button>
              </div>

            </div>

            <div style={S.paneFooter}>
              <button
                onClick={handleNextToStep2}
                style={S.btnPrimaryLarge}
                className="btn-action"
              >
                Next: Layout Sheet ➡️
              </button>
            </div>
          </div>
        </div>
      )}

      {wizardStep === 2 && (
        <div style={S.screenWrapper}>
          {/* Left Column: Layout Controls */}
          <div style={{ ...S.leftPane, maxWidth: '400px' }}>
            <div className="studio-scroll" style={S.paneContent}>
              
              {/* Paper Layout settings */}
              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>📄 Paper Sheet Size</h4>
                <select
                  value={paperSize}
                  onChange={e => setPaperSize(e.target.value)}
                  style={S.dropdownInput}
                >
                  <option value="a4">A4 (210×297mm)</option>
                  <option value="4x6">4×6 Inch (102×152mm)</option>
                  <option value="5x7">5×7 Inch (127×178mm)</option>
                  <option value="a5">A5 (148×210mm)</option>
                  <option value="letter">Letter (US)</option>
                  <option value="custom">Custom Size</option>
                </select>

                {paperSize === 'custom' && (
                  <div style={S.customInputGrid}>
                    <div>
                      <label style={S.miniLabel}>W (mm)</label>
                      <input type="number" value={customPaperW} onChange={e => setCustomPaperW(Number(e.target.value))} style={S.numberInput} />
                    </div>
                    <div>
                      <label style={S.miniLabel}>H (mm)</label>
                      <input type="number" value={customPaperH} onChange={e => setCustomPaperH(Number(e.target.value))} style={S.numberInput} />
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity copies */}
              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>🔢 Card Copies (Pairs)</h4>
                <div style={S.stepperBox}>
                  <button
                    onClick={() => setCopies(c => Math.max(1, c - 1))}
                    style={S.stepBtn}
                    className="btn-action"
                  >
                    <Minus size={16}/>
                  </button>
                  <span style={S.stepCountText}>{copies} Pairs</span>
                  <button
                    onClick={() => setCopies(c => Math.min(10, c + 1))}
                    style={S.stepBtn}
                    className="btn-action"
                  >
                    <Plus size={16}/>
                  </button>
                </div>
              </div>

              {/* Card arrangement stacked or side by side */}
              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>🔲 Card Alignment Orientation</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSheetLayout('side-by-side')}
                    style={{
                      ...S.tabButton,
                      ...(sheetLayout === 'side-by-side' ? S.tabButtonActive : {}),
                      flex: 1,
                      fontSize: '11px'
                    }}
                  >
                    ↔️ Side by Side
                  </button>
                  <button
                    onClick={() => setSheetLayout('stacked')}
                    style={{
                      ...S.tabButton,
                      ...(sheetLayout === 'stacked' ? S.tabButtonActive : {}),
                      flex: 1,
                      fontSize: '11px'
                    }}
                  >
                    ↕️ Stacked Vertical
                  </button>
                </div>
              </div>

              {/* Sheet Spacing control details */}
              <div style={S.panelSegment}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ ...S.segmentTitle, margin: 0 }}>📏 Margins & Gap Spacing</h4>
                  <button
                    onClick={() => { setGapX(5); setGapY(5); setMarginTop(10); setMarginLeft(10); }}
                    style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                  >
                    Reset
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {renderRangeSlider(
                    "Gap X",
                    gapX,
                    0,
                    30,
                    1,
                    val => setGapX(val),
                    "mm"
                  )}
                  {renderRangeSlider(
                    "Gap Y",
                    gapY,
                    0,
                    30,
                    1,
                    val => setGapY(val),
                    "mm"
                  )}
                  {renderRangeSlider(
                    "Margin Top",
                    marginTop,
                    0,
                    50,
                    1,
                    val => setMarginTop(val),
                    "mm"
                  )}
                  {renderRangeSlider(
                    "Margin Left",
                    marginLeft,
                    0,
                    50,
                    1,
                    val => setMarginLeft(val),
                    "mm"
                  )}
                </div>
              </div>

              {/* Card Style Customizations */}
              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>🖨️ Styling & Outline Borders</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={S.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={roundedCorners}
                      onChange={e => setRoundedCorners(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      💳 Simulate Rounded CR80 Corners
                    </span>
                  </label>

                  <label style={S.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={drawGuidelines}
                      onChange={e => setDrawGuidelines(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      ✂️ Draw Light Card Border Guidelines
                    </span>
                  </label>
                </div>
              </div>

            </div>

            <div style={S.paneFooter}>
              <button
                onClick={() => setWizardStep(1)}
                style={{ ...S.btnSecondary, width: '100%' }}
                className="btn-action"
              >
                ⬅️ Back to Options
              </button>
            </div>
          </div>

          {/* Right Column: Live Sheet preview */}
          <div style={{ ...S.rightPane, background: '#f8fafc' }}>
            <div style={{ ...S.previewTitleBar, borderRadius: 0, marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Grid size={16} color="#3b82f6"/>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#07213aff' }}>LIVE SHEET LAYOUT PREVIEW</span>
              </div>
            </div>

            <div style={S.previewCanvasWrap}>
              <canvas
                ref={previewCanvasRef}
                width={300}
                style={S.sheetMockupCanvas}
              />
            </div>

            {/* Pipeline fulfillment footer */}
            <div style={S.fulfillmentFooter}>
              <button
                onClick={downloadLayoutSheet}
                style={S.btnHdJpg}
                className="btn-action"
              >
                📥 Download HD Card Layout (JPG)
              </button>
              <button
                onClick={handleSavePrintFile}
                style={S.btnSendToPrint}
                className="btn-action"
              >
                🖨️ Send Sheet to Print Queue
              </button>
              <button
                onClick={handleDirectPrint}
                style={{ ...S.btnSendToPrint, background: '#0f172a', color: '#ffffff' }}
                className="btn-action"
              >
                Direct Print Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styling definitions
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
  leftPaneFull: {
    flex: '7',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    background: '#e2e8f0',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
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
  fullCanvas: {
    maxWidth: '100%',
    maxHeight: '100%',
    background: 'transparent',
    display: 'block'
  },
  sliderToolbar: {
    padding: '16px 20px',
    background: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    width: '100%',
    boxSizing: 'border-box'
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
  dropdownInput: {
    width: '100%',
    background: '#ffffff',
    border: '1.5px solid #cbd5e1',
    borderRadius: '10px',
    padding: '10px 12px',
    color: '#0f172a',
    fontSize: '13px',
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer'
  },
  customInputGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '12px'
  },
  miniLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: '4px',
    display: 'block'
  },
  numberInput: {
    width: '100%',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '8px 10px',
    color: '#0f172a',
    fontSize: '12px',
    fontWeight: 600,
    outline: 'none'
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
  btnPrimary: {
    background: '#0d9488',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)'
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255, 255, 255, 0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    marginBottom: '10px'
  },
  stepperBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#ffffff',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1'
  },
  stepBtn: {
    background: '#f1f5f9',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepCountText: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#0f172a'
  },
  previewTitleBar: {
    padding: '12px 18px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  previewCanvasWrap: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: '#e2e8f0'
  },
  sheetMockupCanvas: {
    background: '#ffffff',
    boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
    maxWidth: '100%',
    maxHeight: '100%'
  },
  fulfillmentFooter: {
    padding: '18px 24px',
    background: '#f8fafc',
    display: 'flex',
    gap: '12px',
    borderTop: '1px solid #e2e8f0'
  },
  btnHdJpg: {
    flex: 1,
    background: '#0a3764ff',
    color: '#e2e6ecff',
    border: '1px solid #030303ff',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnSendToPrint: {
    flex: 1.5,
    background: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
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
  tabButton: {
    padding: '8px 12px',
    fontSize: '12px',
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
  tabButtonActive: {
    background: '#0d9488',
    color: '#ffffff',
    borderColor: '#0d9488',
    boxShadow: '0 0 8px rgba(13, 148, 136, 0.2)'
  },
  microBtn: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    background: '#f1f5f9',
    color: '#475569',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  clearFilterBtn: {
    width: '100%',
    padding: '8px',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#dc2626',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  sliderStepBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    transition: 'all 0.1s'
  }
};
