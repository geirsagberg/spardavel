# Tech Stack & Code Conventions

## Tech Stack

### Core Dependencies
- **React** 19 - UI framework
- **TypeScript** - Type safety with strict mode enabled
- **Vite** 7 - Build tool with HMR
- **TanStack Start** - Full-stack React framework with routing
- **TanStack Router** - Convention-based file routing

### Styling
- **Tailwind CSS** 4 - Utility-first CSS with `@tailwindcss/vite` plugin
- **DaisyUI** 5 - Component library for Tailwind CSS

### State Management & Storage
- **Zustand** - Lightweight state management
- **Workbox** - Service worker for PWA support

### Utilities
- **UUID** 13 - UUIDv7 generation for event IDs

### Package Manager
- **Bun** - Fast JavaScript runtime and package manager
- All dependencies pinned to `latest` versions

## Code Style & Conventions

### TypeScript
- Strict mode enabled (`"strict": true`)
- No unused variable warnings enabled
- Path aliases: `~/` → `./src/`
- JSX mode: `react-jsx` with automatic imports

### React Components
- Functional components with hooks
- React 19 with JSX transform
- File-based routing convention (`src/routes/**`)
- `__root.tsx` as root layout
- Index files for routes

### Naming Conventions
- Files: `kebab-case` for routes, `camelCase` for utilities/components
- Components: PascalCase
- Types/Interfaces: PascalCase
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE

### Project Structure
```
src/
├── entry-client.tsx     - Client entry point
├── entry-server.tsx     - Server entry point
├── router.tsx           - Router configuration
├── root.css             - Global Tailwind CSS imports
├── routes/              - File-based routing
│   ├── __root.tsx       - Root layout
│   └── index.tsx        - Home page
├── components/          - Reusable React components
├── store/               - Zustand store
├── types/               - TypeScript type definitions
└── lib/                 - Utility functions & helpers
```

### CSS/Styling
- Tailwind CSS utilities for styling
- DaisyUI components for pre-built UI elements
- No CSS-in-JS; all styles through Tailwind + CSS files
- Global styles in `src/root.css`

### Event Sourcing Patterns
- Events are editable (not immutable in traditional sense)
- UUIDv7 for timestamp-sortable event IDs
- Event types: PURCHASE, AVOIDED_PURCHASE, INTEREST_RATE_CHANGE, INTEREST_APPLICATION
- Currency-agnostic amounts (stored as plain numbers, displayed with "kr" suffix)
- Full recalculation triggered on any event modification
