window.ORDERING_CONFIG = Object.freeze({
  // واجهة المتجر تبقى على GitHub Pages؛ الخدمات والبيانات تعمل على الـVPS.
  apiBaseUrl: "https://162-35-27-249.sslip.io/platform-api",
  paymentWebhookUrl: "/payments/create",
  paymentStatusWebhookUrl: "/payments/check",
  analyticsWebhookUrl: "/events",
  visitorPresenceWebhookUrl: "/presence",
  invoiceWhatsappWebhookUrl: "/invoices/send",
  sendLoginCodeWebhookUrl: "/auth/otp/send",
  verifyLoginCodeWebhookUrl: "/auth/otp/verify"
});
