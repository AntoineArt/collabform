"use client";
import { useState } from "react";
import { CollaboratorPresence, UserRole } from "@/lib/types";
import { ShieldIcon } from "./Icons";

interface PresenceBarProps {
  presence: CollaboratorPresence[];
  currentRole: UserRole;
  sessionId: string;
  onReset: () => void;
}

export default function PresenceBar({ presence, currentRole, sessionId, onReset }: PresenceBarProps) {
  const [confirming, setConfirming] = useState(false);

  const handleResetClick = () => {
    if (confirming) {
      onReset();
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
              <ShieldIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-none">AssurConnect</h1>
              <p className="text-[10px] text-gray-400 mt-0.5">Assurance collaborative</p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-8 bg-gray-200 mx-2" />

          <div className="hidden sm:flex items-center gap-1 bg-gray-50 rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-gray-400 font-medium">Session</span>
            <code className="text-[10px] text-gray-600 font-mono">{sessionId}</code>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              confirming
                ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8a6 6 0 1 0 1.5-3.9" />
              <path d="M2 4v4h4" />
            </svg>
            {confirming ? "Confirmer ?" : "Réinitialiser"}
          </button>

          {presence.map((p) => (
            <div
              key={p.role}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                p.role === currentRole
                  ? "bg-primary-50 border border-primary-200"
                  : "bg-gray-50 border border-gray-100"
              }`}
            >
              <div className="relative">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    p.role === "seller"
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                      : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                  }`}
                >
                  {p.avatar}
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    p.isOnline ? "bg-accent-500" : "bg-gray-300"
                  }`}
                />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-gray-900 leading-none">{p.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 capitalize">
                  {p.role === "seller" ? "Conseiller" : "Client"}
                  {p.role === currentRole && " (Vous)"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
