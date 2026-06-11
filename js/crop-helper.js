// ============================================================
// UNIVERSAL IMAGE CROP HELPER
// Pakai Cropper.js dari CDN
// ============================================================

let _cropperInstance = null;
let _cropCallback = null;
let _cropRatio = 1;

// Inject crop modal HTML + Cropper.js ke DOM (sekali saja)
function initCropModal() {
  if (document.getElementById("crop-modal-overlay")) return;

  // Load Cropper.js CSS
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css";
  document.head.appendChild(link);

  // Load Cropper.js script
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js";
  document.head.appendChild(script);

  // Inject HTML
  const html = `
  <div id="crop-modal-overlay">
    <div id="crop-modal-box">
      <div id="crop-modal-header">
        <span>✂ Sesuaikan Gambar</span>
        <button onclick="cancelCrop()" style="background:none;border:none;color:var(--text-muted);font-size:22px;cursor:pointer;line-height:1;">&times;</button>
      </div>
      <div id="crop-container">
        <img id="crop-image" src="" alt="Crop" />
      </div>
      <div id="crop-modal-footer">
        <button class="btn btn-secondary btn-sm" onclick="cancelCrop()">Batal</button>
        <button class="btn btn-secondary btn-sm" onclick="rotateCrop(-90)">↺ Putar</button>
        <button class="btn btn-primary btn-sm" onclick="confirmCrop()">✓ Crop & Upload</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML("afterbegin", html);
}

// Buka crop modal
// ratio: 1 = square, 16/9 = landscape, 0 = free
// onDone(blob, url) dipanggil setelah crop selesai
function openCropModal(file, ratio, onDone) {
  initCropModal();
  _cropRatio = ratio;
  _cropCallback = onDone;

  const reader = new FileReader();
  reader.onload = e => {
    const overlay = document.getElementById("crop-modal-overlay");
    const img = document.getElementById("crop-image");

    // Destroy existing cropper
    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }

    img.src = e.target.result;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";

    // Wait for img to load before init cropper
    img.onload = () => {
      _cropperInstance = new Cropper(img, {
        aspectRatio: ratio === 0 ? NaN : ratio,
        viewMode: 1,
        autoCropArea: 0.9,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
        responsive: true,
        checkOrientation: true,
      });
    };
  };
  reader.readAsDataURL(file);
}

function rotateCrop(deg) {
  if (_cropperInstance) _cropperInstance.rotate(deg);
}

function cancelCrop() {
  if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
  document.getElementById("crop-modal-overlay").classList.remove("open");
  document.body.style.overflow = "";
  _cropCallback = null;
}

function confirmCrop() {
  if (!_cropperInstance) return;
  const canvas = _cropperInstance.getCroppedCanvas({
    maxWidth: 2048,
    maxHeight: 2048,
    fillColor: "#fff",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  });

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
    document.getElementById("crop-modal-overlay").classList.remove("open");
    document.body.style.overflow = "";
    if (_cropCallback) _cropCallback(blob, url);
    _cropCallback = null;
  }, "image/jpeg", 0.92);
}
