const $ = selector => document.querySelector(selector);
const adminEmails = new Set(["sultan.figsolives@gmail.com", "figsandolives.kw@gmail.com"]);
const services = window.ORDERING_FIREBASE;
let events = [], orders = [], activeDetail = "", detailRows = [];
const KUWAIT_TZ = "Asia/Kuwait";
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const localDay = value => new Date(Number(value || 0)).toLocaleDateString("en-CA", { timeZone: KUWAIT_TZ });
const dateTime = value => new Date(Number(value || 0)).toLocaleString("ar-KW", { dateStyle: "medium", timeStyle: "short", timeZone: KUWAIT_TZ });
const arabicDate = value => new Intl.DateTimeFormat("ar-KW", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: KUWAIT_TZ }).format(new Date(value));
const displayDate = value => String(value || "").split("-").reverse().join("-");
const eventTime = event => Number(event?.createdAt || 0);
const money = value => `${Number(value || 0).toFixed(3)} د.ك`;

function range() { return { start: $("#reportStartDate").value, end: $("#reportEndDate").value }; }
function inRange(value) { const day = localDay(value); const { start, end } = range(); return Boolean(day && (!start || day >= start) && (!end || day <= end)); }
function rangeLabel() { const { start, end } = range(); return start === end ? `تقرير يوم ${displayDate(start)}` : `من ${displayDate(start)} إلى ${displayDate(end)}`; }
function metric(title, value, key, note) { return `<button class="report-card" data-metric="${key}" type="button"><span>${title}</span><strong>${value}</strong><small>${note}</small><b class="metric-arrow">←</b></button>`; }
function grouped(list, key, label) { const map = new Map(); list.forEach(event => { const name = event[key] || "غير محدد"; map.set(name, (map.get(name) || 0) + 1); }); return [...map].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count], index) => `<div class="rank-row"><i>${index + 1}</i><span><b>${escapeHtml(name)}</b><small>${label}</small></span><strong>${count}</strong></div>`).join("") || '<div class="empty">لا توجد بيانات ضمن الفترة المختارة</div>'; }

function visitorRows() {
  const visits = events.filter(event => event.type === "visit").sort((a, b) => eventTime(a) - eventTime(b));
  const firstByVisitor = new Map(); visits.forEach(event => { if (!firstByVisitor.has(event.visitorId)) firstByVisitor.set(event.visitorId, event); });
  const inPeriod = visits.filter(inRange);
  const unique = new Map(); inPeriod.forEach(event => unique.set(event.visitorId, event));
  return [...unique.values()].map(event => ({ ...event, isNew: firstByVisitor.get(event.visitorId) === event, registered: Boolean(event.customerName || event.phone) }));
}

function cartRecords() {
  const cartEvents = events.filter(event => ["cart_created", "cart_updated"].includes(event.type)).sort((a, b) => eventTime(a) - eventTime(b));
  const records = new Map();
  cartEvents.forEach(event => {
    const key = event.visitorId || `event-${eventTime(event)}`;
    const current = records.get(key);
    if (!current || event.type === "cart_created") records.set(key, { visitorId: key, created: event, latest: event });
    else current.latest = event;
  });
  const completed = events.filter(event => event.type === "checkout_complete");
  return [...records.values()].filter(record => inRange(eventTime(record.created))).map(record => {
    const completedEvent = completed.find(event => event.visitorId === record.visitorId && eventTime(event) >= eventTime(record.created));
    const items = Array.isArray(record.latest.cartItems) ? record.latest.cartItems : [];
    return { ...record, items, total: Number(record.latest.cartValue || 0), completed: Boolean(completedEvent), completedEvent };
  }).sort((a, b) => eventTime(b.created) - eventTime(a.created));
}

function renderCartRows(records) {
  $("#remainingCarts").innerHTML = records.length ? records.map(record => {
    const person = record.latest.customerName || record.created.customerName || "زائر غير مسجل";
    const phone = record.latest.phone || record.created.phone || "—";
    const products = record.items.length ? record.items.map(item => `<span><b>${escapeHtml(item.name || "صنف")}</b><small>× ${Number(item.quantity || 0)}</small></span>`).join("") : '<span class="muted-cell">لم تسجل تفاصيل المنتجات لهذه السلة</span>';
    return `<tr><td><b>${escapeHtml(person)}</b></td><td dir="ltr">${escapeHtml(phone)}</td><td>${dateTime(eventTime(record.created))}</td><td><b>${money(record.total)}</b></td><td class="cart-products">${products}</td><td><span class="purchase-status ${record.completed ? "completed" : "pending"}" title="${record.completed ? "تم" : "لم يتم"}">${record.completed ? "✓" : "×"}</span></td></tr>`;
  }).join("") : '<tr><td colspan="6" class="empty-cell">لا توجد سلات منشأة ضمن الفترة المختارة.</td></tr>';
}

function render() {
  const visitors = visitorRows();
  const period = events.filter(inRange);
  const newVisitors = visitors.filter(visitor => visitor.isNew);
  const registered = visitors.filter(visitor => visitor.registered && !visitor.isNew);
  const accounts = period.filter(event => event.type === "account_created");
  const carts = cartRecords();
  const unfinished = carts.filter(record => !record.completed && record.items.length);
  const invoices = orders.filter(order => inRange(order.paidAt || order.createdAt));
  $("#reportRange").textContent = rangeLabel();
  $("#visitorMetrics").innerHTML = [metric("المسجلون مسبقاً", registered.length, "registered", "عرض بيانات العملاء"), metric("الزوار الجدد", newVisitors.length, "new", "أول زيارة مسجلة"), metric("الحسابات الجديدة", accounts.length, "accounts", "عرض بيانات الحسابات")].join("");
  $("#purchaseMetrics").innerHTML = [metric("عدد السلات المنشأة", carts.length, "carts", "سلات الفترة المختارة"), metric("عدد الفواتير", invoices.length, "invoices", "طلبات مدفوعة ومؤكدة"), metric("السلات المتبقية", unfinished.length, "unfinished", "غير مكتملة حتى الآن")].join("");
  renderCartRows(carts);
  $("#topProducts").innerHTML = grouped(period.filter(event => event.type === "product_click"), "productName", "نقرة");
  $("#topCategories").innerHTML = grouped(period.filter(event => event.type === "category_click"), "categoryName", "نقرة");
}

