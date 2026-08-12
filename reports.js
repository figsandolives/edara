const $ = selector => document.querySelector(selector);
const adminEmails = new Set(["sultan.figsolives@gmail.com", "figsandolives.kw@gmail.com"]);
const services = window.ORDERING_FIREBASE;
const KUWAIT_TZ = "Asia/Kuwait";
let events = [], orders = [], catalogById = new Map(), activeDetail = "", detailRows = [];
const selectedCartKeys = new Set();

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const timestamp = value => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const eventTime = event => timestamp(event?.createdAt);
// لا نعتمد صيغة المتصفح المختصرة للتاريخ؛ بعض المتصفحات كانت تُرجع اليوم التالي
// داخل حقل التاريخ، فيظهر التقرير بأصفار رغم وجود بيانات في اليوم الصحيح.
const localDay = value => {
  const safeTime = timestamp(value);
  if (!safeTime) return "";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: KUWAIT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(safeTime));
  const read = type => parts.find(part => part.type === type)?.value || "";
  return `${read("year")}-${read("month")}-${read("day")}`;
};
const dateTime = value => { const safeTime = timestamp(value); return safeTime ? new Date(safeTime).toLocaleString("ar-KW", { dateStyle: "medium", timeStyle: "short", timeZone: KUWAIT_TZ }) : "—"; };
const displayDate = value => String(value || "").split("-").reverse().join("-");
const money = value => `${Number(value || 0).toFixed(3)} د.ك`;
const arabicProductName = product => String(product?.name || product?.nameAr || product?.nameEn || "").trim();

function range() { return { start: $("#reportStartDate").value, end: $("#reportEndDate").value }; }
function inRange(value) { const day = localDay(value); const { start, end } = range(); return Boolean(day && (!start || day >= start) && (!end || day <= end)); }
function rangeLabel() { const { start, end } = range(); return start === end ? `تقرير يوم ${displayDate(start)}` : `من ${displayDate(start)} إلى ${displayDate(end)}`; }
function metric(title, value, key, note) { return `<button class="report-card" data-metric="${key}" type="button"><span>${title}</span><strong>${value}</strong><small>${note}</small><b class="metric-arrow">←</b></button>`; }
function grouped(list, key, label) { const map = new Map(); list.forEach(event => { const name = event[key] || "غير محدد"; map.set(name, (map.get(name) || 0) + 1); }); return [...map].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count], index) => `<div class="rank-row"><i>${index + 1}</i><span><b>${escapeHtml(name)}</b><small>${label}</small></span><strong>${count}</strong></div>`).join("") || '<div class="empty">لا توجد بيانات ضمن الفترة المختارة</div>'; }

function visitorRows() {
  // الزائر يُحسب مرة واحدة خلال الفترة من أي نشاط (زيارة، سلة، أو إتمام طلب).
  // بعض الزيارات القديمة لم تسجل حدث visit لكن سجلت السلة، لذلك لا نعتمد visit وحده.
  const activity = events.filter(event => event.visitorId && eventTime(event)).sort((a, b) => eventTime(a) - eventTime(b));
  const firstByVisitor = new Map(); activity.forEach(event => { if (!firstByVisitor.has(event.visitorId)) firstByVisitor.set(event.visitorId, event); });
  const unique = new Map(); activity.filter(inRange).forEach(event => unique.set(event.visitorId, event));
  return [...unique.values()].map(event => ({ ...event, isNew: firstByVisitor.get(event.visitorId) === event, registered: Boolean(event.customerName || event.phone) }));
}

function readableCartItems(items) {
  if (!Array.isArray(items) || !items.length || !catalogById.size) return null;
  const normalized = items.map(item => {
    const product = catalogById.get(String(item?.id || ""));
    const quantity = Math.max(0, Number(item?.quantity || 0));
    if (!product || !quantity) return null;
    return { id: String(item.id), name: arabicProductName(product), quantity, total: Math.max(0, Number(item?.total || 0)) };
  });
  return normalized.every(Boolean) ? normalized : null;
}

