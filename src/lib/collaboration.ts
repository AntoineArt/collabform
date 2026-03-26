import { ChatMessage, CollaboratorPresence, FormData, UserRole, INITIAL_FORM_DATA } from "./types";

/**
 * Collaboration store with debounced updates and conflict-free polling.
 *
 * Key design decisions:
 * - Field updates are debounced (300ms) to avoid spamming the server
 * - Fields the LOCAL user is currently editing are NOT overwritten by polls
 *   (prevents the "rollback" glitch when typing)
 * - Focus is sticky: blur only clears after 8s timeout, so the other user
 *   always sees the cursor even between polls
 * - Poll interval is 1s (enough for a prototype, easy on the server)
 */

const POLL_INTERVAL = 1000;
const DEBOUNCE_MS = 300;
const FOCUS_STICKY_MS = 8000; // keep focus visible for 8s after blur

class CollaborationStore {
  private formData: FormData = { ...INITIAL_FORM_DATA };
  private localRole: UserRole | null = null;
  private sessionId = "default";
  private lastEventId = -1;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private knownChatIds: Set<string> = new Set(["welcome"]);
  private polling = false;

  // Track which fields WE are actively editing (don't overwrite from server)
  private localEditingField: string | null = null;
  private localEditTimestamp = 0;

  // Debounce: accumulate field updates, flush after DEBOUNCE_MS
  private pendingUpdates: Map<string, unknown> = new Map();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Focus sticky: don't send blur immediately, keep a timeout
  private blurTimer: ReturnType<typeof setTimeout> | null = null;

  // Cursor: throttled mouse position
  private cursorTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCursor: { x: number; y: number } | null = null;
  private cursorListeners: Set<(role: UserRole, x: number, y: number) => void> = new Set();

  private listeners: Set<(data: FormData) => void> = new Set();
  private presenceListeners: Set<(presence: CollaboratorPresence[]) => void> = new Set();
  private chatListeners: Set<(messages: ChatMessage[]) => void> = new Set();
  private fieldActivityListeners: Set<(field: string, user: UserRole) => void> = new Set();
  private stepListeners: Set<(step: number) => void> = new Set();
  private currentStep = 1;

  private presence: CollaboratorPresence[] = [
    { role: "seller", name: "Marie Dupont", avatar: "MD", isOnline: false, currentField: null, lastSeen: 0, cursor: null },
    { role: "client", name: "Jean Martin", avatar: "JM", isOnline: false, currentField: null, lastSeen: 0, cursor: null },
  ];

  private chatMessages: ChatMessage[] = [
    {
      id: "welcome",
      sender: "seller",
      senderName: "Marie Dupont",
      text: "Bienvenue ! Je suis là pour vous accompagner dans votre souscription. N'hésitez pas à me poser vos questions.",
      timestamp: Date.now() - 60000,
    },
  ];

  // ─── Lifecycle ────────────────────────────────────────────────────

