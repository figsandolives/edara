const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const DRAFT_KEY = "figsOlivesStoreAdminDraftV2";
const DB_NAME = "figsOlivesStoreAssets";
const DB_STORE = "assets";
const ADMIN_EMAILS = new Set(["sultan.figsolives@gmail.com", "figsandolives.kw@gmail.com"]);
const firebaseServices = window.ORDERING_FIREBASE;

let categories = [];
let products = [];
let siteCategories = [];
let siteProducts = [];
let editingImages = [];
let pendingImageDeletes = new Set();
let openCategories = new Set();
let dragState = null;
let toastTimer;
let syncTimer;
let currentAdmin = null;
let catalogRef = null;
let ignoreRemoteUntil = 0;
const assetUrls = new Map();

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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
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
      order: index + 1
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
      description: clean(product.description),
      descriptionEn: clean(product.descriptionEn),
      category: clean(product.category),
      price: Number(product.price) || 0,
      images,
      image: images[0] || "",
      order: Number(product.order) || index + 1
    };
  });
  categories.forEach((category) => normalizeProductOrder(category.id));
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
  [siteProducts, siteCategories] = await Promise.all([
    fetchFirst(["../products.json", "../منصة الطلبات/products.json", "products.json"]),
    fetchFirst(["../categories.json", "../منصة الطلبات/categories.json", "categories.json"])
  ]);
}

function applyRemoteCatalog(catalog) {
  products = Array.isArray(catalog?.products) ? catalog.products : [];
  categories = Array.isArray(catalog?.categories) ? catalog.categories : [];
  siteProducts = clone(products);
  siteCategories = clone(categories);
  normalizeData();
  render();
}

