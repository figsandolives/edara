const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const DRAFT_KEY = "figsOlivesStoreAdminDraftV2";
const DB_NAME = "figsOlivesStoreAssets";
const DB_STORE = "assets";
const ADMIN_EMAILS = new Set(["sultan.figsolives@gmail.com", "figsandolives.kw@gmail.com"]);
const firebaseServices = window.ORDERING_FIREBASE;
const DEFAULT_APPEARANCE = Object.freeze({
  heroImage: "",
  heroPositionX: 50,
  heroPositionY: 50,
  heroTextColor: "#18352a",
  badgeBackgroundColor: "#ffffff",
  badgeTextColor: "#18352a",
  heroTitle: "أكل صحي بطعم\nيستحق التكرار",
  heroBadges: ["مكونات طبيعية", "تحضير يومي", "دفع آمن"]
});

let categories = [];
let headings = [];
let restaurantEnabled = true;
let products = [];
let deliveryAreas = [];
let appearance = { ...DEFAULT_APPEARANCE };
let catalogAppearances = { bakery: normalizeAppearance(), restaurant: normalizeAppearance() };
let siteCategories = [];
let siteProducts = [];
let customers = [];
let editingImages = [];
let pendingImageDeletes = new Set();
let openCategories = new Set();
let openHeadings = new Set();
let openSubheadings = new Set();
let selectedUnassignedProducts = new Set();
let dragState = null;
let editingHeadingId = "";
let editingSubheadings = [];
let toastTimer;
let syncTimer;
let currentAdmin = null;
let catalogRef = null;
let customersRef = null;
let visitorPresenceRef = null;
let visitorPresence = [];
let availabilityNotifications = {};
let advertisement = { enabled: false, image: "", size: "square", targetType: "product", productId: "", link: "" };
let availabilityNotificationsRef = null;
let assignTargetCategoryId = "";
let pendingDeleteCategoryId = "";
let currentView = "catalog";
let ignoreRemoteUntil = 0;
let productSearch = "";
let activeCatalogType = "bakery";
let toastPreparationMigrationComplete = false;
let breadSizeOptionsMigrationComplete = false;
const assetUrls = new Map();

function normalizeDeliveryAreas(value) {
  const source = Array.isArray(value) ? value : [];
  return source.map((area, index) => {
    const nameAr = clean(area.nameAr || area.name);
    const nameEn = clean(area.nameEn || area.nameEnglish || area.name) || nameAr;
    return {
      id: clean(area.id) || `area-${Date.now()}-${index}`,
      nameAr,
      nameEn,
      name: nameAr,
      price: Math.max(0, Number(area.price) || 0),
      order: Number(area.order) || index + 1
    };
  }).filter(area => area.nameAr).sort((a, b) => a.order - b.order)
    .map((area, index) => ({ ...area, order: index + 1 }));
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2200);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clean(value) {
  return String(value || "").trim();
}

function catalogTypeOf(entry) {
  return entry?.catalogType === "restaurant" ? "restaurant" : "bakery";
}

function scopedCategories() {
  return categories.filter(category => catalogTypeOf(category) === activeCatalogType);
}

function normalizeEnglishDigits(value) {
  return String(value ?? "").replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/\D/g, "");
}

function normalizePreparation(value) {
  const first = Math.max(1, Math.min(999, Number(normalizeEnglishDigits(value?.first)) || 2));
  const unit = value?.unit === "day" ? "day" : "hour";
  const hasSecond = value?.hasSecond === true && Number(normalizeEnglishDigits(value?.second)) > 0;
  return { first, unit, hasSecond, second: hasSecond ? Math.min(999, Number(normalizeEnglishDigits(value.second))) : null, secondUnit: value?.secondUnit === "day" ? "day" : unit };
}

function isToastProduct(product) {
  const category = categories.find(item => item.id === product.category);
  return [product.category, category?.nameAr, category?.nameEn, product.name, product.nameEn]
    .filter(Boolean).join(" ").toLocaleLowerCase().includes("toast") || String(product.name || "").includes("توست");
}

function setToastPreparation() {
  products.filter(isToastProduct).forEach(product => {
    product.preparation = { first: 1, unit: "day", hasSecond: true, second: 2, secondUnit: "day" };
  });
}

function setBreadSizeOptions() {
  const targets = ["خبز القمح الكامل السادة", "خبز الشعير الكامل السادة", "خبز الشوفان بحبة البركة", "خبز الشوفان الكامل السادة", "خبز التين والزيتون", "خبز الكركم", "خبز الشمندر", "خبز الخضار", "خبز الحبوب العشرة"];
  const sizes = [
    { id: "regular", nameAr: "الحجم العادي (٣ حبات)", nameEn: "Regular size (3 pieces)", price: 1, preparation: { first: 2, unit: "hour" } },
    { id: "small", nameAr: "الحجم الصغير (١٢ حبة)", nameEn: "Small size (12 pieces)", price: 4, preparation: { first: 1, unit: "day" } },
    { id: "mini", nameAr: "الحجم الميني (١٢ حبة)", nameEn: "Mini size (12 pieces)", price: 3, preparation: { first: 1, unit: "day" } },
    { id: "bite", nameAr: "حجم اللقمة (١٢ حبة)", nameEn: "Bite size (12 pieces)", price: 2, preparation: { first: 1, unit: "day" } }
  ];
  products.filter(product => targets.some(name => product.name.includes(name))).forEach(product => {
    product.name = product.name.replace(/\s*\(?\s*[٣3]\s*(?:حبات|حبة|خبزات)\s*\)?/g, "").replace(/\s*-\s*$/g, "").trim();
    product.nameEn = product.nameEn.replace(/\s*\(?\s*3\s*(?:pieces|pcs)\s*\)?/ig, "").replace(/\s*-\s*$/g, "").trim();
    product.price = 0;
    product.options = { enabled: true, required: true, multiple: false, priceBased: true, items: sizes.map(size => ({ ...size, preparation: normalizePreparation(size.preparation) })) };
  });
}

function normalizeProductOptions(value) {
  if (!value || typeof value !== "object") return null;
  // Selection flows have their own multi-step schema.  They must survive
  // catalog saves even though they intentionally do not use `options.items`.
  if (value.selectionFlow?.enabled === true && Array.isArray(value.selectionFlow.steps)) {
    return { enabled: true, selectionFlow: clone(value.selectionFlow) };
  }
  const nestedEnabled = value.nestedEnabled === true;
  const priceBased = value.priceBased === true || nestedEnabled;
  const items = (Array.isArray(value.items) ? value.items : []).map((item, index) => ({
    id: clean(item.id) || `option-${index + 1}`,
    nameAr: clean(item.nameAr || item.name),
    nameEn: clean(item.nameEn || item.nameAr || item.name),
    price: priceBased ? Math.max(0, Number(item.price) || 0) : 0,
    preparation: item.preparation ? normalizePreparation(item.preparation) : null,
    image: clean(item.image),
    minimumOrder: value.minimumPerOptionEnabled === true ? normalizeMinimumOrder(item.minimumOrder) : null,
    subOptions: (Array.isArray(item.subOptions) ? item.subOptions : []).map((subOption, subIndex) => ({
      id: clean(subOption.id) || `sub-option-${index + 1}-${subIndex + 1}`,
      nameAr: clean(subOption.nameAr || subOption.name),
      nameEn: clean(subOption.nameEn || subOption.nameAr || subOption.name),
      price: Math.max(0, Number(subOption.price) || 0)
    })).filter(subOption => subOption.nameAr && subOption.nameEn)
  })).filter(item => item.nameAr && item.nameEn);
  const multiple = nestedEnabled ? false : value.multiple === true;
  return value.enabled !== false && items.length ? { enabled: true, required: nestedEnabled || value.required === true, multiple, maxSelections: multiple ? Math.max(1, Number(value.maxSelections) || items.length) : 1, titleAr: clean(value.titleAr), titleEn: clean(value.titleEn), priceBased, preparationEnabled: value.preparationEnabled === true, imagesEnabled: value.imagesEnabled === true, nestedEnabled, minimumPerOptionEnabled: value.minimumPerOptionEnabled === true, optionQuantityEnabled: value.optionQuantityEnabled === true, items } : null;
}

const minimumOrderUnits = new Set(["dozen", "piece", "bowl", "bag", "kilo", "bottle"]);
function normalizeMinimumOrder(value) {
  if (!value || value.enabled === false) return null;
  const quantity = Math.max(1, Math.min(99, Math.floor(Number(value.quantity) || 1)));
  const unit = minimumOrderUnits.has(value.unit) ? value.unit : "piece";
  return { enabled: true, quantity, unit };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

function validHexColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : fallback;
}

function validPercent(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;
}

function validAppearanceText(value, fallback, maxLength) {
  const text = String(value ?? "").trim().slice(0, maxLength);
  return text || fallback;
}

function normalizeAppearance(value = {}) {
  let heroImage = "";
  try {
    const candidate = new URL(String(value.heroImage || ""));
    if (candidate.protocol === "https:") heroImage = candidate.href;
  } catch {
    heroImage = "";
  }
  return {
    heroImage,
    heroPositionX: validPercent(value.heroPositionX, DEFAULT_APPEARANCE.heroPositionX),
    heroPositionY: validPercent(value.heroPositionY, DEFAULT_APPEARANCE.heroPositionY),
    heroTextColor: validHexColor(value.heroTextColor, DEFAULT_APPEARANCE.heroTextColor),
    badgeBackgroundColor: validHexColor(value.badgeBackgroundColor, DEFAULT_APPEARANCE.badgeBackgroundColor),
    badgeTextColor: validHexColor(value.badgeTextColor, DEFAULT_APPEARANCE.badgeTextColor),
    heroTitle: validAppearanceText(value.heroTitle, DEFAULT_APPEARANCE.heroTitle, 120),
    heroBadges: DEFAULT_APPEARANCE.heroBadges.map((fallback, index) => validAppearanceText(value.heroBadges?.[index], fallback, 45))
  };
}

function normalizeCatalogAppearances(value = {}) {
  const catalogs = value?.catalogs;
  if (catalogs && typeof catalogs === "object") {
    return { bakery: normalizeAppearance(catalogs.bakery), restaurant: normalizeAppearance(catalogs.restaurant) };
  }
  // Existing shared settings become the starting point for both catalogues.
  const legacy = normalizeAppearance(value);
  return { bakery: { ...legacy, heroBadges: [...legacy.heroBadges] }, restaurant: { ...legacy, heroBadges: [...legacy.heroBadges] } };
}

function catalogAppearancePayload() {
  return {
    catalogs: {
      bakery: normalizeAppearance(catalogAppearances.bakery),
      restaurant: normalizeAppearance(catalogAppearances.restaurant)
    }
  };
}

function normalizeAdvertisement(value = {}) {
  const targetType = value.targetType === "link" ? "link" : "product";
  return { enabled: value.enabled === true, image: clean(value.image), size: ["square", "portrait", "landscape"].includes(value.size) ? value.size : "square", targetType, productId: clean(value.productId), link: clean(value.link) };
}

// إيقاف الإعلان إجراء فوري؛ لا ننتظر زر الحفظ كي لا يعود الإعلان عند تحديث الصفحة.
async function disableAdvertisementImmediately() {
  advertisement = { ...normalizeAdvertisement(advertisement), enabled: false };
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ categories, headings, products, deliveryAreas, appearance: catalogAppearancePayload(), advertisement, savedAt: new Date().toISOString() }));
  clearTimeout(syncTimer);
  ignoreRemoteUntil = Date.now() + 1200;
  if (!catalogRef || !currentAdmin) return markDirty("جارٍ حفظ إيقاف الإعلان…");
  $("#saveState").textContent = "جارٍ إيقاف الإعلان…";
  setCloudStatus("جارٍ الحفظ…");
  try {
    await catalogRef.update({
      advertisement: normalizeAdvertisement(advertisement),
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
      updatedBy: currentAdmin.email || currentAdmin.uid
    });
    $("#saveState").textContent = "تم إيقاف الإعلان وحفظه";
    setCloudStatus("متصل ومحفوظ", "connected");
  } catch (error) {
    $("#saveState").textContent = "تعذر حفظ إيقاف الإعلان";
    setCloudStatus("فشل الحفظ", "error");
    toast(error.message || "تعذر حفظ إيقاف الإعلان");
  }
}

function setCloudStatus(message, type = "") {
  const status = $("#cloudStatus");
  if (!status) return;
  status.classList.toggle("connected", type === "connected");
  status.classList.toggle("error", type === "error");
  const label = $("span", status);
  if (label) label.textContent = message;
}

function normalizeData() {
  categories = categories
    .map((category, index) => ({
      id: clean(category.id) || `category-${Date.now()}-${index}`,
      nameAr: clean(category.nameAr || category.name) || "قسم جديد",
      nameEn: clean(category.nameEn || category.id) || "New category",
      catalogType: catalogTypeOf(category),
      active: category.active !== false,
      sectionImage: clean(category.sectionImage),
      order: Number(category.order) || index + 1
    }))
    .sort((a, b) => Number(a.order) - Number(b.order))
    .map((category, index) => ({ ...category, order: index + 1 }));

  products = products.map((product, index) => {
    const images = (Array.isArray(product.images) ? product.images : [product.image]).filter(Boolean);
    return {
      ...product,
      id: String(product.id || `P${Date.now()}${index}`),
      name: clean(product.name),
      nameEn: clean(product.nameEn),
      badgeAr: clean(product.badgeAr),
      badgeEn: clean(product.badgeEn),
      description: clean(product.description),
      descriptionEn: clean(product.descriptionEn),
      category: clean(product.category),
      catalogType: catalogTypeOf(product),
      active: product.active !== false,
      availability: { status: ["sold_out", "unavailable"].includes(product.availability?.status) ? product.availability.status : "available", cycleId: String(product.availability?.cycleId || "") },
      price: Number(product.price) || 0,
      originalPrice: Number(product.originalPrice) > 0 ? Number(product.originalPrice) : 0,
      inventory: { enabled: product.inventory?.enabled === true, quantity: Math.max(0, Math.floor(Number(product.inventory?.quantity) || 0)) },
      images,
      image: images[0] || "",
      options: normalizeProductOptions(product.options),
      preparation: normalizePreparation(product.preparation),
      order: Number(product.order) || index + 1
    };
  });
  categories.forEach((category) => normalizeProductOrder(category.id));
  normalizeProductOrder("");
}

function normalizeProductOrder(categoryId) {
  products
    .filter((product) => product.category === categoryId)
    .sort((a, b) => Number(a.order) - Number(b.order))
    .forEach((product, index) => {
      product.order = index + 1;
    });
}

async function fetchFirst(paths) {
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (response.ok) return await response.json();
    } catch {
      // Try the next path. This supports both the workspace and GitHub layouts.
    }
  }
  throw new Error("تعذر تحميل ملف البيانات");
}

function openAssetDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putAsset(path, blob) {
  const database = await openAssetDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(DB_STORE, "readwrite");
    transaction.objectStore(DB_STORE).put(blob, path);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function getAsset(path) {
  const database = await openAssetDatabase();
  const result = await new Promise((resolve, reject) => {
    const request = database.transaction(DB_STORE).objectStore(DB_STORE).get(path);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return result;
}

async function clearAssets() {
  const database = await openAssetDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(DB_STORE, "readwrite");
    transaction.objectStore(DB_STORE).clear();
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function resolveAsset(path) {
  if (!path?.startsWith("product-images/")) return path || "";
  if (assetUrls.has(path)) return assetUrls.get(path);
  const blob = await getAsset(path).catch(() => null);
  if (!blob) return path;
  const url = URL.createObjectURL(blob);
  assetUrls.set(path, url);
  return url;
}

async function loadFallbackData() {
  const [productsData, categoriesData, areasData] = await Promise.all([
    fetchFirst(["../products.json", "../منصة الطلبات/products.json", "products.json"]),
    fetchFirst(["../categories.json", "../منصة الطلبات/categories.json", "categories.json"]),
    fetchFirst(["../منصة الطلبات/delivery-areas.json", "delivery-areas.json"])
  ]);
  siteProducts = productsData;
  siteCategories = categoriesData;
  deliveryAreas = normalizeDeliveryAreas(areasData);
}

function applyRemoteCatalog(catalog) {
  products = Array.isArray(catalog?.products) ? catalog.products : [];
  categories = Array.isArray(catalog?.categories) ? catalog.categories : [];
  headings = Array.isArray(catalog?.headings) ? catalog.headings : [];
  restaurantEnabled = catalog?.restaurantEnabled !== false;
  $("#restaurantEnabled").checked = restaurantEnabled;
  $("#restaurantEnabledLabel").textContent = restaurantEnabled ? "مفعّل" : "مغلق";
  deliveryAreas = normalizeDeliveryAreas(catalog?.deliveryAreas);
  catalogAppearances = normalizeCatalogAppearances(catalog?.appearance);
  advertisement = normalizeAdvertisement(catalog?.advertisement);
  appearance = catalogAppearances[activeCatalogType];
  siteProducts = clone(products);
  siteCategories = clone(categories);
  normalizeData();
  render();
  renderDeliveryAreas();
  renderAppearanceSettings();
}

async function loadData() {
  if (!firebaseServices || !currentAdmin) throw new Error("تعذر الاتصال بـ Firebase");
  catalogRef = firebaseServices.database.ref("orderingPlatform/catalog");
  const snapshot = await catalogRef.once("value");
  if (snapshot.exists()) {
    const remoteCatalog = snapshot.val();
    applyRemoteCatalog(remoteCatalog);
    toastPreparationMigrationComplete = remoteCatalog.toastPreparationMigrationV1 === true;
    if (!toastPreparationMigrationComplete) {
      setToastPreparation();
      toastPreparationMigrationComplete = true;
      render();
      await saveToFirebase();
    }
    breadSizeOptionsMigrationComplete = remoteCatalog.breadSizeOptionsMigrationV1 === true;
    if (!breadSizeOptionsMigrationComplete) {
      setBreadSizeOptions();
      breadSizeOptionsMigrationComplete = true;
      render();
      await saveToFirebase();
    }
    if ((remoteCatalog.products || []).some(product => !product.preparation)) {
      await saveToFirebase();
    }
    if (!Array.isArray(remoteCatalog.deliveryAreas)) {
      deliveryAreas = normalizeDeliveryAreas(await fetchFirst(["../منصة الطلبات/delivery-areas.json", "delivery-areas.json"]));
      await saveToFirebase();
    }
    $("#saveState").textContent = "تم تحميل آخر نسخة من Firebase";
  } else {
    await loadFallbackData();
    products = clone(siteProducts);
    categories = clone(siteCategories);
    deliveryAreas = normalizeDeliveryAreas(deliveryAreas);
    catalogAppearances = { bakery: normalizeAppearance(), restaurant: normalizeAppearance() };
    appearance = catalogAppearances[activeCatalogType];
    normalizeData();
    render();
    renderDeliveryAreas();
    renderAppearanceSettings();
    $("#saveState").textContent = "قاعدة البيانات فارغة — اضغط حفظ الآن لرفع البيانات";
  }
  catalogRef.on("value", remoteSnapshot => {
    if (!remoteSnapshot.exists() || Date.now() < ignoreRemoteUntil) return;
    applyRemoteCatalog(remoteSnapshot.val());
    $("#saveState").textContent = "البيانات متزامنة مع Firebase";
    setCloudStatus("متصل ومحفوظ", "connected");
  }, error => {
    setCloudStatus("تعذر التزامن", "error");
    console.error(error);
  });
  loadCustomers();
  loadVisitorPresence();
  availabilityNotificationsRef = firebaseServices.database.ref("orderingPlatform/availabilityNotifications");
  availabilityNotificationsRef.on("value", snapshot => { availabilityNotifications = snapshot.val() || {}; renderAvailabilityNotifications(); });
}

function renderLiveVisitors() {
  const now = Date.now();
  const active = visitorPresence.filter(visitor => now - Number(visitor.lastSeenAt || 0) <= 90000).sort((a, b) => Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0));
  const registered = active.filter(visitor => visitor.visitorType === "registered").length;
  $("#liveVisitorCount").textContent = active.length;
  $("#liveNewVisitorCount").textContent = active.length - registered;
  $("#liveRegisteredVisitorCount").textContent = registered;
  $("#liveVisitorsUpdated").textContent = `آخر تحديث: ${new Date(now).toLocaleTimeString("ar-KW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  const list = $("#liveVisitorListItems");
  list.innerHTML = active.length ? active.map(visitor => {
    const isRegistered = visitor.visitorType === "registered";
    const name = isRegistered && visitor.customerName ? visitor.customerName : "غير مسجل";
    const phone = isRegistered && visitor.phone ? visitor.phone : "لا يوجد رقم هاتف";
    const seen = new Date(Number(visitor.lastSeenAt || now)).toLocaleTimeString("ar-KW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return `<article class="live-visitor-entry"><span class="live-visitor-avatar">${isRegistered ? escapeHtml(name.charAt(0) || "ع") : "؟"}</span><div><strong>${escapeHtml(name)}</strong><small dir="ltr">${escapeHtml(phone)}</small></div><time>نشط ${escapeHtml(seen)}</time></article>`;
  }).join("") : '<p class="customer-empty">لا يوجد زوار نشطون حالياً.</p>';
}

function loadVisitorPresence() {
  visitorPresenceRef?.off();
  visitorPresenceRef = firebaseServices.database.ref("orderingPlatform/visitorPresence");
  visitorPresenceRef.on("value", snapshot => {
    visitorPresence = Object.values(snapshot.val() || {});
    renderLiveVisitors();
  }, error => {
    console.error(error);
    $("#liveVisitorsUpdated").textContent = "تعذر تحميل الزوار المباشرين";
  });
}

function loadCustomers() {
  customersRef?.off();
  customersRef = firebaseServices.database.ref("orderingPlatform/customers");
  customersRef.on("value", snapshot => {
    const value = snapshot.val() || {};
    customers = Object.entries(value).map(([uid, customer]) => ({
      uid,
      ...customer,
      addresses: Array.isArray(customer?.addresses) ? customer.addresses : Object.values(customer?.addresses || {}),
      orders: Array.isArray(customer?.orders) ? customer.orders : Object.values(customer?.orders || {}),
      cart: customer?.cart && typeof customer.cart === "object" ? customer.cart : {}
    }));
    renderCustomers();
  }, error => {
    console.error("Customer list load failed", error);
    $("#customerList").innerHTML = `<div class="empty">تعذر تحميل العملاء. تأكد من تحديث قواعد Firebase.</div>`;
  });
}

function categoryProducts(categoryId) {
  return products
    .filter((product) => product.category === categoryId)
    .sort((a, b) => Number(a.order) - Number(b.order));
}

function unassignedProducts() {
  const categoryIds = new Set(categories.map(category => category.id));
  return products
    .filter(product => !product.category || !categoryIds.has(product.category))
    .sort((a, b) => Number(a.order) - Number(b.order));
}

function toggleButton(kind, id, active) {
  const label = active ? "مفعّل" : "غير مفعّل";
  return `<button type="button" class="status-toggle ${active ? "active" : ""}" data-toggle-${kind}="${escapeHtml(id)}" aria-pressed="${active}" title="تغيير حالة الظهور"><i></i><span>${label}</span></button>`;
}

function availabilityButtons(product) {
  const status = product.availability?.status || "available";
  const enabled = status !== "available";
  return `<span class="availability-actions">${enabled ? `<select data-availability-select="${escapeHtml(product.id)}" aria-label="حالة النفاد"><option value="sold_out" ${status === "sold_out" ? "selected" : ""}>نفذت الكمية</option><option value="unavailable" ${status === "unavailable" ? "selected" : ""}>غير متوفر</option></select>` : ""}<button type="button" class="status-toggle ${enabled ? "active" : ""}" data-toggle-availability="${escapeHtml(product.id)}" aria-pressed="${enabled}" title="تفعيل أو إيقاف حالة نفاد المنتج"><i></i><span>نفاد الكمية</span></button></span>`;
}

function imageSource(product) {
  const source = product.images?.[0] || product.image || "";
  return assetUrls.get(source) || source;
}

function productMatchesSearch(product) {
  const query = productSearch.trim().toLocaleLowerCase();
  if (!query) return true;
  return [product.name, product.nameEn, product.description, product.descriptionEn]
    .filter(Boolean).join(" ").toLocaleLowerCase().includes(query);
}

function render() {
  normalizeData();
  deliveryAreas = normalizeDeliveryAreas(deliveryAreas);
  const currentCategories = scopedCategories();
  const currentCategoryIds = new Set(currentCategories.map(category => category.id));
  $("#categoryCount").textContent = currentCategories.length;
  $("#productCount").textContent = products.filter(product => catalogTypeOf(product) === activeCatalogType && currentCategoryIds.has(product.category)).length;
  const hasSearch = Boolean(productSearch.trim());
  const currentHeadings = headings.filter(item => catalogTypeOf(item) === activeCatalogType).sort((a, b) => Number(a.order) - Number(b.order));
  const linkedCategoryIds = new Set(currentHeadings.flatMap(item => [...(item.categoryIds || []), ...(item.subheadings || []).flatMap(group => group.categoryIds || [])]));
  const treeCategoryRow = (category, controls = "") => {
    const expanded = openCategories.has(category.id);
    const list = categoryProducts(category.id).filter(productMatchesSearch);
    return `<section class="tree-category-entry ${expanded ? "open" : ""}"><div class="tree-category-row" data-tree-category-toggle="${escapeHtml(category.id)}"><span class="tree-chevron">⌄</span><div><strong>${escapeHtml(category.nameAr)}</strong><small>${escapeHtml(category.nameEn)}</small></div><span class="count-badge">${list.length} منتج</span><div class="tree-actions">${controls}<button type="button" data-edit-category="${escapeHtml(category.id)}">تعديل</button></div></div>${expanded ? `<div class="tree-products">${list.map(product => `<div class="tree-product-row ${product.active ? "" : "inactive"}"><img src="${escapeHtml(imageSource(product))}" alt="" loading="lazy"><div><strong>${escapeHtml(product.name || "منتج بلا اسم")}</strong><small>${escapeHtml(product.nameEn || "")}</small></div><span class="price">${Number(product.price).toFixed(3)} د.ك</span>${toggleButton("product", product.id, product.active)}<button type="button" data-edit-product="${escapeHtml(product.id)}">تعديل</button></div>`).join("") || `<div class="empty">لا توجد منتجات في هذا القسم</div>`}</div>` : ""}</section>`;
  };
  const headingMarkup = currentHeadings.map(item => {
    const subheadings = Array.isArray(item.subheadings) ? item.subheadings : [];
    const nestedCount = subheadings.reduce((total, group) => total + (group.categoryIds || []).length, 0) + (item.categoryIds || []).length;
    const expanded = openHeadings.has(item.id);
    const nestedMarkup = subheadings.map((group, index) => {
      const key = `${item.id}:${group.id || index}`;
      const groupExpanded = openSubheadings.has(key);
      const linked = (group.categoryIds || []).map(id => currentCategories.find(category => category.id === id)).filter(Boolean);
      return `<section class="tree-subheading ${groupExpanded ? "open" : ""}"><div class="tree-subheading-head" data-subheading-toggle="${escapeHtml(key)}"><span class="tree-chevron">⌄</span><div><strong>${escapeHtml(group.nameAr || "عنوان فرعي")}</strong><small>${escapeHtml(group.nameEn || "")}</small></div><span class="count-badge">${linked.length} قسم</span><div class="tree-actions"><button type="button" data-move-tree-subheading="${escapeHtml(item.id)}" data-tree-subheading-index="${index}" data-direction="up">↑</button><button type="button" data-move-tree-subheading="${escapeHtml(item.id)}" data-tree-subheading-index="${index}" data-direction="down">↓</button></div></div>${groupExpanded ? `<div class="tree-category-list">${linked.map((category, categoryIndex) => treeCategoryRow(category, `<button type="button" data-move-tree-category="${escapeHtml(item.id)}" data-tree-group-index="${index}" data-tree-category-index="${categoryIndex}" data-direction="up">↑</button><button type="button" data-move-tree-category="${escapeHtml(item.id)}" data-tree-group-index="${index}" data-tree-category-index="${categoryIndex}" data-direction="down">↓</button>`)).join("") || `<div class="empty">لا توجد أقسام داخل هذا العنوان</div>`}</div>` : ""}</section>`;
    }).join("");
    const directLinked = (item.categoryIds || []).map(id => currentCategories.find(category => category.id === id)).filter(Boolean);
    const directMarkup = directLinked.length ? `<div class="tree-category-list">${directLinked.map(category => treeCategoryRow(category)).join("")}</div>` : "";
    return `<article class="category-card heading-card ${expanded ? "open" : ""}" data-heading-id="${escapeHtml(item.id)}" style="order:${Number(item.order) || 0}"><div class="category-head" data-heading-toggle="${escapeHtml(item.id)}"><span class="drag-handle" draggable="true" data-drag-kind="heading" data-drag-id="${escapeHtml(item.id)}" title="اسحب لتغيير الترتيب">⠿</span><div class="category-copy"><strong>${escapeHtml(item.nameAr)}</strong><small>${escapeHtml(item.nameEn)}</small></div><span class="count-badge">${nestedCount} قسم مرتبط</span><div class="category-actions"><button data-move-heading="${escapeHtml(item.id)}" data-direction="up">↑</button><button data-move-heading="${escapeHtml(item.id)}" data-direction="down">↓</button><button data-link-heading="${escapeHtml(item.id)}">ربط</button></div><span class="chevron">⌄</span></div>${expanded ? `<div class="heading-tree">${nestedMarkup}${directMarkup}</div>` : ""}</article>`;
  }).join("");
  const categoryMarkup = headingMarkup + currentCategories.filter(category => !linkedCategoryIds.has(category.id)).map((category) => {
    const list = categoryProducts(category.id).filter(productMatchesSearch);
    if (hasSearch && list.length) openCategories.add(category.id);
    if (hasSearch && !list.length) return "";
    return `
      <article class="category-card ${openCategories.has(category.id) ? "open" : ""} ${category.active ? "" : "inactive"}" data-category-id="${escapeHtml(category.id)}" style="order:${category.active ? (Number(category.order) || 0) : 100000 + (Number(category.order) || 0)}">
        <div class="category-head">
          <span class="drag-handle" draggable="true" data-drag-kind="category" data-drag-id="${escapeHtml(category.id)}" title="اسحب لتغيير الترتيب">⠿</span>
          <div class="category-copy">
            <strong>${escapeHtml(category.nameAr)}</strong>
            <small>${escapeHtml(category.nameEn)}</small>
          </div>
          <span class="count-badge">${list.length} منتج</span>
          <div class="category-actions">
            ${toggleButton("category", category.id, category.active)}
            <button data-add-product="${escapeHtml(category.id)}">إضافة منتج</button>
            <button data-duplicate-category="${escapeHtml(category.id)}">نسخ</button>
            <button data-edit-category="${escapeHtml(category.id)}">تعديل</button>
            <button class="delete" data-delete-category="${escapeHtml(category.id)}">حذف</button>
          </div>
          <span class="chevron">⌄</span>
        </div>
        <div class="products">
          ${list.length ? list.map((product) => `
            <div class="product-row ${product.active ? "" : "inactive"}" data-product-id="${escapeHtml(product.id)}" data-category-id="${escapeHtml(category.id)}">
              <span class="drag-handle" draggable="true" data-drag-kind="product" data-drag-id="${escapeHtml(product.id)}" data-drag-category="${escapeHtml(category.id)}" title="اسحب لتغيير الترتيب">⠿</span>
              <div class="product-main">
                <img src="${escapeHtml(imageSource(product))}" alt="" loading="lazy">
                <div class="product-copy">
                  <strong>${escapeHtml(product.name || "منتج بلا اسم")}</strong>
                  <small>${escapeHtml(product.nameEn || "No English name")}</small>
                </div>
              </div>
              <span class="price">${Number(product.price).toFixed(3)} د.ك</span>
              ${product.inventory?.enabled ? `<span class="count-badge">المخزون: ${Number(product.inventory.quantity || 0)}</span>` : ""}
              <div class="product-actions">
                ${toggleButton("product", product.id, product.active)}
                ${availabilityButtons(product)}
                <button data-duplicate-product="${escapeHtml(product.id)}">تكرار</button>
                <button data-edit-product="${escapeHtml(product.id)}">تعديل</button>
                <button class="remove-from-category" data-remove-product-category="${escapeHtml(product.id)}" title="إزالة المنتج من القسم فقط">−</button>
                <button class="delete" data-delete-product="${escapeHtml(product.id)}">حذف</button>
              </div>
            </div>
          `).join("") : `<div class="empty">لا توجد منتجات في هذا القسم</div>`}
        </div>
      </article>
    `;
  }).join("");
  $("#categoryList").innerHTML = categoryMarkup || (hasSearch ? `<div class="empty">لا توجد منتجات تطابق «${escapeHtml(productSearch)}»</div>` : `<div class="empty">لا توجد أقسام بعد</div>`);

  hydrateRenderedImages();
}

function renderAppearanceSettings(preserveTextInput = false) {
  const preview = $("#heroImagePreview");
  if (!preview) return;
  $("#heroPositionX").value = String(appearance.heroPositionX);
  $("#heroPositionY").value = String(appearance.heroPositionY);
  $("#heroPositionXValue").textContent = `${Math.round(appearance.heroPositionX)}%`;
  $("#heroPositionYValue").textContent = `${Math.round(appearance.heroPositionY)}%`;
  $("#heroTextColor").value = appearance.heroTextColor;
  $("#badgeBackgroundColor").value = appearance.badgeBackgroundColor;
  $("#badgeTextColor").value = appearance.badgeTextColor;
  $("#heroTextColorValue").textContent = appearance.heroTextColor.toUpperCase();
  $("#badgeBackgroundColorValue").textContent = appearance.badgeBackgroundColor.toUpperCase();
  $("#badgeTextColorValue").textContent = appearance.badgeTextColor.toUpperCase();
  if (!preserveTextInput) {
    $("#heroTitleText").value = appearance.heroTitle;
    $("#heroBadgeOneText").value = appearance.heroBadges[0];
    $("#heroBadgeTwoText").value = appearance.heroBadges[1];
    $("#heroBadgeThreeText").value = appearance.heroBadges[2];
  }
  preview.classList.toggle("empty", !appearance.heroImage);
  preview.style.backgroundImage = appearance.heroImage
    ? `linear-gradient(rgba(8, 28, 20, .38), rgba(8, 28, 20, .38)), url(${JSON.stringify(appearance.heroImage)})`
    : "";
  preview.style.backgroundPosition = `${appearance.heroPositionX}% ${appearance.heroPositionY}%`;
  preview.innerHTML = appearance.heroImage
    ? `<strong style="color:${escapeHtml(appearance.heroTextColor)}">${escapeHtml(appearance.heroTitle).replace(/\n/g, "<br>")}</strong>`
    : `<span>لم تتم إضافة صورة للواجهة</span>`;
  $("#badgesPreview").style.setProperty("--preview-badge-background", appearance.badgeBackgroundColor);
  $("#badgesPreview").style.setProperty("--preview-badge-text", appearance.badgeTextColor);
  $$("#badgesPreview span").forEach((badge, index) => { badge.textContent = appearance.heroBadges[index]; });
}

async function optimizeAndUploadHero(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("اختر ملف صورة صالحاً");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / bitmap.width, 1400 / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .86));
  if (!blob) throw new Error("تعذر تجهيز صورة الواجهة");
  const reference = firebaseServices.storage.ref(`orderingPlatform/catalog/appearance/hero-${Date.now()}.webp`);
  const upload = await reference.put(blob, {
    contentType: "image/webp",
    cacheControl: "public,max-age=31536000,immutable"
  });
  return upload.ref.getDownloadURL();
}

function deleteStoredAppearanceImage(url) {
  if (!String(url || "").includes("firebasestorage.googleapis.com")) return;
  firebaseServices.storage.refFromURL(url).delete().catch(error => console.warn("Appearance image cleanup failed", error));
}

async function uploadHeroImage(file) {
  if (!file || !currentAdmin) return;
  const input = $("#heroImageInput");
  const previousImage = appearance.heroImage;
  input.disabled = true;
  $("#saveState").textContent = "جارٍ تجهيز ورفع صورة الواجهة إلى Firebase…";
  try {
    appearance.heroImage = await optimizeAndUploadHero(file);
    renderAppearanceSettings();
    await saveToFirebase();
    if (previousImage && previousImage !== appearance.heroImage) deleteStoredAppearanceImage(previousImage);
    toast("تم حفظ الصورة — حدد الجزء الظاهر من أدوات الموضع");
  } catch (error) {
    appearance.heroImage = previousImage;
    renderAppearanceSettings();
    toast(error.message || "تعذر رفع صورة الواجهة");
  } finally {
    input.disabled = false;
    input.value = "";
  }
}

async function removeHeroImage() {
  if (!appearance.heroImage) return toast("لا توجد صورة لحذفها");
  const previousImage = appearance.heroImage;
  appearance.heroImage = "";
  renderAppearanceSettings();
  try {
    await saveToFirebase();
    deleteStoredAppearanceImage(previousImage);
    toast("تم حذف صورة الواجهة");
  } catch {
    appearance.heroImage = previousImage;
    renderAppearanceSettings();
  }
}

async function hydrateRenderedImages() {
  for (const image of $$(".product-main img,.unassigned-product img")) {
    const source = image.getAttribute("src");
    if (!source?.startsWith("product-images/")) continue;
    image.src = await resolveAsset(source);
  }
}

function markDirty(message = "جارٍ حفظ التعديلات في Firebase…") {
  $("#saveState").textContent = message;
  setCloudStatus("جارٍ الحفظ…");
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => saveToFirebase().catch(() => undefined), 650);
}

async function saveToFirebase() {
  if (!catalogRef || !currentAdmin) throw new Error("سجّل الدخول بحساب الإدارة أولاً");
  normalizeData();
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ categories, headings, products, deliveryAreas, appearance: catalogAppearancePayload(), advertisement, savedAt: new Date().toISOString() }));
  clearTimeout(syncTimer);
  ignoreRemoteUntil = Date.now() + 1200;
  $("#saveState").textContent = "جارٍ الحفظ في Firebase…";
  try {
    await catalogRef.update({
      categories: categories.map((category, index) => ({ ...category, order: index + 1 })),
      headings,
      restaurantEnabled,
      products: downloadableProducts(),
      deliveryAreas: deliveryAreas.map((area, index) => ({ ...area, name: area.nameAr, order: index + 1 })),
      appearance: catalogAppearancePayload(),
      advertisement: normalizeAdvertisement(advertisement),
      ...(toastPreparationMigrationComplete ? { toastPreparationMigrationV1: true } : {}),
      ...(breadSizeOptionsMigrationComplete ? { breadSizeOptionsMigrationV1: true } : {}),
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
      updatedBy: currentAdmin.email || currentAdmin.uid
    });
    siteCategories = clone(categories);
    siteProducts = clone(products);
    $("#saveState").textContent = "تم الحفظ في Firebase";
    setCloudStatus("متصل ومحفوظ", "connected");
  } catch (error) {
    $("#saveState").textContent = "فشل الحفظ — لم تُفقد تعديلاتك المحلية";
    setCloudStatus("فشل الحفظ", "error");
    toast(error.message || "تعذر الحفظ");
    throw error;
  }
}

function saveDraft() {
  saveToFirebase().then(() => toast("تم الحفظ في Firebase")).catch(() => undefined);
}

function renderDeliveryAreas() {
  const list = $("#deliveryAreaList");
  if (!list) return;
  const query = clean($("#deliveryAreaSearch")?.value).toLocaleLowerCase();
  const filtered = deliveryAreas.filter(area => [area.nameAr, area.nameEn].some(name => name.toLocaleLowerCase().includes(query)));
  $("#deliveryAreaCount").textContent = deliveryAreas.length;
  list.innerHTML = filtered.length ? filtered.map(area => `
    <article class="delivery-area-card" data-delivery-area-id="${escapeHtml(area.id)}">
      <div class="delivery-area-names"><strong>${escapeHtml(area.nameAr)}</strong><small dir="ltr">${escapeHtml(area.nameEn)}</small></div>
      <label class="delivery-area-price">سعر التوصيل د.ك<input type="number" min="0" step="0.001" value="${Number(area.price).toFixed(3)}" data-delivery-area-price="${escapeHtml(area.id)}"></label>
      <div class="delivery-area-actions"><button class="secondary" data-edit-delivery-area="${escapeHtml(area.id)}">تعديل الاسم</button><button class="delete" data-delete-delivery-area="${escapeHtml(area.id)}">حذف</button></div>
    </article>`).join("") : `<div class="empty">لا توجد مناطق مطابقة للبحث</div>`;
}

function openDeliveryAreaDialog(area = null) {
  $("#deliveryAreaDialogTitle").textContent = area ? "تعديل منطقة" : "إضافة منطقة";
  $("#deliveryAreaId").value = area?.id || "";
  $("#deliveryAreaNameAr").value = area?.nameAr || "";
  $("#deliveryAreaNameEn").value = area?.nameEn || "";
  $("#deliveryAreaPrice").value = area?.price ?? "";
  $("#deliveryAreaDialog").showModal();
}

function saveDeliveryArea(event) {
  event.preventDefault();
  const id = clean($("#deliveryAreaId").value);
  const nameAr = clean($("#deliveryAreaNameAr").value);
  const nameEn = clean($("#deliveryAreaNameEn").value);
  const price = Number($("#deliveryAreaPrice").value);
  if (!nameAr || !nameEn || !Number.isFinite(price) || price < 0) return;
  const next = { id: id || `area-${Date.now().toString(36)}`, nameAr, nameEn, name: nameAr, price, order: id ? deliveryAreas.find(area => area.id === id)?.order : deliveryAreas.length + 1 };
  const index = deliveryAreas.findIndex(area => area.id === id);
  if (index >= 0) deliveryAreas[index] = next; else deliveryAreas.push(next);
  deliveryAreas = normalizeDeliveryAreas(deliveryAreas);
  $("#deliveryAreaDialog").close();
  renderDeliveryAreas();
  markDirty("تم تعديل مناطق التوصيل — جارٍ الحفظ");
}

function showDeliveryAreasView() {
  currentView = "deliveryAreas";
  $$(`[data-admin-view='catalog']`).forEach(element => element.classList.add("hidden"));
  $("#customersView").classList.add("hidden");
  $("#deliveryAreasView").classList.remove("hidden");
  $("#liveVisitorsView").classList.add("hidden");
  $("#customersPage").classList.remove("active");
  $("#deliveryAreasPage").classList.add("active");
  $("#addProduct").classList.add("hidden");
  $("#addCategory").classList.add("hidden");
  renderDeliveryAreas();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showLiveVisitorsView() {
  currentView = "liveVisitors";
  $$("[data-admin-view='catalog']").forEach(element => element.classList.add("hidden"));
  $("#customersView").classList.add("hidden");
  $("#deliveryAreasView").classList.add("hidden");
  $("#liveVisitorsView").classList.remove("hidden");
  $("#customersPage").classList.remove("active");
  $("#deliveryAreasPage").classList.remove("active");
  $("#liveVisitorsPage").classList.add("active");
  $("#addProduct").classList.add("hidden");
  $("#addCategory").classList.add("hidden");
  renderLiveVisitors();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function resetDraft() {
  if (!confirm("هل تريد إلغاء التعديلات المحلية وإعادة تحميل آخر نسخة من Firebase؟")) return;
  localStorage.removeItem(DRAFT_KEY);
  clearAssets().catch(() => undefined);
  assetUrls.forEach((url) => URL.revokeObjectURL(url));
  assetUrls.clear();
  const snapshot = await catalogRef.once("value");
  if (!snapshot.exists()) return toast("لا توجد بيانات محفوظة في Firebase");
  applyRemoteCatalog(snapshot.val());
  openCategories.clear();
  $("#saveState").textContent = "تم تحميل آخر نسخة من Firebase";
  toast("تمت إعادة التحميل");
}

function openCategoryDialog(category = null) {
  $("#categoryDialogTitle").textContent = category ? "تعديل القسم" : "إضافة قسم جديد";
  $("#categoryId").value = category?.id || "";
  $("#categoryNameAr").value = category?.nameAr || "";
  $("#categoryNameEn").value = category?.nameEn || "";
  $("#categorySectionImageUrl").value = category?.sectionImage || "";
  $("#categorySectionImage").value = "";
  renderCategorySectionImagePreview(category?.sectionImage || "");
  $("#categoryDialog").showModal();
  setTimeout(() => $("#categoryNameAr").focus(), 30);
}

function renderCategorySectionImagePreview(url) {
  const preview = $("#categorySectionImagePreview");
  const remove = $("#removeCategorySectionImage");
  preview.src = url || "";
  preview.classList.toggle("hidden", !url);
  remove.classList.toggle("hidden", !url);
}

async function optimizeAndUploadCategorySectionImage(file, categoryId) {
  if (!file?.type?.startsWith("image/")) throw new Error("اختر صورة PNG أو صورة صالحة");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width, 900 / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .86));
  if (!blob) throw new Error("تعذر تجهيز الصورة التوضيحية");
  const safeId = String(categoryId || "new-category").replace(/[^a-zA-Z0-9_-]/g, "-");
  const reference = firebaseServices.storage.ref(`orderingPlatform/catalog/categories/${safeId}/section-${Date.now()}.webp`);
  const upload = await reference.put(blob, { contentType: "image/webp", cacheControl: "public,max-age=31536000,immutable" });
  return upload.ref.getDownloadURL();
}

async function saveCategory(event) {
  event.preventDefault();
  const existingId = $("#categoryId").value;
  const nameAr = clean($("#categoryNameAr").value);
  const nameEn = clean($("#categoryNameEn").value);
  if (!nameAr || !nameEn) return toast("اكتب اسم القسم باللغتين");
  const id = existingId || `category-${Date.now().toString(36)}`;
  const storedImage = existingId ? clean(categories.find(item => item.id === existingId)?.sectionImage) : "";
  const previousImage = clean($("#categorySectionImageUrl").value);
  const imageFile = $("#categorySectionImage").files?.[0];
  let sectionImage = previousImage;
  if (imageFile) {
    try {
      $("#saveState").textContent = "جارٍ تجهيز ورفع الصورة التوضيحية…";
      sectionImage = await optimizeAndUploadCategorySectionImage(imageFile, id);
    } catch (error) {
      toast(error.message || "تعذر رفع الصورة التوضيحية");
      return;
    }
  }
  if (existingId) {
    const category = categories.find((item) => item.id === existingId);
    if (category) Object.assign(category, { nameAr, nameEn, sectionImage });
  } else {
    categories.push({ id, nameAr, nameEn, sectionImage, catalogType: activeCatalogType, active: true, order: scopedCategories().length + 1 });
    openCategories.add(id);
  }
  $("#categoryDialog").close();
  markDirty();
  render();
  if (storedImage && storedImage !== sectionImage) deleteStoredAppearanceImage(storedImage);
  toast(existingId ? "تم تعديل القسم" : "تمت إضافة القسم");
}

function deleteStoredProductImages(product) {
  for (const imageUrl of product.images || []) {
    if (!imageUrl.includes("firebasestorage.googleapis.com")) continue;
    firebaseServices.storage.refFromURL(imageUrl).delete().catch(error => console.warn("Image cleanup failed", error));
  }
}

function requestDeleteCategory(categoryId) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return;
  const count = categoryProducts(categoryId).length;
  if (!count) {
    if (!confirm(`هل تريد حذف قسم «${category.nameAr}»؟`)) return;
    categories = categories.filter((item) => item.id !== categoryId);
    openCategories.delete(categoryId);
    markDirty();
    render();
    toast("تم حذف القسم");
    return;
  }
  pendingDeleteCategoryId = categoryId;
  $("#deleteCategoryMessage").textContent = `قسم «${category.nameAr}» يحتوي على ${count} منتج. اختر هل تريد الاحتفاظ بهذه المنتجات بدون قسم أم حذفها نهائياً.`;
  $("#deleteCategoryDialog").showModal();
}

function deleteCategory(categoryId, deleteProducts) {
  const affected = categoryProducts(categoryId);
  if (deleteProducts) {
    affected.forEach(deleteStoredProductImages);
    products = products.filter(product => product.category !== categoryId);
  } else {
    affected.forEach((product, index) => {
      product.category = "";
      product.order = unassignedProducts().length + index + 1;
    });
  }
  categories = categories.filter((item) => item.id !== categoryId);
  openCategories.delete(categoryId);
  normalizeProductOrder("");
  pendingDeleteCategoryId = "";
  $("#deleteCategoryDialog").close();
  markDirty();
  render();
  toast(deleteProducts ? "تم حذف القسم ومنتجاته" : "تم حذف القسم والاحتفاظ بمنتجاته بدون قسم");
}

function fillCategorySelect(selectedId = "") {
  $("#productCategory").innerHTML = `<option value="">بدون قسم</option>` + scopedCategories().map((category) =>
    `<option value="${escapeHtml(category.id)}" ${category.id === selectedId ? "selected" : ""}>${escapeHtml(category.nameAr)} — ${escapeHtml(category.nameEn)}</option>`
  ).join("");
}

function renderUnassignedProducts() {
  const query = clean($("#assignProductSearch").value).toLowerCase();
  const available = unassignedProducts().filter(product =>
    !query || `${product.name} ${product.nameEn} ${product.id}`.toLowerCase().includes(query)
  );
  $("#assignSelectionCount").textContent = selectedUnassignedProducts.size;
  $("#confirmAssignProducts").disabled = selectedUnassignedProducts.size === 0;
  $("#unassignedProductList").innerHTML = available.length ? available.map(product => `
    <div class="unassigned-product ${selectedUnassignedProducts.has(product.id) ? "selected" : ""} ${product.active ? "" : "inactive"}">
      <input type="checkbox" value="${escapeHtml(product.id)}" aria-label="اختيار ${escapeHtml(product.name || product.id)}" ${selectedUnassignedProducts.has(product.id) ? "checked" : ""}>
      <img src="${escapeHtml(imageSource(product))}" alt="" loading="lazy">
      <span><strong>${escapeHtml(product.name || "منتج بلا اسم")}</strong><small>${escapeHtml(product.nameEn || product.id)}</small></span>
      <b>${Number(product.price).toFixed(3)} د.ك</b>
      ${toggleButton("unassigned-product", product.id, product.active)}
    </div>
  `).join("") : `<div class="empty">لا توجد منتجات غير مضافة إلى قسم${query ? " تطابق البحث" : ""}</div>`;
  hydrateRenderedImages();
}

function openAssignProductsDialog(categoryId) {
  const category = categories.find(item => item.id === categoryId);
  if (!category) return;
  assignTargetCategoryId = categoryId;
  selectedUnassignedProducts = new Set();
  $("#assignProductsTitle").textContent = `إضافة منتجات إلى قسم ${category.nameAr}`;
  $("#assignProductSearch").value = "";
  renderUnassignedProducts();
  $("#assignProductsDialog").showModal();
  setTimeout(() => $("#assignProductSearch").focus(), 30);
}

function assignProductsToCategory(event) {
  event.preventDefault();
  if (!assignTargetCategoryId || !selectedUnassignedProducts.size) return;
  let nextOrder = categoryProducts(assignTargetCategoryId).length + 1;
  products.forEach(product => {
    if (!selectedUnassignedProducts.has(product.id)) return;
    product.category = assignTargetCategoryId;
    product.order = nextOrder++;
  });
  openCategories.add(assignTargetCategoryId);
  assignTargetCategoryId = "";
  selectedUnassignedProducts.clear();
  $("#assignProductsDialog").close();
  markDirty();
  render();
  toast("تمت إضافة المنتجات إلى القسم");
}

function removeProductFromCategory(productId) {
  const product = products.find(item => item.id === productId);
  if (!product?.category) return;
  const oldCategory = product.category;
  product.category = "";
  product.order = unassignedProducts().length + 1;
  normalizeProductOrder(oldCategory);
  normalizeProductOrder("");
  markDirty();
  render();
  toast("تمت إزالة المنتج من القسم مع الاحتفاظ به");
}

async function openProductDialog(product = null, categoryId = "") {
  $("#productDialogTitle").textContent = product ? "تعديل المنتج" : "إضافة منتج جديد";
  $("#productId").value = product?.id || "";
  fillCategorySelect(product?.category || categoryId || categories[0]?.id || "");
  $("#productPrice").value = product ? Number(product.price).toFixed(3) : "0.000";
  $("#productSalePrice").value = product?.originalPrice > Number(product?.price || 0) ? Number(product.price).toFixed(3) : "";
  if (product?.originalPrice > Number(product?.price || 0)) $("#productPrice").value = Number(product.originalPrice).toFixed(3);
  $("#productNameAr").value = product?.name || "";
  $("#productNameEn").value = product?.nameEn || "";
  $("#productBadgeAr").value = product?.badgeAr || "";
  $("#productBadgeEn").value = product?.badgeEn || "";
  $("#productDescriptionAr").value = product?.description || "";
  $("#productDescriptionEn").value = product?.descriptionEn || "";
  const preparation = normalizePreparation(product?.preparation);
  $("#productPreparationFirst").value = preparation.first;
  $("#productPreparationUnit").value = preparation.unit;
  $("#productPreparationTwoPeriods").checked = preparation.hasSecond;
  $("#productPreparationSecond").value = preparation.second || "";
  $("#productPreparationSecondUnit").value = preparation.secondUnit;
  renderPreparationFields();
  const options = normalizeProductOptions(product?.options);
  const minimumOrder = normalizeMinimumOrder(product?.minimumOrder);
  $("#productMinimumOrderEnabled").checked = Boolean(minimumOrder);
  $("#productMinimumOrderQuantity").value = minimumOrder?.quantity || 1;
  $("#productMinimumOrderUnit").value = minimumOrder?.unit || "dozen";
  renderMinimumOrderFields();
  $("#productInventoryEnabled").checked = product?.inventory?.enabled === true;
  $("#productInventoryQuantity").value = Math.max(0, Math.floor(Number(product?.inventory?.quantity) || 0));
  renderInventoryFields();
  editingSelectionFlow = product?.options?.selectionFlow?.enabled === true ? clone(product.options.selectionFlow) : null;
  $("#productOptionsEnabled").checked = Boolean(options || editingSelectionFlow);
  $("#productOptionsRequired").checked = options?.required === true;
  $("#productOptionsMultiple").checked = options?.multiple === true;
  $("#productOptionsPriceBased").checked = options?.priceBased === true;
  $("#productOptionsPreparationEnabled").checked = options?.preparationEnabled === true;
  $("#productOptionsImagesEnabled").checked = options?.imagesEnabled === true;
  $("#productOptionsNestedEnabled").checked = options?.nestedEnabled === true;
  $("#productOptionsMinimumEnabled").checked = options?.minimumPerOptionEnabled === true;
  $("#productOptionsQuantityEnabled").checked = options?.optionQuantityEnabled === true;
  $("#productOptionsTitleAr").value = options?.titleAr || "";
  $("#productOptionsTitleEn").value = options?.titleEn || "";
  $("#productOptionsMaxSelections").value = options?.maxSelections || 2;
  editingProductOptions = options?.items ? clone(options.items) : [];
  renderProductOptions();
  editingImages = [...(product?.images || [product?.image].filter(Boolean))];
  pendingImageDeletes = new Set();
  $("#imageUrl").value = "";
  await renderImageEditor();
  $("#productDialog").showModal();
  setTimeout(() => $("#productNameAr").focus(), 30);
}

let editingProductOptions = [];
let editingSelectionFlow = null;
const optionsClipboardKey = "figs-and-olives-product-options-clipboard";
let copiedProductOptions = (() => {
  try { return JSON.parse(localStorage.getItem(optionsClipboardKey) || "null"); } catch { return null; }
})();
const cloneOptions = value => JSON.parse(JSON.stringify(value));
let pastedOptionSequence = 0;
function cloneOptionsForProduct(value) {
  const copied = cloneOptions(value);
  // A paste must never retain option identifiers from the source product.
  // This keeps each product's options isolated even after subsequent edits.
  if (!Array.isArray(copied?.items)) return copied;
  const stamp = `${Date.now().toString(36)}-${++pastedOptionSequence}`;
  copied.items = copied.items.map((item, index) => ({
    ...item,
    id: `option-${stamp}-${index + 1}`,
    subOptions: (Array.isArray(item.subOptions) ? item.subOptions : []).map((subOption, subIndex) => ({
      ...subOption,
      id: `sub-option-${stamp}-${index + 1}-${subIndex + 1}`
    }))
  }));
  return copied;
}
function updateOptionsClipboardButton() {
  const button = $("#pasteProductOptions");
  if (button) button.disabled = !copiedProductOptions;
}
function syncEditingProductOptions() {
  editingProductOptions.forEach((option, index) => {
    const nameAr = $(`[data-option-ar="${index}"]`);
    const nameEn = $(`[data-option-en="${index}"]`);
    const price = $(`[data-option-price="${index}"]`);
    const preparation = $(`[data-option-prep="${index}"]`);
    const preparationUnit = $(`[data-option-prep-unit="${index}"]`);
    if (nameAr) option.nameAr = nameAr.value;
    if (nameEn) option.nameEn = nameEn.value;
    if (price) option.price = Math.max(0, Number(price.value) || 0);
    if (preparation) option.preparation = normalizePreparation({ first: preparation.value, unit: preparationUnit?.value });
    const minimumQuantity = $(`[data-option-minimum-quantity="${index}"]`);
    const minimumUnit = $(`[data-option-minimum-unit="${index}"]`);
    if (minimumQuantity) option.minimumOrder = normalizeMinimumOrder({ quantity: minimumQuantity.value, unit: minimumUnit?.value });
    option.subOptions = Array.isArray(option.subOptions) ? option.subOptions : [];
    option.subOptions.forEach((subOption, subIndex) => {
      const subNameAr = $(`[data-sub-option-ar="${index}-${subIndex}"]`);
      const subNameEn = $(`[data-sub-option-en="${index}-${subIndex}"]`);
      const subPrice = $(`[data-sub-option-price="${index}-${subIndex}"]`);
      if (subNameAr) subOption.nameAr = subNameAr.value;
      if (subNameEn) subOption.nameEn = subNameEn.value;
      if (subPrice) subOption.price = Math.max(0, Number(subPrice.value) || 0);
    });
  });
}
function renderProductOptions() {
  syncEditingProductOptions();
  const enabled = $("#productOptionsEnabled").checked;
  const priceBased = $("#productOptionsPriceBased").checked;
  const preparationEnabled = $("#productOptionsPreparationEnabled").checked;
  const imagesEnabled = $("#productOptionsImagesEnabled").checked;
  const nestedEnabled = $("#productOptionsNestedEnabled").checked;
  const minimumPerOptionEnabled = $("#productOptionsMinimumEnabled").checked;
  $("#productOptionsBody").classList.toggle("hidden", !enabled);
  $("#productOptionsMultipleSettings").classList.toggle("hidden", !enabled || !$("#productOptionsMultiple").checked || nestedEnabled);
  $("#productPrice").disabled = enabled && priceBased;
  $("#productSalePrice").disabled = enabled && priceBased;
  if (enabled && priceBased) $("#productPrice").value = "0.000";
  const container = $("#productOptionItems");
  if (editingSelectionFlow) {
    $("#productPrice").disabled = true;
    $("#productSalePrice").disabled = true;
    container.innerHTML = `<div class="notice"><div>✓</div><p>هذا المنتج مُعدّ بتسلسل: نوع العجينة ثم الحجم والكمية ثم الحشوات. سيتم الاحتفاظ بهذه الإعدادات عند حفظ المنتج.</p></div>`;
    return;
  }
  container.innerHTML = editingProductOptions.length ? editingProductOptions.map((option, index) => `
    <div class="option-item" data-option-index="${index}">
      <label>اسم الخيار بالعربي<input data-option-ar="${index}" value="${escapeHtml(option.nameAr || "")}" maxlength="80"></label>
      <label>اسم الخيار بالإنجليزي<input data-option-en="${index}" value="${escapeHtml(option.nameEn || "")}" maxlength="80" dir="ltr"></label>
      ${priceBased ? `<label>السعر د.ك<input data-option-price="${index}" type="number" min="0" step="0.001" value="${Number(option.price || 0).toFixed(3)}" dir="ltr"></label>` : ""}
      ${preparationEnabled ? `<label class="option-preparation">وقت التحضير<input data-option-prep="${index}" type="text" inputmode="numeric" maxlength="3" value="${option.preparation?.first || 2}" dir="ltr"><select data-option-prep-unit="${index}"><option value="hour" ${option.preparation?.unit !== "day" ? "selected" : ""}>ساعة</option><option value="day" ${option.preparation?.unit === "day" ? "selected" : ""}>يوم</option></select></label>` : ""}
      ${imagesEnabled ? `<label class="option-image">صورة الخيار${option.image ? `<img src="${escapeHtml(option.image)}" alt="صورة الخيار">` : ""}<span class="file-button">اختيار صورة من الجهاز<input data-option-image-file="${index}" type="file" accept="image/*"></span></label>` : ""}
      ${minimumPerOptionEnabled ? `<label class="option-minimum">أقل كمية للخيار<input data-option-minimum-quantity="${index}" type="number" min="1" max="99" step="1" value="${Number(option.minimumOrder?.quantity || 1)}" inputmode="numeric" dir="ltr"><select data-option-minimum-unit="${index}"><option value="dozen" ${option.minimumOrder?.unit === "dozen" ? "selected" : ""}>درزن</option><option value="piece" ${option.minimumOrder?.unit === "piece" ? "selected" : ""}>حبة</option><option value="bowl" ${option.minimumOrder?.unit === "bowl" ? "selected" : ""}>ماعون</option><option value="bag" ${option.minimumOrder?.unit === "bag" ? "selected" : ""}>كيس</option><option value="kilo" ${option.minimumOrder?.unit === "kilo" ? "selected" : ""}>كيلو</option><option value="bottle" ${option.minimumOrder?.unit === "bottle" ? "selected" : ""}>بطل</option></select></label>` : ""}
      <button type="button" data-remove-option="${index}" aria-label="حذف الخيار">×</button>
      ${nestedEnabled ? `<section class="sub-options" data-sub-options="${index}"><div class="sub-options-head"><strong>خيارات مرتبطة بـ «${escapeHtml(option.nameAr || "هذا الخيار") }»</strong><div><button type="button" data-add-sub-option="${index}">＋ إضافة خيار</button><button type="button" data-paste-sub-options="${index}" ${copiedProductOptions?.items?.length ? "" : "disabled"}>لصق الخيارات</button></div></div>${(option.subOptions || []).length ? option.subOptions.map((subOption, subIndex) => `<div class="sub-option-item"><label>اسم الخيار بالعربي<input data-sub-option-ar="${index}-${subIndex}" value="${escapeHtml(subOption.nameAr || "")}" maxlength="80"></label><label>اسم الخيار بالإنجليزي<input data-sub-option-en="${index}-${subIndex}" value="${escapeHtml(subOption.nameEn || "")}" maxlength="80" dir="ltr"></label><label>السعر د.ك<input data-sub-option-price="${index}-${subIndex}" type="number" min="0" step="0.001" value="${Number(subOption.price || 0).toFixed(3)}" dir="ltr"></label><button type="button" data-remove-sub-option="${index}-${subIndex}" aria-label="حذف الخيار الفرعي">×</button></div>`).join("") : `<p class="sub-options-empty">أضف خياراً فرعياً واحداً على الأقل لهذا الخيار.</p>`}</section>` : ""}
    </div>`).join("") : `<div class="empty">أضف خياراً واحداً على الأقل</div>`;
  updateOptionsClipboardButton();
}

function readProductOptions() {
  if (!$("#productOptionsEnabled").checked) return null;
  if (editingSelectionFlow) return { enabled: true, selectionFlow: clone(editingSelectionFlow) };
  const minimumPerOptionEnabled = $("#productOptionsMinimumEnabled").checked;
  const items = editingProductOptions.map((option, index) => ({
    id: option.id || `option-${Date.now()}-${index}`,
    nameAr: clean($(`[data-option-ar="${index}"]`)?.value),
    nameEn: clean($(`[data-option-en="${index}"]`)?.value),
    price: Math.max(0, Number($(`[data-option-price="${index}"]`)?.value) || 0),
    preparation: $("#productOptionsPreparationEnabled").checked ? normalizePreparation({ first: $(`[data-option-prep="${index}"]`)?.value, unit: $(`[data-option-prep-unit="${index}"]`)?.value }) : null,
    image: clean(option.image),
    minimumOrder: minimumPerOptionEnabled ? normalizeMinimumOrder({ quantity: $(`[data-option-minimum-quantity="${index}"]`)?.value, unit: $(`[data-option-minimum-unit="${index}"]`)?.value }) : null,
    subOptions: (option.subOptions || []).map((subOption, subIndex) => ({
      id: subOption.id || `sub-option-${Date.now()}-${index}-${subIndex}`,
      nameAr: clean($(`[data-sub-option-ar="${index}-${subIndex}"]`)?.value ?? subOption.nameAr),
      nameEn: clean($(`[data-sub-option-en="${index}-${subIndex}"]`)?.value ?? subOption.nameEn),
      price: Math.max(0, Number($(`[data-sub-option-price="${index}-${subIndex}"]`)?.value ?? subOption.price) || 0)
    }))
  })).filter(option => option.nameAr || option.nameEn);
  if (!items.length || items.some(option => !option.nameAr || !option.nameEn)) {
    toast("أكمل اسم كل خيار بالعربي والإنجليزي");
    return undefined;
  }
  const priceBased = $("#productOptionsPriceBased").checked;
  const nestedEnabled = $("#productOptionsNestedEnabled").checked;
  if (nestedEnabled && items.some(option => !option.subOptions.length || option.subOptions.some(subOption => !subOption.nameAr || !subOption.nameEn))) {
    toast("أضف اسماً عربياً وإنجليزياً لخيار فرعي واحد على الأقل تحت كل خيار رئيسي");
    return undefined;
  }
  const multiple = !nestedEnabled && $("#productOptionsMultiple").checked;
  const maxSelections = Math.min(items.length, Math.max(1, Number(normalizeEnglishDigits($("#productOptionsMaxSelections").value)) || items.length));
  if (multiple && (!clean($("#productOptionsTitleAr").value) || !clean($("#productOptionsTitleEn").value))) {
    toast("اكتب عنوان الخيارات بالعربي والإنجليزي");
    return undefined;
  }
  return { enabled: true, required: nestedEnabled || $("#productOptionsRequired").checked, multiple, maxSelections, titleAr: multiple ? clean($("#productOptionsTitleAr").value) : "", titleEn: multiple ? clean($("#productOptionsTitleEn").value) : "", priceBased: nestedEnabled || priceBased, preparationEnabled: $("#productOptionsPreparationEnabled").checked, imagesEnabled: $("#productOptionsImagesEnabled").checked, nestedEnabled, minimumPerOptionEnabled, optionQuantityEnabled: $("#productOptionsQuantityEnabled").checked, items };
}

function renderMinimumOrderFields() {
  $("#productMinimumOrderBody").classList.toggle("hidden", !$("#productMinimumOrderEnabled").checked);
}

function renderInventoryFields() {
  $("#productInventoryBody").classList.toggle("hidden", !$("#productInventoryEnabled").checked);
}

function readInventory() {
  if (!$("#productInventoryEnabled").checked) return { enabled: false, quantity: 0 };
  return { enabled: true, quantity: Math.max(0, Math.floor(Number(normalizeEnglishDigits($("#productInventoryQuantity").value)) || 0)) };
}

function readMinimumOrder() {
  if (!$("#productMinimumOrderEnabled").checked) return null;
  return normalizeMinimumOrder({ quantity: $("#productMinimumOrderQuantity").value, unit: $("#productMinimumOrderUnit").value });
}

function renderPreparationFields() {
  $("#productPreparationSecondWrap").classList.toggle("hidden", !$("#productPreparationTwoPeriods").checked);
}

function readPreparation() {
  const first = Number(normalizeEnglishDigits($("#productPreparationFirst").value));
  const hasSecond = $("#productPreparationTwoPeriods").checked;
  const second = Number(normalizeEnglishDigits($("#productPreparationSecond").value));
  if (!first || (hasSecond && !second)) {
    toast("اكتب وقت التحضير بالأرقام");
    return undefined;
  }
  return normalizePreparation({ first, unit: $("#productPreparationUnit").value, hasSecond, second, secondUnit: $("#productPreparationSecondUnit").value });
}

async function renderImageEditor() {
  const container = $("#imageList");
  if (!editingImages.length) {
    container.innerHTML = `<div class="empty">لم تتم إضافة صور بعد</div>`;
    return;
  }
  const cards = [];
  for (const [index, source] of editingImages.entries()) {
    cards.push(`
      <article class="image-item ${index === 0 ? "primary-image" : ""}" data-image-index="${index}">
        ${index === 0 ? `<span class="primary-label">الرئيسية</span>` : ""}
        <img src="${escapeHtml(await resolveAsset(source))}" alt="">
        <small>${escapeHtml(source)}</small>
        <div>
          ${index ? `<button type="button" data-primary-image="${index}">اجعلها رئيسية</button>` : ""}
          <button type="button" class="delete" data-remove-image="${index}">حذف</button>
        </div>
      </article>
    `);
  }
  container.innerHTML = cards.join("");
}

async function optimizeImage(file, productId) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .82));
  if (!blob) throw new Error("تعذر تجهيز الصورة");
  const safeId = String(productId || "new").replace(/[^a-zA-Z0-9_-]/g, "-");
  const filename = `${safeId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
  const storagePath = `orderingPlatform/catalog/products/${safeId}/${filename}`;
  const reference = firebaseServices.storage.ref(storagePath);
  const upload = await reference.put(blob, {
    contentType: "image/webp",
    cacheControl: "public,max-age=31536000,immutable"
  });
  return upload.ref.getDownloadURL();
}

async function addImageFiles(files) {
  if (!files.length) return;
  const productId = $("#productId").value || "new-product";
  $("#saveState").textContent = "جارٍ ضغط الصور ورفعها إلى Firebase…";
  try {
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      editingImages.push(await optimizeImage(file, productId));
    }
    await renderImageEditor();
    markDirty("تم رفع الصور — جارٍ حفظ المنتج");
    toast("تم رفع الصور إلى Firebase بصيغة WebP");
  } catch (error) {
    toast(error.message);
  }
}

function addImageUrl() {
  const value = clean($("#imageUrl").value);
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    editingImages.push(url.href);
    $("#imageUrl").value = "";
    renderImageEditor();
  } catch {
    toast("اكتب رابط صورة صحيحاً");
  }
}

function saveProduct(event) {
  event.preventDefault();
  const existingId = $("#productId").value;
  const categoryId = $("#productCategory").value;
  const name = clean($("#productNameAr").value);
  const nameEn = clean($("#productNameEn").value);
  const originalPrice = Number($("#productPrice").value);
  const salePriceText = $("#productSalePrice").value.trim();
  const salePrice = salePriceText === "" ? null : Number(salePriceText);
  const price = salePrice === null ? originalPrice : salePrice;
  const options = readProductOptions();
  if (options === undefined) return;
  const preparation = readPreparation();
  if (preparation === undefined) return;
  if (!name || !nameEn || (!options?.priceBased && (!Number.isFinite(price) || price < 0 || !Number.isFinite(originalPrice) || originalPrice < 0 || (salePrice !== null && salePrice >= originalPrice)))) {
    return toast("أكمل الاسم العربي والإنجليزي والسعر");
  }
  const payload = {
    category: categoryId,
    catalogType: categoryId ? catalogTypeOf(categories.find(category => category.id === categoryId)) : activeCatalogType,
    name,
    nameEn,
    badgeAr: clean($("#productBadgeAr").value),
    badgeEn: clean($("#productBadgeEn").value),
    price: options?.priceBased ? 0 : Number(price.toFixed(3)),
    originalPrice: options?.priceBased || salePrice === null ? 0 : Number(originalPrice.toFixed(3)),
    description: clean($("#productDescriptionAr").value),
    descriptionEn: clean($("#productDescriptionEn").value),
    images: [...editingImages],
    image: editingImages[0] || ""
    ,options, preparation, minimumOrder: readMinimumOrder(), inventory: readInventory()
  };
  if (existingId) {
    const product = products.find((item) => item.id === existingId);
    if (product) Object.assign(product, payload);
  } else {
    const id = `P${Date.now()}`;
    products.push({ id, ...payload, active: true, order: categoryProducts(categoryId).length + 1 });
    if (categoryId) openCategories.add(categoryId);
  }
  categories.forEach((category) => normalizeProductOrder(category.id));
  normalizeProductOrder("");
  for (const imageUrl of pendingImageDeletes) {
    if (!imageUrl.includes("firebasestorage.googleapis.com")) continue;
    firebaseServices.storage.refFromURL(imageUrl).delete().catch(error => console.warn("Image cleanup failed", error));
  }
  pendingImageDeletes.clear();
  $("#productDialog").close();
  markDirty();
  render();
  toast(existingId ? "تم تعديل المنتج" : "تمت إضافة المنتج");
}

function duplicateProduct(productId) {
  const source = products.find(product => product.id === productId);
  if (!source) return;
  const siblings = categoryProducts(source.category);
  const sourceIndex = siblings.findIndex(product => product.id === source.id);
  const insertOrder = sourceIndex < 0 ? siblings.length + 1 : sourceIndex + 2;
  products.forEach(product => {
    if (product.category === source.category && Number(product.order) >= insertOrder) product.order = Number(product.order) + 1;
  });
  const copy = clone(source);
  copy.id = `P${Date.now()}`;
  copy.order = insertOrder;
  copy.name = `${source.name} (نسخة)`;
  copy.nameEn = `${source.nameEn || source.name} (Copy)`;
  products.push(copy);
  openCategories.add(source.category);
  normalizeProductOrder(source.category);
  markDirty("تم تكرار المنتج — جارٍ الحفظ في Firebase");
  render();
  toast("تم تكرار المنتج أسفل المنتج الأصلي");
}

function duplicateCategory(categoryId) {
  const source = categories.find(category => category.id === categoryId);
  if (!source) return;
  const catalogType = catalogTypeOf(source);
  const sourceProducts = categoryProducts(source.id);
  const insertOrder = Number(source.order) + 1;
  categories.forEach(category => {
    if (catalogTypeOf(category) === catalogType && Number(category.order) >= insertOrder) category.order = Number(category.order) + 1;
  });
  const copyId = `category-${Date.now().toString(36)}`;
  categories.push({ ...clone(source), id: copyId, order: insertOrder });
  sourceProducts.forEach((product, index) => {
    const copy = clone(product);
    copy.id = `P${Date.now().toString(36)}${index}`;
    copy.category = copyId;
    copy.order = Number(product.order) || index + 1;
    products.push(copy);
  });
  openCategories.add(copyId);
  markDirty("تم نسخ القسم بكل محتوياته — جارٍ الحفظ في Firebase");
  render();
  toast("تمت إضافة النسخة تحت القسم مباشرة");
}

function deleteProduct(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product || !confirm(`هل تريد حذف المنتج «${product.name}»؟`)) return;
  deleteStoredProductImages(product);
  products = products.filter((item) => item.id !== productId);
  normalizeProductOrder(product.category);
  markDirty();
  render();
  toast("تم حذف المنتج");
}

function toggleCategoryActive(categoryId) {
  const category = categories.find(item => item.id === categoryId);
  if (!category) return;
  category.active = category.active === false;
  markDirty();
  render();
  toast(category.active ? "تم تفعيل القسم ومنتجاته في منصة البيع" : "تم إخفاء القسم ومنتجاته من منصة البيع");
}

function toggleProductActive(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) return;
  product.active = product.active === false;
  markDirty();
  render();
  if ($("#assignProductsDialog")?.open) renderUnassignedProducts();
  toast(product.active ? "تم تفعيل المنتج" : "تم إخفاء المنتج من منصة البيع");
}