function cartRecords() {
  const cartEvents = events.filter(event => ["cart_created", "cart_updated"].includes(event.type)).sort((a, b) => eventTime(a) - eventTime(b));
  const records = new Map();
  cartEvents.forEach(event => {
    const key = event.visitorId || `event-${eventTime(event)}`;
    const current = records.get(key);
    if (!current || event.type === "cart_created") records.set(key, { key, visitorId: key, created: event, latest: event });
    else current.latest = event;
  });
  const completed = events.filter(event => event.type === "checkout_complete");
  return [...records.values()].map(record => {
    const completedEvent = completed.find(event => event.visitorId === record.visitorId && eventTime(event) >= eventTime(record.created));
    const items = readableCartItems(record.latest.cartItems);
    const total = Number(record.latest.cartValue || 0) || (items || []).reduce((sum, item) => sum + item.total, 0);
    return { ...record, items, total, completed: Boolean(completedEvent), completedEvent };
  }).filter(record => record.items && (inRange(eventTime(record.created)) || inRange(eventTime(record.latest))))
    .sort((a, b) => eventTime(b.latest) - eventTime(a.latest));
}

function filteredCarts() {
  const filter = $("#cartStatusFilter").value;
  return cartRecords().filter(record => filter === "all" || (filter === "completed" ? record.completed : !record.completed));
}

function cartKey(record) { return `${record.visitorId}:${eventTime(record.created)}`; }
function productList(items) { return items.map(item => `<span><b>${escapeHtml(item.name)}</b><small>× ${Number(item.quantity)}</small></span>`).join(""); }

function renderCartRows(records) {
  const available = new Set(records.map(cartKey));
  [...selectedCartKeys].forEach(key => { if (!available.has(key)) selectedCartKeys.delete(key); });
  $("#remainingCarts").innerHTML = records.length ? records.map(record => {
    const key = cartKey(record), person = record.latest.customerName || record.created.customerName || "زائر غير مسجل";
    const phone = record.latest.phone || record.created.phone || "—";
    return `<tr><td><input class="cart-select" data-cart-key="${escapeHtml(key)}" type="checkbox" ${selectedCartKeys.has(key) ? "checked" : ""} aria-label="اختيار السلة"></td><td><b>${escapeHtml(person)}</b></td><td dir="ltr">${escapeHtml(phone)}</td><td><small class="date-stack"><b>الإنشاء:</b> ${dateTime(eventTime(record.created))}<br><b>آخر حركة:</b> ${dateTime(eventTime(record.latest))}</small></td><td><b>${money(record.total)}</b></td><td class="cart-products">${productList(record.items)}</td><td><span class="purchase-status ${record.completed ? "completed" : "pending"}" title="${record.completed ? "تم الشراء" : "لم يتم الشراء"}">${record.completed ? "✓" : "×"}</span></td></tr>`;
  }).join("") : '<tr><td colspan="7" class="empty-cell">لا توجد سلات قابلة للقراءة ضمن الفترة والفلاتر المحددة.</td></tr>';
  const selectAll = $("#selectAllCarts");
  selectAll.checked = Boolean(records.length) && records.every(record => selectedCartKeys.has(cartKey(record)));
  selectAll.indeterminate = records.some(record => selectedCartKeys.has(cartKey(record))) && !selectAll.checked;
  $("#selectedCartCount").textContent = `${selectedCartKeys.size} محدد`;
}

function render() {
  const visitors = visitorRows(), period = events.filter(inRange), carts = cartRecords(), displayed = filteredCarts();
  const newVisitors = visitors.filter(visitor => visitor.isNew), registered = visitors.filter(visitor => visitor.registered);
  const accounts = period.filter(event => event.type === "account_created");
  const invoices = orders.filter(order => inRange(order.paidAt || order.createdAt));
  const unfinished = carts.filter(record => !record.completed);
  $("#reportRange").textContent = rangeLabel();
  $("#visitorMetrics").innerHTML = [metric("إجمالي زوار الفترة", visitors.length, "allVisitors", "كل من دخل أو نفذ نشاطاً خلال الفترة"), metric("الزوار الجدد", newVisitors.length, "new", "أول نشاط مسجل لهم"), metric("العملاء المسجلون", registered.length, "registered", "لديهم اسم أو رقم هاتف")].join("");
  $("#purchaseMetrics").innerHTML = [metric("عدد السلات المنشأة", carts.length, "carts", "سلات قابلة للقراءة"), metric("عدد الفواتير", invoices.length, "invoices", "طلبات مدفوعة ومؤكدة"), metric("السلات المتبقية", unfinished.length, "unfinished", "غير مكتملة حتى الآن")].join("");
  renderCartRows(displayed);
  $("#topProducts").innerHTML = grouped(period.filter(event => event.type === "product_click"), "productName", "نقرة");
  $("#topCategories").innerHTML = grouped(period.filter(event => event.type === "category_click"), "categoryName", "نقرة");
}

