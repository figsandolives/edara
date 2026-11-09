// «الأسئلة الاحترازية»: سؤال يظهر للعميل في خطوة مخفية قبل «تأكيد ودفع» إذا كان في سلته
// منتج من منتجات السؤال (مثال: مرض السيلياك مع المنتجات الخالية من الجلوتين).
// البيانات تنحفظ مع الكتالوج: catalog.precautionQuestions = [{ id, text, warning, invoiceNote, productIds, active }].
function normalizePrecautionQuestions(list) {
  return (Array.isArray(list) ? list : []).filter(item => item && item.id).map(item => ({
    id: String(item.id),
    text: String(item.text || ""),
    warning: String(item.warning || ""),
    invoiceNote: String(item.invoiceNote || ""),
    productIds: [...new Set((Array.isArray(item.productIds) ? item.productIds : []).map(String))],
    active: item.active !== false
  }));
}

(function () {
  const menuButton = document.getElementById("precautionsPage");
  if (!menuButton) return;
  const esc = value => escapeHtml(value);

  const dialog = document.createElement("dialog");
  dialog.id = "precautionsDialog";
  dialog.className = "precautions-dialog";
  dialog.innerHTML = `<div class="dialog-card"><div id="precautionsView"></div></div>`;
  document.body.append(dialog);
  const view = dialog.querySelector("#precautionsView");

  const addDialog = document.createElement("dialog");
  addDialog.id = "precautionAddDialog";
  addDialog.className = "precaution-add-dialog";
  addDialog.innerHTML = `<form method="dialog" class="dialog-card" id="precautionAddForm">
    <header><div><span class="eyebrow">الأسئلة الاحترازية</span><h2>إضافة سؤال</h2></div><button type="button" class="icon-btn" data-close-dialog="precautionAddDialog" aria-label="إغلاق">×</button></header>
    <label>السؤال<textarea name="text" rows="3" maxlength="300" required placeholder="مثال: هل انت مصاب بمرض السيلياك (الداء البطني)؟"></textarea></label>
    <footer><button type="button" data-close-dialog="precautionAddDialog">إلغاء</button><button type="submit" class="primary">إضافة</button></footer>
  </form>`;
  document.body.append(addDialog);
  addDialog.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => addDialog.close()));

  let selectedId = "";
  const selected = () => precautionQuestions.find(item => item.id === selectedId);
  const productName = product => product?.name || product?.nameAr || product?.nameEn || "";
  const productImageSrc = product => product?.image || (Array.isArray(product?.images) ? product.images[0] : "") || "";

  const header = (title, actions = "", back = false) => `<header class="pq-head">
    <button type="button" class="pq-back" data-pq="${back ? "list" : "close"}" aria-label="رجوع">→ رجوع</button>
    <h2>${esc(title)}</h2><div class="pq-actions">${actions}<button type="button" class="icon-btn" data-pq="close" aria-label="إغلاق">×</button></div></header>`;

  function render() { selected() ? renderDetails() : renderList(); }

  function renderList() {
    selectedId = "";
    const cards = precautionQuestions.map(item => `<button type="button" class="pq-card" data-pq-open="${esc(item.id)}">
      <strong>${esc(item.text)}</strong>
      <span><b>${item.productIds.length}</b> منتج مرتبط${item.active ? "" : ` · <em>موقوف</em>`}</span>
    </button>`).join("");
    view.innerHTML = `${header("الأسئلة الاحترازية", "", false)}
      <button type="button" class="primary pq-add" data-pq="add">＋ إضافة سؤال</button>
      <p class="pq-hint">يظهر السؤال للعميل قبل مرحلة الدفع إذا أضاف لسلته أي منتج من منتجات السؤال.</p>
      <div class="pq-list">${cards || `<p class="pq-empty">لا توجد أسئلة إلى الآن.</p>`}</div>`;
  }

  function renderDetails() {
    const item = selected();
    const rows = item.productIds.map(id => {
      const product = productById(id);
      return `<li class="${product ? "" : "is-missing"}">${product ? thumbImg(productImageSrc(product)) : `<span class="pq-noimg"></span>`}<span>${esc(product ? productName(product) : `منتج محذوف (${id})`)}</span><button type="button" class="icon-btn delete" data-pq-remove="${esc(id)}" aria-label="إزالة">×</button></li>`;
    }).join("");
    view.innerHTML = `${header("السؤال", "", true)}
      <div class="pq-form">
        <label>السؤال<textarea data-pq-field="text" rows="2" maxlength="300">${esc(item.text)}</textarea></label>
        <label>العبارة اللي تطلع للعميل إذا جاوب «نعم»<textarea data-pq-field="warning" rows="2" maxlength="400" placeholder="يرجى العلم أن منتجاتنا … المضافة في سلتك .. غير مناسبة …">${esc(item.warning)}</textarea></label>
        <label>إقرار العميل في الفاتورة (يطبع إذا جاوب «نعم» وتابع الدفع)<textarea data-pq-field="invoiceNote" rows="4" maxlength="1500">${esc(item.invoiceNote)}</textarea></label>
        <label class="pq-switch"><input type="checkbox" data-pq-field="active" ${item.active ? "checked" : ""}> السؤال مفعّل في المنصة</label>
      </div>
      <div class="pq-products-head"><h3>المنتجات المتعلقة بالسؤال <small>(${item.productIds.length})</small></h3><button type="button" class="primary" data-pq="pick">＋ إضافة</button></div>
      <ul class="pq-products">${rows || `<li class="pq-empty">ما في منتجات. اضغط «إضافة» واختر من المنصة.</li>`}</ul>
      <button type="button" class="pq-delete" data-pq="delete">حذف السؤال</button>`;
  }

  function save() { markDirty(); }

  function openPicker() {
    const item = selected();
    if (!item) return;
    openStorePicker({
      multi: true,
      title: "منتجات السؤال الاحترازي",
      hint: "اضغط على المنتجات من المنصة لتحديدها أو إلغاء تحديدها، ثم «تأكيد».",
      selected: item.productIds,
      onConfirm: ids => {
        item.productIds = [...new Set(ids.map(String))];
        save();
        renderDetails();
        toast(`صار في السؤال ${item.productIds.length} منتج`);
        return true;
      }
    });
  }

  menuButton.addEventListener("click", () => { selectedId = ""; render(); dialog.showModal(); });

  dialog.addEventListener("click", event => {
    const action = event.target.closest("[data-pq]")?.dataset.pq;
    const open = event.target.closest("[data-pq-open]")?.dataset.pqOpen;
    const remove = event.target.closest("[data-pq-remove]")?.dataset.pqRemove;
    if (open) { selectedId = open; renderDetails(); view.scrollTop = 0; return; }
    if (remove) { const item = selected(); item.productIds = item.productIds.filter(id => id !== remove); save(); renderDetails(); return; }
    if (action === "close") return dialog.close();
    if (action === "list") return renderList();
    if (action === "add") { addDialog.querySelector("form").reset(); addDialog.showModal(); addDialog.querySelector("textarea").focus(); return; }
    if (action === "pick") return openPicker();
    if (action === "delete") {
      const item = selected();
      if (!item || !confirm(`حذف السؤال «${item.text}»؟`)) return;
      precautionQuestions = precautionQuestions.filter(entry => entry.id !== item.id);
      save();
      renderList();
    }
  });

  dialog.addEventListener("input", event => {
    const field = event.target.dataset?.pqField;
    const item = selected();
    if (!field || !item) return;
    item[field] = field === "active" ? event.target.checked : event.target.value;
    save();
  });

  addDialog.querySelector("form").addEventListener("submit", event => {
    const text = String(new FormData(event.target).get("text") || "").trim();
    if (!text) { event.preventDefault(); return; }
    const item = { id: `pq${Date.now().toString(36)}`, text, warning: "", invoiceNote: "", productIds: [], active: true };
    precautionQuestions.push(item);
    save();
    selectedId = item.id;
    renderDetails();
  });
})();