function setProductAvailability(productId, status, enabled = true) {
  const product = products.find(item => item.id === productId);
  if (!product) return;
  const next = enabled ? status : "available";
  product.availability = { status: next, cycleId: next === "available" ? String(product.availability?.cycleId || Date.now()) : String(product.availability?.status === "available" ? Date.now() : (product.availability?.cycleId || Date.now())) };
  markDirty(); render();
  toast(next === "available" ? "المنتج متوفر الآن — سيبدأ إرسال التنبيهات" : (next === "sold_out" ? "تم تفعيل حالة: نفذت الكمية" : "تم تفعيل حالة: غير متوفر"));
}

function adminDate(value) {
  if (!value) return "غير متوفر";
  const date = new Date(Number(value) || value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";
  return date.toLocaleString("ar-KW", { dateStyle: "medium", timeStyle: "short" });
}

function customerOrderTotal(customer) {
  return (customer.orders || []).reduce((sum, order) => sum + Number(order.total || 0), 0);
}

function renderCustomers() {
  if (!$("#customerList")) return;
  const query = clean($("#customerSearch")?.value).toLowerCase();
  const ordered = customers.slice().sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  const filtered = ordered.filter(customer =>
    !query || `${customer.name || ""} ${customer.phone || ""} ${customer.uid}`.toLowerCase().includes(query)
  );
  $("#customerCount").textContent = customers.length;
  $("#customerOrderCount").textContent = customers.reduce((sum, customer) => sum + (customer.orders || []).length, 0);
  $("#customerList").innerHTML = filtered.length ? filtered.map(customer => {
    const addressCount = (customer.addresses || []).length;
    const orderCount = (customer.orders || []).length;
    return `<article class="customer-card">
      <div class="customer-avatar">${escapeHtml((customer.name || "ع").trim().charAt(0) || "ع")}</div>
      <div class="customer-copy"><strong>${escapeHtml(customer.name || "عميل بدون اسم")}</strong><span dir="ltr">${escapeHtml(customer.phone || "—")}</span><small>آخر تحديث: ${escapeHtml(adminDate(customer.updatedAt))}</small></div>
      <div class="customer-metrics"><span><b>${orderCount}</b> طلب</span><span><b>${addressCount}</b> عنوان</span><span><b>${customerOrderTotal(customer).toFixed(3)}</b> د.ك</span></div>
      <button class="primary" data-view-customer="${escapeHtml(customer.uid)}">عرض التفاصيل</button>
    </article>`;
  }).join("") : `<div class="empty customer-empty">${customers.length ? "لا يوجد عميل يطابق البحث" : "لا يوجد عملاء مسجلون حتى الآن"}</div>`;
}

function customerAddressHtml(address) {
  return `<article><strong>${escapeHtml(address.areaName || "عنوان")}</strong><p>${escapeHtml(address.details || "لا توجد تفاصيل")}</p>${Number.isFinite(Number(address.price)) ? `<small>سعر التوصيل: ${Number(address.price).toFixed(3)} د.ك</small>` : ""}</article>`;
}

function customerOrderHtml(order) {
  const items = Array.isArray(order.items) ? order.items : Object.values(order.items || {});
  return `<article class="customer-order">
    <div class="customer-order-head"><span><strong>${escapeHtml(order.orderId || "طلب")}</strong><small>${escapeHtml(adminDate(order.createdAt))}</small></span><b>${Number(order.total || 0).toFixed(3)} د.ك</b></div>
    <div class="customer-order-meta"><span>${order.mode === "pickup" ? "استلام" : "توصيل"}</span><span>${escapeHtml(order.status || "مدفوع")}</span><span>${escapeHtml(order.areaName || order.branchId || "")}</span></div>
    ${items.length ? `<div class="customer-order-items">${items.map(item => `<span><b>${escapeHtml(item.nameAr || item.nameEn || item.id || "منتج")}</b><small>الكمية ${Number(item.quantity || 0)} — ${Number(item.total || 0).toFixed(3)} د.ك</small></span>`).join("")}</div>` : ""}
  </article>`;
}

function openCustomerDetails(uid) {
  const customer = customers.find(item => item.uid === uid);
  if (!customer) return;
  const addresses = customer.addresses || [];
  const orders = (customer.orders || []).slice().sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  const cartEntries = Object.entries(customer.cart || {}).filter(([, quantity]) => Number(quantity) > 0);
  const cartCount = cartEntries.reduce((sum, [, quantity]) => sum + Number(quantity || 0), 0);
  $("#customerDialogTitle").textContent = customer.name || "تفاصيل العميل";
  $("#customerDetails").innerHTML = `
    <section class="customer-profile">
      <div class="customer-avatar large">${escapeHtml((customer.name || "ع").trim().charAt(0) || "ع")}</div>
      <div><h3>${escapeHtml(customer.name || "عميل بدون اسم")}</h3><strong dir="ltr">${escapeHtml(customer.phone || "—")}</strong><small>آخر تحديث: ${escapeHtml(adminDate(customer.updatedAt))}</small></div>
    </section>
    <div class="customer-summary">
      <span><b>${orders.length}</b> طلب</span><span><b>${addresses.length}</b> عنوان</span><span><b>${cartCount}</b> منتج في السلة</span><span><b>${customerOrderTotal(customer).toFixed(3)}</b> د.ك إجمالي الطلبات</span>
    </div>
    <section class="customer-detail-section"><h3>معلومات الحساب</h3><dl><div><dt>رقم الهاتف</dt><dd dir="ltr">${escapeHtml(customer.phone || "—")}</dd></div><div><dt>معرّف الحساب</dt><dd dir="ltr">${escapeHtml(customer.uid)}</dd></div></dl></section>
    <section class="customer-detail-section"><h3>السلة الحالية</h3><div class="customer-order-items current-cart">${cartEntries.length ? cartEntries.map(([productId, quantity]) => {
      const item = products.find(product => String(product.id) === String(productId));
      return `<span><b>${escapeHtml(item?.name || productId)}</b><small>الكمية ${Number(quantity)}</small></span>`;
    }).join("") : `<div class="empty">السلة فارغة</div>`}</div></section>
    <section class="customer-detail-section"><h3>العناوين</h3><div class="customer-addresses">${addresses.length ? addresses.map(customerAddressHtml).join("") : `<div class="empty">لا توجد عناوين محفوظة</div>`}</div></section>
    <section class="customer-detail-section"><h3>الطلبات</h3><div class="customer-orders">${orders.length ? orders.map(customerOrderHtml).join("") : `<div class="empty">لا توجد طلبات سابقة</div>`}</div></section>`;
  $("#customerDialog").showModal();
}

function showAdminView(view) {
  currentView = ["customers", "availability", "advertisement"].includes(view) ? view : "catalog";
  $$("[data-admin-view='catalog']").forEach(element => element.classList.toggle("hidden", currentView !== "catalog"));
  $("#customersView").classList.toggle("hidden", currentView !== "customers");
  $("#availabilityNotificationsView").classList.toggle("hidden", currentView !== "availability");
  $("#advertisementView").classList.toggle("hidden", currentView !== "advertisement");
  $("#deliveryAreasView").classList.add("hidden");
  $("#liveVisitorsView").classList.add("hidden");
  $("#customersPage").classList.toggle("active", currentView === "customers");
  $("#availabilityNotificationsPage").classList.toggle("active", currentView === "availability");
  $("#advertisementPage").classList.toggle("active", currentView === "advertisement");
  $("#deliveryAreasPage").classList.remove("active");
  $("#liveVisitorsPage").classList.remove("active");
  $("#addProduct").classList.toggle("hidden", currentView === "customers");
  $("#addCategory").classList.toggle("hidden", currentView === "customers");
  if (currentView === "customers") renderCustomers();
  if (currentView === "availability") renderAvailabilityNotifications();
  if (currentView === "advertisement") renderAdvertisementEditor();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAdvertisementEditor() {
  const value = normalizeAdvertisement(advertisement);
  $("#advertisementEnabled").checked = value.enabled;
  $("#advertisementSize").value = value.size;
  $("#advertisementTargetType").value = value.targetType;
  $("#advertisementLink").value = value.link;
  $("#advertisementProduct").value = value.productId;
  const selectedProduct = products.find(item => item.id === value.productId);
  $("#advertisementProductSearch").value = selectedProduct?.name || "";
  renderAdvertisementProductResults($("#advertisementProductSearch").value);
  $("#advertisementPreview").src = value.image || "";
  $("#advertisementPreview").classList.toggle("hidden", !value.image);
  $("#advertisementProductWrap").classList.toggle("hidden", value.targetType !== "product");
  $("#advertisementLinkWrap").classList.toggle("hidden", value.targetType !== "link");
}

function renderAdvertisementProductResults(query = "") {
  const normalized = clean(query).toLocaleLowerCase();
  const result = $("#advertisementProductResults");
  if (!normalized) { result.innerHTML = ""; return; }
  const matches = products.filter(item => [item.name, item.nameEn].join(" ").toLocaleLowerCase().includes(normalized)).slice(0, 12);
  result.innerHTML = matches.length ? matches.map(item => `<button type="button" data-advertisement-product-choice="${escapeHtml(item.id)}" style="display:flex;align-items:center;gap:10px;width:100%;text-align:right;border:1px solid #dfe8e2;background:white;border-radius:12px;padding:8px;margin-top:6px"><img src="${escapeHtml(imageSource(item))}" alt="" style="width:46px;height:46px;border-radius:9px;object-fit:cover"><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.nameEn)}</small></span></button>`).join("") : `<small>لا توجد نتائج مطابقة</small>`;
}

function renderAvailabilityNotifications() {
  const list = $("#availabilityNotificationsList"); if (!list) return;
  const rows = Object.entries(availabilityNotifications).flatMap(([productId, entries]) => Object.entries(entries || {}).map(([uid, entry]) => ({ productId, uid, ...entry })));
  $("#availabilityWaitingCount").textContent = rows.length;
  const grouped = rows.reduce((map, row) => { (map[row.productId] ||= []).push(row); return map; }, {});
  list.innerHTML = Object.entries(grouped).length ? Object.entries(grouped).map(([productId, entries]) => {
    const product = products.find(item => String(item.id) === String(productId));
    return `<article class="customer-card"><div class="customer-summary"><div><strong>${escapeHtml(product?.name || productId)}</strong><small>${entries.length} في انتظار التبليغ</small></div></div><div class="customer-order-items">${entries.map(entry => `<span><b>${escapeHtml(entry.name || "عميل")}</b><small dir="ltr">${escapeHtml(entry.phone || "")}</small></span>`).join("")}</div></article>`;
  }).join("") : `<div class="empty">لا يوجد عملاء بانتظار التبليغ حالياً</div>`;
}

function clearDropLines() {
  $$(".drop-before,.drop-after").forEach((element) => element.classList.remove("drop-before", "drop-after"));
}

function dropPosition(event, element) {
  const rectangle = element.getBoundingClientRect();
  return event.clientY < rectangle.top + rectangle.height / 2 ? "before" : "after";
}

function reorderCategory(sourceId, targetId, position) {
  const sourceIndex = categories.findIndex((category) => category.id === sourceId);
  let targetIndex = categories.findIndex((category) => category.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceId === targetId) return;
  const [source] = categories.splice(sourceIndex, 1);
  targetIndex = categories.findIndex((category) => category.id === targetId);
  categories.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, source);
  categories.forEach((category, index) => category.order = index + 1);
}

function reorderProduct(sourceId, targetId, categoryId, position) {
  const ordered = categoryProducts(categoryId);
  const sourceIndex = ordered.findIndex((product) => product.id === sourceId);
  let targetIndex = ordered.findIndex((product) => product.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceId === targetId) return;
  const [source] = ordered.splice(sourceIndex, 1);
  targetIndex = ordered.findIndex((product) => product.id === targetId);
  ordered.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, source);
  ordered.forEach((product, index) => product.order = index + 1);
}

