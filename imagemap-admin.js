// تفريغ قسم داخل صورة: صفحة صورة (A4) لقسم داخل الغلاف.
// كل منتج له حدود مرسومة على الصورة ومرفقات (الاسم، السعر، زر الإضافة…) بأماكن ومقاسات محددة.
// البيانات في cover.imagePages والإحداثيات نسب من عرض وطول الصورة، فتطابق المنصة على أي شاشة.
// المنصة ما تعرض الصفحة إلا بعد «تفعيل الصفحة».

const IMAGE_PAGE_TYPES = ["name", "desc", "price", "add", "prep", "min", "badge"];
const IM_LABELS = { name: "اسم المنتج", desc: "الوصف", price: "السعر", add: "زر الإضافة", prep: "مدة التحضير", min: "أقل كمية للطلب", badge: "شارة المنتج" };
const IM_TEXT_TYPES = new Set(["name", "desc", "price"]);
const IM_WRAP_TYPES = new Set(["name", "desc"]);
const IM_COLORS = [["dark", "#18352a", "غامق"], ["light", "#ffffff", "أبيض"], ["green", "#2d6a4f", "أخضر"], ["gold", "#b07a12", "ذهبي"], ["red", "#b43e3e", "أحمر"]];
const IM_REGION_HUES = [152, 38, 205, 330, 95, 265, 15, 180];
const IM_CLOCK = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>`;

function normalizeImagePages(list) {
  const num = (value, min, max, fallback) => { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; };
  return (Array.isArray(list) ? list : []).map(page => ({
    id: clean(page?.id), categoryId: clean(page?.categoryId), image: clean(page?.image),
    width: num(page?.width, 1, 20000, 1000), height: num(page?.height, 1, 40000, 1414), active: page?.active === true,
    regions: (Array.isArray(page?.regions) ? page.regions : []).map(region => ({
      id: clean(region?.id), productId: String(region?.productId || ""),
      points: (Array.isArray(region?.points) ? region.points : []).map(point => [num(point?.[0], 0, 1, 0), num(point?.[1], 0, 1, 0)]),
      elements: (Array.isArray(region?.elements) ? region.elements : []).filter(el => IMAGE_PAGE_TYPES.includes(el?.type)).map(el => ({
        id: clean(el.id), type: el.type, x: num(el.x, -0.5, 1.5, 0), y: num(el.y, -0.5, 1.5, 0), w: num(el.w, 0, 1.5, 0), h: num(el.h, 0, 1.5, 0),
        size: num(el.size, 0.3, 12, 2.4), color: IM_COLORS.some(([key]) => key === el.color) ? el.color : "dark",
        align: ["right", "center", "left"].includes(el.align) ? el.align : "center", plate: el.plate === true
      }))
    })).filter(region => region.id && region.productId && region.points.length >= 3)
  })).filter(page => page.id && page.categoryId);
}

const imUid = prefix => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const imRound = value => Math.round(value * 10000) / 10000;
const imClamp = (value, min, max) => Math.min(max, Math.max(min, value));

// ---------- نصوص المرفقات (نفس المنصة) ----------
function imMoney(value) { return `${Number(value || 0).toFixed(3)} د.ك`; }
function imHasOptions(product) { return Boolean(product?.options && product.options.enabled !== false && Array.isArray(product.options.items) && product.options.items.length) || Boolean(product?.selectionFlow); }
function imPreparation(product) {
  const prep = product?.preparation || {};
  const time = (value, kind) => kind === "day" ? (value === 1 ? "يوم" : value === 2 ? "يومين" : `${value} أيام`) : (value === 1 ? "ساعة" : value === 2 ? "ساعتين" : `${value} ساعات`);
  const first = Math.max(1, Number(prep.first) || 2);
  if (!prep.hasSecond || !Number(prep.second)) return `خلال ${time(first, prep.unit)}`;
  return `خلال ${time(first, prep.unit)} إلى ${time(Math.max(1, Number(prep.second)), prep.secondUnit || prep.unit)}`;
}
const IM_MIN_UNITS = { dozen: "درزن", piece: "حبة", bowl: "ماعون", bag: "كيس", kilo: "كيلو", bottle: "بطل" };
function imMinimum(product) {
  const value = product?.minimumOrder;
  if (!value || value.enabled === false) return "";
  return `أقل كمية للطلب هي ${Math.max(1, Math.floor(Number(value.quantity) || 1))} ${IM_MIN_UNITS[value.unit] || "حبة"}`;
}
function imDescription(product) { const text = clean(product?.description || product?.descriptionEn); return /^[-–—_.\s]*$/.test(text) ? "" : text; }
function imElementInner(type, product) {
  if (!product) return "";
  if (type === "name") return escapeHtml(product.name || product.nameEn || "");
  if (type === "desc") return escapeHtml(imDescription(product));
  if (type === "price") {
    if (product.options?.priceBased) return `<span>السعر عند الاختيار</span>`;
    const original = Number(product.originalPrice || 0);
    return original > Number(product.price || 0) ? `<span class="sale-price"><del>${imMoney(original)}</del><b>${imMoney(product.price)}</b></span>` : `<span>${imMoney(product.price)}</span>`;
  }
  if (type === "add") return `<div class="product-quantity-slot"><button type="button" class="im-add-btn" tabindex="-1">${imHasOptions(product) ? "اختيار" : "إضافة"}</button></div>`;
  if (type === "prep") return `<span class="im-pill">${IM_CLOCK}${escapeHtml(imPreparation(product))}</span>`;
  if (type === "min") { const text = imMinimum(product); return text ? `<span class="im-pill">${escapeHtml(text)}</span>` : ""; }
  if (type === "badge") { const text = clean(product.badgeAr || product.badgeEn); return text ? `<span class="im-pill">${escapeHtml(text)}</span>` : ""; }
  return "";
}
function imAvailableTypes(product) { return IMAGE_PAGE_TYPES.filter(type => imElementInner(type, product)); }

// ---------- أقسام الغلاف ----------
function imCoverCategories(cover) {
  const ids = (cover?.items || []).flatMap(item => item.type === "heading" ? adminHeadingCategoryIds(headings.find(heading => heading.id === item.id)) : [item.id]);
  return [...new Set(ids.map(String))].map(id => categories.find(category => String(category.id) === id)).filter(Boolean);
}
function imCategoryProducts(categoryId) { return categoryProducts(categoryId).filter(product => product.active !== false); }
function imPageStatus(page) {
  const total = imCategoryProducts(page.categoryId).length;
  const mapped = new Set(page.regions.map(region => String(region.productId))).size;
  return { total, mapped };
}

// شريط صفحات الصور داخل صفحة الغلاف في الإدارة (يناديه renderCoversPanel).
function imagePagesStripMarkup(cover) {
  if (!cover || cover.filtered || !(cover.imagePages || []).length) return "";
  return `<div class="im-strip">${cover.imagePages.map(page => {
    const category = categories.find(item => String(item.id) === String(page.categoryId));
    const { total, mapped } = imPageStatus(page);
    return `<article class="im-strip-card${page.active ? " is-active" : ""}">
      <button type="button" class="im-strip-thumb" data-im-open="${escapeHtml(page.id)}" title="فتح المحرر">${page.image ? `<img src="${escapeHtml(page.image)}" alt="">` : ""}</button>
      <div class="im-strip-info">
        <small>صفحة صورة</small>
        <strong>${escapeHtml(category?.nameAr || "قسم محذوف")}</strong>
        <span class="im-chip ${page.active ? "on" : ""}">${page.active ? "مفعّلة في المنصة" : "مسودة"}</span>
        <span class="im-strip-progress"><i style="width:${total ? Math.round(mapped / total * 100) : 0}%"></i></span>
        <small>${mapped} من ${total} منتج محدد</small>
      </div>
      <div class="im-strip-actions">
        <button type="button" class="primary" data-im-open="${escapeHtml(page.id)}">تحرير</button>
        <button type="button" data-im-toggle="${escapeHtml(page.id)}">${page.active ? "إيقاف" : "تفعيل"}</button>
        <button type="button" class="im-danger" data-im-delete="${escapeHtml(page.id)}">حذف</button>
      </div>
    </article>`;
  }).join("")}</div>`;
}

// ---------- المحرر ----------
let im = null; // { coverId, pageId, categoryId, screen, mode, drawing, selected, history, future, zoom, file, preview }

function imCover() { return covers.find(cover => cover.id === im?.coverId) || null; }
function imPage() { return imCover()?.imagePages?.find(page => page.id === im?.pageId) || null; }
function imSave(message = "جارٍ حفظ صفحة الصورة…") { markDirty(message); }

function imBuildShell() {
  if ($("#imEditor")) return;
  const shell = document.createElement("div");
  shell.id = "imEditor";
  shell.className = "im-editor hidden";
  shell.setAttribute("role", "dialog");
  shell.setAttribute("aria-modal", "true");
  shell.innerHTML = `
    <header class="im-top">
      <button type="button" class="im-back" id="imBack">→ رجوع للغلاف</button>
      <div class="im-heading"><small id="imEyebrow">تفريغ قسم داخل صورة</small><strong id="imTitle"></strong></div>
      <div class="im-top-tools" id="imTopTools">
        <button type="button" class="im-plus" id="imDraw" title="تحديد منتج جديد (ارسم حدوده على الصورة)"><span>+</span></button>
        <button type="button" class="im-mode" id="imSelectMode" title="تحريك وتعديل الحدود">⤧ تعديل</button>
        <span class="im-sep"></span>
        <button type="button" class="im-icon" id="imUndo" title="تراجع (Ctrl+Z)">↶</button>
        <button type="button" class="im-icon" id="imRedo" title="إعادة (Ctrl+Shift+Z)">↷</button>
        <label class="im-zoom" title="تكبير المعاينة"><span>🔍</span><input type="range" id="imZoom" min="40" max="220" step="5" value="100"><output id="imZoomValue">100%</output></label>
        <button type="button" class="im-icon" id="imPreview" title="معاينة مثل ما يشوفها العميل">👁</button>
        <button type="button" class="im-ghost" id="imReplace">تغيير الصورة</button>
        <button type="button" class="im-activate" id="imActivate">تفعيل الصفحة</button>
      </div>
    </header>
    <section class="im-screen" id="imCategoryScreen">
      <div class="im-screen-card">
        <span class="im-step">الخطوة 1 من 2</span>
        <h2>اختر قسم من أقسام الغلاف</h2>
        <p>القسم اللي تختاره تتحول منتجاته لصفحة صورة: تحدد كل منتج على الصورة وتحط مرفقاته فوقها.</p>
        <div class="im-category-grid" id="imCategoryGrid"></div>
      </div>
    </section>
    <section class="im-screen hidden" id="imImageScreen">
      <div class="im-screen-card im-upload-card">
        <span class="im-step" id="imImageStep">الخطوة 2 من 2</span>
        <h2 id="imImageTitle">أضف صورة القسم (A4)</h2>
        <p>صمّم الصورة وفيها صور المنتجات، وبعدين ترسم حدود كل منتج. يفضّل مقاس A4 عمودي (مثل 2480×3508) أو أي مقاس تبيه.</p>
        <label class="im-drop" id="imDrop">
          <input type="file" id="imFile" accept="image/png,image/jpeg,image/webp" hidden>
          <span class="im-a4" id="imA4"><span class="im-drop-empty"><b>+</b><strong>اختر الصورة أو اسحبها هنا</strong><small>PNG أو JPG أو WEBP</small></span></span>
        </label>
        <small class="im-file-info" id="imFileInfo"></small>
        <footer><button type="button" class="im-ghost" id="imImageBack">رجوع</button><button type="button" class="im-activate" id="imStart" disabled>بدء التحرير ←</button></footer>
      </div>
    </section>
    <section class="im-workspace hidden" id="imWorkspace">
      <aside class="im-panel" id="imPanel"></aside>
      <div class="im-canvas" id="imCanvas">
        <div class="im-hintbar" id="imHintbar"></div>
        <div class="im-stage-wrap"><div class="im-page im-stage" id="imStage"></div></div>
      </div>
    </section>
    <div class="im-modal hidden" id="imPicker"><div class="im-modal-card" id="imPickerCard"></div></div>`;
  document.body.append(shell);
  imBindShell();
}

function imOpen(coverId, pageId = "") {
  imBuildShell();
  const owner = covers.find(cover => cover.id === coverId);
  if (!owner) return;
  owner.imagePages = owner.imagePages || [];
  im = { coverId, pageId, categoryId: "", screen: "category", mode: "draw", drawing: [], freehand: false, selected: null, history: [], future: [], zoom: 100, file: null, preview: false, replace: false };
  const page = pageId ? imPage() : null;
  if (page) { im.categoryId = page.categoryId; im.screen = "editor"; }
  $("#imEditor").classList.remove("hidden");
  document.body.classList.add("im-open");
  imShow();
}
function imClose() {
  if (im?.drawing.length && !confirm("في تحديد ما خلص؛ تطلع وتلغيه؟")) return;
  $("#imEditor")?.classList.add("hidden");
  document.body.classList.remove("im-open");
  im = null;
  render();
}

function imShow() {
  const screen = im.screen;
  $("#imCategoryScreen").classList.toggle("hidden", screen !== "category");
  $("#imImageScreen").classList.toggle("hidden", screen !== "image");
  $("#imWorkspace").classList.toggle("hidden", screen !== "editor");
  $("#imTopTools").classList.toggle("hidden", screen !== "editor");
  const category = categories.find(item => String(item.id) === String(im.categoryId));
  $("#imTitle").textContent = screen === "category" ? (imCover()?.nameAr || "") : (category?.nameAr || "");
  $("#imEyebrow").textContent = screen === "category" ? "تفريغ قسم داخل صورة" : `${imCover()?.nameAr || ""} · تفريغ قسم داخل صورة`;
  if (screen === "category") imRenderCategories();
  if (screen === "image") imRenderImageScreen();
  if (screen === "editor") { imFitZoom(); imRender(); }
}

function imRenderCategories() {
  const cover = imCover();
  const list = imCoverCategories(cover);
  $("#imCategoryGrid").innerHTML = list.length ? list.map(category => {
    const items = imCategoryProducts(category.id);
    const page = cover.imagePages.find(item => String(item.categoryId) === String(category.id));
    const thumbs = items.map(imageSource).filter(Boolean).slice(0, 4);
    return `<button type="button" class="im-category" data-im-category="${escapeHtml(category.id)}">
      <span class="im-category-thumbs">${thumbs.map(src => thumbImg(src)).join("") || "<i></i>"}</span>
      <strong>${escapeHtml(category.nameAr)}</strong>
      <small>${items.length} منتج</small>
      ${page ? `<span class="im-chip ${page.active ? "on" : ""}">${page.active ? "صفحة مفعّلة" : "صفحة مسودة"}</span>` : ""}
    </button>`;
  }).join("") : `<p class="im-empty">ما في أقسام داخل هذا الغلاف. أضف قسم للغلاف أولاً.</p>`;
}

function imRenderImageScreen() {
  const page = imPage();
  $("#imImageStep").textContent = im.replace ? "تغيير صورة الصفحة" : "الخطوة 2 من 2";
  $("#imImageTitle").textContent = im.replace ? "اختر الصورة الجديدة" : "أضف صورة القسم (A4)";
  $("#imStart").textContent = im.replace ? "حفظ الصورة ←" : "بدء التحرير ←";
  const src = im.preview || (im.replace ? page?.image : "");
  $("#imA4").innerHTML = src ? `<img src="${escapeHtml(src)}" alt="">` : `<span class="im-drop-empty"><b>+</b><strong>اختر الصورة أو اسحبها هنا</strong><small>PNG أو JPG أو WEBP</small></span>`;
  $("#imA4").classList.toggle("has-image", Boolean(src));
  $("#imStart").disabled = !im.file;
  if (!im.file) $("#imFileInfo").textContent = im.replace ? "الحدود والمرفقات تبقى بنفس أماكنها على الصورة الجديدة." : "";
}

async function imPickFile(file) {
  if (!file?.type?.startsWith("image/")) return toast("اختر ملف صورة صالحاً");
  const bitmap = await createImageBitmap(file);
  im.file = file;
  im.dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  if (im.preview) URL.revokeObjectURL(im.preview);
  im.preview = URL.createObjectURL(file);
  imRenderImageScreen();
  const ratio = im.dims.height / im.dims.width;
  const a4 = Math.abs(ratio - 1.414) < .03;
  $("#imFileInfo").textContent = `${im.dims.width}×${im.dims.height}${a4 ? " · مقاس A4 ✓" : ""}`;
}

async function imUploadImage() {
  const file = im.file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / bitmap.width, 4000 / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .9));
  if (!blob) throw new Error("تعذر تجهيز الصورة");
  const url = await uploadPlatformAsset(`orderingPlatform/catalog/appearance/covers/${im.coverId}-page-${Date.now()}.webp`, blob);
  return { url, width: canvas.width, height: canvas.height };
}

async function imStartEditing() {
  const button = $("#imStart");
  button.disabled = true;
  const label = button.textContent;
  button.textContent = "جارٍ رفع الصورة…";
  try {
    const { url, width, height } = await imUploadImage();
    const cover = imCover();
    cover.imagePages = cover.imagePages || [];
    let page = im.replace ? imPage() : null;
    if (page) {
      const old = page.image;
      Object.assign(page, { image: url, width, height });
      if (old && old !== url && typeof deleteStoredAppearanceImage === "function") deleteStoredAppearanceImage(old);
    } else {
      page = { id: imUid("page"), categoryId: im.categoryId, image: url, width, height, active: false, regions: [] };
      cover.imagePages.push(page);
      im.pageId = page.id;
    }
    imSave("جارٍ حفظ صفحة الصورة…");
    im.file = null; im.replace = false;
    if (im.preview) { URL.revokeObjectURL(im.preview); im.preview = ""; }
    im.screen = "editor"; im.mode = "draw";
    imShow();
    toast("ابدأ: ارسم حدود أول منتج على الصورة");
  } catch (error) {
    toast(error.message || "تعذر رفع الصورة");
    button.disabled = false;
    button.textContent = label;
  }
}

// ---------- تاريخ التعديلات ----------
function imSnapshot() {
  const page = imPage();
  if (!page) return;
  im.history.push(JSON.stringify(page.regions));
  if (im.history.length > 80) im.history.shift();
  im.future = [];
}
function imRestore(from, to) {
  const page = imPage();
  if (!page || !from.length) return;
  to.push(JSON.stringify(page.regions));
  page.regions = JSON.parse(from.pop());
  if (im.selected?.regionId && !page.regions.some(region => region.id === im.selected.regionId)) im.selected = null;
  imSave();
  imRender();
}

// ---------- الرسم على المسرح ----------
function imFitZoom() {
  const canvas = $("#imCanvas");
  const page = imPage();
  if (!canvas || !page) return;
  const available = Math.max(320, canvas.clientWidth - 64);
  const byHeight = (canvas.clientHeight - 90) * page.width / page.height;
  im.base = Math.min(available, Math.max(520, byHeight), 900);
}
function imApplyZoom() {
  const stage = $("#imStage");
  stage.style.width = `${Math.round((im.base || 700) * im.zoom / 100)}px`;
  $("#imZoom").value = String(im.zoom);
  $("#imZoomValue").textContent = `${im.zoom}%`;
}
function imBBox(points) {
  const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 };
}
function imRegionHue(page, region) { return IM_REGION_HUES[page.regions.indexOf(region) % IM_REGION_HUES.length]; }

function imElementStyle(el) {
  return `left:${(el.x * 100).toFixed(3)}%;top:${(el.y * 100).toFixed(3)}%;${el.w ? `width:${(el.w * 100).toFixed(3)}%;` : ""}${el.h ? `min-height:${(el.h * 100).toFixed(3)}%;` : ""}--s:${el.size}`;
}

function imRender() {
  const page = imPage();
  if (!page) return;
  const stage = $("#imStage");
  imApplyZoom();
  stage.style.aspectRatio = `${page.width}/${page.height}`;
  stage.classList.toggle("is-draw", im.mode === "draw" && !im.preview);
  stage.classList.toggle("is-preview", im.preview);
  const W = page.width, H = page.height;
  const selectedRegion = im.selected?.regionId;
  const polygons = page.regions.map(region => {
    const hue = imRegionHue(page, region);
    const points = region.points.map(([x, y]) => `${(x * W).toFixed(1)},${(y * H).toFixed(1)}`).join(" ");
    return `<polygon class="im-region${region.id === selectedRegion ? " is-selected" : ""}" style="--h:${hue}" points="${points}" data-im-region="${escapeHtml(region.id)}"></polygon>`;
  }).join("");
  const drawing = im.drawing.length ? `<polyline class="im-drawing" points="${im.drawing.map(([x, y]) => `${(x * W).toFixed(1)},${(y * H).toFixed(1)}`).join(" ")}"></polyline><line class="im-rubber" id="imRubber" x1="${im.drawing.at(-1)[0] * W}" y1="${im.drawing.at(-1)[1] * H}" x2="${im.drawing.at(-1)[0] * W}" y2="${im.drawing.at(-1)[1] * H}"></line>` : "";
  const labels = im.preview ? "" : page.regions.map(region => {
    const product = productById(region.productId);
    const box = imBBox(region.points);
    return `<span class="im-region-label${region.id === selectedRegion ? " is-selected" : ""}" style="left:${box.cx * 100}%;top:${box.y * 100}%;--h:${imRegionHue(page, region)}" data-im-region="${escapeHtml(region.id)}">${escapeHtml(product?.name || "منتج محذوف")}</span>`;
  }).join("");
  const elements = page.regions.flatMap(region => {
    const product = productById(region.productId);
    return region.elements.map(el => {
      const inner = imElementInner(el.type, product);
      if (!inner) return "";
      const selected = im.selected?.elId === el.id;
      const handles = selected && !im.preview ? (IM_WRAP_TYPES.has(el.type) ? ["n", "e", "s", "w"] : []).map(dir => `<i class="im-handle im-handle-${dir}" data-im-handle="${dir}"></i>`).join("") : "";
      return `<div class="im-el im-${el.type} im-c-${el.color} im-a-${el.align}${el.plate ? " im-plate" : ""}${selected ? " is-selected" : ""}" style="${imElementStyle(el)}" dir="rtl" data-im-el="${escapeHtml(el.id)}" data-im-owner="${escapeHtml(region.id)}">${inner}${handles}</div>`;
    });
  }).join("");
  const vertices = !im.preview && selectedRegion && !im.selected.elId ? (page.regions.find(region => region.id === selectedRegion)?.points || []).map(([x, y], index) => `<i class="im-vertex" style="left:${x * 100}%;top:${y * 100}%" data-im-vertex="${index}"></i>`).join("") : "";
  const dots = im.drawing.map(([x, y], index) => `<i class="im-dot${index === 0 ? " is-first" : ""}${index === 0 && im.drawing.length >= 3 ? " can-close" : ""}" style="left:${x * 100}%;top:${y * 100}%"></i>`).join("");
  stage.innerHTML = `<img src="${escapeHtml(page.image)}" alt="" draggable="false">
    <svg class="im-regions" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${polygons}${drawing}</svg>
    <div class="im-labels">${labels}</div>
    <div class="im-layer">${elements}</div>
    <div class="im-overlay">${vertices}${dots}<i class="im-guide im-guide-v hidden" id="imGuideV"></i><i class="im-guide im-guide-h hidden" id="imGuideH"></i></div>`;
  $("#imDraw").classList.toggle("active", im.mode === "draw");
  $("#imSelectMode").classList.toggle("active", im.mode === "select");
  $("#imPreview").classList.toggle("active", im.preview);
  $("#imUndo").disabled = !im.history.length;
  $("#imRedo").disabled = !im.future.length;
  $("#imActivate").textContent = page.active ? "✓ الصفحة مفعّلة" : "تفعيل الصفحة";
  $("#imActivate").classList.toggle("is-on", page.active);
  imRenderHint();
  imRenderPanel();
}

function imRenderHint() {
  const text = im.preview ? "معاينة: هذا شكل الصفحة عند العميل. اضغط 👁 للرجوع للتحرير."
    : im.drawing.length >= 3 ? "اضغط على النقطة الأولى (أو Enter أو دبل كلك) عشان تسكّر الحدود · Backspace يمسح آخر نقطة · Esc يلغي"
    : im.drawing.length ? "كمّل النقاط حول المنتج… · Esc يلغي"
    : im.mode === "draw" ? "ارسم حدود المنتج: اضغط نقطة نقطة حوله، أو اسحب الماوس للرسم الحر. المرفقات تقدر تسحبها في أي وقت."
    : "اختر منطقة أو مرفق لتعديله. اسحب نقاط الحدود لتعديل الشكل · الأسهم تحرك المرفق المحدد";
  $("#imHintbar").textContent = text;
}

function imRenderPanel() {
  const page = imPage();
  const items = imCategoryProducts(page.categoryId);
  const mappedIds = new Set(page.regions.map(region => String(region.productId)));
  const done = items.filter(product => mappedIds.has(String(product.id))).length;
  const region = page.regions.find(item => item.id === im.selected?.regionId);
  const el = region?.elements.find(item => item.id === im.selected?.elId);
  const product = region ? productById(region.productId) : null;
  let inspector = "";
  if (el) {
    inspector = `<section class="im-card im-inspector">
      <header><small>مرفق</small><strong>${IM_LABELS[el.type]}</strong><span>${escapeHtml(product?.name || "")}</span></header>
      <label class="im-range"><span>الحجم <output>${Math.round(el.size * 40)}%</output></span><input type="range" min="0.6" max="9" step="0.05" value="${el.size}" data-im-prop="size"></label>
      ${IM_TEXT_TYPES.has(el.type) ? `<div class="im-row"><span>اللون</span><div class="im-swatches">${IM_COLORS.map(([key, color, label]) => `<button type="button" class="im-swatch${el.color === key ? " active" : ""}" style="--c:${color}" data-im-color="${key}" title="${label}"></button>`).join("")}</div></div>` : ""}
      ${IM_WRAP_TYPES.has(el.type) ? `<div class="im-row"><span>المحاذاة</span><div class="im-segment">${[["right", "يمين"], ["center", "وسط"], ["left", "يسار"]].map(([key, label]) => `<button type="button" class="${el.align === key ? "active" : ""}" data-im-align="${key}">${label}</button>`).join("")}</div></div>
      <p class="im-tip">اسحب حواف الصندوق (يمين، يسار، فوق، تحت) عشان تكبّر أو تصغّر حدود النص.</p>
      <button type="button" class="im-ghost im-small" data-im-autoheight>ارتفاع تلقائي</button>` : ""}
      ${IM_TEXT_TYPES.has(el.type) ? `<label class="im-check"><input type="checkbox" data-im-plate ${el.plate ? "checked" : ""}> <span>خلفية خلف النص</span></label>` : ""}
      <div class="im-row"><span>توسيط</span><div class="im-segment"><button type="button" data-im-center="region">بالمنتج</button><button type="button" data-im-center="page">بالصفحة</button></div></div>
      <footer><button type="button" class="im-ghost" data-im-select-region="${escapeHtml(region.id)}">← المنتج</button><button type="button" class="im-danger" data-im-remove-el>حذف المرفق</button></footer>
    </section>`;
  } else if (region) {
    const available = imAvailableTypes(product);
    const has = new Set(region.elements.map(item => item.type));
    inspector = `<section class="im-card im-inspector">
      <header><small>منتج محدد</small><div class="im-product-head">${product && imageSource(product) ? thumbImg(imageSource(product)) : ""}<strong>${escapeHtml(product?.name || "منتج محذوف")}</strong></div></header>
      <div class="im-attach-list">${available.map(type => `<label class="im-attach"><input type="checkbox" data-im-attach="${type}" ${has.has(type) ? "checked" : ""}><span><b>${IM_LABELS[type]}</b><small>${imElementInner(type, product).replace(/<[^>]+>/g, "")}</small></span></label>`).join("")}</div>
      <p class="im-tip">علّم المرفقات اللي تبيها تظهر فوق الصورة. اضغط على أي مرفق في الصورة عشان تغيّر مكانه وحجمه.</p>
      <footer><button type="button" class="im-ghost" data-im-change-product>تغيير المنتج</button><button type="button" class="im-danger" data-im-remove-region>حذف التحديد</button></footer>
    </section>`;
  }
  $("#imPanel").innerHTML = `
    <section class="im-card im-progress">
      <div><strong>${done} من ${items.length}</strong><small>منتجات محددة على الصورة</small></div>
      <span class="im-ring" style="--p:${items.length ? done / items.length * 100 : 0}"><b>${items.length ? Math.round(done / items.length * 100) : 0}%</b></span>
    </section>
    ${inspector}
    <section class="im-card im-products">
      <header><strong>منتجات القسم</strong><small>اضغط على المحدد عشان تختاره</small></header>
      <div class="im-product-list">${items.map(item => {
        const regionOf = page.regions.find(entry => String(entry.productId) === String(item.id));
        return `<button type="button" class="im-product${regionOf ? " is-done" : ""}${regionOf && regionOf.id === im.selected?.regionId ? " is-current" : ""}" ${regionOf ? `data-im-select-region="${escapeHtml(regionOf.id)}"` : "data-im-draw-hint"}>
          ${imageSource(item) ? thumbImg(imageSource(item)) : "<i></i>"}<span>${escapeHtml(item.name)}</span><b>${regionOf ? "✓" : "+"}</b></button>`;
      }).join("")}</div>
    </section>`;
}

// ---------- اختيار المنتج والمرفقات بعد ما تتسكّر الحدود ----------
function imOpenPicker({ points = null, regionId = "" } = {}) {
  im.picker = { points, regionId, step: "product", productId: "", search: "" };
  $("#imPicker").classList.remove("hidden");
  imRenderPicker();
}
function imClosePicker(discard = true) {
  if (discard && im.picker?.points) { im.drawing = []; }
  im.picker = null;
  $("#imPicker").classList.add("hidden");
  imRender();
}
function imRenderPicker() {
  const picker = im.picker;
  const page = imPage();
  const card = $("#imPickerCard");
  if (picker.step === "product") {
    const mapped = new Set(page.regions.map(region => String(region.productId)));
    const query = picker.search.toLocaleLowerCase();
    const list = imCategoryProducts(page.categoryId).filter(product => !query || [product.name, product.nameEn].some(name => String(name || "").toLocaleLowerCase().includes(query)));
    card.innerHTML = `<header><div><small>${picker.regionId ? "تغيير المنتج" : "تم رسم الحدود ✓"}</small><h3>هذا التحديد لأي منتج؟</h3></div><button type="button" class="im-x" data-im-picker-close>×</button></header>
      <label class="im-search"><input type="search" id="imPickerSearch" placeholder="ابحث عن منتج…" value="${escapeHtml(picker.search)}" autocomplete="off"></label>
      <div class="im-pick-grid">${list.map(product => `<button type="button" class="im-pick${mapped.has(String(product.id)) ? " is-done" : ""}" data-im-pick="${escapeHtml(product.id)}">
        ${imageSource(product) ? thumbImg(imageSource(product)) : "<i></i>"}<span>${escapeHtml(product.name)}</span><small>${mapped.has(String(product.id)) ? "محدد من قبل" : imMoney(product.price)}</small></button>`).join("") || `<p class="im-empty">ما في نتائج</p>`}</div>`;
    setTimeout(() => $("#imPickerSearch")?.focus(), 30);
    return;
  }
  const product = productById(picker.productId);
  const available = imAvailableTypes(product);
  const defaults = new Set(["name", "price", "add"]);
  card.innerHTML = `<header><div><small>المرفقات</small><h3>وش يظهر فوق الصورة؟</h3></div><button type="button" class="im-x" data-im-picker-close>×</button></header>
    <div class="im-pick-product">${imageSource(product) ? thumbImg(imageSource(product)) : ""}<strong>${escapeHtml(product?.name || "")}</strong></div>
    <div class="im-attach-list big">${available.map(type => `<label class="im-attach"><input type="checkbox" data-im-pick-type="${type}" ${defaults.has(type) ? "checked" : ""}><span><b>${IM_LABELS[type]}</b><span class="im-attach-preview im-el im-${type}" style="--s:1.05;position:static">${imElementInner(type, product)}</span></span></label>`).join("")}</div>
    <footer><button type="button" class="im-ghost" data-im-picker-back>→ رجوع</button><button type="button" class="im-activate" data-im-picker-add>إضافة المرفقات</button></footer>`;
}

function imCreateElements(region, types) {
  const page = imPage();
  const box = imBBox(region.points);
  const sizeBase = imClamp(box.w * 100 * 0.052, 1.1, 3.4);
  return types.map(type => ({
    id: imUid("el"), type,
    x: 0, y: 0, w: IM_WRAP_TYPES.has(type) ? imRound(Math.min(1, box.w * 0.92)) : 0, h: 0,
    size: imRound(type === "name" ? sizeBase : type === "desc" ? sizeBase * .72 : type === "add" ? sizeBase * .9 : type === "price" ? sizeBase * 1.05 : sizeBase * .78),
    color: "dark", align: "center", plate: false
  })).map(el => ({ ...el, _page: page.id }));
}
// يرتّب المرفقات الجديدة تحت بعض داخل الحدود (بعد ما ينقاس حجمها الحقيقي).
function imLayoutNew(region, ids) {
  const stage = $("#imStage");
  const rect = stage.getBoundingClientRect();
  if (!rect.width) return;
  const box = imBBox(region.points);
  const fresh = region.elements.filter(el => ids.includes(el.id));
  const sizes = fresh.map(el => { const node = stage.querySelector(`[data-im-el="${CSS.escape(el.id)}"]`); return { el, w: node ? node.offsetWidth / rect.width : .2, h: node ? node.offsetHeight / rect.height : .03 }; });
  const gap = 0.006;
  const total = sizes.reduce((sum, item) => sum + item.h, 0) + gap * (sizes.length - 1);
  let y = imClamp(box.y + box.h - total - box.h * 0.04, box.y, 1 - total);
  sizes.forEach(({ el, w, h }) => {
    el.x = imRound(imClamp(box.cx - w / 2, 0, 1 - w));
    el.y = imRound(y);
    y += h + gap;
  });
}

function imFinishPicker() {
  const picker = im.picker;
  const page = imPage();
  const types = $$("[data-im-pick-type]:checked").map(input => input.dataset.imPickType);
  imSnapshot();
  const region = { id: imUid("rg"), productId: picker.productId, points: picker.points.map(([x, y]) => [imRound(x), imRound(y)]), elements: [] };
  region.elements = imCreateElements(region, types).map(({ _page, ...el }) => el);
  page.regions.push(region);
  im.drawing = [];
  im.picker = null;
  $("#imPicker").classList.add("hidden");
  im.selected = { regionId: region.id };
  imRender();
  imLayoutNew(region, region.elements.map(el => el.id));
  imRender();
  imSave();
  const { total, mapped } = imPageStatus(page);
  toast(mapped >= total ? "حددت كل منتجات القسم 🎉 اضغط «تفعيل الصفحة» لما تخلص" : `تمت الإضافة · باقي ${total - mapped} منتج`);
}

// ---------- أحداث المسرح ----------
function imPoint(event) {
  const rect = $("#imStage").getBoundingClientRect();
  return [imClamp((event.clientX - rect.left) / rect.width, 0, 1), imClamp((event.clientY - rect.top) / rect.height, 0, 1)];
}
function imPx(a, b) {
  const rect = $("#imStage").getBoundingClientRect();
  return Math.hypot((a[0] - b[0]) * rect.width, (a[1] - b[1]) * rect.height);
}
function imCloseDrawing() {
  if (im.drawing.length < 3) return toast("الحدود تحتاج 3 نقاط على الأقل");
  const points = im.drawing.slice();
  imOpenPicker({ points });
}
function imSimplify(points) {
  // يخفف نقاط الرسم الحر (يشيل النقاط القريبة جداً) عشان الكتالوج يبقى خفيف.
  const out = [];
  points.forEach(point => { if (!out.length || imPx(out.at(-1), point) > 7) out.push(point); });
  return out;
}

let imAction = null;
function imPointerDown(event) {
  if (!im || im.screen !== "editor" || im.preview || event.button > 0) return;
  const page = imPage();
  const handle = event.target.closest("[data-im-handle]");
  const elNode = event.target.closest("[data-im-el]");
  const vertex = event.target.closest("[data-im-vertex]");
  const point = imPoint(event);
  if (elNode && !im.drawing.length) {
    const region = page.regions.find(item => item.id === elNode.dataset.imOwner);
    const el = region?.elements.find(item => item.id === elNode.dataset.imEl);
    if (!el) return;
    event.preventDefault();
    imSnapshot();
    if (!handle && el.h === 0 && IM_WRAP_TYPES.has(el.type)) { /* keep auto height */ }
    const rect = $("#imStage").getBoundingClientRect();
    const start = { x: el.x, y: el.y, w: el.w || elNode.offsetWidth / rect.width, h: el.h || elNode.offsetHeight / rect.height };
    imAction = { kind: handle ? "resize" : "move", dir: handle?.dataset.imHandle, el, region, start, origin: point, moved: false, node: elNode };
    if (im.selected?.elId !== el.id) { im.selected = { regionId: region.id, elId: el.id }; imRender(); imAction.node = $(`#imStage [data-im-el="${CSS.escape(el.id)}"]`); }
    $("#imStage").setPointerCapture(event.pointerId);
    return;
  }
  if (vertex) {
    const region = page.regions.find(item => item.id === im.selected?.regionId);
    if (!region) return;
    event.preventDefault();
    imSnapshot();
    imAction = { kind: "vertex", region, index: Number(vertex.dataset.imVertex), moved: false };
    $("#imStage").setPointerCapture(event.pointerId);
    return;
  }
  if (im.mode === "draw") {
    event.preventDefault();
    imAction = { kind: "draw", origin: point, startTime: Date.now(), free: [] };
    $("#imStage").setPointerCapture(event.pointerId);
    return;
  }
  const regionNode = event.target.closest("[data-im-region]");
  im.selected = regionNode ? { regionId: regionNode.dataset.imRegion } : null;
  imRender();
}
function imPointerMove(event) {
  if (!im || im.screen !== "editor") return;
  const point = imPoint(event);
  if (!imAction) {
    const rubber = $("#imRubber");
    const page = imPage();
    if (rubber && page) { rubber.setAttribute("x2", point[0] * page.width); rubber.setAttribute("y2", point[1] * page.height); }
    return;
  }
  const action = imAction;
  if (action.kind === "draw") {
    if (!action.free.length && imPx(action.origin, point) > 8 && !im.drawing.length) action.free.push(action.origin);
    if (action.free.length) {
      action.free.push(point);
      im.drawing = imSimplify(action.free);
      imRender();
    }
    return;
  }
  if (action.kind === "vertex") {
    action.region.points[action.index] = [imRound(point[0]), imRound(point[1])];
    action.moved = true;
    imRender();
    return;
  }
  const dx = point[0] - action.origin[0], dy = point[1] - action.origin[1];
  if (!action.moved && Math.hypot(dx, dy) < 0.002) return;
  action.moved = true;
  const el = action.el, s = action.start;
  const guideV = $("#imGuideV"), guideH = $("#imGuideH");
  if (action.kind === "move") {
    let x = s.x + dx, y = s.y + dy;
    const box = imBBox(action.region.points);
    const center = x + s.w / 2;
    const snapX = [box.cx, 0.5].find(target => Math.abs(center - target) < 0.008);
    if (snapX !== undefined) x = snapX - s.w / 2;
    const middle = y + s.h / 2;
    const snapY = Math.abs(middle - box.cy) < 0.006 ? box.cy : undefined;
    if (snapY !== undefined) y = snapY - s.h / 2;
    guideV?.classList.toggle("hidden", snapX === undefined);
    guideH?.classList.toggle("hidden", snapY === undefined);
    if (snapX !== undefined && guideV) guideV.style.left = `${snapX * 100}%`;
    if (snapY !== undefined && guideH) guideH.style.top = `${snapY * 100}%`;
    el.x = imRound(x); el.y = imRound(y);
  } else {
    const dir = action.dir;
    if (dir === "e") el.w = imRound(Math.max(0.03, s.w + dx));
    if (dir === "w") { const w = Math.max(0.03, s.w - dx); el.x = imRound(s.x + s.w - w); el.w = imRound(w); }
    if (dir === "s") el.h = imRound(Math.max(0.01, s.h + dy));
    if (dir === "n") { const h = Math.max(0.01, s.h - dy); el.y = imRound(s.y + s.h - h); el.h = imRound(h); }
  }
  if (action.node) action.node.setAttribute("style", imElementStyle(el));
}
function imPointerUp(event) {
  if (!im || !imAction) return;
  const action = imAction;
  imAction = null;
  $("#imGuideV")?.classList.add("hidden");
  $("#imGuideH")?.classList.add("hidden");
  if (action.kind === "draw") {
    if (action.free.length) {
      // رسم حر: يتسكّر تلقائياً لما ترفع الماوس.
      im.drawing = imSimplify(action.free);
      if (im.drawing.length >= 3) return imCloseDrawing();
      im.drawing = [];
      return imRender();
    }
    const point = imPoint(event);
    if (im.drawing.length >= 3 && imPx(im.drawing[0], point) < 14) return imCloseDrawing();
    im.drawing.push(point);
    return imRender();
  }
  if (action.kind === "vertex" || action.moved) { imSave(); imRender(); return; }
  im.history.pop(); // ضغطة بدون تحريك: لا تنحسب تعديل
  imRender();
}

