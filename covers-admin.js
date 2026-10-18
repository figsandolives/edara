// covers-admin.js — إدارة الأغلفة.
// الغلاف = صفحة مستقلة في المنصة (?cover=<id>) فيها عناوين وأقسام.
// أي عنوان أو قسم داخل غلاف يختفي من «الأقسام»، ويرجع لها لما ينشال من الغلاف أو ينحذف الغلاف.
// يعتمد على متغيرات script.js (covers, headings, categories, products, render, markDirty...).

const COVER_SIZES = {
  full: { label: "حجم كامل", width: 1600, height: 680, hint: "القياس المطلوب: 1600 × 680 بكسل (عرض الهاتف كامل)." },
  half: { label: "نصف حجم", width: 800, height: 700, hint: "القياس المطلوب: 800 × 700 بكسل (غلافين جنب بعض)." }
};
let activeAdminCoverId = "";
let coverRemoveMode = false;
let coverDraft = null;
let coverHelperDraft = [];
let coverSectionsPicked = new Set();
let draggedCoverId = "";

function normalizeAdminCovers(list) {
  return (Array.isArray(list) ? list : []).map((cover, index) => ({
    id: clean(cover?.id) || `cover-${Date.now().toString(36)}-${index}`,
    nameAr: clean(cover?.nameAr), nameEn: clean(cover?.nameEn),
    descriptionAr: clean(cover?.descriptionAr), descriptionEn: clean(cover?.descriptionEn),
    size: cover?.size === "full" ? "full" : "half",
    image: clean(cover?.image),
    helperProductIds: (Array.isArray(cover?.helperProductIds) ? cover.helperProductIds : []).map(String).filter(Boolean).slice(0, 3),
    items: (Array.isArray(cover?.items) ? cover.items : []).map(item => ({ type: item?.type === "heading" ? "heading" : "category", id: String(item?.id || "") })).filter(item => item.id),
    filtered: cover?.filtered === true,
    imageMode: cover?.imageMode === "animated" ? "animated" : "photo",
    mosaic: normalizeCoverMosaic(cover?.mosaic),
    sourceFilterId: clean(cover?.sourceFilterId),
    products: (Array.isArray(cover?.products) ? cover.products : []).map(entry => ({ productId: String(entry?.productId || ""), firstStepId: clean(entry?.firstStepId), optionIds: (Array.isArray(entry?.optionIds) ? entry.optionIds : []).map(String), steps: (Array.isArray(entry?.steps) ? entry.steps : []).map(step => ({ stepId: clean(step?.stepId), optionIds: (Array.isArray(step?.optionIds) ? step.optionIds : []).map(String) })).filter(step => step.stepId) })).filter(entry => entry.productId),
    sectionOrder: (Array.isArray(cover?.sectionOrder) ? cover.sectionOrder : []).map(String),
    productOrder: Object.fromEntries(Object.entries(cover?.productOrder && typeof cover.productOrder === "object" ? cover.productOrder : {}).map(([key, ids]) => [String(key), (Array.isArray(ids) ? ids : []).map(String)]))
  }));
}

function adminHeadingCategoryIds(heading) {
  return [...(heading?.subheadings || []).flatMap(group => group.categoryIds || []), ...(heading?.categoryIds || [])].map(String);
}
// Only regular covers own their sections; a filtered cover holds copies.
function coverOf(type, id) { return covers.find(cover => !cover.filtered && cover.items.some(item => item.type === type && String(item.id) === String(id))) || null; }
function activeAdminCover() { return covers.find(cover => cover.id === activeAdminCoverId) || null; }

// Called by render() in script.js: a heading/category shows either in «الأقسام»
// (when no cover holds it) or inside the cover page that holds it.
function coverEntryVisible(type, id) {
  if (activeAdminCover()?.filtered) return false;
  const holder = coverOf(type, id);
  return activeAdminCoverId ? holder?.id === activeAdminCoverId : !holder;
}