function reorderHeading(sourceId, targetId, position) {
  const ordered = headings.filter(item => catalogTypeOf(item) === activeCatalogType).sort((a, b) => Number(a.order) - Number(b.order));
  const sourceIndex = ordered.findIndex(item => item.id === sourceId);
  if (sourceIndex < 0 || sourceId === targetId) return;
  const [source] = ordered.splice(sourceIndex, 1);
  const targetIndex = ordered.findIndex(item => item.id === targetId);
  if (targetIndex < 0) return;
  ordered.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, source);
  ordered.forEach((item, index) => item.order = index + 1);
}

function reorderCatalogEntry(sourceKind, sourceId, targetKind, targetId, position) {
  const entries = [
    ...scopedCategories().map(item => ({ kind: "category", item })),
    ...headings.filter(item => catalogTypeOf(item) === activeCatalogType).map(item => ({ kind: "heading", item }))
  ].sort((a, b) => Number(a.item.order) - Number(b.item.order) || (a.kind === "heading" ? -1 : 1));
  const sourceIndex = entries.findIndex(entry => entry.kind === sourceKind && entry.item.id === sourceId);
  if (sourceIndex < 0) return;
  const [source] = entries.splice(sourceIndex, 1);
  const targetIndex = entries.findIndex(entry => entry.kind === targetKind && entry.item.id === targetId);
  if (targetIndex < 0) return;
  entries.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, source);
  entries.forEach((entry, index) => entry.item.order = index + 1);
}