function detailData(key) {
  const visitors = visitorRows(), carts = cartRecords();
  if (key === "allVisitors") return { title: "إجمالي زوار الفترة", rows: visitors };
  if (key === "registered") return { title: "العملاء المسجلون", rows: visitors.filter(item => item.registered) };
  if (key === "new") return { title: "الزوار الجدد", rows: visitors.filter(item => item.isNew) };
  if (key === "accounts") return { title: "الحسابات الجديدة", rows: events.filter(event => event.type === "account_created" && inRange(event)) };
  if (key === "carts") return { title: "السلات المنشأة", rows: carts.map(record => record.latest) };
  if (key === "unfinished") return { title: "السلات المتبقية غير المكتملة", rows: carts.filter(record => !record.completed).map(record => record.latest) };
  return { title: "الفواتير", rows: orders.filter(order => inRange(order.paidAt || order.createdAt)).map(order => ({ customerName: order.customerName, phone: order.phone, orderId: order.orderId, createdAt: order.paidAt || order.createdAt, items: order.items, total: order.total })) };
}

function showDetail(key) {
  const data = detailData(key); activeDetail = key; detailRows = data.rows;
  $("#detailBack").classList.add("hidden"); $("#detailTitle").textContent = data.title; $("#detailSubtitle").textContent = rangeLabel();
  $("#detailList").innerHTML = data.rows.length ? data.rows.map((row, index) => `<button class="detail-event" data-person="${index}" type="button"><span class="detail-avatar">${escapeHtml((row.customerName || "ز").charAt(0))}</span><span><b>${escapeHtml(row.customerName || "زائر غير مسجل")}</b><small dir="ltr">${escapeHtml(row.phone || "لا يوجد رقم هاتف")}</small><small>${dateTime(eventTime(row))}</small></span><strong>${escapeHtml(row.orderId || "عرض البيانات")} ←</strong></button>`).join("") : '<div class="empty">لا توجد بيانات ضمن الفترة المختارة.</div>';
  $("#reportDetail").showModal();
}

function showPerson(index) {
  const row = detailRows[Number(index)]; if (!row) return;
  $("#detailBack").classList.remove("hidden"); $("#detailTitle").textContent = row.customerName || "زائر غير مسجل"; $("#detailSubtitle").textContent = "بيانات الزيارة / السلة";
  const sourceItems = Array.isArray(row.cartItems || row.items) ? (row.cartItems || row.items) : [];
  const products = sourceItems.map(item => `<li>${escapeHtml(arabicProductName(catalogById.get(String(item.id))) || "صنف") } <b>× ${Number(item.quantity || 0)}</b></li>`).join("");
  $("#detailList").innerHTML = `<section class="person-page"><div><span>رقم الهاتف</span><b dir="ltr">${escapeHtml(row.phone || "لا يوجد")}</b></div><div><span>التاريخ والوقت</span><b>${dateTime(eventTime(row))}</b></div><div><span>رقم الفاتورة</span><b dir="ltr">${escapeHtml(row.orderId || "—")}</b></div>${products ? `<section><h3>المنتجات</h3><ul>${products}</ul></section>` : ""}</section>`;
}

