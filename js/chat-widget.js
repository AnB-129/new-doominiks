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
  let csPanelOpen = false;

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
        💬<span id="cs-widget-badge" class="cs-widget-badge"></span>
      </button>
      <div id="cs-widget-panel" class="cs-widget-panel">
        <div class="cs-widget-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">💬</span>
            <div>
              <div style="font-weight:700;font-size:14px;">Customer Service</div>
              <div style="font-size:11px;color:var(--text-muted);">Biasanya balas dalam &lt; 1 jam</div>
            </div>
          </div>
          <button class="cs-widget-close" id="cs-widget-close-btn" type="button" aria-label="Tutup">&times;</button>
        </div>
        <div id="cs-widget-messages" class="chat-messages cs-widget-messages"></div>
        <div id="cs-order-picker" class="cs-order-picker"></div>
        <div id="cs-attached-preview" class="cs-attached-preview" style="display:none;"></div>
        <div class="chat-input-bar cs-widget-input-bar">
          <button id="cs-attach-btn" class="cs-attach-btn" type="button" style="display:none;" title="Lampirkan pesanan">📎</button>
          <input class="form-input" id="cs-widget-input" placeholder="Tulis pesan..." maxlength="500" />
          <button class="btn btn-primary btn-sm" id="cs-widget-send-btn" type="button">Kirim</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    document.getElementById("cs-widget-btn").addEventListener("click", toggleWidget);
    document.getElementById("cs-widget-close-btn").addEventListener("click", closeWidget);
    document.getElementById("cs-attach-btn").addEventListener("click", toggleOrderPicker);
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
    csUnsubBadge = db.collection("chats").doc(uid).onSnapshot(function (doc) {
      const badge = document.getElementById("cs-widget-badge");
      if (!badge) return;
      const n = (doc.exists && doc.data().unreadByCustomer) || 0;
      if (n > 0 && !csPanelOpen) { badge.textContent = n > 9 ? "9+" : n; badge.style.display = "flex"; }
      else { badge.style.display = "none"; }
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
    renderAttachedPreview();
    hideOrderPicker();
  }

  function renderAttachedPreview() {
    const el = document.getElementById("cs-attached-preview");
    if (!el) return;
    if (!csAttachedOrder) { el.style.display = "none"; el.innerHTML = ""; return; }
    el.style.display = "flex";
    el.innerHTML = `<span style="font-size:12px;">📎 ${escapeHtmlCS(csAttachedOrder.orderId)} — ${escapeHtmlCS(csAttachedOrder.productName)}</span>
      <button type="button" onclick="window._csRemoveAttachedOrder()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;">&times;</button>`;
  }

  function removeAttachedOrder() {
    csAttachedOrder = null;
    renderAttachedPreview();
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
    const text = input.value.trim();
    if (!text && !csAttachedOrder) return;
    const user = auth.currentUser;
    if (!user) return;
    input.value = "";
    const attached = csAttachedOrder;
    csAttachedOrder = null;
    renderAttachedPreview();
    ensureChatDoc(user.uid, user).then(function () {
      return db.collection("chats").doc(user.uid).collection("messages").add({
        text: text,
        senderId: user.uid,
        senderName: user.displayName || "Pelanggan",
        senderRole: "customer",
        attachedOrder: attached || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).then(function () {
      return db.collection("chats").doc(user.uid).update({
        unreadByOwner: firebase.firestore.FieldValue.increment(1),
        lastMessageText: text || "📎 Lampiran pesanan",
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).catch(function (e) {
      toast("Gagal mengirim pesan: " + e.message, "error");
      input.value = text;
      csAttachedOrder = attached;
      renderAttachedPreview();
    });
  }

  // ---- Entry point global (dipake dari halaman lain, mis. tombol Chat di orders.html) ----
  window._csSelectOrder = selectOrder;
  window._csRemoveAttachedOrder = removeAttachedOrder;

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
      renderAttachedPreview();
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
