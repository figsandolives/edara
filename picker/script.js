const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const orderingConfig = window.ORDERING_CONFIG || {};
// وضع الاختيار: المنصة تنفتح داخل الإدارة عشان تختار منها منتجات (للأغلفة).
// كل الأقسام تبين، والضغط على المنتج يحدده بدل ما يفتحه، وما ينرسل شي للسيرفر غير قراءة الكتالوج.
const PICKER_MODE = window.FO_PICKER === true || new URLSearchParams(location.search).has("picker");
if (PICKER_MODE) document.documentElement.classList.add("picker-mode");
const orderingApiBaseUrl = String(orderingConfig.apiBaseUrl || "").replace(/\/+$/, "");
let customerSessionToken = localStorage.getItem("figsOlivesCustomerSession") || "";

function orderingApiUrl(path) {
  if (!orderingApiBaseUrl) throw new Error("خدمة المنصة غير مهيأة");
  return `${orderingApiBaseUrl}${path}`;
}

async function orderingApi(path, options = {}, requireSession = false) {
  const headers = { "Accept": "application/json", ...(options.headers || {}) };
  if (requireSession) {
    if (!customerSessionToken) throw new Error("سجّل دخولك أولاً");
    headers.Authorization = `Bearer ${customerSessionToken}`;
  }
  const response = await fetch(orderingApiUrl(path), { ...options, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || "تعذر الاتصال بخدمة المنصة");
  return data;
}

// نطلب من المتصفح حفظ مساحة الموقع بشكل دائم قدر الإمكان. هذا مهم خصوصاً
// في iPhone/Safari حتى لا تُعامل بيانات تسجيل الدخول كتخزين مؤقت.
async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (navigator.storage.persisted && await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (error) {
    // عدم دعم المتصفح لهذه الميزة لا يعني فشل تسجيل الدخول.
    console.warn("Persistent browser storage is unavailable", error);
    return false;
  }
}

const persistentStorageReady = requestPersistentStorage();

const translations = {
  ar: {
    brand: "مخبز التين والزيتون", tagline: "طبيعي، صحي، مصنوع بحب", yourCart: "سلتك",
    deliveryEverywhere: "توصيل لجميع مناطق الكويت", heroTitle: "أكل صحي بطعم<br>يستحق التكرار",
    heroText: "اختر من منتجاتنا الطبيعية والمخبوزات الطازجة، ونحن نتكفل بالباقي.",
    naturalIngredients: "مكونات طبيعية", dailyPreparation: "تحضير يومي", securePayment: "دفع آمن",
    qualityTitle: "جميع مخبوزاتنا من خبز وفطاير وبسكويت:",
    catalogPromise: "جميع مخبوزاتنا من خبز وفطاير وبسكويت يصنع من القمح الكامل والخميرة الطبيعية، أو الرز وخميرة الرز الطبيعية، أو اللوز وخميرة اللوز الطبيعية، ولا نستخدم الطحين الأبيض أو الزيوت المهدرجة أو الخميرة التجارية.", searchPlaceholder: "ابحث عن منتج…", searchStart: "اكتب اسم المنتج لعرض النتائج",
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
    pickupHoursNotice: "ساعات دوام الفرع الرسمية من الساعة ٨ صباحاً حتى الساعة ١٠:٣٠ مساءً.",
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
    details: "تفاصيل المنتج", addToCart: "إضافة إلى السلة", image: "صورة المنتج", chooseOptions: "اختر الخيارات", optionsRequired: "يرجى اختيار خيار واحد على الأقل", optionOptional: "يمكنك اختيار ما يناسبك", optionSingle: "اختر خياراً واحداً", optionMultiple: "يمكنك اختيار أكثر من خيار",
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
    qualityTitle: "All our bread, fatayer and biscuits are:",
    catalogPromise: "All our bread, fatayer and biscuits are made with whole wheat and natural sourdough, rice and natural rice starter, or almonds and natural almond starter. We never use white flour, hydrogenated oils or commercial yeast.", searchPlaceholder: "Search products…", searchStart: "Type a product name to see results",
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
    pickupHoursNotice: "Official branch hours are from 8:00 AM to 10:30 PM.",
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
    details: "Product details", addToCart: "Add to cart", image: "Product image", chooseOptions: "Choose options", optionsRequired: "Please select at least one option", optionOptional: "You may choose what suits you", optionSingle: "Choose one option", optionMultiple: "You may choose more than one option",
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
  { id: "hawalli", nameAr: "فرع حولي", nameEn: "Hawalli Branch", brandAr: "المطبخ الرئيسي", brandEn: "Main Kitchen", addressAr: "حولي، شارع تونس، مجمع علي فهد الخالد، دور الميزانين", addressEn: "Hawalli, Tunis Street, Ali Fahad Al Khaled Complex, Mezzanine Floor", phone: "66906605 | 22085888" },
  { id: "yarmouk", nameAr: "فرع اليرموك", nameEn: "Yarmouk Branch", brandAr: "مخبز التين والزيتون", brandEn: "Figs & Olives Bakery", addressAr: "اليرموك، قطعة 2، شارع 2", addressEn: "Yarmouk, Block 2, Street 2", phone: "22085889 | 65162277" },
  { id: "abu", nameAr: "فرع أبو الحصانية", nameEn: "Abu Al Hasaniya Branch", brandAr: "مطعم التين الطبيعي", brandEn: "Natural Figs Restaurant", addressAr: "أبو الحصانية، مول 30", addressEn: "Abu Al Hasaniya, The 30 Mall", phone: "22085886 | 99176512" }
];

const PROFILE_KEY = "figsOlivesProfilesV1";
const SESSION_KEY = "figsOlivesSessionV1";
const REMEMBERED_SESSION_COOKIE = "figsOlivesRememberedSession";
const LEGACY_CART_KEY = "figsOlivesCartV1";
const CART_KEY = "figsOlivesCartV2";
const CATALOG_CACHE_KEY = "figsOlivesCatalogV2";
const VISITOR_KEY = "figsOlivesVisitorV1";
const visitorId = localStorage.getItem(VISITOR_KEY) || (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
localStorage.setItem(VISITOR_KEY, visitorId);

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}

function readRememberedSessionPhone() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${REMEMBERED_SESSION_COOKIE}=([^;]*)`));
  return match ? normalizePhone(decodeURIComponent(match[1])) : "";
}

function rememberSession(phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return;
  // نسخة خفيفة من مفتاح الجلسة، لا تحتوي الاسم أو العنوان أو الطلبات.
  document.cookie = `${REMEMBERED_SESSION_COOKIE}=${encodeURIComponent(normalizedPhone)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
}

function forgetRememberedSession() {
  document.cookie = `${REMEMBERED_SESSION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
}

function loadCurrentUser() {
  const session = readJson(SESSION_KEY, null);
  const profiles = readJson(PROFILE_KEY, {});
  const phone = normalizePhone(session?.phone || readRememberedSessionPhone());
  const profile = profiles[phone] || Object.values(profiles).find(item => normalizePhone(item?.phone) === phone);
  if (!phone || !profile) return null;
  return { ...profile };
}

function normalizeLegacyOrder(order) {
  if (!order || typeof order !== "object") return {};
  const orderId = String(order.orderId || order.id || "");
  return {
    ...order,
    orderId,
    items: Array.isArray(order.items) ? order.items : [],
    subtotal: Number(order.subtotal ?? order.total ?? 0),
    deliveryFee: Number(order.deliveryFee || 0),
    total: Number(order.total || 0)
  };
}

// The order tracker and the customer's invoice must always use the same
// completed-order record. Local storage is only a fallback for offline use.
async function canonicalOnlineOrder(order) {
  if (!order?.orderId || !customerSessionToken) return order;
  try {
    const remote = await orderingApi(`/customer/orders/${encodeURIComponent(order.orderId)}`, {}, true);
    if (!remote) return order;
    const merged = { ...order, ...remote, items: Array.isArray(remote.items) ? remote.items : (order.items || []) };
    if (state.user?.orders) {
      state.user.orders = state.user.orders.map(item => item.orderId === merged.orderId ? merged : item);
      persistUser();
    }
    if (state.lastInvoice?.orderId === merged.orderId) state.lastInvoice = merged;
    return merged;
  } catch (error) {
    console.warn("Could not refresh completed order", error);
    return order;
  }
}

async function refreshCustomerOrders() {
  if (!customerSessionToken || !state.user?.phone) return false;
  try {
    const remote = await orderingApi("/customer/orders", {}, true);
    if (!Array.isArray(remote)) return false;
    state.user.orders = remote.map(normalizeLegacyOrder);
    persistUser();
    return true;
  } catch (error) {
    console.warn("Could not refresh customer orders", error);
    return false;
  }
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
  badgeTextColor: "#18352a",
  heroTitle: "",
  heroBadges: []
});
function entryCatalogType() {
  return /^\/rest(?:\/|$)/.test(window.location.pathname) ? "restaurant" : "bakery";
}

const state = {
  products: [], categories: [], headings: [], areas: [], cart: loadUserCart(initialUser), search: "", activeCategory: "all", activeHeadingId: "", activeSubheadingId: "",
  catalogType: entryCatalogType(),
  restaurantEnabled: true,
  lang: localStorage.getItem("storeLanguage") === "en" ? "en" : "ar",
  step: 1, mode: "delivery", area: null, branch: "", addressId: "", address: "",
  name: "", phone: "", order: "", paymentRequestId: "", detailProductId: "",
  paymentMethod: "", deliveryTiming: "asap", scheduledDate: "", scheduledHour: "1",
  scheduledMinute: "00", scheduledPeriod: "pm", user: initialUser, lastInvoice: null,
  appearance: { ...DEFAULT_APPEARANCE },
  advertisement: null,
  productFilters: [],
  activeProductFilterId: ""
};
let directFilterWasApplied = false;
state.tableReservation = readJson("figsOlivesTableReservation", null);
if (state.tableReservation?.active) state.catalogType = "restaurant";
function tableReservationActive() { return Boolean(state.tableReservation?.active); }
function persistTableReservation() { localStorage.setItem("figsOlivesTableReservation", JSON.stringify(state.tableReservation || null)); }
function cancelTableReservation() { state.tableReservation = null; persistTableReservation(); renderProductFilters(); renderCartBar(); }
function formatTableDate(value) {
  const [year, month, day] = String(value || "").split("-");
  return year && month && day ? `${day} / ${month} / ${year}` : "";
}
function showTableConfirmation({ title, message, confirmLabel = "نعم، متابعة", onConfirm, onCancel }) {
  const modal = $("#tableReservationModal"), body = $("#tableReservationBody");
  body.innerHTML = `<section class="table-confirm"><span class="eyebrow">حجز طاولة</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><div class="actions"><button class="secondary" id="cancelTableConfirmation">إلغاء</button><button class="primary" id="confirmTableConfirmation">${escapeHtml(confirmLabel)}</button></div></section>`;
  modal.classList.add("table-confirm-active");
  modal.classList.remove("hidden");
  const close = () => { modal.classList.add("hidden"); modal.classList.remove("table-confirm-active"); };
  $("#cancelTableConfirmation").onclick = () => { close(); onCancel?.(); };
  $("#confirmTableConfirmation").onclick = () => { close(); onConfirm?.(); };
}
function showBakeryCartConfirmation(onConfirm) {
  $("#checkoutModal").classList.add("table-confirm-underlay");
  showTableConfirmation({
    title: "تأكيد المتابعة",
    message: "يوجد أصناف تخص المخبز في سلة. هل تريد حذفها والمتابعة في حجز الطاولة في المطعم؟",
    onCancel: () => $("#checkoutModal").classList.remove("table-confirm-underlay"),
    onConfirm: () => { $("#checkoutModal").classList.remove("table-confirm-underlay"); onConfirm(); }
  });
}
function openTableReservation() {
  // Keep the restaurant control in its reservation state even if the catalogue
  // transition animation has not finished yet.
  renderProductFilters();
  const name = state.user?.name || "الزبون";
  const saved = state.tableReservation || {};
  const initialDate = saved.date || dateInputValue();
  $("#tableReservationBody").innerHTML = `<button class="table-close" id="closeTableReservation">×</button><span class="eyebrow">حجز طاولة</span><h2>أهلاً ${escapeHtml(name)}</h2><label>عدد الأشخاص<input id="tablePeople" inputmode="numeric" maxlength="2" value="" placeholder="اكتب عدد الأشخاص هنا"></label><section class="table-time"><h3>اختر وقت الحجز</h3><div class="time-fields"><label class="time-date"><span>التاريخ</span><span class="table-date-control"><input id="tableDate" type="date" lang="en-GB" min="${dateInputValue()}" value="${escapeHtml(initialDate)}" aria-label="تاريخ الحجز"><output id="tableDateDisplay">${formatTableDate(initialDate)}</output></span></label><p class="table-hours-note">أوقات الحجز من ٨ صباحاً إلى ٩ مساءً</p><label class="time-period">الفترة<select id="tablePeriod"><option value="am" ${saved.period === "am" ? "selected" : ""}>صباحاً</option><option value="pm" ${saved.period !== "am" ? "selected" : ""}>مساءً</option></select></label><label class="time-minute">الدقائق<select id="tableMinute"><option value="00">00</option><option value="30" ${saved.minute === "30" ? "selected" : ""}>30</option></select></label><label class="time-hour">الساعة<select id="tableHour">${Array.from({length:12},(_,i)=>i+1).map(x=>`<option ${String(saved.hour||"1")===String(x)?"selected":""}>${x}</option>`).join("")}</select></label></div></section><button class="primary" id="continueTableReservation">متابعة</button>`;
  $("#tableReservationModal").classList.remove("hidden");
  $("#closeTableReservation").onclick=()=>$("#tableReservationModal").classList.add("hidden");
  $("#tablePeople").oninput=e=>{e.target.value=normalizeEnglishDigits(e.target.value).replace(/\D/g,"");};
  $("#tableDate").onchange = event => { $("#tableDateDisplay").textContent = formatTableDate(event.target.value); };
  $("#continueTableReservation").onclick=()=>{
    const people=$("#tablePeople").value; if(!people || Number(people)<1) return toast("اكتب عدد الأشخاص");
    let reservationHour = Number($("#tableHour").value); if ($("#tablePeriod").value === "pm" && reservationHour !== 12) reservationHour += 12; if ($("#tablePeriod").value === "am" && reservationHour === 12) reservationHour = 0;
    if (reservationHour < 8 || reservationHour > 21 || (reservationHour === 21 && $("#tableMinute").value !== "00")) return toast("الحجز متاح من ٨ صباحاً إلى ٩ مساءً", "error");
    const reservationDate = $("#tableDate").value;
    if (reservationDate < dateInputValue()) return toast("اختر تاريخًا قادمًا للحجز", "error");
    state.tableReservation={active:true,people,date:reservationDate,period:$("#tablePeriod").value,hour:$("#tableHour").value,minute:$("#tableMinute").value}; persistTableReservation();
    $("#tableReservationModal").classList.add("hidden"); renderProductFilters();
    $("#checkoutModal").classList.remove("hidden"); $("#checkoutModal").dataset.tableFlow="choice"; $("#steps").classList.add("hidden"); $("#checkoutTitle").textContent="حجز طاولة"; $("#closeCheckout").textContent="رجوع"; $("#closeCheckout").classList.add("table-back-button"); $("#closeCheckout").setAttribute("aria-label","رجوع إلى بيانات الحجز");
    $("#checkoutBody").innerHTML=`<section class="table-next"><span class="eyebrow">حجز طاولة</span><h2>يرجى اختيار الأصناف التي تريدها على طاولتك</h2><p>يمكنك إضافة الأصناف ثم الضغط على «إتمام الحجز».</p><button class="primary" id="browseTableProducts">تصفح المنتجات</button></section>`;
    $("#browseTableProducts").onclick=()=>{const proceed=()=>{$("#checkoutModal").classList.add("hidden");delete $("#checkoutModal").dataset.tableFlow;$("#closeCheckout").textContent="×";$("#closeCheckout").classList.remove("table-back-button");if(state.catalogType!=="restaurant")setCatalogType("restaurant");};const bakery=cartItems().some(({product})=>catalogTypeOf(product)==="bakery");if(!bakery)return proceed();showBakeryCartConfirmation(()=>{state.cart=Object.fromEntries(Object.entries(state.cart).filter(([key])=>catalogTypeOf(product(key.split("::")[0]))!=="bakery"));persistCart();renderCartBar();proceed();});};
  };
}

let imageObserver;
let scrollFrame;
let pendingScrollCategoryId = "";
let pendingScrollUntil = 0;
let toastTimer;
let paymentWatchVersion = 0;
let resendTimer;
let pendingCartProductId = "";
let pendingCartAnchor = null;
let pendingOptionProductId = "";
let pendingOptionAnchor = null;
let productOptionsPopover = null;
let pendingPrimaryOption = null;
let pendingSecondaryOption = null;
let pendingGeneralOptionSelections = [];
let pendingGeneralOptionQuantities = {};
let pendingSelectionFlow = null;
let pendingFlowSelections = {};
let pendingFlowStep = 0;
let authMode = "login";
let authPhone = "";
let accountReturnToCheckout = false;
let catalogScrollPosition = 0;
let userSyncTimer;
let pendingPaymentResumed = false;
let catalogSignature = "";
let shownAdvertisementKey = "";
let restaurantProductImages = {};
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
    // نسخة التجارب المحلية: صورة الواجهة ملف محلي (http://localhost).
    const candidate = new URL(String(value.heroImage || ""), window.LOCAL_MODE ? location.href : undefined);
    if (candidate.protocol === "https:" || (window.LOCAL_MODE && candidate.origin === location.origin)) heroImage = candidate.href;
  } catch {
    heroImage = "";
  }
  return {
    heroImage,
    heroPositionX: validPercent(value.heroPositionX, DEFAULT_APPEARANCE.heroPositionX),
    heroPositionY: validPercent(value.heroPositionY, DEFAULT_APPEARANCE.heroPositionY),
    heroTextColor: validHexColor(value.heroTextColor, DEFAULT_APPEARANCE.heroTextColor),
    badgeBackgroundColor: validHexColor(value.badgeBackgroundColor, DEFAULT_APPEARANCE.badgeBackgroundColor),
    badgeTextColor: validHexColor(value.badgeTextColor, DEFAULT_APPEARANCE.badgeTextColor),
    heroTitle: String(value.heroTitle || "").trim().slice(0, 120),
    heroBadges: Array.isArray(value.heroBadges) ? value.heroBadges.map(text => String(text || "").trim().slice(0, 45)) : []
  };
}

function appearanceForCatalog(value, catalogType = state.catalogType) {
  return normalizeAppearance(value?.catalogs?.[catalogType] || value);
}

function applyStoreAppearance(value) {
  state.catalogAppearance = value || {};
  state.appearance = appearanceForCatalog(state.catalogAppearance);
  const storeName = $("#brandName");
  if (storeName) storeName.textContent = state.lang === "ar"
    ? (state.catalogType === "restaurant" ? "مطعم التين الطبيعي" : "مخبز التين والزيتون")
    : (state.catalogType === "restaurant" ? "Natural Figs Restaurant" : "Figs & Olives Bakery");
  // نسخة التجارب: انشالت صورة الواجهة العلوية والفلتر اللي فيها.
  const hero = $("#storeHero");
  const heroImage = $("#storeHeroImage");
  if (!hero || !heroImage) return;
  hero.style.setProperty("--hero-title-color", state.appearance.heroTextColor);
  hero.style.setProperty("--hero-badge-background", state.appearance.badgeBackgroundColor);
  hero.style.setProperty("--hero-badge-text", state.appearance.badgeTextColor);
  hero.style.setProperty("--hero-position-x", `${state.appearance.heroPositionX}%`);
  hero.style.setProperty("--hero-position-y", `${state.appearance.heroPositionY}%`);
  hero.classList.toggle("has-hero-image", Boolean(state.appearance.heroImage));
  heroImage.style.backgroundImage = state.appearance.heroImage
    ? `url(${JSON.stringify(state.appearance.heroImage)})`
    : "";
}

function normalizeAdvertisement(value = {}) {
  return { enabled: value?.enabled === true, image: String(value?.image || "").trim(), size: ["square", "portrait", "landscape"].includes(value?.size) ? value.size : "square", targetType: value?.targetType === "link" ? "link" : "product", productId: String(value?.productId || ""), link: String(value?.link || "").trim() };
}

function showAdvertisement(value) {
  if (PICKER_MODE) return;
  const ad = normalizeAdvertisement(value);
  const key = JSON.stringify(ad);
  if (!ad.enabled || !ad.image || shownAdvertisementKey === key) return;
  shownAdvertisementKey = key;
  const modal = $("#advertisementModal"); const card = $("#promotionFrame"); const image = $("#advertisementImageDisplay"); const target = $("#advertisementTarget");
  const href = ad.targetType === "product" ? `#product=${encodeURIComponent(ad.productId)}` : ad.link;
  card.className = `promotion-frame size-${ad.size}`;
  // حماية إضافية من أي قاعدة CSS عامة قد تخفي محتوى النافذة على سطح المكتب.
  card.style.setProperty("display", "block", "important");
  card.style.setProperty("visibility", "visible", "important");
  card.style.setProperty("opacity", "1", "important");
  image.style.setProperty("display", "block", "important");
  image.style.setProperty("visibility", "visible", "important");
  image.src = ad.image; target.href = href || "#";
  modal.classList.remove("hidden"); modal.setAttribute("aria-hidden", "false");
}

// The selected catalogue comes from the entry URL and never touches the user's
// saved cart.
function resetCatalogToEntry() {
  state.catalogType = entryCatalogType();
  state.activeCategory = "all";
  applyStoreAppearance(state.catalogAppearance);
}

function applyRestaurantProductImages(items) {
  return items.map(item => {
    const importedImage = restaurantProductImages[String(item.id || "")];
    const currentImage = String(item.image || "");
    return catalogTypeOf(item) === "restaurant" && importedImage && (!currentImage || currentImage === "logo.png")
      ? { ...item, image: importedImage, images: [importedImage] }
      : item;
  });
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

function catalogTypeOf(entry) {
  return entry?.catalogType === "restaurant" ? "restaurant" : "bakery";
}

// Bakery and restaurant categories are shown together on one page. The
// restaurant ones are hidden only when the admin turns restaurant items off.
function isCurrentCatalog(entry) {
  return state.restaurantEnabled || catalogTypeOf(entry) !== "restaurant";
}

function productName(product) {
  return state.lang === "ar" ? product.name : (product.nameEn || product.name);
}

function productDescription(product) {
  return state.lang === "ar" ? (product.description || product.descriptionEn || "") : (product.descriptionEn || product.description || "");
}
function productBadge(product) {
  const filter = activeProductFilter();
  if (filter && !activeFilteredCover() && filter.products.some(entry => String(entry.productId) === String(product.id))) return state.lang === "ar" ? filter.nameAr : (filter.nameEn || filter.nameAr);
  return state.lang === "ar" ? (product.badgeAr || product.badgeEn || "") : (product.badgeEn || product.badgeAr || "");
}

function productImages(product) {
  return (Array.isArray(product.images) ? product.images : [product.image]).filter(Boolean);
}

// Card-sized copy of a catalog photo served by the platform (about 85% lighter).
// The product page keeps the full photo; a missing copy falls back to it.
function thumbnailUrl(url) {
  // نسخة التجارب المحلية: الصورة الصغيرة من local-data/thumbs.
  if (/^local-data\/assets\//.test(String(url || ""))) return String(url).replace(/^local-data\/assets\//, "local-data/thumbs/");
  return String(url || "").replace(/^(https:\/\/162-35-27-249\.sslip\.io)\/platform-assets\/(orderingPlatform\/catalog\/[^?#]+\.(?:webp|jpe?g|png))$/i, "$1/platform-thumbs/$2");
}

function branchField(branch, field) {
  return branch[`${field}${state.lang === "ar" ? "Ar" : "En"}`] || branch[`${field}Ar`];
}

function money(value) {
  return state.lang === "ar" ? `${Number(value).toFixed(3)} د.ك` : `${Number(value).toFixed(3)} KWD`;
}

const minimumOrderUnitLabels = {
  dozen: { ar: "درزن", en: "dozen" }, piece: { ar: "حبة", en: "piece" }, bowl: { ar: "ماعون", en: "bowl" },
  bag: { ar: "كيس", en: "bag" }, kilo: { ar: "كيلو", en: "kilo" }, bottle: { ar: "بطل", en: "bottle" }
};
function minimumOrderConfig(value) {
  if (!value || value.enabled === false) return null;
  const quantity = Math.max(1, Math.min(99, Math.floor(Number(value.quantity) || 1)));
  const unit = minimumOrderUnitLabels[value.unit] ? value.unit : "piece";
  return { quantity, unit };
}
function minimumOrderText(value) {
  const minimum = minimumOrderConfig(value);
  if (!minimum) return "";
  const amount = new Intl.NumberFormat(state.lang === "ar" ? "ar-KW" : "en").format(minimum.quantity);
  return state.lang === "ar" ? `أقل كمية للطلب هي ${amount} ${minimumOrderUnitLabels[minimum.unit].ar}` : `Minimum order: ${amount} ${minimumOrderUnitLabels[minimum.unit].en}`;
}

function product(id) {
  return state.products.find(item => String(item.id) === String(id));
}

function productOptions(item) {
  const config = item?.options;
  if (!config || config.enabled === false || !Array.isArray(config.items)) return null;
  const items = config.items.filter(option => option && (option.nameAr || option.nameEn)).map(option => ({
    id: String(option.id || option.nameAr || option.nameEn), nameAr: String(option.nameAr || option.nameEn || ""), nameEn: String(option.nameEn || option.nameAr || ""), price: Math.max(0, Number(option.price) || 0), preparation: option.preparation || null, image: String(option.image || ""), minimumOrder: minimumOrderConfig(option.minimumOrder),
    subOptions: (Array.isArray(option.subOptions) ? option.subOptions : []).filter(subOption => subOption && (subOption.nameAr || subOption.nameEn)).map(subOption => ({
      id: String(subOption.id || subOption.nameAr || subOption.nameEn), nameAr: String(subOption.nameAr || subOption.nameEn || ""), nameEn: String(subOption.nameEn || subOption.nameAr || ""), price: Math.max(0, Number(subOption.price) || 0),
      subOptions: (Array.isArray(subOption.subOptions) ? subOption.subOptions : []).filter(thirdOption => thirdOption && (thirdOption.nameAr || thirdOption.nameEn)).map(thirdOption => ({
        id: String(thirdOption.id || thirdOption.nameAr || thirdOption.nameEn), nameAr: String(thirdOption.nameAr || thirdOption.nameEn || ""), nameEn: String(thirdOption.nameEn || thirdOption.nameAr || ""), price: Math.max(0, Number(thirdOption.price) || 0)
      }))
    }))
  }));
  const nestedEnabled = config.nestedEnabled === true;
  const thirdLevelEnabled = nestedEnabled && config.thirdLevelEnabled === true;
  const stages = thirdLevelEnabled ? 3 : nestedEnabled ? 2 : 1;
  const multiple = config.multiple === true;
  return items.length ? { required: nestedEnabled || config.required === true, multiple, multipleStep: Math.min(stages, Math.max(1, Number(config.multipleStep) || 1)), maxSelections: multiple ? Math.max(1, Math.min(99, Number(config.maxSelections) || items.length)) : 1, titleAr: String(config.titleAr || ""), titleEn: String(config.titleEn || ""), priceBased: nestedEnabled || config.priceBased === true, nestedEnabled, thirdLevelEnabled, minimumPerOptionEnabled: config.minimumPerOptionEnabled === true, optionQuantityEnabled: config.optionQuantityEnabled === true, quantityStep: Math.min(stages, Math.max(1, Number(config.quantityStep) || 1)), items } : null;
}

const STUFFED_BREAD_SELECTION_FLOW = Object.freeze({
  enabled: true,
  steps: [
    {
      id: "dough", titleAr: "اختر نوع العجينة", titleEn: "Choose dough type", required: true, multiple: false,
      items: [
        { id: "dough-wheat", nameAr: "بالقمح الكامل والخميرة الطبيعية", nameEn: "Whole wheat & natural sourdough", price: 0 },
        { id: "dough-rice", nameAr: "بالرز الأبيض الخالي من الجلوتين", nameEn: "White rice - gluten free", price: 1 },
        { id: "dough-almond", nameAr: "بطحين اللوز لنظام الكيتو", nameEn: "Almond flour - Keto", price: 1 },
        { id: "dough-barley", nameAr: "بالشعير الكامل والخميرة الطبيعية", nameEn: "Whole barley & natural sourdough", price: 1, preparation: { first: 1, unit: "day", hasSecond: true, second: 2, secondUnit: "day" } }
      ]
    },
    {
      id: "size", titleAr: "اختر الحجم والكمية", titleEn: "Choose size & quantity", required: true, multiple: false, quantityEnabled: true,
      items: [
        { id: "regular12", nameAr: "صغير عادي (١٢ خبزة = ٢٤ قطعة)", nameEn: "Small regular (12 breads = 24 pieces)", pieces: 24, price: 8 },
        { id: "mini12", nameAr: "حجم ميني (١٢ خبزة)", nameEn: "Mini size (12 breads)", pieces: 12, price: 6 },
        { id: "bite12", nameAr: "حجم لقمة (١٢ خبزة)", nameEn: "Bite size (12 breads)", pieces: 12, price: 4 }
      ]
    },
    {
      id: "fillings", titleAr: "اختر الحشوات", titleEn: "Choose fillings", required: true, multiple: true, quantityEnabled: true,
      distributeQuantity: true, limitFrom: "size",
      items: [
        ["eggplant", "باذنجان", "Eggplant"],
        ["indian-chilli-potatoes", "بطاط هندية حارة", "Indian chilli potatoes"],
        ["potatoes-carrots", "بطاط وجزر وبازلاء", "Potatoes, carrots & peas"],
        ["sprouted-fava-beans", "فول مبرعم", "Sprouted fava beans"],
        ["spinach", "سبانخ", "Spinach"],
        ["mushroom", "مشروم", "Mushroom"],
        ["yellow-squash", "قرع أصفر", "Yellow squash"],
        ["sprouted-falafel", "فلافل مبرعمة", "Sprouted falafel"],
        ["fermented-muhammara", "محمرة مخمرة", "Fermented muhammara"],
        ["purslane", "بربير", "Purslane"],
        ["organic-plain-eggs", "بيض عضوي سادة", "Organic plain eggs"],
        ["organic-eggs-cheese", "بيض عضوي مع الجبن", "Organic eggs with cheese"],
        ["organic-eggs-spinach", "بيض عضوي مع السبانخ", "Organic eggs with spinach"]
      ].map(([id, nameAr, nameEn]) => ({ id, nameAr, nameEn, price: 0 }))
    }
  ]
});

function isFatayerSelectionProduct(item) {
  const label = `${item?.name || ""} ${item?.nameEn || ""}`;
  return /فطاير|فطائر|fatayer/i.test(label);
}

// حشوات الفطاير معرفة برمجياً. ننسخ الحشوة الغنية الموجودة حتى ترث سعرها
// وقواعدها، ولا نُعدّل البيانات الأصلية القادمة من الكتالوج.
function applyFatayerFillingRules(flow) {
  if (!flow?.enabled || !Array.isArray(flow.steps)) return flow;
  return {
    ...flow,
    steps: flow.steps.map(step => {
      const stepLabel = `${step?.id || ""} ${step?.titleAr || ""} ${step?.titleEn || ""}`;
      if (!/fillings|حشوات/i.test(stepLabel)) return step;
      const items = (Array.isArray(step.items) ? step.items : []).filter(option => {
        const optionLabel = `${option?.id || ""} ${option?.nameAr || ""} ${option?.nameEn || ""}`;
        return !/mushroom|مشروم/i.test(optionLabel);
      });
      const richTemplate = items.find(option => /غنية|rich/i.test(`${option?.groupAr || ""} ${option?.groupEn || ""} ${option?.priceGroup || ""}`));
      return {
        ...step,
        items: [...items, ...[
          { id: "akkawi-cheese-paprika", nameAr: "جبن عكاوي بالبابريكا", nameEn: "Akkawi cheese with paprika" },
          { id: "cheddar-cheese", nameAr: "جبن الشيدر", nameEn: "Cheddar cheese" }
        ].filter(extra => !items.some(option => String(option?.id) === extra.id || `${option?.nameAr || ""} ${option?.nameEn || ""}`.toLowerCase() === `${extra.nameAr} ${extra.nameEn}`.toLowerCase())).map(extra => ({
          ...(richTemplate ? { ...richTemplate } : { price: 0, groupAr: "الحشوات الغنية", groupEn: "Rich fillings" }), ...extra
        }))]
      };
    })
  };
}

function productSelectionFlow(item) {
  // هذا المنتج يُعرّف تسلسله في الكود تماماً كالفطاير، ولا يعتمد على خيارات لوحة الإدارة العامة.
  const sourceFlow = String(item?.id) === "9227" ? STUFFED_BREAD_SELECTION_FLOW : item?.options?.selectionFlow;
  const flow = isFatayerSelectionProduct(item) ? applyFatayerFillingRules(sourceFlow) : sourceFlow;
  if (!flow?.enabled || !Array.isArray(flow.steps) || !flow.steps.length) return null;
  const steps = flow.steps.map((step, index) => ({
    id: String(step.id || `step-${index + 1}`),
    titleAr: String(step.titleAr || ""), titleEn: String(step.titleEn || ""),
    required: step.required !== false,
    multiple: step.multiple === true,
    maxSelections: Math.max(1, Number(step.maxSelections) || 1),
    limitFrom: String(step.limitFrom || ""), quantityEnabled: step.quantityEnabled === true,
    items: (Array.isArray(step.items) ? step.items : []).filter(option => option && (option.nameAr || option.nameEn)).map(option => ({
      id: String(option.id || option.nameAr || option.nameEn),
      nameAr: String(option.nameAr || option.nameEn || ""), nameEn: String(option.nameEn || option.nameAr || ""),
      price: Math.max(0, Number(option.price) || 0),
      preparation: option.preparation || null,
      priceGroup: String(option.priceGroup || ""),
      // بعض الحشوات تغيّر سعر الحجم المختار كاملاً، بدلاً من إضافة مبلغ ثابت.
      basePriceOverrideBySize: option.basePriceOverrideBySize && typeof option.basePriceOverrideBySize === "object" ? option.basePriceOverrideBySize : null,
      groupAr: String(option.groupAr || ""),
      groupEn: String(option.groupEn || ""),
      maxFillingSelections: option.maxFillingSelections ?? null,
      pieces: Math.max(1, Number(option.pieces) || 1),
      quantity: Math.max(1, Number(option.quantity) || 1)
    })),
    distributeQuantity: step.distributeQuantity === true
  })).filter(step => step.items.length);
  return steps.length ? { steps } : null;
}

function optionName(option) {
  return state.lang === "ar" ? option.nameAr : (option.nameEn || option.nameAr);
}

function optionSummary(option) {
  const name = optionName(option);
  return option?.showQuantity || option?.isFilling || option?.flowStepId === "fillings"
    ? `${new Intl.NumberFormat(state.lang === "ar" ? "ar-KW" : "en").format(Math.max(1, Number(option.quantity) || 1))} ${name}`
    : name;
}

// الخيار الإلزامي الواحد يعرّف الصنف نفسه (مثل: كيكة بالشوكولاتة)،
// أما الإضافات الاختيارية أو المتعددة فتبقى كسطر تفاصيل منفصل.
function optionBelongsInName(item, option) {
  if (option?.nameSuffix) return true;
  const flowStep = productSelectionFlow(item)?.steps.find(step => step.id === option?.flowStepId);
  if (flowStep) return flowStep.required && !flowStep.multiple;
  const config = productOptions(item);
  return Boolean(config?.required && !config.multiple);
}

function cartDisplayName(item, options = [], language = state.lang) {
  const base = language === "ar" ? item.name : (item.nameEn || item.name);
  const suffixes = (options || [])
    .filter(option => optionBelongsInName(item, option))
    .map(option => language === "ar" ? option.nameAr : (option.nameEn || option.nameAr))
    .filter(Boolean);
  return [base, ...suffixes].filter(Boolean).join(" ");
}

function cartDetailOptions(item, options = []) {
  const config = productOptions(item);
  return (options || []).filter(option => !optionBelongsInName(item, option)).map(option => ({
    ...option,
    showQuantity: option.showQuantity || config?.optionQuantityEnabled === true
  }));
}

function unitPrice(item, selectedOptions = []) {
  const config = productOptions(item);
  if (!config?.priceBased && !productSelectionFlow(item)) return Math.max(0, Number(item?.price) || 0);
  const isSelectionFlow = Boolean(productSelectionFlow(item));
  const groupedPrices = new Map();
  const selectedSize = selectedOptions.find(option => option?.flowStepId === "size");
  const baseOverrides = selectedOptions
    .map(option => Number(option?.basePriceOverrideBySize?.[selectedSize?.id]))
    .filter(Number.isFinite);
  const price = selectedOptions.reduce((sum, option) => {
    const price = Math.max(0, Number(option.price) || 0);
    if (!option.priceGroup) return sum + price * (isSelectionFlow ? 1 : Math.max(1, Number(option.quantity) || 1));
    groupedPrices.set(option.priceGroup, Math.max(groupedPrices.get(option.priceGroup) || 0, price));
    return sum;
  }, 0) + [...groupedPrices.values()].reduce((sum, price) => sum + price, 0);
  // عند اختيار أي حشوة غنية، يستبدل سعر الحجم بسعر الفطاير الغنية نفسه.
  return baseOverrides.length
    ? price + Math.max(...baseOverrides) - Math.max(0, Number(selectedSize?.price) || 0)
    : price;
}

function selectedFlowQuantity(flow, selections) {
  const quantityStep = flow?.steps.find(step => step.quantityEnabled);
  const selected = quantityStep ? (selections?.[quantityStep.id] || [])[0] : null;
  return Math.max(1, Number(selected?.quantity) || 1);
}

// في الحجم الوسط والكبير تكون كل كمية حبة مستقلة. نفصل الحشوات إلى أسطر
// مستقلة قبل حفظها في السلة، حتى لا تنتقل تكلفة حشوة واحدة إلى كل الحبات.
// أما أحجام الدزن فتظل سطراً واحداً لأن الحشوة تخص المجموعة كاملة.
function fatayerPieceOptionSets(item, selectedOptions = [], quantity = 1) {
  if (!isFatayerSelectionProduct(item)) return null;
  const options = Array.isArray(selectedOptions) ? selectedOptions : [];
  const selectedSize = options.find(option => option?.flowStepId === "size");
  if (!selectedSize || Number(selectedSize.pieces) !== 1) return null;
  const fillings = options.filter(option => option?.isFilling || option?.flowStepId === "fillings");
  const fillingCount = fillings.reduce((sum, option) => sum + Math.max(1, Number(option.quantity) || 1), 0);
  const requestedQuantity = Math.max(1, Number(quantity) || 1);
  if (!fillings.length || fillingCount !== requestedQuantity) return null;

  const sharedOptions = options.filter(option => !(option?.isFilling || option?.flowStepId === "fillings"));
  const onePieceSharedOptions = sharedOptions.map(option => (
    option?.flowStepId === "size" ? { ...option, quantity: 1 } : { ...option }
  ));
  return fillings.flatMap(filling => Array.from(
    { length: Math.max(1, Number(filling.quantity) || 1) },
    () => [...onePieceSharedOptions.map(option => ({ ...option })), { ...filling, quantity: 1 }]
  ));
}

function selectionFlowTotal(item, selectedOptions = [], quantity = 1) {
  const pieceOptionSets = fatayerPieceOptionSets(item, selectedOptions, quantity);
  if (pieceOptionSets) return pieceOptionSets.reduce((sum, options) => sum + unitPrice(item, options), 0);
  return unitPrice(item, selectedOptions) * Math.max(1, Number(quantity) || 1);
}

function productPriceLabel(item) {
  const config = productOptions(item);
  if (!config?.priceBased && !productSelectionFlow(item)) return money(item.price);
  return state.lang === "ar" ? "السعر عند الاختيار" : "Price on selection";
}

function productPriceMarkup(item) {
  const current = productPriceLabel(item);
  const original = Number(item?.originalPrice || 0);
  if (original > Number(item?.price || 0) && !productOptions(item)?.priceBased && !productSelectionFlow(item)) {
    return `<span class="sale-price"><del>${money(original)}</del><b>${current}</b></span>`;
  }
  return `<span>${current}</span>`;
}

function productIsSoldOut(item) {
  return item?.inventory?.enabled === true && Number(item.inventory.quantity || 0) <= 0;
}

function preparationLabel(item) {
  const prep = item?.preparation || item || {};
  const number = value => state.lang === "ar" ? new Intl.NumberFormat("ar-KW").format(value) : String(value);
  const time = (value, kind) => {
    if (state.lang === "ar") {
      if (kind === "day") return value === 1 ? "يوم" : value === 2 ? "يومين" : `${number(value)} أيام`;
      return value === 1 ? "ساعة" : value === 2 ? "ساعتين" : `${number(value)} ساعات`;
    }
    return `${number(value)} ${kind === "day" ? (value === 1 ? "day" : "days") : (value === 1 ? "hour" : "hours")}`;
  };
  const first = Math.max(1, Number(prep.first) || 2);
  const single = time(first, prep.unit);
  if (!prep.hasSecond || !Number(prep.second)) return state.lang === "ar" ? `خلال ${single}` : `Within ${single}`;
  const second = Math.max(1, Number(prep.second));
  const secondLabel = time(second, prep.secondUnit || prep.unit);
  return state.lang === "ar" ? `خلال ${single} أو ${secondLabel}` : `Within ${single} or ${secondLabel}`;
}

function preparationTakesMoreThanTwoHours(preparation) {
  if (!preparation) return false;
  const toHours = (value, unit) => Math.max(1, Number(value) || 0) * (unit === "day" ? 24 : 1);
  const first = toHours(preparation.first, preparation.unit);
  const second = preparation.hasSecond && Number(preparation.second)
    ? toHours(preparation.second, preparation.secondUnit || preparation.unit)
    : 0;
  return Math.max(first, second) > 2;
}

function cartHasLongPreparationItems() {
  return cartItems().some(({ product: item, options }) => {
    const selectedOptionPreparations = options.map(option => option.preparation).filter(Boolean);
    return selectedOptionPreparations.length
      ? selectedOptionPreparations.some(preparationTakesMoreThanTwoHours)
      : preparationTakesMoreThanTwoHours(item.preparation);
  });
}

function orderHasLongPreparationItems(order) {
  return (order?.items || []).some(item => {
    const selectedOptionPreparations = (item.options || []).map(option => option.preparation).filter(Boolean);
    if (selectedOptionPreparations.length) return selectedOptionPreparations.some(preparationTakesMoreThanTwoHours);
    const catalogProduct = product(item.id);
    return preparationTakesMoreThanTwoHours(item.preparation || catalogProduct?.preparation);
  });
}

function invoicePreparationNotice(order) {
  if (!orderHasLongPreparationItems(order)) return "";
  return `<p class="a4-preparation-notice">ملاحظة: يوجد في طلبك أصناف تأخذ وقت للتجهيز.. لذا يرجى العلم أنه قد يتأخر طلبك أو يتم تأجيله.</p>`;
}

function cartItems() {
  return Object.entries(state.cart).map(([cartKey, value]) => {
    const entry = typeof value === "object" && value ? value : { quantity: value };
    const productId = String(entry.productId || cartKey.split("::")[0]);
    return { cartKey, product: product(productId), quantity: Number(entry.quantity), note: String(entry.note || "").slice(0, 240), options: Array.isArray(entry.options) ? entry.options : [] };
  }).filter(item => item.product && item.quantity > 0);
}

function cartItemMissingRequiredChoice(entry) {
  const options = Array.isArray(entry?.options) ? entry.options : [];
  const flow = productSelectionFlow(entry?.product);
  if (flow) return flow.steps.some(step => !(options || []).some(option => option?.flowStepId === step.id));
  const config = productOptions(entry?.product);
  return Boolean(config?.required && !options.length);
}

// لا يكفي وجود أسماء الحشوات في السلة: يجب أن يساوي مجموع كمياتها عدد
// الحبات الذي اختاره العميل في مرحلة الحجم. هذا يمنع وصول سلة غير صحيحة
// إلى بوابة الدفع ويعرض السبب بوضوح قبل إنشاء رابط الدفع.
function cartItemFillingIssue(entry) {
  const item = entry?.product;
  const flow = productSelectionFlow(item);
  const options = Array.isArray(entry?.options) ? entry.options : [];
  if (!flow) return null;
  for (const step of flow.steps) {
    if (!step.distributeQuantity || !step.limitFrom) continue;
    const size = options.find(option => option?.flowStepId === step.limitFrom);
    const required = Math.max(1, Number(size?.pieces) || 1) * Math.max(1, Number(size?.quantity) || 1);
    const selected = options.filter(option => option?.flowStepId === step.id);
    const selectedQuantity = flowSelectedQuantity(selected);
    if (selectedQuantity !== required) return { product: item, selectedQuantity, required };
  }
  return null;
}

function cartItemMinimumIssue(entry) {
  const productMinimum = minimumOrderConfig(entry?.product?.minimumOrder);
  if (productMinimum && Number(entry.quantity) < productMinimum.quantity) return { product: entry.product, minimum: productMinimum };
  const config = productOptions(entry?.product);
  if (config?.minimumPerOptionEnabled) {
    const selected = Array.isArray(entry?.options) ? entry.options : [];
    const invalid = selected.find(option => {
      const minimum = minimumOrderConfig(option.minimumOrder);
      return minimum && Number(option.quantity || 1) < minimum.quantity;
    });
    if (invalid) return { product: entry.product, option: invalid, minimum: minimumOrderConfig(invalid.minimumOrder) };
  }
  return null;
}

function resolveMissingCartChoice(entry) {
  if (!entry?.product) return;
  // هذه سلة محفوظة من نسخة سابقة قبل اختيار المنتج؛ نحذف السطر غير المكتمل
  // ثم نفتح الاختيارات مباشرة حتى لا يصل العميل إلى صفحة فشل الدفع.
  delete state.cart[entry.cartKey];
  state.paymentRequestId = "";
  persistCart();
  renderCartBar();
  syncProductQuantityControls(entry.product.id);
  if (productSelectionFlow(entry.product)) openSelectionFlow(entry.product.id);
  else openProductOptions(entry.product.id);
  toast(state.lang === "ar" ? "يرجى اختيار تفاصيل المنتج ثم إكمال الدفع" : "Choose the product details, then complete payment", "error");
}
function cartQuantity(id) {
  const productId = String(id);
  return Object.entries(state.cart).reduce((sum, [cartKey, value]) => {
    const entry = typeof value === "object" && value ? value : { quantity: value };
    const entryProductId = String(entry.productId || cartKey.split("::")[0]);
    return entryProductId === productId ? sum + Math.max(0, Number(entry.quantity) || 0) : sum;
  }, 0);
}

function optionSelectionSignature(options = []) {
  return (Array.isArray(options) ? options : []).map(option => ({
    id: String(option?.id || ""),
    quantity: Math.max(1, Number(option?.quantity) || 1),
    flowStepId: String(option?.flowStepId || "")
  })).sort((a, b) => `${a.flowStepId}:${a.id}`.localeCompare(`${b.flowStepId}:${b.id}`)).map(option => `${option.flowStepId}:${option.id}:${option.quantity}`).join("|");
}

function cartLineKey(productId, options = []) {
  const signature = optionSelectionSignature(options);
  if (!signature) return String(productId);
  let hash = 2166136261;
  for (const character of signature) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `${productId}::${(hash >>> 0).toString(36)}`;
}

function cartPieceLineKey(productId, options = []) {
  const base = cartLineKey(productId, options);
  let key;
  do {
    key = `${base}::piece-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  } while (state.cart[key]);
  return key;
}

function cartCount() {
  return cartItems().reduce((sum, item) => sum + item.quantity, 0);
}

function subtotal() {
  return cartItems().reduce((sum, item) => sum + selectionFlowTotal(item.product, item.options, item.quantity), 0);
}

function deliveryFee() {
  return state.mode === "delivery" && state.area ? Number(state.area.price) : 0;
}

function total() {
  return subtotal() + deliveryFee();
}

function toast(message, variant = "") {
  const element = $("#toast");
  element.textContent = message;
  element.classList.toggle("error", variant === "error");
  element.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.add("hidden"), 2200);
}

// Bumped on every cart change made on this page, so a slower server copy of
// the cart never replaces something the customer just added.
let cartRevision = 0;

function persistCart() {
  cartRevision += 1;
  if (!state.user?.phone) return;
  localStorage.setItem(cartStorageKey(state.user.phone), JSON.stringify(state.cart));
  queueUserSync();
}

function reportVisitorPresence() {
  if (PICKER_MODE) return;
  const endpoint = orderingConfig.visitorPresenceWebhookUrl;
  if (!endpoint) return;
  fetch(orderingApiUrl(endpoint), {
    method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ visitorId, visitorType: state.user?.phone ? "registered" : "new", customer: state.user?.phone ? { name: state.user.name, phone: state.user.phone } : null }),
    cache: "no-store", keepalive: true
  }).catch(() => undefined);
}

function trackStoreEvent(type, details = {}) {
  if (PICKER_MODE) return;
  const endpoint = orderingConfig.analyticsWebhookUrl;
  if (!endpoint) return;
  const onceKey = `figsOlivesEvent:${type}:${new Date().toISOString().slice(0, 10)}`;
  if (type === "visit" && sessionStorage.getItem(onceKey)) return;
  if (type === "visit") sessionStorage.setItem(onceKey, "1");
  fetch(orderingApiUrl(endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ type, visitorId, customer: state.user?.name ? { name: state.user.name, phone: state.user.phone } : null, details }),
    cache: "no-store"
  }).catch(() => undefined);
}

function analyticsCartSnapshot() {
  return {
    cartItems: cartItems().map(({ product: item, quantity, options }) => ({
      // التقارير الإدارية تعتمد الاسم العربي دائماً، بغض النظر عن لغة العميل.
      id: String(item.id), name: String(item.name || item.nameAr || item.nameEn || ""), quantity,
      total: Number(selectionFlowTotal(item, options, quantity).toFixed(3))
    })),
    cartValue: Number(subtotal().toFixed(3))
  };
}

function queueUserSync() {
  clearTimeout(userSyncTimer);
  userSyncTimer = setTimeout(() => {
    syncUserToServer().catch(error => console.error("Server profile sync failed", error));
  }, 500);
}

function persistUser() {
  if (!state.user?.phone) return;
  const profiles = readJson(PROFILE_KEY, {});
  profiles[state.user.phone] = { ...state.user };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  localStorage.setItem(SESSION_KEY, JSON.stringify({ phone: state.user.phone }));
  rememberSession(state.user.phone);
  requestPersistentStorage();
  state.name = state.user.name;
  state.phone = state.user.phone;
  updateAccountButton();
  queueUserSync();
}

function saveCustomerSession(authResult, phone) {
  const token = String(authResult?.sessionToken || "");
  if (!token || normalizePhone(phone).length !== 8) throw new Error(tr("accountSyncFailed"));
  customerSessionToken = token;
  localStorage.setItem("figsOlivesCustomerSession", token);
}

async function syncUserToServer() {
  if (!customerSessionToken || !state.user?.phone || !state.user?.name) return;
  await orderingApi("/customer/profile", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: String(state.user.name).slice(0, 80), addresses: Array.isArray(state.user.addresses) ? state.user.addresses : [], cart: state.cart && typeof state.cart === "object" ? state.cart : {} })
  }, true);
}

async function hydrateUserFromServer() {
  if (!customerSessionToken || !state.user?.phone) return;
  try {
    const remote = await orderingApi("/customer/profile", {}, true);
    if (!remote || normalizePhone(remote.phone) !== normalizePhone(state.user.phone)) {
      await syncUserToServer();
      return;
    }
    state.user = {
      ...state.user,
      ...remote,
      phone: normalizePhone(remote.phone),
      addresses: Array.isArray(remote.addresses) ? remote.addresses : [],
      orders: Array.isArray(state.user.orders) ? state.user.orders : []
    };
    if (cartRevision) queueUserSync();
    else if (remote.cart && typeof remote.cart === "object") {
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
    await refreshCustomerOrders();
  } catch (error) {
    console.error("Server profile load failed", error);
  }
}

async function restoreSavedCustomerSession() {
  if (state.user?.phone || !customerSessionToken) return;
  try {
    await persistentStorageReady;
    const profile = await orderingApi("/customer/profile", {}, true);
    if (!profile || normalizePhone(profile.phone).length !== 8 || !String(profile.name || "").trim()) return;
    state.user = {
      ...profile,
      phone: normalizePhone(profile.phone),
      name: String(profile.name).trim(),
      addresses: Array.isArray(profile.addresses) ? profile.addresses : [],
      orders: Array.isArray(profile.orders) ? profile.orders : []
    };
    state.cart = profile.cart && typeof profile.cart === "object" ? profile.cart : loadUserCart(state.user);
    localStorage.setItem(cartStorageKey(state.user.phone), JSON.stringify(state.cart));
    persistUser();
    updateAccountButton();
    renderCartBar();
    syncAllProductQuantityControls();
    await refreshCustomerOrders();
    reportVisitorPresence();
  } catch (error) {
    customerSessionToken = "";
    localStorage.removeItem("figsOlivesCustomerSession");
    console.warn("Saved customer session could not be restored", error);
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
  renderQualityStrip();
  applyStoreAppearance(state.catalogAppearance);
  renderCatalogSwitch();
  renderProductFilters();
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
  renderProductFilters();
  renderProductSections();
  renderSearchResults();
  renderCartBar();
  if (!$("#checkoutModal").classList.contains("hidden")) renderCheckout();
  if (!$("#accountDrawer").classList.contains("hidden")) renderAccountHome();
  if (state.detailProductId) renderProductDetail(state.detailProductId);
}

function sortedCategories() {
  return state.categories.filter(isCurrentCatalog).slice().sort((a, b) => Number(a.order) - Number(b.order));
}

// Category IDs may be numeric in records imported from the previous platform and
// strings in newer ones.  Compare their canonical value so a filtered product
// can never be matched to a different section because of an ID type mismatch.
function sameCatalogId(first, second) {
  return String(first ?? "") === String(second ?? "");
}

function categoryProducts(categoryId) {
  const list = state.products.filter(item => sameCatalogId(item.category, categoryId) && isCurrentCatalog(item) && productMatchesActiveFilter(item)).sort((a, b) => Number(a.order) - Number(b.order));
  // A filtered cover keeps its own product order inside each section.
  const order = activeFilteredCover()?.productOrder?.[String(categoryId)];
  if (!Array.isArray(order) || !order.length) return list;
  const rank = id => { const index = order.indexOf(String(id)); return index < 0 ? Infinity : index; };
  return list.slice().sort((a, b) => rank(a.id) - rank(b.id));
}

// نسخة التجارب: الفلتر صار داخل «الغلاف المفلتر». الغلاف المفتوح يشتغل كفلتر:
// يعرض منتجاته بس، وبالخيارات اللي انحددت له.
function activeFilteredCover() { const cover = typeof activeCover === "function" ? activeCover() : null; return cover?.filtered ? cover : null; }
function activeProductFilter() {
  const cover = activeFilteredCover();
  return cover ? { id: `cover:${cover.id}`, nameAr: cover.nameAr, nameEn: cover.nameEn, products: cover.products } : null;
}
// Sections in the order the page shows them: a filtered cover has its own order.
function viewCategories() {
  const list = sortedCategories();
  const order = activeFilteredCover()?.sectionOrder;
  if (!Array.isArray(order) || !order.length) return list;
  const rank = category => { const index = order.indexOf(String(category.id)); return index < 0 ? Infinity : index; };
  return list.slice().sort((a, b) => rank(a) - rank(b));
}
function directProductFilterId() {
  const value = String(new URLSearchParams(location.search).get("filter") || "").trim();
  if (value === "al-tayyibat-diet") return "filter-mt8zswyi";
  return value;
}
function productMatchesActiveFilter(item) { const filter = activeProductFilter(); return !filter || filter.products.some(entry => String(entry.productId) === String(item.id)); }
function filterOptionIds(productId, stepId) {
  const entry = activeProductFilter()?.products.find(item => String(item.productId) === String(productId));
  if (!entry) return null;
  const step = entry.steps?.find(value => String(value.stepId) === String(stepId));
  if (step) return step.optionIds || [];
  return entry.firstStepId === stepId ? entry.optionIds || [] : null;
}
function filterLabel(filter) { return state.lang === "ar" ? filter.nameAr : (filter.nameEn || filter.nameAr); }
function renderProductFilters() {
  const menu = $("#productFilterMenu"), toggle = $("#productFilterToggle"), clear = $("#productFilterClear");
  if (!menu || !toggle || !clear) return;
  const filter = activeProductFilter();
  const restaurantTable = state.catalogType === "restaurant";
  toggle.classList.toggle("table-reservation-trigger", restaurantTable);
  toggle.querySelector("b").textContent = restaurantTable ? "احجز طاولتك" : (filter ? filterLabel(filter) : (state.lang === "ar" ? "فلترة المنتجات" : "Filter products"));
  toggle.querySelector("span").textContent = restaurantTable ? "⌂" : "⌘";
  toggle.querySelector("i").textContent = restaurantTable ? "" : "⌄";
  clear.classList.toggle("hidden", restaurantTable ? !tableReservationActive() : !filter);
  clear.textContent = restaurantTable ? "إلغاء الحجز" : (state.lang === "ar" ? "حذف الفلتر" : "Clear filter");
  if (restaurantTable) { menu.classList.add("hidden"); menu.innerHTML = ""; return; }
  menu.innerHTML = state.productFilters.filter(entry => entry.products.some(product => state.products.some(item => String(item.id) === String(product.productId) && isCurrentCatalog(item)))).map(entry => `<button type="button" data-product-filter="${escapeHtml(entry.id)}" class="${entry.id === state.activeProductFilterId ? "active" : ""}">${escapeHtml(filterLabel(entry))}<small>${entry.products.length}</small></button>`).join("") || `<span>${state.lang === "ar" ? "لا توجد فلاتر متاحة" : "No filters available"}</span>`;
}

function cartHasRestaurantItems() {
  return cartItems().some(({ product }) => catalogTypeOf(product) === "restaurant");
}

function setCatalogType(type) {
  const next = type === "restaurant" ? "restaurant" : "bakery";
  if (next === state.catalogType) return;
  if (next === "bakery" && tableReservationActive()) {
    showTableConfirmation({
      title: "إلغاء حجز الطاولة",
      message: "هل تريد إلغاء حجز الطاولة؟",
      confirmLabel: "نعم، إلغاء الحجز",
      onConfirm: () => { cancelTableReservation(); setCatalogType(next); }
    });
    return;
  }
  state.catalogType = next;
  applyStoreAppearance(state.catalogAppearance);
  renderProductFilters();
  state.activeCategory = "all";
  state.activeHeadingId = "";
  state.activeSubheadingId = "";
  const restaurant = next === "restaurant";
  $("#catalogTransitionTitle").textContent = state.lang === "ar"
    ? (restaurant ? "جاري الانتقال إلى أصناف المطعم" : "جاري الانتقال إلى أصناف المخبز")
    : (restaurant ? "Moving to restaurant items" : "Moving to bakery items");
  $("#catalogTransitionHint").textContent = state.lang === "ar" ? "لحظة من فضلك" : "One moment please";
  $("#catalogTransition").classList.remove("hidden");
  window.setTimeout(() => {
    $("#catalogTransition").classList.add("hidden");
    renderCatalogSwitch();
    renderCategories();
    renderProductSections();
    // Each catalogue has its own banner, so return to the top to show it.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 1000);
}

function renderCatalogSwitch() {
  // The bakery/restaurant switch was removed: both catalogues share one page.
  const button = $("#catalogSwitch");
  if (!button) return;
  if (!state.restaurantEnabled && state.catalogType === "bakery") { button.classList.add("hidden"); return; }
  button.classList.remove("hidden");
  const nextRestaurant = state.catalogType !== "restaurant";
  const label = state.lang === "ar" ? (nextRestaurant ? "أصناف المطعم" : "أصناف المخبز") : (nextRestaurant ? "Restaurant items" : "Bakery items");
  const icon = nextRestaurant
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 3v6.2a3.2 3.2 0 0 0 6.4 0V3M7.6 3v5.2M9.8 3v5.2M8.7 12.4V21M17.2 3v18M17.2 3c2.3 1.5 2.3 6.3 0 7.8h-2.1"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5h17M5.5 20.5v-8.2a6.5 6.5 0 0 1 13 0v8.2M8 20.5v-5.2a4 4 0 0 1 8 0v5.2M9 9.7h6M12 5.7c.9 1.1 1.4 2 1.4 2.8a1.4 1.4 0 1 1-2.8 0c0-.8.5-1.7 1.4-2.8Z"/></svg>`;
  button.innerHTML = `<span class="catalog-switch-icon">${icon}</span><span>${label}</span><i>‹</i>`;
  button.dataset.catalogTarget = nextRestaurant ? "restaurant" : "bakery";
}

function renderCategories() {
  const buttons = [];
  const filteringProducts = Boolean(activeProductFilter());
  // A filter is a product filter, not a category reorganisation tool.  While
  // it is active we intentionally show the original categories as a flat list
  // and do not use manually-linked heading groups (which can link a category
  // to a different heading in the administration panel).
  const linkedCategoryIds = filteringProducts ? new Set() : new Set((state.headings || []).filter(item => isCurrentCatalog(item)).flatMap(item => [...(item.categoryIds || []), ...(item.subheadings || []).flatMap(group => group.categoryIds || [])].map(String)));
  let entries = [
    ...(filteringProducts ? [] : (state.headings || []).filter(item => isCurrentCatalog(item) && entryVisibleHere("heading", item.id)).map(item => ({ type: "heading", item }))),
    ...viewCategories().filter(category => !linkedCategoryIds.has(String(category.id)) && categoryProducts(category.id).length && entryVisibleHere("category", category.id)).map(item => ({ type: "category", item }))
  ];
  if (!activeFilteredCover()) entries.sort((a, b) => Number(a.item.order) - Number(b.item.order) || (a.type === "heading" ? -1 : 1));
  if (activeCover() && !filteringProducts) {
    // Inside a cover a heading loses its own title: its subheadings (or, without
    // subheadings, its categories) sit directly in the section bar.
    const withProducts = ids => (ids || []).map(id => state.categories.find(category => sameCatalogId(category.id, id))).filter(category => category && categoryProducts(category.id).length);
    entries = entries.flatMap(entry => {
      if (entry.type !== "heading") return [entry];
      const subheadings = Array.isArray(entry.item.subheadings) ? entry.item.subheadings : [];
      if (!subheadings.length) return withProducts(entry.item.categoryIds).map(item => ({ type: "category", item }));
      return subheadings.filter(group => withProducts(group.categoryIds).length).map(group => ({ type: "subheading", item: { ...group, subheadings: [], headingId: entry.item.id } }));
    });
  }
  $("#categories").classList.toggle("hidden", !entries.length);
  entries.forEach(({ type, item }) => {
    if (type === "subheading") { buttons.push(`<button class="cover-sub-link ${state.activeHeadingId === item.headingId && state.activeSubheadingId === item.id ? "active" : ""}" data-cover-sub="${escapeHtml(item.headingId)}|${escapeHtml(item.id)}">${escapeHtml(state.lang === "ar" ? item.nameAr : (item.nameEn || item.nameAr))}</button>`); return; }
    if (type === "heading") buttons.push(`<button class="heading-category-link ${state.activeHeadingId === item.id ? "active" : ""}" data-heading-link="${escapeHtml(item.id)}">${escapeHtml(state.lang === "ar" ? item.nameAr : (item.nameEn || item.nameAr))}</button>`);
    else buttons.push(`<button class="${state.activeCategory === item.id ? "active" : ""}" data-category-link="${escapeHtml(item.id)}">${escapeHtml(categoryName(item))} <small>${categoryProducts(item.id).length}</small></button>`);
  });
  const menuLabel = state.lang === "ar" ? "كل الأقسام" : "All categories";
  const menuOpen = !$("#categoryMenu")?.classList.contains("hidden");
  const coverBarBack = activeCover() ? `<button type="button" class="cover-bar-back" data-cover-back aria-label="${state.lang === "ar" ? "رجوع" : "Back"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg><span>${state.lang === "ar" ? "رجوع" : "Back"}</span></button>` : "";
  $("#categories").innerHTML = coverBarBack + `<button type="button" class="category-menu-toggle" id="categoryMenuToggle" aria-label="${menuLabel}" aria-haspopup="true" aria-controls="categoryMenu" aria-expanded="${menuOpen}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg></button>` + buttons.join("");
  renderCategoryMenu(entries);
  updateHeadingNavigation();
  syncHeadingNavigationOffset();
}

// Drop-down list of every category, so the customer can jump straight to one
// instead of scrolling the horizontal bar.
function renderCategoryMenu(entries) {
  const menu = $("#categoryMenu");
  if (!menu) return;
  const label = entry => escapeHtml(state.lang === "ar" ? entry.nameAr : (entry.nameEn || entry.nameAr));
  const categoriesOf = ids => (ids || []).map(id => state.categories.find(category => sameCatalogId(category.id, id))).filter(category => category && categoryProducts(category.id).length);
  const item = category => `<button type="button" role="menuitem" class="category-menu-item ${sameCatalogId(category.id, state.activeCategory) ? "active" : ""}" data-menu-category="${escapeHtml(category.id)}"><span>${escapeHtml(categoryName(category))}</span><small>${categoryProducts(category.id).length}</small></button>`;
  const arrow = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>`;
  // A collapsible group: an arrow that turns down when opened to show what is inside.
  const group = (title, inner, ids, level) => `<div class="category-menu-group level-${level}" data-menu-ids="${escapeHtml(ids.map(String).join(","))}"><button type="button" class="category-menu-group-toggle" data-menu-group-toggle aria-expanded="false"><i>${arrow}</i><span>${title}</span></button><div class="category-menu-children">${inner}</div></div>`;
  menu.innerHTML = entries.map(({ type, item: entry }) => {
    if (type === "category") return item(entry);
    const subheadings = (entry.subheadings || []).map(sub => ({ sub, categories: categoriesOf(sub.categoryIds) })).filter(({ categories }) => categories.length);
    const direct = categoriesOf(entry.categoryIds);
    const allIds = [...direct, ...subheadings.flatMap(({ categories }) => categories)].map(category => category.id);
    if (!allIds.length) return "";
    const inner = direct.map(item).join("") + subheadings.map(({ sub, categories }) => group(label(sub), categories.map(item).join(""), categories.map(category => category.id), 2)).join("");
    return group(label(entry), inner, allIds, 1);
  }).join("");
}

function positionCategoryMenu() {
  const menu = $("#categoryMenu"), bar = $("#categories");
  if (!menu || !bar) return;
  const top = Math.max(0, Math.ceil(bar.getBoundingClientRect().bottom));
  menu.style.top = `${top}px`;
  menu.style.maxHeight = `${Math.max(180, window.innerHeight - top - 110)}px`;
}

function setCategoryMenuGroup(groupElement, open) {
  groupElement.classList.toggle("open", open);
  groupElement.querySelector(":scope > [data-menu-group-toggle]")?.setAttribute("aria-expanded", String(open));
}

function toggleCategoryMenu(open) {
  const menu = $("#categoryMenu");
  if (!menu) return;
  const show = open ?? menu.classList.contains("hidden");
  if (show) {
    menu.querySelectorAll("[data-menu-category]").forEach(button => button.classList.toggle("active", sameCatalogId(button.dataset.menuCategory, state.activeCategory)));
    // Open only the groups that lead to the category being viewed now.
    menu.querySelectorAll(".category-menu-group").forEach(groupElement => setCategoryMenuGroup(groupElement, groupElement.dataset.menuIds.split(",").some(id => sameCatalogId(id, state.activeCategory))));
    positionCategoryMenu();
  }
  menu.classList.toggle("hidden", !show);
  $("#categoryMenuToggle")?.setAttribute("aria-expanded", String(show));
  $("#categoryMenuToggle")?.classList.toggle("open", show);
  if (show) menu.querySelector(".active")?.scrollIntoView({ block: "nearest" });
}

function currentHeading() {
  if (activeProductFilter()) return null;
  return (state.headings || []).find(item => item.id === state.activeHeadingId && isCurrentCatalog(item));
}

function linkedGroupForCategory(heading, categoryId) {
  if (!heading) return null;
  const subheadings = Array.isArray(heading.subheadings) ? heading.subheadings : [];
  if (subheadings.length) return subheadings.find(group => (group.categoryIds || []).some(id => sameCatalogId(id, categoryId))) || null;
  return (heading.categoryIds || []).some(id => sameCatalogId(id, categoryId)) ? { id: "", categoryIds: heading.categoryIds || [] } : null;
}

function updateHeadingNavigation() {
  const host = $("#headingNavigation"), subheadingRow = $("#subheadingNavigation"), categoryRow = $("#linkedCategoryNavigation"), heading = currentHeading();
  if (!host || !subheadingRow || !categoryRow) return;
  if (!heading) { host.classList.add("hidden"); return; }
  const subheadings = Array.isArray(heading.subheadings) ? heading.subheadings : [];
  const group = subheadings.length ? (subheadings.find(item => item.id === state.activeSubheadingId) || subheadings.find(item => (item.categoryIds || []).some(id => sameCatalogId(id, state.activeCategory))) || subheadings[0]) : { id: "", categoryIds: heading.categoryIds || [] };
  state.activeSubheadingId = group?.id || "";
  // In a cover the subheadings already sit in the main bar; a heading without
  // subheadings has its categories there too, so only the category row remains.
  if (activeCover() && !subheadings.length) { host.classList.add("hidden"); syncHeadingNavigationOffset(); return; }
  host.classList.remove("hidden");
  subheadingRow.classList.toggle("hidden", !subheadings.length || Boolean(activeCover()));
  subheadingRow.innerHTML = subheadings.map(item => `<button class="${item.id === state.activeSubheadingId ? "active" : ""}" data-heading-nav="${escapeHtml(heading.id)}" data-subheading-nav="${escapeHtml(item.id)}">${escapeHtml(state.lang === "ar" ? item.nameAr : (item.nameEn || item.nameAr))}</button>`).join("");
  const categories = (group?.categoryIds || []).map(id => state.categories.find(item => sameCatalogId(item.id, id))).filter(Boolean);
  categoryRow.classList.toggle("hidden", !categories.length);
  categoryRow.innerHTML = categories.map(category => `<button class="${category.id === state.activeCategory ? "active" : ""}" data-linked-nav="${escapeHtml(category.id)}">${escapeHtml(categoryName(category))}</button>`).join("");
  subheadingRow.querySelector(".active")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  categoryRow.querySelector(".active")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  syncHeadingNavigationOffset();
}

function syncHeadingNavigationOffset() {
  const categories = $("#categories");
  const navigation = $("#headingNavigation");
  if (!categories || !navigation) return;
  const bottom = Math.ceil(categories.getBoundingClientRect().bottom);
  document.documentElement.style.setProperty("--categories-height", `${Math.ceil(categories.offsetHeight)}px`);
  navigation.style.top = `${Math.max(0, bottom)}px`;
}

function productQuantityControl(id, quantity, detail = false) {
  const escapedId = escapeHtml(id);
  const item = product(id);
  if ((item?.availability?.status && item.availability.status !== "available") || productIsSoldOut(item)) {
    return `<button class="${detail ? "primary detail-add" : "product-add"} unavailable-add" data-availability-notify="${escapedId}">أبلغني عندما يتوفر</button>`;
  }
  // Products with choices are separate configurations, not one quantity line.
  // Keep "Select" visible even after one configuration was added so the
  // customer can add the same product again with different choices.
  const hasOptions = Boolean(productOptions(item) || productSelectionFlow(item));
  if (hasOptions) {
    return `<button class="${detail ? "primary detail-add" : "product-add"}" data-product-add="${escapedId}">${state.lang === "ar" ? "اختيار" : "Select"}</button>`;
  }
  if (!quantity) {
    return `<button class="${detail ? "primary detail-add" : "product-add"}" data-product-add="${escapedId}">${detail ? tr("addToCart") : tr("add")}</button>`;
  }
  return `<div class="product-qty ${detail ? "detail-product-qty" : ""}" aria-label="${escapeHtml(item ? productName(item) : "")}">
    <button type="button" data-product-plus="${escapedId}" aria-label="+">+</button>
    <strong>${quantity}</strong>
    <button type="button" data-product-minus="${escapedId}" aria-label="${quantity === 1 ? "×" : "−"}">${quantity === 1 ? "×" : "−"}</button>
  </div>`;
}

function productCard(item, category) {
  const source = productImages(item)[0] || "logo.png";
  const quantity = cartQuantity(item.id);
  const badge = productBadge(item);
  const optionConfig = productOptions(item);
  const hasOptionPreparation = optionConfig?.items.some(option => option.preparation);
  const availability = productIsSoldOut(item) ? "sold_out" : (item.availability?.status || "available");
  const availabilityText = availability === "sold_out" ? "نفذت الكمية" : availability === "unavailable" ? "غير متوفر" : "";
  return `
    <article class="product-card ${availabilityText ? "unavailable" : ""}" data-product="${escapeHtml(item.id)}" tabindex="0">
      <div class="product-image">
        <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-src="${escapeHtml(thumbnailUrl(source))}" data-full="${escapeHtml(source)}" width="640" height="580" alt="${escapeHtml(productName(item))}" decoding="async" fetchpriority="low">
        ${badge ? `<span class="product-feature-badge">${escapeHtml(badge)}</span>` : ""}
        ${availabilityText ? `<b class="availability-overlay">${availabilityText}</b>` : ""}
        <b class="in-cart ${quantity ? "" : "hidden"}" data-cart-badge="${escapeHtml(item.id)}">${quantity ? `${tr("inCart")} × ${quantity}` : ""}</b>
      </div>
      <div class="product-info">
        ${availabilityText ? "" : (minimumOrderConfig(item.minimumOrder) ? `<div class="minimum-order-badge">${escapeHtml(minimumOrderText(item.minimumOrder))}</div>` : "")}
        ${availabilityText || hasOptionPreparation ? "" : `<span class="preparation-badge" aria-label="${escapeHtml(preparationLabel(item))}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>${escapeHtml(preparationLabel(item))}</span>`}
        <h3>${escapeHtml(productName(item))}</h3>
        <p>${escapeHtml(productDescription(item) || item.nameEn || item.name)}</p>
        <div class="product-foot"><strong>${productPriceMarkup(item)}</strong><div class="product-quantity-slot" data-product-quantity="${escapeHtml(item.id)}">${productQuantityControl(item.id, quantity)}</div></div>
      </div>
    </article>`;
}

// نسخة التجارب: شريط الجودة المتحرك وأغلفة «عوالم» المتجر.
const QUALITY_POINTS = {
  ar: ["من القمح الكامل والنخالة", "بالخميرة الطبيعية", "من الرز وخميرة الرز الطبيعية", "من اللوز وخميرة اللوز الطبيعية", "خالية من الطحين الأبيض", "خالية من الزيوت المهدرجة", "خالية من الخميرة التجارية"],
  en: ["Whole wheat with the bran", "Naturally leavened", "Rice with natural rice starter", "Almond with natural almond starter", "Free of white flour", "Free of hydrogenated oils", "Free of commercial yeast"]
};
const QUALITY_SEAL = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="seal" d="M12 1.8l2.3 1.7 2.8-.3 1.1 2.6 2.6 1.1-.3 2.8 1.7 2.3-1.7 2.3.3 2.8-2.6 1.1-1.1 2.6-2.8-.3L12 22.2l-2.3-1.7-2.8.3-1.1-2.6-2.6-1.1.3-2.8L1.8 12l1.7-2.3-.3-2.8 2.6-1.1 1.1-2.6 2.8.3z"/><path class="tick" d="M7.6 12.3l2.9 2.9 5.9-6.1"/></svg>`;

// إعدادات الشريط من الإدارة (catalog.qualityStrip): العنوان، النقاط (كل سطر نقطة)، السرعة، والتوقف عند مرور الماوس.
function normalizeQualityStrip(value) {
  const points = (Array.isArray(value?.points) ? value.points : []).map(point => String(point || "").trim()).filter(Boolean);
  return {
    title: String(value?.title || "").trim(),
    points,
    speed: Math.min(10, Math.max(1, Number(value?.speed) || 5)),
    pauseOnHover: value?.pauseOnHover !== false
  };
}
function renderQualityStrip() {
  const track = $("#qualityStripTrack");
  if (!track) return;
  const settings = normalizeQualityStrip(state.qualityStrip);
  const custom = state.lang === "ar" && settings.points.length;
  const points = custom ? settings.points : (QUALITY_POINTS[state.lang] || QUALITY_POINTS.ar);
  const title = $("#qualityStrip [data-i18n='qualityTitle']");
  if (title) title.textContent = state.lang === "ar" && settings.title ? settings.title : tr("qualityTitle");
  $("#qualityStrip")?.classList.toggle("pause-on-hover", settings.pauseOnHover);
  // The track is laid out left to right and moves right, so for Arabic the list is
  // reversed: read from the title leftwards, the points come in the order written.
  const ordered = state.lang === "ar" ? [...points].reverse() : points;
  const group = hidden => `<ul class="quality-strip-group"${hidden ? ' aria-hidden="true"' : ""}>${ordered.map(point => `<li>${QUALITY_SEAL}<span>${escapeHtml(point)}</span></li>`).join("")}</ul>`;
  // Two identical groups make the loop seamless; the copy is hidden from screen readers.
  track.innerHTML = group(false) + group(true);
  // Speed is a distance per second, so a longer list does not move faster.
  const width = track.firstElementChild?.getBoundingClientRect().width || 0;
  if (width) track.style.setProperty("--strip-duration", `${(width / (settings.speed * 9)).toFixed(1)}s`);
}

// ---- الأغلفة: تنضبط من الإدارة (catalog.covers). كل غلاف صفحة مستقلة برابط ?cover=<id> ----
function normalizeCovers(list) {
  return (Array.isArray(list) ? list : []).map(cover => ({
    id: String(cover?.id || ""),
    nameAr: String(cover?.nameAr || ""), nameEn: String(cover?.nameEn || cover?.nameAr || ""),
    descriptionAr: String(cover?.descriptionAr || ""), descriptionEn: String(cover?.descriptionEn || cover?.descriptionAr || ""),
    size: cover?.size === "full" ? "full" : "half",
    image: String(cover?.image || ""),
    helperProductIds: (Array.isArray(cover?.helperProductIds) ? cover.helperProductIds : []).map(String).slice(0, 3),
    items: (Array.isArray(cover?.items) ? cover.items : []).map(item => ({ type: item?.type === "heading" ? "heading" : "category", id: String(item?.id || "") })).filter(item => item.id),
    filtered: cover?.filtered === true,
    imageMode: cover?.imageMode === "animated" ? "animated" : "photo",
    mosaic: normalizeCoverMosaic(cover?.mosaic),
    sourceFilterId: String(cover?.sourceFilterId || ""),
    products: (Array.isArray(cover?.products) ? cover.products : []).map(entry => ({ productId: String(entry?.productId || ""), firstStepId: String(entry?.firstStepId || ""), optionIds: Array.isArray(entry?.optionIds) ? entry.optionIds.map(String) : [], steps: (Array.isArray(entry?.steps) ? entry.steps : []).map(step => ({ stepId: String(step?.stepId || ""), optionIds: Array.isArray(step?.optionIds) ? step.optionIds.map(String) : [] })).filter(step => step.stepId) })).filter(entry => entry.productId),
    sectionOrder: (Array.isArray(cover?.sectionOrder) ? cover.sectionOrder : []).map(String),
    productOrder: Object.fromEntries(Object.entries(cover?.productOrder && typeof cover.productOrder === "object" ? cover.productOrder : {}).map(([key, ids]) => [String(key), (Array.isArray(ids) ? ids : []).map(String)]))
  })).filter(cover => cover.id);
}
function coverText(cover, field) { return state.lang === "ar" ? cover[`${field}Ar`] : (cover[`${field}En`] || cover[`${field}Ar`]); }
function headingCategoryIds(heading) { return [...(heading?.subheadings || []).flatMap(group => group.categoryIds || []), ...(heading?.categoryIds || [])].map(String); }
function coverCategoryIds(cover) {
  return cover.items.flatMap(item => item.type === "heading" ? headingCategoryIds((state.headings || []).find(heading => sameCatalogId(heading.id, item.id))) : [item.id]);
}
function coverProducts(cover) {
  if (cover.filtered) {
    const visible = new Set(state.categories.map(category => String(category.id)));
    return cover.products.map(entry => state.products.find(item => sameCatalogId(item.id, entry.productId))).filter(item => item && visible.has(String(item.category)) && isCurrentCatalog(item));
  }
  return coverCategoryIds(cover).flatMap(id => categoryProducts(id));
}
function visibleCovers() { return activeProductFilter() ? [] : (state.covers || []).filter(cover => coverProducts(cover).length); }
function activeCover() { return state.activeCoverId ? (state.covers || []).find(cover => cover.id === state.activeCoverId) || null : null; }
// Headings and categories that live inside any cover: they leave the home page.
function coveredKeys() {
  const keys = new Set();
  // A filtered cover holds copies, so its sections stay on the home page too.
  (state.covers || []).filter(cover => !cover.filtered).forEach(cover => cover.items.forEach(item => {
    keys.add(`${item.type}:${item.id}`);
    if (item.type === "heading") headingCategoryIds((state.headings || []).find(heading => sameCatalogId(heading.id, item.id))).forEach(id => keys.add(`category:${id}`));
  }));
  return keys;
}
// Which catalogue entries this page shows: the open cover's, or what no cover holds.
function entryVisibleHere(type, id) {
  if (PICKER_MODE) return true;
  const cover = activeCover();
  if (cover?.filtered) return type === "category";
  if (cover) return type === "heading" ? cover.items.some(item => item.type === "heading" && sameCatalogId(item.id, id)) : coverCategoryIds(cover).some(value => sameCatalogId(value, id));
  return !coveredKeys().has(`${type}:${id}`);
}
function coverHelperImages(cover) {
  return cover.helperProductIds.map(id => state.products.find(item => sameCatalogId(item.id, id))).filter(Boolean).map(item => productImages(item)[0]).filter(Boolean);
}
function itemsLabel(count) { return state.lang === "ar" ? `${count} ${count > 2 && count < 11 ? "أصناف" : "صنف"}` : `${count} items`; }

// «صور متحركة»: 4 صفوف، كل صف لين 10 مربعات تنحدد من الإدارة (صورة مرفوعة أو صورة منتج).
// الصف الفاضي ياخذ صور منتجات الغلاف. الحركة كلها transform في CSS فتبقى ناعمة على الجوال.
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
function coverMosaicMarkup(cover) {
  const auto = [...new Set(coverProducts(cover).map(item => productImages(item)[0]).filter(Boolean))].map(thumbnailUrl);
  const slotImage = slot => {
    if (slot?.type === "image") return slot.url;
    if (slot?.type === "product") { const item = state.products.find(entry => sameCatalogId(entry.id, slot.productId)); const src = item && productImages(item)[0]; return src ? thumbnailUrl(src) : ""; }
    return "";
  };
  const speed = cover.mosaic?.speed || 5;
  const rows = Array.from({ length: COVER_MOSAIC_ROWS }, (_, row) => {
    // An empty slot takes one of the cover's product photos, so a half-filled row still looks full.
    let images = Array.from({ length: COVER_MOSAIC_SLOTS }, (_, index) => slotImage(cover.mosaic?.rows?.[row]?.[index]) || (auto.length ? auto[(row * COVER_MOSAIC_SLOTS + index) % auto.length] : "")).filter(Boolean);
    while (images.length && images.length < 8) images = [...images, ...images];
    return images;
  });
  if (!rows.some(images => images.length)) return "";
  return `<span class="cover-mosaic rows-${COVER_MOSAIC_ROWS}" aria-hidden="true">${rows.map((images, row) => {
    const cells = images.map(src => `<img src="${escapeHtml(src)}" alt="" decoding="async">`).join("");
    return `<span class="cover-mosaic-row"><span class="cover-mosaic-track" style="--mosaic-duration:${((150 / speed) * (1 + row * .22)).toFixed(1)}s">${cells}${cells}</span></span>`;
  }).join("")}</span>`;
}
function coverTileMarkup(cover) {
  const animated = cover.imageMode === "animated";
  return `<a class="world-tile size-${cover.size}${animated ? " is-animated" : ""}" href="?cover=${encodeURIComponent(cover.id)}" data-cover-open="${escapeHtml(cover.id)}">
    ${animated ? coverMosaicMarkup(cover) : (cover.image ? `<img src="${escapeHtml(cover.image)}" alt="" loading="lazy" decoding="async">` : "")}
    <span class="world-tile-copy"><strong>${escapeHtml(coverText(cover, "name"))}</strong>${coverText(cover, "description") ? `<small>${escapeHtml(coverText(cover, "description"))}</small>` : ""}</span>
    <span class="world-tile-count">${itemsLabel(coverProducts(cover).length)}</span>
  </a>`;
}

function renderCatalogWorlds() {
  const host = $("#catalogWorlds");
  if (!host) return;
  if (PICKER_MODE) { host.classList.add("hidden"); host.innerHTML = ""; return; }
  const covers = activeCover() ? [] : visibleCovers();
  host.classList.toggle("hidden", !covers.length);
  host.innerHTML = covers.length ? `<div class="catalog-worlds-grid">${covers.map(coverTileMarkup).join("")}</div>` : "";
}

function coverBannerMarkup(cover) {
  const helpers = coverHelperImages(cover);
  const animated = cover.imageMode === "animated";
  return `<header class="world-cover${animated ? " is-animated" : ""}" data-cover-banner="${escapeHtml(cover.id)}">
    <div class="world-cover-media">${animated ? coverMosaicMarkup(cover) : (cover.image ? `<img src="${escapeHtml(cover.image)}" alt="" decoding="async">` : "")}</div>
    <div class="world-cover-copy"><h1>${escapeHtml(coverText(cover, "name"))}</h1>${coverText(cover, "description") ? `<p>${escapeHtml(coverText(cover, "description"))}</p>` : ""}<span class="world-cover-count">${itemsLabel(coverProducts(cover).length)}</span></div>
    ${helpers.length ? `<div class="world-cover-stack" aria-hidden="true">${helpers.map(src => `<img src="${escapeHtml(thumbnailUrl(src))}" alt="" decoding="async">`).join("")}</div>` : ""}
  </header>`;
}

// The section bar stays hidden while the cover banner is on screen and appears once it scrolls away.
function updateCoverBannerVisibility() {
  const banner = activeCover() ? $("#coverStage .world-cover") : null;
  const visible = Boolean(banner) && banner.getBoundingClientRect().bottom > ($(".site-header")?.offsetHeight || 0);
  if (document.body.classList.contains("cover-banner-visible") === visible) return;
  document.body.classList.toggle("cover-banner-visible", visible);
  syncHeadingNavigationOffset();
}
window.addEventListener("scroll", updateCoverBannerVisibility, { passive: true });
window.addEventListener("resize", updateCoverBannerVisibility, { passive: true });
function renderCoverStage() {
  const cover = activeCover();
  document.body.classList.toggle("cover-mode", Boolean(cover));
  const stage = $("#coverStage");
  if (stage) stage.innerHTML = cover ? coverBannerMarkup(cover) : "";
  $("#coverBack")?.classList.toggle("hidden", !cover);
  updateCoverBannerVisibility();
  if (cover) document.title = `${coverText(cover, "name")} — ${state.lang === "ar" ? "مخبز التين والزيتون" : "Figs & Olives"}`;
}

function coverIdFromUrl() { return String(new URLSearchParams(location.search).get("cover") || ""); }
function openCover(coverId, { push = true } = {}) {
  const cover = (state.covers || []).find(item => item.id === coverId) || null;
  state.activeCoverId = cover ? cover.id : "";
  if (push) {
    const url = new URL(location.href);
    if (cover) url.searchParams.set("cover", cover.id); else url.searchParams.delete("cover");
    url.searchParams.delete("filter");
    history.pushState({ cover: state.activeCoverId }, "", url);
  }
  state.activeCategory = "all"; state.activeHeadingId = ""; state.activeSubheadingId = "";
  if (!cover) applyLanguage();
  renderCategories();
  renderProductSections();
  window.scrollTo({ top: 0, behavior: "auto" });
}
window.addEventListener("popstate", () => openCover(coverIdFromUrl(), { push: false }));

document.addEventListener("click", event => {
  const tile = event.target.closest("[data-cover-open]");
  if (tile && !event.metaKey && !event.ctrlKey && !event.shiftKey) { event.preventDefault(); openCover(tile.dataset.coverOpen); return; }
  if (event.target.closest("#coverBack, [data-cover-back]")) { event.preventDefault(); if (history.state && "cover" in history.state && history.length > 1) history.back(); else openCover(""); }
});

function sectionHeadingMarkup(category, matches) {
  const thumbs = matches.map(item => productImages(item)[0]).filter(Boolean).slice(0, 3);
  return `<div class="section-heading"><h2>${escapeHtml(categoryName(category))}</h2><span class="section-meta">${thumbs.length ? `<span class="section-thumbs" aria-hidden="true">${thumbs.map(src => `<img src="${escapeHtml(thumbnailUrl(src))}" alt="" loading="lazy" decoding="async">`).join("")}</span>` : ""}<b>${itemsLabel(matches.length)}</b></span></div>`;
}

function renderProductSections() {
  const sections = [];
  const restaurantImageNotice = category => catalogTypeOf(category) === "restaurant"
    ? `<p class="restaurant-image-notice">جميع صور المنتجات هنا تم تصويرها كما تقدم لك في طاولة المطعم .. لذلك سيختلف التغليف عند طلبها للتوصيل</p>`
    : "";
  const ordered = viewCategories();
  const filteringProducts = Boolean(activeProductFilter());
  // Preserve the real product.category relationship when filtering.  Headings
  // are a display grouping only, so they must not decide a product's section.
  if (filteringProducts) {
    ordered.forEach(category => {
      const matches = categoryProducts(category.id);
      if (!matches.length || (activeCover() && !activeFilteredCover() && !entryVisibleHere("category", category.id))) return;
      const sectionImage = String(category.sectionImage || "").trim();
      sections.push(`
        <section class="category-section" id="category-${encodeURIComponent(category.id)}" data-category-section="${escapeHtml(category.id)}">
          ${sectionHeadingMarkup(category, matches)}${restaurantImageNotice(category)}
          ${sectionImage ? `<button type="button" class="category-illustration" data-category-illustration="${escapeHtml(sectionImage)}" aria-label="تكبير الصورة التوضيحية لقسم ${escapeHtml(categoryName(category))}"><img src="${escapeHtml(sectionImage)}" alt="${escapeHtml(categoryName(category))}" loading="lazy"></button>` : ""}
          <div class="product-grid">${matches.map(item => productCard(item, category)).join("")}</div>
        </section>`);
    });
    $("#productSections").innerHTML = sections.length ? sections.join("") : `<div class="loading">${tr("noResults")}</div>`;
    renderCatalogWorlds();
    renderCoverStage();
    observeImages();
    return;
  }
  const used = new Set();
  const headings = (state.headings || []).filter(item => isCurrentCatalog(item)).sort((a, b) => Number(a.order) - Number(b.order));
  const linkedCategoryIds = new Set(headings.flatMap(item => [...(item.categoryIds || []), ...(item.subheadings || []).flatMap(group => group.categoryIds || [])]));
  const renderCategory = category => {
    const matches = categoryProducts(category.id);
    if (!matches.length) return "";
    const sectionImage = String(category.sectionImage || "").trim();
    return `
      <section class="category-section" id="category-${encodeURIComponent(category.id)}" data-category-section="${escapeHtml(category.id)}">
        ${sectionHeadingMarkup(category, matches)}${restaurantImageNotice(category)}
        ${sectionImage ? `<button type="button" class="category-illustration" data-category-illustration="${escapeHtml(sectionImage)}" aria-label="تكبير الصورة التوضيحية لقسم ${escapeHtml(categoryName(category))}"><img src="${escapeHtml(sectionImage)}" alt="${escapeHtml(categoryName(category))}" loading="lazy"></button>` : ""}
        <div class="product-grid">${matches.map(item => productCard(item, category)).join("")}</div>
      </section>`;
  };
  const entries = [
    ...headings.map(item => ({ type: "heading", item })),
    ...ordered.map(item => ({ type: "category", item }))
  ].sort((a, b) => Number(a.item.order) - Number(b.item.order) || (a.type === "heading" ? -1 : 1));
  entries.forEach(({ type, item }) => {
    if (type === "category") {
      if (!linkedCategoryIds.has(item.id) && !used.has(item.id) && entryVisibleHere("category", item.id)) { const markup = renderCategory(item); if (markup) sections.push(markup); }
      return;
    }
    if (!entryVisibleHere("heading", item.id)) return;
    const subheadings = Array.isArray(item.subheadings) ? item.subheadings : [];
    const groups = subheadings.length ? subheadings : [{ nameAr: "", nameEn: "", categoryIds: item.categoryIds || [] }];
    const groupMarkup = groups.map(group => { const linked = (group.categoryIds || []).map(id => ordered.find(category => sameCatalogId(category.id, id))).filter(Boolean); linked.forEach(category => used.add(category.id)); if (!linked.length) return ""; return `<section class="catalog-subheading-group" data-subheading-section="${escapeHtml(group.id || "")}">${linked.map(renderCategory).join("")}</section>`; }).join("");
    if (groupMarkup) sections.push(`<section class="catalog-heading-group" id="heading-${encodeURIComponent(item.id)}" data-heading-section="${escapeHtml(item.id)}">${groupMarkup}</section>`);
  });
  $("#productSections").innerHTML = sections.length ? sections.join("") : `<div class="loading">${tr("noResults")}</div>`;
  renderCatalogWorlds();
  renderCoverStage();
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
      <img src="${escapeHtml(thumbnailUrl(source))}" alt="${escapeHtml(productName(item))}" loading="lazy">
      <div><strong>${escapeHtml(productName(item))}</strong><small>${productPriceLabel(item)}</small></div>
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
  const shouldLock = visibleLayer("#productPage") || visibleLayer("#productOptionsModal") || visibleLayer("#checkoutModal")
    || visibleLayer("#accountDrawer") || visibleLayer("#authModal") || visibleLayer("#searchPopover") || Boolean(productOptionsPopover);
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
      image.onerror = () => {
        const full = image.dataset.full;
        if (full && image.getAttribute("src") !== full) { image.removeAttribute("data-full"); image.src = full; return; }
        image.src = "logo.png"; image.closest(".product-image")?.classList.add("loaded");
      };
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
  const headingNavigationHeight = $("#headingNavigation")?.classList.contains("hidden") ? 0 : ($("#headingNavigation")?.offsetHeight || 0);
  const top = window.scrollY + section.getBoundingClientRect().top - headerHeight - categoriesHeight - headingNavigationHeight - 10;
  pendingScrollCategoryId = categoryId;
  pendingScrollUntil = Date.now() + 5000;
  // Far sections are reached in one jump: a long smooth scroll would start
  // loading every product photo on the way before the wanted section's.
  const far = Math.abs(top - window.scrollY) > window.innerHeight * 2;
  window.scrollTo({ top: Math.max(0, top), left: 0, behavior: far ? "auto" : "smooth" });
  window.setTimeout(() => {
    if (pendingScrollCategoryId !== categoryId) return;
    pendingScrollCategoryId = "";
    updateCategoryFromScroll();
  }, 5200);
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

function syncActiveNavigation() {
  if (activeProductFilter()) {
    state.activeHeadingId = "";
    state.activeSubheadingId = "";
    $$('[data-heading-link]').forEach(button => button.classList.remove("active"));
    $$('[data-category-link]').forEach(button => button.classList.toggle("active", sameCatalogId(button.dataset.categoryLink, state.activeCategory)));
    updateHeadingNavigation();
    centerCategoryButton(state.activeCategory);
    return;
  }
  const heading = (state.headings || []).filter(item => isCurrentCatalog(item)).find(item => linkedGroupForCategory(item, state.activeCategory));
  state.activeHeadingId = heading?.id || "";
  state.activeSubheadingId = heading ? (linkedGroupForCategory(heading, state.activeCategory)?.id || "") : "";
  $$("[data-category-link]").forEach(button => button.classList.toggle("active", button.dataset.categoryLink === state.activeCategory));
  $$("[data-heading-link]").forEach(button => button.classList.toggle("active", button.dataset.headingLink === state.activeHeadingId));
  const coverSubKey = `${state.activeHeadingId}|${state.activeSubheadingId}`;
  $$("[data-cover-sub]").forEach(button => button.classList.toggle("active", button.dataset.coverSub === coverSubKey));
  const coverSubButton = $$("[data-cover-sub]").find(button => button.dataset.coverSub === coverSubKey);
  if (coverSubButton) coverSubButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  else if (state.activeHeadingId) document.querySelector(`[data-heading-link="${CSS.escape(state.activeHeadingId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  else centerCategoryButton(state.activeCategory);
  updateHeadingNavigation();
}

function updateCategoryFromScroll() {
  scrollFrame = null;
  syncHeadingNavigationOffset();
  if (pendingScrollCategoryId && Date.now() < pendingScrollUntil) {
    if (state.activeCategory !== pendingScrollCategoryId) {
      state.activeCategory = pendingScrollCategoryId;
      syncActiveNavigation();
    }
    return;
  }
  pendingScrollCategoryId = "";
  const sections = $$("[data-category-section]");
  if (!sections.length) return;
  let active = "all";
  const fixedNavigationHeight = ($(".site-header")?.offsetHeight || 0)
    + ($("#categories")?.offsetHeight || 0)
    + ($("#headingNavigation")?.classList.contains("hidden") ? 0 : ($("#headingNavigation")?.offsetHeight || 0));
  const threshold = fixedNavigationHeight + 38;
  for (const section of sections) if (section.getBoundingClientRect().top <= threshold) active = section.dataset.categorySection;
  if (active === state.activeCategory && active !== "all") return;
  state.activeCategory = active;
  syncActiveNavigation();
}

function changeQuantity(id, difference) {
  const wasEmpty = cartCount() === 0;
  const existing = typeof state.cart[id] === "object" && state.cart[id] ? state.cart[id] : { quantity: state.cart[id] || 0, note: "" };
  const item = product(existing.productId || id.split("::")[0]);
  if (difference > 0 && fatayerPieceOptionSets(item, existing.options || [], 1)) {
    state.cart[cartPieceLineKey(existing.productId || item.id, existing.options || [])] = {
      ...existing,
      productId: String(existing.productId || item.id),
      quantity: 1
    };
    state.paymentRequestId = "";
    persistCart();
    renderCartBar();
    syncProductQuantityControls(item.id);
    if (!$("#checkoutModal").classList.contains("hidden")) renderCheckout();
    return;
  }
  const nextQuantity = Math.max(0, Number(existing.quantity || 0) + difference);
  if (!nextQuantity) delete state.cart[id];
  else state.cart[id] = { ...existing, quantity: nextQuantity };
  state.paymentRequestId = "";
  persistCart();
  renderCartBar();
  syncProductQuantityControls(id);
  if (difference > 0 && wasEmpty) trackStoreEvent("cart_created", { productId: id, ...analyticsCartSnapshot() });
  else trackStoreEvent("cart_updated", { productId: id, ...analyticsCartSnapshot() });
  if (!$("#checkoutModal").classList.contains("hidden")) renderCheckout();
}

function updateCartNote(id, note) {
  const existing = typeof state.cart[id] === "object" && state.cart[id] ? state.cart[id] : { quantity: state.cart[id] || 0 };
  if (!Number(existing.quantity)) return;
  state.cart[id] = { ...existing, note: String(note || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 240) };
  state.paymentRequestId = "";
  persistCart();
  trackStoreEvent("cart_updated", { productId: id, ...analyticsCartSnapshot() });
}

function requestAddToCart(id, anchor = null) {
  if (!state.user?.name) {
    pendingCartProductId = id;
    pendingCartAnchor = anchor;
    openAuth("login");
    return;
  }
  const item = product(id);
  if (productSelectionFlow(item)) return openSelectionFlow(id, anchor);
  if (productOptions(item)) return openProductOptions(id, anchor);
  changeQuantity(id, 1);
  toast(tr("added"));
}

function openSelectionFlow(id, anchor = null) {
  closeProductOptions();
  pendingOptionProductId = id;
  pendingOptionAnchor = anchor || document.querySelector(`[data-product-add="${CSS.escape(String(id))}"]`);
  pendingSelectionFlow = productSelectionFlow(product(id));
  pendingFlowSelections = {};
  pendingFlowStep = 0;
  productOptionsPopover = document.createElement("section");
  productOptionsPopover.className = "product-options-popover selection-flow-popover";
  const optionsBackdrop = document.createElement("div");
  optionsBackdrop.className = "product-options-backdrop";
  document.body.append(optionsBackdrop);
  document.body.append(productOptionsPopover);
  syncPageScrollLock();
  productOptionsPopover.place = () => {
    const rect = pendingOptionAnchor?.getBoundingClientRect();
    if (!rect) return;
    const width = productOptionsPopover.offsetWidth;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width));
    let top = rect.top - productOptionsPopover.offsetHeight - 10;
    if (top < 8) top = Math.min(window.innerHeight - productOptionsPopover.offsetHeight - 8, rect.bottom + 10);
    Object.assign(productOptionsPopover.style, { left: `${left}px`, top: `${Math.max(8, top)}px` });
  };
  autoSelectSingleFilteredFlowSteps();
  if (pendingFlowStep >= pendingSelectionFlow.steps.length) {
    const chosen = pendingSelectionFlow.steps.flatMap(step => pendingFlowSelections[step.id] || []);
    return addSelectedOptionsToCart(id, chosen, selectedFlowQuantity(pendingSelectionFlow, pendingFlowSelections));
  }
  renderSelectionFlowStep();
}

// لا نعرض للعميل خطوة لا تحتوي - بسبب الفلتر - إلا خياراً واحداً محدداً.
// يضاف هذا الخيار تلقائياً إلى اسم المنتج ويستمر التسلسل إلى الخطوة التالية.
function autoSelectSingleFilteredFlowSteps() {
  const item = product(pendingOptionProductId);
  const flow = pendingSelectionFlow;
  while (item && flow?.steps?.[pendingFlowStep]) {
    const step = flow.steps[pendingFlowStep];
    const allowedIds = filterOptionIds(item.id, step.id);
    if (!Array.isArray(allowedIds)) break;
    const choices = step.items.filter(option => allowedIds.includes(String(option.id)));
    if (choices.length !== 1) break;
    const choice = choices[0];
    const quantity = step.distributeQuantity ? Math.max(1, flowFillingRequirement(step) || 1) : 1;
    pendingFlowSelections[step.id] = [{ ...choice, quantity, flowStepId: step.id, isFilling: step.distributeQuantity === true, nameSuffix: step.required !== false }];
    pendingFlowStep++;
  }
}

function flowLimit(step) {
  // في مرحلة الحشوات لا نحد عدد الأنواع؛ القيد الوحيد هو إكمال عدد الحبات.
  if (step.distributeQuantity) return step.items.length;
  if (!step.limitFrom) return Math.min(step.items.length, step.maxSelections);
  const source = pendingFlowSelections[step.limitFrom]?.[0];
  const limit = source?.maxFillingSelections;
  if (limit === "quantity") return Math.max(1, Number(source.quantity) || 1);
  return Math.min(step.items.length, Math.max(1, Number(limit) || step.maxSelections));
}

function flowFillingRequirement(step) {
  if (!step?.distributeQuantity || !step.limitFrom) return 0;
  const source = pendingFlowSelections[step.limitFrom]?.[0];
  return Math.max(1, Number(source?.pieces) || 1) * Math.max(1, Number(source?.quantity) || 1);
}

function flowSelectedQuantity(selected) {
  return selected.reduce((total, option) => total + Math.max(1, Number(option.quantity) || 1), 0);
}

function selectionFlowPreviousSurcharge(flow, stepIndex) {
  return flow.steps.slice(0, stepIndex)
    .flatMap(step => pendingFlowSelections[step.id] || [])
    .reduce((total, option) => total + Math.max(0, Number(option.price) || 0), 0);
}

function renderSelectionFlowStep() {
  const item = product(pendingOptionProductId);
  const flow = pendingSelectionFlow;
  const step = flow?.steps[pendingFlowStep];
  if (!item || !step || !productOptionsPopover) return closeProductOptions();
  const allowedIds = filterOptionIds(item.id, step.id);
  const visibleItems = Array.isArray(allowedIds) ? step.items.filter(option => allowedIds.includes(String(option.id))) : step.items;
  const selected = pendingFlowSelections[step.id] || [];
  const limit = flowLimit(step);
  const fillingRequirement = flowFillingRequirement(step);
  const selectedFillingQuantity = flowSelectedQuantity(selected);
  const type = step.multiple ? "checkbox" : "radio";
  const title = state.lang === "ar" ? step.titleAr : step.titleEn;
  const hint = fillingRequirement
    ? (state.lang === "ar" ? `وزّع ${new Intl.NumberFormat("ar-KW").format(fillingRequirement)} حبة على الحشوات` : `Distribute ${fillingRequirement} pieces across fillings`)
    : (step.multiple ? (state.lang === "ar" ? `يمكنك اختيار حتى ${new Intl.NumberFormat("ar-KW").format(limit)} خيارات` : `Choose up to ${limit} options`) : "");
  const isLast = pendingFlowStep === flow.steps.length - 1;
  const selectedOptions = flow.steps.flatMap(flowStep => pendingFlowSelections[flowStep.id] || []);
  const currentPrice = selectionFlowTotal(item, selectedOptions, selectedFlowQuantity(flow, pendingFlowSelections));
  const listScrollTop = productOptionsPopover.querySelector(".product-options-list")?.scrollTop || 0;
  const fillingStatus = fillingRequirement ? `<div class="filling-progress">${state.lang === "ar" ? "الحشوات المختارة" : "Selected fillings"}: <b class="${selectedFillingQuantity === fillingRequirement ? "complete" : ""}">${new Intl.NumberFormat(state.lang === "ar" ? "ar-KW" : "en").format(selectedFillingQuantity)} / ${new Intl.NumberFormat(state.lang === "ar" ? "ar-KW" : "en").format(fillingRequirement)}</b></div>` : "";
  const previousSurcharge = step.id === "size" ? selectionFlowPreviousSurcharge(flow, pendingFlowStep) : 0;
  let previousGroup = "";
  const optionsMarkup = visibleItems.map(option => {
    const groupTitle = state.lang === "ar" ? option.groupAr : (option.groupEn || option.groupAr);
    const groupHeading = groupTitle && groupTitle !== previousGroup
      ? `<h4 class="flow-option-group-title">${escapeHtml(groupTitle)}</h4>`
      : "";
    if (groupTitle) previousGroup = groupTitle;
    const chosen = selected.find(selectedOption => selectedOption.id === option.id);
    const displayedPrice = Math.max(0, Number(option.price) || 0) + previousSurcharge;
    const showPrice = step.id !== "dough" && displayedPrice > 0;
    const perUnitHint = showPrice && option.priceGroup ? `<small class="per-unit-price">${state.lang === "ar" ? "* للكمية الواحدة" : "* per quantity"}</small>` : "";
    return `${groupHeading}<div class="flow-option-row"><label class="product-option-choice"><input type="${type}" name="selection-flow-option" value="${escapeHtml(option.id)}" ${chosen ? "checked" : ""}><span><b>${escapeHtml(optionName(option))}</b><small>${escapeHtml(state.lang === "ar" ? option.nameEn : option.nameAr)}</small>${option.preparation ? `<i>◷ ${escapeHtml(preparationLabel(option.preparation))}</i>` : ""}</span>${showPrice ? `<em>+ ${money(displayedPrice)}${perUnitHint}</em>` : ""}${step.quantityEnabled && chosen ? `<div class="flow-choice-quantity-wrap"><small>${state.lang === "ar" ? "الكمية" : "Quantity"}</small><div class="qty flow-choice-quantity"><button type="button" data-flow-quantity="plus" data-flow-option-id="${escapeHtml(option.id)}">+</button><span>${new Intl.NumberFormat(state.lang === "ar" ? "ar-KW" : "en").format(chosen.quantity || 1)}</span><button type="button" data-flow-quantity="minus" data-flow-option-id="${escapeHtml(option.id)}">${chosen.quantity === 1 ? "×" : "−"}</button></div></div>` : ""}</label></div>`;
  }).join("");
  productOptionsPopover.innerHTML = `<header><div><small>${state.lang === "ar" ? `الخطوة ${new Intl.NumberFormat("ar-KW").format(pendingFlowStep + 1)} من ${new Intl.NumberFormat("ar-KW").format(flow.steps.length)}` : `Step ${pendingFlowStep + 1} of ${flow.steps.length}`}</small><strong>${escapeHtml(productName(item))}</strong></div><button type="button" data-close-options aria-label="${state.lang === "ar" ? "إغلاق" : "Close"}">×</button></header><div class="option-group-title"><strong>${escapeHtml(title)}</strong>${hint ? `<small>${escapeHtml(hint)}</small>` : ""}</div>${fillingStatus}<div class="product-options-list">${optionsMarkup}</div><div class="selection-flow-footer"><div class="selection-price"><span>${state.lang === "ar" ? "السعر الحالي" : "Current price"}</span><b>${money(currentPrice)}</b></div><button type="button" class="primary" data-flow-next ${selected.length ? "" : "disabled"}>${isLast ? (state.lang === "ar" ? "إضافة إلى السلة" : "Add to cart") : (state.lang === "ar" ? "التالي" : "Next")}</button></div>`;
  productOptionsPopover.place?.();
  const optionsList = productOptionsPopover.querySelector(".product-options-list");
  if (optionsList) optionsList.scrollTop = listScrollTop;
  productOptionsPopover.querySelector("[data-close-options]").onclick = closeProductOptions;
  productOptionsPopover.querySelectorAll('input[name="selection-flow-option"]').forEach(input => input.onchange = () => {
    const choice = step.items.find(option => option.id === input.value);
    if (!choice) return;
    let next = step.multiple ? [...(pendingFlowSelections[step.id] || [])] : [];
    if (input.checked && !next.some(option => option.id === choice.id)) {
      // لا نسمح بإضافة نوع جديد عندما يكتمل عدد الحشوات. سابقاً كان يمكن
      // تحديد خيارات إضافية من مربعات الاختيار فتتجاوز السلة ١٢/١٢ مثلاً.
      if (fillingRequirement && flowSelectedQuantity(next) >= fillingRequirement) {
        input.checked = false;
        return toast(state.lang === "ar" ? "لقد اكتمل عدد الحشوات المطلوب" : "The required fillings quantity is complete", "error");
      }
      next.push({ ...choice, quantity: 1, flowStepId: step.id, isFilling: step.distributeQuantity === true, nameSuffix: step.required !== false && step.multiple !== true });
    }
    if (!input.checked) next = next.filter(option => option.id !== choice.id);
    if (next.length > limit) return toast(state.lang === "ar" ? `الحد الأقصى ${new Intl.NumberFormat("ar-KW").format(limit)} خيارات` : `Maximum ${limit} options`, "error"), renderSelectionFlowStep();
    pendingFlowSelections[step.id] = next;
    renderSelectionFlowStep();
  });
  productOptionsPopover.querySelectorAll("[data-flow-quantity]").forEach(button => button.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    const current = pendingFlowSelections[step.id]?.find(option => option.id === button.dataset.flowOptionId);
    if (!current) return;
    const amount = Number(current.quantity || 1);
    if (button.dataset.flowQuantity === "plus" && fillingRequirement && flowSelectedQuantity(pendingFlowSelections[step.id] || []) >= fillingRequirement) {
      return toast(state.lang === "ar" ? "لقد اكتمل عدد الحشوات المطلوب" : "The required fillings quantity is complete", "error");
    }
    current.quantity = Math.max(1, amount + (button.dataset.flowQuantity === "plus" ? 1 : -1));
    renderSelectionFlowStep();
  });
  productOptionsPopover.querySelector("[data-flow-next]").onclick = event => {
    event.stopPropagation();
    if (!selected.length) return;
    if (isLast && fillingRequirement && selectedFillingQuantity !== fillingRequirement) {
      return toast(state.lang === "ar" ? "ارجو اكمال اختيار الحشوات للكمية كاملة" : "Please complete filling selections for the full quantity", "error");
    }
    if (!isLast) {
      pendingFlowStep++;
      autoSelectSingleFilteredFlowSteps();
      if (pendingFlowStep < flow.steps.length) return renderSelectionFlowStep();
    }
    const chosen = flow.steps.flatMap(flowStep => pendingFlowSelections[flowStep.id] || []);
    addSelectedOptionsToCart(pendingOptionProductId, chosen, selectedFlowQuantity(flow, pendingFlowSelections));
  };
}

function openProductOptions(id, anchor = null) {
  const item = product(id);
  const config = productOptions(item);
  if (!item || !config) return requestAddToCart(id);
  const optionIds = filterOptionIds(id, "options");
  const allowed = Array.isArray(optionIds) ? config.items.filter(option => optionIds.includes(String(option.id))) : [];
  const singleFilteredOption = Array.isArray(optionIds) && allowed.length === 1;
  if (singleFilteredOption && config.required && !config.multiple && !config.nestedEnabled) return addSelectedOptionsToCart(id, [{ ...allowed[0], quantity: 1, nameSuffix: true }]);
  closeProductOptions();
  pendingOptionProductId = id;
  pendingOptionAnchor = anchor || document.querySelector(`[data-product-add="${CSS.escape(String(id))}"]`);
  pendingGeneralOptionSelections = [];
  pendingGeneralOptionQuantities = {};
  pendingPrimaryOption = singleFilteredOption && config.required && !config.multiple && config.nestedEnabled ? { ...allowed[0], nameSuffix: true } : null;
  pendingSecondaryOption = null;
  productOptionsPopover = document.createElement("section");
  productOptionsPopover.className = "product-options-popover";
  const optionsBackdrop = document.createElement("div");
  optionsBackdrop.className = "product-options-backdrop";
  document.body.append(optionsBackdrop);
  document.body.append(productOptionsPopover);
  syncPageScrollLock();
  const placePopover = () => {
    const rect = pendingOptionAnchor?.getBoundingClientRect();
    if (!rect) return;
    const width = productOptionsPopover.offsetWidth;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width));
    let top = rect.top - productOptionsPopover.offsetHeight - 10;
    if (top < 8) top = Math.min(window.innerHeight - productOptionsPopover.offsetHeight - 8, rect.bottom + 10);
    Object.assign(productOptionsPopover.style, { left: `${left}px`, top: `${Math.max(8, top)}px` });
  };
  productOptionsPopover.place = placePopover;
  renderProductOptionsStep();
}

function renderProductOptionsStep() {
  const id = pendingOptionProductId;
  const item = product(id);
  const config = productOptions(item);
  if (!productOptionsPopover || !item || !config) return closeProductOptions();
  const choosingThirdOption = Boolean(pendingSecondaryOption);
  const choosingSubOption = Boolean(pendingPrimaryOption) && !choosingThirdOption;
  const stage = choosingThirdOption ? 3 : choosingSubOption ? 2 : 1;
  const filterIds = filterOptionIds(item.id, choosingSubOption ? "subOptions" : "options");
  const rawChoices = choosingThirdOption ? pendingSecondaryOption.subOptions : (choosingSubOption ? pendingPrimaryOption.subOptions : config.items);
  const choices = Array.isArray(filterIds) && !choosingThirdOption ? rawChoices.filter(option => filterIds.includes(choosingSubOption ? `${pendingPrimaryOption.id}::${option.id}` : String(option.id))) : rawChoices;
  if (choosingSubOption && Array.isArray(filterIds) && choices.length === 1 && !config.thirdLevelEnabled) return addSelectedOptionsToCart(id, [{ ...pendingPrimaryOption, nameSuffix: true }, { ...choices[0], quantity: 1, nameSuffix: true }]);
  const choiceName = choosingThirdOption ? "product-third-option" : (choosingSubOption ? "product-sub-option" : "product-option");
  const stageMultiple = config.multiple === true && Number(config.multipleStep || 1) === stage;
  const stageQuantity = config.optionQuantityEnabled === true && Number(config.quantityStep || 1) === stage;
  const type = stageMultiple ? "checkbox" : "radio";
  const stepText = choosingThirdOption
    ? (state.lang === "ar" ? `اختر الخيار المرتبط بـ «${optionName(pendingSecondaryOption)}»` : `Choose an option for ${optionName(pendingSecondaryOption)}`)
    : choosingSubOption
      ? (state.lang === "ar" ? `اختر الخيار المرتبط بـ «${optionName(pendingPrimaryOption)}»` : `Choose an option for ${optionName(pendingPrimaryOption)}`)
    : (config.required ? tr("optionsRequired") : tr("optionOptional"));
  const actionText = stage < (config.thirdLevelEnabled ? 3 : (config.nestedEnabled ? 2 : 1)) ? (state.lang === "ar" ? "التالي" : "Next") : (state.lang === "ar" ? "إضافة إلى السلة" : "Add to cart");
  const optionsTitle = stageMultiple ? (state.lang === "ar" ? config.titleAr : config.titleEn) : "";
  const maxHint = stageMultiple ? (state.lang === "ar" ? `يمكنك اختيار حتى ${new Intl.NumberFormat("ar-KW").format(config.maxSelections)} خيارات` : `Choose up to ${config.maxSelections} options`) : "";
  const showNestedCurrentPrice = stage > 1 && choices.some(option => Number(option.price || 0) > 0);
  const selectedOptionIds = new Set(pendingGeneralOptionSelections);
  const currentNestedPrice = () => {
    const carriedChoices = [pendingPrimaryOption, pendingSecondaryOption].filter(Boolean);
    const currentChoices = choices.filter(option => pendingGeneralOptionSelections.includes(option.id));
    return [...carriedChoices, ...currentChoices].reduce((total, option) => {
      const quantity = Math.max(1, Number(option.quantity) || 1);
      return total + Math.max(0, Number(option.price) || 0) * quantity;
    }, 0);
  };
  productOptionsPopover.innerHTML = `<header><div><small>${state.lang === "ar" ? (stage === 3 ? "الخيار الثالث" : stage === 2 ? "الخيار الثاني" : "خيارات المنتج") : (stage === 3 ? "Third option" : stage === 2 ? "Second option" : "Product options")}</small><strong>${escapeHtml(productName(item))}</strong></div><button type="button" data-close-options aria-label="${state.lang === "ar" ? "إغلاق" : "Close"}">×</button></header><p>${escapeHtml(stepText)}</p>${optionsTitle ? `<div class="option-group-title"><strong>${escapeHtml(optionsTitle)}</strong><small>${escapeHtml(maxHint)}</small></div>` : ""}<div class="product-options-list">${choices.map(option => { const chosen = selectedOptionIds.has(option.id); const quantity = Math.max(1, Number(pendingGeneralOptionQuantities[option.id]) || 1); return `<label class="product-option-choice"><input type="${type}" name="${choiceName}" value="${escapeHtml(option.id)}" ${chosen ? "checked" : ""}>${option.image ? `<img src="${escapeHtml(option.image)}" alt="">` : ""}<span><b>${escapeHtml(optionName(option))}</b><small>${escapeHtml(state.lang === "ar" ? option.nameEn : option.nameAr)}</small>${option.preparation ? `<i>◷ ${escapeHtml(preparationLabel(option.preparation))}</i>` : ""}${config.minimumPerOptionEnabled && option.minimumOrder ? `<i class="option-minimum-note">${escapeHtml(minimumOrderText(option.minimumOrder))}</i>` : ""}</span>${config.priceBased ? `<em>${money(option.price)}</em>` : ""}${stageQuantity && chosen ? `<div class="option-choice-quantity-wrap"><small>${state.lang === "ar" ? "الكمية" : "Quantity"}</small><div class="qty option-choice-quantity"><button type="button" data-option-quantity-action="plus" data-option-id="${escapeHtml(option.id)}">+</button><span>${new Intl.NumberFormat(state.lang === "ar" ? "ar-KW" : "en").format(quantity)}</span><button type="button" data-option-quantity-action="minus" data-option-id="${escapeHtml(option.id)}">${quantity === 1 ? "×" : "−"}</button></div></div>` : ""}</label>`; }).join("")}</div>${showNestedCurrentPrice ? `<div class="selection-price hidden" data-option-current-price><span>${state.lang === "ar" ? "السعر الحالي" : "Current price"}</span><b></b></div>` : ""}<button type="button" class="primary" data-option-confirm ${config.required && !selectedOptionIds.size ? "disabled" : ""}>${actionText}</button>`;
  productOptionsPopover.place?.();
  productOptionsPopover.querySelector("[data-close-options]").onclick = closeProductOptions;
  productOptionsPopover.querySelectorAll(`input[name="${choiceName}"]`).forEach(input => input.onchange = () => {
    const selected = productOptionsPopover.querySelectorAll(`input[name="${choiceName}"]:checked`);
    if (stageMultiple && selected.length > config.maxSelections) {
      input.checked = false;
      return toast(state.lang === "ar" ? `الحد الأقصى ${new Intl.NumberFormat("ar-KW").format(config.maxSelections)} خيارات` : `Maximum ${config.maxSelections} options`, "error");
    }
    pendingGeneralOptionSelections = [...productOptionsPopover.querySelectorAll(`input[name="${choiceName}"]:checked`)].map(option => option.value);
    pendingGeneralOptionSelections.forEach(optionId => { pendingGeneralOptionQuantities[optionId] ||= 1; });
    if (stageQuantity) return renderProductOptionsStep();
    productOptionsPopover.querySelector("[data-option-confirm]").disabled = config.required && !productOptionsPopover.querySelector(`input[name="${choiceName}"]:checked`);
    const currentPrice = productOptionsPopover.querySelector("[data-option-current-price]");
    if (currentPrice && productOptionsPopover.querySelector(`input[name="${choiceName}"]:checked`)) {
      currentPrice.classList.remove("hidden");
      $("b", currentPrice).textContent = money(currentNestedPrice());
    }
  });
  productOptionsPopover.querySelectorAll("[data-option-quantity-action]").forEach(button => button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const optionId = button.dataset.optionId;
      const amount = Math.max(1, Number(pendingGeneralOptionQuantities[optionId]) || 1);
      pendingGeneralOptionQuantities[optionId] = Math.max(1, Math.min(99, amount + (button.dataset.optionQuantityAction === "plus" ? 1 : -1)));
      renderProductOptionsStep();
    });
  productOptionsPopover.querySelector("[data-option-confirm]").onclick = event => {
    event.stopPropagation();
    confirmProductOptions();
  };
}

function closeProductOptions() {
  pendingOptionProductId = "";
  pendingOptionAnchor = null;
  pendingPrimaryOption = null;
  pendingSecondaryOption = null;
  pendingGeneralOptionSelections = [];
  pendingGeneralOptionQuantities = {};
  pendingSelectionFlow = null;
  pendingFlowSelections = {};
  pendingFlowStep = 0;
  productOptionsPopover?.remove();
  $$(".product-options-backdrop").forEach(backdrop => backdrop.remove());
  productOptionsPopover = null;
  syncPageScrollLock();
}

function confirmProductOptions() {
  const id = pendingOptionProductId;
  const config = productOptions(product(id));
  if (!id || !config) return closeProductOptions();
  if (pendingSecondaryOption) {
    const selectedIds = pendingGeneralOptionSelections.length ? pendingGeneralOptionSelections : $$('input[name="product-third-option"]:checked', productOptionsPopover || document).map(input => input.value);
    const selectedThirdOptions = pendingSecondaryOption.subOptions.filter(option => selectedIds.includes(option.id)).map(option => ({ ...option, quantity: Math.max(1, Number(pendingGeneralOptionQuantities[option.id]) || 1), nameSuffix: true, showQuantity: config.optionQuantityEnabled === true && Number(config.quantityStep || 1) === 3 }));
    if (!selectedThirdOptions.length) return toast(tr("optionsRequired"), "error");
    return addSelectedOptionsToCart(id, [{ ...pendingPrimaryOption, nameSuffix: true }, { ...pendingSecondaryOption, nameSuffix: true }, ...selectedThirdOptions]);
  }
  if (pendingPrimaryOption) {
    const selectedIds = pendingGeneralOptionSelections.length ? pendingGeneralOptionSelections : $$('input[name="product-sub-option"]:checked', productOptionsPopover || document).map(input => input.value);
    const selectedSubOptions = pendingPrimaryOption.subOptions.filter(option => selectedIds.includes(option.id)).map(option => ({ ...option, quantity: Math.max(1, Number(pendingGeneralOptionQuantities[option.id]) || 1), nameSuffix: true, showQuantity: config.optionQuantityEnabled === true && Number(config.quantityStep || 1) === 2 }));
    const selectedSubOption = selectedSubOptions[0];
    if (!selectedSubOption) return toast(tr("optionsRequired"), "error");
    if (config.thirdLevelEnabled) {
      pendingSecondaryOption = selectedSubOption;
      pendingGeneralOptionSelections = [];
      pendingGeneralOptionQuantities = {};
      if (!pendingSecondaryOption.subOptions.length) return toast(state.lang === "ar" ? "لا توجد خيارات مرتبطة بهذا الخيار بعد" : "No linked options are available yet", "error");
      return renderProductOptionsStep();
    }
    return addSelectedOptionsToCart(id, [{ ...pendingPrimaryOption, nameSuffix: true }, ...selectedSubOptions]);
  }
  const selectedIds = pendingGeneralOptionSelections.length ? pendingGeneralOptionSelections : $$('input[name="product-option"]:checked', productOptionsPopover || document).map(input => input.value);
  if (config.required && !selectedIds.length) return toast(tr("optionsRequired"), "error");
  const selected = config.items.filter(option => selectedIds.includes(option.id)).map(option => ({ ...option, quantity: Math.max(1, Number(pendingGeneralOptionQuantities[option.id]) || 1), showQuantity: config.optionQuantityEnabled === true, nameSuffix: config.required === true && config.multiple !== true }));
  if (config.nestedEnabled) {
    pendingPrimaryOption = selected[0] || null;
    if (!pendingPrimaryOption) return toast(tr("optionsRequired"), "error");
    pendingGeneralOptionSelections = [];
    pendingGeneralOptionQuantities = {};
    if (!pendingPrimaryOption.subOptions.length) return toast(state.lang === "ar" ? "لا توجد خيارات مرتبطة بهذا الخيار بعد" : "No linked options are available yet", "error");
    return renderProductOptionsStep();
  }
  addSelectedOptionsToCart(id, selected);
}

function addSelectedOptionsToCart(id, selected, quantity = 1) {
  const wasEmpty = cartCount() === 0;
  const options = JSON.parse(JSON.stringify(Array.isArray(selected) ? selected : []));
  const item = product(id);
  const pieceOptionSets = fatayerPieceOptionSets(item, options, quantity);
  const lines = pieceOptionSets || [options];
  const lineQuantity = pieceOptionSets ? 1 : Math.max(1, Number(quantity) || 1);
  lines.forEach(lineOptions => {
    const lineKey = pieceOptionSets ? cartPieceLineKey(id, lineOptions) : cartLineKey(id, lineOptions);
    const existing = typeof state.cart[lineKey] === "object" && state.cart[lineKey] ? state.cart[lineKey] : { quantity: 0, note: "", productId: String(id) };
    state.cart[lineKey] = { ...existing, productId: String(id), options: lineOptions, quantity: Number(existing.quantity || 0) + lineQuantity };
  });
  state.paymentRequestId = "";
  persistCart();
  renderCartBar();
  syncProductQuantityControls(id);
  trackStoreEvent(wasEmpty ? "cart_created" : "cart_updated", { productId: id, ...analyticsCartSnapshot() });
  closeProductOptions();
  toast(tr("added"));
}

function syncProductQuantityControls(id) {
  const quantity = cartQuantity(id);
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
    slot.innerHTML = productQuantityControl(id, cartQuantity(id), slot.dataset.detailQuantity === "true");
  });
  $$("[data-cart-badge]").forEach(badge => {
    const quantity = cartQuantity(badge.dataset.cartBadge);
    badge.classList.toggle("hidden", !quantity);
    badge.textContent = quantity ? `${tr("inCart")} × ${quantity}` : "";
  });
}

function renderCartBar() {
  const count = cartCount();
  $("#floatingCart").classList.toggle("hidden", !count);
  $("#cartBadge").textContent = count;
  $("#headerCount").textContent = count;
  $("#cartTotal").innerHTML = state.lang === "ar" ? `<span class="cart-amount">${Number(subtotal()).toFixed(3)}</span><span class="cart-currency">د.ك</span>` : money(subtotal());
  $("#checkoutBtn").textContent = tableReservationActive() ? "إتمام الحجز ←" : tr("checkout");
}

function renderProductDetail(id) {
  const item = product(id);
  if (!item) return closeProductPage(false);
  const category = state.categories.find(entry => entry.id === item.category);
  const images = productImages(item);
  const main = images[0] || "logo.png";
  const quantity = cartQuantity(item.id);
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
      <div><small>${escapeHtml(productName(item))}</small><strong class="detail-price">${productPriceMarkup(item)}</strong></div>
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
  const productPage = $("#productPage");
  if (productPage.contains(document.activeElement)) $("#headerCart")?.focus({ preventScroll: true });
  state.detailProductId = "";
  productPage.classList.add("hidden");
  productPage.setAttribute("aria-hidden", "true");
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
  if (authMode === "login") { pendingCartProductId = ""; pendingCartAnchor = null; }
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
    authPhone = normalizePhone(authPhone || $("#loginPhone")?.value);
    if (authPhone.length !== 8) return setAuthMessage(tr("invalidPhone"));
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
    const data = await orderingApi(orderingConfig.sendLoginCodeWebhookUrl, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: authPhone })
    });
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
    const data = await orderingApi(orderingConfig.verifyLoginCodeWebhookUrl, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: authPhone, code })
    });
    if (!data.ok) throw new Error(data.error || tr("invalidCode"));
    clearInterval(resendTimer);
    if (authMode === "changePhone" && state.user) {
      const profiles = readJson(PROFILE_KEY, {});
      const previousPhone = state.user.phone;
      const previousCart = { ...state.cart };
      state.user.phone = authPhone;
      saveCustomerSession(data, authPhone);
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
    saveCustomerSession(data, authPhone);
    await hydrateUserFromServer();
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
  reportVisitorPresence();
  renderCartBar();
  syncAllProductQuantityControls();
  if (pendingCartProductId) {
    const id = pendingCartProductId;
    const anchor = pendingCartAnchor;
    pendingCartProductId = "";
    pendingCartAnchor = null;
    requestAddToCart(id, anchor);
  }
}

async function logout() {
  persistCart();
  clearTimeout(userSyncTimer);
  try {
    await syncUserToServer();
  } catch (error) {
    console.error("Server profile sync before logout failed", error);
  }
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("figsOlivesCustomerSession");
  forgetRememberedSession();
  customerSessionToken = "";
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
  let confirmedAreaName = selectedArea?.name || "";
  const areaLabel = area => state.lang === "ar" ? (area.nameAr || area.name) : (area.nameEn || area.nameAr || area.name);
  const areaFieldLabel = () => selectedArea
    ? (state.lang === "ar" ? "المنطقة" : "Area")
    : tr("areaSearch");
  const resultsHtml = query => {
    const normalizedQuery = String(query || "").trim();
    if (!normalizedQuery) return "";
    return state.areas.filter(area => [area.name, area.nameAr, area.nameEn].filter(Boolean).some(name => name.toLocaleLowerCase().includes(normalizedQuery.toLocaleLowerCase()))).slice(0, 60).map(area =>
      `<button type="button" class="${selectedArea?.name === area.name ? "selected" : ""}" data-pick-area="${escapeHtml(area.name)}"><span class="area-name">${selectedArea?.name === area.name ? "<i>✓</i>" : ""}${escapeHtml(areaLabel(area))}</span><b>${money(area.price)}</b></button>`
    ).join("");
  };
  const areaPickerHtml = () => {
    const confirmedArea = selectedArea || (confirmedAreaName ? state.areas.find(area => area.name === confirmedAreaName) : null);
    if (confirmedArea) return `
    <div class="confirmed-area">
      <span class="confirmed-area-check" aria-hidden="true">✓</span>
      <div><strong>${escapeHtml(areaLabel(confirmedArea))}</strong><small>${tr("deliveryFee")}: ${money(confirmedArea.price)}</small></div>
      <button type="button" class="edit-area-button" id="editAddressArea">${tr("edit")}</button>
    </div>`;
    return `
    <input id="addressAreaSearch" value="${escapeHtml(areaQuery)}" placeholder="${tr("areaSearch")}" autocomplete="off">
    <div class="area-results${areaResults ? "" : " hidden"}" id="addressAreaResults">${areaResults}</div>
    ${pendingArea ? `<div class="area-confirmation" role="dialog" aria-modal="true" aria-labelledby="area-confirm-title">
      <div class="area-confirm-card"><span class="area-confirm-icon" aria-hidden="true">⌖</span>
        <h3 id="area-confirm-title">${state.lang === "ar" ? `هل تريد اختيار منطقة ${escapeHtml(areaLabel(pendingArea))}؟` : `Do you want to choose ${escapeHtml(areaLabel(pendingArea))}?`}</h3>
        <p>${tr("deliveryFee")}: ${money(pendingArea.price)}</p>
        <div class="area-confirm-actions"><button type="button" class="primary" id="confirmAddressArea" data-confirm-area="${escapeHtml(pendingArea.name)}">${state.lang === "ar" ? "نعم" : "Yes"}</button><button type="button" class="secondary" id="cancelAddressArea">${state.lang === "ar" ? "لا" : "No"}</button></div>
      </div>
    </div>` : ""}`;
  };
  $("#accountContent").innerHTML = `${drawerPageHeader(existing ? tr("edit") : tr("addAddress"))}
    <form class="address-form" id="addressForm">
      <label><span id="addressAreaLabel">${areaFieldLabel()}</span>
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
    const label = $("#addressAreaLabel");
    if (label) label.textContent = areaFieldLabel();
    const picker = $("#addressAreaPicker");
    picker.innerHTML = areaPickerHtml();
    const confirmPendingArea = areaName => {
      const confirmedArea = state.areas.find(area => area.name === areaName) || pendingArea;
      if (!confirmedArea) return;
      selectedArea = { ...confirmedArea };
      confirmedAreaName = confirmedArea.name;
      pendingArea = null;
      areaQuery = "";
      areaResults = "";
      renderAreaPicker();
    };
    picker.onclick = event => {
      const target = event.target.closest("button");
      if (!target) return;

      const pickedAreaName = target.dataset.pickArea;
      if (pickedAreaName) {
        pendingArea = state.areas.find(area => area.name === pickedAreaName) || null;
        renderAreaPicker();
        return;
      }

      if (target.id === "confirmAddressArea") {
        confirmPendingArea(target.dataset.confirmArea);
        return;
      }

      if (target.id === "cancelAddressArea") {
        pendingArea = null;
        renderAreaPicker();
        return;
      }

      if (target.id === "editAddressArea") {
        selectedArea = null;
        confirmedAreaName = "";
        pendingArea = null;
        areaQuery = "";
        areaResults = "";
        renderAreaPicker();
        $("#addressAreaSearch")?.focus();
      }
    };
    $("#confirmAddressArea")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      confirmPendingArea(event.currentTarget.dataset.confirmArea);
    });
    $("#addressAreaSearch")?.addEventListener("input", event => {
      areaQuery = event.target.value;
      areaResults = resultsHtml(areaQuery);
      const results = $("#addressAreaResults");
      results.innerHTML = areaResults;
      results.classList.toggle("hidden", !areaResults);
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

function renderOrders({ refresh = true } = {}) {
  if (refresh) refreshCustomerOrders().then(updated => {
    if (updated) renderOrders({ refresh: false });
  });
  $("#accountDrawer").classList.remove("order-detail-mode");
  const orders = (state.user.orders || []).map(normalizeLegacyOrder).sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  state.user.orders = orders;
  persistUser();
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

async function renderOrderDetails(orderId, fromSuccess = false) {
  let order = (state.user?.orders || []).map(normalizeLegacyOrder).find(item => item.orderId === orderId) ||
    (state.lastInvoice?.orderId === orderId ? state.lastInvoice : null);
  if (!order) return renderOrders();
  order = await canonicalOnlineOrder(order);
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
  delete $("#checkoutModal").dataset.tableFlow;
  $("#closeCheckout").textContent = "×";
  $("#closeCheckout").classList.remove("table-back-button");
  $("#steps").classList.remove("hidden");
  $("#checkoutModal").classList.remove("hidden");
  renderCheckout();
}

function setSteps() {
  const tableBooking = tableReservationActive();
  $("#steps").classList.toggle("table-booking-steps", tableBooking);
  $$(".steps [data-step]").forEach(element => {
    const step = Number(element.dataset.step);
    element.hidden = tableBooking && (step === 2 || step === 3);
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

function hasMinimumOrderValue() {
  return subtotal() >= 5;
}

function minimumOrderNotice() {
  return state.lang === "ar" ? "أقل قيمة لقبول الطلب: 5 د.ك" : "Minimum order value: 5 KWD";
}

function renderReview() {
  $("#checkoutBody").innerHTML = `
    <section class="checkout-review"><div class="cart-list">${cartItems().map(({ cartKey, product: item, quantity, note, options }) => { const minimumIssue = cartItemMinimumIssue({ product: item, quantity, options }); const fillingIssue = cartItemFillingIssue({ product: item, quantity, options }); return `
      <div class="cart-row ${minimumIssue || fillingIssue ? "minimum-order-warning" : ""}"><img src="${escapeHtml(thumbnailUrl(productImages(item)[0]) || "logo.png")}" alt="">
        <div class="cart-copy"><h4>${escapeHtml(cartDisplayName(item, options))}</h4>${cartDetailOptions(item, options).length ? `<small class="cart-options">${escapeHtml(cartDetailOptions(item, options).map(optionSummary).join("، "))}</small>` : ""}${minimumIssue ? `<small class="minimum-order-warning-note">${escapeHtml(minimumOrderText(minimumIssue.minimum))}</small>` : ""}${fillingIssue ? `<small class="minimum-order-warning-note">${escapeHtml(state.lang === "ar" ? `الحشوات: ${new Intl.NumberFormat("ar-KW").format(fillingIssue.selectedQuantity)} من ${new Intl.NumberFormat("ar-KW").format(fillingIssue.required)}. احذف هذا الصنف وأضفه مجدداً لتوزيع الحشوات بدقة.` : `Fillings: ${fillingIssue.selectedQuantity} of ${fillingIssue.required}. Remove this item and add it again to distribute fillings correctly.`)}</small>` : ""}<strong>${money(selectionFlowTotal(item, options, quantity))}</strong></div><label class="cart-note-label"><textarea aria-label="${state.lang === "ar" ? "ترك ملاحظة" : "Leave a note"}" data-cart-note="${escapeHtml(cartKey)}" maxlength="240" placeholder="${state.lang === "ar" ? "ترك ملاحظة" : "Leave a note"}">${escapeHtml(note)}</textarea></label>
        <div class="qty"><button data-plus="${escapeHtml(cartKey)}">+</button><span>${quantity}</span><button data-minus="${escapeHtml(cartKey)}">${quantity === 1 ? "×" : "−"}</button></div>
      </div>`; }).join("")}</div><div class="checkout-sticky-actions">${cartHasLongPreparationItems() ? `<p class="long-preparation-notice">${state.lang === "ar" ? "ملاحظة: يوجد في طلبك أصناف تأخذ وقت للتجهيز.. لذا يرجى العلم أنه قد يتأخر طلبك أو يتم تأجيله." : "Note: Your order includes items that need extra preparation time, so it may be delayed or rescheduled."}</p>` : ""}${totalsHtml()}<button class="primary" id="next1">${tr("confirmContinue")}</button></div></section>`;
  $$('[data-cart-note]').forEach(input => input.onchange = () => updateCartNote(input.dataset.cartNote, input.value));
  $("#next1").onclick = () => {
    if (!cartCount()) return toast(state.lang === "ar" ? "لا يمكن المتابعة وسلتك فارغة" : "You cannot continue with an empty cart");
    if (cartItems().some(cartItemMinimumIssue)) return toast(state.lang === "ar" ? "ارجو إكمال كمية المنتج المطلوبة" : "Please complete the required product quantity", "error");
    if (cartItems().some(cartItemFillingIssue)) return toast(state.lang === "ar" ? "عدد الحشوات لا يطابق الحجم المختار. عدّل الصنف الظاهر بالتنبيه أولاً." : "The fillings count does not match the selected size. Please correct the highlighted item first.", "error");
    if (!hasMinimumOrderValue()) return toast(minimumOrderNotice(), "error");
    state.step = tableReservationActive() ? 4 : 2;
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
  const restaurantPickup = state.mode === "pickup" && cartHasRestaurantItems();
  if (restaurantPickup && state.branch !== "abu") state.branch = "";
  const addresses = state.user.addresses || [];
  const deliveryForm = addresses.length ? `
    <h3>${tr("selectAddress")}</h3><div class="checkout-addresses">${addresses.map(address => `
      <button class="checkout-address ${state.addressId === address.id ? "selected" : ""}" data-checkout-address="${escapeHtml(address.id)}">
        <span class="radio">${state.addressId === address.id ? "✓" : ""}</span><div><strong>${escapeHtml(address.areaName)} — ${money(address.price)}</strong><small>${escapeHtml(address.details)}</small></div>
      </button>`).join("")}</div><button class="add-address-button" id="checkoutAddAddress">＋ ${tr("addAddress")}</button>` :
    `<div class="empty-state">${accountIcons.address}<h3>${tr("noAddedAddresses")}</h3><button class="primary" id="checkoutAddAddress">＋ ${tr("addAddress")}</button></div>`;
  const pickupForm = `${restaurantPickup ? `<p class="pickup-restaurant-notice" role="alert">أصناف المطعم يتم استلامها من فرع أبو الحصانية فقط</p>` : ""}<div class="branches">${branches.map(branch => {
    const unavailable = restaurantPickup && branch.id !== "abu";
    return `
    <button class="option branch-option ${state.branch === branch.id ? "selected" : ""} ${unavailable ? "unavailable" : ""}" data-branch="${branch.id}" aria-disabled="${unavailable}">
      <span class="radio"></span>
      <div class="branch-main"><strong>${escapeHtml(branchField(branch, "name"))}</strong><b>${escapeHtml(branchField(branch, "brand"))}</b></div>
      <div class="branch-meta"><small>${escapeHtml(branchField(branch, "address"))}</small><small class="branch-phone">${escapeHtml(branch.phone)}</small></div>
    </button>`;
  }).join("")}</div>`;
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
  $$("[data-branch]").forEach(button => button.onclick = () => {
    if (button.getAttribute("aria-disabled") === "true") return toast(state.lang === "ar" ? "أصناف المطعم يتم استلامها من فرع أبو الحصانية فقط" : "Restaurant items can only be picked up from Abu Al Hasaniya branch", "error");
    state.branch = button.dataset.branch; state.paymentRequestId = ""; renderDelivery();
  });
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

function isWithinPickupHours(value) {
  const minutes = minutesSinceMidnight(value);
  return minutes >= 8 * 60 && minutes <= 22 * 60 + 30;
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
      ${state.mode === "pickup" && specific ? `<p class="pickup-hours-warning">${tr("pickupHoursNotice")}</p>` : ""}
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
      if (state.mode === "pickup" && !isWithinPickupHours(selected)) return toast(tr("pickupHoursNotice"), "error");
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
        ${tableReservationActive() ? `<div class="summary-box"><span class="summary-icon">⌂</span><span><small>حجز طاولة</small><strong>${escapeHtml(`${state.tableReservation.people} أشخاص — ${state.tableReservation.date} ${state.tableReservation.hour}:${state.tableReservation.minute} ${state.tableReservation.period === "am" ? "صباحاً" : "مساءً"}`)}</strong></span></div>` : `<div class="summary-box"><span class="summary-icon">${accountIcons.address}</span><span><small>${state.mode === "delivery" ? tr("deliveryAddress") : tr("pickupBranch")}</small><strong>${escapeHtml(deliverySummary())}</strong></span></div><div class="summary-box"><span class="summary-icon">${accountIcons.clock}</span><span><small>${state.mode === "pickup" ? tr("pickupTime") : tr("deliveryTime")}</small><strong class="delivery-time-lines">${deliveryTimeSummaryMarkup()}</strong></span></div>`}
      </div>
      <div class="price-summary">
        <button class="price-row products-toggle" id="productsToggle"><span><b class="arrow">‹</b> ${tr("productsTotal")}</span><strong>${money(subtotal())}</strong></button>
        <div class="confirmation-products hidden" id="confirmationProducts">${cartItems().map(({ product: item, quantity, options }) => `
          <div class="confirmation-product"><img src="${escapeHtml(thumbnailUrl(productImages(item)[0]) || "logo.png")}" alt=""><span>${escapeHtml(productName(item))} × ${quantity}</span><b>${money(selectionFlowTotal(item, options, quantity))}</b></div>`).join("")}</div>
        ${tableReservationActive() ? "" : `<div class="price-row"><span>${tr("deliveryFee")}</span><strong>${money(deliveryFee())}</strong></div>`}
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
  if (state.paymentMethod === "knet" && total() < .100) {
    return paymentError(state.lang === "ar" ? "الحد الأدنى للدفع عبر KNET هو 0.100 د.ك. زد كمية المنتج أو اختر Apple Pay." : "KNET requires a minimum order of 0.100 KWD. Increase the quantity or use Apple Pay.");
  }
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
    items: cartItems().map(({ product: item, quantity, note, options }) => ({ id: String(item.id), quantity, note, options })),
    delivery: { mode: state.mode, areaName: state.area?.name || "", branchId: state.branch || "", address: state.address || "" },
    paymentMethod,
    tableReservation: tableReservationActive() ? state.tableReservation : null,
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
  state.order = pending.orderId || "";
  if (saved.lang && saved.lang !== state.lang) setLanguage(saved.lang);
  persistCart();
  renderCartBar();
}

async function finishOrder() {
  if (!cartCount()) return paymentError(state.lang === "ar" ? "لا يمكن إنشاء طلب من سلة فارغة" : "Cannot create an order from an empty cart");
  if (!state.user?.name || normalizePhone(state.user.phone).length !== 8) return openAuth("login");
  const incompleteItem = cartItems().find(cartItemMissingRequiredChoice);
  if (incompleteItem) return resolveMissingCartChoice(incompleteItem);
  if (cartItems().some(cartItemMinimumIssue)) return paymentError(state.lang === "ar" ? "ارجو إكمال كمية المنتج المطلوبة" : "Please complete the required product quantity");
  if (cartItems().some(cartItemFillingIssue)) return paymentError(state.lang === "ar" ? "عدد الحشوات لا يطابق الحجم المختار. عدّل الصنف قبل متابعة الدفع." : "The fillings count does not match the selected size. Please correct the item before payment.");
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
    const data = await orderingApi(orderingConfig.paymentWebhookUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload(state.paymentMethod)), signal: controller.signal
    }, true);
    if (!data.ok) throw new Error(data.error || tr("createFailed"));
    const target = new URL(data.paymentUrl);
    if (!isAllowedPaymentGatewayUrl(target)) throw new Error(tr("invalidSecureLink"));
    state.order = data.orderId || "";
    const pending = pendingSnapshot({
      orderId: state.order, paymentReference: data.paymentReference || data.orderId || "", statusToken: data.statusToken || "", paymentUrl: target.href,
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
  while (version === paymentWatchVersion && Date.now() - started < 5 * 60 * 1000) {
    if (!firstCheck) await delay(5000);
    firstCheck = false;
    try {
      const data = await orderingApi(orderingConfig.paymentStatusWebhookUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentReference: pending.paymentReference || pending.orderId, statusToken: pending.statusToken })
      }, true);
      if (!data.ok) throw new Error(data.error || "Verification failed");
      errors = 0;
      if (data.status === "paid") {
        if (data.orderId) {
          state.order = data.orderId;
          pending.orderId = data.orderId;
        }
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
    if (!(pending.paymentReference || pending.orderId) || !pending.statusToken || !pending.paymentUrl) throw new Error("Invalid payment state");
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
    orderId: state.order, catalogType: cartHasRestaurantItems() ? "restaurant" : "bakery", createdAt: approvedAt, customerName: state.user?.name || state.name,
    phone: state.user?.phone || state.phone, mode: state.mode, areaName: state.area?.name || "",
    address: state.address, branchId: state.branch,
    deliveryTiming: state.deliveryTiming,
    scheduledAt: scheduled?.getTime() || null,
    expectedStart: asapWindow?.start.getTime() || null,
    expectedEnd: asapWindow?.end.getTime() || null,
    items: cartItems().map(({ product: item, quantity, note, options }) => ({ id: String(item.id), nameAr: cartDisplayName(item, options, "ar"), nameEn: cartDisplayName(item, options, "en"), preparation: item.preparation || null, quantity, note, options, unitPrice: unitPrice(item, options), total: unitPrice(item, options) * quantity })),
    subtotal: subtotal(), deliveryFee: deliveryFee(), total: total(), paymentMethod: state.paymentMethod || "knet", status: "paid"
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
  // لا ننتظر الإرسال حتى لا تتأخر صفحة نجاح الطلب؛ الفاتورة نفسها تُولّد من قالب A4 الحالي.
  sendInvoiceToWhatsApp(order);
  state.cart = {};
  persistCart();
  renderCartBar();
  syncAllProductQuantityControls();
  const tableBooked = tableReservationActive();
  $("#checkoutTitle").textContent = tableBooked ? "تم حجز الطاولة" : tr("received");
  $("#checkoutBody").innerHTML = `<div class="success"><div class="check">✓</div><h3>${tableBooked ? "تم حجز الطاولة" : tr("received")}</h3><p>${tr("orderNumber")}</p><strong class="order-no">${escapeHtml(state.order)}</strong>${tableBooked ? `<div class="success-delivery-time"><small>موعد الحجز</small><strong>${escapeHtml(`${state.tableReservation.date} ${state.tableReservation.hour}:${state.tableReservation.minute}`)}</strong></div>` : `<div class="success-delivery-time"><small>${order.mode === "pickup" ? tr("pickupStatus") : tr("expectedDeliveryTime")}</small><strong>${escapeHtml(deliveryTimeSummary(order))}</strong></div>`}<div class="actions" style="width:min(420px,100%)"><button class="secondary" id="newOrder">${tr("backStore")}</button><button class="primary" id="orderDetailsButton">${tr("viewOrderDetails")}</button></div></div>`;
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

function invoiceDeliveryTime(order) {
  if (!order.scheduledAt) return escapeHtml(deliveryTimeSummary(order));
  const end = new Date(order.scheduledAt), start = new Date(end.getTime() - 60 * 60 * 1000);
  const date = new Intl.DateTimeFormat("ar-KW", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(end);
  const time = value => new Intl.DateTimeFormat("ar-KW", { hour: "numeric", minute: "2-digit" }).format(value);
  return `وقت التوصيل المحدد:<br>${date}،<br>بين ${time(start)} إلى ${time(end)}`;
}

function buildInvoice(order) {
  const pickup = branches.find(branch => branch.id === order.branchId);
  const destination = order.mode === "delivery" ? `${order.areaName || ""} - ${order.address || ""}` : `${state.lang === "ar" ? "استلام من" : "Pickup from"} ${pickup ? branchField(pickup, "name") : ""}`;
  const locale = state.lang === "ar" ? "ar-KW" : "en-GB";
  const createdAt = new Date(order.createdAt);
  const customerLine = [order.customerName || tr("customer"), order.phone || "—", destination].filter(Boolean).map(escapeHtml).join("&nbsp; · &nbsp;");
  const deliveryTime = invoiceDeliveryTime(order);
  const productsValue = Number.isFinite(Number(order.subtotal)) ? Number(order.subtotal) : Math.max(0, Number(order.total || 0) - Number(order.deliveryFee || 0));
  $("#invoice").innerHTML = `<section class="a4-invoice"><header class="a4-head"><img src="logo.png" alt=""><div><h1>فاتورة شراء</h1><p>Purchase Invoice</p></div></header><section class="a4-meta"><div><b>رقم الفاتورة</b><strong>#${escapeHtml(order.orderId)}</strong><b>تاريخ الإصدار</b><strong>${createdAt.toLocaleDateString(locale)}</strong></div><div class="a4-company">شركة صحي ولذيذ للتجهيزات الغذائية<br>حولي، شارع تونس، مجمع علي فهد الخالد، دور الميزانين<br><span dir="ltr">66906605 · 22085888</span></div></section><p class="a4-customer-line">${customerLine}</p><table class="a4-items"><thead><tr><th>#</th><th>الصنف</th><th>الملاحظات</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${order.items.map((item, index) => { const detailOptions = (item.options || []).filter(option => !option?.nameSuffix); return `<tr><td>${index + 1}</td><td><b>${escapeHtml(item.nameAr || item.nameEn || item.id)}</b><small dir="ltr">${escapeHtml(item.nameEn || item.nameAr || item.id)}</small>${detailOptions.length ? `<small>${escapeHtml(detailOptions.map(optionSummary).join("، "))}</small>` : ""}</td><td>${escapeHtml(item.note || "—")}</td><td>${item.quantity}</td><td>${money(item.unitPrice || (item.total / item.quantity))}</td><td><b>${money(item.total)}</b></td></tr>`; }).join("")}</tbody></table>${invoicePreparationNotice(order)}<section class="a4-summary-row"><section class="a4-delivery-time"><small>${order.mode === "pickup" ? tr("pickup") : tr("deliveryTime")}</small><strong>${order.mode === "pickup" ? destination : deliveryTime}</strong></section><section class="a4-total"><span><b>${tr("productsTotal")}</b><strong>${money(productsValue)}</strong></span><span><b>${tr("deliveryFee")}</b><strong>${money(order.deliveryFee)}</strong></span><span class="a4-grand-total"><b>${tr("total")}</b><strong>${money(order.total)}</strong></span></section></section><div class="a4-paid">✓&nbsp; مدفوع: ${escapeHtml(String(order.paymentMethod || "KNET").toUpperCase())}</div></section>`;
  $("#invoice").setAttribute("dir", state.lang === "ar" ? "rtl" : "ltr");
  const phoneLabel = $("#invoice .a4-phone");
  if (phoneLabel) phoneLabel.textContent = `☎︎ ${order.phone || "—"}`;
}

async function createInvoiceFile(order) {
    const cacheKey = `${order.orderId}:${order.paymentMethod || "knet"}:${order.updatedAt || order.paidAt || ""}:${state.lang}`;
    if (invoiceFileCache.has(cacheKey)) return invoiceFileCache.get(cacheKey);
    const promise = (async () => {
      buildInvoice(order);
      if (!window.html2canvas || !window.jspdf?.jsPDF) throw new Error("PDF libraries unavailable");
      await document.fonts?.ready;
    const invoiceNode = $("#invoice .a4-invoice");
    if (!invoiceNode) throw new Error("Invoice template unavailable");
    const logo = invoiceNode.querySelector("img");
    if (logo?.decode) await logo.decode().catch(() => undefined);
    const canvas = await html2canvas(invoiceNode, { scale: 2, backgroundColor: "#fff", useCORS: true, logging: false });
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
    while (remaining > 0.5) {
      pdf.addPage();
      // The first page starts at 10mm. Subsequent pages start at the exact
      // next image position, otherwise the last 10mm is duplicated.
      y = -(imageHeight - remaining);
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

async function sendInvoiceToWhatsApp(order) {
  const endpoint = String(orderingConfig.invoiceWhatsappWebhookUrl || "").trim();
  if (!endpoint || !order?.orderId || !normalizePhone(order.phone)) return;
  try {
    const file = await createInvoiceFile(order);
    const pdfBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = () => reject(reader.error || new Error("Could not read invoice PDF"));
      reader.readAsDataURL(file);
    });
    if (!pdfBase64) throw new Error("Invoice PDF is empty");
    await orderingApi(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        orderId: String(order.orderId),
        phone: `965${normalizePhone(order.phone)}`,
        pdfBase64
      })
    }, true);
  } catch (error) {
    // يبقى إتمام الطلب مستقلاً عن الإشعار؛ الفشل هنا لا يوقف دفع العميل أو حفظ طلبه.
    console.warn("Could not send invoice through WhatsApp workflow", error);
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
    const file = await createInvoiceFile(await canonicalOnlineOrder(order));
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
const whatsappWidget = $("#whatsappWidget");
const whatsappToggle = $("#whatsappToggle");
if (matchMedia("(max-width: 760px)").matches) Object.assign(whatsappWidget.style, { position: "fixed", left: "auto", right: "0", insetInlineStart: "auto", insetInlineEnd: "0" });
function setWhatsAppMenu(open) {
  whatsappWidget.classList.toggle("open", open);
  whatsappToggle.setAttribute("aria-expanded", String(open));
  $("#whatsappMenu").setAttribute("aria-hidden", String(!open));
}
whatsappToggle.onclick = event => { event.stopPropagation(); setWhatsAppMenu(!whatsappWidget.classList.contains("open")); };
document.addEventListener("click", event => { if (!whatsappWidget.contains(event.target)) setWhatsAppMenu(false); });
document.addEventListener("keydown", event => { if (event.key === "Escape") setWhatsAppMenu(false); });
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
    requestAddToCart(addButton.dataset.searchAdd, addButton);
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
  if (event.target.closest("#categoryMenuToggle")) { event.stopPropagation(); toggleCategoryMenu(); return; }
  const coverSubButton = event.target.closest("[data-cover-sub]");
  if (coverSubButton) { const [headingId, subheadingId] = coverSubButton.dataset.coverSub.split("|"); const heading = (state.headings || []).find(item => item.id === headingId); const group = heading?.subheadings?.find(item => item.id === subheadingId); const category = (group?.categoryIds || []).find(id => categoryProducts(id).length); state.activeHeadingId = headingId; state.activeSubheadingId = subheadingId; state.activeCategory = category || "all"; syncActiveNavigation(); if (category) scrollToCategory(category); return; }
  const headingButton = event.target.closest("[data-heading-link]");
  if (headingButton) { const heading = (state.headings || []).find(item => item.id === headingButton.dataset.headingLink); const group = Array.isArray(heading?.subheadings) && heading.subheadings.length ? heading.subheadings[0] : { id: "", categoryIds: heading?.categoryIds || [] }; const category = group?.categoryIds?.[0]; state.activeHeadingId = headingButton.dataset.headingLink; state.activeSubheadingId = group?.id || ""; state.activeCategory = category || "all"; syncActiveNavigation(); if (category) scrollToCategory(category); return; }
  const button = event.target.closest("[data-category-link]");
  if (button) { state.activeCategory = button.dataset.categoryLink; syncActiveNavigation(); scrollToCategory(button.dataset.categoryLink); }
};
$("#categoryMenu").onclick = event => {
  event.stopPropagation();
  const groupToggle = event.target.closest("[data-menu-group-toggle]");
  if (groupToggle) { const groupElement = groupToggle.parentElement; setCategoryMenuGroup(groupElement, !groupElement.classList.contains("open")); return; }
  const button = event.target.closest("[data-menu-category]");
  if (!button) return;
  toggleCategoryMenu(false);
  state.activeCategory = button.dataset.menuCategory;
  syncActiveNavigation();
  scrollToCategory(button.dataset.menuCategory);
};
document.addEventListener("click", event => {
  if (!$("#categoryMenu")?.classList.contains("hidden") && !event.target.closest("#categoryMenu, #categoryMenuToggle")) toggleCategoryMenu(false);
});
document.addEventListener("keydown", event => { if (event.key === "Escape") toggleCategoryMenu(false); });
["resize", "scroll"].forEach(type => window.addEventListener(type, () => { if (!$("#categoryMenu")?.classList.contains("hidden")) positionCategoryMenu(); }, { passive: true }));
$("#headingNavigation").onclick = event => {
  const subheadingButton = event.target.closest("[data-subheading-nav]");
  if (subheadingButton) { const heading = currentHeading(); const group = heading?.subheadings?.find(item => item.id === subheadingButton.dataset.subheadingNav); const category = group?.categoryIds?.[0]; state.activeSubheadingId = subheadingButton.dataset.subheadingNav; state.activeCategory = category || "all"; updateHeadingNavigation(); if (category) scrollToCategory(category); return; }
  const categoryButton = event.target.closest("[data-linked-nav]");
  if (categoryButton) { state.activeCategory = categoryButton.dataset.linkedNav; syncActiveNavigation(); scrollToCategory(categoryButton.dataset.linkedNav); }
};
if ($("#catalogSwitch")) $("#catalogSwitch").onclick = event => setCatalogType(event.currentTarget.dataset.catalogTarget);
function positionProductFilterMenu() {
  if (window.matchMedia("(max-width: 760px)").matches) {
    const trigger = $("#productFilterToggle");
    const menu = $("#productFilterMenu");
    const rect = trigger.getBoundingClientRect();
    const menuMaxHeight = Math.min(300, window.innerHeight * .45);
    menu.style.top = `${Math.max(12, Math.min(window.innerHeight - menuMaxHeight - 12, rect.bottom + 8))}px`;
    menu.style.left = `${Math.max(12, rect.left)}px`;
    menu.style.right = "auto";
    menu.style.width = `${rect.width}px`;
  } else {
    const menu = $("#productFilterMenu");
    menu.style.top = "";
    menu.style.left = "";
    menu.style.right = "";
    menu.style.width = "";
  }
}
if ($("#productFilterToggle")) $("#productFilterToggle").onclick = event => {
  event.stopPropagation();
  if (state.catalogType === "restaurant") return openTableReservation();
  const menu = $("#productFilterMenu"), isNowHidden = menu.classList.toggle("hidden");
  if (!isNowHidden) positionProductFilterMenu();
  $("#productFilterToggle").setAttribute("aria-expanded", String(!isNowHidden));
};
if ($("#productFilterMenu")) $("#productFilterMenu").onclick = event => {
  const button = event.target.closest("[data-product-filter]"); if (!button) return;
  state.activeProductFilterId = button.dataset.productFilter;
  state.activeCategory = "all"; state.activeHeadingId = ""; state.activeSubheadingId = "";
  $("#productFilterMenu").classList.add("hidden"); $("#productFilterToggle").setAttribute("aria-expanded", "false");
  renderProductFilters(); renderCategories(); renderProductSections(); window.scrollTo({ top: 0, behavior: "smooth" });
};
if ($("#productFilterClear")) $("#productFilterClear").onclick = () => {
  if (state.catalogType === "restaurant") return cancelTableReservation();
  state.activeProductFilterId = ""; state.activeCategory = "all"; state.activeHeadingId = ""; state.activeSubheadingId = "";
  renderProductFilters(); renderCategories(); renderProductSections();
};
document.addEventListener("pointerdown", event => { const wrap = $("#catalogFilterWrap"); if (wrap && !wrap.contains(event.target)) { $("#productFilterMenu")?.classList.add("hidden"); $("#productFilterToggle").setAttribute("aria-expanded", "false"); } });
window.addEventListener("resize", () => { if ($("#productFilterMenu") && !$("#productFilterMenu").classList.contains("hidden")) positionProductFilterMenu(); });
function handleProductQuantityEvent(event) {
  const notify = event.target.closest("[data-availability-notify]");
  const add = event.target.closest("[data-product-add]");
  const plus = event.target.closest("[data-product-plus]");
  const minus = event.target.closest("[data-product-minus]");
  const control = notify || add || plus || minus;
  if (!control) return false;
  event.preventDefault();
  event.stopPropagation();
  if (notify) requestAvailabilityNotification(notify.dataset.availabilityNotify);
  if (add) requestAddToCart(add.dataset.productAdd, add);
  if (plus) changeQuantity(plus.dataset.productPlus, 1);
  if (minus) changeQuantity(minus.dataset.productMinus, -1);
  return true;
}

async function requestAvailabilityNotification(id) {
  const item = product(id);
  if (!item || item.availability?.status === "available") return;
  if (!state.user?.name || !state.user?.phone) { toast("سجّل دخولك أولاً ليصلك التنبيه", "error"); return openAuth("login"); }
  try {
    await orderingApi(`/availability/${encodeURIComponent(id)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: String(state.user.name).slice(0, 80), cycleId: String(item.availability?.cycleId || "") })
    }, true);
    showAvailabilityConfirmation(item);
  } catch (error) { console.error(error); toast("تعذر تسجيل طلب التنبيه", "error"); }
}

function showAvailabilityConfirmation(item) {
  const modal = document.createElement("section");
  modal.className = "availability-confirmation modal";
  modal.innerHTML = `<div class="availability-confirmation-card"><div class="check">✓</div><h2>سيتم إبلاغك عند توفر المنتج مباشرة...</h2><img src="${escapeHtml(productImages(item)[0] || "logo.png")}" alt=""><strong>${escapeHtml(productName(item))}</strong><button class="primary">حسناً</button></div>`;
  modal.querySelector("button").onclick = () => modal.remove();
  document.body.append(modal);
}

function openCategoryImageViewer(source, alt = "") {
  const viewer = document.createElement("section");
  viewer.className = "category-image-viewer";
  viewer.innerHTML = `<div class="category-image-viewer-card" role="dialog" aria-modal="true" aria-label="الصورة التوضيحية"><button type="button" class="category-image-close" aria-label="إغلاق">×</button><div class="category-image-stage"><img src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" draggable="false"></div><div class="category-image-tools"><button type="button" data-category-zoom="out" aria-label="تصغير">−</button><button type="button" data-category-zoom="reset">100%</button><button type="button" data-category-zoom="in" aria-label="تكبير">＋</button><small>اسحب الصورة للتنقل</small></div></div>`;
  const stage = $(".category-image-stage", viewer);
  const image = $("img", stage);
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  const apply = () => {
    image.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    image.style.cursor = scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in";
  };
  const setScale = value => {
    scale = Math.max(1, Math.min(4, value));
    if (scale === 1) { offsetX = 0; offsetY = 0; }
    apply();
  };
  const close = () => viewer.remove();
  $(".category-image-close", viewer).onclick = close;
  viewer.addEventListener("click", event => { if (event.target === viewer) close(); });
  $(".category-image-tools", viewer).onclick = event => {
    const action = event.target.closest("[data-category-zoom]")?.dataset.categoryZoom;
    if (!action) return;
    if (action === "in") setScale(scale + .35);
    else if (action === "out") setScale(scale - .35);
    else setScale(1);
  };
  stage.addEventListener("wheel", event => { event.preventDefault(); setScale(scale + (event.deltaY < 0 ? .22 : -.22)); }, { passive: false });
  stage.addEventListener("pointerdown", event => {
    if (scale === 1) { setScale(1.7); return; }
    dragging = true;
    startX = event.clientX - offsetX;
    startY = event.clientY - offsetY;
    stage.setPointerCapture(event.pointerId);
    apply();
  });
  stage.addEventListener("pointermove", event => {
    if (!dragging) return;
    offsetX = event.clientX - startX;
    offsetY = event.clientY - startY;
    apply();
  });
  const stopDragging = () => { dragging = false; apply(); };
  stage.addEventListener("pointerup", stopDragging);
  stage.addEventListener("pointercancel", stopDragging);
  document.body.append(viewer);
  apply();
}
$("#productSections").onclick = event => {
  if (handleProductQuantityEvent(event)) return;
  const illustration = event.target.closest("[data-category-illustration]");
  if (illustration) return openCategoryImageViewer(illustration.dataset.categoryIllustration, illustration.querySelector("img")?.alt || "");
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
const closeProductOptionsButton = $("#closeProductOptions");
const confirmProductOptionsButton = $("#confirmProductOptions");
const productOptionsModal = $("#productOptionsModal");
if (closeProductOptionsButton) closeProductOptionsButton.onclick = closeProductOptions;
if (confirmProductOptionsButton) confirmProductOptionsButton.onclick = confirmProductOptions;
if (productOptionsModal) productOptionsModal.onclick = event => { if (event.target === productOptionsModal) closeProductOptions(); };
window.addEventListener("resize", () => { productOptionsPopover?.place?.(); syncHeadingNavigationOffset(); });
$("#checkoutBtn").onclick = openCheckout;
$("#cartSummary").onclick = openCheckout;
$("#headerCart").onclick = openCheckout;
$("#closeCheckout").onclick = () => {
  if ($("#checkoutModal").dataset.tableFlow === "choice") {
    $("#checkoutModal").classList.add("hidden");
    delete $("#checkoutModal").dataset.tableFlow;
    $("#closeCheckout").textContent = "×";
    $("#closeCheckout").classList.remove("table-back-button");
    openTableReservation();
    return;
  }
  $("#checkoutModal").classList.add("hidden");
};
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
window.addEventListener("scrollend", () => {
  if (!pendingScrollCategoryId) return;
  pendingScrollCategoryId = "";
  pendingScrollUntil = 0;
  updateCategoryFromScroll();
}, { passive: true });
window.addEventListener("hashchange", syncProductRoute);
window.addEventListener("popstate", syncProductRoute);
document.addEventListener("gesturestart", event => event.preventDefault(), { passive: false });

const overlayStateObserver = new MutationObserver(syncPageScrollLock);
["#productPage", "#productOptionsModal", "#checkoutModal", "#accountDrawer", "#authModal", "#searchPopover"].forEach(selector => {
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

reportVisitorPresence();
setInterval(reportVisitorPresence, 30000);

applyLanguage();
if (state.user) {
  state.name = state.user.name;
  state.phone = state.user.phone;
}

function applyCatalog(catalog, cache = true) {
  if (!Array.isArray(catalog?.products) || !Array.isArray(catalog?.categories) || !Array.isArray(catalog?.deliveryAreas)) return false;
  const signature = JSON.stringify([
    catalog.version || "", catalog.updatedAt || "",
    catalog.restaurantEnabled !== false,
    catalog.appearance || {}, catalog.advertisement || {},
    catalog.headings || [], catalog.productFilters || [], catalog.covers || [], catalog.qualityStrip || null,
    catalog.categories.map(category => [category.id, category.catalogType || "bakery", category.active !== false, category.order, category.nameAr, category.nameEn]),
    catalog.products.map(item => [item.id, item.catalogType || "bakery", item.active !== false, item.availability || null, item.inventory || null, item.originalPrice || 0, item.category, item.order, item.price, item.name, item.nameEn, item.image, item.options || null, item.preparation || null]),
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
  // A product belongs to the bakery or the restaurant through its category, so
  // an order that contains any restaurant-category item becomes a restaurant order.
  const categoryTypes = new Map(visibleCategories.map(category => [String(category.id), catalogTypeOf(category)]));
  visibleProducts.forEach(item => { item.catalogType = categoryTypes.get(String(item.category || "")) || catalogTypeOf(item); });
  state.restaurantEnabled = catalog.restaurantEnabled !== false;
  if (!state.restaurantEnabled && state.catalogType === "restaurant") state.catalogType = "bakery";
  renderCatalogSwitch();
  state.headings = Array.isArray(catalog.headings) ? catalog.headings : [];
  state.covers = normalizeCovers(catalog.covers);
  state.qualityStrip = catalog.qualityStrip || null;
  renderQualityStrip();
  // The address (?cover=) decides which cover page is open, so a shared link always works.
  const urlCoverId = PICKER_MODE ? "" : coverIdFromUrl();
  state.activeCoverId = state.covers.some(cover => cover.id === urlCoverId) ? urlCoverId : "";
  // Old filter links (?filter=…) open the filtered cover that was made from that filter.
  if (!state.activeCoverId && !PICKER_MODE) { const filterId = directProductFilterId(); const match = filterId && state.covers.find(cover => cover.filtered && cover.sourceFilterId === filterId); if (match) state.activeCoverId = match.id; }
  state.productFilters = Array.isArray(catalog.productFilters) ? catalog.productFilters.map((filter, index) => ({ id: String(filter.id || `filter-${index}`), nameAr: String(filter.nameAr || filter.name || ""), nameEn: String(filter.nameEn || filter.nameAr || filter.name || ""), products: (Array.isArray(filter.products) ? filter.products : []).map(entry => ({ productId: String(entry?.productId || entry?.id || entry || ""), firstStepId: String(entry?.firstStepId || ""), optionIds: Array.isArray(entry?.optionIds) ? entry.optionIds.map(String) : [], steps: (Array.isArray(entry?.steps) ? entry.steps : []).map(step => ({ stepId: String(step?.stepId || step?.id || ""), optionIds: Array.isArray(step?.optionIds) ? step.optionIds.map(String) : [] })).filter(step => step.stepId) })) })) : [];
  const directFilterId = directProductFilterId();
  if (!directFilterWasApplied && directFilterId && state.productFilters.some(filter => filter.id === directFilterId)) {
    state.activeProductFilterId = directFilterId;
    directFilterWasApplied = true;
  }
  if (!state.productFilters.some(filter => filter.id === state.activeProductFilterId)) state.activeProductFilterId = "";
  state.products = applyRestaurantProductImages(visibleProducts);
  state.areas = Array.isArray(catalog?.deliveryAreas) ? catalog.deliveryAreas : [];
  if (state.area) {
    const currentAreaName = state.area.name || state.area.nameAr;
    state.area = state.areas.find(area => (area.name || area.nameAr) === currentAreaName) || null;
  }
  applyStoreAppearance(catalog.appearance);
  renderProductFilters();
  state.advertisement = normalizeAdvertisement(catalog.advertisement);
  const visibleProductIds = new Set(visibleProducts.map(item => String(item.id)));
  let removedCartItem = false;
  Object.keys(state.cart).forEach(cartKey => {
    const entry = state.cart[cartKey];
    const productId = String(entry?.productId || cartKey.split("::")[0]);
    if (visibleProductIds.has(productId)) return;
    delete state.cart[cartKey];
    removedCartItem = true;
  });
  if (removedCartItem) persistCart();
  if (state.activeCategory !== "all" && !visibleCategoryIds.has(String(state.activeCategory))) state.activeCategory = "all";
  if (!(state.headings || []).some(item => item.id === state.activeHeadingId && isCurrentCatalog(item))) {
    state.activeHeadingId = "";
    state.activeSubheadingId = "";
  }
  if (cache) {
    try { localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(catalog)); } catch { /* يتوفر products.json كنسخة احتياطية */ }
  }
  renderCategories();
  renderProductSections();
  renderCartBar();
  syncProductRoute();
  setTimeout(() => showAdvertisement(state.advertisement), 250);
  return true;
}

async function loadLocalCatalog() {
  const [products, categories, deliveryAreas, imageMap] = await Promise.all([
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
    }),
    fetch("restaurant-product-images.json", { cache: "force-cache" }).then(response => response.ok ? response.json() : {})
  ]);
  restaurantProductImages = imageMap || {};
  return { products, categories, deliveryAreas };
}

function catalogVersion(catalog) {
  const value = catalog?.version ?? catalog?.updatedAt;
  return value === undefined || value === null || value === "" ? "" : String(value);
}

let liveCatalogVersion = null;

async function refreshCatalogFromServer() {
  try {
    const version = await orderingApi("/catalog/version").then(result => result.version, () => null);
    const catalog = await orderingApi("/catalog");
    if (version) liveCatalogVersion = version;
    return applyCatalog(catalog);
  } catch (error) {
    console.error("Server catalog refresh failed", error);
    return false;
  }
}

// Live catalog: while the page is open, changes saved in the admin panel
// (a product stopped, a price changed) reach the customer within seconds,
// without a refresh and without losing their place, open product or cart.
const CATALOG_CHECK_INTERVAL = 20000;
let catalogCheckRunning = false;

function catalogScrollAnchor() {
  if (state.detailProductId) return null;
  const limit = ($(".site-header")?.offsetHeight || 0) + ($("#categories")?.offsetHeight || 0);
  const section = $$("[data-category-section]").find(element => element.getBoundingClientRect().bottom > limit);
  return section ? { id: section.dataset.categorySection, offset: section.getBoundingClientRect().top } : null;
}

function restoreCatalogScrollAnchor(anchor) {
  if (!anchor) return;
  const section = document.querySelector(`[data-category-section="${CSS.escape(anchor.id)}"]`);
  if (section) window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - anchor.offset, behavior: "auto" });
}

async function checkCatalogUpdates() {
  if (catalogCheckRunning || document.hidden || !navigator.onLine) return;
  catalogCheckRunning = true;
  try {
    const { version } = await orderingApi("/catalog/version");
    if (!version || version === liveCatalogVersion) return;
    const firstCheck = liveCatalogVersion === null;
    liveCatalogVersion = version;
    if (firstCheck) return;
    const catalog = await orderingApi("/catalog");
    const anchor = catalogScrollAnchor();
    const cartBefore = cartCount(), openProduct = state.detailProductId;
    if (!applyCatalog(catalog)) return;
    restoreCatalogScrollAnchor(anchor);
    if (cartCount() < cartBefore) toast(state.lang === "ar" ? "تم تحديث المنتجات: أُزيل من سلتك منتج لم يعد متوفراً" : "Products updated: an item no longer available was removed from your cart", "error");
    else if (openProduct && !state.detailProductId) toast(state.lang === "ar" ? "هذا المنتج لم يعد متوفراً حالياً" : "This product is no longer available", "error");
  } catch (error) {
    console.warn("Catalog update check failed", error);
  } finally {
    catalogCheckRunning = false;
  }
}

setInterval(checkCatalogUpdates, CATALOG_CHECK_INTERVAL);
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkCatalogUpdates(); });
window.addEventListener("online", checkCatalogUpdates);

async function initializeStoreData() {
  // Do not restore the previously viewed catalogue after a refresh. Cart data
  // lives in its own local-storage key and is intentionally left unchanged.
  resetCatalogToEntry();
  const cachedCatalog = readJson(CATALOG_CACHE_KEY, null);
  let hasCatalog = applyCatalog(cachedCatalog, false);
  // Always prefer the server catalogue. This also replaces any former cached
  // cached asset links with the VPS asset URLs during the migration.
  hasCatalog = (await refreshCatalogFromServer()) || hasCatalog;
  if (!hasCatalog) hasCatalog = applyCatalog(await loadLocalCatalog());
  if (hasCatalog) resumePendingPayment();
  if (state.user?.phone) {
    rememberSession(state.user.phone);
    requestPersistentStorage();
    hydrateUserFromServer();
  } else {
    await restoreSavedCustomerSession();
  }
  trackStoreEvent("visit");
  // تحديث الكتالوج يتم عند فتح الصفحة؛ التطبيق لا يحتفظ باتصال حي.
}

initializeStoreData().catch(error => {
  console.error(error);
  $("#productSections").innerHTML = `<div class="loading">${tr("loadingError")}</div>`;
});

function hideAdvertisement() {
  const modal = $("#advertisementModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

window.closeAdvertisement = event => { event?.preventDefault(); event?.stopPropagation(); hideAdvertisement(); };
window.openAdvertisementTarget = event => {
  event?.preventDefault(); event?.stopPropagation();
  const target = $("#advertisementTarget");
  const href = target?.getAttribute("href") || "";
  hideAdvertisement();
  if (href.startsWith("#product=")) { history.pushState(null, "", href); syncProductRoute(); }
  else if (/^https?:\/\//i.test(href)) window.location.assign(href);
  return false;
};

// نستخدم pointerup و click في وضع الالتقاط حتى تستجيب النافذة على الهاتف
// حتى مع منع تمرير الصفحة خلف الإعلان.
document.addEventListener("pointerup", event => {
  const close = event.target.closest("#closeAdvertisement");
  if (close) { window.closeAdvertisement(event); return; }
  const target = event.target.closest("#advertisementTarget");
  if (!target) return;
  event.preventDefault(); event.stopPropagation();
  window.openAdvertisementTarget(event);
}, true);
document.addEventListener("click", event => {
  if (event.target === $("#advertisementModal")) hideAdvertisement();
}, true);


// ---------- وضع الاختيار (داخل الإدارة) ----------
// الإدارة ترسل المنتجات المحددة، والمنصة ترجّع المنتج اللي انضغط.
const pickerSelected = new Set();
function syncPickerMarks() {
  $$("[data-product]").forEach(card => card.classList.toggle("picker-selected", pickerSelected.has(String(card.dataset.product))));
}
if (PICKER_MODE) {
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.data?.type !== "fo-picker-state") return;
    pickerSelected.clear();
    (event.data.selected || []).forEach(id => pickerSelected.add(String(id)));
    syncPickerMarks();
  });
  document.addEventListener("click", event => {
    const card = event.target.closest(".product-card[data-product]");
    if (!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.parent?.postMessage({ type: "fo-picker-toggle", productId: String(card.dataset.product) }, location.origin);
  }, true);
  // Cards are redrawn when the catalogue or the language changes.
  new MutationObserver(syncPickerMarks).observe(document.body, { childList: true, subtree: true });
  window.parent?.postMessage({ type: "fo-picker-ready" }, location.origin);
}
