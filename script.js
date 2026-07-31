const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const orderingConfig = window.ORDERING_CONFIG || {};
const firebaseServices = window.ORDERING_FIREBASE;
let firebaseAuthUser = null;

const firebaseIdentityReady = new Promise(resolve => {
  if (!firebaseServices) return resolve(null);
  let unsubscribe = null;
  unsubscribe = firebaseServices.auth.onAuthStateChanged(async user => {
    if (!user) {
      try {
        await firebaseServices.auth.signInAnonymously();
      } catch (error) {
        console.error("Firebase anonymous sign-in failed", error);
        unsubscribe?.();
        resolve(null);
      }
      return;
    }
    firebaseAuthUser = user;
    unsubscribe?.();
    resolve(user);
  });
});

const translations = {
  ar: {
    brand: "مخبز التين والزيتون", tagline: "طبيعي، صحي، مصنوع بحب", yourCart: "سلتك",
    deliveryEverywhere: "توصيل لجميع مناطق الكويت", heroTitle: "أكل صحي بطعم<br>يستحق التكرار",
    heroText: "اختر من منتجاتنا الطبيعية والمخبوزات الطازجة، ونحن نتكفل بالباقي.",
    naturalIngredients: "مكونات طبيعية", dailyPreparation: "تحضير يومي", securePayment: "دفع آمن",
    ourMenu: "قائمتنا", whatToday: "ماذا تشتهي اليوم؟", searchPlaceholder: "ابحث عن منتج…", searchStart: "اكتب اسم المنتج لعرض النتائج",
    all: "الكل", products: "منتج", add: "إضافة +", added: "تمت إضافة المنتج", inCart: "في السلة",
    total: "الإجمالي", checkout: "إتمام الدفع ←", back: "رجوع", noResults: "لا توجد منتجات مطابقة",
    order: "طلبك", completeOrder: "إتمام الطلب", review: "المراجعة", deliveryDetails: "تفاصيل التسليم",
    deliveryTime: "وقت التوصيل", pickupTime: "وقت الاستلام", withinTwoHours: "خلال ساعتين", withinTwoHoursHint: "يصلك الطلب في أقرب وقت متاح",
    chooseSpecificTime: "اختيار وقت محدد", chooseSpecificTimeHint: "حدد اليوم والساعة المناسبة لك",
    notifyWhenReady: "إبلاغي عند اكتمال الطلب", notifyWhenReadyHint: "سيتواصل معك الفرع عندما يصبح الطلب جاهزاً",
    chooseArrivalTime: "تحديد وقت الوصول للفرع", chooseArrivalTimeHint: "حدد اليوم والوقت المتوقع لوصولك",
    deliveryDate: "التاريخ", hour: "الساعة", minute: "الدقائق", period: "الفترة",
    morning: "صباحاً", evening: "مساءً", chooseValidTime: "يرجى اختيار تاريخ ووقت قادم",
    chooseTimeAfterMinimum: "للطلبات في نفس اليوم اختر وقتاً بعد ساعتين على الأقل من الوقت الحالي",
    deliveryHoursNotice: "مواعيد التوصيل من 9:30 صباحاً إلى 10:30 مساءً",
    lateDeliveryWarning: "قد يتعرض طلبك للتأجيل بسبب تأخر الوقت.. سارع في إتمام الطلب",
    expectedDeliveryTime: "الوقت المتوقع للتوصيل", betweenTime: "بين", andTime: "إلى",
    scheduledDeliveryTime: "وقت التوصيل المحدد", scheduledPickupTime: "وقت الوصول المحدد",
    pickupStatus: "حالة الاستلام", pickupContactConfirmation: "سيتم التواصل معك من الفرع لتأكيد الطلب",
    confirmPay: "تأكيد ودفع", confirmContinue: "تأكيد ومتابعة", productsTotal: "قيمة المنتجات",
    deliveryFee: "قيمة التوصيل", delivery: "توصيل", pickup: "استلام", chooseBranch: "يرجى اختيار الفرع",
    completeDelivery: "يرجى اختيار عنوان للتوصيل", preparing: "لحظة واحدة…",
    redirecting: "جاري التحويل إلى بوابة الدفع", creatingSecureLink: "ننشئ رابط دفع آمن لطلبك…",
    paymentUnavailable: "خدمة الدفع الإلكتروني ومتابعة حالتها لم يتم ربطهما بالخادم بعد.",
    invalidSecureLink: "رابط الدفع المستلم غير آمن", createFailed: "تعذر إنشاء رابط الدفع",
    createTimeout: "استغرق إنشاء الرابط وقتاً أطول من المتوقع. يمكنك إعادة المحاولة بأمان.",
    checkingPayment: "جارٍ التحقق من الدفع", checkingResult: "نتحقق من نتيجة عملية الدفع",
    autoAccept: "سيتم نقلك إلى صفحة قبول الطلب فور تأكيد العملية.", returnGateway: "العودة إلى بوابة الدفع",
    createNewPaymentLink: "إنشاء رابط دفع جديد",
    stillPending: "الدفع ما زال قيد الانتظار… نتحقق تلقائياً.",
    tempCheckError: "تعذر التحقق مؤقتاً، سنواصل المحاولة تلقائياً…",
    declinedTitle: "لم يتم قبول الدفع", declinedText: "لم يتم اعتماد الطلب ولم يُسجل كطلب مدفوع. يمكنك المحاولة مرة أخرى.",
    retry: "المحاولة من جديد", backToPayment: "العودة للدفع", unconfirmed: "تعذر تأكيد حالة الدفع",
    unconfirmedText: "لن نسجل الطلب كمدفوع حتى نحصل على تأكيد من Bede.", checkAgain: "التحقق مرة أخرى",
    startFailed: "تعذر بدء الدفع", linkNotCreated: "لم يتم إنشاء رابط الدفع", received: "تم استلام الطلب",
    orderNumber: "رقم الطلب", backStore: "العودة للمتجر", downloadInvoice: "تحميل الفاتورة",
    preparingInvoiceDownload: "جاري تجهيز الفاتورة…", customer: "العميل", payOnline: "الدفع: أونلاين",
    quantity: "الكمية", price: "السعر", item: "الصنف", thankYou: "شكراً لزيارتكم!",
    healthPhrase: "صحتك أغلى ما تملك، فتناول شيئاً صحياً.", loadingError: "تعذر تحميل البيانات. يجب رفع جميع الملفات مع index.html.",
    details: "تفاصيل المنتج", addToCart: "إضافة إلى السلة", image: "صورة المنتج",
    login: "تسجيل الدخول", myAccount: "حسابي", loginFirst: "يرجى تسجيل الدخول أولاً",
    phone: "رقم الهاتف", phoneHint: "اكتب رقم الهاتف من 8 أرقام", confirmPhone: "تأكيد الرقم",
    invalidPhone: "رقم الهاتف يجب أن يتكون من 8 أرقام", codeSent: "أرسلنا رمز الدخول إلى واتساب",
    enterCode: "اكتب رمز الدخول المكون من 4 أرقام", resendCode: "إعادة إرسال رمز الدخول",
    resendAfter: "إعادة إرسال رمز الدخول بعد", invalidCode: "رمز الدخول غير صحيح", verifying: "جارٍ التحقق…",
    welcome: "أهلاً بك.. في مخبز التين والزيتون", username: "اسم المستخدم", confirm: "تأكيد",
    nameRequired: "يرجى كتابة اسم المستخدم", myInfo: "معلوماتي", myAddresses: "عناويني", myOrders: "طلباتي",
    logout: "تسجيل خروج", save: "حفظ", edit: "تعديل", delete: "حذف", changePhone: "تغيير رقم الهاتف",
    infoSaved: "تم حفظ معلوماتك", addressesEmpty: "لا يوجد عناوين مسجلة", addAddress: "إضافة عنوان",
    areaSearch: "ابحث عن منطقة", addressDetails: "تفاصيل العنوان", addressPlaceholder: "القطعة، الشارع، المنزل والدور…",
    chooseArea: "اختر المنطقة", addressSaved: "تم حفظ العنوان", selectAddress: "اختر عنوان التوصيل",
    noAddedAddresses: "لا يوجد عناوين مضافة", ordersEmpty: "لا توجد طلبات سابقة",
    viewInvoice: "عرض / طباعة الفاتورة", viewOrderDetails: "عرض تفاصيل الطلب", orderDetails: "تفاصيل الطلب",
    paid: "مدفوع", customerName: "الاسم", choosePaymentMethod: "اختر طريقة الدفع",
    deliveryAddress: "عنوان التوصيل", pickupBranch: "فرع الاستلام", payNow: "ادفع الآن",
    showProducts: "عرض تفاصيل المنتجات", hideProducts: "إخفاء تفاصيل المنتجات",
    knet: "كي نت", knetHint: "الانتقال إلى صفحة الدفع الآمنة من KNET", applePay: "Apple Pay",
    loginServiceUnavailable: "خدمة تسجيل الدخول غير مربوطة حالياً", sendFailed: "تعذر إرسال رمز الدخول",
    verifyFailed: "تعذر التحقق من الرمز", accountSyncFailed: "تعذر فتح بيانات حسابك المحفوظة. حاول تسجيل الدخول مرة أخرى.",
    loggedOut: "تم تسجيل الخروج", invoiceFailed: "تعذر إنشاء الفاتورة. حاول مرة أخرى.",
    noZoom: ""
  },
  en: {
    brand: "Figs & Olives Bakery", tagline: "Natural, healthy, made with love", yourCart: "Cart",
    deliveryEverywhere: "Delivery across Kuwait", heroTitle: "Healthy food with a taste<br>worth repeating",
    heroText: "Choose from our natural products and fresh bakes, and we will handle the rest.",
    naturalIngredients: "Natural ingredients", dailyPreparation: "Prepared daily", securePayment: "Secure payment",
    ourMenu: "Our menu", whatToday: "What are you craving today?", searchPlaceholder: "Search products…", searchStart: "Type a product name to see results",
    all: "All", products: "products", add: "Add +", added: "Product added", inCart: "In cart",
    total: "Total", checkout: "Checkout →", back: "Back", noResults: "No matching products",
    order: "Your order", completeOrder: "Complete order", review: "Review", deliveryDetails: "Delivery details",
    deliveryTime: "Delivery time", pickupTime: "Pickup time", withinTwoHours: "Within two hours", withinTwoHoursHint: "Your order will arrive as soon as possible",
    chooseSpecificTime: "Choose a specific time", chooseSpecificTimeHint: "Select the day and time that suits you",
    notifyWhenReady: "Notify me when ready", notifyWhenReadyHint: "The branch will contact you when your order is ready",
    chooseArrivalTime: "Choose branch arrival time", chooseArrivalTimeHint: "Select your expected arrival date and time",
    deliveryDate: "Date", hour: "Hour", minute: "Minutes", period: "Period",
    morning: "AM", evening: "PM", chooseValidTime: "Please choose a future date and time",
    chooseTimeAfterMinimum: "For same-day orders, choose a time at least two hours from now",
    deliveryHoursNotice: "Delivery hours are from 9:30 AM to 10:30 PM",
    lateDeliveryWarning: "Your order may be delayed because it is late. Please complete it soon.",
    expectedDeliveryTime: "Expected delivery time", betweenTime: "Between", andTime: "and",
    scheduledDeliveryTime: "Scheduled delivery time", scheduledPickupTime: "Scheduled arrival time",
    pickupStatus: "Pickup status", pickupContactConfirmation: "The branch will contact you to confirm the order",
    confirmPay: "Confirm & pay", confirmContinue: "Confirm and continue", productsTotal: "Products value",
    deliveryFee: "Delivery fee", delivery: "Delivery", pickup: "Pickup", chooseBranch: "Please choose a branch",
    completeDelivery: "Please select a delivery address", preparing: "One moment…",
    redirecting: "Redirecting to the payment gateway", creatingSecureLink: "Creating a secure payment link…",
    paymentUnavailable: "Online payment and status tracking are not connected yet.",
    invalidSecureLink: "The received payment link is not secure", createFailed: "Could not create payment link",
    createTimeout: "Creating the link took longer than expected. You can retry safely.",
    checkingPayment: "Checking payment", checkingResult: "Checking your payment result",
    autoAccept: "You will be taken to the accepted order page once payment is confirmed.", returnGateway: "Return to payment",
    createNewPaymentLink: "Create a new payment link",
    stillPending: "Payment is still pending… checking automatically.",
    tempCheckError: "Verification is temporarily unavailable. We will keep trying…",
    declinedTitle: "Payment was not accepted", declinedText: "The payment was not approved and the order was not recorded as paid.",
    retry: "Try again", backToPayment: "Back to payment", unconfirmed: "Payment not confirmed",
    unconfirmedText: "The order will not be marked paid until Bede confirms it.", checkAgain: "Check again",
    startFailed: "Could not start payment", linkNotCreated: "Payment link was not created", received: "Order received",
    orderNumber: "Order number", backStore: "Back to store", downloadInvoice: "Download invoice",
    preparingInvoiceDownload: "Preparing your invoice…", customer: "Customer", payOnline: "Payment: Online",
    quantity: "Qty", price: "Price", item: "Item", thankYou: "Thank you for visiting!",
    healthPhrase: "Your health is precious—choose something healthy.", loadingError: "Could not load data. Upload every file next to index.html.",
    details: "Product details", addToCart: "Add to cart", image: "Product image",
    login: "Login", myAccount: "My account", loginFirst: "Please login first", phone: "Phone number",
    phoneHint: "Enter your 8-digit phone number", confirmPhone: "Confirm number", invalidPhone: "Phone number must be exactly 8 digits",
    codeSent: "We sent your login code on WhatsApp", enterCode: "Enter the 4-digit login code",
    resendCode: "Resend login code", resendAfter: "Resend login code in", invalidCode: "Incorrect login code",
    verifying: "Verifying…", welcome: "Welcome to Figs & Olives Bakery", username: "Username", confirm: "Confirm",
    nameRequired: "Please enter your username", myInfo: "My information", myAddresses: "My addresses",
    myOrders: "My orders", logout: "Logout", save: "Save", edit: "Edit", delete: "Delete",
    changePhone: "Change phone number", infoSaved: "Your information was saved", addressesEmpty: "No saved addresses",
    addAddress: "Add address", areaSearch: "Search for an area", addressDetails: "Address details",
    addressPlaceholder: "Block, street, house and floor…", chooseArea: "Choose an area", addressSaved: "Address saved",
    selectAddress: "Select delivery address", noAddedAddresses: "No addresses added", ordersEmpty: "No previous orders",
    viewInvoice: "View / print invoice", viewOrderDetails: "View order details", orderDetails: "Order details",
    paid: "Paid", customerName: "Name", choosePaymentMethod: "Choose a payment method", deliveryAddress: "Delivery address",
    pickupBranch: "Pickup branch", payNow: "Pay now", showProducts: "Show product details",
    hideProducts: "Hide product details", loginServiceUnavailable: "Login service is not connected",
    knet: "KNET", knetHint: "Continue to the secure KNET payment page", applePay: "Apple Pay",
    sendFailed: "Could not send login code", verifyFailed: "Could not verify the code",
    accountSyncFailed: "Could not open your saved account data. Please log in again.", loggedOut: "Logged out",
    invoiceFailed: "Could not create the invoice. Please try again.", noZoom: ""
  }
};

