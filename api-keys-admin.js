// «مفاتيح API»: المدير ينشئ مفتاح لجهة خارجية (شريك تسويق، برنامج تقارير)، يحدد بعلامة صح
// شنو يقدر يقرأ أو يعدل، ويعطيه المفتاح. المفتاح يظهر مرة وحدة فقط، ويتوقف أو ينحذف بأي وقت.
// البيانات: /admin/api-keys على الخادم، والجهة الخارجية تقرأ من /partner/v1.
(function () {
  if (window.TRAINING_MODE) return;
  const menuButton = document.getElementById("apiKeysPage");
  if (!menuButton) return;
  const esc = value => escapeHtml(value);
  const BASE = `${API_BASE}/partner/v1`;
  // الصلاحيات الفرعية ما لها معنى بدون الأساسية.
  const PARENT = { "orders.items:read": "orders:read", "orders.area:read": "orders:read", "orders.all:read": "orders:read", "customers.key:read": "orders:read", "visits.all:read": "visits:read" };
  const EXPIRY = [["0", "بدون انتهاء"], ["30", "بعد 30 يوم"], ["90", "بعد 90 يوم"], ["365", "بعد سنة"]];

  const dialog = document.createElement("dialog");
  dialog.id = "apiKeysDialog";
  dialog.className = "api-keys-dialog";
  dialog.innerHTML = `<div class="dialog-card"><div id="apiKeysView"></div></div>`;
  document.body.append(dialog);
  const view = dialog.querySelector("#apiKeysView");

  let keys = [], scopes = [], ratePerMinute = 120, loaded = false, loadError = "";
  let screen = "list", selectedId = "", shownToken = "";
  const selected = () => keys.find(key => key.id === selectedId);

  const header = (title, back = false) => `<header class="ak-head">
    ${back ? `<button type="button" class="ak-back" data-ak="list">→ رجوع</button>` : ""}
    <h2>${esc(title)}</h2><button type="button" class="icon-btn" data-ak="close" aria-label="إغلاق">×</button></header>`;
  const dateText = at => at ? new Date(at).toLocaleString("ar-KW", { dateStyle: "medium", timeStyle: "short" }) : "";
  const stateOf = key => !key.active ? ["موقوف", "is-off"] : key.expiresAt && key.expiresAt < Date.now() ? ["منتهي", "is-off"] : ["شغال", "is-on"];
  const accessText = key => {
    const read = key.scopes.some(id => id.endsWith(":read")), write = key.scopes.some(id => id.endsWith(":write"));
    return read && write ? "قراءة وتعديل" : write ? "تعديل فقط" : "قراءة فقط";
  };

  function render() {
    if (screen === "form") return renderForm();
    if (screen === "token") return renderToken();
    renderList();
  }

  function renderList() {
    selectedId = "";
    const cards = keys.map(key => {
      const [label, tone] = stateOf(key);
      return `<button type="button" class="ak-card" data-ak-open="${esc(key.id)}">
        <span class="ak-card-top"><strong>${esc(key.name)}</strong><em class="ak-state ${tone}">${label}</em></span>
        <span>${accessText(key)} · <b>${key.scopes.length}</b> صلاحية · ينتهي بـ <bdi>…${esc(key.tokenHint)}</bdi></span>
        <span>${key.lastUsedAt ? `آخر استخدام: ${esc(dateText(key.lastUsedAt))} · ${Number(key.requests || 0).toLocaleString("en")} طلب` : "لم يُستخدم إلى الآن"}</span>
      </button>`;
    }).join("");
    view.innerHTML = `${header("مفاتيح API")}
      <button type="button" class="primary ak-add" data-ak="new" ${loaded ? "" : "disabled"}>＋ مفتاح جديد</button>
      <p class="ak-hint">كل مفتاح لجهة وحدة. أنت تحدد شنو تشوف وشنو تعدل، وتقدر توقفه أو تحذفه بأي وقت. المفاتيح ما توصل أبداً لاسم الزبون أو رقمه أو عنوانه.</p>
      <div class="ak-list">${loadError ? `<p class="ak-empty ak-error">${esc(loadError)}</p>` : !loaded ? `<p class="ak-empty">جاري التحميل…</p>` : cards || `<p class="ak-empty">لا توجد مفاتيح إلى الآن.</p>`}</div>`;
  }

  function scopeTable(current) {
    const groups = [...new Set(scopes.map(scope => scope.group))];
    return `<div class="ak-table" role="table">
      <div class="ak-row ak-row-head" role="row"><span>الصلاحية</span><span>قراءة</span><span>تعديل</span></div>
      ${groups.map(group => `<div class="ak-group">${esc(group)}</div>${scopes.filter(scope => scope.group === group).map(scope => {
        const box = `<input type="checkbox" name="scope" value="${esc(scope.id)}" ${current.includes(scope.id) ? "checked" : ""} aria-label="${esc(`${scope.label} — ${scope.access === "write" ? "تعديل" : "قراءة"}`)}">`;
        return `<label class="ak-row ${PARENT[scope.id] ? "is-sub" : ""}" role="row" data-scope="${esc(scope.id)}">
          <span><strong>${esc(scope.label)}</strong><small>${esc(scope.hint)}</small></span>
          <span class="ak-box">${scope.access === "read" ? box : `<i>—</i>`}</span>
          <span class="ak-box">${scope.access === "write" ? box : `<i>—</i>`}</span>
        </label>`;
      }).join("")}`).join("")}
    </div>`;
  }
  // صلاحية فرعية بدون الأساسية ما تنفع: نقفلها لين تنحط علامة الأساسية.
  function syncScopeRows() {
    const boxes = [...view.querySelectorAll('input[name="scope"]')];
    const on = id => boxes.find(box => box.value === id)?.checked;
    boxes.forEach(box => {
      const parent = PARENT[box.value];
      if (!parent) return;
      box.disabled = !on(parent);
      if (box.disabled) box.checked = false;
      box.closest(".ak-row").classList.toggle("is-disabled", box.disabled);
    });
  }

  function renderForm() {
    const key = selected();
    const [label, tone] = key ? stateOf(key) : ["", ""];
    view.innerHTML = `${header(key ? "تعديل المفتاح" : "مفتاح جديد", true)}
      <form class="ak-form" id="apiKeyForm">
        <label>اسم الجهة<input name="name" maxlength="80" required placeholder="مثال: شريك السوشل ميديا" value="${esc(key?.name || "")}"></label>
        ${key ? `<p class="ak-meta"><em class="ak-state ${tone}">${label}</em> أُنشئ ${esc(dateText(key.createdAt))}${key.expiresAt ? ` · ينتهي ${esc(dateText(key.expiresAt))}` : " · بدون انتهاء"}${key.lastUsedAt ? ` · آخر استخدام ${esc(dateText(key.lastUsedAt))}` : ""}</p>` : ""}
        <div><h3>شنو يقدر يسوي هالمفتاح؟</h3>
          <div class="ak-quick"><button type="button" data-ak="pick-read">كل القراءة</button><button type="button" data-ak="pick-none">مسح الكل</button></div>
          ${scopeTable(key?.scopes || [])}</div>
        <label>مدة المفتاح<select name="expiry">${key ? `<option value="keep">بدون تغيير</option>` : ""}${EXPIRY.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}</select></label>
        <p class="ak-error" id="apiKeyError"></p>
        <button type="submit" class="primary">${key ? "حفظ التعديل" : "إنشاء المفتاح"}</button>
      </form>
      ${key ? `<div class="ak-tools">
        <button type="button" data-ak="docs">نسخ طريقة الاستخدام</button>
        <button type="button" data-ak="toggle">${key.active ? "إيقاف المفتاح مؤقتاً" : "تشغيل المفتاح"}</button>
        <button type="button" data-ak="rotate">استبدال المفتاح بواحد جديد</button>
        <button type="button" class="ak-danger" data-ak="delete">حذف المفتاح نهائياً</button>
      </div>` : ""}`;
    syncScopeRows();
  }

  function renderToken() {
    const key = selected();
    view.innerHTML = `${header("المفتاح جاهز", true)}
      <p class="ak-warn">انسخ المفتاح الحين وأرسله للجهة بشكل خاص. <b>ما راح يظهر مرة ثانية.</b> إذا ضاع، استبدله بواحد جديد.</p>
      <label class="ak-copy">المفتاح<textarea readonly rows="2" dir="ltr" id="apiKeyToken">${esc(shownToken)}</textarea></label>
      <label class="ak-copy">عنوان الواجهة<input readonly dir="ltr" value="${esc(BASE)}"></label>
      <div class="ak-tools">
        <button type="button" class="primary" data-ak="copy-token">نسخ المفتاح</button>
        <button type="button" data-ak="copy-all">نسخ المفتاح مع طريقة الاستخدام</button>
      </div>
      <p class="ak-hint">«${esc(key?.name || "")}» · ${key ? accessText(key) : ""}</p>`;
  }

  // شرح جاهز للجهة: العناوين اللي يسمح فيها هالمفتاح بالذات.
  function usageText(key, token) {
    const has = id => key.scopes.includes(id);
    const lines = [
      "Figs & Olives API", `Base URL: ${BASE}`, `Header:   Authorization: Bearer ${token || "<YOUR_KEY>"}`,
      `Server-to-server only (no browser/CORS). Limit: ${ratePerMinute} requests per minute. Times are Kuwait time (+03:00). Amounts are KWD strings with 3 decimals.`,
      "No names, phone numbers, addresses, notes or payment details are ever returned.", "",
      "GET /health  -> {\"ok\": true, \"time\": \"...\"}", "GET /me      -> the permissions of this key"
    ];
    if (has("orders:read")) lines.push("",
      "GET /orders?updated_since=<ISO8601>&limit=<1..200>&cursor=<next_cursor>",
      "  Orders created or changed since the time given, oldest first. Keep `next_cursor` and send it on the next call to continue after the last order you received.",
      `  Returns ${has("orders.all:read") ? "all website orders since 2026-09-01" : "only orders that came through a tracked link (?ref= / ?cid=)"}.`,
      `  Fields: order_id, created_at, updated_at, status, stage, catalog, order_type, subtotal_kwd, delivery_kwd, total_kwd, payment_method${has("orders.area:read") ? ", branch, area" : ""}${has("orders.items:read") ? ", items[]" : ""}, attribution{first_ref, first_cid, first_seen_at, first_landing_path, first_referrer_host, last_*, session_referrer_host}${has("customers.key:read") ? ", customer_key" : ""}.`,
      "  An order exists only after a successful payment, so status is always \"active\" (the website has no cancel/refund).");
    if (has("visits:read")) lines.push("",
      "GET /visits?from=<ISO8601>&to=<ISO8601>   (at most 7 days per call)",
      `  One row per visit${has("visits.all:read") ? "" : " that came through a tracked link"}: visit_id, ref, cid, started_at, last_seen_at, landing_path, referrer_host, pages[], added_to_cart, cart_value_kwd, order_completed, order_id.`,
      "  A visit ends after 30 quiet minutes. Ask for a window that ended at least an hour ago to get finished visits.");
    if (has("catalog:read")) lines.push("", "GET /catalog", "  products[]: product_id, name, name_en, catalog, category_id, category, category_en, price_kwd, available.");
    if (has("catalog.availability:write")) lines.push("", "POST /products/<product_id>/availability   body: {\"available\": true|false}", "  Marks a product available or sold out. Nothing else can be changed.");
    lines.push("", "Tracked links: add ?ref=<link id>&cid=<click id> to any figsolives.online page. ref: a-z 0-9 . _ - (max 80). cid: letters, digits, _ - (max 40). The site remembers them for 30 days.",
      "Errors: 401 wrong/stopped key, 403 permission not granted, 429 too many requests (see Retry-After).");
    return lines.join("\n");
  }

  async function request(path, method = "GET", body) {
    const response = await adminRequest(path, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "تعذر تنفيذ الطلب");
    return result;
  }
  async function load() {
    loadError = "";
    render();
    try {
      const result = await request("/admin/api-keys");
      keys = result.keys || []; scopes = result.scopes || []; ratePerMinute = result.ratePerMinute || 120; loaded = true;
    } catch (error) { loadError = error.message; }
    render();
  }
  const replaceKey = key => { keys = keys.some(item => item.id === key.id) ? keys.map(item => item.id === key.id ? key : item) : [key, ...keys]; };
  async function copy(text, done) {
    try { await navigator.clipboard.writeText(text); toast(done); }
    catch { window.prompt("انسخ النص", text); }
  }

  menuButton.addEventListener("click", () => { screen = "list"; shownToken = ""; dialog.showModal(); load(); });
  dialog.addEventListener("close", () => { shownToken = ""; });
  dialog.addEventListener("change", event => { if (event.target.name === "scope") syncScopeRows(); });
  dialog.addEventListener("click", async event => {
    const open = event.target.closest("[data-ak-open]");
    if (open) { selectedId = open.dataset.akOpen; screen = "form"; return render(); }
    const button = event.target.closest("[data-ak]");
    if (!button) return;
    const action = button.dataset.ak, key = selected();
    try {
      if (action === "close") dialog.close();
      else if (action === "list") { shownToken = ""; screen = "list"; render(); }
      else if (action === "new") { selectedId = ""; screen = "form"; render(); }
      else if (action === "pick-read" || action === "pick-none") {
        view.querySelectorAll('input[name="scope"]').forEach(box => { box.disabled = false; box.checked = action === "pick-read" && box.value.endsWith(":read"); });
        syncScopeRows();
      }
      else if (action === "copy-token") await copy(shownToken, "تم نسخ المفتاح");
      else if (action === "copy-all") await copy(usageText(key, shownToken), "تم نسخ المفتاح مع طريقة الاستخدام");
      else if (action === "docs") await copy(usageText(key, ""), "تم نسخ طريقة الاستخدام (بدون المفتاح)");
      else if (action === "toggle") { replaceKey((await request(`/admin/api-keys/${key.id}`, "PUT", { active: !key.active })).key); render(); toast(key.active ? "تم إيقاف المفتاح" : "تم تشغيل المفتاح"); }
      else if (action === "rotate") {
        if (!window.confirm(`استبدال مفتاح «${key.name}»؟ المفتاح القديم يتوقف فوراً والجهة تحتاج المفتاح الجديد.`)) return;
        const result = await request(`/admin/api-keys/${key.id}/rotate`, "POST");
        replaceKey(result.key); shownToken = result.token; screen = "token"; render();
      }
      else if (action === "delete") {
        if (!window.confirm(`حذف مفتاح «${key.name}» نهائياً؟ الجهة ما راح تقدر تتصل بعدها.`)) return;
        await request(`/admin/api-keys/${key.id}/delete`, "POST");
        keys = keys.filter(item => item.id !== key.id); screen = "list"; render(); toast("تم حذف المفتاح");
      }
    } catch (error) { toast(error.message); }
  });
  dialog.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    if (form.id !== "apiKeyForm") return;
    const key = selected(), submitButton = form.querySelector("[type=submit]"), errorBox = form.querySelector("#apiKeyError");
    const chosen = [...form.querySelectorAll('input[name="scope"]:checked')].map(box => box.value);
    const days = form.elements.expiry.value;
    const body = { name: form.elements.name.value.trim(), scopes: chosen, ...(days === "keep" ? {} : { expiresAt: Number(days) ? Date.now() + Number(days) * 86400000 : 0 }) };
    errorBox.textContent = "";
    if (!chosen.length) { errorBox.textContent = "اختر صلاحية وحدة على الأقل"; return; }
    if (chosen.some(id => id.endsWith(":write")) && !window.confirm("هالمفتاح يقدر يعدل على الموقع، مو بس يقرأ. متأكد؟")) return;
    submitButton.disabled = true;
    try {
      if (key) { replaceKey((await request(`/admin/api-keys/${key.id}`, "PUT", body)).key); screen = "list"; toast("تم حفظ التعديل"); }
      else { const result = await request("/admin/api-keys", "POST", body); replaceKey(result.key); selectedId = result.key.id; shownToken = result.token; screen = "token"; }
      render();
    } catch (error) { errorBox.textContent = error.message; submitButton.disabled = false; }
  });
})();
