// strip-admin.js — إعدادات الشريط المتحرك أعلى المنصة (catalog.qualityStrip).
// المعاينة تستخدم نفس الشكل (strip.css) ونفس طريقة الرسم اللي في المنصة.
const STRIP_DEFAULTS = Object.freeze({
  title: "جميع مخبوزاتنا من خبز وفطاير وبسكويت:",
  points: ["من القمح الكامل والنخالة", "بالخميرة الطبيعية", "من الرز وخميرة الرز الطبيعية", "من اللوز وخميرة اللوز الطبيعية", "خالية من الطحين الأبيض", "خالية من الزيوت المهدرجة", "خالية من الخميرة التجارية"],
  speed: 5,
  pauseOnHover: true
});
const STRIP_SEAL = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="seal" d="M12 1.8l2.3 1.7 2.8-.3 1.1 2.6 2.6 1.1-.3 2.8 1.7 2.3-1.7 2.3.3 2.8-2.6 1.1-1.1 2.6-2.8-.3L12 22.2l-2.3-1.7-2.8.3-1.1-2.6-2.6-1.1.3-2.8L1.8 12l1.7-2.3-.3-2.8 2.6-1.1 1.1-2.6 2.8.3z"/><path class="tick" d="M7.6 12.3l2.9 2.9 5.9-6.1"/></svg>`;

function stripSettings() {
  const value = qualityStrip || {};
  const points = (Array.isArray(value.points) ? value.points : []).map(point => clean(point)).filter(Boolean);
  return {
    title: clean(value.title) || STRIP_DEFAULTS.title,
    points: points.length ? points : [...STRIP_DEFAULTS.points],
    speed: Math.min(10, Math.max(1, Number(value.speed) || STRIP_DEFAULTS.speed)),
    pauseOnHover: value.pauseOnHover !== false
  };
}
function stripFormValue() {
  return {
    title: clean($("#stripTitle").value),
    points: $("#stripPoints").value.split("\n").map(line => clean(line)).filter(Boolean),
    speed: Number($("#stripSpeed").value) || 5,
    pauseOnHover: $("#stripPauseOnHover").checked
  };
}

function renderStripPreview(settings) {
  const host = $("#stripPreview");
  if (!host) return;
  const title = settings.title || STRIP_DEFAULTS.title;
  const points = settings.points.length ? settings.points : STRIP_DEFAULTS.points;
  // Same as the storefront: reversed so that, read from the title leftwards, the points keep the written order.
  const ordered = [...points].reverse();
  const group = hidden => `<ul class="quality-strip-group"${hidden ? ' aria-hidden="true"' : ""}>${ordered.map(point => `<li>${STRIP_SEAL}<span>${escapeHtml(point)}</span></li>`).join("")}</ul>`;
  host.innerHTML = `<section class="quality-strip ${settings.pauseOnHover ? "pause-on-hover" : ""}" aria-label="معاينة الشريط">
    <div class="quality-strip-title"><span class="quality-seal" aria-hidden="true"></span><strong>${escapeHtml(title)}</strong></div>
    <div class="quality-strip-viewport"><div class="quality-strip-track">${group(false)}${group(true)}</div></div>
  </section>`;
  const track = host.querySelector(".quality-strip-track");
  // Same speed rule as the storefront: a distance per second.
  const width = track.firstElementChild?.getBoundingClientRect().width || 0;
  if (width) track.style.setProperty("--strip-duration", `${(width / (settings.speed * 9)).toFixed(1)}s`);
}

function renderStripSettings() {
  const settings = stripSettings();
  $("#stripTitle").value = settings.title;
  $("#stripPoints").value = settings.points.join("\n");
  $("#stripSpeed").value = String(settings.speed);
  $("#stripSpeedValue").textContent = String(settings.speed);
  $("#stripPauseOnHover").checked = settings.pauseOnHover;
  renderStripPreview(settings);
}

["stripTitle", "stripPoints", "stripSpeed", "stripPauseOnHover"].forEach(id => $(`#${id}`).addEventListener(id === "stripPauseOnHover" ? "change" : "input", () => {
  const value = stripFormValue();
  $("#stripSpeedValue").textContent = String(value.speed);
  renderStripPreview(value);
}));
$("#saveStrip").addEventListener("click", () => {
  const value = stripFormValue();
  if (!value.title) return toast("اكتب عنوان الشريط");
  if (!value.points.length) return toast("اكتب نقطة وحدة على الأقل في محتوى الشريط");
  qualityStrip = value;
  markDirty();
  renderStripPreview(value);
  toast("تم حفظ الشريط");
});
renderStripSettings();
