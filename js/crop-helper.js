// ============================================================
// UNIVERSAL IMAGE CROP HELPER v2
// Lebih fleksibel, mobile-friendly, zoom slider, pilihan rasio
// ============================================================

let _cropperInstance = null;
let _cropCallback = null;
let _cropCurrentRatio = NaN;

const CROP_RATIOS = [
  { label: "Bebas", value: NaN },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4/3 },
  { label: "16:9", value: 16/9 },
  { label: "3:4", value: 3/4 },
];

function initCropModal() {
  if (document.getElementById("crop-modal-overlay")) return;
  const html = `
<div id="crop-modal-overlay">
  <div id="crop-modal-box">
    <div id="crop-modal-header">
      <div style="display:flex;align-items:center;gap:8px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/></svg>
        <span style="font-weight:700;font-size:14px;">Sesuaikan Gambar</span>
      </div>
      <button id="crop-close-btn" style="background:none;border:none;color:var(--text-muted);font-size:24px;cursor:pointer;line-height:1;padding:0 4px;">&times;</button>
    </div>

    <div id="crop-container">
      <img id="crop-image" src="" alt="Crop" style="max-width:100%;display:block;" />
    </div>

    <div id="crop-controls">
      <!-- Pilihan Rasio -->
      <div id="crop-ratio-btns"></div>

      <!-- Zoom Slider -->
      <div style="display:flex;align-items:center;gap:10px;padding:0 4px;">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;opacity:0.6;"><circle cx="11" cy="11" r="8"/><path d="M8 11h6M11 8v6"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="range" id="crop-zoom-slider" min="0" max="3" step="0.01" value="0"
          style="flex:1;accent-color:var(--gold);height:4px;cursor:pointer;" />
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;opacity:0.6;"><circle cx="11" cy="11" r="8"/><path d="M8 11h6"/><path d="m21 21-4.35-4.35"/></svg>
      </div>
    </div>

    <div id="crop-modal-footer">
      <button id="crop-cancel-btn" class="btn btn-secondary btn-sm">Batal</button>
      <div style="display:flex;gap:8px;">
        <button id="crop-rotate-left-btn" class="btn btn-secondary btn-sm" title="Putar kiri">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button id="crop-rotate-right-btn" class="btn btn-secondary btn-sm" title="Putar kanan">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        </button>
        <button id="crop-flip-btn" class="btn btn-secondary btn-sm" title="Balik horizontal">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 3v18"/></svg>
        </button>
        <button id="crop-reset-btn" class="btn btn-secondary btn-sm" title="Reset">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
      </div>
      <button id="crop-confirm-btn" class="btn btn-primary btn-sm">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="margin-right:4px;"><path d="M20 6 9 17l-5-5"/></svg>
        Selesai
      </button>
    </div>
  </div>
</div>`;
  document.body.insertAdjacentHTML("afterbegin", html);

  // Ratio buttons
  const ratioContainer = document.getElementById("crop-ratio-btns");
  CROP_RATIOS.forEach((r, i) => {
    const btn = document.createElement("button");
    btn.className = "crop-ratio-btn" + (i === 0 ? " active" : "");
    btn.textContent = r.label;
    btn.onclick = () => {
      _cropCurrentRatio = r.value;
      if (_cropperInstance) _cropperInstance.setAspectRatio(isNaN(r.value) ? NaN : r.value);
      document.querySelectorAll(".crop-ratio-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
    ratioContainer.appendChild(btn);
  });

  // Zoom slider
  document.getElementById("crop-zoom-slider").addEventListener("input", e => {
    if (_cropperInstance) _cropperInstance.zoomTo(parseFloat(e.target.value));
  });

  // Tombol aksi
  document.getElementById("crop-close-btn").onclick = cancelCrop;
  document.getElementById("crop-cancel-btn").onclick = cancelCrop;
  document.getElementById("crop-confirm-btn").onclick = confirmCrop;
  document.getElementById("crop-rotate-left-btn").onclick = () => { if (_cropperInstance) _cropperInstance.rotate(-90); };
  document.getElementById("crop-rotate-right-btn").onclick = () => { if (_cropperInstance) _cropperInstance.rotate(90); };
  document.getElementById("crop-flip-btn").onclick = () => {
    if (!_cropperInstance) return;
    const data = _cropperInstance.getData();
    _cropperInstance.scaleX(data.scaleX === -1 ? 1 : -1);
  };
  document.getElementById("crop-reset-btn").onclick = () => {
    if (_cropperInstance) {
      _cropperInstance.reset();
      document.getElementById("crop-zoom-slider").value = 0;
    }
  };

  // Tutup dengan klik overlay (bukan box)
  document.getElementById("crop-modal-overlay").addEventListener("click", e => {
    if (e.target.id === "crop-modal-overlay") cancelCrop();
  });
}

function loadCropperJS(callback) {
  if (typeof Cropper !== "undefined") { callback(); return; }
  if (!document.querySelector('link[href*="cropperjs"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css";
    document.head.appendChild(link);
  }
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js";
  script.onload = callback;
  script.onerror = () => { if (typeof toast === "function") toast("Gagal load crop tool, coba lagi.", "error"); };
  document.head.appendChild(script);
}

// ratio: NaN/0 = bebas, 1 = square, 16/9 = landscape, dll
function openCropModal(file, ratio, onDone) {
  loadCropperJS(() => _openCropModalInner(file, ratio, onDone));
}

function _openCropModalInner(file, ratio, onDone) {
  initCropModal();
  _cropCurrentRatio = (ratio === 0 || ratio === undefined) ? NaN : ratio;
  _cropCallback = onDone;

  // Set ratio button aktif sesuai default
  document.querySelectorAll(".crop-ratio-btn").forEach((btn, i) => {
    const r = CROP_RATIOS[i].value;
    const match = isNaN(_cropCurrentRatio) ? isNaN(r) : Math.abs(r - _cropCurrentRatio) < 0.01;
    btn.classList.toggle("active", match);
  });

  const reader = new FileReader();
  reader.onload = e => {
    const overlay = document.getElementById("crop-modal-overlay");
    const img = document.getElementById("crop-image");
    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
    img.src = e.target.result;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";

    img.onload = () => {
      _cropperInstance = new Cropper(img, {
        aspectRatio: isNaN(_cropCurrentRatio) ? NaN : _cropCurrentRatio,
        viewMode: 1,
        autoCropArea: 0.88,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
        responsive: true,
        checkOrientation: true,
        zoomOnWheel: true,
        zoomOnTouch: true,
        dragMode: "move",
        ready() {
          document.getElementById("crop-zoom-slider").value = 0;
        },
        zoom(e) {
          // Sync slider ke zoom realtime (dari pinch/wheel)
          const slider = document.getElementById("crop-zoom-slider");
          if (slider) slider.value = Math.max(0, Math.min(3, e.detail.ratio));
        }
      });
    };
  };
  reader.readAsDataURL(file);
}

function cancelCrop() {
  if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
  const overlay = document.getElementById("crop-modal-overlay");
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";
  _cropCallback = null;
}

function confirmCrop() {
  if (!_cropperInstance) return;
  const btn = document.getElementById("crop-confirm-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Memproses..."; }

  const canvas = _cropperInstance.getCroppedCanvas({
    maxWidth: 2048,
    maxHeight: 2048,
    fillColor: "#fff",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  });

  canvas.toBlob(blob => {
    if (!blob) { if (btn) { btn.disabled = false; btn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="margin-right:4px;"><path d="M20 6 9 17l-5-5"/></svg>Selesai`; } return; }
    const url = URL.createObjectURL(blob);
    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
    const overlay = document.getElementById("crop-modal-overlay");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="margin-right:4px;"><path d="M20 6 9 17l-5-5"/></svg>Selesai`; }
    if (_cropCallback) _cropCallback(blob, url);
    _cropCallback = null;
  }, "image/jpeg", 0.92);
}

// CSS crop modal — inject sekali
(function injectCropCSS() {
  if (document.getElementById("crop-helper-style")) return;
  const style = document.createElement("style");
  style.id = "crop-helper-style";
  style.textContent = `
#crop-modal-overlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(0,0,0,0.88);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none; transition: opacity 0.2s;
  padding: 12px;
}
#crop-modal-overlay.open { opacity: 1; pointer-events: all; }
#crop-modal-box {
  background: var(--bg-card, #161B2A);
  border: 1px solid var(--border-bright, #2A3550);
  border-radius: 20px;
  width: 100%; max-width: 560px;
  display: flex; flex-direction: column;
  max-height: calc(100vh - 24px);
  overflow: hidden;
  transform: scale(0.96); transition: transform 0.2s;
}
#crop-modal-overlay.open #crop-modal-box { transform: scale(1); }
#crop-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid var(--border, #1E2535);
  flex-shrink: 0; color: var(--text-primary, #E8EAF0);
}
#crop-container {
  flex: 1; min-height: 0; overflow: hidden;
  background: #0a0c10; position: relative;
}
#crop-container img { max-height: 100%; display: block; }
#crop-controls {
  display: flex; flex-direction: column; gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--border, #1E2535);
  flex-shrink: 0;
}
#crop-ratio-btns {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.crop-ratio-btn {
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
  background: var(--bg-panel, #0F1319);
  border: 1px solid var(--border, #1E2535);
  color: var(--text-secondary, #8A93A6); cursor: pointer;
  transition: all 0.15s;
}
.crop-ratio-btn:hover { border-color: var(--gold-dim, #8B6914); color: var(--text-primary, #E8EAF0); }
.crop-ratio-btn.active {
  background: var(--gold-glow, rgba(212,160,23,0.15));
  border-color: var(--gold, #D4A017); color: var(--gold, #D4A017);
}
#crop-modal-footer {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 12px 16px; border-top: 1px solid var(--border, #1E2535); flex-shrink: 0;
}
@media (max-width: 480px) {
  #crop-modal-box { border-radius: 16px; max-height: calc(100dvh - 24px); }
  #crop-modal-footer { flex-wrap: wrap; }
  #crop-modal-footer > div { order: -1; width: 100%; justify-content: center; }
}
  `;
  document.head.appendChild(style);
})();