// Same count as the storefront: active products in active categories.
function coverProductCount(cover) {
  if (cover.filtered) {
    const activeCategoryIds = new Set(categories.filter(category => category.active !== false).map(category => String(category.id)));
    return cover.products.map(entry => productById(entry.productId)).filter(product => product && product.active !== false && activeCategoryIds.has(String(product.category))).length;
  }
  const ids = cover.items.flatMap(item => item.type === "heading" ? adminHeadingCategoryIds(headings.find(heading => heading.id === item.id)) : [item.id]);
  const activeIds = new Set(categories.filter(category => category.active !== false && ids.includes(String(category.id))).map(category => String(category.id)));
  return products.filter(product => product.active !== false && activeIds.has(String(product.category))).length;
}
function coverItemsLabel(count) { return `${count} ${count > 2 && count < 11 ? "أصناف" : "صنف"}`; }
// Card-sized copy of a photo, like thumbnailUrl() in the storefront.
function coverThumb(url) {
  const value = String(url || "");
  if (/^local-data\/assets\//.test(value)) return value.replace(/^local-data\/assets\//, "local-data/thumbs/");
  return value.replace(/^(https:\/\/162-35-27-249\.sslip\.io)\/platform-assets\/(orderingPlatform\/catalog\/[^?#]+\.(?:webp|jpe?g|png))$/i, "$1/platform-thumbs/$2");
}
function thumbImg(src, extra = "") {
  const full = escapeHtml(src);
  return `<img src="${escapeHtml(coverThumb(src))}" data-full="${full}" onerror="if(this.dataset.full&&this.src.indexOf(this.dataset.full)<0){this.src=this.dataset.full}" alt="" loading="lazy" ${extra}>`;
}
function productById(id) { return products.find(product => String(product.id) === String(id)); }

// Products a cover shows, for its moving photos.
function coverDisplayProducts(cover) {
  if (cover.filtered) return cover.products.map(entry => productById(entry.productId)).filter(product => product && product.active !== false);
  const ids = cover.items.flatMap(item => item.type === "heading" ? adminHeadingCategoryIds(headings.find(heading => heading.id === item.id)) : [item.id]);
  return ids.flatMap(id => categoryProducts(id)).filter(product => product.active !== false);
}
// Same rules and markup as coverMosaicMarkup() in the storefront: 4 rows of up to 10 slots,
// an empty row takes the cover's product photos.
const COVER_MOSAIC_ROWS = 4;
const COVER_MOSAIC_SLOTS = 10;
function normalizeCoverMosaic(value) {
  const rows = Array.from({ length: COVER_MOSAIC_ROWS }, (_, row) => Array.from({ length: COVER_MOSAIC_SLOTS }, (_, index) => {
    const slot = value?.rows?.[row]?.[index];
    if (slot?.type === "product" && slot.productId) return { type: "product", productId: String(slot.productId) };
    if (slot?.type === "image" && slot.url) return { type: "image", url: String(slot.url) };
    return null;
  }));
  return { speed: Math.min(10, Math.max(1, Number(value?.speed) || 5)), rows };
}
function mosaicSlotImage(slot) {
  if (slot?.type === "image") return slot.url;
  if (slot?.type === "product") { const product = productById(slot.productId); return product ? coverThumb(imageSource(product)) : ""; }
  return "";
}
function adminCoverMosaic(cover) {
  const mosaic = cover.mosaic || normalizeCoverMosaic();
  const auto = [...new Set(coverDisplayProducts(cover).map(imageSource).filter(Boolean))].map(coverThumb);
  const rows = Array.from({ length: COVER_MOSAIC_ROWS }, (_, row) => {
    // Same as the storefront: an empty slot takes one of the cover's product photos.
    let images = Array.from({ length: COVER_MOSAIC_SLOTS }, (_, index) => mosaicSlotImage(mosaic.rows[row]?.[index]) || (auto.length ? auto[(row * COVER_MOSAIC_SLOTS + index) % auto.length] : "")).filter(Boolean);
    while (images.length && images.length < 8) images = [...images, ...images];
    return images;
  });
  if (!rows.some(images => images.length)) return "";
  return `<span class="cover-mosaic rows-${COVER_MOSAIC_ROWS}" aria-hidden="true">${rows.map((images, row) => {
    const cells = images.map(src => `<img src="${escapeHtml(src)}" alt="" draggable="false">`).join("");
    return `<span class="cover-mosaic-row"><span class="cover-mosaic-track" style="--mosaic-duration:${((150 / mosaic.speed) * (1 + row * .22)).toFixed(1)}s">${cells}${cells}</span></span>`;
  }).join("")}</span>`;
}

// Exactly the storefront tile (covers.css) plus the admin's edit button.
function adminCoverTileMarkup(cover, { preview = false } = {}) {
  const count = coverProductCount(cover);
  return `<div class="world-tile size-${cover.size}${cover.imageMode === "animated" ? " is-animated" : ""}${preview ? " is-preview" : ""}" ${preview ? "" : `draggable="true" data-cover-id="${escapeHtml(cover.id)}" tabindex="0" title="اضغط مرتين للدخول"`}>
    ${cover.imageMode === "animated" ? (adminCoverMosaic(cover) || `<span class="cover-tile-empty">أضف منتجات عشان تتحرك صورها</span>`) : (cover.image ? `<img src="${escapeHtml(cover.image)}" alt="" draggable="false">` : `<span class="cover-tile-empty">بدون صورة</span>`)}
    <span class="world-tile-copy"><strong>${escapeHtml(cover.nameAr || "اسم الغلاف")}</strong>${cover.descriptionAr ? `<small>${escapeHtml(cover.descriptionAr)}</small>` : ""}</span>
    <span class="world-tile-count">${coverItemsLabel(count)}</span>
    ${preview ? "" : `<button type="button" class="cover-tile-edit" data-cover-edit="${escapeHtml(cover.id)}">تعديل</button>`}
  </div>`;
}

function coverBannerPreviewMarkup(cover) {
  const helpers = cover.helperProductIds.map(productById).filter(Boolean).map(imageSource).filter(Boolean);
  return `<header class="world-cover${cover.imageMode === "animated" ? " is-animated" : ""}">
    <div class="world-cover-media">${cover.imageMode === "animated" ? adminCoverMosaic(cover) : (cover.image ? `<img src="${escapeHtml(cover.image)}" alt="">` : "")}</div>
    <div class="world-cover-copy"><h1>${escapeHtml(cover.nameAr)}</h1>${cover.descriptionAr ? `<p>${escapeHtml(cover.descriptionAr)}</p>` : ""}<span class="world-cover-count">${coverItemsLabel(coverProductCount(cover))}</span></div>
    ${helpers.length ? `<div class="world-cover-stack">${helpers.map(src => `<img src="${escapeHtml(src)}" alt="">`).join("")}</div>` : ""}
  </header>`;
}

function renderCoversPanel() {
  const grid = $("#coversGrid");
  if (!grid) return;
  const cover = activeAdminCover();
  if (activeAdminCoverId && !cover) activeAdminCoverId = "";
  document.body.classList.toggle("admin-cover-open", Boolean(cover));
  $("#catalogWorkspace")?.classList.toggle("in-cover", Boolean(cover));
  $("#sectionsHead")?.classList.toggle("hidden", Boolean(cover));
  $("#coverPageHead")?.classList.toggle("hidden", !cover);
  $("#coverPageBanner").innerHTML = cover ? coverBannerPreviewMarkup(cover) : "";
  grid.innerHTML = covers.length ? covers.map(item => adminCoverTileMarkup(item)).join("") : `<div class="covers-empty"><p>ما في أغلفة بعد. اضغط + لإضافة غلاف، أو أضف الأغلفة الست الجاهزة (المعجنات، الخبز، الإفطار، الغداء، المقبلات والسلطات، الحلويات).</p><button type="button" class="primary" id="addReadyCovers">إضافة الأغلفة الست الجاهزة</button></div>`;
  const toggle = $("#coverRemoveToggle");
  if (toggle) { toggle.textContent = coverRemoveMode ? "إلغاء" : "حذف أقسام"; toggle.classList.toggle("active", coverRemoveMode); toggle.classList.toggle("hidden", Boolean(cover?.filtered)); }
  $("#coverAddSections").textContent = cover?.filtered ? "+ إضافة منتجات" : "+ إضافة قسم";
  if (cover?.filtered) { $("#categoryList").classList.remove("cover-remove-mode"); $("#categoryList").innerHTML = filteredCoverMarkup(cover); return; }
  $("#categoryList")?.classList.toggle("cover-remove-mode", Boolean(cover && coverRemoveMode));
  if (cover) {
    // Every top-level card inside the cover gets a remove mark in «حذف أقسام» mode.
    $$(":scope > .category-card", $("#categoryList")).forEach(card => {
      const type = card.classList.contains("heading-card") ? "heading" : "category";
      const id = card.dataset.headingId || card.dataset.categoryId;
      card.insertAdjacentHTML("afterbegin", `<button type="button" class="cover-item-remove" data-cover-remove-type="${type}" data-cover-remove-id="${escapeHtml(id)}" aria-label="إخراج من الغلاف" title="إخراج من الغلاف">×</button>`);
    });
    if (!$("#categoryList").children.length) $("#categoryList").innerHTML = `<div class="empty">الغلاف فاضي. اضغط «+ إضافة قسم» لإضافة أقسام أو عناوين.</div>`;
  }
}

function openAdminCover(id) {
  activeAdminCoverId = id;
  coverRemoveMode = false;
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function closeAdminCover() {
  activeAdminCoverId = "";
  coverRemoveMode = false;
  render();
  $("#catalogWorkspace")?.scrollIntoView({ block: "start" });
}

// الأغلفة الست الجاهزة (من نسخة التجارب). تنضاف بضغطة زر لما ما يكون في أغلفة،
// والصورة تنقرأ من صورة المنتج في الكتالوج الحالي.
const READY_COVERS = [
  { id: "cover-pastries", nameAr: "المعجنات", nameEn: "Pastries", descriptionAr: "فطائر، كرواسو، بيتزا وخبز محشي", descriptionEn: "Fatayer, croissants, pizza and stuffed bread", size: "full", imageProductId: "P1785680837513", helperProductIds: ["9227", "P1785669670817", "P1785669674179"], items: [{ type: "category", id: "category-msbok23n" }, { type: "category", id: "Fatayer" }, { type: "category", id: "restaurant-2586" }, { type: "category", id: "category-mskq1845" }] },
  { id: "cover-bread", nameAr: "الخبز", nameEn: "Bread", descriptionAr: "قمح كامل، خالي من الجلوتين، وكيتو", descriptionEn: "Whole wheat, gluten free and keto", size: "half", imageProductId: "9230", helperProductIds: ["P1790147192197", "9231", "P1790755102767"], items: [{ type: "heading", id: "heading-mselx1zq" }] },
  { id: "cover-breakfast", nameAr: "الإفطار", nameEn: "Breakfast", descriptionAr: "ريوق المطعم كما يُقدَّم على الطاولة", descriptionEn: "Our restaurant breakfast, as served at the table", size: "half", imageProductId: "R42660", helperProductIds: ["R42653", "R42652", "R48655"], items: [{ type: "category", id: "restaurant-2585" }] },
  { id: "cover-lunch", nameAr: "الغداء", nameEn: "Lunch", descriptionAr: "أطباق رئيسية تنطبخ على الأصول", descriptionEn: "Main dishes cooked the traditional way", size: "half", imageProductId: "R42801", helperProductIds: ["R42800", "R42799", "R42798"], items: [{ type: "category", id: "restaurant-2589" }] },
  { id: "cover-starters", nameAr: "المقبلات والسلطات", nameEn: "Starters & salads", descriptionAr: "مقبلات ساخنة من التنور وسلطات طازجة", descriptionEn: "Hot starters from the oven and fresh salads", size: "half", imageProductId: "R42651", helperProductIds: ["R44535", "R42650", "R42649"], items: [{ type: "category", id: "restaurant-2583" }, { type: "category", id: "restaurant-2581" }] },
  { id: "cover-sweets", nameAr: "الحلويات", nameEn: "Sweets", descriptionAr: "بدون طحين أبيض ولا سكر أبيض", descriptionEn: "No white flour, no white sugar", size: "full", imageProductId: "P1787597855317443", helperProductIds: ["P1792041599892", "P1792042125496", "P1792042158293"], items: [{ type: "heading", id: "heading-msys04ux" }] }
];
function addReadyCovers() {
  const exists = (type, id) => type === "heading" ? headings.some(item => item.id === id) : categories.some(item => item.id === id);
  const ready = READY_COVERS.filter(cover => !covers.some(item => item.id === cover.id)).map(({ imageProductId, ...cover }) => {
    const items = cover.items.filter(item => exists(item.type, item.id) && !coverOf(item.type, item.id));
    const ids = items.flatMap(item => item.type === "heading" ? adminHeadingCategoryIds(headings.find(heading => heading.id === item.id)) : [item.id]);
    const own = productById(imageProductId);
    const image = (own && imageSource(own)) || ids.flatMap(id => categoryProducts(id)).map(imageSource).find(Boolean) || "";
    return { ...cover, image, helperProductIds: cover.helperProductIds.filter(id => productById(id)), items };
  }).filter(cover => cover.items.length && cover.image);
  if (!ready.length) return toast("الأغلفة الجاهزة موجودة أو أقسامها مو موجودة");
  covers = [...covers, ...ready];
  markDirty(); render();
  toast(`تمت إضافة ${ready.length} أغلفة جاهزة`);
}
document.addEventListener("click", event => { if (event.target.closest("#addReadyCovers")) addReadyCovers(); });

// ---------- نافذة إضافة / تعديل الغلاف ----------
function coverFormSize() { return $("input[name='coverSize']:checked")?.value === "full" ? "full" : "half"; }
function coverImageMode() { return $("input[name='coverImageMode']:checked")?.value === "animated" ? "animated" : "photo"; }
// «غلاف مفلتر» يتفعّل بس لما الغلاف فاضي من الأقسام، وما ينطفي وفيه منتجات.
function syncCoverFilteredField() {
  const input = $("#coverFiltered");
  input.checked = Boolean(coverDraft.filtered);
  const locked = coverDraft.filtered ? coverDraft.products.length > 0 : coverDraft.items.length > 0;
  input.disabled = locked;
  $("#coverFilteredField").classList.toggle("locked", locked);
  $("#coverFilteredHint").textContent = locked
    ? (coverDraft.filtered ? "الغلاف فيه منتجات، احذفها من داخل الغلاف أول عشان تقدر تطفي الخيار." : "الغلاف فيه أقسام، طلّعها من الغلاف أول عشان تقدر تفعّل الخيار.")
    : "تضيف له منتجات مختارة بخياراتها بدل الأقسام. الأقسام والمنتجات داخله نسخ وما تختفي من «الأقسام».";
  $("#coverCopyFilterWrap").classList.toggle("hidden", !coverDraft.filtered);
  $("#coverImageField").classList.toggle("hidden", coverImageMode() === "animated");
  $("#coverMosaicField").classList.toggle("hidden", coverImageMode() !== "animated");
}
function renderCoverDialogPreview() {
  if (!coverDraft) return;
  coverDraft.imageMode = coverImageMode();
  $("#coverImageField").classList.toggle("hidden", coverDraft.imageMode === "animated");
  $("#coverMosaicField").classList.toggle("hidden", coverDraft.imageMode !== "animated");
  renderMosaicEditor();
  coverDraft.nameAr = clean($("#coverNameAr").value);
  coverDraft.descriptionAr = clean($("#coverDescriptionAr").value);
  coverDraft.size = coverFormSize();
  $("#coverSizeHint").textContent = COVER_SIZES[coverDraft.size].hint;
  const neighbour = coverDraft.size === "half" ? `<div class="world-tile size-half cover-preview-ghost"><span>غلاف ثاني</span></div>` : "";
  $("#coverPreviewGrid").innerHTML = adminCoverTileMarkup(coverDraft, { preview: true }) + neighbour;
  $("#coverHelperSlots").innerHTML = [0, 1, 2].map(index => {
    const item = productById(coverDraft.helperProductIds[index]);
    return item ? `<span class="cover-helper-slot"><img src="${escapeHtml(imageSource(item))}" alt=""><b>${index + 1}</b><small>${escapeHtml(item.name)}</small></span>` : `<span class="cover-helper-slot empty"><b>${index + 1}</b><small>فاضي</small></span>`;
  }).join("");
}

function openCoverDialog(id = "") {
  const existing = covers.find(cover => cover.id === id);
  coverDraft = existing ? clone(existing) : { id: `cover-${Date.now().toString(36)}`, nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", size: "half", image: "", helperProductIds: [], items: [], filtered: false, imageMode: "photo", mosaic: normalizeCoverMosaic(), sourceFilterId: "", products: [], sectionOrder: [], productOrder: {} };
  coverDraft.mosaic = normalizeCoverMosaic(coverDraft.mosaic);
  $("#coverMosaicSpeed").value = String(coverDraft.mosaic.speed);
  $("#coverMosaicSpeedValue").textContent = String(coverDraft.mosaic.speed);
  $("#coverDialogEyebrow").textContent = existing ? "تعديل الغلاف" : "غلاف جديد";
  $("#coverDialogTitle").textContent = existing ? existing.nameAr || "تعديل الغلاف" : "إضافة غلاف";
  $("#coverSubmit").textContent = existing ? "حفظ التعديل" : "إضافة الغلاف";
  $("#coverDelete").classList.toggle("hidden", !existing);
  $("#coverNameAr").value = coverDraft.nameAr; $("#coverNameEn").value = coverDraft.nameEn;
  $("#coverDescriptionAr").value = coverDraft.descriptionAr; $("#coverDescriptionEn").value = coverDraft.descriptionEn;
  $$("input[name='coverSize']").forEach(input => { input.checked = input.value === coverDraft.size; });
  $$("input[name='coverImageMode']").forEach(input => { input.checked = input.value === coverDraft.imageMode; });
  $("#coverCopyFilter").innerHTML = `<option value="">بدون نسخ</option>` + productFilters.map(filter => `<option value="${escapeHtml(filter.id)}">${escapeHtml(filter.nameAr)} (${filter.products.length} منتج)</option>`).join("");
  $("#coverCopyFilter").value = "";
  syncCoverFilteredField();
  $("#coverImageInput").value = ""; $("#coverImageStatus").textContent = coverDraft.image ? "الصورة الحالية محفوظة" : "";
  renderCoverDialogPreview();
  $("#coverDialog").showModal();
}

async function uploadCoverImage(file, size) {
  if (!file?.type?.startsWith("image/")) throw new Error("اختر ملف صورة صالحاً");
  const target = COVER_SIZES[size];
  const bitmap = await createImageBitmap(file);
  // Crop to the tile's proportions (centre) so the storefront shows the same framing.
  const ratio = target.width / target.height;
  let sw = bitmap.width, sh = bitmap.width / ratio;
  if (sh > bitmap.height) { sh = bitmap.height; sw = sh * ratio; }
  const sx = (bitmap.width - sw) / 2, sy = (bitmap.height - sh) / 2;
  const scale = Math.min(1, target.width / sw);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale); canvas.height = Math.round(sh * scale);
  canvas.getContext("2d").drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .86));
  return uploadPlatformAsset(`orderingPlatform/catalog/appearance/covers/${coverDraft.id}-${Date.now()}.webp`, blob);
}

$("#addCover").addEventListener("click", () => openCoverDialog());
$("#coverEditFromPage").addEventListener("click", () => openCoverDialog(activeAdminCoverId));
["coverNameAr", "coverDescriptionAr"].forEach(id => $(`#${id}`).addEventListener("input", renderCoverDialogPreview));
$$("input[name='coverSize']").forEach(input => input.addEventListener("change", () => {
  renderCoverDialogPreview();
  if (coverDraft?.image) $("#coverImageStatus").textContent = "غيّرت الحجم؟ يفضّل ترفع صورة بالقياس الجديد.";
}));
$("#coverImageInput").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  $("#coverImageStatus").textContent = "جارٍ تجهيز الصورة…";
  try {
    coverDraft.image = await uploadCoverImage(file, coverFormSize());
    $("#coverImageStatus").textContent = "تم رفع الصورة";
    renderCoverDialogPreview();
  } catch (error) { $("#coverImageStatus").textContent = error.message || "تعذر رفع الصورة"; }
});
$("#coverForm").addEventListener("submit", event => {
  event.preventDefault();
  const nameAr = clean($("#coverNameAr").value), nameEn = clean($("#coverNameEn").value);
  if (!nameAr || !nameEn) return toast("اكتب اسم الغلاف باللغتين");
  const imageMode = coverImageMode();
  if (imageMode === "photo" && !coverDraft.image) return toast("اختر صورة للغلاف");
  Object.assign(coverDraft, { nameAr, nameEn, descriptionAr: clean($("#coverDescriptionAr").value), descriptionEn: clean($("#coverDescriptionEn").value), size: coverFormSize(), imageMode });
  if (coverDraft.filtered) syncFilteredOrders(coverDraft);
  const index = covers.findIndex(cover => cover.id === coverDraft.id);
  if (index >= 0) covers[index] = coverDraft; else covers.push(coverDraft);
  $("#coverDialog").close();
  markDirty(); render();
  toast(index >= 0 ? "تم تعديل الغلاف" : "تمت إضافة الغلاف");
});
$("#coverDelete").addEventListener("click", () => {
  const cover = covers.find(item => item.id === coverDraft?.id);
  if (!cover) return;
  if (!confirm(`حذف غلاف «${cover.nameAr}»؟ الأقسام اللي داخله ترجع لصفحة الأقسام.`)) return;
  covers = covers.filter(item => item.id !== cover.id);
  if (activeAdminCoverId === cover.id) activeAdminCoverId = "";
  $("#coverDialog").close();
  markDirty(); render();
  toast("تم حذف الغلاف ورجعت أقسامه لصفحة الأقسام");
});

// ---------- الصور المساعدة ----------
function renderCoverHelperPicker() {
  const query = clean($("#coverHelperSearch").value).toLocaleLowerCase();
  const list = products.filter(product => product.active !== false && imageSource(product) && (!query || [product.name, product.nameEn].some(name => String(name || "").toLocaleLowerCase().includes(query)))).slice(0, 120);
  $("#coverHelperPicked").innerHTML = [0, 1, 2].map(index => {
    const item = productById(coverHelperDraft[index]);
    return item ? `<button type="button" class="cover-helper-slot" data-helper-unpick="${escapeHtml(item.id)}" title="إزالة"><img src="${escapeHtml(imageSource(item))}" alt=""><b>${index + 1}</b><small>${escapeHtml(item.name)}</small><i>×</i></button>` : `<span class="cover-helper-slot empty"><b>${index + 1}</b><small>الصورة ${["الأولى", "الثانية", "الثالثة"][index]}</small></span>`;
  }).join("");
  $("#coverHelperResults").innerHTML = list.map(product => {
    const position = coverHelperDraft.indexOf(String(product.id));
    return `<button type="button" class="cover-product-card ${position >= 0 ? "picked" : ""}" data-helper-pick="${escapeHtml(product.id)}">${thumbImg(imageSource(product))}${position >= 0 ? `<b>${position + 1}</b>` : ""}<span>${escapeHtml(product.name)}</span></button>`;
  }).join("") || `<div class="empty">ما في منتجات بهالاسم</div>`;
}
$("#coverPickHelpers").addEventListener("click", () => {
  coverHelperDraft = [...(coverDraft?.helperProductIds || [])];
  $("#coverHelperSearch").value = "";
  renderCoverHelperPicker();
  $("#coverHelpersDialog").showModal();
});
$("#coverHelperSearch").addEventListener("input", renderCoverHelperPicker);
$("#coverHelpersDialog").addEventListener("click", event => {
  const pick = event.target.closest("[data-helper-pick]");
  const unpick = event.target.closest("[data-helper-unpick]");
  const id = pick?.dataset.helperPick || unpick?.dataset.helperUnpick;
  if (!id) return;
  if (coverHelperDraft.includes(id)) coverHelperDraft = coverHelperDraft.filter(value => value !== id);
  else if (coverHelperDraft.length < 3) coverHelperDraft.push(id);
  else toast("اخترت 3 صور. شيل وحدة قبل ما تختار غيرها");
  renderCoverHelperPicker();
});
$("#coverHelpersDone").addEventListener("click", () => {
  coverDraft.helperProductIds = [...coverHelperDraft];
  $("#coverHelpersDialog").close();
  renderCoverDialogPreview();
});

// ---------- الأغلفة في القائمة: سحب، تعديل، دخول ----------
const coversGrid = $("#coversGrid");
coversGrid.addEventListener("click", event => {
  const edit = event.target.closest("[data-cover-edit]");
  if (edit) { event.stopPropagation(); openCoverDialog(edit.dataset.coverEdit); }
});
coversGrid.addEventListener("dblclick", event => {
  if (event.target.closest("[data-cover-edit]")) return;
  const tile = event.target.closest("[data-cover-id]");
  if (tile) openAdminCover(tile.dataset.coverId);
});
coversGrid.addEventListener("keydown", event => {
  const tile = event.target.closest("[data-cover-id]");
  if (tile && event.key === "Enter") openAdminCover(tile.dataset.coverId);
});
coversGrid.addEventListener("dragstart", event => {
  const tile = event.target.closest("[data-cover-id]");
  if (!tile) return;
  draggedCoverId = tile.dataset.coverId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedCoverId);
  requestAnimationFrame(() => tile.classList.add("cover-dragging"));
});
coversGrid.addEventListener("dragover", event => {
  const tile = event.target.closest("[data-cover-id]");
  if (!draggedCoverId || !tile || tile.dataset.coverId === draggedCoverId) return;
  event.preventDefault();
  $$(".cover-drop-target", coversGrid).forEach(item => item.classList.remove("cover-drop-target"));
  tile.classList.add("cover-drop-target");
});
coversGrid.addEventListener("drop", event => {
  event.preventDefault();
  const tile = event.target.closest("[data-cover-id]");
  const from = covers.findIndex(cover => cover.id === draggedCoverId);
  const to = covers.findIndex(cover => cover.id === tile?.dataset.coverId);
  draggedCoverId = "";
  if (from < 0 || to < 0 || from === to) return render();
  const [moved] = covers.splice(from, 1);
  covers.splice(to, 0, moved);
  markDirty(); render();
  toast("تم تحديث ترتيب الأغلفة");
});
coversGrid.addEventListener("dragend", () => { draggedCoverId = ""; $$(".cover-dragging,.cover-drop-target", coversGrid).forEach(item => item.classList.remove("cover-dragging", "cover-drop-target")); });

