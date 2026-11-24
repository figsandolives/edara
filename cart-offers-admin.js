// «خصومات السلة المتروكة»: من دفع بخصم السلة، المنتظرين (بانتظار الإتمام)، وإعدادات النظام.
// الخصم خاص لكل عميل وليس كوبوناً، فلا يظهر في «كوبونات الخصم». البيانات من /admin/cart-offers.
(function () {
  if (window.TRAINING_MODE) return;
  const menuButton = document.getElementById("cartOffersPage");
  if (!menuButton) return;

  const esc = value => escapeHtml(value == null ? "" : String(value));
  const HOUR = 3600000;
  const money = n => `${Number(n || 0).toFixed(3)} د.ك`;
  const date = n => n ? new Date(n).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait", dateStyle: "medium", timeStyle: "short" }) : "—";
  const localDate = n => n ? new Date(n + 3 * HOUR).toISOString().slice(0, 16) : "";
  const hoursText = ms => { const h = +(ms / HOUR).toFixed(2); return h === 1 ? "ساعة" : h === 2 ? "ساعتين" : Number.isInteger(h) && h >= 3 && h <= 10 ? `${h} ساعات` : `${h} ساعة`; };
  const timestamp = value => value ? new Date(`${value}+03:00`).getTime() : 0;

  const page = document.createElement("dialog");
  page.id = "cartOffersDialog";
  page.className = "co-page";
  page.innerHTML = `<div class="co-wrap" id="coView"></div>`;
  document.body.append(page);
  const view = page.querySelector("#coView");

  let data = null, error = "", screen = "home", editing = "", busy = false, clockOffset = 0, ticker = 0;
  let excluded = new Set(), productQuery = "";
  const serverNow = () => Date.now() + clockOffset;

  async function api(path, method = "GET", body) {
    const response = await adminRequest(`/admin/cart-offers${path}`, method === "GET" ? {} : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "تعذر الاتصال بالخادم");
    return result;
  }

  async function load() {
    try { data = await api(""); error = ""; if (data.serverNow) clockOffset = data.serverNow - Date.now(); }
    catch (failure) { error = failure.message; }
    render();
  }

  const header = (title, back = "close", actions = "") => `<header class="co-head">
    <button type="button" class="co-back" data-co="${back}">→ رجوع</button><h2>${esc(title)}</h2><div class="co-actions">${actions}</div></header>`;

  function remaining(expiresAt) {
    const left = Math.max(0, expiresAt - serverNow());
    const h = Math.floor(left / HOUR), m = Math.floor(left % HOUR / 60000), s = Math.floor(left % 60000 / 1000);
    return [h, m, s].map(part => String(part).padStart(2, "0")).join(":");
  }

  function render() {
    clearInterval(ticker); ticker = 0;
    if (screen === "pending") return renderPending();
    if (screen === "settings") return renderSettings();
    renderHome();
  }

  function renderHome() {
    const stats = data?.stats || {};
    const settings = data?.settings || {};
    const records = data?.records || [];
    const state = !data ? "" : !settings.enabled ? `<span class="co-state off">النظام متوقف</span>` : settings.audience === "all" ? `<span class="co-state on">يعمل لكل العملاء</span>` : `<span class="co-state pilot">تجربة: ${esc((settings.pilotPhones || []).join("، ") || "بدون أرقام")}</span>`;
    view.innerHTML = `${header("خصومات السلة المتروكة", "close", `<button type="button" class="co-settings-btn" data-co="settings">⚙︎ الإعدادات</button>`)}
      ${error ? `<p class="co-error" role="alert">${esc(error)} <button type="button" data-co="reload">إعادة المحاولة</button></p>` : ""}
      ${!data && !error ? `<p class="co-empty">جاري التحميل…</p>` : ""}
      ${data ? `<section class="co-summary">
        <div class="co-summary-top">${state}<span class="co-muted">الخصم الحالي: <b>${settings.discountType === "fixed" ? money(settings.amount) : `${settings.amount}%`}</b> لمدة <b>${hoursText(settings.validityMs)}</b></span></div>
        <div class="co-stats">
          <span><b>${stats.sent || 0}</b>رسالة أُرسلت</span>
          <span><b>${stats.opened || 0}</b>فتحوا الرابط</span>
          <span><b>${stats.paid || 0}</b>دفعوا</span>
          <span><b>${money(stats.discountTotal)}</b>خصومات ممنوحة</span>
          <span><b>${money(stats.salesTotal)}</b>مبيعات</span>
        </div>
        <button type="button" class="co-pending-btn" data-co="pending"><span class="co-pulse" aria-hidden="true"></span>بانتظار الإتمام <b>${stats.pending || 0}</b></button>
      </section>
      <section class="co-table-card"><h3>من دفع بخصم السلة</h3>
        ${records.length ? `<div class="co-table-scroll"><table class="co-table"><thead><tr>
          <th>رقم الفاتورة</th><th>اسم العميل</th><th>رقم الهاتف</th><th>إجمالي الفاتورة</th><th>كوبون الخصم</th><th>مبلغ الخصم</th><th>المجموع</th><th>التوصيل</th><th>الإجمالي</th><th>تاريخ ووقت الدفع</th>
        </tr></thead><tbody>${records.map(row => `<tr>
          <td><b>${esc(row.orderId)}</b></td><td>${esc(row.customerName)}</td><td dir="ltr">${esc(row.phone)}</td><td>${money(row.subtotal)}</td>
          <td><bdi>${esc(row.code)}</bdi><small>${esc(row.label)}</small></td><td class="co-minus">−${money(row.discount)}</td><td>${money(row.net)}</td><td>${money(row.deliveryFee)}</td><td><b>${money(row.total)}</b></td><td>${esc(date(row.paidAt))}</td>
        </tr>`).join("")}</tbody></table></div>` : `<p class="co-empty">لم يدفع أحد بخصم السلة بعد.</p>`}
      </section>` : ""}`;
  }

  function pendingCard(row) {
    if (editing === row.token) return `<article class="co-card is-editing" data-token="${esc(row.token)}">
      <div class="co-card-head"><div><b>${esc(row.customerName)}</b><span dir="ltr">${esc(row.phone)}</span></div></div>
      <form class="co-edit" data-co-form="${esc(row.token)}">
        <label>نوع الخصم<select name="type"><option value="percent" ${row.type === "percent" ? "selected" : ""}>نسبة %</option><option value="fixed" ${row.type === "fixed" ? "selected" : ""}>مبلغ (د.ك)</option></select></label>
        <label>القيمة<input name="amount" type="number" min="0.001" step="0.001" value="${row.amount}" required></label>
        <label class="wide">ينتهي الخصم في (بتوقيت الكويت)<input name="expiresAt" type="datetime-local" value="${localDate(row.expiresAt)}" required></label>
        <p class="co-error wide" data-co-error></p>
        <div class="co-card-actions wide"><button type="submit" class="primary">حفظ</button><button type="button" data-co="cancel-edit">إلغاء</button></div>
      </form></article>`;
    return `<article class="co-card" data-token="${esc(row.token)}">
      <div class="co-card-head"><div><b>${esc(row.customerName)}</b><span dir="ltr">${esc(row.phone)}</span></div>
        <div class="co-timer"><small>متبقي</small><strong dir="ltr" data-co-expires="${row.expiresAt}">${remaining(row.expiresAt)}</strong></div></div>
      <div class="co-card-meta">
        <span>الخصم: <b>${esc(row.label)}</b></span>
        <span>قيمة السلة: <b>${money(row.cartValue)}</b></span>
        <span>أُرسلت: ${esc(date(row.sentAt))}</span>
        <span>${row.openedAt ? `فتح الرابط ✓ ${esc(date(row.openedAt))}` : "لم يفتح الرابط بعد"}</span>
      </div>
      <ul class="co-items">${row.items.map(item => `<li>${esc(item.name)} <b>× ${item.quantity}</b></li>`).join("")}</ul>
      <div class="co-card-actions">
        <button type="button" data-co="edit" data-token="${esc(row.token)}">تعديل</button>
        <button type="button" class="warn" data-co="stop" data-token="${esc(row.token)}">إيقاف الخصم</button>
        <button type="button" class="danger" data-co="delete" data-token="${esc(row.token)}">حذف</button>
      </div></article>`;
  }

  function renderPending() {
    const rows = data?.pending || [];
    view.innerHTML = `${header(`بانتظار الإتمام (${rows.length})`, "home")}
      <p class="co-muted co-intro">عملاء وصلتهم رسالة السلة وخصمهم ما زال فعّالاً ولم يدفعوا بعد.</p>
      ${error ? `<p class="co-error" role="alert">${esc(error)}</p>` : ""}
      <div class="co-cards">${rows.map(pendingCard).join("") || `<p class="co-empty">لا يوجد أحد بانتظار الإتمام حالياً.</p>`}</div>`;
    ticker = setInterval(() => {
      view.querySelectorAll("[data-co-expires]").forEach(node => {
        const expiresAt = Number(node.dataset.coExpires);
        node.textContent = remaining(expiresAt);
        if (expiresAt <= serverNow()) node.closest(".co-card")?.classList.add("is-expired");
      });
    }, 1000);
  }

  function productsList() {
    const q = productQuery.trim().toLowerCase();
    const list = (typeof products !== "undefined" ? products : []).filter(p => !q || `${p.id} ${p.name} ${p.nameEn || ""}`.toLowerCase().includes(q));
    const sorted = [...list.filter(p => excluded.has(String(p.id))), ...list.filter(p => !excluded.has(String(p.id)))].slice(0, 300);
    return sorted.map(p => `<label class="co-product"><input type="checkbox" data-co-product="${esc(p.id)}" ${excluded.has(String(p.id)) ? "checked" : ""}><span>${esc(p.name)}<small>${esc(p.id)}</small></span></label>`).join("") || `<p class="co-empty">لا توجد نتائج</p>`;
  }

  function renderSettings() {
    const s = data?.settings || {};
    const delay = s.delayMs || HOUR;
    const delayUnit = delay % HOUR === 0 ? "h" : delay % 60000 === 0 ? "m" : "s";
    const delayValue = delay / ({ h: HOUR, m: 60000, s: 1000 })[delayUnit];
    const [hourFrom, hourTo] = String(s.hours || "").split("-");
    view.innerHTML = `${header("إعدادات خصم السلة المتروكة", "home")}
      <form class="co-form" id="coSettings">
        <section class="co-block">
          <label class="co-switch"><input type="checkbox" name="enabled" ${s.enabled ? "checked" : ""}><span class="co-toggle"></span><b>تشغيل رسائل السلة المتروكة</b></label>
          <div class="co-radios">
            <label><input type="radio" name="audience" value="pilot" ${s.audience !== "all" ? "checked" : ""}> تجربة على أرقام محددة فقط</label>
            <label><input type="radio" name="audience" value="all" ${s.audience === "all" ? "checked" : ""}> كل العملاء</label>
          </div>
          <label>أرقام التجربة<input name="pilotPhones" value="${esc((s.pilotPhones || []).join(", "))}" placeholder="50203306, 9xxxxxxx" dir="ltr"></label>
        </section>
        <section class="co-block"><h4>الخصم</h4>
          <div class="co-grid">
            <label>نوع الخصم<select name="discountType"><option value="percent" ${s.discountType !== "fixed" ? "selected" : ""}>نسبة %</option><option value="fixed" ${s.discountType === "fixed" ? "selected" : ""}>مبلغ ثابت (د.ك)</option></select></label>
            <label>قيمة الخصم<input name="amount" type="number" min="0.001" step="0.001" value="${s.amount ?? 10}" required></label>
            <label>مدة الخصم (ساعات)<input name="validityHours" type="number" min="0.25" max="168" step="0.25" value="${+((s.validityMs || 3 * HOUR) / HOUR).toFixed(2)}" required></label>
            <label>أقصى خصم (د.ك) <small>0 = بدون حد</small><input name="maxDiscount" type="number" min="0" step="0.001" value="${s.maxDiscount || 0}"></label>
            <label>أقل قيمة للمنتجات المشمولة (د.ك)<input name="minSubtotal" type="number" min="0" step="0.001" value="${s.minSubtotal || 0}"></label>
            <label>طريقة الاستلام<select name="fulfillment"><option value="all">الكل</option><option value="delivery" ${s.fulfillment === "delivery" ? "selected" : ""}>توصيل فقط</option><option value="pickup" ${s.fulfillment === "pickup" ? "selected" : ""}>استلام فقط</option></select></label>
            <label>نوع الطلب<select name="catalogType"><option value="all">الكل</option><option value="bakery" ${s.catalogType === "bakery" ? "selected" : ""}>المخبز فقط</option><option value="restaurant" ${s.catalogType === "restaurant" ? "selected" : ""}>المطعم فقط</option></select></label>
          </div>
          <label class="co-check"><input type="checkbox" name="excludeSaleItems" ${s.excludeSaleItems !== false ? "checked" : ""}> المنتجات التي عليها خصم مسبقاً غير مشمولة</label>
        </section>
        <section class="co-block"><h4>توقيت الرسالة</h4>
          <div class="co-grid">
            <label>ترسل بعد ترك السلة بـ<span class="co-inline"><input name="delayValue" type="number" min="1" step="1" value="${delayValue}" required><select name="delayUnit"><option value="s" ${delayUnit === "s" ? "selected" : ""}>ثانية</option><option value="m" ${delayUnit === "m" ? "selected" : ""}>دقيقة</option><option value="h" ${delayUnit === "h" ? "selected" : ""}>ساعة</option></select></span></label>
            <label>ساعات الإرسال (بتوقيت الكويت) <small>فارغ = أي وقت</small><span class="co-inline"><input name="hourFrom" type="number" min="0" max="23" placeholder="من" value="${esc(hourFrom || "")}"><input name="hourTo" type="number" min="1" max="24" placeholder="إلى" value="${esc(hourTo || "")}"></span></label>
            <label>أقل مدة بين رسالتين لنفس العميل (أيام) <small>0 = بدون حد</small><input name="cooldownDays" type="number" min="0" max="90" step="0.5" value="${+((s.cooldownMs || 0) / (24 * HOUR)).toFixed(2)}"></label>
            <label>لا ترسل لسلة أقدم من (ساعات)<input name="maxAgeHours" type="number" min="1" max="720" step="1" value="${+((s.maxAgeMs || 20 * HOUR) / HOUR).toFixed(2)}"></label>
          </div>
        </section>
        <section class="co-block"><h4>منتجات غير مشمولة بالخصم <small id="coExcludedCount">${excluded.size}</small></h4>
          <p class="co-muted">يُحسب الخصم على باقي منتجات السلة؛ المنتجات المحددة هنا لا يشملها الخصم.</p>
          <input type="search" id="coProductSearch" placeholder="ابحث عن منتج بالاسم أو الرقم" value="${esc(productQuery)}">
          <div class="co-products" id="coProducts">${productsList()}</div>
        </section>
        <p class="co-muted">التعديلات تطبق على الرسائل الجديدة فقط؛ الخصومات المرسلة سابقاً تبقى كما هي (وتقدر تعدلها من «بانتظار الإتمام»).</p>
        <p class="co-error" id="coSettingsError" role="alert"></p>
        <div class="co-submit"><button type="submit" class="primary">حفظ الإعدادات</button></div>
      </form>`;
  }

  async function saveSettings(form) {
    const v = Object.fromEntries(new FormData(form));
    const unit = { s: 1000, m: 60000, h: HOUR }[v.delayUnit] || HOUR;
    const hours = v.hourFrom !== "" || v.hourTo !== "" ? `${Number(v.hourFrom || 0)}-${Number(v.hourTo || 24)}` : "";
    const body = {
      enabled: form.elements.enabled.checked, audience: v.audience, pilotPhones: v.pilotPhones,
      discountType: v.discountType, amount: Number(v.amount), validityMs: Math.round(Number(v.validityHours) * HOUR),
      maxDiscount: Number(v.maxDiscount || 0), minSubtotal: Number(v.minSubtotal || 0), fulfillment: v.fulfillment, catalogType: v.catalogType,
      excludeSaleItems: form.elements.excludeSaleItems.checked, delayMs: Math.round(Number(v.delayValue) * unit), hours,
      cooldownMs: Math.round(Number(v.cooldownDays || 0) * 24 * HOUR), maxAgeMs: Math.round(Number(v.maxAgeHours) * HOUR), excludedProductIds: [...excluded]
    };
    if (body.enabled && body.audience === "all" && data?.settings?.audience !== "all" && !confirm("سيتم تفعيل رسائل السلة المتروكة لكل العملاء. متأكد؟")) return;
    busy = true;
    const button = form.querySelector("[type=submit]"); button.disabled = true;
    try {
      const result = await api("/settings", "PUT", body);
      data.settings = result.settings;
      toast("تم حفظ الإعدادات");
      screen = "home"; render();
    } catch (failure) { form.querySelector("#coSettingsError").textContent = failure.message; }
    finally { busy = false; if (button.isConnected) button.disabled = false; }
  }

  async function act(token, action, body) {
    if (busy) return;
    busy = true;
    try { await api(`/${encodeURIComponent(token)}/${action}`, "POST", body); editing = ""; await load(); toast(action === "delete" ? "تم حذف الخصم" : action === "stop" ? "تم إيقاف الخصم" : "تم حفظ التعديل"); }
    catch (failure) {
      const slot = view.querySelector(`[data-co-form="${token}"] [data-co-error]`);
      if (slot) slot.textContent = failure.message; else toast(failure.message);
    } finally { busy = false; }
  }

  page.addEventListener("click", event => {
    const button = event.target.closest("[data-co]");
    if (!button) return;
    const action = button.dataset.co, token = button.dataset.token;
    if (action === "close") return page.close();
    if (action === "home") { screen = "home"; editing = ""; return render(); }
    if (action === "reload") return load();
    if (action === "pending") { screen = "pending"; editing = ""; render(); return load(); }
    if (action === "settings") { screen = "settings"; excluded = new Set((data?.settings?.excludedProductIds || []).map(String)); productQuery = ""; return render(); }
    if (action === "edit") { editing = token; return render(); }
    if (action === "cancel-edit") { editing = ""; return render(); }
    if (action === "stop" && confirm("إيقاف خصم هذا العميل؟ لن يقدر يستخدمه بعد الآن.")) return act(token, "stop");
    if (action === "delete" && confirm("حذف خصم هذا العميل نهائياً؟ رابط سلته سيتوقف.")) return act(token, "delete");
  });
  page.addEventListener("submit", event => {
    event.preventDefault();
    const form = event.target;
    if (form.id === "coSettings") return saveSettings(form);
    const token = form.dataset.coForm;
    if (token) {
      const v = Object.fromEntries(new FormData(form));
      act(token, "edit", { type: v.type, amount: Number(v.amount), expiresAt: timestamp(v.expiresAt) });
    }
  });
  page.addEventListener("input", event => {
    if (event.target.id === "coProductSearch") { productQuery = event.target.value; view.querySelector("#coProducts").innerHTML = productsList(); }
  });
  page.addEventListener("change", event => {
    const id = event.target.dataset?.coProduct;
    if (!id) return;
    if (event.target.checked) excluded.add(id); else excluded.delete(id);
    view.querySelector("#coExcludedCount").textContent = String(excluded.size);
  });
  page.addEventListener("cancel", event => { if (screen !== "home") { event.preventDefault(); screen = "home"; editing = ""; render(); } });
  page.addEventListener("close", () => { clearInterval(ticker); ticker = 0; });

  menuButton.addEventListener("click", () => {
    screen = "home"; editing = ""; data = null; error = "";
    page.showModal(); render(); load();
  });
})();
