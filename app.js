// ======================
// Hi-DPI helper & clear
// ======================
function initHiDPICanvas(canvas, cssWidthPx, cssHeightPx) {
  const dpr = window.devicePixelRatio || 1;

  // Backing store (internal pixels)
  canvas.width  = Math.round(cssWidthPx * dpr);
  canvas.height = Math.round(cssHeightPx * dpr);

  // Display size (CSS pixels)
  canvas.style.width  = cssWidthPx + "px";
  canvas.style.height = cssHeightPx + "px";

  const ctx = canvas.getContext("2d");

  // Draw using CSS pixel units
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Defaults
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // White background
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  return ctx;
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0); // raw pixel space
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fill white so PDF export doesn’t show transparency
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ======================
// Clear whole form
// ======================
function clearFormContents() {
  // Clear all input fields
  const inputs = document.querySelectorAll("input[type='text']");
  inputs.forEach(input => (input.value = ""));

  // Clear signature canvases
  clearCanvas(document.getElementById("customersign"));
  clearCanvas(document.getElementById("officerSign"));
}

// ======================
// App logic
// ======================
document.addEventListener("DOMContentLoaded", function () {
  // Inline canvases (previews only; no direct drawing!)
  const customerSignCanvas = document.getElementById("customersign");
  const officerSignCanvas  = document.getElementById("officerSign");

  // Match these numbers with your CSS sizes
  initHiDPICanvas(customerSignCanvas, 300, 120);
  initHiDPICanvas(officerSignCanvas, 300, 120);

  // ======================
  // PDF generation
  // ======================
  const btnPdf = document.getElementById("generatePdfButton");
  btnPdf.addEventListener("click", function () {
    const element1 = document.getElementById("element1");
    const opt = {
      margin: [10, 10, 10, 10],
      filename: "HT_Inspection_Sheet.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 3, scrollY: 0 },
      jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };
    html2pdf().from(element1).set(opt).save();
  });

  // ======================
  // Reset buttons
  // ======================
  document.getElementById("resetCustomerSign").addEventListener("click", function () {
    clearCanvas(customerSignCanvas);
  });

  document.getElementById("resetOfficerSign").addEventListener("click", function () {
    clearCanvas(officerSignCanvas);
  });

  document.getElementById("clearForm").addEventListener("click", function () {
    const confirmClear = confirm("Are you sure you want to clear the entire form?");
    if (confirmClear) clearFormContents();
  });

  // ======================
  // Modal signature setup
  // ======================
  const modal       = document.getElementById("signatureModal");
  const fullCanvas  = document.getElementById("sigFullCanvas");
  const fullCtx     = fullCanvas.getContext("2d");

  const btnOpenCustomer = document.getElementById("openCustomerSign");
  const btnOpenOfficer  = document.getElementById("openOfficerSign");
  const btnClose        = document.getElementById("sigCloseBtn");
  const btnCancel       = document.getElementById("sigCancelBtn");
  const btnSave         = document.getElementById("sigSaveBtn");
  const btnClear        = document.getElementById("sigClearBtn");
  const titleEl         = document.getElementById("sigModalTitle");

  // Target inline canvas for Save
  let targetInlineCanvas = null;

  // Strokes storage for vector replay
  // Each stroke: { points: [{x,y}], lineWidth, color }
  let strokes = [];
  let currentStroke = null;
  let isDrawingModal = false;

  function initFullCtx() {
    fullCtx.lineWidth = 2;
    fullCtx.lineCap = "round";
    fullCtx.lineJoin = "round";
    fullCtx.strokeStyle = "#000";
  }

  function resizeModalCanvas() {
    const rect = fullCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    fullCanvas.width  = Math.floor(rect.width  * dpr);
    fullCanvas.height = Math.floor(rect.height * dpr);

    fullCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initFullCtx();

    // White background
    fullCtx.save();
    fullCtx.fillStyle = "#fff";
    fullCtx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);
    fullCtx.restore();
  }

  function openSignatureModal({ targetCanvas, title }) {
    targetInlineCanvas = targetCanvas;
    titleEl.textContent = title || "Signature";

    // Fresh drawing session for each open
    strokes = [];
    currentStroke = null;
    resizeModalCanvas();

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Ensure layout has settled before measuring (mobile)
    setTimeout(resizeModalCanvas, 0);
  }

  function closeSignatureModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function clearFullCanvas() {
    // Clear pixels
    fullCtx.setTransform(1, 0, 0, 1, 0, 0);
    fullCtx.clearRect(0, 0, fullCanvas.width, fullCanvas.height);

    // Restore DPR + white BG
    const dpr = window.devicePixelRatio || 1;
    fullCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fullCtx.save();
    fullCtx.fillStyle = "#fff";
    fullCtx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);
    fullCtx.restore();

    // Clear memory too
    strokes = [];
    currentStroke = null;
  }

  function getModalPos(e) {
    const rect = fullCanvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.offsetX, y: e.offsetY };
  }

  // ------------- Modal Draw: record as vectors -------------
  function modalStart(e) {
    isDrawingModal = true;
    const pos = getModalPos(e);

    currentStroke = {
      points: [pos],
      lineWidth: fullCtx.lineWidth || 2,
      color: fullCtx.strokeStyle || "#000",
    };
    e.preventDefault();
  }

  function modalMove(e) {
    if (!isDrawingModal) return;
    const pos = getModalPos(e);

    currentStroke.points.push(pos);

    // Live feedback (draw last segment only)
    const pts = currentStroke.points;
    if (pts.length >= 2) {
      const a = pts[pts.length - 2];
      const b = pts[pts.length - 1];
      fullCtx.beginPath();
      fullCtx.moveTo(a.x, a.y);
      fullCtx.lineTo(b.x, b.y);
      fullCtx.stroke();
    }
    e.preventDefault();
  }

  function modalEnd(e) {
    if (isDrawingModal && currentStroke && currentStroke.points.length > 0) {
      strokes.push(currentStroke);
    }
    isDrawingModal = false;
    currentStroke = null;
    e.preventDefault();
  }

  // ------------- Optional: curve smoothing on replay -------------
  function drawStrokeSmooth(ctx, pts) {
    if (pts.length === 1) {
      // single-point tap -> draw a dot
      const p = pts[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, ctx.lineWidth / 2), 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      return;
    }

    if (pts.length === 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    // Last segment to final point
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }

  // ------------- Save: Vector replay into inline canvas -------------
  btnSave.addEventListener("click", () => {
    if (!targetInlineCanvas) return;

    const tCtx = targetInlineCanvas.getContext("2d");

    // Destination (internal pixels)
    const dstW = targetInlineCanvas.width;
    const dstH = targetInlineCanvas.height;

    // Reset to internal pixel space
    tCtx.setTransform(1, 0, 0, 1, 0, 0);

    // Clear and white background
    tCtx.clearRect(0, 0, dstW, dstH);
    tCtx.fillStyle = "#fff";
    tCtx.fillRect(0, 0, dstW, dstH);

    if (!strokes || strokes.length === 0) {
      closeSignatureModal();
      return;
    }

    // Compute bounds of all points in modal CSS coordinates
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    strokes.forEach(stroke => {
      stroke.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
    });
    const srcW = Math.max(1, maxX - minX);
    const srcH = Math.max(1, maxY - minY);

    // Fit strokes into destination with padding
    const padding = 12; // pixels
    const availW = Math.max(1, dstW - 2 * padding);
    const availH = Math.max(1, dstH - 2 * padding);
    const scale = Math.min(availW / srcW, availH / srcH);

    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const dx = Math.floor((dstW - drawW) / 2);
    const dy = Math.floor((dstH - drawH) / 2);

    // Set high-quality vector rendering
    tCtx.imageSmoothingEnabled = true; // not crucial for vectors, but fine
    tCtx.imageSmoothingQuality = "high";
    tCtx.lineCap = "round";
    tCtx.lineJoin = "round";

    // Replay each stroke after transforming points into dest space
    strokes.forEach(stroke => {
      tCtx.strokeStyle = stroke.color || "#000";
      const baseWidth = stroke.lineWidth || 2;
      // Scale line width so visual thickness follows the overall scaling
      tCtx.lineWidth = Math.max(1, baseWidth * scale);

      // Transform points and draw smoothed path
      const transformed = stroke.points.map(p => ({
        x: dx + (p.x - minX) * scale,
        y: dy + (p.y - minY) * scale,
      }));

      drawStrokeSmooth(tCtx, transformed);
    });

    // Restore CSS-pixel transform for any future overlays (optional)
    const dpr = window.devicePixelRatio || 1;
    tCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    closeSignatureModal();
  });

  // ======================
  // Modal event bindings
  // ======================
  btnOpenCustomer.addEventListener("click", () => {
    openSignatureModal({
      targetCanvas: customerSignCanvas,
      title: "Customer Signature",
    });
  });

  btnOpenOfficer.addEventListener("click", () => {
    openSignatureModal({
      targetCanvas: officerSignCanvas,
      title: "Officer Signature",
    });
  });

  btnClose.addEventListener("click", closeSignatureModal);
  btnCancel.addEventListener("click", closeSignatureModal);
  btnClear.addEventListener("click", clearFullCanvas);

  // Modal canvas draw listeners
  fullCanvas.addEventListener("mousedown", modalStart);
  fullCanvas.addEventListener("mousemove", modalMove);
  fullCanvas.addEventListener("mouseup",   modalEnd);
  fullCanvas.addEventListener("mouseout",  modalEnd);

  fullCanvas.addEventListener("touchstart", modalStart, { passive: false });
  fullCanvas.addEventListener("touchmove",  modalMove,  { passive: false });
  fullCanvas.addEventListener("touchend",   modalEnd,   { passive: false });

  // Resize while modal is open
  window.addEventListener("resize", () => {
    if (modal.classList.contains("open")) {
      resizeModalCanvas();
    }
  });

  // ESC to close modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) {
      closeSignatureModal();
    }
  });
});



window.addEventListener("beforeunload", function (e) {
  e.preventDefault();
  e.returnValue = ""; // Required for Chrome, Edge, Firefox
});
``