// ---------- داخل الغلاف ----------
$("#coverPageBack").addEventListener("click", closeAdminCover);
$("#coverRemoveToggle").addEventListener("click", () => { coverRemoveMode = !coverRemoveMode; render(); });
$("#categoryList").addEventListener("click", event => {
  const remove = event.target.closest("[data-cover-remove-id]");
  if (!remove) return;
  event.stopPropagation(); event.preventDefault();
  const cover = activeAdminCover();
  if (!cover) return;
  const { coverRemoveType: type, coverRemoveId: id } = remove.dataset;
  cover.items = cover.items.filter(item => !(item.type === type && String(item.id) === String(id)));
  const name = type === "heading" ? headings.find(item => item.id === id)?.nameAr : categories.find(item => item.id === id)?.nameAr;
  markDirty(); render();
  toast(`رجع «${name || "القسم"}» لصفحة الأقسام`);
}, true);

// Cards for every heading and every category that is not under a heading and not in a cover.
function coverSectionCandidates() {
  const linked = new Set(headings.flatMap(adminHeadingCategoryIds));
  const thumbs = ids => ids.flatMap(id => categoryProducts(id)).map(imageSource).filter(Boolean).slice(0, 3);
  const headingCards = headings.filter(heading => !coverOf("heading", heading.id)).map(heading => {
    const ids = adminHeadingCategoryIds(heading);
    const subheadings = (heading.subheadings || []).map(group => group.nameAr).filter(Boolean);
    return { type: "heading", id: heading.id, order: Number(heading.order) || 0, name: heading.nameAr, meta: `عنوان · ${ids.length} قسم${subheadings.length ? ` · ${subheadings.join("، ")}` : ""}`, thumbs: thumbs(ids) };
  });
  const categoryCards = categories.filter(category => !linked.has(String(category.id)) && !coverOf("category", category.id)).map(category => ({
    type: "category", id: category.id, order: Number(category.order) || 0, name: category.nameAr, restaurant: catalogTypeOf(category) === "restaurant", inactive: category.active === false,
    meta: `قسم · ${categoryProducts(category.id).length} منتج`, thumbs: thumbs([category.id])
  }));
  return [...headingCards, ...categoryCards].sort((a, b) => a.order - b.order || (a.type === "heading" ? -1 : 1));
}
function renderCoverSections() {
  const query = clean($("#coverSectionsSearch").value).toLocaleLowerCase();
  const list = coverSectionCandidates().filter(item => !query || String(item.name).toLocaleLowerCase().includes(query));
  $("#coverSectionsGrid").innerHTML = list.map(item => {
    const key = `${item.type}:${item.id}`, picked = coverSectionsPicked.has(key);
    return `<article class="cover-section-card ${picked ? "picked" : ""} ${item.type === "heading" ? "is-heading" : ""}" data-section-key="${escapeHtml(key)}">
      <div class="cover-section-thumbs">${item.thumbs.map(src => thumbImg(src)).join("") || `<span>بدون صور</span>`}</div>
      <div class="cover-section-copy"><strong>${escapeHtml(item.name)}${item.restaurant ? ` <span class="catalog-type-badge">مطعم</span>` : ""}${item.inactive ? ` <span class="cover-inactive">مقفل</span>` : ""}</strong><small>${escapeHtml(item.meta)}</small></div>
      <button type="button" class="${picked ? "primary" : "secondary"}" data-section-pick="${escapeHtml(key)}">${picked ? "✓ محدد" : "تحديد"}</button>
    </article>`;
  }).join("") || `<div class="empty">كل الأقسام والعناوين داخل أغلفة</div>`;
  $("#coverSectionsCount").textContent = coverSectionsPicked.size ? `${coverSectionsPicked.size} محدد` : "";
}
$("#coverAddSections").addEventListener("click", () => {
  if (activeAdminCover()?.filtered) return openCoverProductsPicker();
  coverSectionsPicked = new Set();
  $("#coverSectionsSearch").value = "";
  $("#coverSectionsTitle").textContent = `إضافة لغلاف «${activeAdminCover()?.nameAr || ""}»`;
  renderCoverSections();
  $("#coverSectionsDialog").showModal();
});
$("#coverSectionsSearch").addEventListener("input", renderCoverSections);
$("#coverSectionsGrid").addEventListener("click", event => {
  const card = event.target.closest("[data-section-key]");
  if (!card) return;
  const key = card.dataset.sectionKey;
  if (coverSectionsPicked.has(key)) coverSectionsPicked.delete(key); else coverSectionsPicked.add(key);
  renderCoverSections();
});
$("#coverSectionsAdd").addEventListener("click", () => {
  const cover = activeAdminCover();
  if (!cover || !coverSectionsPicked.size) return toast("حدد قسم أو عنوان واحد على الأقل");
  coverSectionsPicked.forEach(key => { const [type, ...rest] = key.split(":"); cover.items.push({ type, id: rest.join(":") }); });
  const count = coverSectionsPicked.size;
  $("#coverSectionsDialog").close();
  markDirty(); render();
  toast(`تمت إضافة ${count} للغلاف`);
});

