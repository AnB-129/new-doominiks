// ============================================================
// FIREBASE CONFIGURATION
// Ganti dengan config Firebase project kamu
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCwBPPYAF6vuJkeH74GFDXNTtK1Cn_l6uI",
  authDomain: "doominiksstore.xyz",
  projectId: "doominiks-gold",
  storageBucket: "doominiks-gold.firebasestorage.app",
  messagingSenderId: "455827305732",
  appId: "1:455827305732:web:32997e57bd4c7f41a00c51"
};

// Owner UIDs — tambahkan UID kamu setelah login pertama
const OWNER_UIDS = ["LKtJsX3RnlQJhZTHxzLIk3Vfkr23"];

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Helper: cek apakah user adalah owner
function isOwner(uid) {
  return OWNER_UIDS.includes(uid);
}

// Helper: format currency IDR
function formatIDR(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(amount);
}

// Helper: format tanggal
function formatDate(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(d);
}

// Helper: generate order ID
function generateOrderId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "ORD-";
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
