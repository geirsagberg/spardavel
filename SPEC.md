# Spardavel - Savings Tracker Specification

## Overview

**Spardavel** is a progressive web app (PWA) designed to help users track and reduce "feel-good" impulse purchases. It uses event sourcing to record purchases and avoided purchases, calculates interest on both to show opportunity cost, and provides insights into spending and savings habits.

### Core Concept
- **Purchases**: Money actually spent on items (Alcohol, Candy, Snacks, Food, Drinks, Games, Other)
- **Avoided Purchases**: Impulse buys considered but intentionally skipped
- **Interest Calculation**: Daily pending, applied monthly, simulating savings interest and opportunity cost
- **Event Sourcing**: Events can be edited or deleted; changes trigger full recalculation of metrics

---

## Event Sourcing Model

### Events
All state is derived from an event stream stored in LocalStorage. Events are editable, and edits trigger full recalculation of all derived metrics.

**Event ID Strategy: UUIDv7**
- UUIDv7 is used for all event IDs (timestamp-sortable)
- Generated based on creation timestamp, enabling natural chronological ordering
- Serves as tiebreaker when events have same date
- Enables efficient prefix queries and scanning
- Event IDs are immutable; they serve as stable identifiers for editing/deletion

**Event Validation: Zod**
- All events are validated using Zod schemas on load from localStorage
- Invalid/corrupted data triggers confirmation dialog with option to reset
- Ensures data integrity and provides migration path for schema changes

#### 1. Purchase Event
```
{
  type: "PURCHASE",
  id: string (UUIDv7),
  date: string (YYYY-MM-DD),
  amount: number (currency-agnostic, e.g., 30 for 30 kr),
  category: string (Alcohol|Candy|Snacks|Food|Drinks|Games|Other),
  description: string,
  metadata?: object
}
```

#### 2. Avoided Purchase Event
```
{
  type: "AVOIDED_PURCHASE",
  id: string (UUIDv7),
  date: string (YYYY-MM-DD),
  amount: number (currency-agnostic, e.g., 30 for 30 kr),
  category: string (Alcohol|Candy|Snacks|Food|Drinks|Games|Other),
  description: string,
  metadata?: object
}
```

#### 3. Interest Rate Change Event
```
{
  type: "INTEREST_RATE_CHANGE",
  id: string (UUIDv7),
  date: string (YYYY-MM-DD) - when the rate change takes effect,
  newRate: number (e.g., 3.5 for 3.5% annually),
  notes?: string
}
```

#### 4. Interest Application Event
```
{
  type: "INTEREST_APPLICATION",
  id: string (UUIDv7),
  date: string (YYYY-MM-DD) - end of month when interest is applied,
  pendingOnAvoided: number (calculated interest, same currency-agnostic units),
  pendingOnSpent: number (calculated interest, same currency-agnostic units),
  metadata?: object
}
```

**Note**: Events use date-only format (YYYY-MM-DD) instead of full datetime. Events are sorted by date descending, then by ID descending as tiebreaker (since IDs are UUIDv7 which are timestamp-sortable).

---

## Interest Calculation Logic

### Daily Interest Calculation (Pending)
Interest is calculated daily but only applied monthly.

For each day:
```
Daily Rate = Annual Rate / 365
Interest on Avoided = Balance of Avoided Purchases up to that date × Daily Rate
Interest on Spent = Balance of Purchases up to that date × Daily Rate
```

**Important**: The balance includes both principal (PURCHASE/AVOIDED_PURCHASE events) AND previously applied interest (INTEREST_APPLICATION events) for proper compound interest calculation.

Pending interest accumulates but is not added to the balance until the monthly application.

### Monthly Interest Application
On the last day of each month (or first day of next month):
- All pending interest from avoided purchases is added to the saved balance
- All pending interest from spent purchases is accumulated separately (opportunity cost)
- An INTEREST_APPLICATION event is recorded
- Applied interest becomes part of the principal balance for subsequent interest calculations (compounding)

### Compound Interest
Interest compounds monthly:
1. Month 1: Interest calculated on principal (e.g., 10,000 kr)
2. INTEREST_APPLICATION event records the interest (e.g., 29.73 kr)
3. Month 2: Interest calculated on principal + applied interest (10,029.73 kr)
4. This continues for all subsequent months