const branches = [
  { id: "yarmouk", nameAr: "فرع اليرموك", nameEn: "Yarmouk Branch", brandAr: "مخبز التين والزيتون", brandEn: "Figs & Olives Bakery", addressAr: "اليرموك، قطعة 2، شارع 2", addressEn: "Yarmouk, Block 2, Street 2", phone: "22085889 | 65162277" },
  { id: "abu", nameAr: "فرع أبو الحصانية", nameEn: "Abu Al Hasaniya Branch", brandAr: "مطعم التين الطبيعي", brandEn: "Natural Figs Restaurant", addressAr: "أبو الحصانية، مول 30", addressEn: "Abu Al Hasaniya, The 30 Mall", phone: "22085886 | 99176512" }
];

const PROFILE_KEY = "figsOlivesProfilesV1";
const SESSION_KEY = "figsOlivesSessionV1";
const LEGACY_CART_KEY = "figsOlivesCartV1";
const CART_KEY = "figsOlivesCartV2";
const CATALOG_CACHE_KEY = "figsOlivesCatalogV2";
const VISITOR_KEY = "figsOlivesVisitorV1";
const visitorId = localStorage.getItem(VISITOR_KEY) || (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
localStorage.setItem(VISITOR_KEY, visitorId);

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}

function loadCurrentUser() {
  const session = readJson(SESSION_KEY, null);
  const profiles = readJson(PROFILE_KEY, {});
  if (!session?.phone || !profiles[session.phone]) return null;
  return { ...profiles[session.phone] };
}

function cartStorageKey(phone) {
  return phone ? `${CART_KEY}:${normalizePhone(phone)}` : "";
}

function loadUserCart(user) {
  if (!user?.phone) return {};
  const stored = readJson(cartStorageKey(user.phone), null);
  if (stored && typeof stored === "object") return stored;
  const legacy = readJson(LEGACY_CART_KEY, {});
  if (Object.keys(legacy).length) {
    localStorage.setItem(cartStorageKey(user.phone), JSON.stringify(legacy));
    localStorage.removeItem(LEGACY_CART_KEY);
    return legacy;
  }
  return {};
}

const initialUser = loadCurrentUser();
const DEFAULT_APPEARANCE = Object.freeze({
  heroImage: "",
  heroPositionX: 50,
  heroPositionY: 50,
  heroTextColor: "#18352a",
  badgeBackgroundColor: "#ffffff",
  badgeTextColor: "#18352a"
});
const state = {
  products: [], categories: [], areas: [], cart: loadUserCart(initialUser), search: "", activeCategory: "all",
  lang: localStorage.getItem("storeLanguage") === "en" ? "en" : "ar",
  step: 1, mode: "delivery", area: null, branch: "", addressId: "", address: "",
  name: "", phone: "", order: "W00001", paymentRequestId: "", detailProductId: "",
  paymentMethod: "", deliveryTiming: "asap", scheduledDate: "", scheduledHour: "1",
  scheduledMinute: "00", scheduledPeriod: "pm", user: initialUser, lastInvoice: null,
  appearance: { ...DEFAULT_APPEARANCE }
};

let imageObserver;
let scrollFrame;
let toastTimer;
let paymentWatchVersion = 0;
let resendTimer;
let pendingCartProductId = "";
let authMode = "login";
let authPhone = "";
let accountReturnToCheckout = false;
let catalogScrollPosition = 0;
let userSyncTimer;
let pendingPaymentResumed = false;
let catalogSignature = "";
let pageScrollLocked = false;
let pageScrollLockY = 0;
const invoiceFileCache = new Map();
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function tr(key) {
  return translations[state.lang][key] || translations.ar[key] || key;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

function validHexColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
}

function validPercent(value, fallback = 50) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;
}

function normalizeAppearance(value = {}) {
  let heroImage = "";
  try {
    const candidate = new URL(String(value.heroImage || ""));
    if (candidate.protocol === "https:") heroImage = candidate.href;
  } catch {
    heroImage = "";
  }
  return {
    heroImage,
    heroPositionX: validPercent(value.heroPositionX, DEFAULT_APPEARANCE.heroPositionX),
    heroPositionY: validPercent(value.heroPositionY, DEFAULT_APPEARANCE.heroPositionY),
    heroTextColor: validHexColor(value.heroTextColor, DEFAULT_APPEARANCE.heroTextColor),
    badgeBackgroundColor: validHexColor(value.badgeBackgroundColor, DEFAULT_APPEARANCE.badgeBackgroundColor),
    badgeTextColor: validHexColor(value.badgeTextColor, DEFAULT_APPEARANCE.badgeTextColor)
  };
}

function applyStoreAppearance(value) {
  state.appearance = normalizeAppearance(value);
  const hero = $("#storeHero");
  if (!hero) return;
  hero.style.setProperty("--hero-title-color", state.appearance.heroTextColor);
  hero.style.setProperty("--hero-badge-background", state.appearance.badgeBackgroundColor);
  hero.style.setProperty("--hero-badge-text", state.appearance.badgeTextColor);
  hero.style.setProperty("--hero-position-x", `${state.appearance.heroPositionX}%`);
  hero.style.setProperty("--hero-position-y", `${state.appearance.heroPositionY}%`);
  const title = $("h1", hero);
  if (title) title.style.color = state.appearance.heroTextColor;
  $$(".hero-badges span", hero).forEach(badge => {
    badge.style.backgroundColor = state.appearance.badgeBackgroundColor;
    badge.style.color = state.appearance.badgeTextColor;
  });
  hero.classList.toggle("has-hero-image", Boolean(state.appearance.heroImage));
  hero.style.backgroundImage = state.appearance.heroImage
    ? `linear-gradient(rgba(8, 28, 20, .38), rgba(8, 28, 20, .38)), url(${JSON.stringify(state.appearance.heroImage)})`
    : "";
}

function normalizeDigits(value) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function normalizePhone(value) {
  return normalizeDigits(value).replace(/\D/g, "");
}

function normalizeAddressText(value) {
  return normalizeDigits(value);
}

function trLocaleDate(date) {
  return new Date(date).toLocaleString(state.lang === "ar" ? "ar-KW" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function categoryName(category) {
  return state.lang === "ar" ? category.nameAr : (category.nameEn || category.nameAr);
}

function productName(product) {
  return state.lang === "ar" ? product.name : (product.nameEn || product.name);
}

function productDescription(product) {
  return state.lang === "ar" ? (product.description || product.descriptionEn || "") : (product.descriptionEn || product.description || "");
}

function productImages(product) {
  return (Array.isArray(product.images) ? product.images : [product.image]).filter(Boolean);
}

function branchField(branch, field) {
  return branch[`${field}${state.lang === "ar" ? "Ar" : "En"}`] || branch[`${field}Ar`];
}

function money(value) {
  return state.lang === "ar" ? `${Number(value).toFixed(3)} د.ك` : `${Number(value).toFixed(3)} KWD`;
}

function product(id) {
  return state.products.find(item => String(item.id) === String(id));
}

function cartItems() {
  return Object.entries(state.cart).map(([id, quantity]) => ({ product: product(id), quantity: Number(quantity) })).filter(item => item.product && item.quantity > 0);
}

function cartCount() {
  return cartItems().reduce((sum, item) => sum + item.quantity, 0);
}

function subtotal() {
  return cartItems().reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
}

function deliveryFee() {
  return state.mode === "delivery" && state.area ? Number(state.area.price) : 0;
}

function total() {
  return subtotal() + deliveryFee();
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.add("hidden"), 2200);
}

function persistCart() {
  if (!state.user?.phone) return;
  localStorage.setItem(cartStorageKey(state.user.phone), JSON.stringify(state.cart));
  queueUserSync();
}

function trackStoreEvent(type, details = {}) {
  const endpoint = orderingConfig.analyticsWebhookUrl;
  if (!endpoint) return;
  const onceKey = `figsOlivesEvent:${type}:${new Date().toISOString().slice(0, 10)}`;
  if (type === "visit" && sessionStorage.getItem(onceKey)) return;
  if (type === "visit") sessionStorage.setItem(onceKey, "1");
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ type, visitorId, customer: state.user?.name ? { name: state.user.name, phone: state.user.phone } : null, details }),
    cache: "no-store"
  }).catch(() => undefined);
}

function queueUserSync() {
  clearTimeout(userSyncTimer);
  userSyncTimer = setTimeout(() => {
    syncUserToFirebase().catch(error => console.error("Firebase profile sync failed", error));
  }, 500);
}

function persistUser() {
  if (!state.user?.phone) return;
  const profiles = readJson(PROFILE_KEY, {});
  profiles[state.user.phone] = { ...state.user };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  localStorage.setItem(SESSION_KEY, JSON.stringify({ phone: state.user.phone }));
  state.name = state.user.name;
  state.phone = state.user.phone;
  updateAccountButton();
  queueUserSync();
}

async function authenticateFirebaseCustomer(authResult, phone) {
  if (!firebaseServices) return null;
  const customToken = String(authResult?.customToken || "");
  if (!customToken || normalizePhone(phone).length !== 8) {
    throw new Error(tr("accountSyncFailed"));
  }

  try {
    const signedIn = await firebaseServices.auth.signInWithCustomToken(customToken);
    firebaseAuthUser = signedIn.user;
    return signedIn.user;
  } catch {
    throw new Error(tr("accountSyncFailed"));
  }
}

async function syncUserToFirebase() {
  const identity = firebaseAuthUser || await firebaseIdentityReady;
  if (!identity || !state.user?.phone || !state.user?.name) return;
  const profile = state.user;
  await firebaseServices.database.ref(`orderingPlatform/customers/${identity.uid}`).set({
    phone: normalizePhone(profile.phone),
    name: String(profile.name || "").slice(0, 80),
    addresses: Array.isArray(profile.addresses) ? profile.addresses : [],
    orders: Array.isArray(profile.orders) ? profile.orders : [],
    cart: state.cart && typeof state.cart === "object" ? state.cart : {},
    updatedAt: firebase.database.ServerValue.TIMESTAMP
  });
}

async function hydrateUserFromFirebase() {
  const identity = firebaseAuthUser || await firebaseIdentityReady;
  if (!identity || !state.user?.phone) return;
  try {
    const snapshot = await firebaseServices.database.ref(`orderingPlatform/customers/${identity.uid}`).once("value");
    const remote = snapshot.val();
    if (!remote || normalizePhone(remote.phone) !== normalizePhone(state.user.phone)) {
      await syncUserToFirebase();
      return;
    }
    state.user = {
      ...state.user,
      ...remote,
      phone: normalizePhone(remote.phone),
      addresses: Array.isArray(remote.addresses) ? remote.addresses : [],
      orders: Array.isArray(remote.orders) ? remote.orders : []
    };
    if (remote.cart && typeof remote.cart === "object") {
      state.cart = remote.cart;
      localStorage.setItem(cartStorageKey(state.user.phone), JSON.stringify(state.cart));
      renderCartBar();
      syncAllProductQuantityControls();
    }
    const profiles = readJson(PROFILE_KEY, {});
    profiles[state.user.phone] = { ...state.user };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    state.name = state.user.name;
    state.phone = state.user.phone;
    updateAccountButton();
  } catch (error) {
    console.error("Firebase profile load failed", error);
  }
}

function updateAccountButton() {
  const button = $("#accountButton");
  const label = $("#accountButtonLabel");
  if (state.user?.name) {
    button.classList.add("logged-in");
    label.textContent = state.user.name;
    button.setAttribute("aria-label", tr("myAccount"));
  } else {
    button.classList.remove("logged-in");
    label.textContent = tr("login");
    button.setAttribute("aria-label", tr("login"));
  }
}

function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  document.title = state.lang === "ar" ? "منصة طلبات التين والزيتون" : "Figs & Olives Ordering";
  $$("[data-i18n]").forEach(element => element.textContent = tr(element.dataset.i18n));
  $$("[data-i18n-html]").forEach(element => element.innerHTML = tr(element.dataset.i18nHtml));
  $$("[data-i18n-placeholder]").forEach(element => element.placeholder = tr(element.dataset.i18nPlaceholder));
  $("#languageLabel").textContent = state.lang === "ar" ? "English" : "العربية";
  $(".steps [data-step='1'] span").textContent = tr("review");
  $(".steps [data-step='2'] span").textContent = tr("deliveryDetails");
  $(".steps [data-step='3'] span").textContent = tr("deliveryTime");
  $(".steps [data-step='4'] span").textContent = tr("confirmPay");
  updateAccountButton();
}

function setLanguage(language) {
  state.lang = language;
  localStorage.setItem("storeLanguage", language);
  applyLanguage();
  renderCategories();
  renderProductSections();
  renderSearchResults();
  renderCartBar();
  if (!$("#checkoutModal").classList.contains("hidden")) renderCheckout();
  if (!$("#accountDrawer").classList.contains("hidden")) renderAccountHome();
  if (state.detailProductId) renderProductDetail(state.detailProductId);
}

function sortedCategories() {
  return state.categories.slice().sort((a, b) => Number(a.order) - Number(b.order));
}

function categoryProducts(categoryId) {
  return state.products.filter(item => item.category === categoryId).sort((a, b) => Number(a.order) - Number(b.order));
}

function renderCategories() {
  const buttons = [`<button class="${state.activeCategory === "all" ? "active" : ""}" data-category-link="all">${tr("all")} <small>${state.products.length}</small></button>`];
  for (const category of sortedCategories()) {
    const count = categoryProducts(category.id).length;
    if (count) buttons.push(`<button class="${state.activeCategory === category.id ? "active" : ""}" data-category-link="${escapeHtml(category.id)}">${escapeHtml(categoryName(category))} <small>${count}</small></button>`);
  }
  $("#categories").innerHTML = buttons.join("");
}