  init(role: UserRole, sessionId = "default") {
    this.localRole = role;
    this.sessionId = sessionId;

    const me = this.presence.find((p) => p.role === role);
    if (me) {
      me.isOnline = true;
      me.lastSeen = Date.now();
    }
    this.notifyPresenceListeners();

    this.poll();
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL);
  }

  destroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.flushUpdates();
    }
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
    }
    if (this.cursorTimer) {
      clearTimeout(this.cursorTimer);
    }
  }

  // ─── Polling ──────────────────────────────────────────────────────

  private async poll() {
    if (this.polling) return; // skip if previous poll still in-flight
    this.polling = true;

    try {
      const res = await fetch(
        `/api/collab?session=${this.sessionId}&after=${this.lastEventId}&role=${this.localRole}`
      );
      if (!res.ok) return;
      const data = await res.json();

      // Update presence (other user)
      if (data.presence) {
        let presenceChanged = false;
        for (const p of this.presence) {
          const serverP = data.presence[p.role];
          if (!serverP) continue;

          if (p.role === this.localRole) {
            p.isOnline = true;
          } else {
            const wasOnline = p.isOnline;
            const wasField = p.currentField;
            p.isOnline = serverP.isOnline;
            p.currentField = serverP.currentField;
            p.lastSeen = serverP.lastSeen;
            // Update remote cursor
            if (serverP.cursor && serverP.cursor.x !== undefined) {
              p.cursor = serverP.cursor;
              this.cursorListeners.forEach((cb) => cb(p.role, serverP.cursor.x, serverP.cursor.y));
            }
            if (wasOnline !== p.isOnline || wasField !== p.currentField) {
              presenceChanged = true;
            }
          }
        }
        if (presenceChanged) {
          this.notifyPresenceListeners();
        }
      }

      // Process events (for field activity indicators + chat)
      if (data.events?.length > 0) {
        for (const event of data.events) {
          this.handleServerEvent(event);
        }
        this.lastEventId = data.lastEventId;
      }

      // Sync form data — but SKIP the field the local user is currently editing
      if (data.formData) {
        const isLocallyEditing =
          this.localEditingField && Date.now() - this.localEditTimestamp < 3000;

        let changed = false;
        for (const [field, value] of Object.entries(data.formData)) {
          // Don't overwrite the field we're typing into
          if (isLocallyEditing && field === this.localEditingField) continue;
          // Don't overwrite with pending updates
          if (this.pendingUpdates.has(field)) continue;

          const current = (this.formData as unknown as Record<string, unknown>)[field];
          if (current !== value) {
            (this.formData as unknown as Record<string, unknown>)[field] = value;
            changed = true;
          }
        }
        if (changed) {
          this.notifyFieldListeners();
        }
      }
    } catch {
      // silent
    } finally {
      this.polling = false;
    }
  }

  private handleServerEvent(event: { id: number; type: string; payload: Record<string, unknown> }) {
    switch (event.type) {
      case "field-update": {
        const { field, updatedBy } = event.payload as { field: string; updatedBy: UserRole };
        if (updatedBy !== this.localRole) {
          this.notifyFieldActivity(field, updatedBy);
        }
        break;
      }
      case "chat": {
        const msg = event.payload as unknown as ChatMessage;
        if (!this.knownChatIds.has(msg.id)) {
          this.knownChatIds.add(msg.id);
          this.chatMessages.push(msg);
          this.chatMessages.sort((a, b) => a.timestamp - b.timestamp);
          this.notifyChatListeners();
        }
        break;
      }
      case "step-navigate": {
        const { step, navigatedBy } = event.payload as { step: number; navigatedBy: UserRole };
        if (navigatedBy !== this.localRole && step !== this.currentStep) {
          this.currentStep = step;
          this.stepListeners.forEach((cb) => cb(step));
        }
        break;
      }
    }
  }

  // ─── Debounced server push ────────────────────────────────────────

  private scheduleFlush() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flushUpdates(), DEBOUNCE_MS);
  }

  private async flushUpdates() {
    if (this.pendingUpdates.size === 0) return;

    const updates = new Map(this.pendingUpdates);
    this.pendingUpdates.clear();

    // Send all pending field updates in parallel
    const promises = Array.from(updates.entries()).map(([field, value]) =>
      this.postAction({ type: "field-update", field, value })
    );
    await Promise.all(promises);
  }

  private async postAction(action: Record<string, unknown>) {
    try {
      await fetch("/api/collab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          role: this.localRole,
          action,
        }),
      });
    } catch {
      // silent
    }
  }

  // ─── Public API ───────────────────────────────────────────────────

  getFormData(): FormData {
    return { ...this.formData };
  }

  updateField(field: keyof FormData, value: FormData[keyof FormData], updatedBy: UserRole) {
    // Optimistic local update (instant)
    (this.formData as unknown as Record<string, unknown>)[field] = value;
    this.notifyFieldListeners();

    // Track that we're editing this field (prevents poll from overwriting)
    this.localEditingField = field;
    this.localEditTimestamp = Date.now();

    // Queue for debounced server push
    this.pendingUpdates.set(field, value);
    this.scheduleFlush();
  }

  focusField(field: string, role: UserRole) {
    // Cancel any pending blur
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }

    const p = this.presence.find((pr) => pr.role === role);
    if (p) {
      p.currentField = field;
      p.lastSeen = Date.now();
    }
    this.localEditingField = field;
    this.localEditTimestamp = Date.now();

    this.notifyPresenceListeners();
    this.postAction({ type: "focus", field });
  }

  blurField(role: UserRole) {
    // Don't clear focus immediately — keep it "sticky" so the other user
    // has time to see it via polling. Clear after FOCUS_STICKY_MS.
    if (this.blurTimer) clearTimeout(this.blurTimer);

    this.blurTimer = setTimeout(() => {
      const p = this.presence.find((pr) => pr.role === role);
      if (p) {
        p.currentField = null;
      }
      this.localEditingField = null;
      this.notifyPresenceListeners();
      this.postAction({ type: "blur" });
      this.blurTimer = null;
    }, FOCUS_STICKY_MS);
  }

  navigateStep(step: number, role: UserRole) {
    this.currentStep = step;
    this.postAction({ type: "step-navigate", step });
    this.stepListeners.forEach((cb) => cb(step));
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  /** Throttled cursor position update — sends at most every 100ms */
  updateCursor(x: number, y: number) {
    this.pendingCursor = { x, y };

    // Update local presence immediately for responsiveness
    const me = this.presence.find((p) => p.role === this.localRole);
    if (me) {
      me.cursor = { x, y, timestamp: Date.now() };
    }

    if (!this.cursorTimer) {
      this.cursorTimer = setTimeout(() => {
        if (this.pendingCursor) {
          this.postAction({ type: "cursor", x: this.pendingCursor.x, y: this.pendingCursor.y });
          this.pendingCursor = null;
        }
        this.cursorTimer = null;
      }, 100);
    }
  }

  sendMessage(sender: UserRole, text: string) {
    const senderInfo = this.presence.find((p) => p.role === sender);
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender,
      senderName: senderInfo?.name || sender,
      text,
      timestamp: Date.now(),
    };

    this.knownChatIds.add(message.id);
    this.chatMessages.push(message);
    this.notifyChatListeners();
    this.postAction({ type: "chat", message });
  }

  getPresence(): CollaboratorPresence[] {
    return this.presence.map((p) => ({ ...p }));
  }

  getChatMessages(): ChatMessage[] {
    return [...this.chatMessages];
  }

  // ─── Subscriptions ────────────────────────────────────────────────

  onFormDataChange(callback: (data: FormData) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onPresenceChange(callback: (presence: CollaboratorPresence[]) => void): () => void {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback);
  }

  onChatMessage(callback: (messages: ChatMessage[]) => void): () => void {
    this.chatListeners.add(callback);
    return () => this.chatListeners.delete(callback);
  }

  onFieldActivity(callback: (field: string, user: UserRole) => void): () => void {
    this.fieldActivityListeners.add(callback);
    return () => this.fieldActivityListeners.delete(callback);
  }

  onStepChange(callback: (step: number) => void): () => void {
    this.stepListeners.add(callback);
    return () => this.stepListeners.delete(callback);
  }

  onCursorMove(callback: (role: UserRole, x: number, y: number) => void): () => void {
    this.cursorListeners.add(callback);
    return () => this.cursorListeners.delete(callback);
  }

  // ─── Notify ───────────────────────────────────────────────────────

  private notifyFieldListeners() {
    const data = this.getFormData();
    this.listeners.forEach((cb) => cb(data));
  }

  private notifyPresenceListeners() {
    const presence = this.getPresence();
    this.presenceListeners.forEach((cb) => cb(presence));
  }

  private notifyChatListeners() {
    const messages = this.getChatMessages();
    this.chatListeners.forEach((cb) => cb(messages));
  }

  private notifyFieldActivity(field: string, user: UserRole) {
    this.fieldActivityListeners.forEach((cb) => cb(field, user));
  }
}

let store: CollaborationStore | null = null;

export function getCollaborationStore(): CollaborationStore {
  if (!store) {
    store = new CollaborationStore();
  }
  return store;
}