// ---------- الغلاف المفلتر ----------
// منتجات مختارة (نفس نظام فلترة المنتجات) تنعرض مع أقسامها كنسخ:
// ترتيب الأقسام والمنتجات داخله خاص فيه وما يأثر على «الأقسام» ولا على باقي الأغلفة.
let coverProductsSession = false;
let coverOptionEditId = "";

$("#coverFiltered").addEventListener("change", event => {
  if (!coverDraft) return;
  coverDraft.filtered = event.target.checked;
  if (coverDraft.filtered && !$("input[name='coverImageMode'][value='animated']").checked && !coverDraft.image) $("input[name='coverImageMode'][value='animated']").checked = true;
  syncCoverFilteredField();
  renderCoverDialogPreview();
});
$$("input[name='coverImageMode']").forEach(input => input.addEventListener("change", () => { syncCoverFilteredField(); renderCoverDialogPreview(); }));
$("#coverCopyFilter").addEventListener("change", event => {
  const filter = productFilters.find(item => item.id === event.target.value);
  if (!filter || !coverDraft) return;
  coverDraft.products = clone(filter.products);
  coverDraft.sourceFilterId = filter.id;
  syncFilteredOrders(coverDraft);
  renderCoverDialogPreview();
  toast(`انسخت ${filter.products.length} منتج من «${filter.nameAr}» بخياراتها`);
});

