const crypto = require("node:crypto");
const https = require("node:https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");
const { defineSecret } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");

initializeApp();

const bedeMid = defineSecret("BEDE_API_MID");
const bedeSecretKey = defineSecret("BEDE_API_SECRET_KEY");
const evolutionBaseUrl = defineSecret("EVOLUTION_BASE_URL");
const evolutionApiKey = defineSecret("EVOLUTION_API_KEY");
const evolutionInstance = defineSecret("EVOLUTION_INSTANCE");
const otpHmacSecret = defineSecret("OTP_HMAC_SECRET");
const REGION = "us-central1";
// The credentials currently supplied by Bookeey are sandbox credentials.
// Switch this URL only together with production credentials issued by Bookeey.
const PAYMENT_BASE_URL = "https://demo.bookeey.com/pgapi/api/payment";
const SUCCESS_URL = "https://figsolives.online/?payment=success";
const FAILURE_URL = "https://figsolives.online/?payment=failed";
const ALLOWED_ORIGINS = new Set([
  "https://figsolives.online",
  "https://www.figsolives.online",
  "https://figsandolives.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);

function setCors(request, response) {
  const origin = request.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) response.set("Access-Control-Allow-Origin", origin);
  response.set("Vary", "Origin");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type");
  response.set("Cache-Control", "no-store");
}

function withCors(handler) {
  return async (request, response) => {
    setCors(request, response);
    if (request.method === "OPTIONS") return response.status(204).send("");
    if (request.method !== "POST") return response.status(405).json({ ok: false, error: "Method not allowed" });
    try {
      await handler(request, response);
    } catch (error) {
      const status = Number(error.status) || 500;
      logger.error("Function request error", {
        status,
        errorCode: cleanText(error.code, 120),
        errorMessage: cleanText(error.message, 500)
      });
      const message = status >= 500 ? "تعذر تنفيذ العملية حالياً. يرجى المحاولة مرة أخرى." : error.message;
      response.status(status).json({
        ok: false,
        error: message,
        message
      });
    }
  };
}

function assert(condition, message, status = 400) {
  if (condition) return;
  const error = new Error(message);
  error.status = status;
  throw error;
}

function cleanText(value, maxLength) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

function normalizeDigits(value = "") {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  return String(value)
    .replace(/[٠-٩]/g, digit => String(arabic.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(persian.indexOf(digit)));
}

function sha512(value) {
  return crypto.createHash("sha512").update(String(value), "utf8").digest("hex");
}

function safeEqual(actual, expected) {
  const a = Buffer.from(String(actual || ""));
  const b = Buffer.from(String(expected || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function otpHash(phone, code, secret) {
  return crypto.createHmac("sha256", secret).update(`${phone}:${code}`, "utf8").digest("hex");
}

function clientIpFingerprint(request, secret) {
  const forwarded = cleanText(request.get("cf-connecting-ip") || request.get("x-forwarded-for"), 128);
  const ip = forwarded.split(",")[0].trim() || "unknown";
  return crypto.createHmac("sha256", secret).update(ip, "utf8").digest("hex").slice(0, 48);
}

function sentEvents(value, now) {
  return (Array.isArray(value) ? value : [])
    .map(Number)
    .filter(timestamp => Number.isFinite(timestamp) && now - timestamp < 60 * 60 * 1000);
}

async function reserveOtpSend(ref, { limit, cooldownMs = 0, now = Date.now() }) {
  let rejection = null;
  const result = await ref.transaction(current => {
    const record = current && typeof current === "object" ? current : {};
    const events = sentEvents(record.events, now);
    const lastSentAt = Number(record.lastSentAt || 0);
    if (cooldownMs && now - lastSentAt < cooldownMs) {
      rejection = { retryAfter: Math.max(1, Math.ceil((cooldownMs - (now - lastSentAt)) / 1000)), message: "يمكن إعادة الإرسال بعد لحظات" };
      return;
    }
    if (events.length >= limit) {
      rejection = { retryAfter: Math.max(1, Math.ceil((60 * 60 * 1000 - (now - events[0])) / 1000)), message: "تم تجاوز عدد طلبات الرموز مؤقتاً. حاول لاحقاً." };
      return;
    }
    return { lastSentAt: now, events: [...events, now] };
  });
  return result.committed ? { ok: true } : { ok: false, ...rejection };
}

async function sendEvolutionOtp(phone, code) {
  const baseUrl = cleanText(evolutionBaseUrl.value(), 300).replace(/\/+$/, "");
  const instance = cleanText(evolutionInstance.value(), 120);
  assert(/^https:\/\//i.test(baseUrl) && instance, "إعداد خدمة رسائل واتساب غير مكتمل", 503);
  let response;
  try {
    response = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evolutionApiKey.value() },
      body: JSON.stringify({
        number: `965${phone}`,
        text: `رمز الدخول إلى مخبز التين والزيتون هو: *${code}*\n\nصلاحية الرمز 5 دقائق. لا تشارك الرمز مع أي شخص.`
      }),
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    logger.error("Evolution OTP request failed", { message: error.message });
    assert(false, "تعذر إرسال الرمز عبر واتساب حالياً", 502);
  }
  if (!response.ok) {
    logger.error("Evolution OTP response failed", { status: response.status });
    assert(false, "تعذر إرسال الرمز عبر واتساب حالياً", 502);
  }
}

function randomNumericReference(prefix) {
  return `${prefix}${Date.now()}${crypto.randomInt(0, 1000).toString().padStart(3, "0")}`;
}

function isAllowedPaymentUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "bookeey.com"
      || host.endsWith(".bookeey.com")
      || host === "kpay.com.kw"
      || host.endsWith(".kpay.com.kw")
      || host === "kpaytest.com.kw"
      || host.endsWith(".kpaytest.com.kw");
  } catch {
    return false;
  }
}

function paymentHash(mid, secret, merchantTxnRef, amount, txnHeader) {
  return sha512([mid, merchantTxnRef, SUCCESS_URL, FAILURE_URL, amount, "GEN", secret, txnHeader].join("|"));
}

function statusHash(mid, secret) {
  return sha512(`${mid}|${secret}`);
}

async function getCatalog() {
  const catalog = (await getDatabase().ref("orderingPlatform/catalog").get()).val();
  assert(Array.isArray(catalog?.products) && Array.isArray(catalog?.deliveryAreas), "بيانات المتجر غير متاحة", 503);
  return catalog;
}

async function validateAndPrice(body) {
  assert(body && typeof body === "object" && !Array.isArray(body), "الطلب غير صالح");
  const idempotencyKey = cleanText(body.idempotencyKey, 80);
  assert(/^[a-zA-Z0-9_-]{16,80}$/.test(idempotencyKey), "معرّف العملية غير صالح");
  const customerName = cleanText(body.customer?.name, 80);
  const phone = normalizeDigits(body.customer?.phone).replace(/\D/g, "");
  assert(customerName.length >= 2, "الاسم مطلوب");
  assert(/^\d{8}$/.test(phone), "رقم الهاتف يجب أن يتكون من 8 أرقام");
  assert(Array.isArray(body.items) && body.items.length > 0 && body.items.length <= 100, "السلة غير صالحة");
  const requestedMethod = cleanText(body.paymentMethod, 20).toLowerCase();
  const paymentMethod = requestedMethod === "applepay" ? "applepay" : "knet";
  const mode = body.delivery?.mode === "pickup" ? "pickup" : "delivery";
  const areaName = cleanText(body.delivery?.areaName, 100);
  const branchId = cleanText(body.delivery?.branchId, 40);
  assert(mode !== "delivery" || areaName, "منطقة التوصيل مطلوبة");
  assert(mode !== "pickup" || branchId, "فرع الاستلام مطلوب");

  const catalog = await getCatalog();
  const products = new Map(catalog.products.map(product => [String(product.id), product]));
  let subtotalFils = 0;
  const items = body.items.map(raw => {
    const id = cleanText(raw.id, 80);
    const quantity = Number(raw.quantity);
    assert(id && Number.isInteger(quantity) && quantity >= 1 && quantity <= 99, "كمية منتج غير صالحة");
    const product = products.get(id);
    assert(product && product.active !== false, "أحد المنتجات لم يعد متاحاً");
    const unitFils = Math.round(Number(product.price) * 1000);
    assert(Number.isFinite(unitFils) && unitFils >= 0, "سعر منتج غير صالح", 503);
    subtotalFils += unitFils * quantity;
    return { id, name: cleanText(product.name, 120), nameEn: cleanText(product.nameEn || product.name, 120), quantity, unitPrice: unitFils / 1000, total: (unitFils * quantity) / 1000 };
  });
  let deliveryFils = 0;
  if (mode === "delivery") {
    const area = catalog.deliveryAreas.find(item => cleanText(item.name, 100) === areaName);
    assert(area, "منطقة التوصيل غير موجودة");
    deliveryFils = Math.round(Number(area.price) * 1000);
    assert(Number.isFinite(deliveryFils) && deliveryFils >= 0, "سعر التوصيل غير صالح", 503);
  }
  const total = (subtotalFils + deliveryFils) / 1000;
  assert(total > 0 && total <= 5000, "إجمالي الطلب غير صالح");
  const address = cleanText(body.delivery?.address, 240);
  const deliveryTiming = cleanText(body.deliveryTime?.type, 20) === "scheduled" ? "scheduled" : cleanText(body.deliveryTime?.type, 20) === "notify" ? "notify" : "asap";
  const scheduledAt = deliveryTiming === "scheduled" ? Date.parse(body.deliveryTime?.scheduledAt || "") : 0;
  assert(deliveryTiming !== "scheduled" || Number.isFinite(scheduledAt), "موعد التوصيل غير صالح");
  return { idempotencyKey, customerName, phone, items, mode, areaName, branchId, address, deliveryTiming, scheduledAt: Number.isFinite(scheduledAt) ? scheduledAt : 0, paymentMethod, subtotal: subtotalFils / 1000, deliveryFee: deliveryFils / 1000, total };
}

function onlineOrderFromPayment(record) {
  return {
    orderId: record.orderId,
    customerName: record.customerName,
    phone: record.phone,
    items: Array.isArray(record.items) ? record.items : [],
    subtotal: Number(record.subtotal || 0),
    deliveryFee: Number(record.deliveryFee || 0),
    total: Number(record.total || 0),
    mode: record.mode === "pickup" ? "pickup" : "delivery",
    areaName: record.areaName || "",
    branchId: record.branchId || "",
    address: record.address || "",
    deliveryTiming: record.deliveryTiming || "asap",
    scheduledAt: Number(record.scheduledAt || 0),
    paymentMethod: record.paymentMethod || "knet",
    source: "platform",
    status: "new",
    createdAt: Number(record.createdAtMs || Date.now()),
    paidAt: record.paidAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function savePaidOnlineOrder(record) {
  if (!record?.orderId) return;
  const ref = getDatabase().ref(`orderingPlatform/onlineOrders/${record.orderId}`);
  const existing = (await ref.get()).val();
  await ref.update({ ...onlineOrderFromPayment(record), ...(existing?.status === "accepted" ? { status: "accepted", acceptedAt: existing.acceptedAt || new Date().toISOString() } : {}) });
}

async function nextOrderId() {
  const counterRef = getDatabase().ref("orderingPlatform/paymentMeta/nextOrderNumber");
  const result = await counterRef.transaction(current => Number(current || 1) + 1);
  const current = Number(result.snapshot.val() || 2) - 1;
  return `W${String(current).padStart(5, "0")}`;
}

function buildBedeRequest(order, mid, secret) {
  const merchantTxnRef = randomNumericReference("9");
  const txnHeader = randomNumericReference("8");
  const applePay = order.paymentMethod === "applepay";
  const amount = Number(order.total).toFixed(3);
  return {
    merchantTxnRef,
    txnHeader,
    body: {
      DBRqst: "PY_ECom",
      Do_Appinfo: { APIVer: "1.9", APPID: "", APPTyp: applePay ? "MOB" : "WEB", AppVer: "1.0", Country: "KW", DevcType: "5", HsCode: "", IPAddrs: "", MdlID: "", OS: applePay ? "iOS" : "Web", UsrSessID: "" },
      Do_MerchDtl: { BKY_PRDENUM: "ECom", FURL: FAILURE_URL, MerchUID: mid, SURL: SUCCESS_URL },
      Do_MoreDtl: { Cust_Data1: order.orderId, Cust_Data2: "", Cust_Data3: "" },
      Do_PyrDtl: { Pyr_MPhone: order.phone, ISDNCD: "965", Pyr_Name: order.customerName, address: "", city: "", country: "KW" },
      Do_TxnDtl: [{ SubMerchUID: mid, Txn_AMT: amount }],
      Do_TxnHdr: { BKY_Txn_UID: "", Merch_Txn_UID: merchantTxnRef, PayFor: "ECom", PayMethod: applePay ? "ApplePay" : "knet", Txn_HDR: txnHeader, hashMac: paymentHash(mid, secret, merchantTxnRef, amount, txnHeader) }
    }
  };
}

async function requestBedePayment(order, mid, secret) {
  const request = buildBedeRequest(order, mid, secret);
  const response = await fetch(`${PAYMENT_BASE_URL}/requestLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "FigsAndOlives-Payment/1.0" },
    body: JSON.stringify(request.body), signal: AbortSignal.timeout(30000)
  });
  const responseText = await response.text();
  let data = {};
  try { data = JSON.parse(responseText); } catch {}
  const accepted = response.ok
    && String(data.ErrorMessage || "").toLowerCase() === "success"
    && isAllowedPaymentUrl(data.PayUrl);
  if (!accepted) {
    logger.error("Bede payment link rejected", {
      httpStatus: response.status,
      contentType: cleanText(response.headers.get("content-type"), 100),
      gatewayMessage: cleanText(data.ErrorMessage, 180),
      gatewayCode: cleanText(data.ErrorCode || data.ErrorID || data.StatusCode, 80),
      responsePreview: cleanText(responseText, 300)
    });
  }
  assert(accepted, cleanText(data.ErrorMessage, 180) || "تعذر إنشاء رابط الدفع", 502);
  return { merchantTxnRef: request.merchantTxnRef, txnHeader: request.txnHeader, paymentUrl: data.PayUrl, paymentGateway: cleanText(data.PaymentGateway, 30) };
}

function getJsonWithBody(url, body) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const request = https.request(url, { method: "GET", headers: { "Content-Type": "application/json", Accept: "application/json", "Content-Length": payload.length, "User-Agent": "FigsAndOlives-Payment/1.0" }, timeout: 30000 }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch { reject(Object.assign(new Error("استجابة حالة الدفع غير صالحة"), { status: 502 })); }
      });
    });
    request.on("timeout", () => request.destroy(new Error("Bede status timeout")));
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

function publicPayment(record) {
  return { ok: true, orderId: record.orderId, paymentUrl: record.paymentUrl, paymentGateway: record.paymentGateway, paymentMethod: record.paymentMethod, amount: record.total, currency: "KWD", status: record.status, statusToken: record.statusToken };
}

exports.createBedePayment = onRequest({ region: REGION, secrets: [bedeMid, bedeSecretKey], timeoutSeconds: 60, cors: false }, withCors(async (request, response) => {
  const order = await validateAndPrice(request.body);
  const recordRef = getDatabase().ref(`orderingPlatform/paymentRequests/${order.idempotencyKey}`);
  const existing = (await recordRef.get()).val();
  if (existing?.paymentUrl) return response.json(publicPayment(existing));
  assert(!existing || Date.now() - Number(existing.createdAtMs || 0) > 60000, "يتم تجهيز رابط الدفع حالياً، يرجى المحاولة بعد لحظات", 409);
  const orderId = await nextOrderId();
  const statusToken = crypto.randomBytes(32).toString("base64url");
  const initial = { ...order, orderId, statusToken, status: "creating", createdAtMs: Date.now(), createdAt: new Date().toISOString() };
  await recordRef.set(initial);
  try {
    const bede = await requestBedePayment(initial, bedeMid.value(), bedeSecretKey.value());
    const record = { ...initial, ...bede, status: "pending", updatedAt: new Date().toISOString() };
    await recordRef.set(record);
    response.json(publicPayment(record));
  } catch (error) {
    await recordRef.update({ status: "failed", error: cleanText(error.message, 180), updatedAt: new Date().toISOString() });
    throw error;
  }
}));

exports.checkBedePayment = onRequest({ region: REGION, secrets: [bedeMid, bedeSecretKey], timeoutSeconds: 60, cors: false }, withCors(async (request, response) => {
  const orderId = cleanText(request.body?.orderId, 40);
  const statusToken = cleanText(request.body?.statusToken, 120);
  assert(orderId && statusToken, "بيانات التحقق ناقصة");
  const snapshot = await getDatabase().ref("orderingPlatform/paymentRequests").orderByChild("orderId").equalTo(orderId).limitToFirst(1).get();
  const values = snapshot.val() || {};
  const [key, record] = Object.entries(values)[0] || [];
  assert(record && safeEqual(statusToken, record.statusToken), "غير مصرح", 401);
  if (!["paid", "failed"].includes(record.status)) {
    const data = await getJsonWithBody(`${PAYMENT_BASE_URL}/paymentstatus`, { Mid: bedeMid.value(), MerchantTxnRefNo: [record.merchantTxnRef], HashMac: statusHash(bedeMid.value(), bedeSecretKey.value()) });
    const entries = Array.isArray(data?.PaymentStatus) ? data.PaymentStatus : [];
    const status = entries.find(item => String(item.MerchantTxnRefNo) === String(record.merchantTxnRef));
    const finalStatus = cleanText(status?.finalStatus, 30).toLowerCase();
    const nextStatus = finalStatus === "success" ? "paid" : ["failed", "cancelled"].includes(finalStatus) ? "failed" : "pending";
    if (nextStatus !== record.status) {
      record.status = nextStatus;
      record.updatedAt = new Date().toISOString();
      record.bedeStatus = finalStatus || null;
      record.statusDescription = cleanText(status?.StatusDescription, 160) || null;
      if (nextStatus === "paid") record.paidAt = record.updatedAt;
      await getDatabase().ref(`orderingPlatform/paymentRequests/${key}`).update(record);
      if (nextStatus === "paid") await savePaidOnlineOrder(record);
    }
  }
  response.json({ ok: true, orderId, status: record.status, amount: record.total, currency: "KWD", paymentMethod: record.paymentMethod });
}));

exports.acceptOnlineOrder = onRequest({ region: REGION, cors: false, invoker: "public" }, withCors(async (request, response) => {
  const orderId = cleanText(request.body?.orderId, 40);
  assert(/^W\d{5,}$/.test(orderId), "رقم الطلب غير صالح");
  const ref = getDatabase().ref(`orderingPlatform/onlineOrders/${orderId}`);
  const order = (await ref.get()).val();
  assert(order, "الطلب غير موجود", 404);
  if (order.status !== "accepted") await ref.update({ status: "accepted", acceptedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  response.json({ ok: true, orderId, status: "accepted" });
}));

exports.trackStoreEvent = onRequest({ region: REGION, cors: false, invoker: "public" }, withCors(async (request, response) => {
  const type = cleanText(request.body?.type, 40);
  const allowed = new Set(["visit", "account_created", "cart_created", "checkout_complete", "product_click", "category_click"]);
  assert(allowed.has(type), "نوع الحدث غير صالح");
  const visitorId = cleanText(request.body?.visitorId, 100);
  assert(visitorId.length >= 8, "معرّف الزيارة غير صالح");
  const customer = request.body?.customer && typeof request.body.customer === "object" ? request.body.customer : {};
  const details = request.body?.details && typeof request.body.details === "object" ? request.body.details : {};
  const event = {
    type,
    visitorId,
    customerName: cleanText(customer.name, 80),
    phone: normalizeDigits(customer.phone).replace(/\D/g, "").slice(0, 8),
    productId: cleanText(details.productId, 80),
    productName: cleanText(details.productName, 120),
    categoryId: cleanText(details.categoryId, 80),
    categoryName: cleanText(details.categoryName, 100),
    orderId: cleanText(details.orderId, 40),
    createdAt: Date.now()
  };
  await getDatabase().ref("orderingPlatform/analyticsEvents").push(event);
  response.json({ ok: true });
}));

exports.sendLoginCode = onRequest({
  region: REGION,
  secrets: [evolutionBaseUrl, evolutionApiKey, evolutionInstance, otpHmacSecret],
  timeoutSeconds: 30,
  cors: false,
  invoker: "public"
}, withCors(async (request, response) => {
  const phone = normalizeDigits(request.body?.phone).replace(/\D/g, "");
  assert(/^\d{8}$/.test(phone), "رقم الهاتف يجب أن يتكون من 8 أرقام");

  const now = Date.now();
  const secret = otpHmacSecret.value();
  const phoneRate = await reserveOtpSend(getDatabase().ref(`orderingPlatform/loginCodeRateLimits/phones/${phone}`), {
    limit: 6,
    cooldownMs: 30 * 1000,
    now
  });
  if (!phoneRate.ok) return response.status(429).json({ ok: false, retryAfter: phoneRate.retryAfter, error: phoneRate.message, message: phoneRate.message });

  const ipRate = await reserveOtpSend(getDatabase().ref(`orderingPlatform/loginCodeRateLimits/ips/${clientIpFingerprint(request, secret)}`), {
    limit: 20,
    now
  });
  if (!ipRate.ok) return response.status(429).json({ ok: false, retryAfter: ipRate.retryAfter, error: ipRate.message, message: ipRate.message });

  const code = crypto.randomInt(1000, 10000).toString();
  const record = {
    codeHash: otpHash(phone, code, secret),
    expiresAt: now + 5 * 60 * 1000,
    attempts: 0,
    createdAt: now
  };
  const codeRef = getDatabase().ref(`orderingPlatform/loginCodes/${phone}`);
  await codeRef.set(record);
  try {
    await sendEvolutionOtp(phone, code);
  } catch (error) {
    const current = (await codeRef.get()).val();
    if (current?.createdAt === record.createdAt) await codeRef.remove();
    throw error;
  }
  response.json({ ok: true, expiresIn: 300 });
}));

exports.verifyLoginCode = onRequest({
  region: REGION,
  secrets: [otpHmacSecret],
  timeoutSeconds: 30,
  cors: false,
  invoker: "public"
}, withCors(async (request, response) => {
  const phone = normalizeDigits(request.body?.phone).replace(/\D/g, "");
  const code = normalizeDigits(request.body?.code).replace(/\D/g, "");
  assert(/^\d{8}$/.test(phone), "رقم الهاتف يجب أن يتكون من 8 أرقام");
  assert(/^\d{4}$/.test(code), "رمز التحقق يجب أن يتكون من 4 أرقام");

  const now = Date.now();
  const expectedHash = otpHash(phone, code, otpHmacSecret.value());
  const codeRef = getDatabase().ref(`orderingPlatform/loginCodes/${phone}`);
  const current = (await codeRef.get()).val();
  if (!current || typeof current !== "object") {
    const error = "لا يوجد رمز تحقق نشط. أعد طلب الرمز.";
    return response.status(400).json({ ok: false, error, message: error });
  }
  if (Number(current.expiresAt || 0) < now) {
    await codeRef.remove();
    const error = "انتهت صلاحية الرمز. أعد طلب رمز جديد.";
    return response.status(400).json({ ok: false, error, message: error });
  }
  const attempts = Number(current.attempts || 0);
  if (attempts >= 5) {
    await codeRef.remove();
    const error = "تم تجاوز عدد المحاولات. أعد طلب رمز جديد.";
    return response.status(400).json({ ok: false, error, message: error });
  }
  if (!safeEqual(current.codeHash, expectedHash)) {
    const nextAttempts = attempts + 1;
    const error = nextAttempts >= 5 ? "تم تجاوز عدد المحاولات. أعد طلب رمز جديد." : "رمز التحقق غير صحيح";
    if (nextAttempts >= 5) await codeRef.remove();
    else await codeRef.update({ attempts: nextAttempts });
    return response.status(400).json({ ok: false, error, message: error });
  }

  const customToken = await getAuth().createCustomToken(`customer_${phone}`);
  await codeRef.remove();
  response.json({ ok: true, phone, customToken });
}));
