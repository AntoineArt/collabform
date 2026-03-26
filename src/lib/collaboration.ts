import { ChatMessage, CollaboratorPresence, FormData, UserRole, INITIAL_FORM_DATA } from "./types";

// Simulated collaboration store — in a real app this would be WebSocket/CRDT
class CollaborationStore {
  private formData: FormData = { ...INITIAL_FORM_DATA };
  private listeners: Map<string, Set<(data: FormData) => void>> = new Map();
  private presenceListeners: Set<(presence: CollaboratorPresence[]) => void> = new Set();
  private chatListeners: Set<(messages: ChatMessage[]) => void> = new Set();
  private fieldActivityListeners: Set<(field: string, user: UserRole) => void> = new Set();

  private presence: CollaboratorPresence[] = [
    {
      role: "seller",
      name: "Marie Dupont",
      avatar: "MD",
      isOnline: true,
      currentField: null,
      lastSeen: Date.now(),
    },
    {
      role: "client",
      name: "Jean Martin",
      avatar: "JM",
      isOnline: true,
      currentField: null,
      lastSeen: Date.now(),
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

  private sellerAutoResponses: { trigger: RegExp; responses: string[] }[] = [
    {
      trigger: /plan|price|cost|premium/i,
      responses: [
        "The Comfort plan is our most popular choice — it offers great value with 90% specialist coverage.",
        "I'd recommend reviewing the plan comparison. Want me to highlight the differences?",
      ],
    },
    {
      trigger: /help|confused|understand/i,
      responses: [
        "No worries, I'm right here! Which part would you like me to explain?",
        "Let me walk you through this step. Take your time!",
      ],
    },
    {
      trigger: /document|upload|id/i,
      responses: [
        "You can upload a scan or photo of your ID. We accept passport, driver's license, or national ID.",
        "Make sure the document is clearly visible and not expired.",
      ],
    },
    {
      trigger: /beneficiary/i,
      responses: [
        "A beneficiary is the person who would receive the insurance benefits. It's usually a spouse or child.",
        "You can always update your beneficiary later through your account settings.",
      ],
    },
  ];

  getFormData(): FormData {
    return { ...this.formData };
  }

  updateField(field: keyof FormData, value: FormData[keyof FormData], updatedBy: UserRole) {
    (this.formData as unknown as Record<string, unknown>)[field] = value;
    this.notifyFieldListeners();
    this.notifyFieldActivity(field, updatedBy);
  }

  focusField(field: string, role: UserRole) {
    const p = this.presence.find((pr) => pr.role === role);
    if (p) {
      p.currentField = field;
      p.lastSeen = Date.now();
    }
    this.notifyPresenceListeners();
  }

  blurField(role: UserRole) {
    const p = this.presence.find((pr) => pr.role === role);
    if (p) {
      p.currentField = null;
    }
    this.notifyPresenceListeners();
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

    // Auto-response from seller when client sends a message
    if (sender === "client") {
      setTimeout(() => {
        let responseText = "Got it! Let me help you with that.";

        for (const autoResp of this.sellerAutoResponses) {
          if (autoResp.trigger.test(text)) {
            responseText = autoResp.responses[Math.floor(Math.random() * autoResp.responses.length)];
            break;
          }
        }

        const autoMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sender: "seller",
          senderName: "Marie Dupont",
          text: responseText,
          timestamp: Date.now(),
        };
        this.chatMessages.push(autoMessage);
        this.notifyChatListeners();
      }, 1500 + Math.random() * 2000);
    }
  }

  getPresence(): CollaboratorPresence[] {
    return [...this.presence];
  }

  getChatMessages(): ChatMessage[] {
    return [...this.chatMessages];
  }

  onFormDataChange(callback: (data: FormData) => void): () => void {
    const key = "global";
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(callback);
    return () => this.listeners.get(key)?.delete(callback);
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

  private notifyFieldListeners() {
    const data = this.getFormData();
    this.listeners.get("global")?.forEach((cb) => cb(data));
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

// Singleton
let store: CollaborationStore | null = null;

export function getCollaborationStore(): CollaborationStore {
  if (!store) {
    store = new CollaborationStore();
  }
  return store;
}