// Keep the cover's own section and product order in step with its products.
function syncFilteredOrders(cover) {
  const listed = cover.products.map(entry => productById(entry.productId)).filter(Boolean);
  const categoryRank = id => Number(categories.find(category => String(category.id) === String(id))?.order) || 9999;
  const sectionIds = [...new Set(listed.map(product => String(product.category)))];
  const kept = (cover.sectionOrder || []).filter(id => sectionIds.includes(id));
  cover.sectionOrder = [...kept, ...sectionIds.filter(id => !kept.includes(id)).sort((a, b) => categoryRank(a) - categoryRank(b))];
  const productOrder = {};
  cover.sectionOrder.forEach(id => {
    const inSection = listed.filter(product => String(product.category) === id).map(product => String(product.id));
    const previous = (cover.productOrder?.[id] || []).filter(value => inSection.includes(value));
    const productRank = value => Number(productById(value)?.order) || 9999;
    productOrder[id] = [...previous, ...inSection.filter(value => !previous.includes(value)).sort((a, b) => productRank(a) - productRank(b))];
  });
  cover.productOrder = productOrder;
}

function chosenOptionsText(product, entry) {
  const steps = filterProductSteps(product);
  return steps.map(step => {
    const selected = filterStepSelection(entry, step.id);
    return selected.length ? `${step.titleAr}: ${step.items.filter(option => selected.includes(String(option.id))).map(option => option.nameAr || option.nameEn).join("، ")}` : "";
  }).filter(Boolean).join(" · ") || "كل الخيارات";
}

