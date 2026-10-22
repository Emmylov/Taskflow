import { ReplitConnectors } from "@replit/connectors-sdk";
import type { TaskflowOrder } from "@workspace/db";
import { getPlatformOwnerEmails } from "./ownerAccess";

const connectors = new ReplitConnectors();
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function projectLink(orderId: string, owner: boolean): string | null {
  const base = process.env.TASKFLOW_APP_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}${owner ? "/inbox/messages" : "/account/messages"}?orderId=${encodeURIComponent(orderId)}`;
}

export async function notifyOwnerOfOrder(input: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  company: string;
  totalCents: number;
  serviceNames: string[];
  requestedCustomPriceCents?: number;
  requestedCustomPriceReason?: string;
}): Promise<void> {
  const from = process.env.TASKFLOW_EMAIL_FROM ?? "TaskFlow <onboarding@resend.dev>";
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      from,
       to: await getPlatformOwnerEmails(),
      reply_to: input.customerEmail,
      subject: `New TaskFlow project request · ${input.company || input.customerName}`,
      html: `
        <h2>New TaskFlow project request</h2>
        <p><strong>${escapeHtml(input.customerName)}</strong> from <strong>${escapeHtml(input.company || "No company provided")}</strong> submitted a project.</p>
        <p><strong>Email:</strong> ${escapeHtml(input.customerEmail)}</p>
        <p><strong>Services:</strong></p>
        <ul>${input.serviceNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>
        <p><strong>Estimated project total:</strong> $${Math.round(input.totalCents / 100).toLocaleString("en-US")}</p>
        ${input.requestedCustomPriceCents ? `<p><strong>Customer proposed:</strong> $${Math.round(input.requestedCustomPriceCents / 100).toLocaleString("en-US")}<br/><strong>Reason:</strong> ${escapeHtml(input.requestedCustomPriceReason ?? "")}</p>` : ""}
        <p><strong>Order ID:</strong> ${escapeHtml(input.orderId)}</p>
        ${projectLink(input.orderId, true) ? `<p><a href="${escapeHtml(projectLink(input.orderId, true)!)}">Open the project inbox</a> to reply in the conversation and confirm the scope before sending an invoice.</p>` : "<p>Open TaskFlow to reply in the project conversation and confirm the scope before sending an invoice.</p>"}
      `,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}`);
  }
}

export async function notifyCustomerOfOrder(input: {
  order: Pick<TaskflowOrder, "customerEmail" | "customerName" | "company" | "id">;
  subject: string;
  headline: string;
  copy: string;
}): Promise<void> {
  const from = process.env.TASKFLOW_EMAIL_FROM ?? "TaskFlow <onboarding@resend.dev>";
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.order.customerEmail],
      subject: input.subject,
      html: `
        <h2>${escapeHtml(input.headline)}</h2>
        <p>${escapeHtml(input.copy)}</p>
        ${projectLink(input.order.id, false) ? `<p><a href="${escapeHtml(projectLink(input.order.id, false)!)}">Open the project workspace</a> to view the project, reply in chat, and keep the next step moving.</p>` : "<p>Open TaskFlow to view the project, reply in chat, and keep the next step moving.</p>"}
        <p><strong>Project:</strong> ${escapeHtml(input.order.company || input.order.customerName)}</p>
        <p><strong>Order ID:</strong> ${escapeHtml(input.order.id)}</p>
      `,
    }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
}

export async function notifyCustomerOfMessage(input: {
  order: Pick<TaskflowOrder, "customerEmail" | "customerName" | "company" | "id">;
  authorName: string;
  body: string;
}): Promise<void> {
  const from = process.env.TASKFLOW_EMAIL_FROM ?? "TaskFlow <onboarding@resend.dev>";
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.order.customerEmail],
      subject: `New TaskFlow message · ${input.order.company || input.order.customerName}`,
      html: `
        <h2>New message in your TaskFlow project</h2>
        <p><strong>${escapeHtml(input.authorName)}</strong> wrote:</p>
        <blockquote>${escapeHtml(input.body)}</blockquote>
        ${projectLink(input.order.id, false) ? `<p><a href="${escapeHtml(projectLink(input.order.id, false)!)}">Open your project chat</a> to reply.</p>` : "<p>Open TaskFlow to reply in your project chat.</p>"}
        <p><strong>Project:</strong> ${escapeHtml(input.order.company || input.order.customerName)}</p>
      `,
    }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
}

export async function notifyOwnerOfMessage(input: {
  order: Pick<TaskflowOrder, "customerEmail" | "customerName" | "company" | "id">;
  authorName: string;
  body: string;
}): Promise<void> {
  const from = process.env.TASKFLOW_EMAIL_FROM ?? "TaskFlow <onboarding@resend.dev>";
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: await getPlatformOwnerEmails(),
      reply_to: input.order.customerEmail,
      subject: `New TaskFlow message · ${input.order.company || input.order.customerName}`,
      html: `
        <h2>New message in a TaskFlow project</h2>
        <p><strong>${escapeHtml(input.authorName)}</strong> wrote:</p>
        <blockquote>${escapeHtml(input.body)}</blockquote>
        ${projectLink(input.order.id, true) ? `<p><a href="${escapeHtml(projectLink(input.order.id, true)!)}">Open the project inbox</a> to reply.</p>` : "<p>Open TaskFlow to reply in the project chat.</p>"}
        <p><strong>Customer:</strong> ${escapeHtml(input.order.customerName)} · ${escapeHtml(input.order.customerEmail)}</p>
        <p><strong>Order ID:</strong> ${escapeHtml(input.order.id)}</p>
      `,
    }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
}

export async function notifyOwnerOfOrderAction(input: {
  order: Pick<TaskflowOrder, "customerEmail" | "customerName" | "company" | "id">;
  headline: string;
  copy: string;
}): Promise<void> {
  const from = process.env.TASKFLOW_EMAIL_FROM ?? "TaskFlow <onboarding@resend.dev>";
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: await getPlatformOwnerEmails(),
      reply_to: input.order.customerEmail,
      subject: `TaskFlow project update · ${input.order.company || input.order.customerName}`,
      html: `
        <h2>${escapeHtml(input.headline)}</h2>
        <p>${escapeHtml(input.copy)}</p>
        ${projectLink(input.order.id, true) ? `<p><a href="${escapeHtml(projectLink(input.order.id, true)!)}">Open the project inbox</a>.</p>` : "<p>Open TaskFlow to review the project.</p>"}
        <p><strong>Project:</strong> ${escapeHtml(input.order.company || input.order.customerName)}</p>
      `,
    }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
}