// «تعديلات المتدرب»: يقارن كتالوج التدريب (/training/catalog) بالكتالوج الحقيقي المحفوظ في الخادم،
// ويعرض العناوين والأقسام والمنتجات اللي تغيّرت. المدير يعتمد عنوان أو قسم أو منتج بعينه فينضاف للكتالوج الحقيقي
// (وينحفظ بنفس حفظ الإدارة)، أو يرفضه فيرجع في نسخة التدريب مثل الحقيقي. الترتيب وحده ما يُعتبر تعديل.
(function () {
  if (window.TRAINING_MODE) return;
  const menuButton = document.getElementById("trainingReviewPage");
  if (!menuButton) return;

  const dialog = document.createElement("dialog");
  dialog.id = "trainingReviewDialog";
  dialog.className = "training-review-dialog";
  dialog.innerHTML = `<div class="dialog-card">
    <header><div><span class="eyebrow">نسخة التدريب</span><h2>تعديلات المتدرب</h2><small id="trainingReviewMeta"></small></div><button type="button" class="icon-btn" data-training-close>×</button></header>
    <div class="training-review-tools">
      <button type="button" data-training-refresh>تحديث</button>
      <button type="button" data-training-link>نسخ رابط التدريب</button>
      <button type="button" class="delete" data-training-reset>تصفير نسخة التدريب</button>
    </div>
    <div id="trainingReviewBody" class="training-review-body"></div>
  </div>`;
  document.body.append(dialog);
  const body = dialog.querySelector("#trainingReviewBody");

  let real = null;
  let training = null;
  let busy = false;

  const STATUS = { added: "جديد", changed: "معدّل", removed: "محذوف" };
  const PRODUCT_FIELDS = {
    name: "الاسم", nameEn: "الاسم الإنجليزي", price: "السعر", originalPrice: "السعر الأصلي", description: "الوصف", descriptionEn: "الوصف الإنجليزي",
    images: "الصور", image: "الصور", options: "الخيارات", active: "الظهور", availability: "حالة التوفر", category: "القسم", inventory: "الكمية",
    badgeAr: "العبارة المميزة", badgeEn: "العبارة المميزة", preparation: "وقت التحضير"
  };
  const CATEGORY_FIELDS = { nameAr: "الاسم", nameEn: "الاسم الإنجليزي", active: "الظهور", sectionImage: "الصورة التوضيحية", catalogType: "يخص" };
  const HEADING_FIELDS = { nameAr: "الاسم", nameEn: "الاسم الإنجليزي", categoryIds: "الأقسام", subheadings: "العناوين الفرعية" };

  const sorted = value => Array.isArray(value) ? value.map(sorted)
    : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, sorted(value[key])])) : value;
  const canon = (item, skip = ["order"]) => JSON.stringify(sorted(Object.fromEntries(Object.entries(item || {}).filter(([key]) => !skip.includes(key)))));
  const byId = list => new Map((Array.isArray(list) ? list : []).map(item => [String(item.id), item]));
  const nameOf = item => item?.nameAr || item?.name || item?.nameEn || item?.id || "";
  const headingCategoryIds = heading => [...(heading?.categoryIds || []), ...(heading?.subheadings || []).flatMap(group => group.categoryIds || [])];

  function changedFields(a, b, labels) {
    if (!a || !b) return [];
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const names = [...keys].filter(key => key !== "order" && JSON.stringify(sorted(a[key])) !== JSON.stringify(sorted(b[key]))).map(key => labels[key] || "إعدادات أخرى");
    return [...new Set(names)];
  }
  function diffList(realList, trainingList, labels) {
    const before = byId(realList), after = byId(trainingList), result = new Map();
    after.forEach((item, id) => {
      const old = before.get(id);
      if (!old) result.set(id, { id, status: "added", item, fields: [] });
      else if (canon(old) !== canon(item)) result.set(id, { id, status: "changed", item, old, fields: changedFields(old, item, labels) });
    });
    before.forEach((item, id) => { if (!after.has(id)) result.set(id, { id, status: "removed", item, old: item, fields: [] }); });
    return result;
  }

  function computeDiff() {
    const products = diffList(real.products, training.products, PRODUCT_FIELDS);
    const categories = diffList(real.categories, training.categories, CATEGORY_FIELDS);
    const headings = diffList(real.headings, training.headings, HEADING_FIELDS);
    const productCategory = change => String(change.item?.category || change.old?.category || "");
    const productsOf = categoryId => [...products.values()].filter(change => productCategory(change) === categoryId || String(change.old?.category || "") === categoryId);
    // قسم تغيّرت منتجاته بس يطلع كقسم «فيه تعديلات».
    const allCategories = byId([...(real.categories || []), ...(training.categories || [])]);
    const touched = new Set([...categories.keys(), ...[...products.values()].flatMap(change => [change.item?.category, change.old?.category]).filter(Boolean).map(String)]);
    const categoryCards = [...touched].filter(id => allCategories.has(id)).map(id => ({
      id, change: categories.get(id) || null, category: byId(training.categories).get(id) || allCategories.get(id), products: productsOf(id)
    }));
    const loose = [...products.values()].filter(change => !allCategories.has(productCategory(change)));
    return { headings: [...headings.values()], categoryCards, loose };
  }

  // ===== الاعتماد على الكتالوج الحقيقي (بيانات صفحة الإدارة) =====
  const trainingProduct = id => (training.products || []).find(item => String(item.id) === id);
  const trainingCategory = id => (training.categories || []).find(item => String(item.id) === id);
  const trainingHeading = id => (training.headings || []).find(item => String(item.id) === id);

  function adoptProduct(id) {
    const source = trainingProduct(id);
    const index = products.findIndex(item => String(item.id) === id);
    if (source) { if (index >= 0) products[index] = clone(source); else products.push(clone(source)); }
    else if (index >= 0) products.splice(index, 1);
  }
  function adoptCategory(id) {
    const source = trainingCategory(id);
    const index = categories.findIndex(item => String(item.id) === id);
    if (source) {
      if (index >= 0) categories[index] = { ...clone(source), order: categories[index].order };
      else {
        // يدخل بعد القسم اللي قبله في نسخة التدريب (لو موجود في الحقيقي)، وإلا في الآخر.
        const ordered = (training.categories || []).slice().sort((a, b) => Number(a.order) - Number(b.order));
        const previous = ordered.slice(0, ordered.findIndex(item => String(item.id) === id)).reverse().map(item => categories.find(category => category.id === item.id)).find(Boolean);
        categories.push({ ...clone(source), order: previous ? Number(previous.order) + 0.5 : categories.length + 1 });
      }
    } else if (index >= 0) categories.splice(index, 1);
    const ids = new Set([...products.filter(item => String(item.category) === id), ...(training.products || []).filter(item => String(item.category) === id)].map(item => String(item.id)));
    const realProducts = byId(real.products);
    ids.forEach(productId => {
      const before = realProducts.get(productId), after = trainingProduct(productId);
      if (!before || !after || canon(before) !== canon(after)) adoptProduct(productId);
    });
  }
  function adoptHeading(id) {
    const source = trainingHeading(id);
    const index = headings.findIndex(item => String(item.id) === id);
    if (source) {
      const realCategories = byId(real.categories);
      headingCategoryIds(source).map(String).forEach(categoryId => {
        const before = realCategories.get(categoryId), after = trainingCategory(categoryId);
        const productChanges = computeDiff().categoryCards.find(card => card.id === categoryId)?.products.length;
        if (!before || !after || canon(before) !== canon(after) || productChanges) adoptCategory(categoryId);
      });
      const placed = headingCategoryIds(source).map(categoryId => categories.find(category => category.id === categoryId)).filter(Boolean);
      const order = index >= 0 ? headings[index].order
        : placed.length ? Math.min(...placed.map(category => Number(category.order))) - 0.5
        : Math.max(0, ...categories.map(item => Number(item.order) || 0), ...headings.map(item => Number(item.order) || 0)) + 1;
      if (index >= 0) headings[index] = { ...clone(source), order }; else headings.push({ ...clone(source), order });
    } else if (index >= 0) headings.splice(index, 1);
  }

  // ===== الرفض: نرجّع العنصر في نسخة التدريب مثل الحقيقي =====
  function revertIn(list, realList, id) {
    const source = byId(realList).get(id);
    const index = list.findIndex(item => String(item.id) === id);
    if (source) { if (index >= 0) list[index] = clone(source); else list.push(clone(source)); }
    else if (index >= 0) list.splice(index, 1);
  }
  function rejectCategory(id) {
    revertIn(training.categories, real.categories, id);
    const ids = new Set([...(real.products || []), ...(training.products || [])].filter(item => String(item.category) === id).map(item => String(item.id)));
    ids.forEach(productId => revertIn(training.products, real.products, productId));
  }
  function rejectHeading(id) {
    const source = trainingHeading(id);
    headingCategoryIds(source).map(String).forEach(rejectCategory);
    revertIn(training.headings, real.headings, id);
  }

  async function fetchJson(path, options) {
    const response = await adminRequest(path, options);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "تعذر تحميل بيانات الخادم");
    return data;
  }
  async function load() {
    body.innerHTML = `<div class="empty">جارٍ مقارنة نسخة التدريب بالمنصة…</div>`;
    try {
      [real, training] = await Promise.all([fetchJson("/admin/catalog"), fetchJson("/training/catalog")]);
      renderReview();
    } catch (error) { body.innerHTML = `<div class="empty">${escapeHtml(error.message || "تعذر تحميل بيانات الخادم")}</div>`; }
  }

  const statusBadge = status => `<span class="training-status is-${status}">${STATUS[status]}</span>`;
  const fieldsNote = change => change.fields?.length ? `<small class="training-fields">تغيّر: ${escapeHtml(change.fields.join("، "))}</small>` : "";
  const productRow = change => `<li class="training-product">
      ${statusBadge(change.status)}<span class="training-name">${escapeHtml(nameOf(change.item))}${change.status !== "removed" && change.item?.price != null ? ` <small>${Number(change.item.price).toFixed(3)} د.ك</small>` : ""}</span>
      ${fieldsNote(change)}
      <span class="training-actions"><button type="button" class="primary" data-adopt-product="${escapeHtml(change.id)}">اعتماد</button><button type="button" data-reject-product="${escapeHtml(change.id)}">رفض</button></span>
    </li>`;

  function renderReview() {
    const diff = computeDiff();
    const time = Number(training.trainingUpdatedAt) || 0;
    dialog.querySelector("#trainingReviewMeta").textContent = time ? `آخر تعديل من المتدرب: ${new Date(time).toLocaleString("en-GB", { timeZone: "Asia/Kuwait" })}` : "المتدرب ما عدّل شي بعد";
    if (!diff.headings.length && !diff.categoryCards.length && !diff.loose.length) {
      body.innerHTML = `<div class="empty">ما في تعديلات من المتدرب. نسخة التدريب نفس المنصة الحقيقية.</div>`;
      return;
    }
    const headingCards = diff.headings.map(change => {
      const linked = headingCategoryIds(change.item).map(id => trainingCategory(String(id)) || byId(real.categories).get(String(id))).filter(Boolean);
      return `<article class="training-card">
        <header>${statusBadge(change.status)}<div><strong>${escapeHtml(nameOf(change.item))}</strong><small>${escapeHtml(change.item?.nameEn || "")}</small></div></header>
        ${fieldsNote(change)}
        ${linked.length ? `<p class="training-linked">الأقسام داخله: ${linked.map(item => escapeHtml(nameOf(item))).join("، ")}</p>` : ""}
        <footer><button type="button" class="primary" data-adopt-heading="${escapeHtml(change.id)}">${change.status === "removed" ? "اعتماد الحذف" : "اعتماد العنوان كامل"}</button><button type="button" data-reject-heading="${escapeHtml(change.id)}">رفض</button></footer>
      </article>`;
    }).join("");
    const categoryCards = diff.categoryCards.map(card => {
      const change = card.change;
      const parent = (training.headings || []).find(heading => headingCategoryIds(heading).map(String).includes(card.id));
      return `<article class="training-card">
        <header>${change ? statusBadge(change.status) : `<span class="training-status is-inner">منتجات معدّلة</span>`}<div><strong>${escapeHtml(nameOf(card.category))}</strong><small>${escapeHtml(card.category?.nameEn || "")}</small></div></header>
        ${change ? fieldsNote(change) : ""}
        ${parent ? `<p class="training-linked">داخل عنوان «${escapeHtml(nameOf(parent))}» في نسخة التدريب</p>` : ""}
        ${card.products.length ? `<ul class="training-products">${card.products.map(productRow).join("")}</ul>` : ""}
        <footer><button type="button" class="primary" data-adopt-category="${escapeHtml(card.id)}">${change?.status === "removed" ? "اعتماد الحذف" : "اعتماد القسم كامل"}</button><button type="button" data-reject-category="${escapeHtml(card.id)}">رفض</button></footer>
      </article>`;
    }).join("");
    body.innerHTML = `
      ${headingCards ? `<section><h3>العناوين</h3>${headingCards}</section>` : ""}
      ${categoryCards ? `<section><h3>الأقسام</h3>${categoryCards}</section>` : ""}
      ${diff.loose.length ? `<section><h3>منتجات بدون قسم</h3><article class="training-card"><ul class="training-products">${diff.loose.map(productRow).join("")}</ul></article></section>` : ""}`;
  }

  async function adopt(work, message) {
    if (busy) return;
    if (typeof catalogLoaded !== "undefined" && !catalogLoaded) return toast("الكتالوج ما تحمّل من الخادم؛ حدّث الصفحة قبل الحفظ");
    busy = true; dialog.classList.add("is-busy");
    try {
      work();
      normalizeData();
      render();
      clearTimeout(syncTimer);
      await saveToالخادم();
      toast(message);
      await load();
    } catch (error) { reportSaveFailure(error); }
    finally { busy = false; dialog.classList.remove("is-busy"); }
  }
  async function reject(work) {
    if (busy) return;
    busy = true; dialog.classList.add("is-busy");
    try {
      work();
      await fetchJson("/training/catalog", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(training) });
      toast("تم رفض التعديل ورجع في نسخة التدريب مثل المنصة");
      await load();
    } catch (error) { toast(error.message || "تعذر تنفيذ العملية"); }
    finally { busy = false; dialog.classList.remove("is-busy"); }
  }

  dialog.addEventListener("click", event => {
    const target = event.target.closest("button");
    if (!target) return;
    const data = target.dataset;
    if ("trainingClose" in data) return dialog.close();
    if ("trainingRefresh" in data) return load();
    if ("trainingLink" in data) {
      const link = `${location.origin}${location.pathname}?training`;
      navigator.clipboard?.writeText(link).then(() => toast("انسخ رابط التدريب"), () => prompt("رابط التدريب", link));
      return;
    }
    if ("trainingReset" in data) {
      if (!confirm("تصفير نسخة التدريب؟ تنمسح كل تعديلات المتدرب اللي ما اعتمدتها وترجع النسخة مثل المنصة الحقيقية.")) return;
      fetchJson("/training/catalog/reset", { method: "POST" }).then(() => { toast("رجعت نسخة التدريب مثل المنصة"); load(); }).catch(error => toast(error.message));
      return;
    }
    if (data.adoptProduct) return adopt(() => adoptProduct(data.adoptProduct), "تم اعتماد المنتج في المنصة");
    if (data.adoptCategory) return adopt(() => adoptCategory(data.adoptCategory), "تم اعتماد القسم في المنصة");
    if (data.adoptHeading) return adopt(() => adoptHeading(data.adoptHeading), "تم اعتماد العنوان في المنصة");
    if (data.rejectProduct) return reject(() => revertIn(training.products, real.products, data.rejectProduct));
    if (data.rejectCategory) return reject(() => rejectCategory(data.rejectCategory));
    if (data.rejectHeading) return reject(() => rejectHeading(data.rejectHeading));
  });

  menuButton.addEventListener("click", () => {
    document.getElementById("moreActionsMenu")?.classList.add("hidden");
    document.getElementById("moreActionsTrigger")?.setAttribute("aria-expanded", "false");
    dialog.showModal();
    load();
  });
})();
