// ============================================================
// MAIN APP UTILITIES
// ============================================================

// ---- Toast Notifications ----
function toast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const icons = { success: "✓", error: "✕", info: "&#9432;" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ---- Modal ----
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) { overlay.classList.add("open"); document.body.style.overflow = "hidden"; }
}
function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) { overlay.classList.remove("open"); document.body.style.overflow = ""; }
}
// Close on overlay click
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
    document.body.style.overflow = "";
  }
});

// ---- Page Loader ----
function hideLoader() {
  const loader = document.getElementById("page-loader");
  if (loader) { loader.style.opacity = "0"; setTimeout(() => loader.remove(), 400); }
}

// ---- Auth State ----
let currentUser = null;
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  updateNavAuth(user);
  if (typeof onAuthReady === "function") onAuthReady(user);
});

function updateNavAuth(user) {
  const loginBtn = document.getElementById("btn-login");
  const userMenu = document.getElementById("user-menu");
  const userAvatar = document.getElementById("nav-avatar");
  const userName = document.getElementById("nav-username");
  const adminLink = document.getElementById("nav-admin-link");

  if (user) {
    if (loginBtn) loginBtn.style.display = "none";
    if (userMenu) userMenu.style.display = "flex";
    if (userAvatar) {
      if (user.photoURL) userAvatar.innerHTML = `<img src="${user.photoURL}" alt="">`;
      else userAvatar.textContent = (user.displayName || user.email || "U")[0].toUpperCase();
    }
    if (userName) userName.textContent = user.displayName ? user.displayName.split(" ")[0] : "User";
    if (adminLink) adminLink.style.display = isOwner(user.uid) ? "flex" : "none";
  } else {
    if (loginBtn) loginBtn.style.display = "flex";
    if (userMenu) userMenu.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
  }
}

async function signInWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    // Upsert user document
    await db.collection("users").doc(user.uid).set({
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    toast(`Selamat datang, ${user.displayName ? user.displayName.split(" ")[0] : "User"}!`, "success");
    return user;
  } catch (err) {
    console.error(err);
    toast("Login gagal. Coba lagi.", "error");
    throw err;
  }
}

async function signOut() {
  await auth.signOut();
  toast("Kamu telah logout.", "info");
  if (window.location.pathname.includes("owner")) window.location.href = "../index.html";
}

// ---- Active Nav Link ----
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll(".nav-links a, .sidebar-nav a").forEach(a => {
    a.classList.remove("active");
    if (path.includes(a.getAttribute("href"))) a.classList.add("active");
  });
}
document.addEventListener("DOMContentLoaded", setActiveNav);
