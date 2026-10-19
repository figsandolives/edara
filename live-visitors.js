// «الزوار الآن»: متابعة مباشرة لكل زائر في المنصة — وين هو الحين، شنو في سلته، من أي جهاز وتطبيق،
// والصفحات اللي مر عليها وآخر أفعاله. يتحدث كل 5 ثواني والصفحة مفتوحة بس.
// البيانات: /admin/visitor-presence (نبض الزائر كل 30 ثانية ومع كل تنقل) و /admin/analytics-events (الأحداث).
(() => {
  const POLL_MS = 5000;
  const ACTIVE_MS = 90000;
  const IDLE_MS = 5 * 60000;
  const RANGES = [
    { id: "now", label: "يتصفحون الحين", minutes: 2 },
    { id: "30", label: "آخر 30 دقيقة", minutes: 30 },
    { id: "180", label: "آخر 3 ساعات", minutes: 180 }
  ];
  const VIEW_NAMES = { home: "الصفحة الرئيسية", cover: "غلاف", product: "منتج", search: "يبحث", account: "حسابي", checkout: "إتمام الطلب", cart: "السلة" };
  const DEVICE_NAMES = { mobile: "جوال", tablet: "تابلت", desktop: "كمبيوتر" };
  const state = { visitors: [], events: [], lastEventAt: 0, serverOffset: 0, range: "now", open: new Set(), timer: 0, busy: false, error: "", updatedAt: 0, started: false };

  const esc = value => (typeof escapeHtml === "function" ? escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])));
  const now = () => Date.now() + state.serverOffset;
  const money = value => `${Number(value || 0).toFixed(3)} د.ك`;
  const short = id => String(id || "").replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();
  const kuwaitMidnight = () => { const kw = new Date(Date.now() + 3 * 3600000); kw.setUTCHours(0, 0, 0, 0); return kw.getTime() - 3 * 3600000; };
  const ago = time => {
    const seconds = Math.max(0, Math.round((now() - Number(time || 0)) / 1000));
    if (seconds < 10) return "الحين";
    if (seconds < 60) return `قبل ${seconds} ث`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `قبل ${minutes} د`;
    return `قبل ${Math.floor(minutes / 60)} س ${minutes % 60 ? `و${minutes % 60} د` : ""}`.trim();
  };
  const duration = (from, to) => {
    const minutes = Math.max(0, Math.round((Number(to) - Number(from)) / 60000));
    if (minutes < 1) return "أقل من دقيقة";
    if (minutes < 60) return `${minutes} د`;
    return `${Math.floor(minutes / 60)} س ${minutes % 60} د`;
  };
  const clock = time => new Date(Number(time)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kuwait" });
  const itemsCount = count => { const n = Number(count) || 0; return n === 1 ? "صنف واحد" : n === 2 ? "صنفين" : n >= 3 && n <= 10 ? `${n} أصناف` : `${n} صنف`; };
  const status = visitor => { const gap = now() - Number(visitor.lastSeen || 0); return gap <= ACTIVE_MS ? "active" : gap <= IDLE_MS ? "idle" : "left"; };
  const whoOf = item => {
    const name = item?.customer?.name;
    return name ? name : `زائر ${short(item.visitorId)}`;
  };

  function eventText(event) {
    const details = event.details || {};
    const items = Array.isArray(details.cartItems) ? details.cartItems : [];
    const added = items.find(item => String(item.id) === String(details.productId));
    switch (event.type) {
      case "visit": return "فتح الموقع";
      case "product_click": return `فتح «${details.productName || "منتج"}»`;
      case "category_click": return `فتح قسم «${details.categoryName || ""}»`;
      case "cart_created": return `بدأ سلة بـ «${added?.name || "منتج"}»`;
      case "cart_updated": return added ? `عدّل «${added.name}» في السلة (${itemsCount(items.length)}، ${money(details.cartValue)})` : `عدّل السلة (${itemsCount(items.length)}، ${money(details.cartValue)})`;
      case "checkout_complete": return `أكمل الطلب ${details.orderId || ""}`;
      case "account_created": return "سجّل حساب جديد";
      default: return event.type;
    }
  }
  const eventTone = type => type === "checkout_complete" ? "is-order" : type.startsWith("cart") ? "is-cart" : type === "visit" ? "is-visit" : "";

  async function fetchJson(path) {
    const response = await adminRequest(path);
    if (!response.ok) throw new Error(`تعذر جلب البيانات (${response.status})`);
    return response.json();
  }
  async function poll() {
    if (state.busy || !visible()) return;
    state.busy = true;
    try {
      const range = RANGES.find(item => item.id === state.range) || RANGES[0];
      const since = state.lastEventAt ? state.lastEventAt + 1 : Math.min(kuwaitMidnight(), Date.now() - 3 * 3600000);
      const [presence, events] = await Promise.all([
        fetchJson(`/admin/visitor-presence?minutes=${Math.max(range.minutes, 180)}`),
        fetchJson(`/admin/analytics-events?since=${since}`)
      ]);
      if (presence?.now) state.serverOffset = Number(presence.now) - Date.now();
      state.visitors = Array.isArray(presence?.visitors) ? presence.visitors : [];
      if (Array.isArray(events) && events.length) {
        state.events = [...state.events, ...events].slice(-3000);
        state.lastEventAt = Math.max(state.lastEventAt, ...events.map(event => Number(event.createdAt) || 0));
      }
      state.error = "";
      state.updatedAt = Date.now();
    } catch (error) {
      state.error = error.message || "تعذر الاتصال بالخادم";
    } finally {
      state.busy = false;
      render();
    }
  }
  const visible = () => !document.getElementById("liveVisitorsView")?.classList.contains("hidden");
  function start() {
    if (!state.started) {
      state.started = true;
      document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
    }
    clearInterval(state.timer);
    state.timer = setInterval(() => { if (visible() && !document.hidden) poll(); else render(); }, POLL_MS);
    poll();
  }

  function rangeVisitors() {
    const range = RANGES.find(item => item.id === state.range) || RANGES[0];
    const since = now() - range.minutes * 60000;
    return state.visitors.filter(visitor => Number(visitor.lastSeen) >= (range.id === "now" ? now() - ACTIVE_MS : since));
  }
  function visitorEvents(visitorId) { return state.events.filter(event => event.visitorId === visitorId); }
  function lastCart(visitorId) {
    const event = [...visitorEvents(visitorId)].reverse().find(item => item.type?.startsWith("cart") && Array.isArray(item.details?.cartItems));
    return event ? event.details.cartItems : [];
  }

  function visitorRow(visitor) {
    const activity = visitor.activity || {};
    const st = status(visitor);
    const registered = visitor.visitorType === "registered" && visitor.customer?.phone;
    const name = registered ? (visitor.customer.name || "عميل مسجل") : `زائر جديد ${short(visitor.visitorId)}`;
    const phone = registered ? visitor.customer.phone : "";
    const place = activity.view ? `${VIEW_NAMES[activity.view] || ""}${activity.view !== "home" && activity.label && activity.view !== "checkout" ? `: ${activity.label}` : activity.view === "checkout" ? `: ${(activity.label || "").replace(/^إتمام الطلب:\s*/, "")}` : ""}` : "ما وصلت تفاصيل الصفحة بعد";
    const where = activity.view === "product" && activity.coverName ? `<small class="lv-where-sub">داخل غلاف ${esc(activity.coverName)}</small>` : "";
    const device = [DEVICE_NAMES[visitor.device], visitor.os, visitor.app].filter(Boolean);
    const cartCount = Number(activity.cartCount || 0);
    const isOpen = state.open.has(visitor.visitorId);
    const pages = Array.isArray(visitor.pages) ? visitor.pages : [];
    const events = visitorEvents(visitor.visitorId).slice(-12).reverse();
    const cartItems = cartCount ? lastCart(visitor.visitorId) : [];
    const ordered = visitorEvents(visitor.visitorId).some(event => event.type === "checkout_complete" && Number(event.createdAt) >= Number(visitor.firstSeen || 0));
    return `<article class="lv-visitor is-${st}${isOpen ? " is-open" : ""}${activity.view === "checkout" ? " is-checkout" : ""}" data-visitor="${esc(visitor.visitorId)}">
      <button type="button" class="lv-visitor-main" data-lv-toggle="${esc(visitor.visitorId)}" aria-expanded="${isOpen}">
        <span class="lv-dot" title="${st === "active" ? "يتصفح الحين" : st === "idle" ? "ساكت شوي" : "طلع"}"></span>
        <span class="lv-who"><strong>${esc(name)}</strong>${phone ? `<small dir="ltr">${esc(phone)}</small>` : `<small>${registered ? "" : "غير مسجل"}</small>`}</span>
        <span class="lv-where"><b class="lv-view lv-view-${esc(activity.view || "none")}">${esc(place)}</b>${where}</span>
        <span class="lv-cart${cartCount ? " has-items" : ""}">${cartCount ? `<b>${esc(itemsCount(cartCount))}</b> في السلة<small>${money(activity.cartValue)}</small>` : "السلة فاضية"}</span>
        <span class="lv-time"><b>${esc(ago(visitor.lastSeen))}</b><small>صار له ${esc(duration(visitor.firstSeen || visitor.lastSeen, visitor.lastSeen))}</small></span>
      </button>
      <div class="lv-tags">${device.map(item => `<span>${esc(item)}</span>`).join("")}${activity.referrer ? `<span>جاي من ${esc(activity.referrer)}</span>` : ""}${activity.lang === "en" ? "<span>بالإنجليزي</span>" : ""}${ordered ? '<span class="lv-tag-order">طلب بهالزيارة</span>' : ""}${phone ? `<a href="https://wa.me/965${esc(phone.slice(-8))}" target="_blank" rel="noopener">واتساب</a>` : ""}</div>
      ${isOpen ? `<div class="lv-detail">
        <section><h4>الصفحات اللي مر عليها</h4>${pages.length ? `<ol class="lv-trail">${pages.map(page => `<li><time>${esc(clock(page.at))}</time><span>${esc(page.label || page.path)}</span></li>`).join("")}</ol>` : '<p class="lv-muted">تنعرض الصفحات من الحين وطالع.</p>'}</section>
        <section><h4>محتوى السلة</h4>${cartItems.length ? `<ul class="lv-cart-items">${cartItems.map(item => `<li><span>${esc(item.name)}</span><b>× ${esc(item.quantity)}</b><small>${money(item.total)}</small></li>`).join("")}</ul>` : `<p class="lv-muted">${cartCount ? "ما وصلت أصناف السلة بعد." : "ما أضاف شي للسلة."}</p>`}</section>
        <section><h4>آخر أفعاله</h4>${events.length ? `<ul class="lv-events">${events.map(event => `<li class="${eventTone(event.type)}"><time>${esc(clock(event.createdAt))}</time><span>${esc(eventText(event))}</span></li>`).join("")}</ul>` : '<p class="lv-muted">ما في أحداث مسجلة له اليوم.</p>'}</section>
      </div>` : ""}
    </article>`;
  }

  function render() {
    const root = document.getElementById("liveVisitorsBoard");
    if (!root) return;
    const all = state.visitors;
    const active = all.filter(visitor => status(visitor) === "active");
    const withCart = active.filter(visitor => Number(visitor.activity?.cartCount) > 0);
    const inCheckout = active.filter(visitor => visitor.activity?.view === "checkout");
    const cartValue = withCart.reduce((sum, visitor) => sum + Number(visitor.activity?.cartValue || 0), 0);
    const today = kuwaitMidnight();
    const todayEvents = state.events.filter(event => Number(event.createdAt) >= today);
    const ordersToday = new Set(todayEvents.filter(event => event.type === "checkout_complete").map(event => event.details?.orderId || event.createdAt)).size;
    const visitorsToday = new Set(todayEvents.filter(event => event.type === "visit").map(event => event.visitorId)).size;
    const list = rangeVisitors();
    const feed = state.events.slice(-40).reverse();

    root.innerHTML = `
      <div class="lv-pulse">
        <div class="lv-pulse-count"><span class="lv-live-dot" aria-hidden="true"></span><strong>${active.length}</strong><span>${active.length === 1 ? "زائر يتصفح الحين" : "زوار يتصفحون الحين"}</span></div>
        <ol class="lv-funnel" aria-label="مراحل الطلب للزوار الحين">
          <li><b>${active.length}</b><span>يتصفح</span></li>
          <li class="${withCart.length ? "is-hot" : ""}"><b>${withCart.length}</b><span>عنده سلة${withCart.length ? ` (${money(cartValue)})` : ""}</span></li>
          <li class="${inCheckout.length ? "is-hot" : ""}"><b>${inCheckout.length}</b><span>يكمل الطلب</span></li>
          <li class="is-done"><b>${ordersToday}</b><span>طلب اليوم</span></li>
        </ol>
        <p class="lv-today">اليوم: ${visitorsToday} زائر فتح الموقع، و${active.filter(visitor => visitor.visitorType === "registered").length} من اللي يتصفحون الحين مسجلين.</p>
      </div>
      <div class="lv-toolbar">
        <div class="lv-ranges" role="tablist">${RANGES.map(range => `<button type="button" role="tab" aria-selected="${state.range === range.id}" data-lv-range="${range.id}">${range.label}</button>`).join("")}</div>
        <span class="lv-sync${state.error ? " is-error" : ""}">${state.error ? esc(state.error) : state.updatedAt ? `تحدّث ${esc(clock(state.updatedAt))}، كل 5 ثواني` : "يجيب البيانات…"}</span>
      </div>
      <div class="lv-layout">
        <section class="lv-list" aria-label="الزوار">
          ${list.length ? list.map(visitorRow).join("") : `<div class="lv-empty"><strong>${state.range === "now" ? "ما في أحد يتصفح الحين" : "ما في زوار بهالفترة"}</strong><p>${state.range === "now" ? "أول ما يفتح أحد الموقع بيطلع هني خلال ثواني." : "جرّب فترة أطول."}</p></div>`}
        </section>
        <aside class="lv-feed" aria-label="آخر الأحداث">
          <h3>آخر الأحداث</h3>
          ${feed.length ? `<ul>${feed.map(event => `<li class="${eventTone(event.type)}"><time>${esc(clock(event.createdAt))}</time><p><b>${esc(whoOf(event))}</b> ${esc(eventText(event))}</p></li>`).join("")}</ul>` : '<p class="lv-muted">ما في أحداث اليوم.</p>'}
        </aside>
      </div>`;
  }

  document.addEventListener("click", event => {
    const toggle = event.target.closest("[data-lv-toggle]");
    if (toggle) {
      const id = toggle.dataset.lvToggle;
      state.open.has(id) ? state.open.delete(id) : state.open.add(id);
      return render();
    }
    const range = event.target.closest("[data-lv-range]");
    if (range) { state.range = range.dataset.lvRange; render(); }
  });

  window.LiveVisitors = { start, render, poll };
})();