function filteredCoverMarkup(cover) {
  syncFilteredOrders(cover);
  if (!cover.products.length) return `<div class="empty">الغلاف المفلتر فاضي. اضغط «+ إضافة منتجات» واختار المنتجات وخياراتها.</div>`;
  return `<p class="filtered-cover-note">الأقسام والمنتجات هني نسخ خاصة بهالغلاف: ترتيبها ما يأثر على «الأقسام». تقدر تعدّل خيارات المنتج أو تحذفه بس. اسحب ⠿ للترتيب.</p>` + cover.sectionOrder.map(categoryId => {
    const category = categories.find(item => String(item.id) === categoryId);
    const rows = (cover.productOrder[categoryId] || []).map(productId => {
      const product = productById(productId);
      const entry = cover.products.find(item => item.productId === productId);
      if (!product || !entry) return "";
      const hasSteps = filterProductSteps(product).length > 0;
      return `<div class="product-row filtered-product-row ${product.active === false ? "inactive" : ""}" draggable="true" data-fproduct="${escapeHtml(productId)}" data-fsection-of="${escapeHtml(categoryId)}">
        <span class="drag-handle" title="اسحب لتغيير الترتيب داخل الغلاف">⠿</span>
        <div class="product-main"><img src="${escapeHtml(coverThumb(imageSource(product)))}" alt="" loading="lazy"><div class="product-copy"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(chosenOptionsText(product, entry))}</small></div></div>
        <span class="price">${Number(product.price || 0).toFixed(3)} د.ك</span>
        <div class="product-actions">${hasSteps ? `<button type="button" data-fproduct-options="${escapeHtml(productId)}">خيارات المنتج</button>` : ""}<button type="button" class="delete" data-fproduct-remove="${escapeHtml(productId)}">حذف</button></div>
      </div>`;
    }).join("");
    return `<article class="category-card open filtered-section ${catalogTypeOf(category) === "restaurant" ? "restaurant-category" : ""}" draggable="true" data-fsection="${escapeHtml(categoryId)}">
      <div class="category-head"><span class="drag-handle" title="اسحب لتغيير ترتيب القسم داخل الغلاف">⠿</span><div class="category-copy"><strong>${escapeHtml(category?.nameAr || "قسم")}${catalogTypeOf(category) === "restaurant" ? ` <span class="catalog-type-badge">مطعم</span>` : ""} <span class="copy-badge">نسخة</span></strong><small>${escapeHtml(category?.nameEn || "")}</small></div><span class="count-badge">${(cover.productOrder[categoryId] || []).length} منتج</span></div>
      <div class="products">${rows}</div>
    </article>`;
  }).join("");
}

// إضافة منتجات الغلاف المفلتر: من صفحة المنصة نفسها (وضع الاختيار)، وخيارات كل منتج بنفس صفحات الفلاتر.
function openCoverProductsPicker() {
  const cover = activeAdminCover();
  if (!cover) return;
  pendingFilterSelections = new Map(cover.products.map(entry => [entry.productId, clone(entry)]));
  openStorePicker({
    multi: true,
    title: `منتجات غلاف «${cover.nameAr}»`,
    hint: "اضغط على المنتجات من المنصة عشان تحددها أو تلغيها. المنتج اللي له خيارات تختار خياراته بعدها.",
    selected: [...pendingFilterSelections.keys()],
    onToggle(productId, selected) {
      const product = productById(productId);
      if (!product) return selected;
      if (selected.has(productId)) { selected.delete(productId); pendingFilterSelections.delete(productId); return selected; }
      const steps = filterProductSteps(product);
      selected.add(productId);
      pendingFilterSelections.set(productId, { productId, firstStepId: steps[0]?.id || "", optionIds: [], steps: steps.map(step => ({ stepId: step.id, optionIds: [] })) });
      if (steps.length) openFilterOptionSteps(productId);
      return selected;
    },
    onConfirm() {
      for (const entry of pendingFilterSelections.values()) {
        const product = productById(entry.productId);
        for (const step of filterProductSteps(product)) {
          if (filterStepItems(product, step, entry).length && !filterStepSelection(entry, step.id).length) { toast(`أكمل خيارات المنتج «${product.name}» قبل الحفظ`); openFilterOptionSteps(entry.productId); return false; }
        }
      }
      const target = activeAdminCover();
      target.products = [...pendingFilterSelections.values()];
      syncFilteredOrders(target);
      markDirty(); render();
      toast(`صار في الغلاف ${target.products.length} منتج`);
      return true;
    }
  });
}

