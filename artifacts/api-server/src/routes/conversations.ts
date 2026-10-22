import { Router, type IRouter, type Response } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  CreateConversationMessageBody,
  CreateConversationMessageParams,
  CreateConversationMessageResponse,
  GetConversationMessagesParams,
  GetConversationMessagesResponse,
} from "@workspace/api-zod";
import {
  db,
  taskflowConversationsTable,
  taskflowActivityEventsTable,
  taskflowMessagesTable,
  taskflowMessageReactionsTable,
  taskflowOrdersTable,
  usersTable,
} from "@workspace/db";
import { hasPlatformAdminAccess } from "../lib/ownerAccess";
import { notifyCustomerOfMessage, notifyOwnerOfMessage } from "../lib/ownerNotifications";

const router: IRouter = Router();
async function isOwner(req: Express.Request): Promise<boolean> {
  return hasPlatformAdminAccess(req.user?.id, req.user?.email);
}

function requireUser(req: Express.Request, res: Response): req is Express.Request & Express.AuthedRequest {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to view project messages." });
    return false;
  }
  return true;
}

async function getConversation(orderId: string, req: Express.Request) {
  return db.select({
    conversation: taskflowConversationsTable,
    order: taskflowOrdersTable,
  }).from(taskflowConversationsTable)
    .innerJoin(taskflowOrdersTable, eq(taskflowOrdersTable.id, taskflowConversationsTable.orderId))
    .where(
      await isOwner(req)
        ? eq(taskflowConversationsTable.orderId, orderId)
        : and(eq(taskflowConversationsTable.orderId, orderId), eq(taskflowConversationsTable.customerUserId, req.user!.id)),
    );
}

const allowedReactions = ["👍", "❤️", "🔥", "✅", "🎉"] as const;

function messageResponse(
  message: typeof taskflowMessagesTable.$inferSelect,
  user: typeof usersTable.$inferSelect,
  orderId: string,
  readAt: Date | null,
  reactions: Array<{ emoji: string; count: number; reacted: boolean }>,
) {
  return {
    id: message.id,
    orderId,
    authorUserId: message.authorUserId,
    authorName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "TaskFlow",
    authorImageUrl: user.profileImageUrl?.startsWith("/objects/") ? `/api/storage/profile/${user.id}` : user.profileImageUrl,
    authorRole: message.authorRole,
    body: message.body,
    attachmentUrl: message.attachmentUrl,
    attachmentName: message.attachmentName,
    attachmentContentType: message.attachmentContentType,
    attachmentSize: message.attachmentSize,
    readAt,
    reactions,
    createdAt: message.createdAt,
  };
}

async function recordActivity(orderId: string, actorUserId: string | null, eventType: string, summary: string, metadata: Record<string, unknown> = {}) {
  await db.insert(taskflowActivityEventsTable).values({ orderId, actorUserId, eventType, summary, metadata });
}

async function getReactionSummary(messageIds: string[], viewerUserId: string) {
  if (!messageIds.length) return new Map<string, Array<{ emoji: string; count: number; reacted: boolean }>>();
  const rows = await db.select().from(taskflowMessageReactionsTable).where(inArray(taskflowMessageReactionsTable.messageId, messageIds));
  const grouped = new Map<string, Array<{ emoji: string; count: number; reacted: boolean }>>();
  for (const row of rows) {
    const current = grouped.get(row.messageId) ?? [];
    const existing = current.find((reaction) => reaction.emoji === row.emoji);
    if (existing) {
      existing.count += 1;
      existing.reacted ||= row.userId === viewerUserId;
    } else {
      current.push({ emoji: row.emoji, count: 1, reacted: row.userId === viewerUserId });
    }
    grouped.set(row.messageId, current);
  }
  return grouped;
}

function typingIsActive(value: Date | null, now = Date.now()): boolean {
  return Boolean(value && now - value.getTime() < 5_000);
}

router.get("/conversations/:orderId/messages", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = GetConversationMessagesParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conversation] = await getConversation(parsed.data.orderId, req);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const messages = await db.select({
    message: taskflowMessagesTable,
    user: usersTable,
  }).from(taskflowMessagesTable)
    .innerJoin(usersTable, eq(usersTable.id, taskflowMessagesTable.authorUserId))
    .where(eq(taskflowMessagesTable.conversationId, conversation.conversation.id))
    .orderBy(asc(taskflowMessagesTable.createdAt));
  const reactionSummary = await getReactionSummary(messages.map(({ message }) => message.id), req.user.id);
  const owner = await isOwner(req);
  const otherLastReadAt = owner ? conversation.conversation.customerLastReadAt : conversation.conversation.ownerLastReadAt;
  res.json(GetConversationMessagesResponse.parse(messages.map(({ message, user }) => messageResponse(
    message,
    user,
    parsed.data.orderId,
    message.authorUserId === req.user!.id ? otherLastReadAt && otherLastReadAt >= message.createdAt ? otherLastReadAt : null : null,
    reactionSummary.get(message.id) ?? [],
  ))));
});

