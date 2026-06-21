// components/PassportPhotoMaker.jsx  ·  High-Fidelity Passport Photo Maker Studio v4
// Redesigned as a modular passport wizard step component
// Screen 1: Crop, Adjust, & Dynamic Sizing (MediaPipe face-detection & Pan/Crop modes)
// Screen 2: Tone Tuning & Advanced Backdrop Studio (Chroma-key, brush eraser, name/date identity strip)
// Screen 3: Live Matrix Generation & Print Workspace (copies stepper, spacing, margins)

import { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import {
  X, ZoomIn, ZoomOut, RotateCw, RotateCcw, Download,
  Check, FileText, Image as ImageIcon, RefreshCw, Sun, Droplets,
  Contrast, Grid, Minus, Plus, Crop as CropIcon, Scissors,
  ArrowRight, ArrowLeft, Trash2, Edit3, Move, HelpCircle, Eye, Maximize, Printer
} from 'lucide-react';

// ─── Dimension Presets ─────────────────────────────────────────────────────────
const DIMENSION_PRESETS = [
  { id: 'indian_passport', label: '🇮🇳 India Passport/PAN (35×45 mm)', w: 35, h: 45 },
  { id: 'us_visa',         label: '🇺🇸 US Visa (51×51 mm / 2×2")',   w: 51, h: 51 },
  { id: 'uk_passport',     label: '🇬🇧 UK Passport (35×45 mm)',     w: 35, h: 45 },
  { id: 'eu_passport',     label: '🇪🇺 EU Passport (35×45 mm)',     w: 35, h: 45 },
  { id: 'custom',          label: '✏️ Custom Size (Width × Height)', w: 35, h: 45 },
];
const A4_W = 2480;
const A4_H = 3508;
const PHOTO_4X6_W = 1800;
const PHOTO_4X6_H = 1200;
const CANVAS_W = 1350;
const CANVAS_H = 1500;

export default function PassportPhotoMaker({
  originalImage,
  imageLoaded,
  onClose,
  onSave,
  mode = 'customer',
  wizardStep: propsWizardStep,
  setWizardStep: propsSetWizardStep
}) {
  // ── Wizard Workflow ────────────────────────────────────────────────────────
  // step 1: Crop & Size Geometry
  // step 2: Color Tuning, Background & Identity Strip
  // step 3: Matrix sheet generator layout
  const [localWizardStep, setLocalWizardStep] = useState(1);
  const wizardStep = propsWizardStep !== undefined ? propsWizardStep : localWizardStep;
  const setWizardStep = propsSetWizardStep !== undefined ? propsSetWizardStep : setLocalWizardStep;

  // ── Image State ────────────────────────────────────────────────────────────
  const [croppedImage, setCroppedImage] = useState(null); // cropped frame from Screen 1
  const [processedAsset, setProcessedAsset] = useState(null); // final baked photo from Screen 2
  const [processing, setProcessing] = useState(false);
  const [mpLoaded, setMpLoaded] = useState(false);

  // ── Screen 1 States (Geometry & Alignment) ─────────────────────────────────
  const [zoom, setZoom] = useState(100); // 0% - 200% slider
  const [rotation, setRotation] = useState(0); // -180° to +180° slider
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [dragMode, setDragMode] = useState('crop'); // 'crop' (adjust crop rect) | 'pan' (hand pan image)
  const [dimensionPreset, setDimensionPreset] = useState('indian_passport');
  const [customW, setCustomW] = useState(35);
  const [customH, setCustomH] = useState(45);
  const [cropActive, setCropActive] = useState(true);
  const [cropRect, setCropRect] = useState({ x: 225, y: 150, w: 900, h: 1155 }); // relative to canvas
  const [cropRatioLocked, setCropRatioLocked] = useState(true);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true); // AI background cutout

  // Dragging states for Crop / Pan
  const cropDragRef = useRef({ active: false, handle: null, startX: 0, startY: 0, startRect: null });
  const panDragRef = useRef({ active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });

  // ── Screen 2 States (Tone & Backdrop Studio) ──────────────────────────────
  const [sharpness, setSharpness] = useState(0); // 0 to 100
  const [dpi, setDpi] = useState(300);
  const mmToPx = useCallback((mm) => Math.round((mm / 25.4) * dpi), [dpi]);
  const [brightness, setBrightness] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [bgColor, setBgColor] = useState('#ffffff'); // Default solid White backdrop
  const [showIdStrip, setShowIdStrip] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [captureDate, setCaptureDate] = useState(new Date().toISOString().split('T')[0]);

  // Editing Tools: Chroma Key & Manual Brush
  const [bgMethod, setBgMethod] = useState('none'); // 'none' | 'chroma' (eyedropper) | 'brush' (manual erase)
  const [chromaColor, setChromaColor] = useState(null);
  const [tolerance, setTolerance] = useState(25);
  const [brushSize, setBrushSize] = useState(60);

  // Brush masking layer for Screen 2 manual erase
  const maskCanvasRef = useRef(null);
  const isBrushing = useRef(false);

  // ── Screen 3 States (Live Matrix Preview & Spacing) ────────────────────────
  const [copies, setCopies] = useState(6);
  const [paperSize, setPaperSize] = useState('a4');
  const [customPaperW, setCustomPaperW] = useState(210);
  const [customPaperH, setCustomPaperH] = useState(297);
  const [gapX, setGapX] = useState(2);
  const [gapY, setGapY] = useState(2);
  const [marginTop, setMarginTop] = useState(4);
  const [marginLeft, setMarginLeft] = useState(4);
  const [matrixRotation, setMatrixRotation] = useState(0); // 0, 90, 180, 270

  // ── Core Canvas Refs ───────────────────────────────────────────────────────
  const editorCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const getPhotoDims = useCallback(() => {
    if (dimensionPreset === 'custom') return { w: Number(customW) || 35, h: Number(customH) || 45 };
    return DIMENSION_PRESETS.find(p => p.id === dimensionPreset) ?? { w: 35, h: 45 };
  }, [dimensionPreset, customW, customH]);

  // ── Dynamic MediaPipe Face Detection ───────────────────────────────────────
  const loadMediaPipe = async () => {
    try {
      const vision = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8");
      return vision;
    } catch (err) {
      console.warn("Could not fetch MediaPipe from CDN. Face auto-center will fall back.", err);
      return null;
    }
  };

  const runFaceDetection = async (img) => {
    const mp = await loadMediaPipe();
    if (!mp) return null;
    try {
      const { FilesetResolver, FaceDetector } = mp;
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
      );
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
          delegate: "GPU"
        },
        runningMode: "IMAGE"
      });
      const detections = detector.detect(img);
      if (detections && detections.detections && detections.detections.length > 0) {
        return detections.detections[0].boundingBox;
      }
    } catch (e) {
      console.error("Face detection runtime error:", e);
    }
    return null;
  };

  const initMaskCanvas = () => {
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
    }
    maskCanvasRef.current.width = CANVAS_W;
    maskCanvasRef.current.height = CANVAS_H;
    const ctx = maskCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  };

  const resetTransforms = () => {
    setPanX(0);
    setPanY(0);
    setZoom(100);
    setRotation(0);
    setSharpness(0);
    setChromaColor(null);
    setBgMethod('none');
    initMaskCanvas();
  };

  // ── Initialize Image ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!originalImage || !imageLoaded) return;
    
    const initPassport = async () => {
      setProcessing(true);
      setCroppedImage(null);
      setProcessedAsset(null);
      resetTransforms();

      // Run MediaPipe Face Detection
      const bbox = await runFaceDetection(originalImage);
      setProcessing(false);

      const dims = getPhotoDims();
      const aspect = dims.w / dims.h;

      if (bbox) {
        setMpLoaded(true);
        toast.success("🤖 MediaPipe Face Centered!");
        
        const canvasAspect = CANVAS_W / CANVAS_H;
        const imgAspect = originalImage.width / originalImage.height;
        let drawW, drawH;
        if (imgAspect > canvasAspect) {
          drawW = CANVAS_W;
          drawH = CANVAS_W / imgAspect;
        } else {
          drawH = CANVAS_H;
          drawW = CANVAS_H * imgAspect;
        }

        const scaleX = drawW / originalImage.width;
        const scaleY = drawH / originalImage.height;

        const fx = bbox.originX * scaleX + (CANVAS_W - drawW) / 2;
        const fy = bbox.originY * scaleY + (CANVAS_H - drawH) / 2;
        const fw = bbox.width * scaleX;
        const fh = bbox.height * scaleY;

        // Auto crop around head/shoulders: padding ~60% height
        const padH = fh * 0.8;
        const targetH = fh + padH * 2;
        const targetW = targetH * aspect;

        const cx = fx + fw / 2;
        const cy = fy + fh / 2;

        const fixedCropH = CANVAS_H * 0.8;
        const fixedCropW = fixedCropH * aspect;

        setCropRect({
          x: Math.round((CANVAS_W - fixedCropW) / 2),
          y: Math.round((CANVAS_H - fixedCropH) / 2),
          w: Math.round(fixedCropW),
          h: Math.round(fixedCropH)
        });

        const neededZoom = (fixedCropH / targetH) * 100;
        setZoom(Math.round(neededZoom));

        const Z = neededZoom / 100;
        setPanX(Math.round(-(cx - CANVAS_W / 2) * Z));
        setPanY(Math.round(-(cy - CANVAS_H / 2) * Z));
      } else {
        setMpLoaded(false);
        // Fallback default crop box
        const h = Math.round(CANVAS_H * 0.72);
        const w = h * aspect;
        setCropRect({
          x: Math.round((CANVAS_W - w) / 2),
          y: Math.round((CANVAS_H - h) / 2),
          w: Math.round(w),
          h: Math.round(h)
        });
      }
    };

    initPassport();
  }, [originalImage, imageLoaded]);

  // Adjust aspect ratio of crop rectangle when sizing preset changes
  useEffect(() => {
    if (wizardStep === 1 && imageLoaded) {
      const dims = getPhotoDims();
      const aspect = dims.w / dims.h;
      setCropRect(prev => {
        const newW = prev.h * aspect;
        return {
          ...prev,
          w: Math.round(newW),
          x: Math.round(prev.x + (prev.w - newW) / 2)
        };
      });
    }
  }, [dimensionPreset, customW, customH, wizardStep, imageLoaded]);

  // ── Redraw Canvas Loop ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!imageLoaded || !originalImage || !editorCanvasRef.current) return;
    drawEditor();
  }, [
    wizardStep, imageLoaded, originalImage, croppedImage,
    zoom, rotation, panX, panY, cropRect,
    brightness, saturation, contrast, sharpness, bgColor,
    bgMethod, chromaColor, tolerance, brushSize,
    showIdStrip, candidateName, captureDate
  ]);

  const calcFitDims = (img, cW, cH) => {
    const ratio = img.width / img.height;
    return ratio > cW / cH ? { drawW: cW, drawH: cW / ratio } : { drawW: cH * ratio, drawH: cH };
  };

  const drawCheckerboard = (ctx, w, h) => {
    ctx.fillStyle = '#e2e8f0'; // Solid light gray instead of checkerboard
    ctx.fillRect(0, 0, w, h);
  };

  // Chroma key backdrop filter
  const applyChromaKey = (ctx, w, h) => {
    if (bgMethod !== 'chroma' || !chromaColor) return;
    const { r: tR, g: tG, b: tB } = chromaColor;
    const lim = tolerance * 1.8;
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const dist = Math.sqrt((d[i] - tR) ** 2 + (d[i + 1] - tG) ** 2 + (d[i + 2] - tB) ** 2);
      if (dist <= lim) d[i + 3] = 0;
    }
    ctx.putImageData(id, 0, 0);
  };

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
        if (copy[i+3] === 0) continue; // Skip transparent
        for (let c = 0; c < 3; c++) {
          const val = 5 * copy[i+c] - copy[i-4+c] - copy[i+4+c] - copy[i-w4+c] - copy[i+w4+c];
          d[i+c] = copy[i+c] + (val - copy[i+c]) * mix;
        }
      }
    }
    ctx.putImageData(id, 0, 0);
  };

  const applyManualMask = (ctx, w, h) => {
    if (!maskCanvasRef.current || bgMethod === 'none') return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(maskCanvasRef.current, 0, 0, w, h);
    ctx.restore();
  };

  // ── Render Dynamic Identity Strip ──────────────────────────────────────────
  const drawIdentityStrip = (ctx, w, h) => {
    if (!showIdStrip) return;
    const stripH = Math.round(h * 0.18); // 18% of passport height
    ctx.save();

    // White base rectangle
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, h - stripH, w, stripH);

    // Border line at top of strip
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - stripH);
    ctx.lineTo(w, h - stripH);
    ctx.stroke();

    // Candidate Name
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${Math.round(stripH * 0.32)}px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameText = (candidateName || 'CANDIDATE NAME').toUpperCase();
    ctx.fillText(nameText, w / 2, h - stripH + stripH * 0.35);

    // Date
    ctx.fillStyle = '#475569';
    ctx.font = `${Math.round(stripH * 0.24)}px 'Outfit', sans-serif`;
    const dateText = captureDate || '';
    ctx.fillText(dateText, w / 2, h - stripH + stripH * 0.72);

    ctx.restore();
  };

  // ── Canvas Editor Pipeline ────────────────────────────────────────────────
  const drawEditor = () => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width, h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (wizardStep === 1) {
      // ── SCREEN 1: Crop layout ──
      drawCheckerboard(ctx, w, h);

      ctx.save();
      ctx.translate(w / 2 + panX, h / 2 + panY);
      ctx.rotate((rotation * Math.PI) / 180);

      const { drawW, drawH } = calcFitDims(originalImage, w, h);
      const scaleVal = zoom / 100;
      const dW = drawW * scaleVal;
      const dH = drawH * scaleVal;

      ctx.drawImage(originalImage, -dW / 2, -dH / 2, dW, dH);
      ctx.restore();

      // Render Crop overlay bounding boxes
      if (cropRect) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.6)'; // Translucent overlay outside crop rect
        ctx.fillRect(0, 0, w, cropRect.y);
        ctx.fillRect(0, cropRect.y + cropRect.h, w, h - cropRect.y - cropRect.h);
        ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h);
        ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, w - cropRect.x - cropRect.w, cropRect.h);

        // Crop bounds outline
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 7.5;
        ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

        // Crop Rule-of-Thirds Grid
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

        // Draw modern L-shaped corner handles and edge bars with white backing
        const thick = 10;
        const len = 40;
        const { x: cx, y: cy, w: cw, h: ch } = cropRect;

        const drawCropHandle = (hx, hy, hw, hh) => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(hx - 2, hy - 2, hw + 4, hh + 4);
          ctx.fillStyle = '#6366f1';
          ctx.fillRect(hx, hy, hw, hh);
        };

        // Corner L-brackets
        drawCropHandle(cx - thick / 2, cy - thick / 2, len, thick);
        drawCropHandle(cx - thick / 2, cy - thick / 2, thick, len);

        drawCropHandle(cx + cw - len + thick / 2, cy - thick / 2, len, thick);
        drawCropHandle(cx + cw - thick / 2, cy - thick / 2, thick, len);

        drawCropHandle(cx - thick / 2, cy + ch - thick / 2, len, thick);
        drawCropHandle(cx - thick / 2, cy + ch - len + thick / 2, thick, len);

        drawCropHandle(cx + cw - len + thick / 2, cy + ch - thick / 2, len, thick);
        drawCropHandle(cx + cw - thick / 2, cy + ch - len + thick / 2, thick, len);

        // Edge straight bars
        drawCropHandle(cx + cw / 2 - len / 2, cy - thick / 2, len, thick);
        drawCropHandle(cx + cw / 2 - len / 2, cy + ch - thick / 2, len, thick);
        drawCropHandle(cx - thick / 2, cy + ch / 2 - len / 2, thick, len);
        drawCropHandle(cx + cw - thick / 2, cy + ch / 2 - len / 2, thick, len);

        ctx.restore();
      }
    } else if (wizardStep === 2) {
      // ── SCREEN 2: Tone & Backdrop Studio ──
      const imgToRender = croppedImage || originalImage;
      if (!imgToRender) return;

      // Fill backdrop
      if (bgColor === 'transparent') {
        drawCheckerboard(ctx, w, h);
      } else {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      }

      // Temporary canvas to isolate edits
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tCtx = tempCanvas.getContext('2d');

      // Apply Tone Corrections and draw
      tCtx.save();
      tCtx.filter = `brightness(${brightness}%) saturate(${saturation}%) contrast(${contrast}%)`;
      tCtx.drawImage(imgToRender, 0, 0, w, h);
      tCtx.restore();

      if (sharpness > 0) applySharpness(tCtx, w, h, sharpness);

      // Apply background erasing overlays
      applyChromaKey(tCtx, w, h);
      applyManualMask(tCtx, w, h);

      // Render the final photo layer
      ctx.drawImage(tempCanvas, 0, 0);

      // Draw dynamic identity strip text plate overlay
      drawIdentityStrip(ctx, w, h);
    }
  };

  // ── Crop Extraction ────────────────────────────────────────────────────────
  const executeCrop = () => {
    if (!cropRect || !editorCanvasRef.current || !originalImage) return null;
    const { x, y, w, h } = cropRect;
    if (w < 20 || h < 20) return null;

    const cropped = document.createElement('canvas');
    const ctx = cropped.getContext('2d');

    cropped.width = w;
    cropped.height = h;
    
    // Passport mode Step 1: redraw without filters to extract pure cropped image
    ctx.save();
    ctx.translate(CANVAS_W / 2 + panX - x, CANVAS_H / 2 + panY - y);
    ctx.rotate((rotation * Math.PI) / 180);
    const { drawW, drawH } = calcFitDims(originalImage, CANVAS_W, CANVAS_H);
    const scaleVal = zoom / 100;
    const dW = drawW * scaleVal;
    const dH = drawH * scaleVal;
    ctx.drawImage(originalImage, -dW / 2, -dH / 2, dW, dH);
    ctx.restore();

    const img = new Image();
    img.src = cropped.toDataURL('image/jpeg', 0.95);
    return img;
  };

  // Call the background remover API endpoint
  const callRembgApi = async (imgDataUrl) => {
    try {
      const resBlob = await fetch(imgDataUrl).then(r => r.blob());
      const formData = new FormData();
      formData.append('file', resBlob, 'cropped_face.png');

      const res = await fetch('https://ankitk123907-printfastx-rembg.hf.space/remove-bg?autocrop=false', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('HF Space background-remover service offline');
      const resBlobPng = await res.blob();

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load returned transparent PNG'));
        img.src = URL.createObjectURL(resBlobPng);
      });
    } catch (err) {
      console.warn("AI Remove bg failed. Falling back to manual eraser.", err);
      throw err;
    }
  };

  // Navigation: Step 1 -> Step 2
  const handleNextToStep2 = async () => {
    const cropped = executeCrop();
    if (!cropped) {
      toast.error("Please crop a valid area first");
      return;
    }

    setProcessing(true);
    cropped.onload = async () => {
      setCroppedImage(cropped);

      if (autoRemoveBg) {
        const tid = toast.loading("🤖 Running AI Background Cutout...");
        try {
          const aiImage = await callRembgApi(cropped.src);
          setCroppedImage(aiImage);
          toast.success("Perfect cutout applied!", { id: tid });
        } catch (err) {
          toast.error("AI mode failed. You can use Chroma Click or Manual Brush inside Step 2.", { id: tid });
        }
      }

      setProcessing(false);
      setWizardStep(2);
      resetTransforms();
    };
  };

  // Bake Step 2 output to static image for Step 3 matrix rendering
  const handleNextToStep3 = () => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    const bakedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const img = new Image();
    img.onload = () => {
      setProcessedAsset(img);
      setWizardStep(3);
    };
    img.src = bakedDataUrl;
  };

  // ── Step 3 Rendering (Print Preview Layout Matrix) ─────────────────────────
  const calculateMatrixLayout = (sheetW, sheetH, origPhotoW, origPhotoH, gapX, gapY, mLeft, mTop, maxCopies, baseRotation) => {
    const isBaseRotated = baseRotation % 180 !== 0;
    const pw = isBaseRotated ? origPhotoH : origPhotoW;
    const ph = isBaseRotated ? origPhotoW : origPhotoH;

    const rotPw = ph;
    const rotPh = pw;

    const cols = Math.max(1, Math.floor((sheetW - 2 * mLeft + gapX) / (pw + gapX)));
    const rows = Math.max(1, Math.floor((sheetH - 2 * mTop + gapY) / (ph + gapY)));

    const placements = [];
    let drawn = 0;

    // 1. Main Grid
    for (let r = 0; r < rows && drawn < maxCopies; r++) {
      for (let c = 0; c < cols && drawn < maxCopies; c++) {
        placements.push({
          x: mLeft + c * (pw + gapX),
          y: mTop + r * (ph + gapY),
          w: pw,
          h: ph,
          isRotated: false
        });
        drawn++;
      }
    }

    // 2. Area B (Right of the main grid)
    const startX_B = mLeft + cols * (pw + gapX);
    const remainW_B = sheetW - mLeft - startX_B + gapX;
    if (remainW_B >= rotPw && drawn < maxCopies) {
      const rightCols = Math.floor(remainW_B / (rotPw + gapX));
      const rightRows = Math.floor((sheetH - 2 * mTop + gapY) / (rotPh + gapY));
      for (let c = 0; c < rightCols && drawn < maxCopies; c++) {
        for (let r = 0; r < rightRows && drawn < maxCopies; r++) {
          placements.push({
            x: startX_B + c * (rotPw + gapX),
            y: mTop + r * (rotPh + gapY),
            w: rotPw,
            h: rotPh,
            isRotated: true
          });
          drawn++;
        }
      }
    }

    // 3. Area A (Bottom of the main grid)
    const startY_A = mTop + rows * (ph + gapY);
    const remainH_A = sheetH - mTop - startY_A + gapY;
    if (remainH_A >= rotPh && drawn < maxCopies) {
      const maxW_A = startX_B - mLeft; 
      const bottomCols = Math.floor((maxW_A + gapX) / (rotPw + gapX));
      const bottomRows = Math.floor(remainH_A / (rotPh + gapY));
      for (let r = 0; r < bottomRows && drawn < maxCopies; r++) {
        for (let c = 0; c < bottomCols && drawn < maxCopies; c++) {
          placements.push({
            x: mLeft + c * (rotPw + gapX),
            y: startY_A + r * (rotPh + gapY),
            w: rotPw,
            h: rotPh,
            isRotated: true
          });
          drawn++;
        }
      }
    }

    return placements;
  };

  const buildOutputCanvas = (targetW, targetH, extraRotation = 0) => {
    const canvas = document.createElement('canvas');
    const totalRotation = matrixRotation + extraRotation;
    const isRotated = totalRotation % 180 !== 0;
    
    canvas.width = isRotated ? targetH : targetW;
    canvas.height = isRotated ? targetW : targetH;
    const ctx = canvas.getContext('2d');

    if (processedAsset) {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((totalRotation * Math.PI) / 180);
      ctx.drawImage(processedAsset, -targetW / 2, -targetH / 2, targetW, targetH);
      ctx.restore();
    }
    return canvas;
  };

  const buildSheetCanvas = () => {
    const dims = getPhotoDims();
    const origW_px = mmToPx(dims.w);
    const origH_px = mmToPx(dims.h);

    const singleNormal = buildOutputCanvas(origW_px, origH_px, 0);
    const singleRotated = buildOutputCanvas(origW_px, origH_px, 90);

    const getSheetDims = () => {
      if (paperSize === 'a4') return { w: 210, h: 297 };
      if (paperSize === '4x6') return { w: 102, h: 152 };
      if (paperSize === '5x7') return { w: 127, h: 178 };
      if (paperSize === 'a5') return { w: 148, h: 210 };
      if (paperSize === 'letter') return { w: 216, h: 279 };
      if (paperSize === 'custom') return { w: Number(customPaperW) || 210, h: Number(customPaperH) || 297 };
      return { w: 210, h: 297 };
    };
    const sDims = getSheetDims();
    const sheetW = mmToPx(sDims.w);
    const sheetH = mmToPx(sDims.h);

    const sheet = document.createElement('canvas');
    sheet.width = sheetW;
    sheet.height = sheetH;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetW, sheetH);

    const gapX_px = mmToPx(gapX);
    const gapY_px = mmToPx(gapY);
    const mTop_px = mmToPx(marginTop);
    const mLeft_px = mmToPx(marginLeft);

    const placements = calculateMatrixLayout(
      sheetW, sheetH, origW_px, origH_px, gapX_px, gapY_px, mLeft_px, mTop_px, copies, matrixRotation
    );

    placements.forEach(p => {
      const img = p.isRotated ? singleRotated : singleNormal;
      ctx.drawImage(img, p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    });

    return sheet;
  };

  const drawMatrixPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !processedAsset) return;
    const ctx = canvas.getContext('2d');
    const PREVIEW_W = canvas.width;

    const getSheetDims = () => {
      if (paperSize === 'a4') return { w: 210, h: 297 };
      if (paperSize === '4x6') return { w: 102, h: 152 };
      if (paperSize === '5x7') return { w: 127, h: 178 };
      if (paperSize === 'a5') return { w: 148, h: 210 };
      if (paperSize === 'letter') return { w: 216, h: 279 };
      if (paperSize === 'custom') return { w: Number(customPaperW) || 210, h: Number(customPaperH) || 297 };
      return { w: 210, h: 297 };
    };
    const sDims = getSheetDims();
    const paperAspect = sDims.h / sDims.w;
    const PREVIEW_H = PREVIEW_W * paperAspect;

    canvas.height = PREVIEW_H;

    // Background sheet mockup container
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 4, PREVIEW_W - 8, PREVIEW_H - 8);

    const dims = getPhotoDims();
    const origW_px = mmToPx(dims.w);
    const origH_px = mmToPx(dims.h);

    const sheetW = mmToPx(sDims.w);
    const sheetH = mmToPx(sDims.h);
    const scale = (PREVIEW_W - 8) / sheetW;

    const gapX_px = mmToPx(gapX);
    const gapY_px = mmToPx(gapY);
    const mTop_px = mmToPx(marginTop);
    const mLeft_px = mmToPx(marginLeft);

    const placements = calculateMatrixLayout(
      sheetW, sheetH, origW_px, origH_px, gapX_px, gapY_px, mLeft_px, mTop_px, copies, matrixRotation
    );

    placements.forEach(p => {
      const x = 4 + p.x * scale;
      const y = 4 + p.y * scale;
      const w = p.w * scale;
      const h = p.h * scale;

      ctx.save();
      const totalRotation = matrixRotation + (p.isRotated ? 90 : 0);
      
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((totalRotation * Math.PI) / 180);
      
      const targetW = origW_px * scale;
      const targetH = origH_px * scale;

      ctx.drawImage(processedAsset, -targetW / 2, -targetH / 2, targetW, targetH);
      ctx.restore();

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, w, h);
    });
  }, [processedAsset, paperSize, dimensionPreset, customW, customH, customPaperW, customPaperH, gapX, gapY, marginTop, marginLeft, copies, dpi, mmToPx, matrixRotation]);

  // Redraw preview in step 3
  useEffect(() => {
    if (wizardStep === 3) {
      drawMatrixPreview();
    }
  }, [wizardStep, drawMatrixPreview]);

  // ── Mouse & Touch Events handler ───────────────────────────────────────────
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

    // Screen 2 brush drawing
    if (wizardStep === 2) {
      if (bgMethod === 'brush') {
        isBrushing.current = true;
        const ctx = maskCanvasRef.current.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        drawEditor();
      } else if (bgMethod === 'chroma') {
        const canvasCtx = editorCanvasRef.current.getContext('2d');
        const px = canvasCtx.getImageData(x, y, 1, 1).data;
        if (px[3] > 0) {
          setChromaColor({ r: px[0], g: px[1], b: px[2] });
          toast.success("🎯 Targeted color to mask");
        }
      }
      return;
    }

    // Screen 1: Drag or Crop
    if (wizardStep === 1) {
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
    }
  };

  const handleDrag = (e) => {
    if (wizardStep === 2 && isBrushing.current) {
      const { x, y } = getCanvasXY(e);
      const ctx = maskCanvasRef.current.getContext('2d');
      ctx.lineTo(x, y);
      ctx.stroke();
      drawEditor();
      return;
    }

    if (wizardStep === 1) {
      const { x, y } = getCanvasXY(e);

      // Mouse Hover styling
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
        const ratio = startRect.w / startRect.h;

        if (handle === 'move') {
          nx = Math.max(0, Math.min(CANVAS_W - nw, nx + dx));
          ny = Math.max(0, Math.min(CANVAS_H - nh, ny + dy));
        } else {
          if (handle.includes('r')) nw += dx;
          if (handle.includes('b')) nh += dy;
          if (handle.includes('l')) { nx += dx; nw -= dx; }
          if (handle.includes('t')) { ny += dy; nh -= dy; }

          if (handle === 'br' || handle === 'r' || handle === 'b') nh = nw / ratio;
          else if (handle === 'tl' || handle === 'l' || handle === 't') {
            nh = nw / ratio;
            ny = startRect.y - (nh - startRect.h);
          }
        }

        nw = Math.max(40, Math.min(CANVAS_W - nx, nw));
        nh = Math.max(40, Math.min(CANVAS_H - ny, nh));

        setCropRect({ x: nx, y: ny, w: nw, h: nh });
      }
    }
  };

  const handleStopDrag = () => {
    isBrushing.current = false;
    cropDragRef.current.active = false;
    panDragRef.current.active = false;
  };

  const handleSavePrintFile = async () => {
    setProcessing(true);
    const tid = toast.loading("Baking HD Print Layout PDF...");
    try {
      const canvas = buildSheetCanvas();
      const isA4 = paperSize === 'a4';
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isA4 ? 'a4' : [152.4, 101.6]
      });

      doc.addImage(
        canvas.toDataURL('image/jpeg', 0.92),
        'JPEG',
        0, 0,
        isA4 ? 210 : 152.4,
        isA4 ? 297 : 101.6,
        undefined,
        'FAST'
      );

      const pdfBlob = doc.output('blob');
      const fileName = `passport_layout_${Date.now()}.pdf`;

      onSave({
        file: new File([pdfBlob], fileName, { type: 'application/pdf' }),
        name: fileName
      });

      toast.success("Matrix sent to print queue!", { id: tid });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate printable PDF", { id: tid });
    } finally {
      setProcessing(false);
    }
  };

  const handleDirectPrintMatrix = async () => {
    setProcessing(true);
    const tid = toast.loading("Generating Print PDF...");
    try {
      const canvas = buildSheetCanvas();
      const isA4 = paperSize === 'a4';
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isA4 ? 'a4' : [152.4, 101.6]
      });

      doc.addImage(
        canvas.toDataURL('image/jpeg', 0.92),
        'JPEG',
        0, 0,
        isA4 ? 210 : 152.4,
        isA4 ? 297 : 101.6,
        undefined,
        'FAST'
      );

      const pdfUrl = doc.output('bloburl');
      window.open(pdfUrl, '_blank');
      
      toast.success("Ready to print!", { id: tid });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate printable PDF", { id: tid });
    } finally {
      setProcessing(false);
    }
  };

  const downloadSheetJpg = () => {
    const canvas = buildSheetCanvas();
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/jpeg', 0.95);
    a.download = `passport_matrix_${paperSize}.jpg`;
    a.click();
    toast.success("Downloaded HD matrix sheet!");
  };

  const downloadSingleJpg = () => {
    if (!processedAsset) return;
    const dims = getPhotoDims();
    const canvas = buildOutputCanvas(mmToPx(dims.w), mmToPx(dims.h));
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/jpeg', 0.95);
    a.download = 'passport_single.jpg';
    a.click();
    toast.success("Downloaded single asset!");
  };

  return (
    <div style={S.screenWrapper}>
      {wizardStep === 1 && (
        <div style={S.screenWrapper}>
          {/* Left Column: Interactive Canvas Area */}
          <div style={S.leftPane}>
            <div style={S.canvasOuter}>
              {processing && (
                <div style={S.loadingOverlay}>
                  <RefreshCw size={36} className="spinner" color="#0d9488"/>
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

            {/* Sub-canvas Control Bar */}
            <div style={{ ...S.sliderToolbar, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => setCropRect({ x: 20, y: 20, w: CANVAS_W - 40, h: CANVAS_H - 40 })}
                  style={S.btnSecondary}
                  className="btn-action"
                >
                  <Maximize size={14} style={{ marginRight: '6px' }}/>
                  Full Size Selection
                </button>
                <button
                  onClick={() => setRotation(r => r - 90)}
                  style={S.btnSecondary}
                  className="btn-action"
                >
                  <RotateCcw size={14} style={{ marginRight: '6px' }}/>
                  Rotate Left
                </button>
                <button
                  onClick={() => setRotation(r => r + 90)}
                  style={S.btnSecondary}
                  className="btn-action"
                >
                  <RotateCw size={14} style={{ marginRight: '6px' }}/>
                  Rotate Right
                </button>
                <button
                  onClick={() => setCropActive(!cropActive)}
                  style={S.btnSecondary}
                  className="btn-action"
                >
                  <CropIcon size={14} style={{ marginRight: '6px' }}/>
                  Crop Selection
                </button>
              </div>

              {/* Sliders Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '420px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={S.sliderLabelRow}>
                    <span>🔎 Zoom Level</span>
                    <span>{zoom}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={zoom}
                    onChange={e => setZoom(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={S.sliderLabelRow}>
                    <span>🔄 Fine-Grain Rotation</span>
                    <span>{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={rotation}
                    onChange={e => setRotation(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings */}
          <div style={S.rightPane}>
            <div className="studio-scroll" style={S.paneContent}>
              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>📏 Document Sizing Presets</h4>
                <select
                  value={dimensionPreset}
                  onChange={e => setDimensionPreset(e.target.value)}
                  style={S.dropdownInput}
                >
                  {DIMENSION_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>

                {dimensionPreset === 'custom' && (
                  <div style={S.customInputGrid}>
                    <div>
                      <label style={S.miniLabel}>Width (mm)</label>
                      <input
                        type="number"
                        value={customW}
                        onChange={e => setCustomW(e.target.value)}
                        style={S.numberInput}
                      />
                    </div>
                    <div>
                      <label style={S.miniLabel}>Height (mm)</label>
                      <input
                        type="number"
                        value={customH}
                        onChange={e => setCustomH(e.target.value)}
                        style={S.numberInput}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Face Detection State Notification */}
              <div style={{ ...S.panelSegment, borderLeft: mpLoaded ? '3px solid #10b981' : '3px solid #f59e0b', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{mpLoaded ? '🤖' : '✨'}</span>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                      {mpLoaded ? 'MediaPipe Auto-Centered' : 'Face Centering Fallback'}
                    </p>
                    <p style={{ fontSize: '11px', margin: 0, color: '#475569' }}>
                      {mpLoaded ? 'Crop bounds locked automatically around the face.' : 'No face found or offline. Position crop manually.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto Remove Background Checkbox */}
              <div style={S.panelSegment}>
                <label style={S.checkboxCard} className="btn-action">
                  <input
                    type="checkbox"
                    checked={autoRemoveBg}
                    onChange={e => setAutoRemoveBg(e.target.checked)}
                    style={S.checkboxDot}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={S.checkboxTitle}>🤖 Auto-Remove Background</p>
                    <p style={S.checkboxDesc}>Uses Cloud AI cutout to isolate subject inside the crop box.</p>
                  </div>
                </label>
              </div>
            </div>

            <div style={S.paneFooter}>
              <button
                onClick={handleNextToStep2}
                style={S.btnPrimaryLarge}
                className="btn-action"
              >
                Next: Tone & Backdrop Fill ➡️
              </button>
            </div>
          </div>
        </div>
      )}

      {wizardStep === 2 && (
        <div style={S.screenWrapper}>
          {/* Left Column: Visual workspace */}
          <div style={S.leftPane}>
            <div style={S.canvasOuter}>
              {processing && (
                <div style={S.loadingOverlay}>
                  <RefreshCw size={36} className="spinner" color="#0d9488"/>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginTop: '10px' }}>
                    Isolating subject layout...
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
                style={S.mainCanvas}
              />
            </div>

            {/* Identity Strip Settings */}
            <div style={S.sliderToolbar}>
              <label style={S.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={showIdStrip}
                  onChange={e => setShowIdStrip(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  📛 Generate Identity Text Strip Overlay
                </span>
              </label>

              {showIdStrip && (
                <div style={S.idInputsGrid}>
                  <div>
                    <label style={S.miniLabel}>Candidate Name</label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={e => setCandidateName(e.target.value)}
                      placeholder="John Doe"
                      style={S.textInput}
                    />
                  </div>
                  <div>
                    <label style={S.miniLabel}>Date of Capture</label>
                    <input
                      type="date"
                      value={captureDate}
                      onChange={e => setCaptureDate(e.target.value)}
                      style={S.textInput}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Color Grading & Pixel Brushes */}
          <div style={S.rightPane}>
            <div className="studio-scroll" style={S.paneContent}>
              <div style={S.panelSegment}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ ...S.segmentTitle, margin: 0 }}>🎨 Tone Tuning</h4>
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

              {/* Backdrop Color Engine Swatches */}
              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>🎨 Dynamic Backdrop Engine</h4>
                <div style={S.swatchRow}>
                  {[
                    { color: '#ffffff', label: 'White' },
                    { color: '#3653f8ff', label: 'Light Blue' },
                    { color: '#f1f5f9', label: 'Light Gray' },
                    { color: '#3b00c5ff', label: 'Passport Blue' },
                    { color: '#94a3b8', label: 'Gray' }
                  ].map(sw => (
                    <button
                      key={sw.color}
                      onClick={() => setBgColor(sw.color)}
                      style={{
                        ...S.colorSwatch,
                        background: sw.color,
                        border: bgColor === sw.color ? '3px solid #3b82f6' : '1px solid #475569'
                      }}
                      title={sw.label}
                      className="btn-action"
                    />
                  ))}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                    <input
                      type="color"
                      value={bgColor === 'transparent' ? '#ffffff' : bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      style={S.colorPickerBox}
                      className="btn-action"
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Spectrum</span>
                  </div>
                </div>
              </div>

              {/* Precision Editing Brushes */}
              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>🖌️ Precision Backdrop Touch-ups</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <button
                    onClick={() => { setBgMethod('chroma'); setChromaColor(null); }}
                    style={{ ...S.brushBtn, ...(bgMethod === 'chroma' ? S.brushBtnActive : {}) }}
                    className="btn-action"
                  >
                    鼠标 Color Click Tool
                  </button>
                  <button
                    onClick={() => setBgMethod('brush')}
                    style={{ ...S.brushBtn, ...(bgMethod === 'brush' ? S.brushBtnActive : {}) }}
                    className="btn-action"
                  >
                    刷 Manual Eraser
                  </button>
                </div>

                {bgMethod === 'chroma' && (
                  <div style={S.toolSettingsBox}>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 8px' }}>
                      Click any color on the face canvas view to crop/mask it out instantly.
                    </p>
                    <div style={S.sliderControlGroup}>
                      <div style={S.sliderLabelRow}>
                        <span>Tolerance Threshold</span>
                        <span>{tolerance}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="80"
                        value={tolerance}
                        onChange={e => setTolerance(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                {bgMethod === 'brush' && (
                  <div style={S.toolSettingsBox}>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 8px' }}>
                      Drag cursor onto canvas to wipe off remaining background nodes.
                    </p>
                    <div style={S.sliderControlGroup}>
                      <div style={S.sliderLabelRow}>
                        <span>Brush Size (px)</span>
                        <span>{brushSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="240"
                        value={brushSize}
                        onChange={e => setBrushSize(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                {bgMethod !== 'none' && (
                  <button
                    onClick={() => { setBgMethod('none'); initMaskCanvas(); setChromaColor(null); }}
                    style={S.clearFilterBtn}
                    className="btn-action"
                  >
                    🚫 Clear Masks & Reset Tools
                  </button>
                )}
              </div>
            </div>

            <div style={{ ...S.paneFooter, display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setWizardStep(1)}
                style={{ ...S.btnSecondary, flex: 1 }}
                className="btn-action"
              >
                ⬅️ Back
              </button>
              <button
                onClick={handleNextToStep3}
                style={{ ...S.btnPrimary, flex: 2 }}
                className="btn-action"
              >
                Next: Layout Matrix Grid ➡️
              </button>
            </div>
          </div>
        </div>
      )}

      {wizardStep === 3 && (
        <div style={S.screenWrapper}>
          {/* Left Column: Asset Data Overview */}
          <div style={{ ...S.leftPane, maxWidth: '400px' }}>
            <div className="studio-scroll" style={S.paneContent}>
              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>🖼️ Processed Asset Preview</h4>
                <div style={S.queuedItemCard}>
                  <img
                    src={processedAsset ? processedAsset.src : ''}
                    alt="Queued Target"
                    style={{ ...S.queuedItemImg, transform: `rotate(${matrixRotation}deg)` }}
                  />
                  <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
                    <button
                      onClick={() => setMatrixRotation(r => (r + 90) % 360)}
                      style={{ ...S.microBtn, flex: 1 }}
                      className="btn-action"
                    >
                      🔄 Rotate 90°
                    </button>
                    <button
                      onClick={downloadSingleJpg}
                      style={{ ...S.microBtn, flex: 2 }}
                      className="btn-action"
                    >
                      📥 Download Single JPG
                    </button>
                  </div>
                </div>
              </div>

              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>🔢 Matrix Target Quantity</h4>
                <div style={S.stepperBox}>
                  <button
                    onClick={() => setCopies(c => Math.max(1, c - 1))}
                    style={S.stepBtn}
                    className="btn-action"
                  >
                    <Minus size={16}/>
                  </button>
                  <span style={S.stepCountText}>{copies} Photos</span>
                  <button
                    onClick={() => setCopies(c => Math.min(64, c + 1))}
                    style={S.stepBtn}
                    className="btn-action"
                  >
                    <Plus size={16}/>
                  </button>
                </div>
              </div>

              <div style={S.panelSegment}>
                <h4 style={S.segmentTitle}>📥 Export Settings</h4>
                <div style={S.formRow}>
                  <div style={{ width: '100%' }}>
                    <label style={S.miniLabel}>Export DPI (Resolution)</label>
                    <input
                      type="number"
                      value={dpi}
                      onChange={e => setDpi(Number(e.target.value))}
                      style={S.textInput}
                      min="72"
                      max="1200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={S.paneFooter}>
              <button
                onClick={() => setWizardStep(2)}
                style={{ ...S.btnSecondary, width: '100%' }}
                className="btn-action"
              >
                ⬅️ Back to Backdrop Editor
              </button>
            </div>
          </div>

          {/* Right Column: Live Matrix Preview Sheet & Margin Controls */}
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
                width={290}
                style={S.sheetMockupCanvas}
              />
            </div>

            {/* Advanced Control Header */}
            <div style={{ display: 'flex', gap: '16px', padding: '16px', borderTop: '1px solid #0d1f37ff', background: '#ffffff' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>PAPER SIZE</label>
                <select
                  value={paperSize}
                  onChange={e => setPaperSize(e.target.value)}
                  style={{ ...S.selectBox, width: '100%', height: '36px', fontSize: '14px', fontWeight: 600, border: '2px solid #000000', outline: 'none' }}
                >
                  <option value="a4">A4 (210×297mm)</option>
                  <option value="4x6">4×6 Inch (10×15cm)</option>
                  <option value="5x7">5×7 Inch (13×18cm)</option>
                  <option value="a5">A5 (148×210mm)</option>
                  <option value="letter">Letter (US)</option>
                  <option value="custom">Custom Size</option>
                </select>
                {paperSize === 'custom' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>W (mm)</label>
                      <input type="number" value={customPaperW} onChange={e => setCustomPaperW(Number(e.target.value))} style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>H (mm)</label>
                      <input type="number" value={customPaperH} onChange={e => setCustomPaperH(Number(e.target.value))} style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ flex: 1.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>MARGIN / GAP CONTROL</label>
                  <button
                    onClick={() => { setGapX(2); setGapY(2); setMarginTop(4); setMarginLeft(4); }}
                    style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                  >
                    ↺ Reset Default
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      <span>Gap X</span>
                      <span style={{ color: '#4f46e5' }}>{gapX}px</span>
                    </div>
                    <input type="range" min="0" max="30" value={gapX} onChange={e => setGapX(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#4f46e5' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      <span>Gap Y</span>
                      <span style={{ color: '#4f46e5' }}>{gapY}px</span>
                    </div>
                    <input type="range" min="0" max="30" value={gapY} onChange={e => setGapY(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#4f46e5' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      <span>Margin Top</span>
                      <span style={{ color: '#4f46e5' }}>{marginTop}px</span>
                    </div>
                    <input type="range" min="0" max="50" value={marginTop} onChange={e => setMarginTop(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#4f46e5' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      <span>Margin Left</span>
                      <span style={{ color: '#4f46e5' }}>{marginLeft}px</span>
                    </div>
                    <input type="range" min="0" max="50" value={marginLeft} onChange={e => setMarginLeft(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#4f46e5' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline fulfillment footer */}
            <div style={S.fulfillmentFooter}>
              <button
                onClick={downloadSheetJpg}
                style={S.btnHdJpg}
                className="btn-action"
              >
                📥 Download HD Layout Sheet
              </button>
              <button
                onClick={handleSavePrintFile}
                style={S.btnSendToPrint}
                className="btn-action"
              >
                🖨️ Send Matrix to Print Queue
              </button>
              <button
                onClick={handleDirectPrintMatrix}
                style={{ ...S.btnSendToPrint, background: '#0f172a', color: '#ffffff' }}
                className="btn-action"
              >
                <Printer size={16} style={{ marginRight: '6px' }}/> Direct Print Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STYLING SYSTEM (Light Mode + Outfit theme) ──────────────────────
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
    borderTop: '1px solid #e2e8f0',
    width: '100%'
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
  checkboxCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    cursor: 'pointer',
    background: '#ffffff',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1'
  },
  checkboxDot: {
    width: '16px',
    height: '16px',
    marginTop: '2px',
    cursor: 'pointer'
  },
  checkboxTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0
  },
  checkboxDesc: {
    fontSize: '10px',
    color: '#64748b',
    margin: '2px 0 0'
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
  idInputsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '10px',
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  textInput: {
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
  swatchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  colorSwatch: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    cursor: 'pointer',
    padding: 0
  },
  colorPickerBox: {
    width: '32px',
    height: '32px',
    padding: 0,
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    background: 'none'
  },
  brushBtn: {
    padding: '10px',
    fontSize: '11px',
    fontWeight: 700,
    borderRadius: '8px',
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brushBtnActive: {
    background: '#0d9488',
    color: '#ffffff',
    borderColor: '#0d9488'
  },
  toolSettingsBox: {
    background: '#ffffff',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginTop: '10px'
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
    cursor: 'pointer',
    marginTop: '10px'
  },
  queuedItemCard: {
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  queuedItemImg: {
    borderRadius: '6px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    maxHeight: '120px',
    border: '1px solid #cbd5e1'
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
  formRow: {
    display: 'flex',
    gap: '12px'
  },
  selectBox: {
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    padding: '6px 10px',
    color: '#0f172a'
  }
};
