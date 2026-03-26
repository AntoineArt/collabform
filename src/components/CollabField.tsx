"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { UserRole, CollaboratorPresence } from "@/lib/types";
import { LoadingSpinner } from "./Icons";

interface CollabFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: (field: string) => void;
  onBlur: () => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  otherUser?: CollaboratorPresence;
  recentActivity?: { user: UserRole; timestamp: number };
  error?: string;
  validating?: boolean;
  validated?: boolean;
  hint?: string;
  role: UserRole;
  as?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export default function CollabField({
  label,
  name,
  value,
  onChange,
  onFocus,
  onBlur,
  type = "text",
  placeholder,
  required,
  disabled,
  otherUser,
  recentActivity,
  error,
  validating,
  validated,
  hint,
  role,
  as = "input",
  options,
}: CollabFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  const isOtherUserEditing = otherUser?.currentField === name;
  const wasRecentlyEditedByOther = recentActivity && Date.now() - recentActivity.timestamp < 3000;

  const otherUserColor = role === "seller" ? "primary" : "accent";
  const otherUserLabel = otherUser?.name || (role === "seller" ? "Client" : "Advisor");

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus(name);
  }, [name, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur();
  }, [onBlur]);

  // Flash highlight when other user edits
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (wasRecentlyEditedByOther) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [recentActivity?.timestamp, wasRecentlyEditedByOther]);

  const borderClasses = error
    ? "border-danger-400 ring-2 ring-danger-100"
    : isOtherUserEditing
    ? `border-${otherUserColor}-400 animate-pulse-border`
    : isFocused
    ? "border-primary-500 ring-2 ring-primary-100"
    : flash
    ? "border-accent-400 ring-2 ring-accent-100"
    : "border-gray-300 hover:border-gray-400";

  const baseInputClasses = `w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none text-sm ${borderClasses} ${
    disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""
  }`;

  return (
    <div className="relative group">
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
        <div className="flex items-center gap-2">
          {validating && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <LoadingSpinner className="w-3 h-3" /> Verifying...
            </span>
          )}
          {validated && !error && (
            <span className="flex items-center gap-1 text-xs text-accent-600">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          )}
          {isOtherUserEditing && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium text-${otherUserColor}-600 bg-${otherUserColor}-50 px-2 py-0.5 rounded-full animate-slide-in-right`}
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-${otherUserColor}-500 animate-pulse`} />
              {otherUserLabel} is editing
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        {as === "textarea" ? (
          <textarea
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
            id={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={3}
            className={`${baseInputClasses} resize-none`}
          />
        ) : as === "select" ? (
          <select
            ref={inputRef as React.Ref<HTMLSelectElement>}
            id={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            className={`${baseInputClasses} appearance-none cursor-pointer`}
          >
            <option value="">{placeholder || "Select..."}</option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.Ref<HTMLInputElement>}
            id={name}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        )}

        {/* Other user cursor indicator */}
        {isOtherUserEditing && (
          <div
            className={`absolute -right-1 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-${otherUserColor}-500 rounded-full animate-cursor-blink`}
          />
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-danger-600 flex items-center gap-1 animate-fade-in">
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {hint && !error && (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}

      {wasRecentlyEditedByOther && !isOtherUserEditing && (
        <p className="mt-1 text-xs text-gray-400 animate-fade-in">
          Updated by {otherUserLabel} just now
        </p>
      )}
    </div>
  );
}