function productQuantityControl(id, quantity, detail = false) {
  const escapedId = escapeHtml(id);
  if (!quantity) {
    return `<button class="${detail ? "primary detail-add" : "product-add"}" data-product-add="${escapedId}">${detail ? tr("addToCart") : tr("add")}</button>`;
  }
  const item = product(id);
  return `<div class="product-qty ${detail ? "detail-product-qty" : ""}" aria-label="${escapeHtml(item ? productName(item) : "")}">
    <button type="button" data-product-plus="${escapedId}" aria-label="+">+</button>
    <strong>${quantity}</strong>
    <button type="button" data-product-minus="${escapedId}" aria-label="${quantity === 1 ? "×" : "−"}">${quantity === 1 ? "×" : "−"}</button>
  </div>`;
}

function productCard(item, category) {
  const source = productImages(item)[0] || "logo.png";
  const quantity = state.cart[item.id] || 0;
  return `
    <article class="product-card" data-product="${escapeHtml(item.id)}" tabindex="0">
      <div class="product-image">
        <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-src="${escapeHtml(source)}" width="640" height="580" alt="${escapeHtml(productName(item))}" decoding="async" fetchpriority="low">
        <b class="in-cart ${quantity ? "" : "hidden"}" data-cart-badge="${escapeHtml(item.id)}">${quantity ? `${tr("inCart")} × ${quantity}` : ""}</b>
      </div>
      <div class="product-info">
        <h3>${escapeHtml(productName(item))}</h3>
        <p>${escapeHtml(productDescription(item) || item.nameEn || item.name)}</p>
        <div class="product-foot"><strong>${money(item.price)}</strong><div class="product-quantity-slot" data-product-quantity="${escapeHtml(item.id)}">${productQuantityControl(item.id, quantity)}</div></div>
      </div>
    </article>`;
}

function renderProductSections() {
  const sections = [];
  for (const category of sortedCategories()) {
    const matches = categoryProducts(category.id);
    if (!matches.length) continue;
    sections.push(`
      <section class="category-section" id="category-${encodeURIComponent(category.id)}" data-category-section="${escapeHtml(category.id)}">
        <div class="section-heading"><h2>${escapeHtml(categoryName(category))}</h2></div>
        <div class="product-grid">${matches.map(item => productCard(item, category)).join("")}</div>
      </section>`);
  }
  $("#productSections").innerHTML = sections.length ? sections.join("") : `<div class="loading">${tr("noResults")}</div>`;
  observeImages();
}

function matchingSearchProducts(query) {
  const normalized = String(query || "").trim().toLocaleLowerCase();
  if (!normalized) return [];
  return state.products.filter(item =>
    [item.name, item.nameEn, item.description, item.descriptionEn]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalized)
  ).slice(0, 12);
}

function renderSearchResults() {
  const results = $("#searchResults");
  if (!results) return;
  const query = state.search.trim();
  if (!query) {
    results.innerHTML = `<div class="search-empty">${tr("searchStart")}</div>`;
    return;
  }
  const matches = matchingSearchProducts(query);
  results.innerHTML = matches.length ? matches.map(item => {
    const source = productImages(item)[0] || "logo.png";
    return `<article class="search-result" data-search-product="${escapeHtml(item.id)}">
      <img src="${escapeHtml(source)}" alt="${escapeHtml(productName(item))}" loading="lazy">
      <div><strong>${escapeHtml(productName(item))}</strong><small>${money(item.price)}</small></div>
      <button type="button" data-search-add="${escapeHtml(item.id)}">${tr("add")}</button>
    </article>`;
  }).join("") : `<div class="search-empty">${tr("noResults")}</div>`;
}

function openHeaderSearch() {
  $("#searchPopover").classList.remove("hidden");
  $("#searchToggle").setAttribute("aria-expanded", "true");
  renderSearchResults();
  requestAnimationFrame(() => $("#searchInput").focus());
}

function closeHeaderSearch() {
  $("#searchPopover").classList.add("hidden");
  $("#searchToggle").setAttribute("aria-expanded", "false");
  state.search = "";
  $("#searchInput").value = "";
}

function visibleLayer(selector) {
  const element = $(selector);
  return Boolean(element && !element.classList.contains("hidden"));
}

function syncPageScrollLock() {
  const shouldLock = visibleLayer("#productPage") || visibleLayer("#checkoutModal")
    || visibleLayer("#accountDrawer") || visibleLayer("#authModal") || visibleLayer("#searchPopover");
  if (shouldLock && !pageScrollLocked) {
    pageScrollLockY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add("page-scroll-locked");
    document.body.classList.add("page-scroll-locked");
    document.body.style.top = `-${pageScrollLockY}px`;
    pageScrollLocked = true;
  } else if (!shouldLock && pageScrollLocked) {
    document.documentElement.classList.remove("page-scroll-locked");
    document.body.classList.remove("page-scroll-locked");
    document.body.style.top = "";
    pageScrollLocked = false;
    requestAnimationFrame(() => window.scrollTo({ top: pageScrollLockY, behavior: "auto" }));
  }
}

function toggleHeaderSearch() {
  if ($("#searchPopover").classList.contains("hidden")) openHeaderSearch();
  else closeHeaderSearch();
}

function observeImages() {
  imageObserver?.disconnect();
  imageObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const image = entry.target;
      const source = image.dataset.src;
      if (!source) continue;
      image.onload = () => image.closest(".product-image")?.classList.add("loaded");
      image.onerror = () => { image.src = "logo.png"; image.closest(".product-image")?.classList.add("loaded"); };
      image.src = source;
      image.removeAttribute("data-src");
      imageObserver.unobserve(image);
    }
  }, { rootMargin: "650px 0px" });
  $$("img[data-src]").forEach(image => imageObserver.observe(image));
}

function scrollToCategory(categoryId) {
  if (categoryId !== "all") trackStoreEvent("category_click", { categoryId, categoryName: categoryName(state.categories.find(item => item.id === categoryId) || {}) });
  if (categoryId === "all") return window.scrollTo({ top: 0, behavior: "smooth" });
  const section = document.querySelector(`[data-category-section="${CSS.escape(categoryId)}"]`);
  if (!section) return;
  const headerHeight = $(".site-header")?.offsetHeight || 0;
  const categoriesHeight = $("#categories")?.offsetHeight || 0;
  const top = window.scrollY + section.getBoundingClientRect().top - headerHeight - categoriesHeight - 10;
  window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "smooth" });
}

function centerCategoryButton(categoryId) {
  const container = $("#categories");
  const button = document.querySelector(`[data-category-link="${CSS.escape(categoryId)}"]`);
  if (!container || !button) return;
  const containerRect = container.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const horizontalDifference = buttonRect.left + buttonRect.width / 2
    - (containerRect.left + containerRect.width / 2);
  if (Math.abs(horizontalDifference) < 4) return;
  container.scrollBy({ left: horizontalDifference, top: 0, behavior: "smooth" });
}

function updateCategoryFromScroll() {
  scrollFrame = null;
  const sections = $$("[data-category-section]");
  if (!sections.length) return;
  let active = "all";
  const threshold = Math.min(190, window.innerHeight * .32);
  for (const section of sections) if (section.getBoundingClientRect().top <= threshold) active = section.dataset.categorySection;
  if (window.scrollY < 300) active = "all";
  if (active === state.activeCategory) return;
  state.activeCategory = active;
  $$("[data-category-link]").forEach(button => button.classList.toggle("active", button.dataset.categoryLink === active));
  centerCategoryButton(active);
}

function changeQuantity(id, difference) {
  const wasEmpty = cartCount() === 0;
  state.cart[id] = Math.max(0, Number(state.cart[id] || 0) + difference);
  if (!state.cart[id]) delete state.cart[id];
  state.paymentRequestId = "";
  persistCart();
  renderCartBar();
  syncProductQuantityControls(id);
  if (difference > 0 && wasEmpty) trackStoreEvent("cart_created", { productId: id });
  if (!$("#checkoutModal").classList.contains("hidden")) renderCheckout();
}

function requestAddToCart(id) {
  if (!state.user?.name) {
    pendingCartProductId = id;
    openAuth("login");
    return;
  }
  changeQuantity(id, 1);
  toast(tr("added"));
}

function syncProductQuantityControls(id) {
  const quantity = Number(state.cart[id] || 0);
  $$(`[data-product-quantity="${CSS.escape(String(id))}"]`).forEach(slot => {
    slot.innerHTML = productQuantityControl(id, quantity, slot.dataset.detailQuantity === "true");
  });
  $$(`[data-cart-badge="${CSS.escape(String(id))}"]`).forEach(badge => {
    badge.classList.toggle("hidden", !quantity);
    badge.textContent = quantity ? `${tr("inCart")} × ${quantity}` : "";
  });
}

function syncAllProductQuantityControls() {
  $$("[data-product-quantity]").forEach(slot => {
    const id = slot.dataset.productQuantity;
    slot.innerHTML = productQuantityControl(id, Number(state.cart[id] || 0), slot.dataset.detailQuantity === "true");
  });
  $$("[data-cart-badge]").forEach(badge => {
    const quantity = Number(state.cart[badge.dataset.cartBadge] || 0);
    badge.classList.toggle("hidden", !quantity);
    badge.textContent = quantity ? `${tr("inCart")} × ${quantity}` : "";
  });
}

function renderCartBar() {
  const count = cartCount();
  $("#floatingCart").classList.toggle("hidden", !count);
  $("#cartBadge").textContent = count;
  $("#headerCount").textContent = count;
  $("#cartTotal").textContent = money(subtotal());
}

function renderProductDetail(id) {
  const item = product(id);
  if (!item) return closeProductPage(false);
  const category = state.categories.find(entry => entry.id === item.category);
  const images = productImages(item);
  const main = images[0] || "logo.png";
  const quantity = state.cart[item.id] || 0;
  $("#productDetail").innerHTML = `
    <div class="product-detail-grid">
      <div class="product-gallery">
        <div class="product-gallery-main"><img id="detailMainImage" src="${escapeHtml(main)}" alt="${escapeHtml(productName(item))}"></div>
        ${images.length > 1 ? `<div class="product-thumbs">${images.map((image, index) => `<button class="${index === 0 ? "active" : ""}" data-detail-image="${escapeHtml(image)}"><img src="${escapeHtml(image)}" alt=""></button>`).join("")}</div>` : ""}
      </div>
      <div class="product-detail-copy">
        <span class="kicker">${escapeHtml(category ? categoryName(category) : "")}</span><h1>${escapeHtml(productName(item))}</h1>
        <p>${escapeHtml(productDescription(item) || item.nameEn || item.name)}</p>
      </div>
    </div>
    <div class="detail-purchase-bar">
      <div><small>${escapeHtml(productName(item))}</small><strong class="detail-price">${money(item.price)}</strong></div>
      <div class="product-quantity-slot" data-product-quantity="${escapeHtml(item.id)}" data-detail-quantity="true">${productQuantityControl(item.id, quantity, true)}</div>
    </div>`;
}

function openProductPage(id, push = true) {
  const trackedProduct = product(id);
  if (trackedProduct) trackStoreEvent("product_click", { productId: trackedProduct.id, productName: trackedProduct.name || trackedProduct.nameEn || "" });
  if (!state.detailProductId && push) catalogScrollPosition = window.scrollY;
  state.detailProductId = String(id);
  renderProductDetail(id);
  $("#productPage").classList.remove("hidden");
  $("#productPage").setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-open");
  $("#productPage").scrollTop = 0;
  if (push && location.hash !== `#product=${encodeURIComponent(id)}`) {
    history.pushState({ product: id, catalogScrollPosition }, "", `#product=${encodeURIComponent(id)}`);
  }
}

function clearProductRoute() {
  if (!location.hash.startsWith("#product=")) return;
  history.replaceState(
    { catalogScrollPosition },
    "",
    `${location.pathname}${location.search}`
  );
}

function closeProductPage(useHistory = true) {
  state.detailProductId = "";
  $("#productPage").classList.add("hidden");
  $("#productPage").setAttribute("aria-hidden", "true");
  document.body.classList.remove("detail-open");
  if (useHistory) clearProductRoute();
  restoreCatalogScrollPosition();
}

function restoreCatalogScrollPosition() {
  const restore = () => window.scrollTo({ top: catalogScrollPosition, behavior: "auto" });
  requestAnimationFrame(() => {
    restore();
    setTimeout(restore, 120);
  });
}

function syncProductRoute() {
  const match = location.hash.match(/^#product=(.+)$/);
  if (match) {
    if (history.state?.catalogScrollPosition != null) catalogScrollPosition = Number(history.state.catalogScrollPosition);
    openProductPage(decodeURIComponent(match[1]), false);
  } else if (state.detailProductId) {
    closeProductPage(false);
  }
}

function setAuthMessage(message, success = false) {
  const element = $("#authMessage");
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("success", success);
}

function openAuth(mode = "login") {
  authMode = mode;
  authPhone = mode === "changePhone" ? state.user?.phone || "" : "";
  clearInterval(resendTimer);
  $("#authModal").classList.remove("hidden");
  $("#authModal").setAttribute("aria-hidden", "false");
  $("#authModal .auth-panel").classList.remove("no-close");
  renderPhoneAuth();
}

function closeAuth() {
  if ($("#authModal .auth-panel").classList.contains("no-close")) return;
  clearInterval(resendTimer);
  if (authMode === "login") pendingCartProductId = "";
  $("#authModal").classList.add("hidden");
  $("#authModal").setAttribute("aria-hidden", "true");
}

function authBrand(title, text) {
  return `<div class="auth-brand"><img src="logo.png" alt=""><h2 id="authTitle">${escapeHtml(title)}</h2><p>${escapeHtml(text || "")}</p></div>`;
}

function renderPhoneAuth() {
  $("#authBody").innerHTML = `${authBrand(authMode === "changePhone" ? tr("changePhone") : tr("loginFirst"), tr("phoneHint"))}
    <form class="auth-form" id="phoneAuthForm">
      <label>${tr("phone")}<input class="phone-field" id="loginPhone" inputmode="numeric" pattern="[0-9]*" autocomplete="tel" maxlength="16" placeholder="99999999" value="${escapeHtml(authPhone)}"></label>
      <p class="auth-message" id="authMessage"></p>
      <button class="primary" id="sendCodeButton" type="submit">${tr("confirmPhone")}</button>
    </form>`;
  const input = $("#loginPhone");
  input.oninput = event => {
    event.target.value = normalizePhone(event.target.value);
    authPhone = event.target.value;
    setAuthMessage("");
  };
  $("#phoneAuthForm").onsubmit = event => {
    event.preventDefault();
    sendLoginCode();
  };
  setTimeout(() => input.focus(), 60);
}

async function sendLoginCode(isResend = false) {
  authPhone = normalizePhone(authPhone || $("#loginPhone")?.value);
  if (authPhone.length !== 8) return setAuthMessage(tr("invalidPhone"));
  if (!orderingConfig.sendLoginCodeWebhookUrl) return setAuthMessage(tr("loginServiceUnavailable"));
  const button = $("#sendCodeButton");
  if (button) {
    button.disabled = true;
    button.innerHTML = `<span class="auth-loader"></span>`;
  }
  try {
    const response = await fetch(orderingConfig.sendLoginCodeWebhookUrl, {
      method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ phone: authPhone }), cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      if (data.retryAfter && $("#otpInput")) startResendCountdown(Number(data.retryAfter));
      throw new Error(data.message || tr("sendFailed"));
    }
    if (!isResend || !$("#otpInput")) renderOtpAuth();
    else {
      setAuthMessage(tr("codeSent"), true);
      $("#otpInput").value = "";
      $("#otpInput").focus();
    }
    startResendCountdown(Number(data.retryAfter || 30));
  } catch (error) {
    setAuthMessage(error.message || tr("sendFailed"));
    if (button) {
      button.disabled = false;
      button.textContent = tr("confirmPhone");
    }
  }
}

