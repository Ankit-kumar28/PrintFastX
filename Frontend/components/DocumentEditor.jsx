import { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import {
  ZoomIn, ZoomOut, RotateCw, RotateCcw, Download,
  Check, FileText, Maximize, Crop as CropIcon, RefreshCw,
  Sun, Droplets, Contrast
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

// Maps destination corners to user perspective handles
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
        if (Math.sqrt((data[idx] - bgR) ** 2 + (data[idx + 1] - bgG) ** 2 + (data[idx + 2] - bgB) ** 2) > threshold) {
          points.push({ x, y });
          break;
        }
      }
    }

    // Bottom-to-Top scan
    for (let x = Math.round(tempW * 0.15); x < Math.round(tempW * 0.85); x += 2) {
      for (let y = tempH - 1; y > Math.round(tempH * 0.5); y--) {
        const idx = (y * tempW + x) * 4;
        if (Math.sqrt((data[idx] - bgR) ** 2 + (data[idx + 1] - bgG) ** 2 + (data[idx + 2] - bgB) ** 2) > threshold) {
          points.push({ x, y });
          break;
        }
      }
    }

    // Left-to-Right scan
    for (let y = Math.round(tempH * 0.15); y < Math.round(tempH * 0.85); y += 2) {
      for (let x = 0; x < Math.round(tempW * 0.5); x++) {
        const idx = (y * tempW + x) * 4;
        if (Math.sqrt((data[idx] - bgR) ** 2 + (data[idx + 1] - bgG) ** 2 + (data[idx + 2] - bgB) ** 2) > threshold) {
          points.push({ x, y });
          break;
        }
      }
    }

    // Right-to-Left scan
    for (let y = Math.round(tempH * 0.15); y < Math.round(tempH * 0.85); y += 2) {
      for (let x = tempW - 1; x > Math.round(tempW * 0.5); x--) {
        const idx = (y * tempW + x) * 4;
        if (Math.sqrt((data[idx] - bgR) ** 2 + (data[idx + 1] - bgG) ** 2 + (data[idx + 2] - bgB) ** 2) > threshold) {
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

export default function DocumentEditor({ originalImage, imageLoaded, onClose, onSave, mode = 'customer' }) {
  // ── States ──────────────────────────────────────────────────────────────────
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

  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [dragMode, setDragMode] = useState('crop'); // 'crop' | 'pan'
  const [cropActive, setCropActive] = useState(true);

  const getInitialPerspectivePoints = useCallback(() => {
    const margin = 80;
    return {
      p0: { x: margin, y: margin },
      p1: { x: CANVAS_W - margin, y: margin },
      p2: { x: CANVAS_W - margin, y: CANVAS_H - margin },
      p3: { x: margin, y: CANVAS_H - margin }
    };
  }, []);

  const [p0, setP0] = useState({ x: 80, y: 80 });
  const [p1, setP1] = useState({ x: CANVAS_W - 80, y: 80 });
  const [p2, setP2] = useState({ x: CANVAS_W - 80, y: CANVAS_H - 80 });
  const [p3, setP3] = useState({ x: 80, y: CANVAS_H - 80 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  const [dpi, setDpi] = useState(300);
  const [processing, setProcessing] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const editorCanvasRef = useRef(null);
  const cropDragRef = useRef({ active: false, handle: null, startX: 0, startY: 0, startPoints: null });
  const panDragRef = useRef({ active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
  const stateRef = useRef({
    zoom: 100, rotation: 0, panX: 0, panY: 0,
    p0: { x: 80, y: 80 }, p1: { x: CANVAS_W - 80, y: 80 },
    p2: { x: CANVAS_W - 80, y: CANVAS_H - 80 }, p3: { x: 80, y: CANVAS_H - 80 },
    brightness: 100, contrast: 100, saturation: 100,
    originalImage: null, imageLoaded: false
  });
  const rafRef = useRef(null);

  stateRef.current = {
    zoom, rotation, panX, panY, p0, p1, p2, p3,
    brightness, contrast, saturation, originalImage, imageLoaded
  };

  // ── Helper Math Functions ──────────────────────────────────────────────────
  const calcFitDims = (img, cW, cH) => {
    if (!img) return { drawW: cW, drawH: cH };
    const ratio = img.width / img.height;
    return ratio > cW / cH ? { drawW: cW, drawH: cW / ratio } : { drawW: cH * ratio, drawH: cH };
  };

  const drawCheckerboard = (ctx, w, h) => {
    ctx.fillStyle = '#a7caf7ff'; // Solid light blue background
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
    const {
      originalImage, imageLoaded, zoom, rotation, panX, panY,
      p0, p1, p2, p3, brightness, contrast, saturation
    } = stateRef.current;
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

    // Render Perspective Crop Overlay
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
        ctx.filter = `brightness(${brightness}%) saturate(${saturation}%) contrast(${contrast}%)`;
        ctx.translate(w / 2 + panX, h / 2 + panY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(originalImage, -dW / 2, -dH / 2, dW, dH);
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

  // Update canvas on parameter updates
  useEffect(() => {
    if (!cropDragRef.current.active && !panDragRef.current.active) {
      drawEditor();
    }
  }, [drawEditor, zoom, rotation, panX, panY, p0, p1, p2, p3, brightness, contrast, saturation, originalImage, imageLoaded]);

  // Auto Perspective Crop on Image Load
  useEffect(() => {
    if (!originalImage || !imageLoaded) return;
    const detected = detectDocumentCorners(originalImage, CANVAS_W, CANVAS_H);
    if (detected) {
      setP0(detected.p0);
      setP1(detected.p1);
      setP2(detected.p2);
      setP3(detected.p3);
      toast.success("Document boundary detected!");
    } else {
      const pts = getInitialPerspectivePoints();
      setP0(pts.p0);
      setP1(pts.p1);
      setP2(pts.p2);
      setP3(pts.p3);
    }
  }, [originalImage, imageLoaded, getInitialPerspectivePoints]);

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

  const handleStartDrag = (e) => {
    const { x, y } = getCanvasXY(e);

    const dist = (pt1, pt2) => Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2);
    const hs = 45; // hit area
    const { p0, p1, p2, p3 } = stateRef.current;
    const pts = [p0, p1, p2, p3];

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
        startPanX: stateRef.current.panX,
        startPanY: stateRef.current.panY
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

      if (panDragRef.current.active) {
        const dx = cx - panDragRef.current.startX;
        const dy = cy - panDragRef.current.startY;
        const newPanX = panDragRef.current.startPanX + dx;
        const newPanY = panDragRef.current.startPanY + dy;
        stateRef.current.panX = newPanX;
        stateRef.current.panY = newPanY;
        setPanX(newPanX);
        setPanY(newPanY);
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

        const { originalImage, zoom, rotation, panX, panY } = stateRef.current;
        if (originalImage) {
          const { drawW, drawH } = calcFitDims(originalImage, CANVAS_W, CANVAS_H);
          const scaleVal = zoom / 100;
          const dW = drawW * scaleVal;
          const dH = drawH * scaleVal;

          const centerW = CANVAS_W / 2;
          const centerH = CANVAS_H / 2;

          let tx = rawX - (centerW + panX);
          let ty = rawY - (centerH + panY);

          const angle = -(rotation * Math.PI) / 180;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          let lx = tx * cosA - ty * sinA;
          let ly = tx * sinA + ty * cosA;

          lx = Math.max(-dW / 2, Math.min(dW / 2, lx));
          ly = Math.max(-dH / 2, Math.min(dH / 2, ly));

          const angleFwd = (rotation * Math.PI) / 180;
          const cosFwd = Math.cos(angleFwd);
          const sinFwd = Math.sin(angleFwd);
          let ftx = lx * cosFwd - ly * sinFwd;
          let fty = lx * sinFwd + ly * cosFwd;

          rawX = ftx + centerW + panX;
          rawY = fty + centerH + panY;
        }

        const targetPt = {
          x: Math.round(Math.max(0, Math.min(CANVAS_W, rawX))),
          y: Math.round(Math.max(0, Math.min(CANVAS_H, rawY)))
        };

        const updatedPoints = [...startPoints];
        updatedPoints[idx] = targetPt;

        stateRef.current.p0 = updatedPoints[0];
        stateRef.current.p1 = updatedPoints[1];
        stateRef.current.p2 = updatedPoints[2];
        stateRef.current.p3 = updatedPoints[3];

        if (idx === 0) setP0(targetPt);
        else if (idx === 1) setP1(targetPt);
        else if (idx === 2) setP2(targetPt);
        else if (idx === 3) setP3(targetPt);

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
    if (cropDragRef.current.active || panDragRef.current.active || !editorCanvasRef.current) return;
    const { x, y } = getCanvasXY(e);
    const dist = (pt1, pt2) => Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2);
    const hs = 45;
    const { p0, p1, p2, p3 } = stateRef.current;
    const pts = [p0, p1, p2, p3];
    let onCorner = false;
    for (let i = 0; i < 4; i++) {
      if (dist({ x, y }, pts[i]) < hs) {
        onCorner = true;
        break;
      }
    }
    editorCanvasRef.current.style.cursor = onCorner ? 'crosshair' : 'grab';
  };

  const resetTransforms = () => {
    setZoom(100);
    setRotation(0);
    setPanX(0);
    setPanY(0);
    const pts = getInitialPerspectivePoints();
    setP0(pts.p0);
    setP1(pts.p1);
    setP2(pts.p2);
    setP3(pts.p3);
  };

  // ── Crop and Export ────────────────────────────────────────────────────────
  const executeCrop = () => {
    if (!editorCanvasRef.current || !originalImage) return null;

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

    // Calculate dynamic output dimensions based on max side lengths
    const topEdge = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
    const bottomEdge = Math.sqrt((p2.x - p3.x) ** 2 + (p2.y - p3.y) ** 2);
    const leftEdge = Math.sqrt((p3.x - p0.x) ** 2 + (p3.y - p0.y) ** 2);
    const rightEdge = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

    const outW = Math.round(Math.max(topEdge, bottomEdge) * hrScale);
    const outH = Math.round(Math.max(leftEdge, rightEdge) * hrScale);

    if (outW < 20 || outH < 20) return null;

    const cropped = document.createElement('canvas');
    cropped.width = outW;
    cropped.height = outH;

    // Source coordinates are destination corners (flat rectangle)
    const srcPoints = [
      { x: 0, y: 0 },
      { x: outW, y: 0 },
      { x: outW, y: outH },
      { x: 0, y: outH }
    ];

    // Destination coordinates are user perspective handles on the preview canvas scaled to high-res
    const dstPoints = [
      { x: p0.x * hrScale, y: p0.y * hrScale },
      { x: p1.x * hrScale, y: p1.y * hrScale },
      { x: p2.x * hrScale, y: p2.y * hrScale },
      { x: p3.x * hrScale, y: p3.y * hrScale }
    ];

    // Compute coefficients for destination (flat rect) -> source (skewed preview quad)
    const coef = solvePerspectiveMatrix(srcPoints, dstPoints);

    // Warp perspective directly
    warpPerspective(tempCanvas, cropped, coef);

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

  const handleDirectPrint = () => {
    const cropped = executeCrop();
    if (!cropped) {
      toast.error("Please select a crop area");
      return;
    }

    setProcessing(true);
    const tid = toast.loading('Compiling direct print file...');

    cropped.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = cropped.width;
        canvas.height = cropped.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cropped, 0, 0);

        const doc = new jsPDF({
          orientation: cropped.width > cropped.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [cropped.width, cropped.height]
        });
        doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, cropped.width, cropped.height);

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
  };

  return (
    <div style={S.screenWrapper}>
      {/* Left Column: Canvas Area */}
      <div style={S.leftPaneFull}>
        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
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
            onMouseMove={handleCanvasHover}
            onTouchStart={handleStartDrag}
            style={{
              ...S.fullCanvas,
              cursor: dragMode === 'pan' ? 'grab' : 'crosshair'
            }}
          />
        </div>

        {/* Toolbar under Canvas */}
        <div style={S.sliderToolbar}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                const pts = getInitialPerspectivePoints();
                setP0(pts.p0);
                setP1(pts.p1);
                setP2(pts.p2);
                setP3(pts.p3);
              }}
              style={S.btnSecondary}
              className="btn-action"
            >
              <Maximize size={14} style={{ marginRight: '6px' }} />
              Reset Perspective Corners
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
            <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
              {renderRangeSlider(
                "🔎 Zoom Level",
                zoom,
                10,
                250,
                5,
                val => setZoom(val),
                "%"
              )}

              {renderRangeSlider(
                "🔄 Fine-Grain Rotation",
                rotation,
                -180,
                180,
                1,
                val => setRotation(val),
                "°"
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={resetTransforms}
                style={{ ...S.modeTab, color: '#f43f5e', border: '1px solid #fecdd3' }}
                className="btn-action"
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
              {renderRangeSlider(
                "🔆 Brightness",
                brightness,
                50,
                150,
                2,
                val => setBrightness(val),
                "%"
              )}

              {renderRangeSlider(
                "⚡ Contrast",
                contrast,
                50,
                150,
                2,
                val => setContrast(val),
                "%"
              )}

              {renderRangeSlider(
                "🌈 Saturation",
                saturation,
                0,
                200,
                5,
                val => setSaturation(val),
                "%"
              )}

              {renderRangeSlider(
                "✨ Sharpness",
                sharpness,
                0,
                100,
                5,
                val => setSharpness(val),
                "%"
              )}
            </div>
          </div>

          <div style={S.panelSegment}>
            <h4 style={S.segmentTitle}>📥 Export & Download</h4>
            <div style={{ marginBottom: '16px' }}>
              {renderRangeSlider(
                "🖨️ Export DPI (Quality)",
                dpi,
                72,
                1200,
                24,
                val => setDpi(val),
                " DPI"
              )}
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
              onClick={handleDirectPrint}
              style={{ ...S.btnPrimaryLarge, background: '#0f172a', color: '#ffffff' }}
              className="btn-action"
            >
              Direct Print Document
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
