// ترجمة واجهة الإدارة: زر عربي/English يترجم النصوص والأزرار من قاموس i18n-dict.js.
// يترجم العرض فقط (النصوص، placeholder، title، aria-label، رسائل alert/confirm) ولا يلمس قيم الحقول أو البيانات المحفوظة.
(function () {
  const DICT = window.ADMIN_I18N_EN || {};
  const STORE_KEY = "adminLang";
  const ARABIC_LETTER = /[ء-ي]/;
  const ATTRS = ["placeholder", "title", "aria-label", "alt"];
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE"]);

  const readLang = () => { try { return localStorage.getItem(STORE_KEY) === "en" ? "en" : "ar"; } catch { return "ar"; } };
  const saveLang = value => { try { localStorage.setItem(STORE_KEY, value); } catch {} };
  let lang = readLang();

  const norm = text => String(text).replace(/\s+/g, " ").trim();
  const escapeRe = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const keys = Object.keys(DICT).map(norm).filter(key => ARABIC_LETTER.test(key)).sort((a, b) => b.length - a.length);
  const lookup = new Map(Object.entries(DICT).map(([key, value]) => [norm(key), value]));
  // مقاطع من أكثر من كلمة تُستبدل داخل أي نص؛ الكلمة الواحدة تُستبدل فقط إذا ترجم النص كله (حتى لا نكسر أسماء المنتجات).
  const isPhrase = key => /\s|[«»():؟،…·]/.test(key);
  const phraseRe = keys.filter(isPhrase).map(key => [new RegExp(escapeRe(key), "g"), lookup.get(key)]);
  const wordRe = keys.filter(key => !isPhrase(key)).map(key => [new RegExp(`(^|[^\\u0621-\\u064A])${escapeRe(key)}(?=$|[^\\u0621-\\u064A])`, "g"), lookup.get(key)]);

  const RULES = [
    [/قبل (\d+) س و(\d+) د/g, "$1h $2m ago"], [/قبل (\d+) س/g, "$1h ago"], [/قبل (\d+) د/g, "$1m ago"], [/قبل (\d+) ث/g, "$1s ago"],
    [/(\d+) س (\d+) د/g, "$1h $2m"], [/(^|\s)(\d+) د(?=$|\s)/g, "$1$2m"],
    [/^انسخت /, "Copied "], [/^تمت إضافة /, "Added "], [/(\d+) أصناف/g, "$1 items"], [/(\d+) حبات/g, "$1 pcs"], [/(\d+) خبزة/g, "$1 loaves"], [/(\d+) قطعة/g, "$1 pieces"]
  ];
  const PLURAL = /(\d[\d,.]*)\s+(product|category|heading|order|visitor|customer|item|click|cover|day|hour|page|request|selected)\b(?!s)/g;
  const plural = { category: "categories", selected: "selected" };

  const finish = text => text
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/،/g, ",").replace(/؟/g, "?").replace(/؛/g, ";")
    .replace(PLURAL, (all, n, word) => Number(String(n).replace(/,/g, "")) === 1 ? all : `${n} ${plural[word] || word + "s"}`);

  function translate(raw) {
    if (raw == null) return raw;
    const text = String(raw);
    if (!ARABIC_LETTER.test(text)) return text;
    const lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0];
    const core = norm(text);
    if (lookup.has(core)) return lead + finish(lookup.get(core)) + trail;
    let out = core;
    RULES.forEach(([re, to]) => { out = out.replace(re, to); });
    if (lookup.has(out)) return lead + finish(lookup.get(out)) + trail;
    phraseRe.forEach(([re, to]) => { out = out.replace(re, to); });
    let words = out;
    wordRe.forEach(([re, to]) => { words = words.replace(re, (all, before) => before + to); });
    if (!ARABIC_LETTER.test(words)) out = words;
    return out === core ? text : lead + finish(out) + trail;
  }
  window.adminT = text => (lang === "en" ? translate(text) : text);

  // نحفظ الأصل لكل نص مترجم عشان نرجع للعربي بدون إعادة تحميل.
  const original = new WeakMap();
  const translated = new WeakMap();
  const attrOriginal = new WeakMap();

  const skipped = node => {
    for (let el = node.nodeType === 1 ? node : node.parentElement; el; el = el.parentElement) {
      if (SKIP_TAGS.has(el.tagName) || el.isContentEditable || el.hasAttribute("data-no-i18n")) return true;
    }
    return false;
  };

  function doText(node) {
    const value = node.nodeValue;
    if (!value || !ARABIC_LETTER.test(value)) return;
    if (translated.get(node) === value) return;
    if (skipped(node)) return;
    const fixed = node.parentElement?.getAttribute("data-en");
    const next = fixed && node.parentElement.childNodes.length === 1 ? fixed : translate(value);
    if (next === value) return;
    original.set(node, value);
    translated.set(node, next);
    node.nodeValue = next;
  }

  function doAttrs(el) {
    if (el.nodeType !== 1 || el.hasAttribute("data-no-i18n")) return;
    ATTRS.forEach(name => {
      const value = el.getAttribute(name);
      if (!value || !ARABIC_LETTER.test(value)) return;
      const next = translate(value);
      if (next === value) return;
      const saved = attrOriginal.get(el) || {};
      saved[name] = { from: value, to: next };
      attrOriginal.set(el, saved);
      el.setAttribute(name, next);
    });
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) doAttrs(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === 3) doText(node); else doAttrs(node);
    }
  }

  function restore(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === 3) {
        if (original.has(node) && translated.get(node) === node.nodeValue) node.nodeValue = original.get(node);
        original.delete(node); translated.delete(node);
      } else if (attrOriginal.has(node)) {
        Object.entries(attrOriginal.get(node)).forEach(([name, { from, to }]) => { if (node.getAttribute(name) === to) node.setAttribute(name, from); });
        attrOriginal.delete(node);
      }
    }
  }

  const observer = new MutationObserver(records => {
    if (lang !== "en") return;
    records.forEach(record => {
      if (record.type === "characterData") doText(record.target);
      else if (record.type === "attributes") doAttrs(record.target);
      else record.addedNodes.forEach(walk);
    });
  });

  const titleAr = document.title;
  function apply() {
    const root = document.documentElement;
    root.lang = lang === "en" ? "en" : "ar";
    root.dir = lang === "en" ? "ltr" : "rtl";
    root.classList.toggle("lang-en", lang === "en");
    if (lang === "en") {
      document.title = translate(titleAr);
      walk(document.body);
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    } else {
      observer.disconnect();
      document.title = titleAr;
      restore(document.body);
    }
    document.querySelectorAll("[data-lang-toggle]").forEach(button => {
      button.textContent = lang === "en" ? "عربي" : "English";
      button.setAttribute("aria-label", lang === "en" ? "التبديل إلى العربية" : "Switch to English");
      button.setAttribute("data-no-i18n", "");
    });
  }

  // رسائل التأكيد والتنبيه
  ["alert", "confirm", "prompt"].forEach(name => {
    const native = window[name].bind(window);
    window[name] = (message, ...rest) => native(lang === "en" ? translate(message) : message, ...rest);
  });

  function addToggle() {
    if (document.querySelector("[data-lang-toggle]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lang-toggle";
    button.setAttribute("data-lang-toggle", "");
    button.addEventListener("click", () => { lang = lang === "en" ? "ar" : "en"; saveLang(lang); apply(); });
    document.body.append(button);
  }

  const start = () => { addToggle(); apply(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
