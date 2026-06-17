// ============================================================
// MAIN APP UTILITIES
// ============================================================

// ---- Theme Toggle (Dark/Light) ----
// Apply saved theme immediately saat app.js load di halaman manapun
(function() {
  const saved = localStorage.getItem("doominiks-theme");
  if (saved === "light") document.documentElement.setAttribute("data-theme", "light");
})();

function toggleTheme(e) {
  const html = document.documentElement;
  const isLight = html.getAttribute("data-theme") === "light";
  const newTheme = isLight ? "dark" : "light";

  html.setAttribute("data-theme", newTheme);
  localStorage.setItem("doominiks-theme", newTheme);

  // Animasi icon toggle button (kalau ada di halaman ini)
  document.querySelectorAll(".theme-toggle").forEach(btn => {
    btn.classList.remove("clicked");
    requestAnimationFrame(() => {
      btn.classList.add("clicked");
      setTimeout(() => btn.classList.remove("clicked"), 500);
    });
  });
}

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
  if (loader) {
    loader.style.pointerEvents = "none";
    loader.style.opacity = "0";
    setTimeout(() => { if (loader.parentNode) loader.remove(); }, 400);
  }
}

// ---- Auth State ----
let currentUser = null;
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  // Reset semua yang bisa block UI
  document.body.style.overflow = "";
  document.body.style.pointerEvents = "";
  document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open"));
  // Double-reset setelah 500ms untuk handle COOP delay
  setTimeout(() => {
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
  }, 500);
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
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    await db.collection("users").doc(user.uid).set({
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    // Reload halaman supaya COOP state bersih dan semua klik normal
    window.location.reload();
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') return;
    if (err.code === 'auth/cancelled-popup-request') return;
    console.error(err);
    toast("Login gagal. Coba lagi.", "error");
  }
}

async function signOut() {
  document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open"));
  document.body.style.overflow = "";
  await auth.signOut();
  window.location.reload();
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

// ============================================================
// SCROLL REVEAL — IntersectionObserver
// ============================================================
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger sibling elements
        const siblings = entry.target.parentElement?.querySelectorAll('.reveal, .reveal-scale');
        let delay = 0;
        if (siblings) {
          siblings.forEach((el, idx) => {
            if (el === entry.target) delay = idx * 60;
          });
        }
        setTimeout(() => {
          entry.target.classList.add('revealed');
        }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  // Observe all reveal elements
  document.querySelectorAll('.reveal, .reveal-scale').forEach(el => observer.observe(el));
}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', initScrollReveal);

// Re-init when new content is dynamically added (call this after rendering cards)
window.refreshScrollReveal = function() {
  document.querySelectorAll('.reveal:not(.revealed), .reveal-scale:not(.revealed)').forEach(el => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    observer.observe(el);
  });
};