async function importJson(files) {
  if (!files.length) return;
  try {
    for (const file of files) {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error(`${file.name} ليس قائمة JSON`);
      if (!data.length) continue;
      if ("price" in data[0] || "category" in data[0]) products = data;
      else if ("nameAr" in data[0] || "nameEn" in data[0]) categories = data;
    }
    normalizeData();
    openCategories.clear();
    render();
    markDirty("تم الاستيراد — جارٍ الحفظ في Firebase");
    toast("تم استيراد الملفات");
  } catch (error) {
    toast(`فشل الاستيراد: ${error.message}`);
  } finally {
    $("#importData").value = "";
  }
}

function downloadableProducts() {
  return products
    .slice()
    .sort((a, b) => {
      const categoryDifference = categories.findIndex((category) => category.id === a.category)
        - categories.findIndex((category) => category.id === b.category);
      return categoryDifference || Number(a.order) - Number(b.order);
    })
    .map((product) => ({
      ...product,
      price: Number(Number(product.price).toFixed(3)),
      images: (product.images || []).filter(Boolean),
      image: product.images?.[0] || product.image || ""
    }));
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function exportData() {
  normalizeData();
  const exportProducts = downloadableProducts();
  const exportCategories = categories.map((category, index) => ({ ...category, order: index + 1 }));
  const exportDeliveryAreas = normalizeDeliveryAreas(deliveryAreas);
  $("#saveState").textContent = "جارٍ تجهيز النسخة الاحتياطية…";
  try {
    if (!window.JSZip) throw new Error("تعذر تحميل أداة ZIP");
    const zip = new JSZip();
    zip.file("products.json", JSON.stringify(exportProducts, null, 2) + "\n");
    zip.file("categories.json", JSON.stringify(exportCategories, null, 2) + "\n");
    zip.file("appearance.json", JSON.stringify(catalogAppearancePayload(), null, 2) + "\n");
    zip.file("delivery-areas.json", JSON.stringify(exportDeliveryAreas, null, 2) + "\n");
    const referencedAssets = [...new Set(exportProducts.flatMap((product) => product.images || []))]
      .filter((path) => path.startsWith("product-images/"));
    for (const path of referencedAssets) {
      const blob = await getAsset(path);
      if (blob) zip.file(path, blob);
    }
    zip.file("تعليمات.txt", [
      "هذه نسخة احتياطية من بيانات منصة البيع المحفوظة في Firebase.",
      "يمكن استيراد الملفين لاحقاً من لوحة الإدارة عند الحاجة.",
      "روابط الصور تشير إلى Firebase Storage ولا تحتاج إلى نسخ مجلد صور."
    ].join("\n"));
    downloadBlob(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), "نسخة-احتياطية-منصة-البيع.zip");
    $("#saveState").textContent = "تم تنزيل النسخة الاحتياطية";
    toast("تم تجهيز النسخة الاحتياطية");
  } catch (error) {
    downloadBlob(new Blob([JSON.stringify(exportProducts, null, 2)], { type: "application/json" }), "products.json");
    downloadBlob(new Blob([JSON.stringify(exportCategories, null, 2)], { type: "application/json" }), "categories.json");
    $("#saveState").textContent = "تم تنزيل ملفات JSON بدون ZIP";
    toast(error.message);
  }
}

