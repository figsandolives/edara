// نسخة التدريب (الرابط ‎?training): نفس صفحة الإدارة، لكن الكتالوج والصور تنحفظ في «كتالوج التدريب» على الخادم
// وما توصل للمنصة الحقيقية أبداً. صفحات العملاء والزوار والتقارير ما تجيب بيانات حقيقية، وأي إرسال (واتساب وغيره) ينلغى.
// المدير يراجع تعديلات المتدرب ويعتمد اللي يبيه من «تعديلات المتدرب» في صفحة الإدارة العادية (training-review.js).
(function () {
  const active = new URLSearchParams(location.search).has("training");
  window.TRAINING_MODE = active;
  if (!active) return;

  const API_ROOT = "https://162-35-27-249.sslip.io/platform-api";
  const nativeFetch = window.fetch.bind(window);
  const reply = body => Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
  const ROUTES = { "/admin/catalog": "/training/catalog", "/admin/assets": "/training/assets" };

  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || String(input);
    if (!url.startsWith(API_ROOT)) return nativeFetch(input, init);
    const path = url.slice(API_ROOT.length).split("?")[0];
    if (path === "/auth/employee") return nativeFetch(input, init);
    if (ROUTES[path]) return nativeFetch(API_ROOT + ROUTES[path], init);
    // أي شي ثاني: لا بيانات حقيقية ولا أي أثر على الخادم.
    const method = String(init.method || (typeof input === "object" && input?.method) || "GET").toUpperCase();
    if (method !== "GET") return reply({ ok: true, training: true });
    if (path === "/admin/visitor-presence") return reply({ now: Date.now(), visitors: [] });
    return reply([]);
  };

  document.title = `تدريب — ${document.title}`;

  // الروابط داخل الصفحة تبقى على نسخة التدريب.
  const HIDDEN = ["#liveVisitorsPage", "#customersPage", "#availabilityNotificationsPage", "#productSalesPage", "#trainingReviewPage", "#customSubsPage", ".more-actions-menu a[href='reports.html']"];
  function decorate() {
    document.documentElement.classList.add("training-mode");
    HIDDEN.forEach(selector => document.querySelectorAll(selector).forEach(element => { element.style.display = "none"; }));
    const banner = document.createElement("div");
    banner.className = "training-banner";
    banner.innerHTML = "<strong>وضع التدريب</strong><span>التعديلات هنا ما تظهر في المنصة الحقيقية إلا إذا اعتمدها المدير.</span>";
    document.body.prepend(banner);
    const gateTitle = document.querySelector("#adminAuthGate h1, #adminAuthGate h2");
    if (gateTitle) gateTitle.textContent = "تدريب على إدارة منصة البيع";
    const gateText = document.querySelector("#adminAuthGate p");
    if (gateText) gateText.textContent = "أدخل رمز المتدرب. كل اللي تسويه هنا ينحفظ في نسخة التدريب فقط.";
    const codeLabel = document.querySelector("label[for='adminCodeInput']");
    if (codeLabel) codeLabel.textContent = "رمز المتدرب";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", decorate); else decorate();
})();
