"use client";
import { useState, useRef, useEffect } from "react";
import { ChatMessage, UserRole } from "@/lib/types";
import { ChatIcon, PaperAirplaneIcon, XMarkIcon } from "./Icons";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  role: UserRole;
}

export default function ChatPanel({ messages, onSendMessage, role }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(messages.length);

  useEffect(() => {
    if (!isOpen && messages.length > lastCountRef.current) {
      setUnread((prev) => prev + (messages.length - lastCountRef.current));
    }
    lastCountRef.current = messages.length;
  }, [messages.length, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = lastMessage && lastMessage.sender !== role && Date.now() - lastMessage.timestamp < 2000;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen
            ? "bg-gray-800 text-white rotate-0"
            : "bg-gradient-to-br from-primary-600 to-primary-700 text-white"
        }`}
      >
        {isOpen ? <XMarkIcon className="w-5 h-5" /> : <ChatIcon className="w-6 h-6" />}
        {unread > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-fade-in">
            {unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col animate-fade-in overflow-hidden"
          style={{ maxHeight: "480px" }}
        >
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-3 flex items-center gap-3">
            <ChatIcon className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">Chat en direct</p>
              <p className="text-[10px] opacity-80">
                {role === "client" ? "Discutez avec votre conseiller" : "Discutez avec le client"}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "320px" }}>
            {messages.map((msg) => {
              const isOwn = msg.sender === role;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      isOwn
                        ? "bg-primary-600 text-white rounded-br-md"
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    }`}
                  >
                    {!isOwn && (
                      <p className="text-[10px] font-medium mb-0.5 text-gray-400">
                        {msg.senderName}
                      </p>
                    )}
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className={`text-[9px] mt-1 ${isOwn ? "text-primary-200" : "text-gray-400"}`}>
                      {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}

            {showTypingIndicator && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-100 p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire un message..."
                className="flex-1 px-3.5 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
