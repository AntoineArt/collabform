import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side in-memory collaboration store.
 *
 * Holds one session at a time (prototype). Each user polls GET every 500ms
 * and pushes mutations via POST. The server merges everything and each poll
 * returns only the events the caller hasn't seen yet.
 *
 * Works on any single-instance Node deployment (Railway, Render, Fly, VPS…).
 * NOT suitable for serverless / multi-instance without a shared store (Redis, etc).
 */

interface Session {
  formData: Record<string, unknown>;
  presence: Record<string, { name: string; avatar: string; isOnline: boolean; currentField: string | null; lastSeen: number }>;
  events: SessionEvent[];
  nextEventId: number;
}

interface SessionEvent {
  id: number;
  type: "field-update" | "focus" | "blur" | "chat" | "presence";
  payload: Record<string, unknown>;
  timestamp: number;
}

// In-memory store keyed by session id
const sessions = new Map<string, Session>();

function getOrCreateSession(sessionId: string): Session {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      formData: {},
      presence: {
        seller: { name: "Marie Dupont", avatar: "MD", isOnline: false, currentField: null, lastSeen: 0 },
        client: { name: "Jean Martin", avatar: "JM", isOnline: false, currentField: null, lastSeen: 0 },
      },
      events: [
        {
          id: 0,
          type: "chat",
          payload: {
            id: "welcome",
            sender: "seller",
            senderName: "Marie Dupont",
            text: "Welcome! I'm here to help you through the subscription process. Feel free to ask any questions.",
            timestamp: Date.now() - 60000,
          },
          timestamp: Date.now() - 60000,
        },
      ],
      nextEventId: 1,
    };
    sessions.set(sessionId, session);
  }
  return session;
}

function pushEvent(session: Session, type: SessionEvent["type"], payload: Record<string, unknown>): number {
  const event: SessionEvent = {
    id: session.nextEventId++,
    type,
    payload,
    timestamp: Date.now(),
  };
  session.events.push(event);

  // Keep only last 500 events to avoid memory bloat
  if (session.events.length > 500) {
    session.events = session.events.slice(-300);
  }

  return event.id;
}

// ─── GET: Poll for new events ───────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session") || "default";
  const afterId = parseInt(searchParams.get("after") || "-1", 10);
  const role = searchParams.get("role") || "client";

  const session = getOrCreateSession(sessionId);

  // Mark caller as online
  if (session.presence[role]) {
    session.presence[role].isOnline = true;
    session.presence[role].lastSeen = Date.now();
  }

  // Check if the other user went offline (no poll in 5s)
  for (const [r, p] of Object.entries(session.presence)) {
    if (r !== role && Date.now() - p.lastSeen > 5000) {
      p.isOnline = false;
      p.currentField = null;
    }
  }

  // Return events after the given id
  const newEvents = session.events.filter((e) => e.id > afterId);

  return NextResponse.json({
    formData: session.formData,
    presence: session.presence,
    events: newEvents,
    lastEventId: session.events.length > 0 ? session.events[session.events.length - 1].id : -1,
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

  const session = getOrCreateSession(sessionId);

  // Mark caller as online
  if (session.presence[role]) {
    session.presence[role].isOnline = true;
    session.presence[role].lastSeen = Date.now();
  }

  switch (action.type) {
    case "field-update": {
      const { field, value } = action as { field: string; value: unknown; type: string };
      session.formData[field] = value;
      pushEvent(session, "field-update", { field, value, updatedBy: role });
      break;
    }
    case "focus": {
      const { field } = action as { field: string; type: string };
      if (session.presence[role]) {
        session.presence[role].currentField = field;
      }
      pushEvent(session, "focus", { field, role });
      break;
    }
    case "blur": {
      if (session.presence[role]) {
        session.presence[role].currentField = null;
      }
      pushEvent(session, "blur", { role });
      break;
    }
    case "chat": {
      const { message } = action as { message: Record<string, unknown>; type: string };
      pushEvent(session, "chat", message);
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
