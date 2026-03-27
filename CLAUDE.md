# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js)
npm run build    # Production build
npm run start    # Start production server
```

There are no test or lint scripts configured.

## Architecture Overview

**collabform** (AssurConnect) is a real-time collaborative insurance subscription form. Two users — a "Conseiller" (advisor) and a "Client" — fill out a multi-step form simultaneously with live synchronization.

### Real-time Collaboration Flow

1. **API layer** (`src/app/api/collab/route.ts`): Single endpoint with GET (poll state) and POST (push mutations). State is stored in Redis per session using keys: `collab:{sessionId}:form`, `:presence`, `:events`, `:eventId`. Events are capped at 200; TTL is 24h.

2. **Client-side store** (`src/lib/collaboration.ts`): Singleton that manages all local state. Key behaviors:
   - Debounces outgoing field updates (300ms)
   - Protects locally-edited fields from being overwritten by polls ("locally modified" flag)
   - Sticky focus tracking: clears blur after 8s timeout
   - Throttles cursor position updates to 100ms minimum

3. **React hook** (`src/hooks/useCollaboration.ts`): Bridges the singleton store with React components. Polls server every 1 second, tracks mouse for cursor sharing, manages toast notifications.

### Component Structure

- `InsuranceForm.tsx` — top-level multi-step form (4 steps), manages step navigation
- `CollabField.tsx` — form field wrapper that shows who is editing/focused on a field
- `PresenceBar.tsx` — shows the other user's online status and current focused field
- `RemoteCursor.tsx` — renders the other user's mouse cursor position
- `ChatPanel.tsx` — real-time sidebar chat
- `StepIndicator.tsx` — 4-step progress bar (synchronized between users)
- `steps/` — individual step components: PersonalInfo, InsurancePlan, HealthInfo, Finalize

### Redis Setup

Requires a Redis URL set in environment:
```
REDIS_URL=redis://default:your-password@your-host:port
```

Uses `ioredis` (not the standard `redis` package) for TCP compatibility with Redis Cloud/Upstash. The client is a singleton in `src/lib/redis.ts`.

### Session Model

Sessions are hardcoded to `SC-7X3K9` in the landing page (`src/app/page.tsx`). The role selection (Conseiller vs Client) determines presence identity — both roles see the same form state but are identified differently in presence and chat.

### Type Definitions

All shared types are in `src/lib/types.ts`: `FormData`, `PresenceState`, `ChatMessage`, `CollabEvent`, `UserRole`, etc.
