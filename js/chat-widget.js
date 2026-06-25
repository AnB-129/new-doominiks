// ============================================================
// CUSTOMER SERVICE CHAT WIDGET (floating bubble)
// Cukup tambahkan <script src=".../js/chat-widget.js"></script>
// di halaman manapun (setelah firebase-config.js & app.js) buat
// nampilin tombol chat mengambang. Tidak aktif di halaman /owner/.
//
// Model data: 1 percakapan per user di collection "chats/{uid}",
// dengan subcollection "chats/{uid}/messages". Tiap pesan boleh
// melampirkan 1 order ("attachedOrder") kalau user lagi nanya soal
// pesanan tertentu.
// ============================================================
(function () {
  if (window.location.pathname.includes("/owner/")) return; // widget cuma buat sisi customer

  let csUnsubBadge = null;
  let csUnsubMessages = null;
  let csMyOrders = [];
  let csOrdersFetchedFor = null;
  let csAttachedOrder = null;
  let csAttachedImage = null; // { url, previewUrl }
  let csImageUploading = false;
  let csPanelOpen = false;
  let csPrevUnreadByCustomer = undefined; // dipake buat deteksi pesan BARU masuk (bukan cuma badge nempel)

  // ---- Cloudinary config (samain dengan upload lain di proyek ini) ----
  const CLOUDINARY_CLOUD_NAME_CS = "dnpvgpqka";
  const CLOUDINARY_UPLOAD_PRESET_CS = "vaultstore";

  // ---- Icon SVG (ganti emoji biar konsisten & tajam di semua device) ----
  const ICON_CHAT_DOTS = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.08.93 3.97 2.45 5.4-.16 1.06-.58 2.4-1.45 3.6 1.62-.1 3.06-.62 4.2-1.32A10.6 10.6 0 0 0 12 19c4.97 0 9-3.58 9-8s-4.03-8-9-8Z" fill="currentColor"/><circle cx="8.2" cy="11" r="1.15" fill="#fff" opacity="0.92"/><circle cx="12" cy="11" r="1.15" fill="#fff" opacity="0.92"/><circle cx="15.8" cy="11" r="1.15" fill="#fff" opacity="0.92"/></svg>`;
  const ICON_CHAT_HEADER = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.08.93 3.97 2.45 5.4-.16 1.06-.58 2.4-1.45 3.6 1.62-.1 3.06-.62 4.2-1.32A10.6 10.6 0 0 0 12 19c4.97 0 9-3.58 9-8s-4.03-8-9-8Z" fill="var(--gold)"/><circle cx="8.2" cy="11" r="1.05" fill="#fff" opacity="0.92"/><circle cx="12" cy="11" r="1.05" fill="#fff" opacity="0.92"/><circle cx="15.8" cy="11" r="1.05" fill="#fff" opacity="0.92"/></svg>`;
  const ICON_PAPERCLIP = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
  const ICON_CAMERA = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h2.5l1.2-1.8a1 1 0 0 1 .8-.4h6.9a1 1 0 0 1 .8.4L17.4 7H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.2"/></svg>`;
  const ICON_CLOSE_X = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>`;

  function escapeHtmlCS(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  // ---- Inject widget markup sekali ke body ----
  function injectWidgetHTML() {
    if (document.getElementById("cs-widget-root")) return;
    const root = document.createElement("div");
    root.id = "cs-widget-root";
    root.innerHTML = `
      <button id="cs-widget-btn" class="cs-widget-btn" aria-label="Customer Service" type="button">
        ${ICON_CHAT_DOTS}<span id="cs-widget-badge" class="cs-widget-badge"></span>
      </button>
      <div id="cs-widget-panel" class="cs-widget-panel">
        <div class="cs-widget-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="cs-widget-header-icon">${ICON_CHAT_HEADER}</span>
            <div>
              <div style="font-weight:700;font-size:14px;">Customer Service</div>
              <div style="font-size:11px;color:var(--text-muted);">Biasanya balas dalam &lt; 1 jam</div>
            </div>
          </div>
          <button class="cs-widget-close" id="cs-widget-close-btn" type="button" aria-label="Tutup">&times;</button>
        </div>
        <div id="cs-widget-messages" class="chat-messages cs-widget-messages"></div>
        <div id="cs-order-picker" class="cs-order-picker"></div>
        <div id="cs-attach-pills" class="cs-attach-pills"></div>
        <div class="chat-input-bar cs-widget-input-bar">
          <button id="cs-attach-btn" class="cs-attach-btn" type="button" style="display:none;" title="Lampirkan pesanan">${ICON_PAPERCLIP}</button>
          <button id="cs-image-btn" class="cs-attach-btn" type="button" title="Kirim gambar">${ICON_CAMERA}</button>
          <input type="file" id="cs-image-input" accept="image/*" style="display:none;" />
          <input class="form-input" id="cs-widget-input" placeholder="Tulis pesan..." maxlength="500" />
          <button class="btn btn-primary btn-sm" id="cs-widget-send-btn" type="button">Kirim</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    document.getElementById("cs-widget-btn").addEventListener("click", toggleWidget);
    document.getElementById("cs-widget-close-btn").addEventListener("click", closeWidget);
    document.getElementById("cs-attach-btn").addEventListener("click", toggleOrderPicker);
    document.getElementById("cs-image-btn").addEventListener("click", function () {
      const inp = document.getElementById("cs-image-input");
      if (inp) inp.click();
    });
    document.getElementById("cs-image-input").addEventListener("change", function (e) {
      const file = e.target.files && e.target.files[0];
      if (file) uploadChatImage(file);
      e.target.value = "";
    });
    document.getElementById("cs-widget-send-btn").addEventListener("click", sendMessage);
    document.getElementById("cs-widget-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); sendMessage(); }
    });
  }

  // ---- Open / close ----
  function toggleWidget() { if (csPanelOpen) closeWidget(); else openWidget(); }

  function openWidget() {
    if (!auth.currentUser) {
      toast("Login dulu yuk buat chat sama admin", "info");
      if (document.getElementById("modal-login")) openModal("modal-login");
      return;
    }
    const panel = document.getElementById("cs-widget-panel");
    if (!panel) return;
    panel.classList.add("open");
    csPanelOpen = true;
    listenMessages(auth.currentUser.uid);
    fetchMyOrders(auth.currentUser.uid);
    markReadByCustomer(auth.currentUser.uid);
    hideBadgeNow();
  }

  function closeWidget() {
    const panel = document.getElementById("cs-widget-panel");
    if (panel) panel.classList.remove("open");
    csPanelOpen = false;
    hideOrderPicker();
  }

  function hideBadgeNow() {
    const badge = document.getElementById("cs-widget-badge");
    if (badge) badge.style.display = "none";
  }

  function markReadByCustomer(uid) {
    db.collection("chats").doc(uid).set({ unreadByCustomer: 0 }, { merge: true }).catch(function () {});
  }

  // ---- Unread badge (real-time, jalan walau panel ketutup) ----
  function listenBadge(uid) {
    if (csUnsubBadge) { csUnsubBadge(); csUnsubBadge = null; }
    csPrevUnreadByCustomer = undefined;
    csUnsubBadge = db.collection("chats").doc(uid).onSnapshot(function (doc) {
      const badge = document.getElementById("cs-widget-badge");
      const n = (doc.exists && doc.data().unreadByCustomer) || 0;
      if (badge) {
        if (n > 0 && !csPanelOpen) { badge.textContent = n > 9 ? "9+" : n; badge.style.display = "flex"; }
        else { badge.style.display = "none"; }
      }
      // Toast pop-up pas admin balas, tapi cuma kalau panel-nya lagi ketutup
      // (kalau lagi kebuka, pesan udah langsung kelihatan live di dalam panel)
      if (csPrevUnreadByCustomer !== undefined && n > csPrevUnreadByCustomer && !csPanelOpen) {
        const lastText = (doc.data().lastMessageText || "").slice(0, 60);
        toast(`💬 Admin membalas: ${lastText}`, "info", 5000);
      }
      csPrevUnreadByCustomer = n;
    }, function () {});
  }

  // ---- Messages ----
  function listenMessages(uid) {
    if (csUnsubMessages) { csUnsubMessages(); csUnsubMessages = null; }
    const box = document.getElementById("cs-widget-messages");
    if (box) box.innerHTML = `<div class="chat-empty">Memuat percakapan...</div>`;
    csUnsubMessages = db.collection("chats").doc(uid).collection("messages").orderBy("createdAt", "asc")
      .onSnapshot(function (snap) {
        renderMessages(snap.docs.map(function (d) { return d.data(); }));
      }, function () {
        if (box) box.innerHTML = `<div class="chat-empty">Gagal memuat percakapan.</div>`;
      });
  }

  function renderMessages(msgs) {
    const box = document.getElementById("cs-widget-messages");
    if (!box) return;
    if (!msgs.length) {
      box.innerHTML = `<div class="chat-empty">👋 Halo! Ada yang bisa kami bantu?<br>Tanya apa aja soal produk atau pesanan kamu di sini.</div>`;
      return;
    }
    box.innerHTML = msgs.map(function (m) {
      const mine = m.senderRole === "customer";
      return `<div class="chat-bubble ${mine ? "me" : "them"}">` +
        (!mine ? `<div class="chat-sender">★ Admin DOOMINIKS</div>` : "") +
        (m.attachedOrder ? renderOrderCard(m.attachedOrder) : "") +
        (m.imageUrl ? `<img src="${escapeHtmlCS(m.imageUrl)}" alt="Gambar" class="chat-img" onclick="window.open('${escapeHtmlCS(m.imageUrl)}','_blank')" />` : "") +
        (m.text ? `<div>${escapeHtmlCS(m.text)}</div>` : "") +
        `<div class="chat-meta">${typeof formatDate === "function" ? formatDate(m.createdAt) : ""}</div>` +
      `</div>`;
    }).join("");
    box.scrollTop = box.scrollHeight;
  }

  function renderOrderCard(o) {
    const statusLbl = { pending: "Menunggu", processing: "Diproses", success: "Berhasil", failed: "Gagal" };
    const statusCls = { pending: "badge-pending", processing: "badge-processing", success: "badge-success", failed: "badge-failed" };
    return `<div class="chat-order-card">
      <div class="chat-order-card-top"><span>📦 ${escapeHtmlCS(o.orderId || "")}</span><span class="badge ${statusCls[o.status] || "badge-pending"}">${statusLbl[o.status] || o.status || ""}</span></div>
      <div class="chat-order-card-product">${escapeHtmlCS(o.productName || "")}${o.itemName ? " — " + escapeHtmlCS(o.itemName) : ""}</div>
      ${o.total ? `<div class="chat-order-card-total">${typeof formatIDR === "function" ? formatIDR(o.total) : o.total}</div>` : ""}
    </div>`;
  }

  // ---- Lampirkan pesanan ----
  function fetchMyOrders(uid) {
    if (csOrdersFetchedFor === uid) { renderOrderPickerList(); return; }
    db.collection("orders").where("userId", "==", uid).limit(20).get().then(function (snap) {
      csMyOrders = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      csMyOrders.sort(function (a, b) {
        const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      csOrdersFetchedFor = uid;
      const attachBtn = document.getElementById("cs-attach-btn");
      if (attachBtn) attachBtn.style.display = csMyOrders.length ? "flex" : "none";
      renderOrderPickerList();
    }).catch(function () {});
  }

  function renderOrderPickerList() {
    const picker = document.getElementById("cs-order-picker");
    if (!picker) return;
    if (!csMyOrders.length) { picker.innerHTML = ""; return; }
    picker.innerHTML = csMyOrders.map(function (o) {
      return `<button type="button" class="cs-order-chip" onclick="window._csSelectOrder('${o.id}')">
        <div class="cs-order-chip-id">${escapeHtmlCS(o.orderId)}</div>
        <div class="cs-order-chip-name">${escapeHtmlCS(o.productName)}</div>
      </button>`;
    }).join("");
  }

  function toggleOrderPicker() {
    const picker = document.getElementById("cs-order-picker");
    if (picker) picker.classList.toggle("open");
  }

  function hideOrderPicker() {
    const picker = document.getElementById("cs-order-picker");
    if (picker) picker.classList.remove("open");
  }

  function selectOrder(orderDocId) {
    const o = csMyOrders.find(function (x) { return x.id === orderDocId; });
    if (!o) return;
    csAttachedOrder = { orderId: o.orderId, productName: o.productName || "", itemName: o.itemName || "", total: o.total || 0, status: o.status || "pending" };
    renderAttachPills();
    hideOrderPicker();
  }

  function renderAttachPills() {
    const el = document.getElementById("cs-attach-pills");
    if (!el) return;
    let html = "";
    if (csAttachedOrder) {
      html += `<div class="cs-attach-pill">
        <span style="font-size:12px;">${ICON_PAPERCLIP} ${escapeHtmlCS(csAttachedOrder.orderId)} — ${escapeHtmlCS(csAttachedOrder.productName)}</span>
        <button type="button" onclick="window._csRemoveAttachedOrder()">${ICON_CLOSE_X}</button>
      </div>`;
    }
    if (csAttachedImage) {
      html += `<div class="cs-attach-pill ${csImageUploading ? "uploading" : ""}">
        <img src="${escapeHtmlCS(csAttachedImage.previewUrl)}" alt="" />
        <span style="font-size:12px;">${csImageUploading ? "Mengupload..." : "Gambar siap dikirim"}</span>
        ${csImageUploading ? "" : `<button type="button" onclick="window._csRemoveAttachedImage()">${ICON_CLOSE_X}</button>`}
      </div>`;
    }
    el.innerHTML = html;
  }

  function removeAttachedOrder() {
    csAttachedOrder = null;
    renderAttachPills();
  }

  function removeAttachedImage() {
    csAttachedImage = null;
    csImageUploading = false;
    renderAttachPills();
  }

  // ---- Upload gambar ke Cloudinary ----
  function uploadChatImage(file) {
    if (!file.type || file.type.indexOf("image/") !== 0) {
      toast("File harus berupa gambar", "error");
      return;
    }
    if (!auth.currentUser) {
      toast("Login dulu yuk buat chat sama admin", "info");
      if (document.getElementById("modal-login")) openModal("modal-login");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    csAttachedImage = { url: null, previewUrl: previewUrl };
    csImageUploading = true;
    renderAttachPills();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET_CS);
    formData.append("folder", "doominiks/chat");
    fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME_CS}/image/upload`, { method: "POST", body: formData })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.secure_url) throw new Error("Upload gagal");
        csImageUploading = false;
        if (csAttachedImage) csAttachedImage.url = data.secure_url;
        renderAttachPills();
      })
      .catch(function () {
        toast("Gagal mengupload gambar, coba lagi", "error");
        csAttachedImage = null;
        csImageUploading = false;
        renderAttachPills();
      });
  }

  // ---- Kirim pesan ----
  function ensureChatDoc(uid, user) {
    return db.collection("chats").doc(uid).set({
      userId: uid,
      userName: user.displayName || "Pelanggan",
      userPhoto: user.photoURL || null,
      userEmail: user.email || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  function sendMessage() {
    const input = document.getElementById("cs-widget-input");
    if (!input) return;
    if (csImageUploading) { toast("Tunggu gambar selesai diupload ya", "info"); return; }
    const text = input.value.trim();
    if (!text && !csAttachedOrder && !csAttachedImage) return;
    const user = auth.currentUser;
    if (!user) return;
    input.value = "";
    const attachedOrder = csAttachedOrder;
    const attachedImage = csAttachedImage ? csAttachedImage.url : null;
    csAttachedOrder = null;
    csAttachedImage = null;
    renderAttachPills();
    ensureChatDoc(user.uid, user).then(function () {
      return db.collection("chats").doc(user.uid).collection("messages").add({
        text: text,
        senderId: user.uid,
        senderName: user.displayName || "Pelanggan",
        senderRole: "customer",
        attachedOrder: attachedOrder || null,
        imageUrl: attachedImage || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).then(function () {
      return db.collection("chats").doc(user.uid).update({
        unreadByOwner: firebase.firestore.FieldValue.increment(1),
        lastMessageText: text || (attachedImage ? "📷 Gambar" : "📎 Lampiran pesanan"),
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).catch(function (e) {
      toast("Gagal mengirim pesan: " + e.message, "error");
      input.value = text;
      csAttachedOrder = attachedOrder;
      if (attachedImage) csAttachedImage = { url: attachedImage, previewUrl: attachedImage };
      renderAttachPills();
    });
  }

  // ---- Entry point global (dipake dari halaman lain, mis. tombol Chat di orders.html) ----
  window._csSelectOrder = selectOrder;
  window._csRemoveAttachedOrder = removeAttachedOrder;
  window._csRemoveAttachedImage = removeAttachedImage;

  window.openCSChat = function () { openWidget(); };

  window.openCSChatWithOrder = function (orderId) {
    if (!auth.currentUser) {
      toast("Login dulu yuk buat chat sama admin", "info");
      if (document.getElementById("modal-login")) openModal("modal-login");
      return;
    }
    openWidget();
    db.collection("orders").doc(orderId).get().then(function (doc) {
      if (!doc.exists) return;
      const o = doc.data();
      csAttachedOrder = { orderId: o.orderId || orderId, productName: o.productName || "", itemName: o.itemName || "", total: o.total || 0, status: o.status || "pending" };
      renderAttachPills();
      const input = document.getElementById("cs-widget-input");
      if (input) input.focus();
    }).catch(function () {});
  };

  // ---- Reset state tiap auth berubah ----
  auth.onAuthStateChanged(function (user) {
    if (csUnsubBadge) { csUnsubBadge(); csUnsubBadge = null; }
    if (csUnsubMessages) { csUnsubMessages(); csUnsubMessages = null; }
    csOrdersFetchedFor = null;
    csMyOrders = [];
    csAttachedOrder = null;
    csAttachedImage = null;
    csImageUploading = false;
    closeWidget();
    if (user) {
      listenBadge(user.uid);
    } else {
      hideBadgeNow();
    }
  });

  function init() { injectWidgetHTML(); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