function cartReportHtml(records) {
  const rows = records.map((record, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(record.latest.customerName || record.created.customerName || "زائر غير مسجل")}</td><td dir="ltr">${escapeHtml(record.latest.phone || record.created.phone || "—")}</td><td>${dateTime(eventTime(record.created))}</td><td>${dateTime(eventTime(record.latest))}</td><td>${escapeHtml(record.items.map(item => `${item.name} × ${item.quantity}`).join("، "))}</td><td>${money(record.total)}</td><td>${record.completed ? "تم الشراء" : "لم يتم الشراء"}</td></tr>`).join("");
  return `<section class="cart-pdf" dir="rtl"><header><span style="display:grid;place-items:center;width:72px;height:72px;border-radius:18px;background:#173d2d;color:#fff;font-size:38px;font-weight:900">ز</span><div><small>مخبز التين والزيتون</small><h1>تقرير السلات</h1><p>${escapeHtml(rangeLabel())}</p></div></header><div class="cart-pdf-summary"><span>عدد السلات: <b>${records.length}</b></span><span>إجمالي القيمة: <b>${money(records.reduce((sum, record) => sum + record.total, 0))}</b></span><span>تاريخ التقرير: <b>${dateTime(Date.now())}</b></span></div><table><thead><tr><th>#</th><th>العميل</th><th>الهاتف</th><th>وقت الإنشاء</th><th>آخر حركة</th><th>المنتجات</th><th>القيمة</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table><footer>هذا التقرير يعرض فقط السلات ذات المنتجات المقروءة في النظام.</footer></section>`;
}

async function downloadCartReport() {
  const records = filteredCarts().filter(record => selectedCartKeys.has(cartKey(record)));
  if (!records.length) return alert("اختر عميلًا واحدًا على الأقل لتحميل تقرير السلات.");
  const button = $("#downloadCartReport");
  if (!window.html2canvas || !window.jspdf?.jsPDF) return alert("تعذر تحميل أدوات إنشاء PDF.");
  button.disabled = true; button.textContent = "جارٍ تجهيز التقرير…";
  const host = document.createElement("div"); host.className = "cart-pdf-host"; host.innerHTML = cartReportHtml(records); document.body.append(host);
  try {
    const canvas = await html2canvas(host.firstElementChild, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
    const { jsPDF } = window.jspdf, pdf = new jsPDF("l", "mm", "a4"); const width = 277, page = 190;
    const height = canvas.height * width / canvas.width, image = canvas.toDataURL("image/jpeg", 0.96); let remaining = height, y = 10;
    pdf.addImage(image, "JPEG", 10, y, width, height, undefined, "FAST"); remaining -= page;
    while (remaining > .5) { pdf.addPage(); y = 10 - (height - remaining); pdf.addImage(image, "JPEG", 10, y, width, height, undefined, "FAST"); remaining -= page; }
    pdf.save(`تقرير السلات ${displayDate(range().start)}.pdf`);
  } catch (error) { console.error(error); alert("تعذر إنشاء التقرير. حاول مرة أخرى."); }
  finally { host.remove(); button.disabled = false; button.textContent = "تحميل تقرير السلات المحددة"; }
}

const today = localDay(Date.now()); $("#reportStartDate").value = today; $("#reportEndDate").value = today;
$("#reportStartDate").onchange = () => { if ($("#reportEndDate").value < $("#reportStartDate").value) $("#reportEndDate").value = $("#reportStartDate").value; render(); };
$("#reportEndDate").onchange = () => { if ($("#reportStartDate").value > $("#reportEndDate").value) $("#reportStartDate").value = $("#reportEndDate").value; render(); };
$("#cartStatusFilter").onchange = render;
$("#remainingCarts").onchange = event => { const checkbox = event.target.closest("[data-cart-key]"); if (!checkbox) return; checkbox.checked ? selectedCartKeys.add(checkbox.dataset.cartKey) : selectedCartKeys.delete(checkbox.dataset.cartKey); renderCartRows(filteredCarts()); };
$("#selectAllCarts").onchange = event => { filteredCarts().forEach(record => event.target.checked ? selectedCartKeys.add(cartKey(record)) : selectedCartKeys.delete(cartKey(record))); renderCartRows(filteredCarts()); };
$("#visitorMetrics").onclick = event => { const card = event.target.closest("[data-metric]"); if (card) showDetail(card.dataset.metric); };
$("#purchaseMetrics").onclick = event => { const card = event.target.closest("[data-metric]"); if (card) showDetail(card.dataset.metric); };
$("#detailList").onclick = event => { const item = event.target.closest("[data-person]"); if (item) showPerson(item.dataset.person); };
$("#detailBack").onclick = () => showDetail(activeDetail); $("#closeReportDetail").onclick = () => $("#reportDetail").close(); $("#downloadCartReport").onclick = downloadCartReport;
$("#adminGoogleLogin").onclick = async () => { try { const provider = new firebase.auth.GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" }); await services.auth.signInWithPopup(provider); } catch (error) { $("#adminAuthMessage").textContent = error.message || "تعذر تسجيل الدخول"; } };
services.auth.onAuthStateChanged(user => { const email = String(user?.email || "").toLowerCase(); if (!user) return; if (!adminEmails.has(email)) { $("#adminAuthMessage").textContent = "هذا الحساب غير مصرح له"; services.auth.signOut(); return; } $("#adminAuthGate").classList.add("hidden"); services.database.ref("orderingPlatform/catalog/products").on("value", snapshot => { catalogById = new Map((snapshot.val() || []).filter(Boolean).map(product => [String(product.id), product])); render(); }); services.database.ref("orderingPlatform/analyticsEvents").on("value", snapshot => { events = Object.values(snapshot.val() || {}); render(); }, () => { $("#visitorMetrics").innerHTML = '<div class="empty">تعذر تحميل التقارير.</div>'; }); services.database.ref("orderingPlatform/onlineOrders").on("value", snapshot => { orders = Object.values(snapshot.val() || {}); render(); }); });
