import { ChatMessage, CollaboratorPresence, FormData, UserRole, INITIAL_FORM_DATA } from "./types";

/**
 * Collaboration store backed by a server-side API with short polling.
 *
 * Each client polls GET /api/collab every 500ms for new events.
 * Mutations are pushed via POST /api/collab immediately.
 *
 * Works across different browsers/devices/users when deployed.
 */

const POLL_INTERVAL = 500; // ms

class CollaborationStore {
  private formData: FormData = { ...INITIAL_FORM_DATA };
  private localRole: UserRole | null = null;
  private sessionId = "default";
  private lastEventId = -1;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private knownChatIds: Set<string> = new Set(["welcome"]);

  private listeners: Set<(data: FormData) => void> = new Set();
  private presenceListeners: Set<(presence: CollaboratorPresence[]) => void> = new Set();
  private chatListeners: Set<(messages: ChatMessage[]) => void> = new Set();
  private fieldActivityListeners: Set<(field: string, user: UserRole) => void> = new Set();

  private presence: CollaboratorPresence[] = [
    { role: "seller", name: "Marie Dupont", avatar: "MD", isOnline: false, currentField: null, lastSeen: 0 },
    { role: "client", name: "Jean Martin", avatar: "JM", isOnline: false, currentField: null, lastSeen: 0 },
  ];

  private chatMessages: ChatMessage[] = [
    {
      id: "welcome",
      sender: "seller",
      senderName: "Marie Dupont",
      text: "Welcome! I'm here to help you through the subscription process. Feel free to ask any questions.",
      timestamp: Date.now() - 60000,
    },
  ];

  /** Call once when user picks a role */
  init(role: UserRole, sessionId = "default") {
    this.localRole = role;
    this.sessionId = sessionId;

    // Mark ourselves online locally
    const me = this.presence.find((p) => p.role === role);
    if (me) {
      me.isOnline = true;
      me.lastSeen = Date.now();
    }
    this.notifyPresenceListeners();

    // Start polling
    this.poll(); // immediate first poll
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL);
  }

  destroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ─── Server communication ─────────────────────────────────────────

  private async poll() {
    try {
      const res = await fetch(
        `/api/collab?session=${this.sessionId}&after=${this.lastEventId}&role=${this.localRole}`
      );
      if (!res.ok) return;

      const data = await res.json();

      // Update presence from server
      if (data.presence) {
        for (const p of this.presence) {
          const serverP = data.presence[p.role];
          if (serverP) {
            // For our own role, keep isOnline=true always
            if (p.role === this.localRole) {
              p.isOnline = true;
            } else {
              p.isOnline = serverP.isOnline;
              p.currentField = serverP.currentField;
              p.lastSeen = serverP.lastSeen;
            }
          }
        }
        this.notifyPresenceListeners();
      }

      // Process new events
      if (data.events && data.events.length > 0) {
        for (const event of data.events) {
          this.handleServerEvent(event);
        }
        this.lastEventId = data.lastEventId;
      }

      // Sync form data from server (authoritative)
      if (data.formData) {
        let changed = false;
        for (const [key, value] of Object.entries(data.formData)) {
          if ((this.formData as unknown as Record<string, unknown>)[key] !== value) {
            (this.formData as unknown as Record<string, unknown>)[key] = value;
            changed = true;
          }
        }
        if (changed) {
          this.notifyFieldListeners();
        }
      }
    } catch {
      // Network error — silent for prototype
    }
  }

  private handleServerEvent(event: { id: number; type: string; payload: Record<string, unknown> }) {
    switch (event.type) {
      case "field-update": {
        const { field, updatedBy } = event.payload as { field: string; value: unknown; updatedBy: UserRole };
        // Only notify activity if it came from the other user
        if (updatedBy !== this.localRole) {
          this.notifyFieldActivity(field as string, updatedBy);
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
      // focus/blur handled via presence sync above
    }
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
      // silent for prototype
    }
  }

  // ─── Public API ───────────────────────────────────────────────────

  getFormData(): FormData {
    return { ...this.formData };
  }

  updateField(field: keyof FormData, value: FormData[keyof FormData], updatedBy: UserRole) {
    // Optimistic local update
    (this.formData as unknown as Record<string, unknown>)[field] = value;
    this.notifyFieldListeners();
    this.notifyFieldActivity(field, updatedBy);

    // Push to server
    this.postAction({ type: "field-update", field, value });
  }

  focusField(field: string, role: UserRole) {
    const p = this.presence.find((pr) => pr.role === role);
    if (p) {
      p.currentField = field;
      p.lastSeen = Date.now();
    }
    this.notifyPresenceListeners();
    this.postAction({ type: "focus", field });
  }

  blurField(role: UserRole) {
    const p = this.presence.find((pr) => pr.role === role);
    if (p) {
      p.currentField = null;
    }
    this.notifyPresenceListeners();
    this.postAction({ type: "blur" });
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

    // Optimistic local update
    this.knownChatIds.add(message.id);
    this.chatMessages.push(message);
    this.notifyChatListeners();

    // Push to server
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

// Singleton per tab
let store: CollaborationStore | null = null;

export function getCollaborationStore(): CollaborationStore {
  if (!store) {
    store = new CollaborationStore();
  }
  return store;
}