function imMutateSelected(mutator) {
  const page = imPage();
  const region = page?.regions.find(item => item.id === im.selected?.regionId);
  const el = region?.elements.find(item => item.id === im.selected?.elId);
  if (!el) return;
  imSnapshot();
  mutator(el, region);
  imSave();
  imRender();
}

function imBindShell() {
  const stage = $("#imStage");
  stage.addEventListener("pointerdown", imPointerDown);
  stage.addEventListener("pointermove", imPointerMove);
  stage.addEventListener("pointerup", imPointerUp);
  stage.addEventListener("pointercancel", () => { imAction = null; });
  stage.addEventListener("dblclick", event => { if (im?.drawing.length >= 3) { event.preventDefault(); im.drawing.pop(); imCloseDrawing(); } });
  $("#imBack").addEventListener("click", () => {
    if (im.screen === "image" && !im.replace) { im.screen = "category"; return imShow(); }
    if (im.screen === "image" && im.replace) { im.replace = false; im.file = null; im.screen = "editor"; return imShow(); }
    imClose();
  });
  $("#imImageBack").addEventListener("click", () => $("#imBack").click());
  $("#imCategoryGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-im-category]");
    if (!button) return;
    im.categoryId = button.dataset.imCategory;
    const existing = imCover().imagePages.find(page => String(page.categoryId) === String(im.categoryId));
    if (existing) { im.pageId = existing.id; im.screen = "editor"; } else { im.pageId = ""; im.screen = "image"; }
    imShow();
  });
  $("#imFile").addEventListener("change", event => { const file = event.target.files?.[0]; if (file) imPickFile(file); event.target.value = ""; });
  const drop = $("#imDrop");
  ["dragenter", "dragover"].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach(type => drop.addEventListener(type, () => drop.classList.remove("is-over")));
  drop.addEventListener("drop", event => { event.preventDefault(); const file = event.dataTransfer?.files?.[0]; if (file) imPickFile(file); });
  $("#imStart").addEventListener("click", imStartEditing);
  $("#imDraw").addEventListener("click", () => { im.mode = "draw"; im.preview = false; im.selected = null; imRender(); });
  $("#imSelectMode").addEventListener("click", () => { im.mode = "select"; im.drawing = []; im.preview = false; imRender(); });
  $("#imUndo").addEventListener("click", () => imRestore(im.history, im.future));
  $("#imRedo").addEventListener("click", () => imRestore(im.future, im.history));
  $("#imZoom").addEventListener("input", event => { im.zoom = Number(event.target.value); imApplyZoom(); $("#imZoomValue").textContent = `${im.zoom}%`; });
  $("#imPreview").addEventListener("click", () => { im.preview = !im.preview; im.drawing = []; im.selected = null; imRender(); });
  $("#imReplace").addEventListener("click", () => { im.replace = true; im.file = null; im.screen = "image"; imShow(); });
  $("#imActivate").addEventListener("click", () => {
    const page = imPage();
    if (!page) return;
    if (page.active) {
      if (!confirm("إيقاف الصفحة؟ الغلاف يرجع يعرض القسم بالشكل العادي.")) return;
      page.active = false; imSave(); imRender(); return toast("تم إيقاف صفحة الصورة");
    }
    if (!page.regions.length) return toast("حدد منتج واحد على الأقل قبل التفعيل");
    const { total, mapped } = imPageStatus(page);
    if (mapped < total && !confirm(`باقي ${total - mapped} منتج ما حددتهم على الصورة، وما راح يظهرون في الغلاف. تفعّل الصفحة؟`)) return;
    page.active = true; imSave("جارٍ تفعيل صفحة الصورة…"); imRender();
    toast("تم تفعيل الصفحة 🎉 تظهر الحين في المنصة داخل الغلاف");
  });
  $("#imPanel").addEventListener("input", event => {
    const prop = event.target.dataset.imProp;
    if (prop !== "size") return;
    const page = imPage();
    const region = page.regions.find(item => item.id === im.selected?.regionId);
    const el = region?.elements.find(item => item.id === im.selected?.elId);
    if (!el) return;
    if (!im.sizing) { imSnapshot(); im.sizing = true; }
    el.size = imRound(Number(event.target.value));
    const node = $(`#imStage [data-im-el="${CSS.escape(el.id)}"]`);
    if (node) node.setAttribute("style", imElementStyle(el));
    event.target.closest(".im-range").querySelector("output").textContent = `${Math.round(el.size * 40)}%`;
  });
  $("#imPanel").addEventListener("change", event => {
    if (event.target.dataset.imProp === "size") { im.sizing = false; imSave(); return; }
    if (event.target.matches("[data-im-plate]")) return imMutateSelected(el => { el.plate = event.target.checked; });
    const type = event.target.dataset.imAttach;
    if (!type) return;
    const page = imPage();
    const region = page.regions.find(item => item.id === im.selected?.regionId);
    if (!region) return;
    imSnapshot();
    if (event.target.checked) {
      const [el] = imCreateElements(region, [type]).map(({ _page, ...item }) => item);
      region.elements.push(el);
      imRender();
      imLayoutNew(region, [el.id]);
      // يحطه تحت آخر مرفق موجود بدل ما يغطيه.
      const others = region.elements.filter(item => item.id !== el.id);
      if (others.length) { const last = others.reduce((a, b) => (a.y > b.y ? a : b)); el.y = imRound(Math.min(0.98, last.y + 0.035)); }
    } else {
      region.elements = region.elements.filter(item => item.type !== type);
    }
    imSave();
    imRender();
  });
  $("#imPanel").addEventListener("click", event => {
    const target = event.target;
    const color = target.closest("[data-im-color]");
    if (color) return imMutateSelected(el => { el.color = color.dataset.imColor; });
    const align = target.closest("[data-im-align]");
    if (align) return imMutateSelected(el => { el.align = align.dataset.imAlign; });
    if (target.closest("[data-im-autoheight]")) return imMutateSelected(el => { el.h = 0; });
    const center = target.closest("[data-im-center]");
    if (center) return imMutateSelected((el, region) => {
      const node = $(`#imStage [data-im-el="${CSS.escape(el.id)}"]`);
      const rect = $("#imStage").getBoundingClientRect();
      const w = el.w || (node ? node.offsetWidth / rect.width : 0);
      const cx = center.dataset.imCenter === "page" ? 0.5 : imBBox(region.points).cx;
      el.x = imRound(cx - w / 2);
    });
    if (target.closest("[data-im-remove-el]")) {
      const page = imPage();
      const region = page.regions.find(item => item.id === im.selected?.regionId);
      if (!region) return;
      imSnapshot();
      region.elements = region.elements.filter(item => item.id !== im.selected.elId);
      im.selected = { regionId: region.id };
      imSave(); return imRender();
    }
    const select = target.closest("[data-im-select-region]");
    if (select) { im.selected = { regionId: select.dataset.imSelectRegion }; im.mode = "select"; imRender(); return imScrollToRegion(select.dataset.imSelectRegion); }
    if (target.closest("[data-im-draw-hint]")) { im.mode = "draw"; im.selected = null; imRender(); return toast("ارسم حدود المنتج على الصورة، وبعدها تختاره من القائمة"); }
    if (target.closest("[data-im-change-product]")) return imOpenPicker({ regionId: im.selected.regionId });
    if (target.closest("[data-im-remove-region]")) {
      const page = imPage();
      if (!confirm("حذف تحديد المنتج ومرفقاته؟")) return;
      imSnapshot();
      page.regions = page.regions.filter(item => item.id !== im.selected.regionId);
      im.selected = null; imSave(); return imRender();
    }
  });
  $("#imPicker").addEventListener("input", event => {
    if (event.target.id !== "imPickerSearch") return;
    im.picker.search = event.target.value;
    const caret = event.target.selectionStart;
    imRenderPicker();
    const input = $("#imPickerSearch"); input.focus(); input.setSelectionRange(caret, caret);
  });
  $("#imPicker").addEventListener("click", event => {
    if (event.target === $("#imPicker") || event.target.closest("[data-im-picker-close]")) return imClosePicker(true);
    const pick = event.target.closest("[data-im-pick]");
    if (pick) {
      if (im.picker.regionId) {
        const page = imPage();
        const region = page.regions.find(item => item.id === im.picker.regionId);
        imSnapshot();
        region.productId = pick.dataset.imPick;
        const allowed = new Set(imAvailableTypes(productById(region.productId)));
        region.elements = region.elements.filter(el => allowed.has(el.type));
        imSave();
        return imClosePicker(false);
      }
      im.picker.productId = pick.dataset.imPick;
      im.picker.step = "attach";
      return imRenderPicker();
    }
    if (event.target.closest("[data-im-picker-back]")) { im.picker.step = "product"; return imRenderPicker(); }
    if (event.target.closest("[data-im-picker-add]")) return imFinishPicker();
  });
  document.addEventListener("keydown", event => {
    if (!im || im.screen !== "editor" || $("#imEditor").classList.contains("hidden")) return;
    if (event.target.matches("input, textarea, select")) return;
    const key = event.key;
    if (!$("#imPicker").classList.contains("hidden")) { if (key === "Escape") imClosePicker(true); return; }
    if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "z") { event.preventDefault(); return event.shiftKey ? imRestore(im.future, im.history) : imRestore(im.history, im.future); }
    if (im.drawing.length) {
      if (key === "Escape") { im.drawing = []; return imRender(); }
      if (key === "Backspace") { event.preventDefault(); im.drawing.pop(); return imRender(); }
      if (key === "Enter") { event.preventDefault(); return imCloseDrawing(); }
      return;
    }
    if (key === "Escape") { im.selected = null; return imRender(); }
    if ((key === "Delete" || key === "Backspace") && im.selected?.elId) { event.preventDefault(); return $("[data-im-remove-el]")?.click(); }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
    if (arrows && im.selected?.elId) {
      event.preventDefault();
      const step = event.shiftKey ? 0.01 : 0.002;
      return imMutateSelected(el => { el.x = imRound(el.x + arrows[0] * step); el.y = imRound(el.y + arrows[1] * step); });
    }
  });
  window.addEventListener("resize", () => { if (im?.screen === "editor") { imFitZoom(); imApplyZoom(); } });
}
function imScrollToRegion(regionId) {
  const page = imPage();
  const region = page?.regions.find(item => item.id === regionId);
  if (!region) return;
  const box = imBBox(region.points);
  const stage = $("#imStage"), canvas = $("#imCanvas");
  const top = stage.offsetTop + box.y * stage.offsetHeight - 80;
  canvas.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

// ---------- ربط بصفحة الغلاف في الإدارة ----------
document.addEventListener("click", event => {
  if (event.target.closest("#coverImagePageBtn")) return imOpen(activeAdminCoverId);
  const open = event.target.closest("[data-im-open]");
  if (open) return imOpen(activeAdminCoverId, open.dataset.imOpen);
  const toggle = event.target.closest("[data-im-toggle]");
  if (toggle) {
    const page = activeAdminCover()?.imagePages?.find(item => item.id === toggle.dataset.imToggle);
    if (!page) return;
    if (!page.active && !page.regions.length) return toast("حدد منتج واحد على الأقل قبل التفعيل");
    page.active = !page.active;
    markDirty(); render();
    return toast(page.active ? "تم تفعيل صفحة الصورة" : "تم إيقاف صفحة الصورة");
  }
  const remove = event.target.closest("[data-im-delete]");
  if (remove) {
    const cover = activeAdminCover();
    const page = cover?.imagePages?.find(item => item.id === remove.dataset.imDelete);
    if (!page || !confirm("حذف صفحة الصورة وكل التحديدات اللي فيها؟")) return;
    cover.imagePages = cover.imagePages.filter(item => item.id !== page.id);
    if (page.image && typeof deleteStoredAppearanceImage === "function") deleteStoredAppearanceImage(page.image);
    markDirty(); render();
    toast("تم حذف صفحة الصورة");
  }
});
