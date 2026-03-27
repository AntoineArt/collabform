"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { getCollaborationStore } from "@/lib/collaboration";
import { FormData, UserRole, CollaboratorPresence, ChatMessage, Toast, CursorPosition } from "@/lib/types";

export function useCollaboration(role: UserRole) {
  const store = useRef(getCollaborationStore());
  const [formData, setFormData] = useState<FormData>(store.current.getFormData());
  const [presence, setPresence] = useState<CollaboratorPresence[]>(store.current.getPresence());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(store.current.getChatMessages());
  const [recentActivity, setRecentActivity] = useState<Map<string, { user: UserRole; timestamp: number }>>(new Map());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [remoteStep, setRemoteStep] = useState<number | null>(null);
  const [remoteCursor, setRemoteCursor] = useState<CursorPosition | null>(null);
  const [resetCount, setResetCount] = useState(0);

  // Initialize and mark ourselves online
  useEffect(() => {
    const s = store.current;
    s.init(role);
    return () => {
      s.destroy();
    };
  }, [role]);

  // Subscribe to store events
  useEffect(() => {
    const s = store.current;

    setFormData(s.getFormData());
    setPresence(s.getPresence());
    setChatMessages(s.getChatMessages());

    const unsubs = [
      s.onFormDataChange(setFormData),
      s.onPresenceChange(setPresence),
      s.onChatMessage(setChatMessages),
      s.onStepChange((step) => setRemoteStep(step)),
      s.onReset(() => setResetCount((n) => n + 1)),
      s.onCursorMove((_role, x, y, viewportWidth) => {
        if (_role !== role) {
          setRemoteCursor({ x, y, timestamp: Date.now(), viewportWidth });
        }
      }),
      s.onFieldActivity((field, user) => {
        if (user !== role) {
          setRecentActivity((prev) => {
            const next = new Map(prev);
            next.set(field, { user, timestamp: Date.now() });
            return next;
          });
          setTimeout(() => {
            setRecentActivity((prev) => {
              const next = new Map(prev);
              const entry = next.get(field);
              if (entry && Date.now() - entry.timestamp > 2500) {
                next.delete(field);
              }
              return next;
            });
          }, 3000);
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [role]);

  // Track mouse movement and send to store
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Send viewport-relative percentage coordinates + actual viewport width
      // so the receiver can reconstruct the absolute position correctly
      const x = (e.clientX / window.innerWidth) * 100;
      const y = ((e.clientY + window.scrollY) / document.documentElement.scrollHeight) * 100;
      store.current.updateCursor(x, y, window.innerWidth);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const updateField = useCallback(
    (field: keyof FormData, value: FormData[keyof FormData]) => {
      store.current.updateField(field, value, role);
    },
    [role]
  );

  const focusField = useCallback(
    (field: string) => {
      store.current.focusField(field, role);
    },
    [role]
  );

  const blurField = useCallback(() => {
    store.current.blurField(role);
  }, [role]);

  const sendMessage = useCallback(
    (text: string) => {
      store.current.sendMessage(role, text);
    },
    [role]
  );

  const navigateStep = useCallback(
    (step: number) => {
      store.current.navigateStep(step, role);
    },
    [role]
  );

  const resetSession = useCallback(() => {
    store.current.resetSession();
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const otherUser = presence.find((p) => p.role !== role);
  const currentUser = presence.find((p) => p.role === role);

  return {
    formData,
    updateField,
    focusField,
    blurField,
    presence,
    otherUser,
    currentUser,
    chatMessages,
    sendMessage,
    recentActivity,
    toasts,
    addToast,
    removeToast,
    navigateStep,
    remoteStep,
    remoteCursor,
    resetSession,
    resetCount,
  };
}
