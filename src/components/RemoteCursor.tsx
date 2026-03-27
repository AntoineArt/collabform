"use client";
import { useEffect, useRef, useState } from "react";
import { CursorPosition, UserRole } from "@/lib/types";

interface RemoteCursorProps {
  cursor: CursorPosition | null;
  name: string;
  role: UserRole; // the OTHER user's role
}

export default function RemoteCursor({ cursor, name, role }: RemoteCursorProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const animRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const frameRef = useRef<number>(0);

  const isSeller = role === "seller";

  useEffect(() => {
    if (!cursor) {
      setVisible(false);
      return;
    }

    // Convert percentage coords back to pixel coords.
    // The sender encodes x as (clientX / senderViewportWidth * 100).
    // To place the cursor correctly on our screen we need to account for
    // the form container being centered: if the sender's viewport is narrower
    // than ours, the form is offset from the left edge.
    const senderWidth = cursor.viewportWidth ?? window.innerWidth;
    const effectiveWidth = Math.min(senderWidth, window.innerWidth);
    const formOffset = (window.innerWidth - effectiveWidth) / 2;
    const targetX = formOffset + (cursor.x / 100) * effectiveWidth;
    const targetY = (cursor.y / 100) * document.documentElement.scrollHeight - window.scrollY;

    // Hide if cursor data is stale (>3s)
    if (Date.now() - cursor.timestamp > 3000) {
      setVisible(false);
      return;
    }

    setVisible(true);

    // Smooth animation: lerp toward target
    const animate = () => {
      animRef.current.x += (targetX - animRef.current.x) * 0.3;
      animRef.current.y += (targetY - animRef.current.y) * 0.3;
      setPos({ x: animRef.current.x, y: animRef.current.y });

      if (
        Math.abs(targetX - animRef.current.x) > 0.5 ||
        Math.abs(targetY - animRef.current.y) > 0.5
      ) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [cursor]);

  if (!visible || !cursor) return null;

  return (
    <div
      className="fixed pointer-events-none z-[999] transition-opacity duration-300"
      style={{
        left: pos.x,
        top: pos.y,
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Cursor arrow SVG */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        className={`drop-shadow-md ${isSeller ? "text-blue-500" : "text-emerald-500"}`}
      >
        <path
          d="M3 3L10 19L12.5 11.5L19 9L3 3Z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name label */}
      <div
        className={`absolute left-4 top-4 px-2 py-0.5 rounded-md text-[10px] font-semibold text-white whitespace-nowrap shadow-sm ${
          isSeller
            ? "bg-blue-500"
            : "bg-emerald-500"
        }`}
      >
        {name}
      </div>
    </div>
  );
}
