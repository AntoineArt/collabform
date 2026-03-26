import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

/**
 * Collaboration API backed by Upstash Redis.
 *
 * Redis keys per session:
 *   collab:{sessionId}:form       → Hash of form field values
 *   collab:{sessionId}:presence   → Hash of JSON presence per role
 *   collab:{sessionId}:events     → List of JSON events (capped at 200)
 *   collab:{sessionId}:eventId    → Counter for event IDs
 *
 * All keys expire after 24h of inactivity (prototype cleanup).
 */

const TTL = 86400; // 24h

function key(sessionId: string, suffix: string) {
  return `collab:${sessionId}:${suffix}`;
}

interface PresenceData {
  name: string;
  avatar: string;
  isOnline: boolean;
  currentField: string | null;
  lastSeen: number;
}

// ─── GET: Poll for state + new events ───────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session") || "default";
  const afterId = parseInt(searchParams.get("after") || "-1", 10);
  const role = searchParams.get("role") || "client";

  const formKey = key(sessionId, "form");
  const presKey = key(sessionId, "presence");
  const evtKey = key(sessionId, "events");
  const eidKey = key(sessionId, "eventId");

  // Mark caller as online
  const now = Date.now();
  const myPresence: PresenceData = {
    name: role === "seller" ? "Marie Dupont" : "Jean Martin",
    avatar: role === "seller" ? "MD" : "JM",
    isOnline: true,
    currentField: null, // will be overridden if we have saved presence
    lastSeen: now,
  };

  // Get existing presence for this role to preserve currentField
  const existingRaw = await redis.hget(presKey, role);
  if (existingRaw) {
    const existing = (typeof existingRaw === "string" ? JSON.parse(existingRaw) : existingRaw) as PresenceData;
    myPresence.currentField = existing.currentField;
  }
  myPresence.lastSeen = now;
  myPresence.isOnline = true;

  // Pipeline: update presence + fetch all state
  await redis.hset(presKey, { [role]: JSON.stringify(myPresence) });
  await redis.expire(presKey, TTL);

  // Fetch state
  const [formData, presenceRaw, events, lastEventId] = await Promise.all([
    redis.hgetall(formKey),
    redis.hgetall(presKey),
    redis.lrange(evtKey, 0, -1),
    redis.get(eidKey),
  ]);

  // Parse presence and check if other user is stale (>5s no poll)
  const presence: Record<string, PresenceData> = {};
  const defaultPresence: Record<string, PresenceData> = {
    seller: { name: "Marie Dupont", avatar: "MD", isOnline: false, currentField: null, lastSeen: 0 },
    client: { name: "Jean Martin", avatar: "JM", isOnline: false, currentField: null, lastSeen: 0 },
  };

  for (const r of ["seller", "client"]) {
    const raw = presenceRaw?.[r];
    if (raw) {
      const p = (typeof raw === "string" ? JSON.parse(raw) : raw) as PresenceData;
      // Mark offline if no poll in 5s (and it's not the current caller)
      if (r !== role && now - p.lastSeen > 5000) {
        p.isOnline = false;
        p.currentField = null;
      }
      presence[r] = p;
    } else {
      presence[r] = defaultPresence[r];
    }
  }

  // Parse events and filter to only new ones
  const parsedEvents = (events || []).map((e) => {
    return typeof e === "string" ? JSON.parse(e) : e;
  });
  const newEvents = parsedEvents.filter((e: { id: number }) => e.id > afterId);

  // Parse form data values (Redis hgetall returns strings)
  const parsedForm: Record<string, unknown> = {};
  if (formData) {
    for (const [k, v] of Object.entries(formData)) {
      try {
        parsedForm[k] = typeof v === "string" ? JSON.parse(v) : v;
      } catch {
        parsedForm[k] = v;
      }
    }
  }

  return NextResponse.json({
    formData: parsedForm,
    presence,
    events: newEvents,
    lastEventId: (lastEventId as number) ?? -1,
  });
}

// ─── POST: Push a mutation ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId = "default", action, role } = body as {
    sessionId: string;
    action: { type: string; [key: string]: unknown };
    role: string;
  };

  const formKey = key(sessionId, "form");
  const presKey = key(sessionId, "presence");
  const evtKey = key(sessionId, "events");
  const eidKey = key(sessionId, "eventId");

  const now = Date.now();

  // Update caller presence
  const existingRaw = await redis.hget(presKey, role);
  const currentPresence: PresenceData = existingRaw
    ? (typeof existingRaw === "string" ? JSON.parse(existingRaw) : existingRaw) as PresenceData
    : {
        name: role === "seller" ? "Marie Dupont" : "Jean Martin",
        avatar: role === "seller" ? "MD" : "JM",
        isOnline: true,
        currentField: null,
        lastSeen: now,
      };
  currentPresence.isOnline = true;
  currentPresence.lastSeen = now;

  switch (action.type) {
    case "field-update": {
      const { field, value } = action as { field: string; value: unknown; type: string };
      // Store field value
      await redis.hset(formKey, { [field]: JSON.stringify(value) });
      await redis.expire(formKey, TTL);
      // Push event
      const eventId = await redis.incr(eidKey);
      await redis.rpush(evtKey, JSON.stringify({
        id: eventId,
        type: "field-update",
        payload: { field, value, updatedBy: role },
        timestamp: now,
      }));
      // Cap events list at 200
      await redis.ltrim(evtKey, -200, -1);
      await redis.expire(evtKey, TTL);
      break;
    }
    case "focus": {
      const { field } = action as { field: string; type: string };
      currentPresence.currentField = field;
      const eventId = await redis.incr(eidKey);
      await redis.rpush(evtKey, JSON.stringify({
        id: eventId,
        type: "focus",
        payload: { field, role },
        timestamp: now,
      }));
      await redis.ltrim(evtKey, -200, -1);
      await redis.expire(evtKey, TTL);
      break;
    }
    case "blur": {
      currentPresence.currentField = null;
      const eventId = await redis.incr(eidKey);
      await redis.rpush(evtKey, JSON.stringify({
        id: eventId,
        type: "blur",
        payload: { role },
        timestamp: now,
      }));
      await redis.ltrim(evtKey, -200, -1);
      await redis.expire(evtKey, TTL);
      break;
    }
    case "chat": {
      const { message } = action as { message: Record<string, unknown>; type: string };
      const eventId = await redis.incr(eidKey);
      await redis.rpush(evtKey, JSON.stringify({
        id: eventId,
        type: "chat",
        payload: message,
        timestamp: now,
      }));
      await redis.ltrim(evtKey, -200, -1);
      await redis.expire(evtKey, TTL);
      break;
    }
  }

  // Save updated presence
  await redis.hset(presKey, { [role]: JSON.stringify(currentPresence) });
  await redis.expire(presKey, TTL);

  return NextResponse.json({ ok: true });
}