// ---------- نافذة المنصة (وضع الاختيار) ----------
// المنصة نفسها تنفتح داخل iframe: بالنسخة المحلية من «/»، وبالإدارة المنشورة من مجلد picker/.
let storePicker = null;
function storePickerUrl() { return window.LOCAL_MODE ? "/?picker=1" : "picker/?picker=1"; }
function sendPickerState() {
  if (!storePicker) return;
  $("#storePickerFrame").contentWindow?.postMessage({ type: "fo-picker-state", selected: [...storePicker.selected] }, location.origin);
  $("#storePickerCount").textContent = storePicker.multi ? `${storePicker.selected.size} منتج محدد` : (storePicker.selected.size ? `محدد: ${productById([...storePicker.selected][0])?.name || ""}` : "");
}
function openStorePicker(options) {
  storePicker = { ...options, selected: new Set((options.selected || []).map(String)) };
  $("#storePickerTitle").textContent = options.title;
  $("#storePickerHint").textContent = options.hint;
  const frame = $("#storePickerFrame");
  if (!frame.getAttribute("src")) frame.setAttribute("src", storePickerUrl());
  $("#storePickerDialog").showModal();
  sendPickerState();
}
window.addEventListener("message", event => {
  if (event.origin !== location.origin || !storePicker) return;
  if (event.data?.type === "fo-picker-ready") return sendPickerState();
  if (event.data?.type !== "fo-picker-toggle") return;
  const id = String(event.data.productId || "");
  if (!productById(id)) return toast("هالمنتج مو موجود في بيانات الإدارة");
  if (storePicker.onToggle) storePicker.selected = storePicker.onToggle(id, storePicker.selected);
  else storePicker.selected = storePicker.selected.has(id) && !storePicker.multi ? new Set() : new Set(storePicker.multi ? [...storePicker.selected, id] : [id]);
  sendPickerState();
});
$("#storePickerConfirm").addEventListener("click", () => {
  if (!storePicker) return;
  if (!storePicker.multi && !storePicker.selected.size) return toast("اضغط على منتج من المنصة أول");
  if (storePicker.onConfirm([...storePicker.selected]) === false) return;
  $("#storePickerDialog").close();
});
$("#storePickerDialog").addEventListener("close", () => { storePicker = null; });
// Option steps opened from the picker: re-send marks once they close (a product may have been cancelled).
$("#filterOptionStepsDialog").addEventListener("close", () => { if (storePicker) setTimeout(sendPickerState, 0); });

// ---------- محرر مربعات الصور المتحركة ----------
let mosaicSlotTarget = null;
function renderMosaicEditor() {
  const host = $("#coverMosaicEditor");
  if (!host || !coverDraft?.mosaic) return;
  host.innerHTML = coverDraft.mosaic.rows.map((row, rowIndex) => `<div class="cover-mosaic-editor-row"><span class="row-label">${rowIndex + 1}</span>${row.map((slot, index) => {
    const src = mosaicSlotImage(slot);
    return `<button type="button" class="mosaic-slot ${src ? "filled" : ""}" data-mosaic-slot="${rowIndex}:${index}" title="${slot?.type === "product" ? escapeHtml(productById(slot.productId)?.name || "") : slot ? "صورة مرفوعة" : "مربع فاضي"}">${src ? `<img src="${escapeHtml(src)}" alt="">` : "+"}</button>`;
  }).join("")}</div>`).join("");
}
function closeMosaicMenu() { $("#mosaicSlotMenu")?.remove(); }
$("#coverMosaicEditor").addEventListener("click", event => {
  const button = event.target.closest("[data-mosaic-slot]");
  if (!button) return;
  event.stopPropagation();
  closeMosaicMenu();
  const [row, index] = button.dataset.mosaicSlot.split(":").map(Number);
  mosaicSlotTarget = { row, index };
  const filled = Boolean(coverDraft.mosaic.rows[row][index]);
  button.insertAdjacentHTML("afterend", `<div class="mosaic-slot-menu" id="mosaicSlotMenu" role="menu">
    <button type="button" data-mosaic-action="upload">إضافة صورة</button>
    <button type="button" data-mosaic-action="product">تحديد من منتج منشور</button>
    ${filled ? `<button type="button" class="delete" data-mosaic-action="clear">إفراغ المربع</button>` : ""}
  </div>`);
  const menu = $("#mosaicSlotMenu"), box = button.getBoundingClientRect(), parent = $("#coverMosaicEditor").getBoundingClientRect();
  menu.style.top = `${box.bottom - parent.top + 4}px`;
  menu.style.insetInlineStart = `${Math.max(0, parent.right - box.right)}px`;
});
$("#coverMosaicField").addEventListener("click", event => {
  const action = event.target.closest("[data-mosaic-action]")?.dataset.mosaicAction;
  if (!action || !mosaicSlotTarget) return;
  event.stopPropagation();
  closeMosaicMenu();
  const { row, index } = mosaicSlotTarget;
  if (action === "clear") { coverDraft.mosaic.rows[row][index] = null; return renderCoverDialogPreview(); }
  if (action === "upload") return $("#coverMosaicFile").click();
  const current = coverDraft.mosaic.rows[row][index];
  openStorePicker({
    multi: false,
    title: `صورة المربع ${index + 1} في الصف ${row + 1}`,
    hint: "اضغط على المنتج اللي تبي صورته، بعدين «تأكيد».",
    selected: current?.type === "product" ? [current.productId] : [],
    onConfirm(selected) {
      coverDraft.mosaic.rows[row][index] = { type: "product", productId: selected[0] };
      renderCoverDialogPreview();
      return true;
    }
  });
});
document.addEventListener("click", event => { if (!event.target.closest("#mosaicSlotMenu")) closeMosaicMenu(); });
$("#coverMosaicFile").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file || !mosaicSlotTarget || !coverDraft) return;
  const { row, index } = mosaicSlotTarget;
  try {
    if (!file.type.startsWith("image/")) throw new Error("اختر ملف صورة صالحاً");
    toast("جارٍ رفع الصورة…");
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height), size = Math.min(480, side);
    const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
    canvas.getContext("2d").drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
    bitmap.close();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .86));
    const url = await uploadPlatformAsset(`orderingPlatform/catalog/appearance/covers/mosaic-${coverDraft.id}-${Date.now()}.webp`, blob);
    coverDraft.mosaic.rows[row][index] = { type: "image", url };
    renderCoverDialogPreview();
    toast("تمت إضافة الصورة للمربع");
  } catch (error) { toast(error.message || "تعذر رفع الصورة"); }
});
$("#coverMosaicSpeed").addEventListener("input", event => {
  if (!coverDraft?.mosaic) return;
  coverDraft.mosaic.speed = Number(event.target.value) || 5;
  $("#coverMosaicSpeedValue").textContent = String(coverDraft.mosaic.speed);
  renderCoverDialogPreview();
});
// The product picker and option steps are the «فلترة المنتجات» ones; in a cover session they save to the cover.
$("#saveFilterProducts").addEventListener("click", event => {
  if (!coverProductsSession) return;
  event.stopImmediatePropagation();
  const cover = activeAdminCover();
  if (!cover) return;
  for (const entry of pendingFilterSelections.values()) {
    const product = productById(entry.productId);
    for (const step of filterProductSteps(product)) {
      if (filterStepItems(product, step, entry).length && !filterStepSelection(entry, step.id).length) return toast(`أكمل خيارات المنتج «${product.name}» قبل الحفظ`);
    }
  }
  cover.products = [...pendingFilterSelections.values()];
  syncFilteredOrders(cover);
  $("#filterProductsDialog").close();
  markDirty(); render();
  toast(`صار في الغلاف ${cover.products.length} منتج`);
}, true);
$("#filterProductsDialog").addEventListener("close", () => { coverProductsSession = false; });
$("#filterOptionStepsDialog").addEventListener("close", () => {
  if (!coverOptionEditId) return;
  const cover = activeAdminCover();
  const entry = pendingFilterSelections.get(coverOptionEditId);
  const product = productById(coverOptionEditId);
  coverOptionEditId = "";
  if (!cover || !entry || !product) return;
  const complete = filterProductSteps(product).every(step => !filterStepItems(product, step, entry).length || filterStepSelection(entry, step.id).length);
  if (!complete) return toast("ما انحفظت الخيارات: لازم تختار خيار واحد على الأقل بكل صفحة");
  cover.products = cover.products.map(item => item.productId === entry.productId ? clone(entry) : item);
  markDirty(); render();
  toast("تم حفظ خيارات المنتج في الغلاف");
});