Example for 10,000 kr avoided purchase at 3.5% annual rate:
- August (31 days): 10,000 × (3.5/100/365) × 31 ≈ 29.73 kr
- September (30 days): 10,029.73 × (3.5/100/365) × 30 ≈ 28.85 kr
- October (31 days): 10,058.58 × (3.5/100/365) × 31 ≈ 29.91 kr
- Total after 3 months: 10,088.49 kr

### Retroactive Recalculation
When an interest rate is changed with a retroactive `effectiveDate`, OR when a historical event is added/edited/deleted:
1. All INTEREST_APPLICATION events are removed
2. Interest is recalculated for ALL completed months from the earliest transaction to the current month
3. New INTEREST_APPLICATION events are regenerated for each completed month
4. All derived balances are updated

**Key behavior**: Adding a transaction in the past (e.g., August) will automatically generate interest application events for ALL months from August through the last completed month (e.g., October if current month is November). This ensures that:
- Interest compounds properly across all months
- The balance carries forward from month to month
- Historical changes are fully reflected in current totals

### Rate Changes
Users can:
- Set default interest rate (used when no rate change events exist)
- Create rate change events with specific effective dates
- Edit/delete rate change events (recalculates all affected months)

### Event Editing
Events can be edited after creation. Editing an event triggers full recalculation of all derived metrics:
1. Update the event in the stream (identified by ID)
2. Re-sort event stream by timestamp (if timestamp changed)
3. Replay all events from the point of earliest change
4. Recalculate all derived metrics and interest applications
5. Update UI with new values

**Editable fields (by event type):**

*PURCHASE & AVOIDED_PURCHASE:*
- `amount` - Transaction amount
- `category` - Transaction category
- `description` - Transaction description
- `date` - Transaction date (YYYY-MM-DD)
- `type` - Change between PURCHASE and AVOIDED_PURCHASE

*INTEREST_RATE_CHANGE:*
- `newRate` - Interest rate value
- `date` - Date when rate change takes effect (YYYY-MM-DD)
- `notes` - Notes about the rate change
- (Cannot change event type from INTEREST_RATE_CHANGE; delete and create new if needed)

**Immutable fields:**
- `id` - UUIDv7 event identifier (serves as stable reference for edits/deletions)

---

## Data Model & Projections

### Calculated Metrics (from events)

**Period-Based Metrics:**
```
type PeriodMetrics = {
  periodStart: ISO 8601 date,
  periodEnd: ISO 8601 date,
  purchasesCount: number,
  purchasesTotal: number (currency-agnostic units),
  purchasesByCategory: Record<string, number>,

  avoidedCount: number,
  avoidedTotal: number (currency-agnostic units),
  avoidedByCategory: Record<string, number>,

  pendingInterestOnAvoided: number (currency-agnostic units),
  pendingInterestOnSpent: number (currency-agnostic units),
  appliedInterestOnAvoided: number (currency-agnostic units),
  appliedInterestOnSpent: number (currency-agnostic units),
}
```

**Dashboard Metrics:**
```
type DashboardMetrics = {
  // Current month
  currentMonth: PeriodMetrics,

  // All time
  allTime: {
    savedTotal: number (avoided + applied interest, currency-agnostic),
    spentTotal: number (currency-agnostic),
    opportunityCost: number (interest on spent, currency-agnostic),
    pendingSavedInterest: number (currency-agnostic),
    pendingCostInterest: number (currency-agnostic),
  },

  // Monthly breakdown (for charts/history)
  monthlyHistory: PeriodMetrics[],

  // Interest rate history
  interestRateHistory: Array<{
    effectiveDate: ISO 8601 date,
    rate: number,
  }>,
}
```

---

## UI/UX Design

### Currency Display
- **Storage**: All amounts stored as currency-agnostic numbers (e.g., 30, 100, 2150)
- **Display**: Default to NOK (Norwegian Krone) formatted with Norwegian locale (nb-NO)
- **Formatting**: All currency values use `Intl.NumberFormat` with Norwegian locale
  - Format: "1 234 kr" (space as thousands separator, no decimals)
  - Centralized in `/src/lib/formatting.ts` for easy locale switching
- **Locale Configuration**: Change `APP_LOCALE` and `APP_CURRENCY` constants in `formatting.ts` to switch entire app to different locale
- **Future**: Settings page could allow changing display currency and locale (for internationalization)

