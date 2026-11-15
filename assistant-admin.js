(() => {
  "use strict";
  const trigger = document.getElementById("assistantConversationsPage");
  if (!trigger) return;
  function element(tag, text) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    return node;
  }
  const dialog = element("dialog");
  dialog.dir = "rtl";
  dialog.setAttribute("aria-labelledby", "assistantConversationsTitle");
  dialog.style.cssText = "width:min(720px,94vw);max-height:85vh;border:1px solid #dfe3d8;border-radius:18px;padding:20px;color:#18352a;background:#fffefb";
  const title = element("h2", "محادثات المساعد");
  title.id = "assistantConversationsTitle";
  const close = element("button", "إغلاق");
  const back = element("button", "قائمة العملاء");
  close.className = back.className = "secondary";
  const content = element("div");
  content.setAttribute("aria-live", "polite");
  content.style.cssText = "display:grid;gap:10px;margin-top:12px";
  dialog.append(title, close, " ", back, content);
  document.body.append(dialog);
  const formatter = new Intl.DateTimeFormat("ar-KW", { timeZone: "Asia/Kuwait", dateStyle: "short", timeStyle: "short" });
  const date = at => Number.isFinite(at) && at > 0 && at < 8.64e15 ? formatter.format(at) : "";
  let requestId = 0;
  close.onclick = () => dialog.close();
  dialog.addEventListener("close", () => { requestId++; content.replaceChildren(); document.getElementById("moreActionsTrigger")?.focus(); });
  back.onclick = () => load();
  trigger.addEventListener("click", () => { if (!dialog.open) dialog.showModal(); load(); });

  function messageText(message, actions) {
    if (message.role === "user") return message.text || "";
    const lines = (message.parts || []).flatMap(part => {
      if (part.type === "text") return [part.text];
      if (part.type === "products") return (part.items || []).map(item => item.nameAr || item.nameEn);
      if (part.type === "choices") return [[part.productAr, part.titleAr, part.summaryAr, ...(part.options || []).map(option => option.ar || option)].filter(Boolean).join(" · ")];
      if (part.type === "support") return ["عُرضت بطاقة واتساب فرع التوصيل"];
      if (part.type === "cart_action") {
        const action = actions?.[part.actionId] || part;
        return [[action.nameAr, action.summaryAr, action.quantity, action.status === "confirmed" ? "أضيف للسلة" : "إجراء سلة"].filter(Boolean).join(" · ")];
      }
      if (part.type === "cart_link") return ["عُرض زر فتح السلة"];
      return [];
    });
    if (message.interrupted) lines.push("الرد ما اكتمل");
    return lines.filter(Boolean).join("\n");
  }
  async function load(customer) {
    const id = ++requestId;
    back.hidden = !customer;
    title.textContent = customer ? "محادثة العميل" : "محادثات المساعد";
    content.replaceChildren(element("p", "جاري التحميل…"));
    try {
      const response = await adminRequest("/admin/assistant/conversations" + (customer ? "/" + encodeURIComponent(customer) : ""), { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 ? "ما عندك صلاحية قراءة محادثات العملاء." : "تعذر تحميل المحادثات.");
      const data = await response.json();
      if (id !== requestId || !dialog.open) return;
      content.replaceChildren();
      if (!customer) {
        for (const row of data.customers || []) {
          const button = element("button", [row.name || "عميل", row.phone, row.messages + " رسالة", date(row.lastAt)].filter(Boolean).join(" · "));
          button.className = "secondary";
          button.onclick = () => load(row.id);
          content.append(button);
        }
        if (!content.children.length) content.append(element("p", "لا توجد محادثات محفوظة."));
        return;
      }
      title.textContent = [data.customer?.name || "العميل", data.customer?.phone].filter(Boolean).join(" · ");
      const rows = document.createDocumentFragment();
      for (const message of data.messages || []) {
        const card = element("article");
        card.style.cssText = "padding:10px 14px;border-radius:10px;background:" + (message.role === "user" ? "#eaf4ee" : "#f6f2e8");
        const body = element("div", messageText(message, data.actions));
        body.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere";
        const header = element("strong", message.role === "user" ? "العميل" : "المساعد");
        card.append(header, " · ", element("small", date(message.at)), body);
        rows.append(card);
      }
      content.append(rows);
    } catch (error) {
      if (id === requestId && dialog.open) content.replaceChildren(element("p", error.message));
    }
  }
})();