async function loadData() {
  if (!firebaseServices || !currentAdmin) throw new Error("تعذر الاتصال بـ Firebase");
  catalogRef = firebaseServices.database.ref("orderingPlatform/catalog");
  const snapshot = await catalogRef.once("value");
  if (snapshot.exists()) {
    applyRemoteCatalog(snapshot.val());
    $("#saveState").textContent = "تم تحميل آخر نسخة من Firebase";
  } else {
    await loadFallbackData();
    products = clone(siteProducts);
    categories = clone(siteCategories);
    normalizeData();
    render();
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
}

function categoryProducts(categoryId) {
  return products
    .filter((product) => product.category === categoryId)
    .sort((a, b) => Number(a.order) - Number(b.order));
}

function imageSource(product) {
  const source = product.images?.[0] || product.image || "";
  return assetUrls.get(source) || source;
}

function render() {
  normalizeData();
  $("#categoryCount").textContent = categories.length;
  $("#productCount").textContent = products.length;
  $("#categoryList").innerHTML = categories.map((category) => {
    const list = categoryProducts(category.id);
    return `
      <article class="category-card ${openCategories.has(category.id) ? "open" : ""}" data-category-id="${escapeHtml(category.id)}">
        <div class="category-head">
          <span class="drag-handle" draggable="true" data-drag-kind="category" data-drag-id="${escapeHtml(category.id)}" title="اسحب لتغيير الترتيب">⠿</span>
          <div class="category-copy">
            <strong>${escapeHtml(category.nameAr)}</strong>
            <small>${escapeHtml(category.nameEn)}</small>
          </div>
          <span class="count-badge">${list.length} منتج</span>
          <div class="category-actions">
            <button data-add-product="${escapeHtml(category.id)}">إضافة منتج</button>
            <button data-edit-category="${escapeHtml(category.id)}">تعديل</button>
            <button class="delete" data-delete-category="${escapeHtml(category.id)}">حذف</button>
          </div>
          <span class="chevron">⌄</span>
        </div>
        <div class="products">
          ${list.length ? list.map((product) => `
            <div class="product-row" data-product-id="${escapeHtml(product.id)}" data-category-id="${escapeHtml(category.id)}">
              <span class="drag-handle" draggable="true" data-drag-kind="product" data-drag-id="${escapeHtml(product.id)}" data-drag-category="${escapeHtml(category.id)}" title="اسحب لتغيير الترتيب">⠿</span>
              <div class="product-main">
                <img src="${escapeHtml(imageSource(product))}" alt="" loading="lazy">
                <div class="product-copy">
                  <strong>${escapeHtml(product.name || "منتج بلا اسم")}</strong>
                  <small>${escapeHtml(product.nameEn || "No English name")}</small>
                </div>
              </div>
              <span class="price">${Number(product.price).toFixed(3)} د.ك</span>
              <div class="product-actions">
                <button data-edit-product="${escapeHtml(product.id)}">تعديل</button>
                <button class="delete" data-delete-product="${escapeHtml(product.id)}">حذف</button>
              </div>
            </div>
          `).join("") : `<div class="empty">لا توجد منتجات في هذا القسم</div>`}
        </div>
      </article>
    `;
  }).join("");

  hydrateRenderedImages();
}

async function hydrateRenderedImages() {
  for (const image of $$(".product-main img")) {
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
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ categories, products, savedAt: new Date().toISOString() }));
  clearTimeout(syncTimer);
  ignoreRemoteUntil = Date.now() + 1200;
  $("#saveState").textContent = "جارٍ الحفظ في Firebase…";
  try {
    await catalogRef.update({
      categories: categories.map((category, index) => ({ ...category, order: index + 1 })),
      products: downloadableProducts(),
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
  $("#categoryDialog").showModal();
  setTimeout(() => $("#categoryNameAr").focus(), 30);
}

function saveCategory(event) {
  event.preventDefault();
  const existingId = $("#categoryId").value;
  const nameAr = clean($("#categoryNameAr").value);
  const nameEn = clean($("#categoryNameEn").value);
  if (!nameAr || !nameEn) return toast("اكتب اسم القسم باللغتين");
  if (existingId) {
    const category = categories.find((item) => item.id === existingId);
    if (category) Object.assign(category, { nameAr, nameEn });
  } else {
    const id = `category-${Date.now().toString(36)}`;
    categories.push({ id, nameAr, nameEn, order: categories.length + 1 });
    openCategories.add(id);
  }
  $("#categoryDialog").close();
  markDirty();
  render();
  toast(existingId ? "تم تعديل القسم" : "تمت إضافة القسم");
}

function deleteCategory(categoryId) {
  const category = categories.find((item) => item.id === categoryId);
  const count = categoryProducts(categoryId).length;
  const warning = count
    ? `القسم يحتوي على ${count} منتج. حذف القسم سيحذف منتجاته أيضاً. هل أنت متأكد؟`
    : "هل تريد حذف هذا القسم؟";
  if (!confirm(warning)) return;
  for (const product of categoryProducts(categoryId)) {
    for (const imageUrl of product.images || []) {
      if (!imageUrl.includes("firebasestorage.googleapis.com")) continue;
      firebaseServices.storage.refFromURL(imageUrl).delete().catch(error => console.warn("Image cleanup failed", error));
    }
  }
  categories = categories.filter((item) => item.id !== categoryId);
  products = products.filter((product) => product.category !== categoryId);
  openCategories.delete(categoryId);
  markDirty();
  render();
  toast("تم حذف القسم");
}

function fillCategorySelect(selectedId = "") {
  $("#productCategory").innerHTML = categories.map((category) =>
    `<option value="${escapeHtml(category.id)}" ${category.id === selectedId ? "selected" : ""}>${escapeHtml(category.nameAr)} — ${escapeHtml(category.nameEn)}</option>`
  ).join("");
}

async function openProductDialog(product = null, categoryId = "") {
  if (!categories.length) {
    toast("أضف قسماً أولاً");
    return;
  }
  $("#productDialogTitle").textContent = product ? "تعديل المنتج" : "إضافة منتج جديد";
  $("#productId").value = product?.id || "";
  fillCategorySelect(product?.category || categoryId || categories[0].id);
  $("#productPrice").value = product ? Number(product.price).toFixed(3) : "0.000";
  $("#productNameAr").value = product?.name || "";
  $("#productNameEn").value = product?.nameEn || "";
  $("#productDescriptionAr").value = product?.description || "";
  $("#productDescriptionEn").value = product?.descriptionEn || "";
  editingImages = [...(product?.images || [product?.image].filter(Boolean))];
  pendingImageDeletes = new Set();
  $("#imageUrl").value = "";
  await renderImageEditor();
  $("#productDialog").showModal();
  setTimeout(() => $("#productNameAr").focus(), 30);
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
  const price = Number($("#productPrice").value);
  if (!categoryId || !name || !nameEn || !Number.isFinite(price) || price < 0) {
    return toast("أكمل القسم والاسمين والسعر");
  }
  const payload = {
    category: categoryId,
    name,
    nameEn,
    price: Number(price.toFixed(3)),
    description: clean($("#productDescriptionAr").value),
    descriptionEn: clean($("#productDescriptionEn").value),
    images: [...editingImages],
    image: editingImages[0] || ""
  };
  if (existingId) {
    const product = products.find((item) => item.id === existingId);
    if (product) Object.assign(product, payload);
  } else {
    const id = `P${Date.now()}`;
    products.push({ id, ...payload, order: categoryProducts(categoryId).length + 1 });
    openCategories.add(categoryId);
  }
  categories.forEach((category) => normalizeProductOrder(category.id));
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

function deleteProduct(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product || !confirm(`هل تريد حذف المنتج «${product.name}»؟`)) return;
  for (const imageUrl of product.images || []) {
    if (!imageUrl.includes("firebasestorage.googleapis.com")) continue;
    firebaseServices.storage.refFromURL(imageUrl).delete().catch(error => console.warn("Image cleanup failed", error));
  }
  products = products.filter((item) => item.id !== productId);
  normalizeProductOrder(product.category);
  markDirty();
  render();
  toast("تم حذف المنتج");
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
  $("#saveState").textContent = "جارٍ تجهيز النسخة الاحتياطية…";
  try {
    if (!window.JSZip) throw new Error("تعذر تحميل أداة ZIP");
    const zip = new JSZip();
    zip.file("products.json", JSON.stringify(exportProducts, null, 2) + "\n");
    zip.file("categories.json", JSON.stringify(exportCategories, null, 2) + "\n");
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
      catalogRef = null;
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
$("#addProduct").addEventListener("click", () => openProductDialog());
$("#categoryForm").addEventListener("submit", saveCategory);
$("#productForm").addEventListener("submit", saveProduct);
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = document.getElementById(button.dataset.closeDialog);
    if (dialog?.open) dialog.close();
  });
});
$("#saveDraft").addEventListener("click", saveDraft);
$("#resetData").addEventListener("click", resetDraft);
$("#exportData").addEventListener("click", exportData);
$("#importData").addEventListener("change", (event) => importJson([...event.target.files]));
$("#productImages").addEventListener("change", (event) => {
  addImageFiles([...event.target.files]);
  event.target.value = "";
});
$("#addImageUrl").addEventListener("click", addImageUrl);

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
  const addProductButton = event.target.closest("[data-add-product]");
  const editCategoryButton = event.target.closest("[data-edit-category]");
  const deleteCategoryButton = event.target.closest("[data-delete-category]");
  const editProductButton = event.target.closest("[data-edit-product]");
  const deleteProductButton = event.target.closest("[data-delete-product]");
  if (addProductButton) return openProductDialog(null, addProductButton.dataset.addProduct);
  if (editCategoryButton) return openCategoryDialog(categories.find((category) => category.id === editCategoryButton.dataset.editCategory));
  if (deleteCategoryButton) return deleteCategory(deleteCategoryButton.dataset.deleteCategory);
  if (editProductButton) return openProductDialog(products.find((product) => product.id === editProductButton.dataset.editProduct));
  if (deleteProductButton) return deleteProduct(deleteProductButton.dataset.deleteProduct);
  if (event.target.closest("button,.drag-handle")) return;
  const header = event.target.closest(".category-head");
  if (!header) return;
  const id = header.closest(".category-card").dataset.categoryId;
  openCategories.has(id) ? openCategories.delete(id) : openCategories.add(id);
  header.closest(".category-card").classList.toggle("open", openCategories.has(id));
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
  const source = dragState.kind === "category"
    ? handle.closest(".category-card")
    : handle.closest(".product-row");
  setTimeout(() => source?.classList.add("dragging"), 0);
});

$("#categoryList").addEventListener("dragover", (event) => {
  if (!dragState) return;
  const target = dragState.kind === "category"
    ? event.target.closest(".category-card")
    : event.target.closest(`.product-row[data-category-id="${CSS.escape(dragState.categoryId)}"]`);
  if (!target) return;
  const targetId = dragState.kind === "category" ? target.dataset.categoryId : target.dataset.productId;
  if (targetId === dragState.id) return;
  event.preventDefault();
  clearDropLines();
  target.classList.add(dropPosition(event, target) === "before" ? "drop-before" : "drop-after");
});

$("#categoryList").addEventListener("drop", (event) => {
  if (!dragState) return;
  const target = dragState.kind === "category"
    ? event.target.closest(".category-card")
    : event.target.closest(`.product-row[data-category-id="${CSS.escape(dragState.categoryId)}"]`);
  if (!target) return;
  event.preventDefault();
  const position = target.classList.contains("drop-after") ? "after" : "before";
  if (dragState.kind === "category") reorderCategory(dragState.id, target.dataset.categoryId, position);
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