### Main Page (Dashboard)

**Header:**
- App title "Spardavel"
- Settings/Menu icon (top right)

**Quick Stats Section:**
```
┌─────────────────────────────┐
│ Saved This Month: 450 kr    │
│ Saved All Time: 2,150 kr    │
│ Pending Interest: +12.50 kr  │
├─────────────────────────────┤
│ Spent This Month: 1,230 kr  │
│ Spent All Time: 5,890 kr    │
└─────────────────────────────┘
```

**Quick Entry Section:**
- Text input: amount + description (e.g., "30 kr" + "Beer")
- Dropdown: Category selector (default: Other)
- Two buttons:
  - "Mark as Purchase" (red/warning)
  - "Mark as Avoided" (green/success)

**Recent Entries:**
- List of last 10 entries with:
  - Icon (purchase/avoided)
  - Amount, category, description
  - Time
  - Actions:
    - Tap to edit: Opens form to modify amount, category, description, or type
    - Swipe/delete to remove (hard delete from event stream, triggers recalculation)

**Quick Entry Buttons (Configurable):**
- Preset buttons below input (e.g., "Beer 30 kr", "Candy 20 kr")
- Tap button → toggles purchase/avoided state
- Manage in Settings

### Views/Pages

1. **Dashboard** (/) - Main page with stats, quick entry, recent
2. **History** (/history) - Filterable by month, category, type
3. **Analytics** (/analytics) - Charts: spending by category, monthly trends
4. **Settings** (/settings) - Configure quick entries, interest rate, export/import

### Settings Page

- **Quick Entries Management**
  - List of configured quick buttons
  - Add new: amount + description
  - Edit/Delete existing
  - Reorder (drag?)

- **Interest Rate**
  - Current rate (e.g., 3.5% annually)
  - Edit current rate
  - Schedule future rate changes
  - View rate history

- **Data Management**
  - Export (JSON) button
  - Import (JSON) file picker
  - Clear all data (with confirmation)

- **About**
  - App version
  - Source (Github link)

---

## Technical Stack

### Package Manager
- **Bun** - Fast JavaScript runtime and package manager
- Always use latest versions of dependencies

### Frontend
- **React 19** (latest) - UI framework
- **Vite** (latest) - Build tool
- **TanStack Start** (latest) - Routing and SSR
- **Tailwind CSS** (latest) - Styling
- **DaisyUI** (latest) - Component library
- **TypeScript** (latest) - Type safety
- **Zustand** (latest) - State management (event stream, UI state, derived metrics)
- **uuid** (latest) - Generate UUIDv7 event IDs (timestamp-sortable)
- **zod** (latest) - Runtime event validation and schema definition

**State Management Details (Zustand):**
- Single store for event stream and UI state
- Selectors for derived metrics (saved total, spent total, interest, etc.)
- Middleware for localStorage persistence
- Devtools integration for debugging

### Storage & Persistence
- **LocalStorage** - Store event stream
- **PWA (Workbox)** (latest) - Offline-first, installable
- **Structured Serialization** - Events as JSON

### Build & Deploy
- **Vite** (latest) - Fast dev server and production builds
- **TypeScript** (latest) - Compile-time type checking
- **ES Modules** - Modern JavaScript

---

## Storage & Persistence

### LocalStorage Schema

```javascript
// Events stored as array
localStorage['spardavel_events'] = JSON.stringify([
  { type: 'PURCHASE', id: '...', ... },
  { type: 'AVOIDED_PURCHASE', id: '...', ... },
  { type: 'INTEREST_RATE_CHANGE', id: '...', ... },
  ...
])

// Metadata
localStorage['spardavel_version'] = '1'
localStorage['spardavel_lastCalculated'] = '2025-01-15'
```

### Event Reconstruction
On app load:
1. Read all events from LocalStorage
2. Validate events using Zod schemas (prompt user to reset if invalid)
3. Sort by date descending, then ID descending (UUIDv7 used as tiebreaker)
4. Reconstruct current state by replaying events in order
5. Recalculate daily pending interest
6. Check if monthly interest needs application and generate events if needed

### Export Format (JSON)
```json
{
  "version": "1",
  "exportDate": "2025-01-15T10:30:00Z",
  "events": [
    { "type": "PURCHASE", "id": "...", ... },
    ...
  ],
  "settings": {
    "defaultInterestRate": 3.5
  }
}
```