function renderOtpAuth() {
  $("#authBody").innerHTML = `${authBrand(tr("codeSent"), `${tr("enterCode")} — ${authPhone}`)}
    <div class="auth-form">
      <label>${tr("enterCode")}<input class="otp-field" id="otpInput" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="4" placeholder="- - - -"></label>
      <p class="auth-message success" id="authMessage">${tr("codeSent")}</p>
      <div class="resend-row"><button class="resend-link" id="resendCode" type="button" disabled></button></div>
    </div>`;
  const input = $("#otpInput");
  input.oninput = event => {
    event.target.value = normalizePhone(event.target.value).slice(0, 4);
    setAuthMessage("");
    if (event.target.value.length === 4) verifyLoginCode(event.target.value);
  };
  setTimeout(() => input.focus(), 60);
}

function startResendCountdown(seconds = 30) {
  clearInterval(resendTimer);
  let remaining = Math.max(0, Math.ceil(seconds));
  const button = $("#resendCode");
  const update = () => {
    const current = $("#resendCode");
    if (!current) return clearInterval(resendTimer);
    current.disabled = remaining > 0;
    current.textContent = remaining > 0 ? `${tr("resendAfter")} ${remaining} ${state.lang === "ar" ? "ثانية" : "sec"}` : tr("resendCode");
    if (remaining <= 0) {
      clearInterval(resendTimer);
      current.onclick = () => sendLoginCode(true);
    }
    remaining--;
  };
  if (button) update();
  resendTimer = setInterval(update, 1000);
}

async function verifyLoginCode(code) {
  const input = $("#otpInput");
  if (!input || input.disabled) return;
  if (!orderingConfig.verifyLoginCodeWebhookUrl) return setAuthMessage(tr("loginServiceUnavailable"));
  input.disabled = true;
  setAuthMessage(tr("verifying"), true);
  try {
    const response = await fetch(orderingConfig.verifyLoginCodeWebhookUrl, {
      method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ phone: authPhone, code }), cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.message || tr("invalidCode"));
    clearInterval(resendTimer);
    if (authMode === "changePhone" && state.user) {
      const profiles = readJson(PROFILE_KEY, {});
      const previousPhone = state.user.phone;
      const previousCart = { ...state.cart };
      state.user.phone = authPhone;
      await authenticateFirebaseCustomer(data, authPhone);
      if (profiles[previousPhone]) delete profiles[previousPhone];
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
      localStorage.setItem(cartStorageKey(authPhone), JSON.stringify(previousCart));
      persistUser();
      closeAuth();
      openAccountDrawer("info");
      return toast(tr("infoSaved"));
    }
    const profiles = readJson(PROFILE_KEY, {});
    const profile = profiles[authPhone] || { phone: authPhone, name: "", addresses: [], orders: [] };
    state.user = { ...profile, phone: authPhone, addresses: profile.addresses || [], orders: profile.orders || [] };
    state.cart = loadUserCart(state.user);
    await authenticateFirebaseCustomer(data, authPhone);
    await hydrateUserFromFirebase();
    state.name = state.user.name;
    state.phone = state.user.phone;
    if (!state.user.name) return renderUsernameAuth();
    persistUser();
    completeLogin();
  } catch (error) {
    input.disabled = false;
    input.value = "";
    input.focus();
    setAuthMessage(error.message || tr("verifyFailed"));
  }
}

function renderUsernameAuth() {
  $("#authModal .auth-panel").classList.add("no-close");
  $("#authBody").innerHTML = `${authBrand(tr("welcome"), "")}
    <form class="auth-form" id="usernameForm">
      <label>${tr("username")}<input id="usernameInput" autocomplete="name" maxlength="80"></label>
      <p class="auth-message" id="authMessage"></p>
      <button class="primary" type="submit">${tr("confirm")}</button>
    </form>`;
  $("#usernameForm").onsubmit = event => {
    event.preventDefault();
    const name = $("#usernameInput").value.trim();
    if (!name) return setAuthMessage(tr("nameRequired"));
    state.user.name = name;
    persistUser();
    trackStoreEvent("account_created");
    completeLogin();
  };
  setTimeout(() => $("#usernameInput").focus(), 60);
}

function completeLogin() {
  $("#authModal .auth-panel").classList.remove("no-close");
  $("#authModal").classList.add("hidden");
  $("#authModal").setAttribute("aria-hidden", "true");
  updateAccountButton();
  renderCartBar();
  syncAllProductQuantityControls();
  if (pendingCartProductId) {
    const id = pendingCartProductId;
    pendingCartProductId = "";
    changeQuantity(id, 1);
    toast(tr("added"));
  }
}

async function logout() {
  persistCart();
  clearTimeout(userSyncTimer);
  try {
    await syncUserToFirebase();
  } catch (error) {
    console.error("Firebase profile sync before logout failed", error);
  }
  localStorage.removeItem(SESSION_KEY);
  firebaseAuthUser = null;
  if (firebaseServices) {
    try {
      await firebaseServices.auth.signOut();
      const credential = await firebaseServices.auth.signInAnonymously();
      firebaseAuthUser = credential.user;
    } catch (error) {
      console.error("Firebase logout failed", error);
    }
  }
  state.user = null;
  state.cart = {};
  state.name = "";
  state.phone = "";
  closeAccountDrawer();
  updateAccountButton();
  renderCartBar();
  syncAllProductQuantityControls();
  toast(tr("loggedOut"));
}

function openAccountDrawer(page = "home", options = {}) {
  if (!state.user?.name) return openAuth("login");
  $("#accountDrawer").classList.toggle("order-detail-mode", page === "orderDetails");
  accountReturnToCheckout = Boolean(options.returnToCheckout);
  if (accountReturnToCheckout) $("#checkoutModal").classList.add("hidden");
  $("#accountDrawer").classList.remove("hidden");
  $("#accountDrawer").setAttribute("aria-hidden", "false");
  if (page === "info") renderAccountInfo();
  else if (page === "addresses") renderAddresses();
  else if (page === "orders") renderOrders();
  else if (page === "orderDetails") renderOrderDetails(options.orderId || "", options.fromSuccess === true);
  else if (page === "addressForm") renderAddressForm(options.addressId || "");
  else renderAccountHome();
}

function closeAccountDrawer(returnToCheckout = false) {
  const restoreCheckout = returnToCheckout && accountReturnToCheckout;
  accountReturnToCheckout = false;
  $("#accountDrawer").classList.add("hidden");
  $("#accountDrawer").setAttribute("aria-hidden", "true");
  if (restoreCheckout) {
    $("#checkoutModal").classList.remove("hidden");
    renderCheckout();
  }
}

function resetAccountDrawerScroll() {
  const drawer = $(".account-drawer");
  if (drawer) {
    drawer.scrollTop = 0;
    drawer.scrollLeft = 0;
  }
}

const accountIcons = {
  info: `<svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"/></svg>`,
  address: `<svg viewBox="0 0 24 24"><path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>`,
  order: `<svg viewBox="0 0 24 24"><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm4 5h6M9 12h6"/></svg>`,
  logout: `<svg viewBox="0 0 24 24"><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/></svg>`,
  phone: `<svg viewBox="0 0 24 24"><path d="M8.1 3.5 5.4 4.8c-1.2.6-.9 3.2.8 6.4s4.8 6.3 8 7.9c3.2 1.6 5.7 1.5 6.2.2l1.1-2.8-4.8-2.3-1.5 2c-1.6-.8-3.3-2.1-4.8-3.6-1.4-1.5-2.6-3.1-3.3-4.6l2-1.4-1-3.1Z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 1.8"/></svg>`,
  card: `<svg viewBox="0 0 24 24"><path d="M3 6.5h18v12H3v-12Zm0 4h18M7 15h3"/></svg>`,
  box: `<svg viewBox="0 0 24 24"><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Zm0 0 8 4 8-4M12 11v10"/></svg>`
};

function renderAccountHome() {
  if (!state.user) return;
  resetAccountDrawerScroll();
  $("#accountContent").innerHTML = `
    <section class="account-welcome"><small>${tr("welcome")}</small><h2>${escapeHtml(state.user.name)}</h2><p>${escapeHtml(state.user.phone)}</p></section>
    <nav class="account-menu">
      <button id="openInfo">${accountIcons.info}<span>${tr("myInfo")}</span></button>
      <button id="openAddresses">${accountIcons.address}<span>${tr("myAddresses")}</span></button>
      <button id="openOrders">${accountIcons.order}<span>${tr("myOrders")}</span></button>
      <button class="logout" id="logoutButton">${accountIcons.logout}<span>${tr("logout")}</span></button>
    </nav>`;
  $("#openInfo").onclick = renderAccountInfo;
  $("#openAddresses").onclick = renderAddresses;
  $("#openOrders").onclick = renderOrders;
  $("#logoutButton").onclick = logout;
}

function drawerPageHeader(title, extra = "") {
  return `<div class="drawer-page-head"><button class="drawer-page-back" data-drawer-back>‹</button><h2>${escapeHtml(title)}</h2>${extra}</div>`;
}

function bindDrawerBack(target = "home") {
  $("[data-drawer-back]")?.addEventListener("click", () => target === "addresses" ? renderAddresses() : renderAccountHome());
}

function renderAccountInfo() {
  resetAccountDrawerScroll();
  $("#accountContent").innerHTML = `${drawerPageHeader(tr("myInfo"))}
    <form class="profile-form" id="profileForm">
      <label>${tr("username")}<input id="profileName" value="${escapeHtml(state.user.name)}" maxlength="80"></label>
      <label>${tr("phone")}<div class="profile-phone"><input value="${escapeHtml(state.user.phone)}" readonly><button class="secondary" id="changePhoneButton" type="button">${tr("changePhone")}</button></div></label>
      <button class="primary" type="submit">${tr("save")}</button>
    </form>`;
  bindDrawerBack();
  $("#changePhoneButton").onclick = () => openAuth("changePhone");
  $("#profileForm").onsubmit = event => {
    event.preventDefault();
    const name = $("#profileName").value.trim();
    if (!name) return toast(tr("nameRequired"));
    state.user.name = name;
    persistUser();
    toast(tr("infoSaved"));
    renderAccountInfo();
  };
}

function renderAddresses() {
  const addresses = state.user.addresses || [];
  resetAccountDrawerScroll();
  $("#accountContent").innerHTML = `${drawerPageHeader(tr("myAddresses"), `<button class="primary" id="addAddressTop">＋ ${tr("addAddress")}</button>`)}
    ${addresses.length ? `<div class="address-list">${addresses.map(address => `
      <article class="address-card">
        <h3>${escapeHtml(address.areaName)}</h3><p>${escapeHtml(address.details)}</p>
        <div class="card-actions"><button data-edit-address="${escapeHtml(address.id)}">${tr("edit")}</button><button class="delete" data-delete-address="${escapeHtml(address.id)}">${tr("delete")}</button></div>
      </article>`).join("")}</div>` : `<div class="empty-state">${accountIcons.address}<h3>${tr("addressesEmpty")}</h3></div>`}`;
  bindDrawerBack();
  $("#addAddressTop").onclick = () => renderAddressForm("");
  $$("[data-edit-address]").forEach(button => button.onclick = () => renderAddressForm(button.dataset.editAddress));
  $$("[data-delete-address]").forEach(button => button.onclick = () => {
    if (!confirm(tr("delete"))) return;
    state.user.addresses = state.user.addresses.filter(address => address.id !== button.dataset.deleteAddress);
    if (state.addressId === button.dataset.deleteAddress) {
      state.addressId = "";
      state.area = null;
      state.address = "";
    }
    persistUser();
    renderAddresses();
  });
}

