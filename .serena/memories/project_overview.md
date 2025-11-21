# Spardavel Project Overview

## Project Purpose
Spardavel is a progressive web app (PWA) designed to help users track and reduce "feel-good" impulse purchases. It combines event sourcing with interest calculations to simulate savings growth and opportunity cost.

## Core Features
- **Purchases & Avoided Purchases**: Track actual spending and intentionally skipped purchases by category
- **Interest Calculation**: Daily pending interest (applied monthly) on both purchases and avoided purchases
- **Event Sourcing**: Fully editable events with automatic recalculation of derived metrics
- **UUIDv7 Event IDs**: Timestamp-sortable event IDs for natural chronological ordering
- **LocalStorage Persistence**: All data stored in browser's LocalStorage
- **PWA Support**: Installable with offline capability via service worker

## Development Status
- ✅ Project scaffolding complete
- ✅ Vite + TanStack Start + React 19 configured
- ✅ Tailwind CSS 4 + DaisyUI set up
- ⏳ Next: Core event system & Zustand store implementation

## Key Files
- `SPEC.md` - Complete specification including event schemas, interest logic, UI design
- `src/routes/__root.tsx` - Root layout
- `src/routes/index.tsx` - Home page
- `tailwind.config.ts` - Tailwind + DaisyUI configuration
- `vite.config.ts` - Vite + TanStack Start + Tailwind CSS 4 plugin configuration
- `tsconfig.json` - TypeScript config with `~/` path alias
