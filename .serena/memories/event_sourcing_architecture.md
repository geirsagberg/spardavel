# Event Sourcing Architecture

## Core Principles
- All state is derived from an immutable event stream stored in LocalStorage
- Events are **editable** - changes trigger full recalculation of all derived metrics
- UUIDv7 for timestamp-sortable event IDs
- Currency-agnostic amounts (e.g., 30 for 30 kr)
- UI displays amounts with "kr" (NOK) suffix by default

## Event Types

### 1. PURCHASE
- `type: "PURCHASE"`
- `id: string (UUIDv7)`
- `timestamp: ISO 8601 datetime`
- `amount: number (currency-agnostic)`
- `category: string` (Alcohol|Candy|Snacks|Food|Drinks|Games|Other)
- `description: string`
- `metadata?: object`

### 2. AVOIDED_PURCHASE
- Same structure as PURCHASE
- `type: "AVOIDED_PURCHASE"`
- Represents purchases that user considered but intentionally skipped

### 3. INTEREST_RATE_CHANGE
- `type: "INTEREST_RATE_CHANGE"`
- `id: string (UUIDv7)`
- `timestamp: ISO 8601 datetime`
- `effectiveDate: ISO 8601 date` - When the rate change takes effect
- `newRate: number` (e.g., 3.5 for 3.5% annually)
- `notes?: string`
- **Note**: Can be edited; only immutable field is `id`

### 4. INTEREST_APPLICATION
- `type: "INTEREST_APPLICATION"`
- `id: string (UUIDv7)`
- `timestamp: ISO 8601 datetime` (end of month)
- `appliedDate: ISO 8601 date`
- `pendingOnAvoided: number` (calculated interest)
- `pendingOnSpent: number` (calculated interest)
- `metadata?: object`
- Generated automatically; user shouldn't create manually

## Event Editing
Editable fields (triggers full recalculation):
- `amount` - Transaction amount
- `category` - Transaction category
- `description` - Transaction description
- `timestamp` - Transaction date/time
- `type` - Change between PURCHASE and AVOIDED_PURCHASE

Immutable fields:
- `id` - UUIDv7 identifier (stable reference for edits/deletions)

## Interest Calculation

### Daily Pending Interest
```
Daily Rate = Annual Rate / 365
Interest on Avoided = Sum of Avoided Purchases × Daily Rate
Interest on Spent = Sum of Purchases × Daily Rate
```

### Monthly Application
- Triggered on last day of month (or first day of next month)
- Pending interest added to respective balances
- INTEREST_APPLICATION event recorded
- Full recalculation if any rate changes affected the month

### Retroactive Recalculation
When interest rate is changed with retroactive effectiveDate:
1. Invalidate INTEREST_APPLICATION events from that date onward
2. Recalculate interest for affected months with new rate
3. Regenerate INTEREST_APPLICATION events
4. Update all derived metrics

## Derived Metrics (Calculated, Not Stored)

### Period-Based Metrics
- `purchasesCount, purchasesTotal, purchasesByCategory`
- `avoidedCount, avoidedTotal, avoidedByCategory`
- `pendingInterestOnAvoided, pendingInterestOnSpent`
- `appliedInterestOnAvoided, appliedInterestOnSpent`

### Dashboard Metrics
- **Current Month**: Period metrics for current month
- **All Time**: 
  - `savedTotal` = avoided + applied interest on avoided
  - `spentTotal` = total purchases
  - `opportunityCost` = interest on spent (what you would have if you hadn't spent)
  - `pendingSavedInterest`
  - `pendingCostInterest`
- **Monthly History**: Array of period metrics by month
- **Interest Rate History**: Array of rate changes with effective dates

## LocalStorage Schema
```javascript
localStorage['spardavel_events'] = JSON.stringify([
  { type: 'PURCHASE', id: '...', ... },
  { type: 'AVOIDED_PURCHASE', id: '...', ... },
  { type: 'INTEREST_RATE_CHANGE', id: '...', ... },
  { type: 'INTEREST_APPLICATION', id: '...', ... },
])

localStorage['spardavel_version'] = '1'
localStorage['spardavel_lastCalculated'] = '2025-01-15'
```

## Export/Import
- Export as JSON containing all events + calculated metrics
- Import validates format, deduplicates by event ID, recalculates
- No events recorded for import/export operations

## Implementation Notes
- Events sorted naturally by UUIDv7 (no explicit timestamp sort needed)
- Recalculation function replays all events from earliest change point
- Zustand store manages event stream + derived metrics with selectors
- All calculations are deterministic and reproducible