function renderAddressForm(addressId = "") {
  const existing = (state.user.addresses || []).find(address => address.id === addressId);
  resetAccountDrawerScroll();
  let selectedArea = existing ? { name: existing.areaName, price: existing.price } : null;
  let pendingArea = null;
  let areaQuery = selectedArea?.name || "";
  let areaResults = "";
  const areaLabel = area => state.lang === "ar" ? (area.nameAr || area.name) : (area.nameEn || area.nameAr || area.name);
  const resultsHtml = query => {
    const normalizedQuery = String(query || "").trim();
    if (!normalizedQuery) return "";
    return state.areas.filter(area => [area.name, area.nameAr, area.nameEn].filter(Boolean).some(name => name.toLocaleLowerCase().includes(normalizedQuery.toLocaleLowerCase()))).slice(0, 60).map(area =>
      `<button type="button" class="${selectedArea?.name === area.name ? "selected" : ""}" data-pick-area="${escapeHtml(area.name)}"><span class="area-name">${selectedArea?.name === area.name ? "<i>✓</i>" : ""}${escapeHtml(areaLabel(area))}</span><b>${money(area.price)}</b></button>`
    ).join("");
  };
  const areaPickerHtml = () => selectedArea ? `
    <div class="confirmed-area">
      <span class="confirmed-area-check" aria-hidden="true">✓</span>
      <div><strong>${escapeHtml(areaLabel(selectedArea))}</strong><small>${tr("deliveryFee")}: ${money(selectedArea.price)}</small></div>
      <button type="button" class="edit-area-button" id="editAddressArea">${tr("edit")}</button>
    </div>` : `
    <input id="addressAreaSearch" value="${escapeHtml(areaQuery)}" placeholder="${tr("areaSearch")}" autocomplete="off">
    <div class="area-results${areaResults ? "" : " hidden"}" id="addressAreaResults">${areaResults}</div>
    ${pendingArea ? `<div class="area-confirmation" role="dialog" aria-modal="true" aria-labelledby="area-confirm-title">
      <div class="area-confirm-card"><span class="area-confirm-icon" aria-hidden="true">⌖</span>
        <h3 id="area-confirm-title">${state.lang === "ar" ? `هل تريد اختيار منطقة ${escapeHtml(areaLabel(pendingArea))}؟` : `Do you want to choose ${escapeHtml(areaLabel(pendingArea))}?`}</h3>
        <p>${tr("deliveryFee")}: ${money(pendingArea.price)}</p>
        <div class="area-confirm-actions"><button type="button" class="primary" id="confirmAddressArea">${state.lang === "ar" ? "نعم" : "Yes"}</button><button type="button" class="secondary" id="cancelAddressArea">${state.lang === "ar" ? "لا" : "No"}</button></div>
      </div>
    </div>` : ""}`;
  $("#accountContent").innerHTML = `${drawerPageHeader(existing ? tr("edit") : tr("addAddress"))}
    <form class="address-form" id="addressForm">
      <label>${tr("areaSearch")}
        <div class="area-picker" id="addressAreaPicker">${areaPickerHtml()}</div>
      </label>
      <label>${tr("addressDetails")}<textarea id="addressDetails" placeholder="${tr("addressPlaceholder")}">${escapeHtml(existing?.details || "")}</textarea></label>
      <p class="auth-message" id="addressMessage"></p>
      <button class="primary" type="submit">${tr("save")}</button>
    </form>`;
  $("[data-drawer-back]").onclick = () => {
    if (accountReturnToCheckout) {
      closeAccountDrawer(true);
    } else renderAddresses();
  };
  const renderAreaPicker = () => {
    $("#addressAreaPicker").innerHTML = areaPickerHtml();
    const bindAreaResults = () => $$('[data-pick-area]').forEach(button => button.onclick = () => {
      pendingArea = state.areas.find(area => area.name === button.dataset.pickArea) || null;
      renderAreaPicker();
    });
    bindAreaResults();
    $("#addressAreaSearch")?.addEventListener("input", event => {
      areaQuery = event.target.value;
      areaResults = resultsHtml(areaQuery);
      const results = $("#addressAreaResults");
      results.innerHTML = areaResults;
      results.classList.toggle("hidden", !areaResults);
      bindAreaResults();
    });
    $("#confirmAddressArea")?.addEventListener("click", () => {
      if (!pendingArea) return;
      selectedArea = { ...pendingArea };
      pendingArea = null;
      areaQuery = "";
      areaResults = "";
      renderAreaPicker();
    });
    $("#cancelAddressArea")?.addEventListener("click", () => {
      pendingArea = null;
      renderAreaPicker();
    });
    $("#editAddressArea")?.addEventListener("click", () => {
      selectedArea = null;
      pendingArea = null;
      areaQuery = "";
      renderAreaPicker();
      $("#addressAreaSearch")?.focus();
    });
  };
  renderAreaPicker();
  $("#addressDetails").oninput = event => { event.target.value = normalizeAddressText(event.target.value); };
  $("#addressForm").onsubmit = event => {
    event.preventDefault();
    const details = normalizeAddressText($("#addressDetails").value).trim();
    if (!selectedArea) return $("#addressMessage").textContent = tr("chooseArea");
    if (!details) return $("#addressMessage").textContent = tr("addressDetails");
    const saved = { id: existing?.id || `address-${Date.now().toString(36)}`, areaName: selectedArea.name, price: Number(selectedArea.price), details };
    const addresses = state.user.addresses || [];
    const index = addresses.findIndex(address => address.id === saved.id);
    if (index >= 0) addresses[index] = saved; else addresses.push(saved);
    state.user.addresses = addresses;
    persistUser();
    toast(tr("addressSaved"));
    if (accountReturnToCheckout) {
      state.addressId = saved.id;
      state.area = state.areas.find(area => area.name === saved.areaName) || { name: saved.areaName, price: saved.price };
      state.address = saved.details;
      closeAccountDrawer(true);
    } else renderAddresses();
  };
}

function renderOrders() {
  $("#accountDrawer").classList.remove("order-detail-mode");
  const orders = (state.user.orders || []).slice().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  resetAccountDrawerScroll();
  $("#accountContent").innerHTML = `${drawerPageHeader(tr("myOrders"))}
    ${orders.length ? `<div class="order-list">${orders.map(order => `
      <article class="order-card">
        <div class="order-card-head"><div><strong class="order-number">${escapeHtml(order.orderId)}</strong><p>${escapeHtml(trLocaleDate(order.createdAt))}</p></div><span class="paid-badge">${tr("paid")}</span></div>
        <div class="order-total"><span>${tr("total")}</span><b>${money(order.total)}</b></div>
        <button class="primary" data-order-details="${escapeHtml(order.orderId)}">${tr("viewOrderDetails")}</button>
      </article>`).join("")}</div>` : `<div class="empty-state">${accountIcons.order}<h3>${tr("ordersEmpty")}</h3></div>`}`;
  bindDrawerBack();
  $$("[data-order-details]").forEach(button => button.onclick = () => renderOrderDetails(button.dataset.orderDetails));
}

function orderDestination(order) {
  if (order.mode === "delivery") return `${order.areaName || ""} — ${order.address || ""}`;
  const branch = branches.find(item => item.id === order.branchId);
  return branch ? `${branchField(branch, "name")} — ${branchField(branch, "address")}` : "";
}

function renderOrderDetails(orderId, fromSuccess = false) {
  const order = (state.user?.orders || []).find(item => item.orderId === orderId) ||
    (state.lastInvoice?.orderId === orderId ? state.lastInvoice : null);
  if (!order) return renderOrders();
  $("#accountDrawer").classList.add("order-detail-mode");
  resetAccountDrawerScroll();
  $("#accountContent").innerHTML = `${drawerPageHeader(tr("orderDetails"))}
    <section class="order-detail">
      <div class="order-detail-hero">
        <div class="order-detail-brand"><img src="logo.png" alt=""><div><small>${tr("orderNumber")}</small><strong>${escapeHtml(order.orderId)}</strong><p>${escapeHtml(trLocaleDate(order.createdAt))}</p></div></div>
        <span class="paid-badge">${tr("paid")}</span>
      </div>
      <div class="detail-section-title"><span class="detail-title-icon">${accountIcons.info}</span><div><small>${tr("customer")}</small><b>${tr("deliveryDetails")}</b></div></div>
      <div class="order-detail-grid">
        <div><span class="detail-item-icon">${accountIcons.info}</span><span><small>${tr("customerName")}</small><strong>${escapeHtml(order.customerName || state.user?.name || "")}</strong></span></div>
        <div><span class="detail-item-icon">${accountIcons.phone}</span><span><small>${tr("phone")}</small><strong class="phone">${escapeHtml(order.phone || state.user?.phone || "")}</strong></span></div>
        <div><span class="detail-item-icon">${accountIcons.address}</span><span><small>${order.mode === "delivery" ? tr("deliveryAddress") : tr("pickupBranch")}</small><strong>${escapeHtml(orderDestination(order))}</strong></span></div>
        <div><span class="detail-item-icon">${accountIcons.clock}</span><span><small>${order.mode === "pickup" ? tr("pickupStatus") : tr("expectedDeliveryTime")}</small><strong class="delivery-time-lines">${deliveryTimeSummaryMarkup(order)}</strong></span></div>
      </div>
      <div class="detail-section-title"><span class="detail-title-icon">${accountIcons.box}</span><div><small>${(order.items || []).length} ${tr("products")}</small><b>${tr("showProducts")}</b></div></div>
      <div class="order-detail-body">
        <div class="order-detail-items">${(order.items || []).map((item, index) => `
          <article><i>${index + 1}</i><span><b>${escapeHtml(orderItemName(item))}</b><small>${tr("quantity")}: ${item.quantity} × ${money(item.unitPrice || (item.total / item.quantity))}</small></span><strong>${money(item.total)}</strong></article>`).join("")}</div>
        <div class="order-detail-totals">
          <span>${tr("productsTotal")} <b>${money(order.subtotal)}</b></span>
          <span>${tr("deliveryFee")} <b>${money(order.deliveryFee)}</b></span>
          <strong>${tr("total")} <b>${money(order.total)}</b></strong>
          <small>${accountIcons.card} ${tr("payOnline")}</small>
        </div>
      </div>
      <button class="primary download-invoice-button" id="downloadOrderInvoice">${tr("downloadInvoice")}</button>
    </section>`;
  const back = $("[data-drawer-back]");
  if (back) back.onclick = () => {
    if (fromSuccess) {
      closeAccountDrawer();
      $("#checkoutModal").classList.remove("hidden");
    } else {
      renderOrders();
    }
  };
  const downloadButton = $("#downloadOrderInvoice");
  downloadButton.onclick = () => downloadPdf(order);
  prepareInvoiceFile(order, downloadButton);
}

function openCheckout() {
  if (!cartCount()) {
    toast(state.lang === "ar" ? "أضف منتجاً إلى السلة أولاً" : "Add a product to your cart first");
    return;
  }
  if (!state.user?.name) return openAuth("login");
  clearProductRoute();
  if (state.detailProductId) closeProductPage(false);
  state.name = state.user.name;
  state.phone = state.user.phone;
  state.step = 1;
  $("#steps").classList.remove("hidden");
  $("#checkoutModal").classList.remove("hidden");
  renderCheckout();
}

function setSteps() {
  $$(".steps [data-step]").forEach(element => {
    const step = Number(element.dataset.step);
    element.classList.toggle("active", step === state.step);
    element.classList.toggle("done", step < state.step);
    if (step === 3) {
      const label = $("span", element);
      if (label) label.textContent = state.mode === "pickup" ? tr("pickupTime") : tr("deliveryTime");
    }
  });
}

function renderCheckout() {
  setSteps();
  $("#checkoutTitle").textContent = state.step === 3
    ? (state.mode === "pickup" ? tr("pickupTime") : tr("deliveryTime"))
    : state.step === 4 ? tr("confirmPay") : tr("completeOrder");
  if (state.step === 1) renderReview();
  else if (state.step === 2) renderDelivery();
  else if (state.step === 3) renderDeliveryTime();
  else renderConfirmation();
}

function totalsHtml() {
  return `<div class="totals"><span>${tr("productsTotal")} <b>${money(subtotal())}</b></span>${deliveryFee() ? `<span>${tr("deliveryFee")} <b>${money(deliveryFee())}</b></span>` : ""}<strong>${tr("total")} <b>${money(total())}</b></strong></div>`;
}

function renderReview() {
  $("#checkoutBody").innerHTML = `
    <section class="checkout-review"><div class="cart-list">${cartItems().map(({ product: item, quantity }) => `
      <div class="cart-row"><img src="${escapeHtml(productImages(item)[0] || "logo.png")}" alt="">
        <div><h4>${escapeHtml(productName(item))}</h4><strong>${money(item.price * quantity)}</strong></div>
        <div class="qty"><button data-plus="${escapeHtml(item.id)}">+</button><span>${quantity}</span><button data-minus="${escapeHtml(item.id)}">${quantity === 1 ? "×" : "−"}</button></div>
      </div>`).join("")}</div><div class="checkout-sticky-actions">${totalsHtml()}<button class="primary" id="next1">${tr("confirmContinue")}</button></div></section>`;
  $("#next1").onclick = () => {
    if (!cartCount()) return toast(state.lang === "ar" ? "لا يمكن المتابعة وسلتك فارغة" : "You cannot continue with an empty cart");
    state.step = 2;
    renderCheckout();
  };
}

function selectSavedAddress(addressId) {
  const saved = (state.user.addresses || []).find(address => address.id === addressId);
  if (!saved) return;
  state.addressId = saved.id;
  state.area = state.areas.find(area => area.name === saved.areaName) || { name: saved.areaName, price: saved.price };
  state.address = saved.details;
  state.paymentRequestId = "";
  renderDelivery();
}

function renderDelivery() {
  if (state.mode === "pickup" && !branches.some(branch => branch.id === state.branch)) state.branch = "";
  const addresses = state.user.addresses || [];
  const deliveryForm = addresses.length ? `
    <h3>${tr("selectAddress")}</h3><div class="checkout-addresses">${addresses.map(address => `
      <button class="checkout-address ${state.addressId === address.id ? "selected" : ""}" data-checkout-address="${escapeHtml(address.id)}">
        <span class="radio">${state.addressId === address.id ? "✓" : ""}</span><div><strong>${escapeHtml(address.areaName)} — ${money(address.price)}</strong><small>${escapeHtml(address.details)}</small></div>
      </button>`).join("")}</div><button class="add-address-button" id="checkoutAddAddress">＋ ${tr("addAddress")}</button>` :
    `<div class="empty-state">${accountIcons.address}<h3>${tr("noAddedAddresses")}</h3><button class="primary" id="checkoutAddAddress">＋ ${tr("addAddress")}</button></div>`;
  const pickupForm = `<div class="branches">${branches.map(branch => `
    <button class="option ${state.branch === branch.id ? "selected" : ""}" data-branch="${branch.id}">
      <span class="radio"></span><div><strong>${escapeHtml(branchField(branch, "name"))}</strong><b>${escapeHtml(branchField(branch, "brand"))}</b><small>${escapeHtml(branchField(branch, "address"))}<br>${branch.phone}</small></div>
    </button>`).join("")}</div>`;
  $("#checkoutBody").innerHTML = `
    <div class="tabs"><button class="${state.mode === "delivery" ? "active" : ""}" id="deliveryTab">🚚 ${tr("delivery")}</button><button class="${state.mode === "pickup" ? "active" : ""}" id="pickupTab">⌂ ${tr("pickup")}</button></div>
    ${state.mode === "delivery" ? deliveryForm : pickupForm}
    <div class="actions"><button class="secondary" id="back1">${tr("back")}</button><button class="primary" id="next2">${tr("confirmContinue")}</button></div>`;
  $("#deliveryTab").onclick = () => {
    state.mode = "delivery";
    if (state.deliveryTiming === "notify") state.deliveryTiming = "asap";
    state.paymentRequestId = "";
    renderDelivery();
  };
  $("#pickupTab").onclick = () => {
    state.mode = "pickup";
    if (state.deliveryTiming === "asap") state.deliveryTiming = "notify";
    state.paymentRequestId = "";
    renderDelivery();
  };
  $("#back1").onclick = () => { state.step = 1; renderCheckout(); };
  $("#checkoutAddAddress")?.addEventListener("click", () => openAccountDrawer("addressForm", { returnToCheckout: true }));
  $$("[data-checkout-address]").forEach(button => button.onclick = () => selectSavedAddress(button.dataset.checkoutAddress));
  $$("[data-branch]").forEach(button => button.onclick = () => { state.branch = button.dataset.branch; state.paymentRequestId = ""; renderDelivery(); });
  $("#next2").onclick = () => {
    if (!cartCount()) return toast(state.lang === "ar" ? "لا يمكن المتابعة وسلتك فارغة" : "You cannot continue with an empty cart");
    if (state.mode === "delivery" && !state.addressId) return toast(tr("completeDelivery"));
    if (state.mode === "pickup" && !state.branch) return toast(tr("chooseBranch"));
    state.step = 3;
    renderCheckout();
  };
}

