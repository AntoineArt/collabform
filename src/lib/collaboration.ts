import { ChatMessage, CollaboratorPresence, FormData, UserRole, INITIAL_FORM_DATA } from "./types";

/**
 * Cross-tab collaboration using BroadcastChannel API.
 * Each tab runs its own CollaborationStore, but all mutations are
 * broadcast so every tab stays in sync — field edits, focus/blur
 * presence, and chat messages all propagate instantly.
 */

type BroadcastPayload =
  | { type: "field-update"; field: string; value: unknown; updatedBy: UserRole }
  | { type: "focus"; field: string; role: UserRole }
  | { type: "blur"; role: UserRole }
  | { type: "chat"; message: ChatMessage }
  | { type: "presence-sync"; presence: CollaboratorPresence[] }
  | { type: "form-sync-request"; fromRole: UserRole }
  | { type: "form-sync-response"; formData: FormData; chatMessages: ChatMessage[] };

const CHANNEL_NAME = "assurconnect-collab";

class CollaborationStore {
  private formData: FormData = { ...INITIAL_FORM_DATA };
  private localRole: UserRole | null = null;
  private channel: BroadcastChannel | null = null;

  private listeners: Set<(data: FormData) => void> = new Set();
  private presenceListeners: Set<(presence: CollaboratorPresence[]) => void> = new Set();
  private chatListeners: Set<(messages: ChatMessage[]) => void> = new Set();
  private fieldActivityListeners: Set<(field: string, user: UserRole) => void> = new Set();

  private presence: CollaboratorPresence[] = [
    {
      role: "seller",
      name: "Marie Dupont",
      avatar: "MD",
      isOnline: false,
      currentField: null,
      lastSeen: 0,
    },
    {
      role: "client",
      name: "Jean Martin",
      avatar: "JM",
      isOnline: false,
      currentField: null,
      lastSeen: 0,
    },
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

  /** Call once when the user picks a role */
  init(role: UserRole) {
    this.localRole = role;

    // Mark ourselves online
    const me = this.presence.find((p) => p.role === role);
    if (me) {
      me.isOnline = true;
      me.lastSeen = Date.now();
    }

    // Open broadcast channel
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (ev: MessageEvent<BroadcastPayload>) => {
        this.handleRemoteMessage(ev.data);
      };

      // Ask the other tab for current state (they may already have data filled in)
      this.broadcast({ type: "form-sync-request", fromRole: role });

      // Broadcast our own presence so the other tab sees us online
      this.broadcast({ type: "presence-sync", presence: this.getPresence() });
    }
  }

  destroy() {
    if (this.localRole) {
      const me = this.presence.find((p) => p.role === this.localRole);
      if (me) {
        me.isOnline = false;
        me.currentField = null;
      }
      this.broadcast({ type: "presence-sync", presence: this.getPresence() });
    }
    this.channel?.close();
    this.channel = null;
  }

  // ─── Incoming messages from other tabs ────────────────────────────

  private handleRemoteMessage(payload: BroadcastPayload) {
    switch (payload.type) {
      case "field-update": {
        (this.formData as unknown as Record<string, unknown>)[payload.field] = payload.value;
        this.notifyFieldListeners();
        this.notifyFieldActivity(payload.field, payload.updatedBy);
        break;
      }
      case "focus": {
        const p = this.presence.find((pr) => pr.role === payload.role);
        if (p) {
          p.currentField = payload.field;
          p.lastSeen = Date.now();
          p.isOnline = true;
        }
        this.notifyPresenceListeners();
        break;
      }
      case "blur": {
        const p = this.presence.find((pr) => pr.role === payload.role);
        if (p) {
          p.currentField = null;
        }
        this.notifyPresenceListeners();
        break;
      }
      case "chat": {
        // Avoid duplicates
        if (!this.chatMessages.find((m) => m.id === payload.message.id)) {
          this.chatMessages.push(payload.message);
          this.notifyChatListeners();
        }
        break;
      }
      case "presence-sync": {
        // Merge remote presence into ours (keep local role's own state)
        for (const remote of payload.presence) {
          if (remote.role !== this.localRole) {
            const local = this.presence.find((p) => p.role === remote.role);
            if (local) {
              local.isOnline = remote.isOnline;
              local.currentField = remote.currentField;
              local.lastSeen = remote.lastSeen;
            }
          }
        }
        this.notifyPresenceListeners();
        break;
      }
      case "form-sync-request": {
        // Another tab just joined — send them our current state
        if (payload.fromRole !== this.localRole) {
          this.broadcast({
            type: "form-sync-response",
            formData: { ...this.formData },
            chatMessages: [...this.chatMessages],
          });
          // Also re-broadcast our presence
          this.broadcast({ type: "presence-sync", presence: this.getPresence() });
        }
        break;
      }
      case "form-sync-response": {
        // Received full state from the other tab — merge it in
        this.formData = { ...payload.formData };
        // Merge chat messages (union by id)
        const existingIds = new Set(this.chatMessages.map((m) => m.id));
        for (const msg of payload.chatMessages) {
          if (!existingIds.has(msg.id)) {
            this.chatMessages.push(msg);
          }
        }
        this.chatMessages.sort((a, b) => a.timestamp - b.timestamp);
        this.notifyFieldListeners();
        this.notifyChatListeners();
        break;
      }
    }
  }

  private broadcast(payload: BroadcastPayload) {
    try {
      this.channel?.postMessage(payload);
    } catch {
      // channel may be closed
    }
  }

  // ─── Public API ───────────────────────────────────────────────────

  getFormData(): FormData {
    return { ...this.formData };
  }

  updateField(field: keyof FormData, value: FormData[keyof FormData], updatedBy: UserRole) {
    (this.formData as unknown as Record<string, unknown>)[field] = value;
    this.notifyFieldListeners();
    this.notifyFieldActivity(field, updatedBy);
    this.broadcast({ type: "field-update", field, value, updatedBy });
  }

  focusField(field: string, role: UserRole) {
    const p = this.presence.find((pr) => pr.role === role);
    if (p) {
      p.currentField = field;
      p.lastSeen = Date.now();
    }
    this.notifyPresenceListeners();
    this.broadcast({ type: "focus", field, role });
  }

  blurField(role: UserRole) {
    const p = this.presence.find((pr) => pr.role === role);
    if (p) {
      p.currentField = null;
    }
    this.notifyPresenceListeners();
    this.broadcast({ type: "blur", role });
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
    this.chatMessages.push(message);
    this.notifyChatListeners();
    this.broadcast({ type: "chat", message });
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
