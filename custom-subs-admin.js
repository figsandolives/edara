// «اشتراكات مخصصة»: قائمة العملاء وروابطهم (figsolives.online/customized-subscriptions/#رقم)،
// وإعدادات أقسام الوجبات اللي يختار منها العميل. كل سطر في مربع القسم منتج، والحفظ تلقائي.
// البيانات: /admin/custom-subs على الخادم.
(function () {
  if (window.TRAINING_MODE) return;
  const menuButton = document.getElementById("customSubsPage");
  if (!menuButton) return;

  const LINK_BASE = "https://figsolives.online/customized-subscriptions/#";
  const ORDINALS = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع"];
  const esc = value => escapeHtml(value);
  const linkOf = sub => `${LINK_BASE}${sub.code}`;

  const dialog = document.createElement("dialog");
  dialog.id = "customSubsDialog";
  dialog.className = "custom-subs-dialog";
  dialog.innerHTML = `<div class="dialog-card"><div id="customSubsView"></div></div>`;
  document.body.append(dialog);
  const view = dialog.querySelector("#customSubsView");

  let subs = [], sections = [], loaded = false, screen = "list", selected = null;
  let saveTimer = 0, saving = false, savePending = false;

  const header = (title, actions = "", back = false) => `<header class="cs-head">
    ${back ? `<button type="button" class="icon-btn" data-cs="list" aria-label="رجوع">→</button>` : ""}
    <h2>${esc(title)}</h2><div class="cs-actions">${actions}<button type="button" class="icon-btn" data-cs="close" aria-label="إغلاق">×</button></div></header>`;
  const countLabel = sub => sub.status === "submitted" ? "تم تحديد الأصناف" : "لم يتم التحديد إلى الآن";

  function render() {
    if (screen === "settings") return renderSettings();
    if (screen === "add") return renderAdd();
    if (screen === "details") return renderDetails();
    renderList();
  }
  function renderList() {
    const cards = subs.map(sub => `<article class="cs-card">
      <div class="cs-card-top"><div><strong>${esc(sub.name)}</strong><small><bdi>${esc(sub.phone)}</bdi> · ${esc(sub.type)}</small></div><span class="cs-code">#${esc(sub.code)}</span></div>
      <span class="cs-status ${sub.status === "submitted" ? "is-done" : ""}">${countLabel(sub)}</span>
      <div class="cs-card-actions"><button type="button" data-cs-view="${esc(sub.code)}">عرض</button><button type="button" data-cs-copy="${esc(sub.code)}">نسخ الرابط</button></div>
    </article>`).join("");
    view.innerHTML = `${header("اشتراكات مخصصة", `<button type="button" data-cs="settings">الإعدادات</button><button type="button" class="primary cs-plus" data-cs="add" aria-label="إضافة اشتراك">＋</button>`)}
      <div class="cs-list">${loaded ? cards || `<p class="cs-empty">لا توجد اشتراكات إلى الآن. اضغط ＋ لإضافة أول عميل.</p>` : `<p class="cs-empty">جاري التحميل…</p>`}</div>`;
  }
  function renderAdd() {
    view.innerHTML = `${header("اشتراك جديد", "", true)}
      <form class="cs-form" id="customSubsForm">
        <label>اسم العميل<input name="name" maxlength="80" required autocomplete="off"></label>
        <label>رقم الهاتف<input name="phone" type="tel" inputmode="numeric" maxlength="20" required autocomplete="off" dir="ltr"></label>
        <label>نوع الاشتراك<input name="type" maxlength="80" required autocomplete="off"></label>
        <p class="cs-error" id="customSubsError" role="alert"></p>
        <button type="submit" class="primary">توليد رابط</button>
      </form>`;
    view.querySelector("input").focus();
  }
  function renderDetails() {
    const sub = selected;
    const days = (sub.days || []).map((day, index) => `<div class="cs-day"><b>اليوم ${ORDINALS[index]}</b><ul>${day.items.map(entry => `<li>${esc(entry.item)} <small>${esc(entry.section)}</small></li>`).join("")}</ul></div>`).join("");
    view.innerHTML = `${header(sub.name, "", true)}
      <p class="cs-meta"><bdi>${esc(sub.phone)}</bdi> · ${esc(sub.type)} · <span class="cs-status ${sub.status === "submitted" ? "is-done" : ""}">${countLabel(sub)}</span></p>
      <div class="cs-link"><bdi>${esc(linkOf(sub))}</bdi><div class="cs-card-actions"><a class="cs-open" href="${esc(linkOf(sub))}" target="_blank" rel="noopener">فتح الرابط</a><button type="button" data-cs-copy="${esc(sub.code)}">نسخ الرابط</button></div></div>
      ${days ? `<div class="cs-days">${days}</div>` : `<p class="cs-empty">العميل لم يحدد الأصناف إلى الآن.</p>`}`;
  }
  function renderSettings() {
    const cards = sections.map((section, index) => `<article class="cs-section" data-index="${index}">
      <div class="cs-section-head">
        <button type="button" class="icon-btn" data-cs-move="-1" ${index === 0 ? "disabled" : ""} aria-label="تحريك لأعلى">↑</button>
        <button type="button" class="icon-btn" data-cs-move="1" ${index === sections.length - 1 ? "disabled" : ""} aria-label="تحريك لأسفل">↓</button>
        <input class="cs-title" value="${esc(section.title)}" maxlength="80" aria-label="عنوان القسم">
        <button type="button" class="icon-btn delete" data-cs-delete aria-label="حذف القسم">×</button>
      </div>
      <textarea class="cs-items" rows="6" placeholder="كل سطر منتج" aria-label="منتجات القسم">${esc(section.text)}</textarea>
      <small>${index === 0 ? "القسم الأول: لازم يختار منه العميل منتج (بدون خيار «بدون»)." : "يظهر للعميل خيار «بدون» تلقائياً آخر القائمة."}</small>
    </article>`).join("");
    view.innerHTML = `${header("إعدادات الأقسام", `<button type="button" class="primary cs-plus" data-cs="add-section" aria-label="إضافة قسم">＋</button>`, true)}
      <p class="cs-save" id="customSubsSave" role="status"></p>
      <form class="cs-new-section hidden" id="customSubsNewSection"><input name="title" maxlength="80" placeholder="عنوان القسم بالعربي" autocomplete="off" required><button type="submit" class="primary">إضافة</button></form>
      <div class="cs-sections">${cards || `<p class="cs-empty">لا توجد أقسام. اضغط ＋ لإضافة أول قسم.</p>`}</div>`;
  }

  // ===== الخادم =====
  async function load() {
    loaded = false;
    render();
    try {
      const response = await adminRequest("/admin/custom-subs");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر التحميل");
      subs = data.subs || [];
      sections = (data.settings?.sections || []).map(section => ({ id: section.id, title: section.title, text: (section.items || []).join("\n") }));
      loaded = true;
      render();
    } catch (error) {
      view.innerHTML = `${header("اشتراكات مخصصة")}<p class="cs-empty">${esc(error.message)}</p>`;
    }
  }
  function setSaveText(text, isError = false) {
    const status = dialog.querySelector("#customSubsSave");
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-error", isError);
  }
  function queueSave() {
    setSaveText("جاري الحفظ…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveSettings, 600);
  }
  async function saveSettings() {
    clearTimeout(saveTimer);
    saveTimer = 0;
    if (saving) { savePending = true; return; }
    saving = true;
    try {
      const body = { sections: sections.filter(section => section.title.trim()).map(section => ({ id: section.id, title: section.title, items: section.text.split("\n") })) };
      const response = await adminRequest("/admin/custom-subs/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "تعذر الحفظ");
      setSaveText("تم الحفظ");
    } catch (error) {
      setSaveText(`لم يتم الحفظ: ${error.message}`, true);
    } finally {
      saving = false;
      if (savePending) { savePending = false; saveSettings(); }
    }
  }
  const flushSave = () => { if (saveTimer) saveSettings(); };

  async function copyLink(code, button) {
    const link = `${LINK_BASE}${code}`;
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(link);
      button.textContent = "تم النسخ ✓";
    } catch {
      window.prompt("انسخ الرابط", link);
    }
    setTimeout(() => { button.textContent = original; }, 1500);
  }

  // ===== الأحداث =====
  menuButton.addEventListener("click", () => { screen = "list"; dialog.showModal(); load(); });
  dialog.addEventListener("close", flushSave);
  dialog.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.cs;
    if (action === "close") dialog.close();
    else if (action === "list") { flushSave(); screen = "list"; render(); }
    else if (action === "settings") { screen = "settings"; render(); }
    else if (action === "add") { screen = "add"; render(); }
    else if (action === "add-section") {
      const form = dialog.querySelector("#customSubsNewSection");
      form.classList.remove("hidden");
      form.elements.title.focus();
    }
    else if (button.dataset.csView) { selected = subs.find(sub => sub.code === button.dataset.csView); screen = "details"; render(); }
    else if (button.dataset.csCopy) copyLink(button.dataset.csCopy, button);
    else if (button.dataset.csMove) {
      const index = Number(button.closest(".cs-section").dataset.index);
      const target = index + Number(button.dataset.csMove);
      [sections[index], sections[target]] = [sections[target], sections[index]];
      renderSettings();
      queueSave();
    }
    else if (button.hasAttribute("data-cs-delete")) {
      const index = Number(button.closest(".cs-section").dataset.index);
      if (!window.confirm(`حذف قسم «${sections[index].title}» ومنتجاته؟`)) return;
      sections.splice(index, 1);
      renderSettings();
      queueSave();
    }
  });
  dialog.addEventListener("input", event => {
    const card = event.target.closest(".cs-section");
    if (!card) return;
    const section = sections[Number(card.dataset.index)];
    if (event.target.classList.contains("cs-title")) section.title = event.target.value;
    else if (event.target.classList.contains("cs-items")) section.text = event.target.value;
    else return;
    queueSave();
  });
  dialog.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.target;
    if (form.id === "customSubsNewSection") {
      const title = form.elements.title.value.trim();
      if (!title) return;
      sections.push({ id: `s${Date.now().toString(36)}`, title, text: "" });
      renderSettings();
      queueSave();
      dialog.querySelector(".cs-section:last-child .cs-items")?.focus();
      return;
    }
    if (form.id !== "customSubsForm") return;
    const submitButton = form.querySelector("[type=submit]");
    const errorBox = form.querySelector("#customSubsError");
    submitButton.disabled = true;
    errorBox.textContent = "";
    try {
      const response = await adminRequest("/admin/custom-subs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذر إنشاء الرابط");
      subs.unshift(result);
      screen = "list";
      render();
    } catch (error) {
      errorBox.textContent = error.message;
      submitButton.disabled = false;
    }
  });
})();
