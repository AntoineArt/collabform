import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

/**
 * Collaboration API backed by Redis (ioredis).
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

function k(sessionId: string, suffix: string) {
  return `collab:${sessionId}:${suffix}`;
}

interface PresenceData {
  name: string;
  avatar: string;
  isOnline: boolean;
  currentField: string | null;
  lastSeen: number;
  cursor: { x: number; y: number; timestamp: number; viewportWidth?: number } | null;
}

// ─── GET: Poll for state + new events ───────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session") || "default";
  const afterId = parseInt(searchParams.get("after") || "-1", 10);
  const role = searchParams.get("role") || "client";
  const cursorOnly = searchParams.get("cursorOnly") === "1";

  const presKey = k(sessionId, "presence");
  const now = Date.now();

  // Get existing presence for this role to preserve currentField
  const existingRaw = await redis.hget(presKey, role);
  const myPresence: PresenceData = existingRaw
    ? JSON.parse(existingRaw)
    : {
        name: role === "seller" ? "Marie Dupont" : "Jean Martin",
        avatar: role === "seller" ? "MD" : "JM",
        isOnline: true,
        currentField: null,
        lastSeen: now,
        cursor: null,
      };
  myPresence.lastSeen = now;
  myPresence.isOnline = true;

  if (cursorOnly) {
    // Fast path: only read/write presence (no form data, no events)
    const pipeline = redis.pipeline();
    pipeline.hset(presKey, role, JSON.stringify(myPresence));
    pipeline.expire(presKey, TTL);
    pipeline.hgetall(presKey);
    const results = await pipeline.exec();

    const presenceRaw = (results?.[2]?.[1] as Record<string, string>) || {};
    const presence: Record<string, PresenceData> = {};
    const defaultPresence: Record<string, PresenceData> = {
      seller: { name: "Marie Dupont", avatar: "MD", isOnline: false, currentField: null, lastSeen: 0, cursor: null },
      client: { name: "Jean Martin", avatar: "JM", isOnline: false, currentField: null, lastSeen: 0, cursor: null },
    };
    for (const r of ["seller", "client"]) {
      const raw = presenceRaw[r];
      if (raw) {
        const p = JSON.parse(raw) as PresenceData;
        if (r !== role && now - p.lastSeen > 5000) {
          p.isOnline = false;
          p.currentField = null;
        }
        presence[r] = p;
      } else {
        presence[r] = defaultPresence[r];
      }
    }
    return NextResponse.json({ presence });
  }

  const formKey = k(sessionId, "form");
  const evtKey = k(sessionId, "events");
  const eidKey = k(sessionId, "eventId");

  // Update our presence + fetch all state using pipeline
  const pipeline = redis.pipeline();
  pipeline.hset(presKey, role, JSON.stringify(myPresence));
  pipeline.expire(presKey, TTL);
  pipeline.hgetall(formKey);
  pipeline.hgetall(presKey);
  pipeline.lrange(evtKey, 0, -1);
  pipeline.get(eidKey);
  const results = await pipeline.exec();

  // results indices: 0=hset, 1=expire, 2=hgetall(form), 3=hgetall(presence), 4=lrange, 5=get
  const formData = (results?.[2]?.[1] as Record<string, string>) || {};
  const presenceRaw = (results?.[3]?.[1] as Record<string, string>) || {};
  const events = (results?.[4]?.[1] as string[]) || [];
  const lastEventId = results?.[5]?.[1] as string | null;

  // Parse presence and check if other user is stale (>5s no poll)
  const presence: Record<string, PresenceData> = {};
  const defaultPresence: Record<string, PresenceData> = {
    seller: { name: "Marie Dupont", avatar: "MD", isOnline: false, currentField: null, lastSeen: 0, cursor: null },
    client: { name: "Jean Martin", avatar: "JM", isOnline: false, currentField: null, lastSeen: 0, cursor: null },
  };

  for (const r of ["seller", "client"]) {
    const raw = presenceRaw[r];
    if (raw) {
      const p = JSON.parse(raw) as PresenceData;
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
  const parsedEvents = events.map((e) => JSON.parse(e));
  const newEvents = parsedEvents.filter((e: { id: number }) => e.id > afterId);

  // Parse form data values (Redis returns strings)
  const parsedForm: Record<string, unknown> = {};
  for (const [field, v] of Object.entries(formData)) {
    try {
      parsedForm[field] = JSON.parse(v);
    } catch {
      parsedForm[field] = v;
    }
  }

  return NextResponse.json({
    formData: parsedForm,
    presence,
    events: newEvents,
    lastEventId: lastEventId ? parseInt(lastEventId, 10) : -1,
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

  const formKey = k(sessionId, "form");
  const presKey = k(sessionId, "presence");
  const evtKey = k(sessionId, "events");
  const eidKey = k(sessionId, "eventId");

  const now = Date.now();

  // Get existing presence
  const existingRaw = await redis.hget(presKey, role);
  const currentPresence: PresenceData = existingRaw
    ? JSON.parse(existingRaw)
    : {
        name: role === "seller" ? "Marie Dupont" : "Jean Martin",
        avatar: role === "seller" ? "MD" : "JM",
        isOnline: true,
        currentField: null,
        lastSeen: now,
        cursor: null,
      };
  currentPresence.isOnline = true;
  currentPresence.lastSeen = now;

  const pipeline = redis.pipeline();

  switch (action.type) {
    case "field-update": {
      const { field, value } = action as { field: string; value: unknown; type: string };
      pipeline.hset(formKey, field as string, JSON.stringify(value));
      pipeline.expire(formKey, TTL);
      // Atomically get next event ID and push event
      const eventId = await redis.incr(eidKey);
      pipeline.rpush(evtKey, JSON.stringify({
        id: eventId,
        type: "field-update",
        payload: { field, value, updatedBy: role },
        timestamp: now,
      }));
      pipeline.ltrim(evtKey, -200, -1);
      pipeline.expire(evtKey, TTL);
      break;
    }
    case "focus": {
      const { field } = action as { field: string; type: string };
      currentPresence.currentField = field;
      const eventId = await redis.incr(eidKey);
      pipeline.rpush(evtKey, JSON.stringify({
        id: eventId,
        type: "focus",
        payload: { field, role },
        timestamp: now,
      }));
      pipeline.ltrim(evtKey, -200, -1);
      pipeline.expire(evtKey, TTL);
      break;
    }
    case "blur": {
      currentPresence.currentField = null;
      const eventId = await redis.incr(eidKey);
      pipeline.rpush(evtKey, JSON.stringify({
        id: eventId,
        type: "blur",
        payload: { role },
        timestamp: now,
      }));
      pipeline.ltrim(evtKey, -200, -1);
      pipeline.expire(evtKey, TTL);
      break;
    }
    case "chat": {
      const { message } = action as { message: Record<string, unknown>; type: string };
      const eventId = await redis.incr(eidKey);
      pipeline.rpush(evtKey, JSON.stringify({
        id: eventId,
        type: "chat",
        payload: message,
        timestamp: now,
      }));
      pipeline.ltrim(evtKey, -200, -1);
      pipeline.expire(evtKey, TTL);
      break;
    }
    case "cursor": {
      const { x, y, viewportWidth } = action as { x: number; y: number; viewportWidth?: number; type: string };
      currentPresence.cursor = { x, y, timestamp: now, viewportWidth };
      // Cursor updates go into presence only (not events) to avoid flooding
      break;
    }
    case "step-navigate": {
      const { step } = action as { step: number; type: string };
      const eventId = await redis.incr(eidKey);
      pipeline.rpush(evtKey, JSON.stringify({
        id: eventId,
        type: "step-navigate",
        payload: { step, navigatedBy: role },
        timestamp: now,
      }));
      pipeline.ltrim(evtKey, -200, -1);
      pipeline.expire(evtKey, TTL);
      break;
    }
  }

  // Save updated presence
  pipeline.hset(presKey, role, JSON.stringify(currentPresence));
  pipeline.expire(presKey, TTL);

  await pipeline.exec();

  return NextResponse.json({ ok: true });
}
