// «الاعلان برسايل الواتساب»: صفحة كاملة لإعلان (صورة + نص) يتم إرساله لمجموعة عملاء
// رسالة رسالة بفاصل دقائق (مع خيار عشوائية قريبة). مجموعات العملاء تنضاف يدوياً أو من Excel.
// البيانات والإرسال على الخادم: /admin/wa-ads.
(function () {
  if (window.TRAINING_MODE) return;
  const menuButton = document.getElementById("waAdsPage");
  if (!menuButton) return;

  const SUGGESTED_KB = 150;
  const esc = value => escapeHtml(value);
  const kb = bytes => Math.max(1, Math.round(bytes / 1024)).toLocaleString("en-US");

  const page = document.createElement("dialog");
  page.id = "waAdsDialog";
  page.className = "wa-ads-page";
  page.innerHTML = `<div class="wa-wrap" id="waAdsView"></div>`;
  document.body.append(page);
  const view = page.querySelector("#waAdsView");

  let groups = [], ads = [], loaded = false, error = "";
  let screen = "home", selectedGroupId = "", viewedAdId = "", groupMenuOpen = false, contactForm = null;
  let clockOffset = 0, pollTimer = 0, countdownTimer = 0;
  // المسودة: تبقى لما ينتقل لصفحة المجموعات ويرجع.
  const emptyDraft = () => ({ editingId: "", text: "", groupId: "", intervalMin: 5, random: true, targetKb: SUGGESTED_KB, image: null });
  let draft = emptyDraft();
  // image: { url (موجودة على الخادم) | blob (جديدة), preview, size, width, height, original: {blob,size,width,height} }

  const serverNow = () => Date.now() + clockOffset;
  const groupOf = id => groups.find(group => group.id === id);
  const adOf = id => ads.find(ad => ad.id === id);
  const header = (title, actions = "", back = "") => `<header class="wa-head">
    <button type="button" class="wa-back" data-wa="${back || "close"}" aria-label="رجوع">→ رجوع</button>
    <h2>${esc(title)}</h2><div class="wa-actions">${actions}</div></header>`;

  // ===== العرض =====
  function render() {
    if (screen === "groups") return renderGroups();
    if (screen === "progress") return renderProgress();
    renderHome();
  }

  function imageBlock() {
    const image = draft.image;
    if (!image) return `<label class="wa-drop"><input type="file" accept="image/*" id="waImageInput" hidden><span>＋ أضف صورة الإعلان</span><small>المقترح ${SUGGESTED_KB} كيلوبايت أو أقل عشان تتحمل بسرعة عند الناس بالواتساب</small></label>`;
    const tooBig = image.size > draft.targetKb * 1024;
    return `<div class="wa-image">
      <img src="${esc(image.preview)}" alt="">
      <div class="wa-image-info">
        <p class="wa-size ${tooBig ? "is-big" : "is-ok"}">حجم الصورة: <b>${kb(image.size)} كيلوبايت</b>${image.width ? ` <small>(${image.width}×${image.height})</small>` : ""}</p>
        ${image.original && image.original.size !== image.size ? `<p class="wa-muted">الحجم الأصلي: ${kb(image.original.size)} كيلوبايت</p>` : ""}
        <p class="wa-muted">${tooBig ? "الصورة أكبر من الحجم المطلوب، اضغط «تقليل الحجم»." : "الحجم مناسب للإرسال ✓"}</p>
        <div class="wa-compress"><label>الحجم المطلوب<span><input type="number" id="waTargetKb" min="20" max="2000" step="10" value="${draft.targetKb}" inputmode="numeric"> كيلوبايت</span></label>
          <button type="button" class="primary" data-wa="compress" ${image.original ? "" : "disabled"}>تقليل الحجم</button></div>
        <div class="wa-image-actions"><label class="wa-link-btn"><input type="file" accept="image/*" id="waImageInput" hidden>تغيير الصورة</label><button type="button" class="wa-link-btn danger" data-wa="remove-image">حذف الصورة</button></div>
      </div></div>`;
  }

  function renderHome() {
    const editing = draft.editingId ? adOf(draft.editingId) : null;
    const groupCards = groups.map(group => `<label class="wa-group-option ${draft.groupId === group.id ? "is-selected" : ""}">
      <input type="radio" name="waGroup" value="${esc(group.id)}" ${draft.groupId === group.id ? "checked" : ""}>
      <span><b>${esc(group.name)}</b><small>${group.contacts.length} عميل</small></span></label>`).join("");
    const cards = ads.map(adCard).join("");
    view.innerHTML = `${header("الاعلان برسايل الواتساب")}
      <form class="wa-form" id="waAdForm">
        <h3>${editing ? "تعديل الإعلان" : "إعلان جديد"}</h3>
        <section class="wa-block"><h4>صورة الرسالة</h4><div id="waImageBlock">${imageBlock()}</div></section>
        <section class="wa-block"><h4>نص الرسالة</h4>
          <textarea id="waText" rows="6" maxlength="4000" placeholder="اكتب النص اللي ينرسل مع الرسالة">${esc(draft.text)}</textarea>
          <small class="wa-muted" id="waTextCount"></small></section>
        <section class="wa-block"><div class="wa-block-head"><h4>مجموعات العملاء</h4>
          <div class="wa-block-actions">${groups.length ? `<button type="button" class="wa-link-btn" data-wa="groups">إدارة المجموعات</button>` : ""}<button type="button" class="primary wa-plus" data-wa="new-group" aria-label="إضافة مجموعة">＋</button></div></div>
          <div class="wa-new-group hidden" id="waNewGroup"><input id="waNewGroupName" maxlength="80" placeholder="اسم المجموعة" autocomplete="off"><button type="button" class="primary" data-wa="create-group">إنشاء</button><button type="button" data-wa="cancel-group">إلغاء</button></div>
          <div class="wa-groups">${loaded ? groupCards || `<p class="wa-empty-small">لا توجد مجموعات. اضغط ＋ لإضافة أول مجموعة.</p>` : `<p class="wa-empty-small">جاري التحميل…</p>`}</div></section>
        <section class="wa-block"><h4>الوقت بين كل رسالة والثانية</h4>
          <div class="wa-interval"><input type="number" id="waInterval" min="0.5" max="1440" step="0.5" value="${draft.intervalMin}" inputmode="decimal"><span>دقيقة</span></div>
          <label class="wa-switch"><input type="checkbox" id="waRandom" ${draft.random ? "checked" : ""}><span class="wa-toggle"></span><span><b>إرسال عشوائي</b><small id="waRandomHint"></small></span></label></section>
        <p class="wa-error" id="waFormError" role="alert"></p>
        <div class="wa-submit">
          <button type="submit" class="primary" id="waSubmit">${editing ? "حفظ التعديل" : "إضافة الإعلان"}</button>
          ${editing ? `<button type="button" data-wa="cancel-edit">إلغاء</button><button type="button" class="danger-btn" data-wa="delete-ad">حذف الإعلان</button>` : ""}
        </div>
      </form>
      <section class="wa-ads"><h3>الإعلانات</h3>
        ${error ? `<p class="wa-error">${esc(error)}</p>` : ""}
        <div class="wa-cards">${loaded ? cards || `<p class="wa-empty-small">لا توجد إعلانات إلى الآن.</p>` : `<p class="wa-empty-small">جاري التحميل…</p>`}</div></section>`;
    updateHints();
  }

  function updateHints() {
    const text = page.querySelector("#waText");
    const count = page.querySelector("#waTextCount");
    if (text && count) count.textContent = draft.image ? `${text.value.length} / 1000 حرف (الحد مع الصورة)` : `${text.value.length} حرف`;
    const hint = page.querySelector("#waRandomHint");
    if (!hint) return;
    const base = Number(draft.intervalMin) || 0;
    hint.textContent = draft.random && base
      ? `كل رسالة بين ${duration(base * 0.88 * 60000)} و ${duration(base * 1.12 * 60000)} بدل ${duration(base * 60000)} بالضبط`
      : "كل رسالة بنفس الوقت بالضبط";
  }

  function progressOf(ad) {
    const queue = ad.queue || [];
    const sent = queue.filter(item => item.status === "sent").length;
    const failed = queue.filter(item => item.status === "failed").length;
    return { total: queue.length, sent, failed };
  }
  const STATUS = { idle: "لم يبدأ", running: "شغال", paused: "متوقف", done: "انتهى" };
  function adCard(ad) {
    const group = groupOf(ad.groupId);
    const { total, sent, failed } = progressOf(ad);
    const people = total || group?.contacts.length || 0;
    const running = ad.status === "running";
    return `<article class="wa-card">
      ${ad.image ? `<img src="${esc(ad.image)}" alt="" loading="lazy">` : `<div class="wa-card-noimg">نص فقط</div>`}
      <div class="wa-card-body">
        <div class="wa-card-top"><span class="wa-status is-${esc(ad.status)}">${STATUS[ad.status] || ""}</span><small>${esc(group?.name || "مجموعة محذوفة")} · ${people} عميل · كل ${esc(ad.intervalMin)} د${ad.random ? " (عشوائي)" : ""}</small></div>
        <p class="wa-card-text">${esc(ad.text || "")}</p>
        ${total ? `<div class="wa-bar"><i style="width:${total ? Math.round((sent / total) * 100) : 0}%"></i></div><small class="wa-muted">تم إرسال ${sent} من ${total}${failed ? ` · فشل ${failed}` : ""}</small>` : ""}
        <div class="wa-card-actions">
          <button type="button" class="${running ? "danger-btn" : "primary"}" data-wa-${running ? "stop" : "start"}="${esc(ad.id)}">${running ? "إيقاف الإعلان" : ad.status === "paused" ? "متابعة الإعلان" : "تشغيل الإعلان"}</button>
          <button type="button" data-wa-edit="${esc(ad.id)}" ${running ? "disabled title=\"أوقف الإعلان قبل التعديل\"" : ""}>تعديل</button>
          <button type="button" data-wa-view="${esc(ad.id)}">عرض</button>
        </div>
      </div></article>`;
  }

  function renderGroups() {
    const group = groupOf(selectedGroupId);
    const tabs = groups.map(item => `<button type="button" class="wa-tab ${item.id === selectedGroupId ? "is-active" : ""}" data-wa-group="${esc(item.id)}">${esc(item.name)} <small>${item.contacts.length}</small></button>`).join("");
    const rows = group ? group.contacts.map((contact, index) => contactForm?.id === contact.id ? contactEditor(contact) : `<li class="wa-contact">
      <span class="wa-num">${index + 1}</span><span class="wa-contact-name">${esc(contact.name || "بدون اسم")}</span><bdi>${esc(contact.phone)}</bdi>
      <button type="button" class="wa-link-btn" data-wa-contact-edit="${esc(contact.id)}">تعديل</button>
      <button type="button" class="wa-link-btn danger" data-wa-contact-delete="${esc(contact.id)}">حذف</button></li>`).join("") : "";
    view.innerHTML = `${header("مجموعات العملاء", group ? `<div class="wa-plus-wrap"><button type="button" class="primary wa-plus" data-wa="group-menu" aria-label="إضافة">＋</button>
        <div class="wa-menu ${groupMenuOpen ? "" : "hidden"}"><button type="button" data-wa="add-contact">إضافة عميل</button><button type="button" data-wa="import">إضافة مجموعة عملاء</button></div></div>` : "", "home")}
      <div class="wa-tabs">${tabs || `<p class="wa-empty-small">لا توجد مجموعات.</p>`}</div>
      ${group ? `<div class="wa-group-head"><h3>${esc(group.name)}</h3><span class="wa-muted">${group.contacts.length} عميل</span>
          <button type="button" class="wa-link-btn" data-wa="rename-group">تعديل الاسم</button><button type="button" class="wa-link-btn danger" data-wa="delete-group">حذف المجموعة</button></div>
        ${contactForm && !contactForm.id ? `<ul class="wa-contacts">${contactEditor({ id: "", name: "", phone: "" })}</ul>` : ""}
        <div id="waImportBox"></div>
        <ul class="wa-contacts">${rows || (contactForm && !contactForm.id ? "" : `<li class="wa-empty-small">المجموعة فاضية. اضغط ＋ لإضافة عملاء.</li>`)}</ul>` : ""}`;
    if (contactForm) page.querySelector(".wa-contact-form input")?.focus();
  }
  function contactEditor(contact) {
    return `<li><form class="wa-contact-form" data-contact="${esc(contact.id)}">
      <input name="name" maxlength="80" placeholder="اسم العميل" value="${esc(contact.name)}" autocomplete="off">
      <input name="phone" type="tel" inputmode="numeric" maxlength="20" placeholder="رقم الهاتف" value="${esc(contact.phone)}" dir="ltr" required autocomplete="off">
      <button type="submit" class="primary">${contact.id ? "حفظ" : "إضافة"}</button><button type="button" data-wa="cancel-contact">إلغاء</button>
      <p class="wa-error" role="alert"></p></form></li>`;
  }
  function renderImportBox() {
    const box = page.querySelector("#waImportBox");
    if (!box) return;
    box.innerHTML = `<div class="wa-import">
      <h4>إضافة مجموعة عملاء من Excel</h4>
      <ol><li>حمّل النموذج وعبّي فيه اسم العميل ورقم هاتفه (8 أرقام).</li><li>ارفق الملف هنا وينضافون للمجموعة.</li></ol>
      <div class="wa-import-actions"><button type="button" data-wa="template">تحميل نموذج التعبئة</button>
        <label class="primary wa-file-btn"><input type="file" id="waExcelInput" accept=".xlsx,.csv" hidden>إرفاق ملف Excel</label>
        <button type="button" data-wa="close-import">إغلاق</button></div>
      <p class="wa-import-result" id="waImportResult" role="status"></p></div>`;
  }

  function renderProgress() {
    const ad = adOf(viewedAdId);
    if (!ad) { screen = "home"; return render(); }
    const group = groupOf(ad.groupId);
    const queue = ad.queue?.length ? ad.queue : (group?.contacts || []).map(contact => ({ name: contact.name, phone: contact.phone, status: "pending" }));
    const { sent, failed } = progressOf({ queue });
    const running = ad.status === "running";
    const items = queue.map((item, index) => `<li class="wa-q is-${esc(item.status)}" data-index="${index}">
      <span class="wa-q-icon">${item.status === "sent" ? "✓" : item.status === "failed" ? "!" : `<i class="wa-spin"></i>`}</span>
      <span class="wa-num">${index + 1}</span>
      <span class="wa-contact-name">${esc(item.name || "بدون اسم")}</span><bdi>${esc(item.phone)}</bdi>
      <span class="wa-q-time" data-eta="${index}">${item.status === "sent" ? `تم ${clock(item.sentAt)}` : item.status === "failed" ? esc(item.error || "فشل الإرسال") : ""}</span></li>`).join("");
    view.innerHTML = `${header("عرض الإرسال", `<button type="button" class="${running ? "danger-btn" : "primary"}" data-wa-${running ? "stop" : "start"}="${esc(ad.id)}">${running ? "إيقاف" : ad.status === "paused" ? "متابعة" : "تشغيل الإعلان"}</button>`, "home")}
      <div class="wa-progress-head"><span class="wa-status is-${esc(ad.status)}">${STATUS[ad.status] || ""}</span>
        <b>تم إرسال ${sent} من ${queue.length}</b>${failed ? `<span class="wa-fail-count">فشل ${failed}</span>` : ""}<span class="wa-muted">${esc(group?.name || "")}</span></div>
      <div class="wa-bar"><i style="width:${queue.length ? Math.round((sent / queue.length) * 100) : 0}%"></i></div>
      ${ad.status === "idle" ? `<p class="wa-muted">الترتيب اللي بينرسل فيه. اضغط «تشغيل الإعلان» للبدء.</p>` : ""}
      <ol class="wa-queue">${items}</ol>`;
    updateCountdown();
  }
  // الوقت المتبقي: أول واحد بالدور من موعد الخادم، واللي بعده تقريباً بإضافة الفاصل.
  function updateCountdown() {
    if (screen !== "progress") return;
    const ad = adOf(viewedAdId);
    if (!ad) return;
    const step = ad.intervalMin * 60000;
    let eta = ad.status === "running" ? Math.max(Number(ad.nextAt) || serverNow(), serverNow()) : 0;
    let first = true;
    (ad.queue || []).forEach((item, index) => {
      const cell = page.querySelector(`[data-eta="${index}"]`);
      if (!cell || (item.status !== "pending" && item.status !== "sending")) return;
      if (ad.status !== "running") { cell.textContent = ad.status === "idle" ? "" : "متوقف"; return; }
      if (item.status === "sending") { cell.textContent = "جاري الإرسال…"; return; }
      const left = eta - serverNow();
      cell.textContent = left <= 1000 ? "الحين" : `${!first && ad.random ? "تقريباً " : ""}بعد ${countdown(left)}`;
      first = false;
      eta += step;
    });
  }

  // ===== أدوات =====
  function duration(ms) {
    const total = Math.round(ms / 1000), m = Math.floor(total / 60), s = total % 60;
    return m && s ? `${m} د و ${s} ث` : m ? `${m} د` : `${s} ث`;
  }
  function countdown(ms) {
    const total = Math.ceil(ms / 1000), h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    const pad = value => String(value).padStart(2, "0");
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
  function clock(time) {
    return time ? new Date(time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
  }
  async function api(path, method = "GET", body) {
    const response = await adminRequest(`/admin/wa-ads${path}`, method === "GET" ? {} : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "تعذر الاتصال بالخادم");
    return data;
  }
  function syncClock(now) { if (now) clockOffset = Number(now) - Date.now(); }
  function replaceAd(ad) { const index = ads.findIndex(item => item.id === ad.id); if (index >= 0) ads[index] = ad; else ads.unshift(ad); }
  function replaceGroup(group) { const index = groups.findIndex(item => item.id === group.id); if (index >= 0) groups[index] = group; else groups.push(group); }

  async function load() {
    try {
      const data = await api("");
      syncClock(data.now);
      groups = data.groups || []; ads = data.ads || []; loaded = true; error = "";
    } catch (failure) { error = failure.message; }
    if (screen === "home" && page.querySelector("#waAdForm")) refreshHomeLists(); else render();
  }
  // تحديث الكروت والمجموعات بدون مسح اللي يكتبه بالنموذج.
  function refreshHomeLists() {
    const cards = page.querySelector(".wa-cards");
    if (cards) cards.innerHTML = ads.map(adCard).join("") || `<p class="wa-empty-small">لا توجد إعلانات إلى الآن.</p>`;
    const list = page.querySelector(".wa-groups");
    if (list) list.innerHTML = groups.map(group => `<label class="wa-group-option ${draft.groupId === group.id ? "is-selected" : ""}">
      <input type="radio" name="waGroup" value="${esc(group.id)}" ${draft.groupId === group.id ? "checked" : ""}>
      <span><b>${esc(group.name)}</b><small>${group.contacts.length} عميل</small></span></label>`).join("") || `<p class="wa-empty-small">لا توجد مجموعات. اضغط ＋ لإضافة أول مجموعة.</p>`;
    const errorBox = page.querySelector(".wa-ads > .wa-error");
    if (errorBox && !error) errorBox.remove();
  }
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(async () => {
      if (screen === "groups") return;
      const running = ads.some(ad => ad.status === "running");
      if (!running && screen !== "progress") return;
      if (screen === "progress") {
        try { const data = await api(`/ads/${encodeURIComponent(viewedAdId)}`); syncClock(data.now); replaceAd(data.ad); renderProgress(); } catch {}
      } else await load();
    }, 4000);
    countdownTimer = setInterval(updateCountdown, 1000);
  }
  function stopPolling() { clearInterval(pollTimer); clearInterval(countdownTimer); }

  // ===== الصورة =====
  function readImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("تعذر قراءة الصورة")); };
      img.src = url;
    });
  }
  const encode = (canvas, quality) => new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
  // يصغّر الجودة أول، وإذا ما كفى يصغّر الأبعاد، لين يوصل للحجم المطلوب.
  async function compressTo(img, targetBytes) {
    let scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    let best = null;
    for (let round = 0; round < 8; round += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      let low = 0.45, high = 0.92, fit = null;
      const top = await encode(canvas, high);
      if (top.size <= targetBytes) fit = { blob: top, quality: high };
      else {
        for (let step = 0; step < 6; step += 1) {
          const quality = (low + high) / 2;
          const blob = await encode(canvas, quality);
          if (blob.size <= targetBytes) { fit = { blob, quality }; low = quality; } else high = quality;
        }
        if (!fit) { const blob = await encode(canvas, 0.45); if (blob.size <= targetBytes) fit = { blob, quality: 0.45 }; }
      }
      if (fit) return { blob: fit.blob, width: canvas.width, height: canvas.height };
      best = { blob: await encode(canvas, 0.45), width: canvas.width, height: canvas.height };
      if (Math.max(canvas.width, canvas.height) <= 360) break;
      scale *= 0.78;
    }
    return best;
  }
  async function pickImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("اختر ملف صورة"); return; }
    try {
      const { img, url } = await readImage(file);
      draft.image = { blob: file, preview: url, size: file.size, width: img.naturalWidth, height: img.naturalHeight, original: { file, img, size: file.size } };
      syncDraftFromForm();
      renderImageBlock();
    } catch (failure) { alert(failure.message); }
  }
  async function compressImage(button) {
    const image = draft.image;
    if (!image?.original) return;
    const target = Math.max(20, Number(page.querySelector("#waTargetKb")?.value) || SUGGESTED_KB);
    draft.targetKb = target;
    button.disabled = true;
    button.textContent = "جاري التقليل…";
    try {
      const result = await compressTo(image.original.img, target * 1024);
      draft.image = { ...image, blob: result.blob, preview: URL.createObjectURL(result.blob), size: result.blob.size, width: result.width, height: result.height, url: "" };
    } catch { alert("تعذر تقليل حجم الصورة"); }
    renderImageBlock();
  }
  function renderImageBlock() {
    const block = page.querySelector("#waImageBlock");
    if (block) block.innerHTML = imageBlock();
    updateHints();
  }
  async function uploadImage() {
    const image = draft.image;
    if (!image) return "";
    if (image.url && !image.blob) return image.url;
    let blob = image.blob;
    // صور مو JPEG (أو الأصلية بدون تقليل) تتحول JPEG قبل الرفع.
    if (blob.type !== "image/jpeg" || blob === image.original?.file) {
      const result = await compressTo(image.original.img, Math.max(blob.size, 200 * 1024));
      blob = result.blob;
    }
    if (blob.size > 3 * 1024 * 1024) throw new Error("الصورة كبيرة، اضغط «تقليل الحجم» أول");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    const { url } = await api("/image", "POST", { data: btoa(binary) });
    draft.image = { ...image, url, blob: null };
    return url;
  }

  // ===== Excel =====
  const xmlText = value => String(value ?? "").replace(/[<>&"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[char]);
  async function downloadTemplate() {
    const cell = (ref, value, style) => `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
    const zip = new JSZip();
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="العملاء" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    // النمط 2 = نص، عشان أرقام الهواتف ما تتحول لأرقام علمية.
    zip.file("xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="12"/><name val="Arial"/></font><font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173F32"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="49" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
    zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="2" width="20" customWidth="1" style="2"/></cols><sheetData><row r="1" ht="24" customHeight="1">${cell("A1", "اسم العميل", 1)}${cell("B1", "رقم الهاتف", 1)}</row><row r="2">${cell("A2", "مثال: محمد", 0)}${cell("B2", "99999999", 2)}</row></sheetData></worksheet>`);
    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "نموذج عملاء الواتساب.xlsx";
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }
  // يقرأ أول ورقة: عمود الاسم وعمود الهاتف (من العناوين، وإلا A و B).
  async function readSheet(file) {
    if (/\.csv$/i.test(file.name)) {
      return (await file.text()).replace(/^﻿/, "").split(/\r?\n/).filter(line => line.trim()).map(line => line.split(/[,;\t]/).map(value => value.replace(/^"|"$/g, "").trim()));
    }
    const zip = await JSZip.loadAsync(file);
    const parse = async name => { const entry = zip.file(name); return entry ? new DOMParser().parseFromString(await entry.async("string"), "application/xml") : null; };
    const workbook = await parse("xl/workbook.xml");
    const rels = await parse("xl/_rels/workbook.xml.rels");
    const firstId = workbook?.getElementsByTagName("sheet")[0]?.getAttribute("r:id");
    const target = [...(rels?.getElementsByTagName("Relationship") || [])].find(rel => rel.getAttribute("Id") === firstId)?.getAttribute("Target") || "worksheets/sheet1.xml";
    const sheet = await parse(target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
    if (!sheet) throw new Error("الملف ما فيه ورقة بيانات");
    const shared = [...((await parse("xl/sharedStrings.xml"))?.getElementsByTagName("si") || [])].map(si => [...si.getElementsByTagName("t")].map(t => t.textContent).join(""));
    return [...sheet.getElementsByTagName("row")].map(row => {
      const values = [];
      for (const c of row.getElementsByTagName("c")) {
        const column = (c.getAttribute("r") || "").replace(/\d/g, "");
        const index = column ? [...column].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1 : values.length;
        const type = c.getAttribute("t");
        const raw = c.getElementsByTagName("v")[0]?.textContent ?? "";
        values[index] = type === "s" ? shared[Number(raw)] ?? "" : type === "inlineStr" ? [...c.getElementsByTagName("t")].map(t => t.textContent).join("") : /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(raw) ? String(Math.round(Number(raw))) : raw;
      }
      return Array.from(values, value => String(value ?? "").trim());
    });
  }
  async function importExcel(file, resultBox) {
    if (!file) return;
    resultBox.className = "wa-import-result";
    resultBox.textContent = "جاري القراءة…";
    try {
      const rows = await readSheet(file);
      const head = (rows[0] || []).map(value => value.toLowerCase());
      let nameCol = head.findIndex(value => /اسم|name/.test(value));
      let phoneCol = head.findIndex(value => /هاتف|جوال|رقم|phone|mobile/.test(value));
      const hasHeader = nameCol >= 0 || phoneCol >= 0;
      if (nameCol < 0) nameCol = phoneCol === 0 ? 1 : 0;
      if (phoneCol < 0) phoneCol = nameCol === 1 ? 0 : 1;
      const contacts = rows.map((row, index) => ({ row: index + 1, name: row[nameCol] || "", phone: row[phoneCol] || "" }))
        .slice(hasHeader ? 1 : 0)
        .filter(entry => (entry.name || entry.phone) && !/^مثال/.test(entry.name));
      if (!contacts.length) throw new Error("الملف فاضي، عبّي الأسماء والأرقام في النموذج");
      const result = await api(`/groups/${encodeURIComponent(selectedGroupId)}/contacts`, "POST", { contacts });
      replaceGroup(result.group);
      renderGroups();
      renderImportBox();
      const box = page.querySelector("#waImportResult");
      box.className = `wa-import-result ${result.invalid.length ? "is-warn" : "is-ok"}`;
      box.innerHTML = `تمت إضافة ${result.added} عميل${result.updated ? ` · تحديث اسم ${result.updated}` : ""}${result.added + result.updated < contacts.length - result.invalid.length ? ` · ${contacts.length - result.invalid.length - result.added - result.updated} موجودين من قبل` : ""}`
        + (result.invalid.length ? `<br>أرقام غير صحيحة (لازم 8 أرقام) ما انضافت: ${result.invalid.slice(0, 20).map(entry => `سطر ${entry.row}${entry.name ? ` (${esc(entry.name)})` : ""}`).join("، ")}${result.invalid.length > 20 ? " …" : ""}` : "");
    } catch (failure) {
      resultBox.className = "wa-import-result is-error";
      resultBox.textContent = failure.message;
    }
  }

  // ===== النموذج =====
  function syncDraftFromForm() {
    const text = page.querySelector("#waText");
    if (!text) return;
    draft.text = text.value;
    draft.intervalMin = page.querySelector("#waInterval").value;
    draft.random = page.querySelector("#waRandom").checked;
    draft.groupId = page.querySelector("input[name=waGroup]:checked")?.value || draft.groupId;
    const target = page.querySelector("#waTargetKb");
    if (target) draft.targetKb = Number(target.value) || SUGGESTED_KB;
  }
  function editAd(ad) {
    draft = { editingId: ad.id, text: ad.text || "", groupId: ad.groupId, intervalMin: ad.intervalMin, random: !!ad.random, targetKb: SUGGESTED_KB, image: ad.image ? { url: ad.image, preview: ad.image, size: 0 } : null };
    renderHome();
    if (draft.image) measureRemoteImage();
    page.querySelector("#waAdForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function measureRemoteImage() {
    const image = draft.image;
    try {
      const blob = await (await fetch(image.url)).blob();
      const { img } = await readImage(blob);
      if (draft.image !== image) return;
      draft.image = { ...image, size: blob.size, width: img.naturalWidth, height: img.naturalHeight, original: { file: blob, img, size: blob.size } };
      renderImageBlock();
    } catch {}
  }
  async function submitAd(form) {
    syncDraftFromForm();
    const button = form.querySelector("#waSubmit");
    const errorBox = form.querySelector("#waFormError");
    errorBox.textContent = "";
    if (!draft.image && !draft.text.trim()) { errorBox.textContent = "أضف صورة أو نص للإعلان"; return; }
    if (!draft.groupId) { errorBox.textContent = "اختر مجموعة العملاء"; return; }
    button.disabled = true;
    const label = button.textContent;
    button.textContent = draft.image && !draft.image.url ? "جاري رفع الصورة…" : "جاري الحفظ…";
    try {
      const image = await uploadImage();
      const body = { image, text: draft.text, groupId: draft.groupId, intervalMin: Number(draft.intervalMin), random: draft.random };
      const ad = draft.editingId ? await api(`/ads/${encodeURIComponent(draft.editingId)}`, "PUT", body) : await api("/ads", "POST", body);
      replaceAd(ad);
      draft = emptyDraft();
      renderHome();
      page.querySelector(".wa-ads")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (failure) {
      errorBox.textContent = failure.message;
      button.disabled = false;
      button.textContent = label;
    }
  }

  async function startAd(id, button) {
    const ad = adOf(id);
    if (!ad) return;
    let restart = false;
    if (ad.status === "done") {
      if (!confirm("الإعلان انرسل للكل. تبي ترسله مرة ثانية لكل المجموعة؟")) return;
      restart = true;
    } else if (ad.status === "idle") {
      const count = groupOf(ad.groupId)?.contacts.length || 0;
      if (!confirm(`تشغيل الإعلان وإرساله لـ ${count} عميل، رسالة كل ${ad.intervalMin} دقيقة؟`)) return;
    }
    button.disabled = true;
    try {
      const data = await api(`/ads/${encodeURIComponent(id)}/start`, "POST", { restart });
      syncClock(data.now); replaceAd(data.ad);
    } catch (failure) { alert(failure.message); }
    render();
  }
  async function stopAd(id, button) {
    button.disabled = true;
    try { const data = await api(`/ads/${encodeURIComponent(id)}/stop`, "POST"); syncClock(data.now); replaceAd(data.ad); }
    catch (failure) { alert(failure.message); }
    render();
  }

  // ===== الأحداث =====
  menuButton.addEventListener("click", () => {
    screen = "home"; draft = emptyDraft(); loaded = false;
    page.showModal(); render(); load(); startPolling();
  });
  page.addEventListener("close", stopPolling);
  page.addEventListener("cancel", event => { if (screen !== "home") { event.preventDefault(); screen = "home"; contactForm = null; render(); } });

  page.addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) { if (groupMenuOpen && !event.target.closest(".wa-menu")) { groupMenuOpen = false; page.querySelector(".wa-menu")?.classList.add("hidden"); } return; }
    const action = button.dataset.wa;
    if (action !== "group-menu" && groupMenuOpen && !button.closest(".wa-menu")) { groupMenuOpen = false; page.querySelector(".wa-menu")?.classList.add("hidden"); }

    if (action === "close") page.close();
    else if (action === "home") { screen = "home"; contactForm = null; groupMenuOpen = false; render(); }
    else if (action === "groups") { syncDraftFromForm(); selectedGroupId = draft.groupId || groups[0]?.id || ""; contactForm = null; screen = "groups"; render(); }
    else if (action === "new-group") {
      syncDraftFromForm();
      const box = page.querySelector("#waNewGroup");
      box.classList.remove("hidden");
      box.querySelector("input").focus();
    }
    else if (action === "cancel-group") page.querySelector("#waNewGroup").classList.add("hidden");
    else if (action === "create-group") createGroup(button);
    else if (action === "compress") compressImage(button);
    else if (action === "remove-image") { draft.image = null; renderImageBlock(); }
    else if (action === "cancel-edit") { draft = emptyDraft(); renderHome(); }
    else if (action === "delete-ad") {
      const ad = adOf(draft.editingId);
      if (!ad || !confirm("حذف هذا الإعلان؟")) return;
      try { await api(`/ads/${encodeURIComponent(ad.id)}/delete`, "POST"); ads = ads.filter(item => item.id !== ad.id); draft = emptyDraft(); renderHome(); }
      catch (failure) { alert(failure.message); }
    }
    else if (button.dataset.waStart) startAd(button.dataset.waStart, button);
    else if (button.dataset.waStop) stopAd(button.dataset.waStop, button);
    else if (button.dataset.waEdit) editAd(adOf(button.dataset.waEdit));
    else if (button.dataset.waView) { viewedAdId = button.dataset.waView; screen = "progress"; render(); }
    // صفحة المجموعات
    else if (button.dataset.waGroup) { selectedGroupId = button.dataset.waGroup; contactForm = null; renderGroups(); }
    else if (action === "group-menu") { groupMenuOpen = !groupMenuOpen; page.querySelector(".wa-menu").classList.toggle("hidden", !groupMenuOpen); }
    else if (action === "add-contact") { groupMenuOpen = false; contactForm = { id: "" }; renderGroups(); }
    else if (action === "import") { groupMenuOpen = false; contactForm = null; renderGroups(); renderImportBox(); }
    else if (action === "close-import") page.querySelector("#waImportBox").innerHTML = "";
    else if (action === "template") downloadTemplate().catch(failure => alert(failure.message));
    else if (action === "cancel-contact") { contactForm = null; renderGroups(); }
    else if (button.dataset.waContactEdit) { contactForm = { id: button.dataset.waContactEdit }; renderGroups(); }
    else if (button.dataset.waContactDelete) {
      const group = groupOf(selectedGroupId);
      const contact = group?.contacts.find(item => item.id === button.dataset.waContactDelete);
      if (!contact || !confirm(`حذف ${contact.name || contact.phone} من المجموعة؟`)) return;
      try { replaceGroup(await api(`/groups/${encodeURIComponent(group.id)}/contacts/${encodeURIComponent(contact.id)}/delete`, "POST")); renderGroups(); }
      catch (failure) { alert(failure.message); }
    }
    else if (action === "rename-group") {
      const group = groupOf(selectedGroupId);
      const name = prompt("اسم المجموعة", group?.name || "");
      if (!group || !name?.trim()) return;
      try { replaceGroup(await api(`/groups/${encodeURIComponent(group.id)}`, "PUT", { name })); renderGroups(); }
      catch (failure) { alert(failure.message); }
    }
    else if (action === "delete-group") {
      const group = groupOf(selectedGroupId);
      if (!group || !confirm(`حذف مجموعة «${group.name}» وكل الأسماء اللي فيها؟`)) return;
      try {
        await api(`/groups/${encodeURIComponent(group.id)}/delete`, "POST");
        groups = groups.filter(item => item.id !== group.id);
        if (draft.groupId === group.id) draft.groupId = "";
        selectedGroupId = groups[0]?.id || "";
        renderGroups();
      } catch (failure) { alert(failure.message); }
    }
  });

  async function createGroup(button) {
    const input = page.querySelector("#waNewGroupName");
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    button.disabled = true;
    try {
      const group = await api("/groups", "POST", { name });
      replaceGroup(group);
      draft.groupId = group.id;
      selectedGroupId = group.id;
      contactForm = null;
      groupMenuOpen = true;
      screen = "groups";
      render();
    } catch (failure) { alert(failure.message); button.disabled = false; }
  }

  page.addEventListener("keydown", event => {
    if (event.key === "Enter" && event.target.id === "waNewGroupName") { event.preventDefault(); createGroup(page.querySelector("[data-wa=create-group]")); }
  });
  page.addEventListener("input", event => {
    if (event.target.matches("#waText, #waInterval")) { syncDraftFromForm(); updateHints(); }
  });
  page.addEventListener("change", event => {
    const target = event.target;
    if (target.id === "waImageInput") pickImage(target.files[0]);
    else if (target.id === "waExcelInput") { importExcel(target.files[0], page.querySelector("#waImportResult")); target.value = ""; }
    else if (target.id === "waRandom") { syncDraftFromForm(); updateHints(); }
    else if (target.id === "waTargetKb") { draft.targetKb = Number(target.value) || SUGGESTED_KB; renderImageBlock(); }
    else if (target.name === "waGroup") {
      draft.groupId = target.value;
      page.querySelectorAll(".wa-group-option").forEach(option => option.classList.toggle("is-selected", option.querySelector("input").checked));
    }
  });
  page.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    if (form.id === "waAdForm") return submitAd(form);
    if (!form.classList.contains("wa-contact-form")) return;
    const errorBox = form.querySelector(".wa-error");
    const body = { name: form.elements.name.value, phone: form.elements.phone.value };
    const id = form.dataset.contact;
    form.querySelector("[type=submit]").disabled = true;
    try {
      if (id) replaceGroup(await api(`/groups/${encodeURIComponent(selectedGroupId)}/contacts/${encodeURIComponent(id)}`, "PUT", body));
      else {
        const result = await api(`/groups/${encodeURIComponent(selectedGroupId)}/contacts`, "POST", { contacts: [body] });
        if (result.invalid.length) throw new Error("رقم الهاتف لازم يكون 8 أرقام");
        if (!result.added && !result.updated) throw new Error("هذا الرقم موجود في المجموعة");
        replaceGroup(result.group);
        // يبقى النموذج مفتوح لإضافة العميل اللي بعده.
        contactForm = { id: "" };
        renderGroups();
        return;
      }
      contactForm = null;
      renderGroups();
    } catch (failure) {
      errorBox.textContent = failure.message;
      form.querySelector("[type=submit]").disabled = false;
    }
  });
})();