function deliverySummary() {
  if (state.mode === "pickup") {
    const branch = branches.find(item => item.id === state.branch);
    return branch ? `${branchField(branch, "name")} — ${branchField(branch, "address")}` : "";
  }
  return `${state.area?.name || ""} — ${state.address}`;
}

function dateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function scheduledDateTime() {
  if (!state.scheduledDate) return null;
  let hour = Number(state.scheduledHour);
  if (state.scheduledPeriod === "pm" && hour !== 12) hour += 12;
  if (state.scheduledPeriod === "am" && hour === 12) hour = 0;
  const result = new Date(`${state.scheduledDate}T${String(hour).padStart(2, "0")}:${state.scheduledMinute}:00`);
  return Number.isNaN(result.getTime()) ? null : result;
}

function minimumScheduledDateTime(now = new Date()) {
  return new Date(now.getTime() + 2 * 60 * 60 * 1000);
}

function minutesSinceMidnight(value = new Date()) {
  return value.getHours() * 60 + value.getMinutes();
}

function isWithinDeliveryHours(value) {
  const minutes = minutesSinceMidnight(value);
  return minutes >= 9 * 60 + 30 && minutes <= 22 * 60 + 30;
}

function isAsapDeliveryUnavailable(value = new Date()) {
  const minutes = minutesSinceMidnight(value);
  return minutes >= 22 * 60 || minutes < 7 * 60 + 30;
}

function nextDeliveryOpening(value = new Date()) {
  const result = new Date(value);
  if (minutesSinceMidnight(result) >= 22 * 60) result.setDate(result.getDate() + 1);
  result.setHours(9, 30, 0, 0);
  return result;
}

function normalizeToDeliveryHours(value) {
  const result = new Date(value);
  const minutes = minutesSinceMidnight(result);
  if (minutes < 9 * 60 + 30) {
    result.setHours(9, 30, 0, 0);
    return result;
  }
  if (minutes > 22 * 60 + 30) {
    result.setDate(result.getDate() + 1);
    result.setHours(9, 30, 0, 0);
  }
  return result;
}

function asapDeliveryWindow(value = new Date()) {
  let start = new Date(value.getTime() + 60 * 60 * 1000);
  const opening = nextDeliveryOpening(value);
  if (start.getTime() < opening.getTime()) start = opening;
  return { start, end: new Date(start.getTime() + 60 * 60 * 1000) };
}

function isLateAsapDelivery(value = new Date()) {
  return asapDeliveryWindow(value).end.getTime() > new Date(
    value.getFullYear(), value.getMonth(), value.getDate(), 22, 30, 0, 0
  ).getTime();
}

function roundUpToHalfHour(value) {
  const result = new Date(value);
  result.setSeconds(0, 0);
  const minutes = result.getMinutes();
  if (minutes === 0 || minutes === 30) return result;
  if (minutes < 30) result.setMinutes(30);
  else {
    result.setHours(result.getHours() + 1);
    result.setMinutes(0);
  }
  return result;
}

function setScheduledFields(value) {
  const date = new Date(value);
  const hour24 = date.getHours();
  state.scheduledDate = dateInputValue(date);
  state.scheduledHour = String(hour24 % 12 || 12);
  state.scheduledMinute = date.getMinutes() >= 30 ? "30" : "00";
  state.scheduledPeriod = hour24 >= 12 ? "pm" : "am";
}

function ensureFutureScheduledDefault() {
  const minimum = minimumScheduledDateTime();
  const selected = scheduledDateTime();
  if (!selected || selected.getTime() < minimum.getTime()) {
    const candidate = roundUpToHalfHour(minimum);
    setScheduledFields(state.mode === "delivery" ? normalizeToDeliveryHours(candidate) : candidate);
  }
}

function isScheduledTimeAllowed(value, now = new Date()) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return false;
  return value.getTime() >= minimumScheduledDateTime(now).getTime();
}

function renderDeliveryTime() {
  if (state.mode === "pickup" && state.deliveryTiming === "asap") state.deliveryTiming = "notify";
  if (state.mode === "delivery" && state.deliveryTiming === "notify") state.deliveryTiming = "asap";
  const asapUnavailable = state.mode === "delivery" && isAsapDeliveryUnavailable();
  if (asapUnavailable && state.deliveryTiming !== "scheduled") {
    state.deliveryTiming = "scheduled";
    setScheduledFields(nextDeliveryOpening());
  }
  const immediateTiming = state.mode === "pickup" ? "notify" : "asap";
  state.scheduledDate = state.scheduledDate || dateInputValue();
  const specific = state.deliveryTiming === "scheduled";
  const showLateWarning = state.mode === "delivery" && !specific && isLateAsapDelivery();
  const immediateTitle = state.mode === "pickup" ? tr("notifyWhenReady") : tr("withinTwoHours");
  const immediateHint = state.mode === "pickup" ? tr("notifyWhenReadyHint") : tr("withinTwoHoursHint");
  const scheduledTitle = state.mode === "pickup" ? tr("chooseArrivalTime") : tr("chooseSpecificTime");
  const scheduledHint = state.mode === "pickup" ? tr("chooseArrivalTimeHint") : tr("chooseSpecificTimeHint");
  const hours = Array.from({ length: 12 }, (_, index) => index + 1);
  $("#checkoutBody").innerHTML = `
    <section class="delivery-time-panel">
      <button class="time-choice ${specific ? "" : "selected"} ${asapUnavailable ? "disabled" : ""}" id="asapTime" type="button" ${asapUnavailable ? "disabled aria-disabled=\"true\"" : ""}>
        <span class="radio">${specific ? "" : "✓"}</span><span><strong>${immediateTitle}</strong><small>${immediateHint}</small></span>
      </button>
      ${showLateWarning ? `<p class="time-warning">${tr("lateDeliveryWarning")}</p>` : ""}
      <button class="time-choice ${specific ? "selected" : ""}" id="scheduledTime" type="button">
        <span class="radio">${specific ? "✓" : ""}</span><span><strong>${scheduledTitle}</strong><small>${scheduledHint}</small></span>
      </button>
      ${specific ? `<div class="time-fields">
        <label class="time-date">${tr("deliveryDate")}<input id="scheduledDate" type="date" min="${dateInputValue()}" value="${escapeHtml(state.scheduledDate)}"></label>
        <label class="time-period">${tr("period")}<select id="scheduledPeriod"><option value="am" ${state.scheduledPeriod === "am" ? "selected" : ""}>${tr("morning")}</option><option value="pm" ${state.scheduledPeriod === "pm" ? "selected" : ""}>${tr("evening")}</option></select></label>
        <label class="time-minute">${tr("minute")}<select id="scheduledMinute"><option value="00" ${state.scheduledMinute === "00" ? "selected" : ""}>00</option><option value="30" ${state.scheduledMinute === "30" ? "selected" : ""}>30</option></select></label>
        <label class="time-hour">${tr("hour")}<select id="scheduledHour">${hours.map(hour => `<option value="${hour}" ${String(hour) === String(state.scheduledHour) ? "selected" : ""}>${hour}</option>`).join("")}</select></label>
      </div>` : ""}
      <div class="actions"><button class="secondary" id="backTime">${tr("back")}</button><button class="primary" id="confirmTime">${tr("confirmContinue")}</button></div>
    </section>`;
  $("#asapTime").onclick = () => { state.deliveryTiming = immediateTiming; state.paymentRequestId = ""; renderDeliveryTime(); };
  $("#scheduledTime").onclick = () => {
    ensureFutureScheduledDefault();
    state.deliveryTiming = "scheduled";
    state.paymentRequestId = "";
    renderDeliveryTime();
  };
  $("#scheduledDate")?.addEventListener("change", event => { state.scheduledDate = event.target.value; state.paymentRequestId = ""; });
  $("#scheduledHour")?.addEventListener("change", event => { state.scheduledHour = event.target.value; state.paymentRequestId = ""; });
  $("#scheduledMinute")?.addEventListener("change", event => { state.scheduledMinute = event.target.value; state.paymentRequestId = ""; });
  $("#scheduledPeriod")?.addEventListener("change", event => { state.scheduledPeriod = event.target.value; state.paymentRequestId = ""; });
  $("#backTime").onclick = () => { state.step = 2; renderCheckout(); };
  $("#confirmTime").onclick = () => {
    if (state.deliveryTiming === "scheduled") {
      const selected = scheduledDateTime();
      if (!selected) return toast(tr("chooseValidTime"));
      if (state.mode === "delivery" && !isWithinDeliveryHours(selected)) return toast(tr("deliveryHoursNotice"));
      if (!isScheduledTimeAllowed(selected)) return toast(tr("chooseTimeAfterMinimum"));
    }
    state.step = 4;
    renderCheckout();
  };
}

function formatDeliveryTime(value) {
  return new Date(value).toLocaleTimeString(state.lang === "ar" ? "ar-KW" : "en-GB", { hour: "numeric", minute: "2-digit" });
}