function detailData(key) {
  const visitors = visitorRows(), carts = cartRecords();
  if (key === "registered") return { title: "المسجلون مسبقاً", rows: visitors.filter(item => item.registered && !item.isNew) };
  if (key === "new") return { title: "الزوار الجدد", rows: visitors.filter(item => item.isNew) };
  if (key === "accounts") return { title: "الحسابات الجديدة", rows: events.filter(event => event.type === "account_created" && inRange(event)) };
  if (key === "carts") return { title: "السلات المنشأة", rows: carts.map(record => record.created) };
  if (key === "unfinished") return { title: "السلات المتبقية غير المكتملة", rows: carts.filter(record => !record.completed && record.items.length).map(record => record.latest) };
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
  const products = Array.isArray(row.cartItems || row.items) ? (row.cartItems || row.items).map(item => `<li>${escapeHtml(item.name || item.nameAr || item.nameEn || "صنف")} <b>× ${Number(item.quantity || 0)}</b></li>`).join("") : "";
  $("#detailList").innerHTML = `<section class="person-page"><div><span>رقم الهاتف</span><b dir="ltr">${escapeHtml(row.phone || "لا يوجد")}</b></div><div><span>التاريخ والوقت</span><b>${dateTime(eventTime(row))}</b></div><div><span>رقم الفاتورة</span><b dir="ltr">${escapeHtml(row.orderId || "—")}</b></div>${products ? `<section><h3>المنتجات</h3><ul>${products}</ul></section>` : ""}</section>`;
}

async function downloadReport() {
  const button = $("#downloadReport");
  if (!window.html2canvas || !window.jspdf?.jsPDF) return alert("تعذر تحميل أدوات إنشاء PDF.");
  button.disabled = true; button.textContent = "جارٍ تجهيز PDF…"; document.body.classList.add("exporting");
  try {
    const canvas = await html2canvas($("#reportPrintable"), { scale: 2, backgroundColor: "#f8f3e9", useCORS: true, logging: false });
    const { jsPDF } = window.jspdf; const pdf = new jsPDF("p", "mm", "a4"); const width = 190, page = 277;
    const height = canvas.height * width / canvas.width, image = canvas.toDataURL("image/jpeg", 0.94); let remaining = height, y = 10;
    pdf.addImage(image, "JPEG", 10, y, width, height, undefined, "FAST"); remaining -= page;
    while (remaining > .5) { pdf.addPage(); y = 10 - (height - remaining); pdf.addImage(image, "JPEG", 10, y, width, height, undefined, "FAST"); remaining -= page; }
    const { start, end } = range(); const suffix = start === end ? displayDate(start) : `من ${displayDate(start)} إلى ${displayDate(end)}`;
    pdf.save(`تقرير أداء منصة البيع ${suffix}.pdf`);
  } catch (error) { console.error(error); alert("تعذر إنشاء التقرير. حاول مرة أخرى."); }
  finally { document.body.classList.remove("exporting"); button.disabled = false; button.textContent = "تحميل التقرير PDF"; }
}

const today = localDay(Date.now()); $("#reportStartDate").value = today; $("#reportEndDate").value = today;
$("#reportStartDate").onchange = () => { if ($("#reportEndDate").value < $("#reportStartDate").value) $("#reportEndDate").value = $("#reportStartDate").value; render(); };
$("#reportEndDate").onchange = () => { if ($("#reportStartDate").value > $("#reportEndDate").value) $("#reportStartDate").value = $("#reportEndDate").value; render(); };
$("#visitorMetrics").onclick = event => { const card = event.target.closest("[data-metric]"); if (card) showDetail(card.dataset.metric); };
$("#purchaseMetrics").onclick = event => { const card = event.target.closest("[data-metric]"); if (card) showDetail(card.dataset.metric); };
$("#detailList").onclick = event => { const item = event.target.closest("[data-person]"); if (item) showPerson(item.dataset.person); };
$("#detailBack").onclick = () => showDetail(activeDetail); $("#closeReportDetail").onclick = () => $("#reportDetail").close(); $("#downloadReport").onclick = downloadReport;
$("#adminGoogleLogin").onclick = async () => { try { const provider = new firebase.auth.GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" }); await services.auth.signInWithPopup(provider); } catch (error) { $("#adminAuthMessage").textContent = error.message || "تعذر تسجيل الدخول"; } };
services.auth.onAuthStateChanged(user => { const email = String(user?.email || "").toLowerCase(); if (!user) return; if (!adminEmails.has(email)) { $("#adminAuthMessage").textContent = "هذا الحساب غير مصرح له"; services.auth.signOut(); return; } $("#adminAuthGate").classList.add("hidden"); services.database.ref("orderingPlatform/analyticsEvents").on("value", snapshot => { events = Object.values(snapshot.val() || {}); render(); }, () => { $("#visitorMetrics").innerHTML = '<div class="empty">تعذر تحميل التقارير.</div>'; }); services.database.ref("orderingPlatform/onlineOrders").on("value", snapshot => { orders = Object.values(snapshot.val() || {}); render(); }); });