router.post("/conversations/:orderId/messages", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const params = CreateConversationMessageParams.safeParse(req.params);
  const body = CreateConversationMessageBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Message body is invalid." });
    return;
  }
  const [conversation] = await getConversation(params.data.orderId, req);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const owner = await isOwner(req);
  const [message] = await db.insert(taskflowMessagesTable).values({
    conversationId: conversation.conversation.id,
    authorUserId: req.user.id,
    authorRole: owner ? "owner" : "customer",
    body: body.data.body.trim(),
    attachmentUrl: body.data.attachmentUrl,
    attachmentName: body.data.attachmentName,
    attachmentContentType: body.data.attachmentContentType,
    attachmentSize: body.data.attachmentSize,
  }).returning();
  await db.update(taskflowConversationsTable).set({
    lastMessageAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(taskflowConversationsTable.id, conversation.conversation.id));
  await recordActivity(params.data.orderId, req.user.id, "message", `${owner ? "TaskFlow" : "Customer"} sent a message.`, {
    messageId: message.id,
    hasAttachment: Boolean(body.data.attachmentUrl),
  });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id));
  try {
    const notification = {
      order: conversation.order,
      authorName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "TaskFlow",
      body: body.data.body.trim(),
    };
    if (owner) await notifyCustomerOfMessage(notification);
    else await notifyOwnerOfMessage(notification);
  } catch (error) {
    req.log.warn({ err: error, orderId: params.data.orderId }, "Message notification failed");
  }
  res.status(201).json(CreateConversationMessageResponse.parse(messageResponse(message, user, params.data.orderId, null, [])));
});

router.post("/conversations/:orderId/read", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const params = GetConversationMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conversation] = await getConversation(params.data.orderId, req);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const owner = await isOwner(req);
  await db.update(taskflowConversationsTable).set(
    owner
      ? { ownerLastReadAt: new Date(), updatedAt: new Date() }
      : { customerLastReadAt: new Date(), updatedAt: new Date() },
  ).where(eq(taskflowConversationsTable.id, conversation.conversation.id));
  await recordActivity(params.data.orderId, req.user.id, "read", `${owner ? "TaskFlow" : "Customer"} viewed the conversation.`);
  res.json({ ok: true });
});

router.post("/conversations/:orderId/messages/:messageId/reactions", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const params = GetConversationMessagesParams.safeParse(req.params);
  const emoji = req.body?.emoji;
  if (!params.success || typeof req.params.messageId !== "string" || !allowedReactions.includes(emoji)) {
    res.status(400).json({ error: "Reaction is invalid." });
    return;
  }
  const [conversation] = await getConversation(params.data.orderId, req);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const [message] = await db.select({ id: taskflowMessagesTable.id }).from(taskflowMessagesTable).where(and(
    eq(taskflowMessagesTable.id, req.params.messageId),
    eq(taskflowMessagesTable.conversationId, conversation.conversation.id),
  ));
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  const owner = await isOwner(req);
  const [existing] = await db.select().from(taskflowMessageReactionsTable).where(and(
    eq(taskflowMessageReactionsTable.messageId, message.id),
    eq(taskflowMessageReactionsTable.userId, req.user.id),
    eq(taskflowMessageReactionsTable.emoji, emoji),
  ));
  if (existing) {
    await db.delete(taskflowMessageReactionsTable).where(eq(taskflowMessageReactionsTable.id, existing.id));
  } else {
    await db.insert(taskflowMessageReactionsTable).values({ messageId: message.id, userId: req.user.id, emoji });
  }
  await recordActivity(params.data.orderId, req.user.id, existing ? "reaction_removed" : "reaction_added", `${owner ? "TaskFlow" : "Customer"} ${existing ? "removed" : "added"} a reaction.`, { messageId: message.id, emoji });
  res.json({ ok: true, active: !existing });
});

router.get("/orders/:orderId/activity", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const params = GetConversationMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conversation] = await getConversation(params.data.orderId, req);
  if (!conversation) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const events = await db.select().from(taskflowActivityEventsTable)
    .where(eq(taskflowActivityEventsTable.orderId, params.data.orderId))
    .orderBy(asc(taskflowActivityEventsTable.createdAt));
  res.json(events);
});

router.get("/conversations/:orderId/typing", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const params = GetConversationMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conversation] = await getConversation(params.data.orderId, req);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const now = Date.now();
  res.json({
    customerTyping: typingIsActive(conversation.conversation.customerTypingAt, now),
    ownerTyping: typingIsActive(conversation.conversation.ownerTypingAt, now),
  });
});

router.post("/conversations/:orderId/typing", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const params = GetConversationMessagesParams.safeParse(req.params);
  if (!params.success || typeof req.body?.typing !== "boolean") {
    res.status(400).json({ error: "Typing state is invalid." });
    return;
  }
  const [conversation] = await getConversation(params.data.orderId, req);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const value = req.body.typing ? new Date() : null;
  await db.update(taskflowConversationsTable).set(
    await isOwner(req)
      ? { ownerTypingAt: value, updatedAt: new Date() }
      : { customerTypingAt: value, updatedAt: new Date() },
  ).where(eq(taskflowConversationsTable.id, conversation.conversation.id));
  res.json({ ok: true });
});

export default router;