function formatScheduleDate(value) {
  return new Date(value).toLocaleDateString(state.lang === "ar" ? "ar-KW" : "en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
}

function scheduledWindowSummary(value, mode = state.mode) {
  const end = new Date(value);
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  const label = mode === "pickup" ? tr("scheduledPickupTime") : tr("scheduledDeliveryTime");
  return `${label}: ${formatScheduleDate(end)}، ${tr("betweenTime")} ${formatDeliveryTime(start)} ${tr("andTime")} ${formatDeliveryTime(end)}`;
}

function deliveryTimeSummary(source = state) {
  if (source.mode === "pickup" && source.status === "paid") return tr("pickupContactConfirmation");
  if (source.deliveryTiming === "scheduled" && source.scheduledAt) {
    return scheduledWindowSummary(source.scheduledAt, source.mode);
  }
  if (source.deliveryTiming === "scheduled") {
    const scheduled = scheduledDateTime();
    return scheduled ? scheduledWindowSummary(scheduled, source.mode) : tr("chooseSpecificTime");
  }
  if (source.mode === "pickup" || source.deliveryTiming === "notify") return tr("notifyWhenReady");
  if (source.expectedStart && source.expectedEnd) {
    return `${tr("betweenTime")} ${formatDeliveryTime(source.expectedStart)} ${tr("andTime")} ${formatDeliveryTime(source.expectedEnd)}`;
  }
  return tr("withinTwoHours");
}

function deliveryTimeSummaryLines(source = state) {
  let scheduled = null;
  if (source.deliveryTiming === "scheduled" && source.scheduledAt) scheduled = new Date(source.scheduledAt);
  else if (source.deliveryTiming === "scheduled") scheduled = scheduledDateTime();
  if (!scheduled || Number.isNaN(scheduled.getTime())) return [deliveryTimeSummary(source)];
  const start = new Date(scheduled.getTime() - 60 * 60 * 1000);
  const label = source.mode === "pickup" ? tr("scheduledPickupTime") : tr("scheduledDeliveryTime");
  return [
    `${label}:`,
    `${formatScheduleDate(scheduled)}،`,
    `${tr("betweenTime")} ${formatDeliveryTime(start)} ${tr("andTime")} ${formatDeliveryTime(scheduled)}`
  ];
}

function deliveryTimeSummaryMarkup(source = state) {
  return deliveryTimeSummaryLines(source).map(line => `<span>${escapeHtml(line)}</span>`).join("");
}

function renderConfirmation() {
  const appleSafari = isIphoneSafari();
  if (!appleSafari) state.paymentMethod = "knet";
  const paymentMark = method => method === "applepay"
    ? `<span class="apple-pay-mark" aria-label="Apple Pay"> Pay</span>`
    : `<span class="knet-mark"><img src="knet-logo.png" alt="KNET"></span>`;
  const paymentChoices = appleSafari ? `<div class="payment-method-choices" role="radiogroup" aria-label="${tr("choosePaymentMethod")}">
    <button type="button" class="payment-choice ${state.paymentMethod === "applepay" ? "selected" : ""}" data-payment-method="applepay" role="radio" aria-checked="${state.paymentMethod === "applepay"}"><span class="payment-radio"></span>${paymentMark("applepay")}<strong>${tr("applePay")}</strong></button>
    <button type="button" class="payment-choice ${state.paymentMethod === "knet" ? "selected" : ""}" data-payment-method="knet" role="radio" aria-checked="${state.paymentMethod === "knet"}"><span class="payment-radio"></span>${paymentMark("knet")}<strong>${tr("knet")}</strong></button>
  </div>` : "";
  $("#checkoutTitle").textContent = tr("confirmPay");
  $("#checkoutBody").innerHTML = `
    <section class="confirmation-card">
      <div class="confirmation-heading"><span class="detail-title-icon">${accountIcons.info}</span><div><small>${tr("customer")}</small><b>${tr("deliveryDetails")}</b></div></div>
      <div class="customer-summary">
        <div class="summary-box"><span class="summary-icon">${accountIcons.info}</span><span><small>${tr("customerName")}</small><strong>${escapeHtml(state.user.name)}</strong></span></div>
        <div class="summary-box"><span class="summary-icon">${accountIcons.phone}</span><span><small>${tr("phone")}</small><strong class="phone">${escapeHtml(state.user.phone)}</strong></span></div>
        <div class="summary-box"><span class="summary-icon">${accountIcons.address}</span><span><small>${state.mode === "delivery" ? tr("deliveryAddress") : tr("pickupBranch")}</small><strong>${escapeHtml(deliverySummary())}</strong></span></div>
        <div class="summary-box"><span class="summary-icon">${accountIcons.clock}</span><span><small>${state.mode === "pickup" ? tr("pickupTime") : tr("deliveryTime")}</small><strong class="delivery-time-lines">${deliveryTimeSummaryMarkup()}</strong></span></div>
      </div>
      <div class="price-summary">
        <div class="price-summary-head"><span class="detail-title-icon">${accountIcons.box}</span><div><small>${tr("order")}</small><b>${tr("orderNumber")} ${escapeHtml(state.order)}</b></div></div>
        <button class="price-row products-toggle" id="productsToggle"><span><b class="arrow">‹</b> ${tr("productsTotal")}</span><strong>${money(subtotal())}</strong></button>
        <div class="confirmation-products hidden" id="confirmationProducts">${cartItems().map(({ product: item, quantity }) => `
          <div class="confirmation-product"><img src="${escapeHtml(productImages(item)[0] || "logo.png")}" alt=""><span>${escapeHtml(productName(item))} × ${quantity}</span><b>${money(Number(item.price) * quantity)}</b></div>`).join("")}</div>
        <div class="price-row"><span>${tr("deliveryFee")}</span><strong>${money(deliveryFee())}</strong></div>
        <div class="price-row total-row"><span>${tr("total")}</span><strong>${money(total())}</strong></div>
      </div>
      <div class="confirmation-sticky-actions">${paymentChoices}<div class="actions"><button class="secondary" id="back2">${tr("back")}</button><button class="primary pay-now" id="finish" aria-label="${tr("payNow")}">${state.paymentMethod ? paymentMark(state.paymentMethod) : ""}<span>${tr("payNow")}</span></button></div></div>
    </section>`;
  $("#productsToggle").onclick = () => {
    const details = $("#confirmationProducts");
    const open = details.classList.toggle("hidden") === false;
    $("#productsToggle").classList.toggle("open", open);
    $("#productsToggle").setAttribute("aria-label", open ? tr("hideProducts") : tr("showProducts"));
  };
  $("#back2").onclick = () => { state.step = 3; renderCheckout(); };
  $$('[data-payment-method]').forEach(button => button.onclick = () => { state.paymentMethod = button.dataset.paymentMethod; state.paymentRequestId = ""; renderConfirmation(); });
  $("#finish").onclick = beginPayment;
}

function requestId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, "");
  return `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

function isAppleMobileDevice() {
  const userAgent = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isIphoneSafari() {
  const userAgent = navigator.userAgent || "";
  return isAppleMobileDevice() && /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/i.test(userAgent);
}

function beginPayment() {
  return finishOrder();
}

function isAllowedPaymentGatewayUrl(target) {
  if (!(target instanceof URL) || target.protocol !== "https:") return false;
  const host = target.hostname.toLowerCase();
  return host === "kpaytest.com.kw"
    || host.endsWith(".kpaytest.com.kw")
    || host === "kpay.com.kw"
    || host.endsWith(".kpay.com.kw")
    || host === "bede.kw"
    || host.endsWith(".bede.kw")
    || host === "bookeey.com"
    || host.endsWith(".bookeey.com");
}

function paymentPayload(paymentMethod = state.paymentMethod) {
  return {
    idempotencyKey: state.paymentRequestId,
    customer: { name: state.user.name.trim(), phone: normalizePhone(state.user.phone) },
    items: cartItems().map(({ product: item, quantity }) => ({ id: String(item.id), quantity })),
    delivery: { mode: state.mode, areaName: state.area?.name || "", branchId: state.branch || "", address: state.address || "" },
    paymentMethod,
    deliveryTime: {
      type: state.deliveryTiming,
      scheduledAt: state.deliveryTiming === "scheduled" ? scheduledDateTime()?.toISOString() || "" : ""
    }
  };
}

function pendingSnapshot(payment) {
  return {
    ...payment,
    checkout: {
      cart: state.cart, mode: state.mode, areaName: state.area?.name || "", branch: state.branch,
      addressId: state.addressId, address: state.address, name: state.user.name, phone: state.user.phone,
      lang: state.lang, paymentMethod: state.paymentMethod, deliveryTiming: state.deliveryTiming,
      scheduledDate: state.scheduledDate, scheduledHour: state.scheduledHour,
      scheduledMinute: state.scheduledMinute, scheduledPeriod: state.scheduledPeriod
    }
  };
}

function restorePending(pending) {
  const saved = pending.checkout || {};
  state.cart = saved.cart || state.cart;
  state.mode = saved.mode || state.mode;
  state.area = state.areas.find(area => area.name === saved.areaName) || state.area;
  state.branch = saved.branch || state.branch;
  state.addressId = saved.addressId || state.addressId;
  state.address = saved.address || state.address;
  state.name = saved.name || state.name;
  state.phone = saved.phone || state.phone;
  state.paymentMethod = saved.paymentMethod || "knet";
  state.deliveryTiming = saved.deliveryTiming === "scheduled"
    ? "scheduled"
    : saved.deliveryTiming === "notify" ? "notify" : "asap";
  state.scheduledDate = saved.scheduledDate || state.scheduledDate;
  state.scheduledHour = saved.scheduledHour || state.scheduledHour;
  state.scheduledMinute = saved.scheduledMinute || state.scheduledMinute;
  state.scheduledPeriod = saved.scheduledPeriod || state.scheduledPeriod;
  state.order = pending.orderId || state.order;
  if (saved.lang && saved.lang !== state.lang) setLanguage(saved.lang);
  persistCart();
  renderCartBar();
}

async function finishOrder() {
  if (!cartCount()) return paymentError(state.lang === "ar" ? "لا يمكن إنشاء طلب من سلة فارغة" : "Cannot create an order from an empty cart");
  if (!state.user?.name || normalizePhone(state.user.phone).length !== 8) return openAuth("login");
  if (!orderingConfig.paymentWebhookUrl || !orderingConfig.paymentStatusWebhookUrl) return paymentError(tr("paymentUnavailable"));
  if (!state.paymentMethod) return toast(tr("choosePaymentMethod"));
  clearProductRoute();
  if (state.detailProductId) closeProductPage(false);
  state.paymentRequestId = state.paymentRequestId || requestId();
  $("#steps").classList.add("hidden");
  $("#checkoutTitle").textContent = tr("redirecting");
  $("#checkoutBody").innerHTML = `<div class="loading-state"><div class="spinner"></div><h3>${tr("redirecting")}</h3><p>${tr("creatingSecureLink")}</p></div>`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(orderingConfig.paymentWebhookUrl, {
      method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(paymentPayload(state.paymentMethod)), signal: controller.signal, cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || tr("createFailed"));
    const target = new URL(data.paymentUrl);
    if (!isAllowedPaymentGatewayUrl(target)) throw new Error(tr("invalidSecureLink"));
    state.order = data.orderId || state.order;
    const pending = pendingSnapshot({
      orderId: state.order, statusToken: data.statusToken || "", paymentUrl: target.href,
      paymentMethod: state.paymentMethod, paymentGateway: data.paymentGateway || "", createdAt: Date.now()
    });
    sessionStorage.setItem("pendingBedeOrder", JSON.stringify(pending));
    window.location.assign(target.href);
  } catch (error) {
    paymentError(error.name === "AbortError" ? tr("createTimeout") : error.message);
  } finally {
    clearTimeout(timer);
  }
}

function showPaymentWaiting(pending) {
  $("#checkoutTitle").textContent = tr("checkingPayment");
  $("#checkoutBody").innerHTML = `<div class="loading-state"><div class="spinner"></div><h3>${tr("checkingResult")}</h3><p id="paymentStatusText">${tr("autoAccept")}</p><button class="secondary" id="reopenPayment" style="width:min(360px,100%);margin-top:18px">${tr("createNewPaymentLink")}</button></div>`;
  $("#reopenPayment").onclick = createFreshPaymentLink;
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function watchPayment(pending) {
  const version = ++paymentWatchVersion;
  const started = Date.now();
  let errors = 0;
  let firstCheck = true;
  while (version === paymentWatchVersion && Date.now() - started < 30 * 60 * 1000) {
    if (!firstCheck) await delay(5000);
    firstCheck = false;
    try {
      const response = await fetch(orderingConfig.paymentStatusWebhookUrl, {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ orderId: pending.orderId, statusToken: pending.statusToken }), cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Verification failed");
      errors = 0;
      if (data.status === "paid") {
        trackStoreEvent("checkout_complete", { orderId: pending.orderId });
        paymentWatchVersion++;
        sessionStorage.removeItem("pendingBedeOrder");
        history.replaceState({}, "", location.pathname);
        return showSuccess();
      }
      if (data.status === "failed") {
        paymentWatchVersion++;
        sessionStorage.removeItem("pendingBedeOrder");
        history.replaceState({}, "", location.pathname);
        return paymentDeclined();
      }
      if ($("#paymentStatusText")) $("#paymentStatusText").textContent = tr("stillPending");
    } catch {
      errors++;
      if (errors >= 3 && $("#paymentStatusText")) $("#paymentStatusText").textContent = tr("tempCheckError");
    }
  }
  if (version === paymentWatchVersion) paymentPendingTimeout(pending);
}

function paymentDeclined() {
  state.paymentRequestId = "";
  $("#checkoutTitle").textContent = tr("declinedTitle");
  $("#checkoutBody").innerHTML = `<div class="payment-error"><div class="error-mark">×</div><h3>${tr("declinedTitle")}</h3><p>${tr("declinedText")}</p><div class="actions"><button class="secondary" id="declinedBack">${tr("backToPayment")}</button><button class="primary" id="declinedRetry">${tr("retry")}</button></div></div>`;
  $("#declinedBack").onclick = $("#declinedRetry").onclick = () => { state.step = 4; $("#steps").classList.remove("hidden"); renderCheckout(); };
}

function paymentPendingTimeout(pending) {
  $("#checkoutTitle").textContent = tr("unconfirmed");
  $("#checkoutBody").innerHTML = `<div class="payment-error"><div class="error-mark">!</div><h3>${tr("unconfirmed")}</h3><p>${tr("unconfirmedText")}</p><div class="actions"><button class="secondary" id="pendingOpen">${tr("createNewPaymentLink")}</button><button class="primary" id="pendingCheck">${tr("checkAgain")}</button></div></div>`;
  $("#pendingOpen").onclick = createFreshPaymentLink;
  $("#pendingCheck").onclick = () => { showPaymentWaiting(pending); watchPayment(pending); };
}

function createFreshPaymentLink() {
  paymentWatchVersion++;
  sessionStorage.removeItem("pendingBedeOrder");
  state.paymentRequestId = "";
  $("#steps").classList.add("hidden");
  finishOrder();
}

function paymentError(message) {
  $("#steps").classList.remove("hidden");
  state.step = 4;
  setSteps();
  $("#checkoutTitle").textContent = tr("startFailed");
  $("#checkoutBody").innerHTML = `<div class="payment-error"><div class="error-mark">!</div><h3>${tr("linkNotCreated")}</h3><p>${escapeHtml(message || tr("createFailed"))}</p><div class="actions"><button class="secondary" id="paymentBack">${tr("back")}</button><button class="primary" id="paymentRetry">${tr("retry")}</button></div></div>`;
  $("#paymentBack").onclick = () => { state.step = 4; renderCheckout(); };
  $("#paymentRetry").onclick = finishOrder;
}

function paymentReturnResult() {
  const value = new URLSearchParams(location.search).get("payment");
  return value === "success" || value === "failed" ? value : "";
}

function readPendingPayment() {
  const raw = sessionStorage.getItem("pendingBedeOrder");
  if (!raw) return null;
  try {
    const pending = JSON.parse(raw);
    if (!pending.orderId || !pending.statusToken || !pending.paymentUrl) throw new Error("Invalid payment state");
    return pending;
  } catch {
    sessionStorage.removeItem("pendingBedeOrder");
    return null;
  }
}

function showReturnedPaymentFailure(pending) {
  paymentWatchVersion++;
  pendingPaymentResumed = true;
  sessionStorage.removeItem("pendingBedeOrder");
  restorePending(pending);
  $("#checkoutModal").classList.remove("hidden");
  $("#steps").classList.add("hidden");
  history.replaceState({}, "", location.pathname);
  paymentDeclined();
}

function resumePendingPayment() {
  if (pendingPaymentResumed) return;
  pendingPaymentResumed = true;
  const pending = readPendingPayment();
  if (!pending) return;
  if (paymentReturnResult() !== "success") return showReturnedPaymentFailure(pending);
  restorePending(pending);
  $("#checkoutModal").classList.remove("hidden");
  $("#steps").classList.add("hidden");
  showPaymentWaiting(pending);
  watchPayment(pending);
}

function currentInvoiceModel() {
  const approvedAt = Date.now();
  const scheduled = state.deliveryTiming === "scheduled" ? scheduledDateTime() : null;
  const asapWindow = state.mode === "delivery" && state.deliveryTiming === "asap"
    ? asapDeliveryWindow(new Date(approvedAt))
    : null;
  return {
    orderId: state.order, createdAt: approvedAt, customerName: state.user?.name || state.name,
    phone: state.user?.phone || state.phone, mode: state.mode, areaName: state.area?.name || "",
    address: state.address, branchId: state.branch,
    deliveryTiming: state.deliveryTiming,
    scheduledAt: scheduled?.getTime() || null,
    expectedStart: asapWindow?.start.getTime() || null,
    expectedEnd: asapWindow?.end.getTime() || null,
    items: cartItems().map(({ product: item, quantity }) => ({ id: String(item.id), nameAr: item.name, nameEn: item.nameEn || item.name, quantity, unitPrice: Number(item.price), total: Number(item.price) * quantity })),
    subtotal: subtotal(), deliveryFee: deliveryFee(), total: total(), status: "paid"
  };
}

function saveCompletedOrder(order) {
  if (!state.user) return;
  state.user.orders = state.user.orders || [];
  if (!state.user.orders.some(item => item.orderId === order.orderId)) state.user.orders.unshift(order);
  persistUser();
}

function showSuccess() {
  const order = currentInvoiceModel();
  state.lastInvoice = order;
  saveCompletedOrder(order);
  buildInvoice(order);
  $("#checkoutTitle").textContent = tr("received");
  $("#checkoutBody").innerHTML = `<div class="success"><div class="check">✓</div><h3>${tr("received")}</h3><p>${tr("orderNumber")}</p><strong class="order-no">${escapeHtml(state.order)}</strong><div class="success-delivery-time"><small>${order.mode === "pickup" ? tr("pickupStatus") : tr("expectedDeliveryTime")}</small><strong>${escapeHtml(deliveryTimeSummary(order))}</strong></div><div class="actions" style="width:min(420px,100%)"><button class="secondary" id="newOrder">${tr("backStore")}</button><button class="primary" id="orderDetailsButton">${tr("viewOrderDetails")}</button></div></div>`;
  $("#newOrder").onclick = () => {
    state.cart = {};
    persistCart();
    renderCartBar();
    syncAllProductQuantityControls();
    $("#checkoutModal").classList.add("hidden");
  };
  $("#orderDetailsButton").onclick = () => {
    $("#checkoutModal").classList.add("hidden");
    openAccountDrawer("orderDetails", { orderId: order.orderId, fromSuccess: true });
  };
}

function orderItemName(item) {
  return state.lang === "ar" ? (item.nameAr || item.nameEn) : (item.nameEn || item.nameAr);
}

function buildInvoice(order) {
  const pickup = branches.find(branch => branch.id === order.branchId);
  const destination = order.mode === "delivery" ? `${order.areaName || ""} - ${order.address || ""}` : `${tr("pickup")}: ${pickup ? branchField(pickup, "name") : ""}`;
  const locale = state.lang === "ar" ? "ar-KW" : "en-GB";
  const createdAt = new Date(order.createdAt);
  $("#invoice").innerHTML = `
    <div class="invoice-topline"></div>
    <header class="invoice-header">
      <div class="invoice-brand"><img src="logo.png" alt=""><div><h1>مخبز التين والزيتون</h1><p>Figs &amp; Olives Bakery</p></div></div>
      <div class="invoice-title"><span>فاتورة مبيعات / SALES INVOICE</span><strong>#${escapeHtml(order.orderId)}</strong><small>${createdAt.toLocaleDateString(locale)}</small></div>
    </header>
    <div class="invoice-company-box"><b>معلومات الشركة / COMPANY</b><span>شركة صحي ولذيذ للتجهيزات الغذائية<br>Healthy &amp; Delicious Foodstuff Co.</span><span>الكويت، حولي، شارع تونس، مجمع علي فهد الخالد، دور الميزانين<br>Kuwait, Hawalli, Tunis St., Ali Fahad Al-Khaled Complex, Mezzanine</span><strong dir="ltr">66906605 · 22085888</strong></div>
    <section class="invoice-parties">
      <div><span>${tr("customer")}</span><h3>${escapeHtml(order.customerName || tr("customer"))}</h3><p class="invoice-phone">${escapeHtml(order.phone || "")}</p></div>
      <div><span>${order.mode === "delivery" ? tr("deliveryAddress") : tr("pickupBranch")}</span><h3>${escapeHtml(destination)}</h3><p>${escapeHtml(deliveryTimeSummary(order))}</p></div>
      <div class="invoice-payment"><span>${state.lang === "ar" ? "حالة وطريقة الدفع" : "Payment"}</span><h3>${tr("paid")} · ${tr("payOnline")}</h3><p>${createdAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</p></div>
    </section>
    <table class="invoice-items"><thead><tr><th>#</th><th>الصنف / ITEM</th><th>الكمية / QTY</th><th>سعر الوحدة / UNIT PRICE</th><th>الإجمالي / TOTAL</th></tr></thead>
    <tbody>${order.items.map((item, index) => `<tr><td>${index + 1}</td><td><b>${escapeHtml(item.nameAr || item.nameEn || item.id)}</b><small dir="ltr">${escapeHtml(item.nameEn || item.nameAr || item.id)}</small></td><td>${item.quantity}</td><td>${money(item.unitPrice || (item.total / item.quantity))}</td><td><b>${money(item.total)}</b></td></tr>`).join("")}</tbody></table>
    <section class="invoice-bottom">
      <div class="invoice-note"><span>${state.lang === "ar" ? "ملاحظة" : "Note"}</span><p>${tr("healthPhrase")}</p><small>${state.lang === "ar" ? "تم إنشاء هذه الفاتورة إلكترونياً ولا تحتاج إلى توقيع." : "This invoice was generated electronically and requires no signature."}</small></div>
      <div class="invoice-totals"><span>${tr("productsTotal")} <b>${money(order.subtotal)}</b></span><span>${tr("deliveryFee")} <b>${money(order.deliveryFee)}</b></span><strong>${tr("total")} <b>${money(order.total)}</b></strong></div>
    </section>
    <footer><img src="logo.png" alt=""><div><b>${tr("thankYou")}</b><small>${state.lang === "ar" ? "نعتز بخدمتكم ونتمنى لكم صحة دائمة" : "Thank you for choosing a healthier life"}</small></div><span>figsandolives.com</span></footer>`;
  $("#invoice").setAttribute("dir", state.lang === "ar" ? "rtl" : "ltr");
}

async function createInvoiceFile(order) {
  const cacheKey = `${order.orderId}:${state.lang}`;
  if (invoiceFileCache.has(cacheKey)) return invoiceFileCache.get(cacheKey);
  const promise = (async () => {
    buildInvoice(order);
    if (!window.html2canvas || !window.jspdf?.jsPDF) throw new Error("PDF libraries unavailable");
    await document.fonts?.ready;
    const logo = $("#invoice img");
    if (logo?.decode) await logo.decode().catch(() => undefined);
    const canvas = await html2canvas($("#invoice"), { scale: 2, backgroundColor: "#fff", useCORS: true, logging: false });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 190;
    const pageHeight = 277;
    const imageHeight = canvas.height * pageWidth / canvas.width;
    const image = canvas.toDataURL("image/jpeg", .94);
    let remaining = imageHeight;
    let y = 10;
    pdf.addImage(image, "JPEG", 10, y, pageWidth, imageHeight, undefined, "FAST");
    remaining -= pageHeight;
    while (remaining > 0) {
      pdf.addPage();
      y = 10 - (imageHeight - remaining);
      pdf.addImage(image, "JPEG", 10, y, pageWidth, imageHeight, undefined, "FAST");
      remaining -= pageHeight;
    }
    const filename = `invoice-${order.orderId}.pdf`;
    const blob = pdf.output("blob");
    return new File([blob], filename, { type: "application/pdf" });
  })();
  invoiceFileCache.set(cacheKey, promise);
  try {
    return await promise;
  } catch (error) {
    invoiceFileCache.delete(cacheKey);
    throw error;
  }
}

function prepareInvoiceFile(order, button) {
  if (!button) return;
  button.disabled = true;
  button.textContent = tr("preparingInvoiceDownload");
  createInvoiceFile(order).then(() => {
    if (!button.isConnected) return;
    button.disabled = false;
    button.textContent = tr("downloadInvoice");
  }).catch(error => {
    console.error(error);
    if (!button.isConnected) return;
    button.disabled = false;
    button.textContent = tr("downloadInvoice");
  });
}

async function downloadPdf(order = state.lastInvoice || currentInvoiceModel()) {
  try {
    toast(tr("preparingInvoiceDownload"));
    const file = await createInvoiceFile(order);
    if (isAppleMobileDevice() && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: file.name });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  } catch (error) {
    console.error(error);
    toast(tr("invoiceFailed"));
  }
}

$("#languageToggle").onclick = () => setLanguage(state.lang === "ar" ? "en" : "ar");
$("#searchToggle").onclick = event => {
  event.stopPropagation();
  toggleHeaderSearch();
};
$("#searchPopover").onclick = event => event.stopPropagation();
$("#searchInput").oninput = event => {
  state.search = event.target.value;
  renderSearchResults();
};
$("#searchResults").onclick = event => {
  const addButton = event.target.closest("[data-search-add]");
  if (addButton) {
    event.preventDefault();
    event.stopPropagation();
    requestAddToCart(addButton.dataset.searchAdd);
    return;
  }
  const result = event.target.closest("[data-search-product]");
  if (!result) return;
  const id = result.dataset.searchProduct;
  closeHeaderSearch();
  openProductPage(id);
};
document.addEventListener("pointerdown", event => {
  if (!$("#searchPopover").classList.contains("hidden") && !$("#headerSearch").contains(event.target)) {
    event.preventDefault();
    event.stopPropagation();
    closeHeaderSearch();
  }
}, true);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("#searchPopover").classList.contains("hidden")) closeHeaderSearch();
});
$("#accountButton").onclick = () => state.user?.name ? openAccountDrawer() : openAuth("login");
$("#authClose").onclick = closeAuth;
$("#authModal").onclick = event => { if (event.target === $("#authModal")) closeAuth(); };
$("#drawerClose").onclick = () => closeAccountDrawer(true);
$("#drawerBackdrop").onclick = () => closeAccountDrawer(true);
$("#categories").onclick = event => {
  const button = event.target.closest("[data-category-link]");
  if (button) scrollToCategory(button.dataset.categoryLink);
};
function handleProductQuantityEvent(event) {
  const add = event.target.closest("[data-product-add]");
  const plus = event.target.closest("[data-product-plus]");
  const minus = event.target.closest("[data-product-minus]");
  const control = add || plus || minus;
  if (!control) return false;
  event.preventDefault();
  event.stopPropagation();
  if (add) requestAddToCart(add.dataset.productAdd);
  if (plus) changeQuantity(plus.dataset.productPlus, 1);
  if (minus) changeQuantity(minus.dataset.productMinus, -1);
  return true;
}
$("#productSections").onclick = event => {
  if (handleProductQuantityEvent(event)) return;
  const card = event.target.closest("[data-product]");
  if (card) openProductPage(card.dataset.product);
};
$("#productSections").onkeydown = event => {
  if (!["Enter", " "].includes(event.key)) return;
  const card = event.target.closest("[data-product]");
  if (card) { event.preventDefault(); openProductPage(card.dataset.product); }
};
$("#productDetail").onclick = event => {
  if (handleProductQuantityEvent(event)) return;
  const imageButton = event.target.closest("[data-detail-image]");
  if (imageButton) {
    $("#detailMainImage").src = imageButton.dataset.detailImage;
    $$(".product-thumbs button").forEach(button => button.classList.toggle("active", button === imageButton));
  }
};
$("#productBack").onclick = () => closeProductPage();
$("#checkoutBtn").onclick = openCheckout;
$("#cartSummary").onclick = openCheckout;
$("#headerCart").onclick = openCheckout;
$("#closeCheckout").onclick = () => $("#checkoutModal").classList.add("hidden");
$("#checkoutBody").onclick = event => {
  const plus = event.target.closest("[data-plus]");
  const minus = event.target.closest("[data-minus]");
  if (plus) changeQuantity(plus.dataset.plus, 1);
  if (minus) changeQuantity(minus.dataset.minus, -1);
};
window.addEventListener("scroll", () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(updateCategoryFromScroll);
}, { passive: true });
window.addEventListener("hashchange", syncProductRoute);
window.addEventListener("popstate", syncProductRoute);
document.addEventListener("gesturestart", event => event.preventDefault(), { passive: false });

const overlayStateObserver = new MutationObserver(syncPageScrollLock);
["#productPage", "#checkoutModal", "#accountDrawer", "#authModal", "#searchPopover"].forEach(selector => {
  const element = $(selector);
  if (element) overlayStateObserver.observe(element, { attributes: true, attributeFilter: ["class"] });
});
syncPageScrollLock();
document.addEventListener("gesturechange", event => event.preventDefault(), { passive: false });
document.addEventListener("gestureend", event => event.preventDefault(), { passive: false });
document.addEventListener("touchmove", event => { if (event.touches.length > 1) event.preventDefault(); }, { passive: false });
window.addEventListener("pageshow", () => {
  if (paymentReturnResult() === "success") return;
  const pending = readPendingPayment();
  if (pending) showReturnedPaymentFailure(pending);
});

applyLanguage();
if (state.user) {
  state.name = state.user.name;
  state.phone = state.user.phone;
}

function applyCatalog(catalog, cache = true) {
  if (!Array.isArray(catalog?.products) || !Array.isArray(catalog?.categories) || !Array.isArray(catalog?.deliveryAreas)) return false;
  const signature = JSON.stringify([
    catalog.version || "", catalog.updatedAt || "",
    catalog.appearance || {},
    catalog.categories.map(category => [category.id, category.active !== false, category.order, category.nameAr, category.nameEn]),
    catalog.products.map(item => [item.id, item.active !== false, item.category, item.order, item.price, item.name, item.nameEn, item.image]),
    catalog.deliveryAreas.map(area => [area.id, area.nameAr || area.name, area.nameEn, area.price, area.order])
  ]);
  if (signature === catalogSignature) return true;
  catalogSignature = signature;
  const visibleCategories = catalog.categories.filter(category => category.active !== false);
  const visibleCategoryIds = new Set(visibleCategories.map(category => String(category.id)));
  const visibleProducts = catalog.products.filter(item =>
    item.active !== false && visibleCategoryIds.has(String(item.category || ""))
  );
  state.categories = visibleCategories;
  state.products = visibleProducts;
  state.areas = Array.isArray(catalog?.deliveryAreas) ? catalog.deliveryAreas : [];
  if (state.area) {
    const currentAreaName = state.area.name || state.area.nameAr;
    state.area = state.areas.find(area => (area.name || area.nameAr) === currentAreaName) || null;
  }
  applyStoreAppearance(catalog.appearance);
  const visibleProductIds = new Set(visibleProducts.map(item => String(item.id)));
  let removedCartItem = false;
  Object.keys(state.cart).forEach(id => {
    if (visibleProductIds.has(String(id))) return;
    delete state.cart[id];
    removedCartItem = true;
  });
  if (removedCartItem) persistCart();
  if (state.activeCategory !== "all" && !visibleCategoryIds.has(String(state.activeCategory))) state.activeCategory = "all";
  if (cache) {
    try { localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(catalog)); } catch { /* يتوفر products.json كنسخة احتياطية */ }
  }
  renderCategories();
  renderProductSections();
  renderCartBar();
  syncProductRoute();
  return true;
}

async function loadLocalCatalog() {
  const [products, categories, deliveryAreas] = await Promise.all([
    fetch("products.json", { cache: "force-cache" }).then(response => {
      if (!response.ok) throw new Error("products.json");
      return response.json();
    }),
    fetch("categories.json", { cache: "force-cache" }).then(response => {
      if (!response.ok) throw new Error("categories.json");
      return response.json();
    }),
    fetch("delivery-areas.json", { cache: "force-cache" }).then(response => {
      if (!response.ok) throw new Error("delivery-areas.json");
      return response.json();
    })
  ]);
  return { products, categories, deliveryAreas };
}

async function initializeStoreData() {
  const cachedCatalog = readJson(CATALOG_CACHE_KEY, null);
  let hasCatalog = applyCatalog(cachedCatalog, false);
  if (!hasCatalog) {
    const localCatalog = await loadLocalCatalog();
    hasCatalog = applyCatalog(localCatalog);
  }
  if (hasCatalog) resumePendingPayment();
  hydrateUserFromFirebase();
  trackStoreEvent("visit");
  if (firebaseServices) {
    const catalogRef = firebaseServices.database.ref("orderingPlatform/catalog");
    catalogRef.on("value", liveSnapshot => {
      if (!liveSnapshot.exists()) return;
      applyCatalog(liveSnapshot.val());
    }, error => console.error("Firebase catalog listener failed", error));
  }
}

initializeStoreData().catch(error => {
  console.error(error);
  $("#productSections").innerHTML = `<div class="loading">${tr("loadingError")}</div>`;
});