$("#categoryList").addEventListener("click", event => {
  const cover = activeAdminCover();
  if (!cover?.filtered) return;
  const options = event.target.closest("[data-fproduct-options]");
  const remove = event.target.closest("[data-fproduct-remove]");
  if (!options && !remove) return;
  event.stopPropagation(); event.preventDefault();
  if (options) {
    coverOptionEditId = options.dataset.fproductOptions;
    pendingFilterSelections = new Map(cover.products.map(entry => [entry.productId, clone(entry)]));
    return openFilterOptionSteps(coverOptionEditId);
  }
  const product = productById(remove.dataset.fproductRemove);
  cover.products = cover.products.filter(entry => entry.productId !== remove.dataset.fproductRemove);
  syncFilteredOrders(cover);
  markDirty(); render();
  toast(`انحذف «${product?.name || "المنتج"}» من الغلاف`);
}, true);

// Drag sections, or products inside their own section.
let filteredDrag = null;
$("#categoryList").addEventListener("dragstart", event => {
  if (!activeAdminCover()?.filtered) return;
  const row = event.target.closest("[data-fproduct]");
  const section = event.target.closest("[data-fsection]");
  filteredDrag = row ? { kind: "product", id: row.dataset.fproduct, section: row.dataset.fsectionOf } : section ? { kind: "section", id: section.dataset.fsection } : null;
  if (!filteredDrag) return;
  event.stopPropagation();
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", filteredDrag.id);
  const element = row || section;
  requestAnimationFrame(() => element.classList.add("cover-dragging"));
}, true);
$("#categoryList").addEventListener("dragover", event => {
  if (!filteredDrag) return;
  const target = filteredDrag.kind === "product" ? event.target.closest(`[data-fproduct][data-fsection-of="${CSS.escape(filteredDrag.section)}"]`) : event.target.closest("[data-fsection]");
  if (!target) return;
  event.preventDefault();
  $$(".cover-drop-target", $("#categoryList")).forEach(item => item.classList.remove("cover-drop-target"));
  target.classList.add("cover-drop-target");
});
$("#categoryList").addEventListener("drop", event => {
  if (!filteredDrag) return;
  event.preventDefault();
  const cover = activeAdminCover();
  const drag = filteredDrag; filteredDrag = null;
  const list = drag.kind === "product" ? cover.productOrder[drag.section] : cover.sectionOrder;
  const target = drag.kind === "product" ? event.target.closest("[data-fproduct]")?.dataset.fproduct : event.target.closest("[data-fsection]")?.dataset.fsection;
  const from = list.indexOf(drag.id), to = list.indexOf(target);
  if (from < 0 || to < 0 || from === to) return render();
  list.splice(from, 1); list.splice(to, 0, drag.id);
  markDirty(); render();
  toast("تم تحديث الترتيب داخل الغلاف");
});
$("#categoryList").addEventListener("dragend", () => { filteredDrag = null; $$(".cover-dragging,.cover-drop-target", $("#categoryList")).forEach(item => item.classList.remove("cover-dragging", "cover-drop-target")); });

// غلاف «نظام الطيبات» الجاهز: غلاف مفلتر بحجم كامل بنفس منتجات وخيارات فلتر نظام الطيبات.
function tayyibatFilter() { return productFilters.find(filter => filter.id === "filter-mt8zswyi") || productFilters.find(filter => /الطيبات/.test(filter.nameAr)); }
function addTayyibatCover() {
  const filter = tayyibatFilter();
  if (!filter) return toast("ما لقيت فلتر نظام الطيبات");
  if (covers.some(cover => cover.id === "cover-tayyibat")) return toast("غلاف نظام الطيبات موجود");
  const cover = { id: "cover-tayyibat", nameAr: filter.nameAr || "نظام الطيبات", nameEn: filter.nameEn || "Al-Tayyibat Diet", descriptionAr: "أصناف مختارة تناسب نظام الطيبات", descriptionEn: "Selected items for the Al-Tayyibat diet", size: "full", image: "", imageMode: "animated", filtered: true, sourceFilterId: filter.id, helperProductIds: [], items: [], products: clone(filter.products), sectionOrder: [], productOrder: {} };
  syncFilteredOrders(cover);
  covers = [cover, ...covers];
  markDirty(); render();
  toast(`تمت إضافة غلاف «${cover.nameAr}» بـ ${cover.products.length} منتج`);
}
document.addEventListener("click", event => { if (event.target.closest("#addTayyibatCover")) addTayyibatCover(); });
const baseRenderCoversPanel = renderCoversPanel;
renderCoversPanel = function () {
  baseRenderCoversPanel();
  $("#addTayyibatCover")?.parentElement.remove();
  const grid = $("#coversGrid");
  if (!grid || activeAdminCoverId || covers.some(cover => cover.id === "cover-tayyibat") || !tayyibatFilter()) return;
  grid.insertAdjacentHTML("afterend", `<div class="covers-ready-row"><button type="button" class="secondary" id="addTayyibatCover">+ إضافة غلاف «نظام الطيبات» المفلتر الجاهز</button></div>`);
};