async function signInAdmin() {
  if (!firebaseServices) {
    $("#adminAuthMessage").textContent = "تعذر تحميل Firebase";
    return;
  }
  const button = $("#adminGoogleLogin");
  button.disabled = true;
  button.textContent = "جاري فتح تسجيل الدخول…";
  $("#adminAuthMessage").textContent = "";
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await firebaseServices.auth.signInWithPopup(provider);
  } catch (error) {
    button.disabled = false;
    button.textContent = "الدخول بحساب Google";
    $("#adminAuthMessage").textContent = error.message || "تعذر تسجيل الدخول";
  }
}

async function initializeAdmin() {
  if (!firebaseServices) {
    $("#adminAuthMessage").textContent = "تعذر تحميل مكتبة Firebase";
    setCloudStatus("غير متصل", "error");
    return;
  }
  $("#adminGoogleLogin").addEventListener("click", signInAdmin);
  $("#adminSignOut").addEventListener("click", () => firebaseServices.auth.signOut());
  firebaseServices.auth.onAuthStateChanged(async user => {
    if (!user) {
      currentAdmin = null;
      catalogRef?.off();
      customersRef?.off();
      visitorPresenceRef?.off();
      catalogRef = null;
      customersRef = null;
      customers = [];
      $("#adminAuthGate").classList.remove("hidden");
      $("#adminSignOut").classList.add("hidden");
      $("#adminGoogleLogin").disabled = false;
      $("#adminGoogleLogin").textContent = "الدخول بحساب Google";
      setCloudStatus("يلزم تسجيل الدخول");
      return;
    }
    const email = String(user.email || "").toLowerCase();
    if (!ADMIN_EMAILS.has(email)) {
      $("#adminAuthMessage").textContent = `الحساب ${email || "المحدد"} غير مصرح له بإدارة المنصة`;
      await firebaseServices.auth.signOut();
      return;
    }
    currentAdmin = user;
    $("#adminAuthGate").classList.add("hidden");
    $("#adminSignOut").classList.remove("hidden");
    setCloudStatus("جارٍ تحميل البيانات…");
    try {
      await loadData();
      setCloudStatus("متصل ومحفوظ", "connected");
    } catch (error) {
      setCloudStatus("تعذر تحميل البيانات", "error");
      $("#categoryList").innerHTML = `<div class="notice"><div>!</div><p>${escapeHtml(error.message)}</p></div>`;
    }
  });
}

