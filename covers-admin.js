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
    items: (Array.isArray(cover?.items) ? cover.items : []).map(item => ({ type: item?.type === "heading" ? "heading" : "category", id: String(item?.id || "") })).filter(item => item.id)
  }));
}

function adminHeadingCategoryIds(heading) {
  return [...(heading?.subheadings || []).flatMap(group => group.categoryIds || []), ...(heading?.categoryIds || [])].map(String);
}
function coverOf(type, id) { return covers.find(cover => cover.items.some(item => item.type === type && String(item.id) === String(id))) || null; }
function activeAdminCover() { return covers.find(cover => cover.id === activeAdminCoverId) || null; }

// Called by render() in script.js: a heading/category shows either in «الأقسام»
// (when no cover holds it) or inside the cover page that holds it.
function coverEntryVisible(type, id) {
  const holder = coverOf(type, id);
  return activeAdminCoverId ? holder?.id === activeAdminCoverId : !holder;
}

// Same count as the storefront: active products in active categories.
function coverProductCount(cover) {
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

// Exactly the storefront tile (covers.css) plus the admin's edit button.
function adminCoverTileMarkup(cover, { preview = false } = {}) {
  const count = coverProductCount(cover);
  return `<div class="world-tile size-${cover.size}${preview ? " is-preview" : ""}" ${preview ? "" : `draggable="true" data-cover-id="${escapeHtml(cover.id)}" tabindex="0" title="اضغط مرتين للدخول"`}>
    ${cover.image ? `<img src="${escapeHtml(cover.image)}" alt="" draggable="false">` : `<span class="cover-tile-empty">بدون صورة</span>`}
    <span class="world-tile-copy"><strong>${escapeHtml(cover.nameAr || "اسم الغلاف")}</strong>${cover.descriptionAr ? `<small>${escapeHtml(cover.descriptionAr)}</small>` : ""}</span>
    <span class="world-tile-count">${coverItemsLabel(count)}</span>
    ${preview ? "" : `<button type="button" class="cover-tile-edit" data-cover-edit="${escapeHtml(cover.id)}">تعديل</button>`}
  </div>`;
}

function coverBannerPreviewMarkup(cover) {
  const helpers = cover.helperProductIds.map(productById).filter(Boolean).map(imageSource).filter(Boolean);
  return `<header class="world-cover">
    <div class="world-cover-media">${cover.image ? `<img src="${escapeHtml(cover.image)}" alt="">` : ""}</div>
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
  if (toggle) { toggle.textContent = coverRemoveMode ? "إلغاء" : "حذف أقسام"; toggle.classList.toggle("active", coverRemoveMode); }
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
function renderCoverDialogPreview() {
  if (!coverDraft) return;
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
  coverDraft = existing ? clone(existing) : { id: `cover-${Date.now().toString(36)}`, nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", size: "half", image: "", helperProductIds: [], items: [] };
  $("#coverDialogEyebrow").textContent = existing ? "تعديل الغلاف" : "غلاف جديد";
  $("#coverDialogTitle").textContent = existing ? existing.nameAr || "تعديل الغلاف" : "إضافة غلاف";
  $("#coverSubmit").textContent = existing ? "حفظ التعديل" : "إضافة الغلاف";
  $("#coverDelete").classList.toggle("hidden", !existing);
  $("#coverNameAr").value = coverDraft.nameAr; $("#coverNameEn").value = coverDraft.nameEn;
  $("#coverDescriptionAr").value = coverDraft.descriptionAr; $("#coverDescriptionEn").value = coverDraft.descriptionEn;
  $$("input[name='coverSize']").forEach(input => { input.checked = input.value === coverDraft.size; });
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
  if (!coverDraft.image) return toast("اختر صورة للغلاف");
  Object.assign(coverDraft, { nameAr, nameEn, descriptionAr: clean($("#coverDescriptionAr").value), descriptionEn: clean($("#coverDescriptionEn").value), size: coverFormSize() });
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