**Note**: The `settings` object contains all user preferences including the default interest rate used when no rate change events exist.

### Import Process
1. User selects JSON file
2. Validate format and version
3. Import settings (if available) - restores default interest rate and other preferences
4. Merge events (detect duplicates by ID)
5. Recalculate from merged event stream
6. Show confirmation with metrics delta

---

## Categories & Configuration

### Default Categories
- **Alcohol** - Beer, wine, spirits
- **Candy** - Chocolate, sweets, desserts
- **Snacks** - Chips, nuts, pastries
- **Food** - Meals, takeout (non-category specific)
- **Drinks** - Coffee, soda, juice (non-alcoholic)
- **Games** - Toys, gaming, entertainment
- **Other** - Uncategorized

### Quick Entry Defaults
Examples (user can customize):
- "Beer 30" → 30 kr, Alcohol
- "Coffee 40" → 40 kr, Drinks
- "Candy 25" → 25 kr, Candy
- "Snack 20" → 20 kr, Snacks

Users can add/edit/delete custom quick entries in Settings.

---

## PWA Features

- **Installable** - "Add to Home Screen" on mobile and desktop
- **Offline Support** - Service Worker caches app shell and enables offline data entry
- **Manifest** - App name, icon, theme colors, display mode (standalone)
- **Icons** - 192x192, 512x512 for different device sizes
- **Responsive** - Mobile-first design, works on tablet/desktop

---

## Export/Import

### Export
- JSON file containing all events and current metrics
- Filename: `spardavel_export_YYYYMMDD.json`
- User can download and backup

### Import
- User selects previously exported JSON file
- App validates format
- Merges events (avoiding duplicates)
- Recalculates state
- Shows confirmation dialog with changes

### Migration/Merging Strategy
If importing events from another device:
1. De-duplicate by event ID
2. Re-sort by timestamp
3. Recalculate all metrics
4. Show summary: "Imported X purchases, Y avoided, Z interest events"

---

## Implementation Roadmap

### Phase 1: Core Event System ✓ COMPLETE
- [x] Event types and interfaces
- [x] Event storage/retrieval from LocalStorage
- [x] Event replay and state reconstruction

### Phase 2: UI & Quick Entry ✓ COMPLETE
- [x] Main dashboard page (React component)
- [x] Quick entry form with category selector
- [x] Recent entries list
- [x] Edit event form (modal/page)
- [x] Delete event with recalculation
- [x] TanStack Start routing setup

### Phase 3: Interest Calculation ✓ COMPLETE
- [x] Daily pending interest calculation
- [x] Interest display in dashboard
- [x] Monthly interest application (INTEREST_APPLICATION events)

### Phase 4: Views & Analytics ✓ COMPLETE
- [x] History page with filtering
- [x] Analytics page with charts
- [x] Category breakdown

### Phase 5: Settings & Configuration ✓ COMPLETE
- [x] Settings page
- [x] Interest rate configuration
- [ ] Quick entry management (optional - not in core spec)
- [ ] Interest rate change retroactive recalculation (advanced feature)

### Phase 6: PWA & Export/Import ✓ COMPLETE
- [x] Export functionality (in Settings page)
- [x] Import with validation and merging (in Settings page)
- [x] PWA setup (manifest, icons, service worker)
- [x] Offline support configured (conditional SW registration for dev/prod)

### Phase 7: Polish & Testing ✓ COMPLETE
- [x] E2E testing (verified all pages, navigation, export/import, core workflows)
- [x] Mobile UX refinement (responsive design with Tailwind, DaisyUI components)
- [x] Performance optimization (Production build: 301KB JS gzip, 52KB CSS gzip, LCP 108ms, CLS 0, INP 4ms)
- [x] Accessibility audit (semantic HTML, keyboard navigation, proper ARIA labels)

---

## Future Enhancements

- **Cloud Sync** - Sync across devices (Firebase, Supabase, etc.)
- **Analytics** - Trend analysis, predictions
- **Notifications** - Daily reminders, weekly summaries
- **Goals** - Set savings targets, track progress
- **Recurring Purchases** - Template for common spending
- **Dark Mode** - Theme toggle in settings
- **Sharing** - Share anonymous spending stats
- **Recurring Avoidance Streaks** - Gamification