$("#addCategory").addEventListener("click", () => openCategoryDialog());
$("#addHeading").addEventListener("click", () => { $("#headingNameAr").value = ""; $("#headingNameEn").value = ""; $("#headingDialog").showModal(); });
$("#headingForm").addEventListener("submit", event => { event.preventDefault(); const nameAr = clean($("#headingNameAr").value), nameEn = clean($("#headingNameEn").value); if (!nameAr || !nameEn) return toast("اكتب اسم العنوان باللغتين"); headings.push({ id: `heading-${Date.now().toString(36)}`, nameAr, nameEn, catalogType: activeCatalogType, order: Math.max(0, ...scopedCategories().map(item => Number(item.order) || 0), ...headings.filter(item => catalogTypeOf(item) === activeCatalogType).map(item => Number(item.order) || 0)) + 1, categoryIds: [], subheadings: [] }); $("#headingDialog").close(); markDirty(); render(); });
$("#headingLinkForm").addEventListener("submit", event => { event.preventDefault(); const heading = headings.find(item => item.id === editingHeadingId); if (!heading) return; const hasSubheadings = $("#enableSubheadings").checked; heading.subheadings = hasSubheadings ? editingSubheadings : []; heading.categoryIds = hasSubheadings ? [] : $$("#headingCategoryChoices input:checked").map(input => input.value); $("#headingLinkDialog").close(); markDirty(); render(); toast("تم ربط الأقسام بالعنوان"); });
function renderSubheadingColumns() { $("#subheadingColumns").innerHTML = editingSubheadings.map((subheading, index) => { const selected = (subheading.categoryIds || []).map(id => scopedCategories().find(category => category.id === id)).filter(Boolean); return `<section class="subheading-column"><header><span>${escapeHtml(subheading.nameAr)}</span><span><button type="button" data-move-subheading="${index}" data-subdirection="up">↑</button><button type="button" data-move-subheading="${index}" data-subdirection="down">↓</button><button type="button" data-remove-subheading="${index}">×</button></span></header><strong>ترتيب الأقسام المختارة</strong>${selected.map((category, categoryIndex) => `<div class="subheading-sort-row"><span>${escapeHtml(category.nameAr)}</span><button type="button" data-move-subcategory="${index}" data-category-direction="up" data-category-index="${categoryIndex}">↑</button><button type="button" data-move-subcategory="${index}" data-category-direction="down" data-category-index="${categoryIndex}">↓</button></div>`).join("")}${scopedCategories().map(category => `<label><input type="checkbox" value="${escapeHtml(category.id)}" ${(subheading.categoryIds || []).includes(category.id) ? "checked" : ""} data-subheading-category="${index}"> ${escapeHtml(category.nameAr)}</label>`).join("")}</section>`; }).join(""); }
$("#enableSubheadings").addEventListener("change", event => { $("#subheadingEditor").classList.toggle("hidden", !event.target.checked); $("#directHeadingLink").classList.toggle("hidden", event.target.checked); });
$("#openHeadingSections").addEventListener("click", () => $("#headingCategoryChoices").classList.remove("hidden"));
$("#addSubheading").addEventListener("click", () => { const nameAr = clean($("#subheadingNameAr").value), nameEn = clean($("#subheadingNameEn").value); if (!nameAr || !nameEn) return toast("اكتب اسم العنوان الفرعي باللغتين"); editingSubheadings.push({ id: `subheading-${Date.now().toString(36)}`, nameAr, nameEn, categoryIds: [] }); $("#subheadingNameAr").value=""; $("#subheadingNameEn").value=""; renderSubheadingColumns(); });
$("#subheadingColumns").addEventListener("change", event => { const input = event.target.closest("[data-subheading-category]"); if (!input) return; const subheading = editingSubheadings[Number(input.dataset.subheadingCategory)]; if (!subheading) return; const id = input.value; subheading.categoryIds = subheading.categoryIds || []; subheading.categoryIds = input.checked ? [...new Set([...subheading.categoryIds, id])] : subheading.categoryIds.filter(item => item !== id); });
$("#subheadingColumns").addEventListener("click", event => { const categoryMove = event.target.closest("[data-move-subcategory]"); if (categoryMove) { const subheading = editingSubheadings[Number(categoryMove.dataset.moveSubcategory)], index = Number(categoryMove.dataset.categoryIndex), next = index + (categoryMove.dataset.categoryDirection === "up" ? -1 : 1); if (subheading && next >= 0 && next < subheading.categoryIds.length) [subheading.categoryIds[index], subheading.categoryIds[next]] = [subheading.categoryIds[next], subheading.categoryIds[index]]; renderSubheadingColumns(); return; } const move = event.target.closest("[data-move-subheading]"); if (move) { const index = Number(move.dataset.moveSubheading), next = index + (move.dataset.subdirection === "up" ? -1 : 1); if (next >= 0 && next < editingSubheadings.length) [editingSubheadings[index], editingSubheadings[next]] = [editingSubheadings[next], editingSubheadings[index]]; renderSubheadingColumns(); return; } const button = event.target.closest("[data-remove-subheading]"); if (!button) return; editingSubheadings.splice(Number(button.dataset.removeSubheading), 1); renderSubheadingColumns(); });
$("#catalogScope").addEventListener("change", event => {
  activeCatalogType = event.target.value === "restaurant" ? "restaurant" : "bakery";
  appearance = catalogAppearances[activeCatalogType];
  productSearch = "";
  $("#productSearch").value = "";
  render();
  renderAppearanceSettings();
});
$("#restaurantEnabled").addEventListener("change", event => { restaurantEnabled = event.target.checked; $("#restaurantEnabledLabel").textContent = restaurantEnabled ? "مفعّل" : "مغلق"; markDirty("تم تعديل ظهور زر أصناف المطعم — جارٍ الحفظ"); });
$("#productSearch").addEventListener("input", event => { productSearch = event.target.value; render(); });
$("#addProduct").addEventListener("click", () => openProductDialog());
$("#customersPage").addEventListener("click", () => showAdminView("customers"));
$("#availabilityNotificationsPage").addEventListener("click", () => showAdminView("availability"));
$("#advertisementPage").addEventListener("click", () => showAdminView("advertisement"));
$("#backFromAdvertisement").addEventListener("click", () => showAdminView("catalog"));
$("#advertisementTargetType").addEventListener("change", renderAdvertisementEditor);
$("#advertisementEnabled").addEventListener("change", event => {
  if (!event.target.checked) {
    disableAdvertisementImmediately();
    toast("تم إيقاف الإعلان وحفظه فوراً");
  }
});
$("#advertisementProductSearch").addEventListener("input", event => { $("#advertisementProduct").value = ""; renderAdvertisementProductResults(event.target.value); });
$("#advertisementProductResults").addEventListener("click", event => { const choice = event.target.closest("[data-advertisement-product-choice]"); if (!choice) return; const product = products.find(item => item.id === choice.dataset.advertisementProductChoice); $("#advertisementProduct").value = product?.id || ""; $("#advertisementProductSearch").value = product?.name || ""; $("#advertisementProductResults").innerHTML = product ? `<div style="display:flex;align-items:center;gap:10px;padding:8px"><img src="${escapeHtml(imageSource(product))}" alt="" style="width:46px;height:46px;border-radius:9px;object-fit:cover"><b>${escapeHtml(product.name)}</b></div>` : ""; });
$("#advertisementImage").addEventListener("change", async event => { const file = event.target.files?.[0]; if (!file) return; try { advertisement.image = await optimizeImage(file, "advertisement"); renderAdvertisementEditor(); toast("تم رفع صورة الإعلان"); } catch (error) { toast(error.message || "تعذر رفع الصورة"); } });
$("#advertisementForm").addEventListener("submit", event => { event.preventDefault(); advertisement = { ...normalizeAdvertisement(advertisement), enabled: $("#advertisementEnabled").checked, size: $("#advertisementSize").value, targetType: $("#advertisementTargetType").value, productId: $("#advertisementProduct").value, link: clean($("#advertisementLink").value) }; if (advertisement.enabled && !advertisement.image) return toast("أضف صورة الإعلان أولاً"); if (advertisement.enabled && advertisement.targetType === "product" && !advertisement.productId) return toast("اختر المنتج المطلوب"); if (advertisement.enabled && advertisement.targetType === "link" && !advertisement.link) return toast("أدخل الرابط المطلوب"); markDirty("جارٍ حفظ الإعلان…"); toast("تم حفظ الإعلان"); });
$("#backFromAvailabilityNotifications").addEventListener("click", () => showAdminView("catalog"));
$("#downloadAvailabilityNotifications").addEventListener("click", () => { showAdminView("availability"); setTimeout(() => window.print(), 50); });
$("#backToCatalog").addEventListener("click", () => showAdminView("catalog"));
$("#liveVisitorsPage").addEventListener("click", showLiveVisitorsView);
$("#backFromLiveVisitors").addEventListener("click", () => showAdminView("catalog"));
$("#liveVisitorListTrigger").addEventListener("click", () => { const list = $("#liveVisitorList"); const opening = list.classList.contains("hidden"); list.classList.toggle("hidden", !opening); $("#liveVisitorListTrigger").setAttribute("aria-expanded", String(opening)); });
$("#closeLiveVisitorList").addEventListener("click", () => { $("#liveVisitorList").classList.add("hidden"); $("#liveVisitorListTrigger").setAttribute("aria-expanded", "false"); });
$("#deliveryAreasPage").addEventListener("click", showDeliveryAreasView);
$("#backFromDeliveryAreas").addEventListener("click", () => showAdminView("catalog"));
$("#addDeliveryArea").addEventListener("click", () => openDeliveryAreaDialog());
$("#deliveryAreaForm").addEventListener("submit", saveDeliveryArea);
$("#deliveryAreaSearch").addEventListener("input", renderDeliveryAreas);
$("#deliveryAreaList").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit-delivery-area]");
  if (editButton) return openDeliveryAreaDialog(deliveryAreas.find(area => area.id === editButton.dataset.editDeliveryArea));
  const deleteButton = event.target.closest("[data-delete-delivery-area]");
  if (!deleteButton) return;
  const area = deliveryAreas.find(item => item.id === deleteButton.dataset.deleteDeliveryArea);
  if (!area || !confirm(`حذف منطقة ${area.nameAr}؟`)) return;
  deliveryAreas = deliveryAreas.filter(item => item.id !== area.id);
  renderDeliveryAreas();
  markDirty("تم حذف منطقة التوصيل — جارٍ الحفظ");
});
$("#deliveryAreaList").addEventListener("change", event => {
  const input = event.target.closest("[data-delivery-area-price]");
  if (!input) return;
  const area = deliveryAreas.find(item => item.id === input.dataset.deliveryAreaPrice);
  const price = Number(input.value);
  if (!area || !Number.isFinite(price) || price < 0) return renderDeliveryAreas();
  area.price = price;
  markDirty("تم تعديل سعر التوصيل — جارٍ الحفظ");
});
$("#customerSearch").addEventListener("input", renderCustomers);
$("#customerList").addEventListener("click", event => {
  const button = event.target.closest("[data-view-customer]");
  if (button) openCustomerDetails(button.dataset.viewCustomer);
});
$("#categoryForm").addEventListener("submit", saveCategory);
$("#categorySectionImage").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;
  renderCategorySectionImagePreview(URL.createObjectURL(file));
});
$("#removeCategorySectionImage").addEventListener("click", () => {
  $("#categorySectionImageUrl").value = "";
  $("#categorySectionImage").value = "";
  renderCategorySectionImagePreview("");
});
$("#productForm").addEventListener("submit", saveProduct);
$("#productInventoryEnabled").addEventListener("change", renderInventoryFields);
$("#assignProductsForm").addEventListener("submit", assignProductsToCategory);
$("#assignProductSearch").addEventListener("input", renderUnassignedProducts);
$("#unassignedProductList").addEventListener("change", event => {
  const input = event.target.closest("input[type='checkbox']");
  if (!input) return;
  if (input.checked) selectedUnassignedProducts.add(input.value);
  else selectedUnassignedProducts.delete(input.value);
  renderUnassignedProducts();
});
$("#unassignedProductList").addEventListener("click", event => {
  const button = event.target.closest("[data-toggle-unassigned-product]");
  if (button) toggleProductActive(button.dataset.toggleUnassignedProduct);
});
$("#deleteCategoryKeepProducts").addEventListener("click", () => {
  if (pendingDeleteCategoryId) deleteCategory(pendingDeleteCategoryId, false);
});
$("#deleteCategoryWithProducts").addEventListener("click", () => {
  if (pendingDeleteCategoryId) deleteCategory(pendingDeleteCategoryId, true);
});
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = document.getElementById(button.dataset.closeDialog);
    if (dialog?.open) dialog.close();
  });
});
$("#saveDraft").addEventListener("click", saveDraft);
$("#saveAppearance").addEventListener("click", () => {
  saveToFirebase().then(() => toast("تم حفظ مظهر الواجهة في Firebase")).catch(() => undefined);
});
$("#heroImageInput").addEventListener("change", event => uploadHeroImage(event.target.files?.[0]));
$("#removeHeroImage").addEventListener("click", removeHeroImage);
["heroPositionX", "heroPositionY"].forEach(id => {
  $(`#${id}`).addEventListener("input", event => {
    appearance[id] = validPercent(event.target.value, DEFAULT_APPEARANCE[id]);
    renderAppearanceSettings();
  });
  $(`#${id}`).addEventListener("change", () => markDirty("تم تعديل موضع صورة الواجهة — جارٍ الحفظ"));
});
["heroTextColor", "badgeBackgroundColor", "badgeTextColor"].forEach(id => {
  $(`#${id}`).addEventListener("input", event => {
    appearance[id] = validHexColor(event.target.value, DEFAULT_APPEARANCE[id]);
    renderAppearanceSettings();
  });
  $(`#${id}`).addEventListener("change", () => markDirty("تم تعديل الألوان — جارٍ حفظ مظهر الواجهة"));
});
["heroTitleText", "heroBadgeOneText", "heroBadgeTwoText", "heroBadgeThreeText"].forEach((id, index) => {
  $(`#${id}`).addEventListener("input", event => {
    if (index === 0) appearance.heroTitle = event.target.value.slice(0, 120);
    else appearance.heroBadges[index - 1] = event.target.value.slice(0, 45);
    renderAppearanceSettings(true);
  });
  $(`#${id}`).addEventListener("change", event => {
    if (index === 0) appearance.heroTitle = validAppearanceText(event.target.value, DEFAULT_APPEARANCE.heroTitle, 120);
    else appearance.heroBadges[index - 1] = validAppearanceText(event.target.value, DEFAULT_APPEARANCE.heroBadges[index - 1], 45);
    renderAppearanceSettings();
    markDirty("تم تعديل نصوص الواجهة — جارٍ الحفظ");
  });
});
$("#resetData").addEventListener("click", resetDraft);
$("#exportData").addEventListener("click", exportData);
$("#importData").addEventListener("change", (event) => importJson([...event.target.files]));
$("#productImages").addEventListener("change", (event) => {
  addImageFiles([...event.target.files]);
  event.target.value = "";
});
$("#addImageUrl").addEventListener("click", addImageUrl);
$("#productOptionsEnabled").addEventListener("change", renderProductOptions);
$("#productMinimumOrderEnabled").addEventListener("change", renderMinimumOrderFields);
$("#productMinimumOrderQuantity").addEventListener("input", event => { event.target.value = normalizeEnglishDigits(event.target.value); });
$("#productPreparationTwoPeriods").addEventListener("change", renderPreparationFields);
["productPreparationFirst", "productPreparationSecond"].forEach(id => $("#" + id).addEventListener("input", event => { event.target.value = normalizeEnglishDigits(event.target.value); }));
$("#productOptionsPriceBased").addEventListener("change", event => {
  if (event.target.checked) $("#productOptionsRequired").checked = true;
  renderProductOptions();
});
$("#productOptionsMultiple").addEventListener("change", renderProductOptions);
$("#productOptionsMaxSelections").addEventListener("input", event => { event.target.value = normalizeEnglishDigits(event.target.value); });
$("#productOptionsPreparationEnabled").addEventListener("change", renderProductOptions);
$("#productOptionsImagesEnabled").addEventListener("change", renderProductOptions);
$("#productOptionsNestedEnabled").addEventListener("change", event => {
  if (event.target.checked) {
    $("#productOptionsRequired").checked = true;
    $("#productOptionsMultiple").checked = false;
    $("#productOptionsPriceBased").checked = true;
  }
  renderProductOptions();
});
$("#productOptionsMinimumEnabled").addEventListener("change", event => {
  if (event.target.checked) $("#productOptionsQuantityEnabled").checked = true;
  renderProductOptions();
});
$("#productOptionsQuantityEnabled").addEventListener("change", renderProductOptions);
$("#copyProductOptions").addEventListener("click", () => {
  const options = readProductOptions();
  if (!options) return toast("فعّل خيارات المنتج وأضف خياراً واحداً على الأقل لنسخها");
  if (options === undefined) return;
  copiedProductOptions = cloneOptions(options);
  localStorage.setItem(optionsClipboardKey, JSON.stringify(copiedProductOptions));
  updateOptionsClipboardButton();
  toast("تم نسخ الخيارات بكل إعداداتها");
});
$("#pasteProductOptions").addEventListener("click", () => {
  if (!copiedProductOptions) return;
  const options = cloneOptionsForProduct(copiedProductOptions);
  $("#productOptionsEnabled").checked = true;
  $("#productOptionsRequired").checked = options.required === true;
  $("#productOptionsMultiple").checked = options.multiple === true;
  $("#productOptionsPriceBased").checked = options.priceBased === true;
  $("#productOptionsPreparationEnabled").checked = options.preparationEnabled === true;
  $("#productOptionsImagesEnabled").checked = options.imagesEnabled === true;
  $("#productOptionsNestedEnabled").checked = options.nestedEnabled === true;
  $("#productOptionsMinimumEnabled").checked = options.minimumPerOptionEnabled === true;
  $("#productOptionsQuantityEnabled").checked = options.optionQuantityEnabled === true;
  $("#productOptionsTitleAr").value = options.titleAr || "";
  $("#productOptionsTitleEn").value = options.titleEn || "";
  $("#productOptionsMaxSelections").value = options.maxSelections || 2;
  editingSelectionFlow = null;
  editingProductOptions = options.items || [];
  renderProductOptions();
  toast("تم لصق الخيارات — احفظ المنتج لإتمام التغيير");
});
$("#addProductOption").addEventListener("click", () => {
  editingSelectionFlow = null;
  editingProductOptions.push({ id: `option-${Date.now()}-${editingProductOptions.length}`, nameAr: "", nameEn: "", price: 0, preparation: { first: 2, unit: "hour", hasSecond: false, second: null, secondUnit: "hour" }, subOptions: [] });
  renderProductOptions();
});
$("#productOptionItems").addEventListener("click", event => {
  const addSubButton = event.target.closest("[data-add-sub-option]");
  const pasteSubButton = event.target.closest("[data-paste-sub-options]");
  const removeSubButton = event.target.closest("[data-remove-sub-option]");
  if (addSubButton) {
    const option = editingProductOptions[Number(addSubButton.dataset.addSubOption)];
    option.subOptions = Array.isArray(option.subOptions) ? option.subOptions : [];
    option.subOptions.push({ id: `sub-option-${Date.now()}-${option.subOptions.length}`, nameAr: "", nameEn: "", price: 0 });
    return renderProductOptions();
  }
  if (pasteSubButton) {
    if (!copiedProductOptions?.items?.length) return toast("انسخ الخيارات أولاً ثم الصقها هنا");
    syncEditingProductOptions();
    const option = editingProductOptions[Number(pasteSubButton.dataset.pasteSubOptions)];
    if (!option) return;
    option.subOptions = Array.isArray(option.subOptions) ? option.subOptions : [];
    const pasted = cloneOptions(copiedProductOptions.items).map((item, itemIndex) => ({
      id: `sub-option-${Date.now()}-${option.subOptions.length + itemIndex}`,
      nameAr: item.nameAr || "",
      nameEn: item.nameEn || "",
      price: Math.max(0, Number(item.price) || 0)
    }));
    option.subOptions.push(...pasted);
    renderProductOptions();
    return toast("تم لصق الخيارات داخل الخيار المرتبط");
  }
  if (removeSubButton) {
    const [optionIndex, subIndex] = removeSubButton.dataset.removeSubOption.split("-").map(Number);
    editingProductOptions[optionIndex]?.subOptions?.splice(subIndex, 1);
    return renderProductOptions();
  }
  const button = event.target.closest("[data-remove-option]");
  if (!button) return;
  editingProductOptions.splice(Number(button.dataset.removeOption), 1);
  renderProductOptions();
});
$("#productOptionItems").addEventListener("change", async event => {
  const input = event.target.closest("[data-option-image-file]");
  const file = input?.files?.[0];
  if (!input || !file) return;
  const index = Number(input.dataset.optionImageFile);
  try {
    editingProductOptions[index].image = await optimizeImage(file, $("#productId").value || "new-product");
    renderProductOptions();
  } catch (error) { toast(error.message || "تعذر رفع الصورة"); }
});
$("#productOptionItems").addEventListener("input", event => {
  const input = event.target.closest("[data-option-prep]");
  if (input) input.value = normalizeEnglishDigits(input.value);
});

$("#imageList").addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-image]");
  const primaryButton = event.target.closest("[data-primary-image]");
  if (removeButton) {
    const [removed] = editingImages.splice(Number(removeButton.dataset.removeImage), 1);
    if (removed) pendingImageDeletes.add(removed);
    renderImageEditor();
  }
  if (primaryButton) {
    const [selected] = editingImages.splice(Number(primaryButton.dataset.primaryImage), 1);
    editingImages.unshift(selected);
    renderImageEditor();
  }
});

$("#categoryList").addEventListener("click", (event) => {
  const linkHeadingButton = event.target.closest("[data-link-heading]");
  const moveHeadingButton = event.target.closest("[data-move-heading]");
  const addProductButton = event.target.closest("[data-add-product]");
  const duplicateCategoryButton = event.target.closest("[data-duplicate-category]");
  const editCategoryButton = event.target.closest("[data-edit-category]");
  const deleteCategoryButton = event.target.closest("[data-delete-category]");
  const toggleCategoryButton = event.target.closest("[data-toggle-category]");
  const duplicateProductButton = event.target.closest("[data-duplicate-product]");
  const editProductButton = event.target.closest("[data-edit-product]");
  const deleteProductButton = event.target.closest("[data-delete-product]");
  const toggleProductButton = event.target.closest("[data-toggle-product]");
  const availabilityButton = event.target.closest("[data-toggle-availability]");
  const moveTreeSubheadingButton = event.target.closest("[data-move-tree-subheading]");
  const moveTreeCategoryButton = event.target.closest("[data-move-tree-category]");
  const treeCategoryToggle = event.target.closest("[data-tree-category-toggle]");
  if (availabilityButton) { const product = products.find(item => item.id === availabilityButton.dataset.toggleAvailability); return setProductAvailability(product?.id, product?.availability?.status === "unavailable" ? "unavailable" : "sold_out", product?.availability?.status === "available"); }
  const removeProductButton = event.target.closest("[data-remove-product-category]");
  if (moveTreeSubheadingButton) {
    const heading = headings.find(item => item.id === moveTreeSubheadingButton.dataset.moveTreeSubheading);
    const list = heading?.subheadings || [];
    const index = Number(moveTreeSubheadingButton.dataset.treeSubheadingIndex);
    const next = index + (moveTreeSubheadingButton.dataset.direction === "up" ? -1 : 1);
    if (next >= 0 && next < list.length) { [list[index], list[next]] = [list[next], list[index]]; markDirty(); render(); }
    return;
  }
  if (moveTreeCategoryButton) {
    const heading = headings.find(item => item.id === moveTreeCategoryButton.dataset.moveTreeCategory);
    const group = heading?.subheadings?.[Number(moveTreeCategoryButton.dataset.treeGroupIndex)];
    const list = group?.categoryIds || [];
    const index = Number(moveTreeCategoryButton.dataset.treeCategoryIndex);
    const next = index + (moveTreeCategoryButton.dataset.direction === "up" ? -1 : 1);
    if (next >= 0 && next < list.length) { [list[index], list[next]] = [list[next], list[index]]; markDirty(); render(); }
    return;
  }
  if (moveHeadingButton) { const heading = headings.find(item => item.id === moveHeadingButton.dataset.moveHeading); const list = [...scopedCategories().map(item => ({ type: "category", item })), ...headings.filter(item => catalogTypeOf(item) === activeCatalogType).map(item => ({ type: "heading", item }))].sort((a, b) => Number(a.item.order) - Number(b.item.order) || (a.type === "heading" ? -1 : 1)); const index = list.findIndex(item => item.type === "heading" && item.item.id === heading?.id); const next = index + (moveHeadingButton.dataset.direction === "up" ? -1 : 1); if (heading && next >= 0 && next < list.length) { const target = list[next]; heading.order = target.type === "category" ? Number(target.item.order) + (moveHeadingButton.dataset.direction === "up" ? -0.5 : 0.5) : target.item.order; markDirty(); render(); } return; }
  if (linkHeadingButton) { const heading = headings.find(item => item.id === linkHeadingButton.dataset.linkHeading); if (!heading) return; editingHeadingId = heading.id; editingSubheadings = Array.isArray(heading.subheadings) ? JSON.parse(JSON.stringify(heading.subheadings)) : []; $("#headingLinkTitle").textContent = heading.nameAr; $("#enableSubheadings").checked = editingSubheadings.length > 0; $("#subheadingEditor").classList.toggle("hidden", !editingSubheadings.length); $("#directHeadingLink").classList.toggle("hidden", Boolean(editingSubheadings.length)); $("#headingCategoryChoices").classList.add("hidden"); $("#headingCategoryChoices").innerHTML = scopedCategories().map(category => `<label class="heading-category-choice"><input type="checkbox" value="${escapeHtml(category.id)}" ${(heading.categoryIds || []).includes(category.id) ? "checked" : ""}><span>${escapeHtml(category.nameAr)} <small>${escapeHtml(category.nameEn)}</small></span></label>`).join(""); renderSubheadingColumns(); $("#headingLinkDialog").showModal(); return; }
  if (addProductButton) return openAssignProductsDialog(addProductButton.dataset.addProduct);
  if (duplicateCategoryButton) return duplicateCategory(duplicateCategoryButton.dataset.duplicateCategory);
  if (editCategoryButton) return openCategoryDialog(categories.find((category) => category.id === editCategoryButton.dataset.editCategory));
  if (deleteCategoryButton) return requestDeleteCategory(deleteCategoryButton.dataset.deleteCategory);
  if (toggleCategoryButton) return toggleCategoryActive(toggleCategoryButton.dataset.toggleCategory);
  if (duplicateProductButton) return duplicateProduct(duplicateProductButton.dataset.duplicateProduct);
  if (editProductButton) return openProductDialog(products.find((product) => product.id === editProductButton.dataset.editProduct));
  if (deleteProductButton) return deleteProduct(deleteProductButton.dataset.deleteProduct);
  if (toggleProductButton) return toggleProductActive(toggleProductButton.dataset.toggleProduct);
  if (removeProductButton) return removeProductFromCategory(removeProductButton.dataset.removeProductCategory);
  if (event.target.closest("button,.drag-handle")) return;
  if (treeCategoryToggle) {
    const id = treeCategoryToggle.dataset.treeCategoryToggle;
    openCategories.has(id) ? openCategories.delete(id) : openCategories.add(id);
    render();
    return;
  }
  const headingToggle = event.target.closest("[data-heading-toggle]");
  if (headingToggle) {
    const id = headingToggle.dataset.headingToggle;
    openHeadings.has(id) ? openHeadings.delete(id) : openHeadings.add(id);
    render();
    return;
  }
  const subheadingToggle = event.target.closest("[data-subheading-toggle]");
  if (subheadingToggle) {
    const id = subheadingToggle.dataset.subheadingToggle;
    openSubheadings.has(id) ? openSubheadings.delete(id) : openSubheadings.add(id);
    render();
    return;
  }
  const header = event.target.closest(".category-head");
  if (!header) return;
  if (header.closest(".heading-card")) return;
  const id = header.closest(".category-card").dataset.categoryId;
  openCategories.has(id) ? openCategories.delete(id) : openCategories.add(id);
  header.closest(".category-card").classList.toggle("open", openCategories.has(id));
});

$("#categoryList").addEventListener("change", event => {
  const select = event.target.closest("[data-availability-select]");
  if (!select) return;
  setProductAvailability(select.dataset.availabilitySelect, select.value, true);
});

$("#categoryList").addEventListener("dragstart", (event) => {
  const handle = event.target.closest("[data-drag-kind]");
  if (!handle) return;
  dragState = {
    kind: handle.dataset.dragKind,
    id: handle.dataset.dragId,
    categoryId: handle.dataset.dragCategory || ""
  };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", dragState.id);
  const source = dragState.kind === "product" ? handle.closest(".product-row") : handle.closest(".category-card");
  setTimeout(() => source?.classList.add("dragging"), 0);
});

$("#categoryList").addEventListener("dragover", (event) => {
  if (!dragState) return;
  const target = dragState.kind === "product" ? event.target.closest(`.product-row[data-category-id="${CSS.escape(dragState.categoryId)}"]`) : event.target.closest(".category-card");
  if (!target) return;
  const targetId = dragState.kind === "product" ? target.dataset.productId : target.dataset.headingId || target.dataset.categoryId;
  if (targetId === dragState.id) return;
  event.preventDefault();
  clearDropLines();
  target.classList.add(dropPosition(event, target) === "before" ? "drop-before" : "drop-after");
});

$("#categoryList").addEventListener("drop", (event) => {
  if (!dragState) return;
  const target = dragState.kind === "product" ? event.target.closest(`.product-row[data-category-id="${CSS.escape(dragState.categoryId)}"]`) : event.target.closest(".category-card");
  if (!target) return;
  event.preventDefault();
  const position = target.classList.contains("drop-after") ? "after" : "before";
  if (dragState.kind === "category" || dragState.kind === "heading") reorderCatalogEntry(dragState.kind, dragState.id, target.classList.contains("heading-card") ? "heading" : "category", target.dataset.headingId || target.dataset.categoryId, position);
  else reorderProduct(dragState.id, target.dataset.productId, dragState.categoryId, position);
  dragState = null;
  clearDropLines();
  markDirty();
  render();
  toast("تم تحديث الترتيب");
});

$("#categoryList").addEventListener("dragend", () => {
  dragState = null;
  clearDropLines();
  $$(".dragging").forEach((element) => element.classList.remove("dragging"));
});

initializeAdmin();
setInterval(renderLiveVisitors, 10000);
