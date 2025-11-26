# Spardavel 💰

> **Note for AI Agents**: Please read [CLAUDE.md](CLAUDE.md) for agent-specific instructions and project conventions.

A progressive web app (PWA) that helps you track and reduce "feel-good" impulse purchases by visualizing their opportunity cost through interest calculations.

## What is Spardavel?

Spardavel (Norwegian for "savings lever") is a personal finance tracking app that helps you:

- **Track purchases** - Record your impulse buys (alcohol, candy, snacks, food, drinks, games, etc.)
- **Log avoided purchases** - Celebrate when you resist temptation
- **Calculate opportunity cost** - See how much interest you missed on spent money
- **Visualize savings growth** - Watch your avoided purchases grow with interest over time
- **Understand spending patterns** - Get insights into your habits with category breakdowns

### Key Features

- 📱 **Progressive Web App** - Install on any device, works offline
- 📊 **Event Sourcing** - All data stored as events; edit history anytime
- 💰 **Interest Calculations** - Daily compounding interest on both spent and saved money
- 📈 **Visual Analytics** - Charts and metrics to track your progress
- 🏷️ **Categorization** - Organize purchases by type (Alcohol, Candy, Snacks, Food, Drinks, Games, Other)
- 🔄 **Retroactive Edits** - Change past events and watch everything recalculate automatically
- 💾 **Local-First** - All data stored in your browser's localStorage

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (this project uses Bun, not npm)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/geirsagberg/spardavel.git
   cd spardavel
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun run dev
   ```

4. Open your browser to `http://localhost:3000`

## Development

### Available Scripts

- **`bun run dev`** - Start the development server (port 3000)
- **`bun run build`** - Build for production
- **`bun run preview`** - Preview production build
- **`bun run typecheck`** - Run TypeScript type checking
- **`bun run lint`** - Lint the codebase
- **`bun run lint:fix`** - Auto-fix linting issues

### Development Workflow

The dev server runs on port 3000 and supports hot module reloading. Changes to source files will automatically refresh the browser.

**Important**: Always use `bun install` to install dependencies, not `npm install`. The project uses `bun.lock`, not `package-lock.json`.

## Technology Stack

- **Frontend Framework**: React
- **Routing & Framework**: TanStack Start (React Start)
- **State Management**: Zustand
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + DaisyUI
- **Charts**: ECharts
- **Type Safety**: TypeScript + Zod
- **PWA**: Workbox
- **Package Manager**: Bun

## How It Works

Spardavel uses **event sourcing** to track all financial events:

1. **Purchase Events** - Money you actually spent
2. **Avoided Purchase Events** - Money you considered spending but didn't
3. **Interest Rate Change Events** - Changes to your savings rate
4. **Interest Application Events** - Monthly interest calculations

Interest is calculated daily but applied monthly, simulating how a savings account works. When you avoid a purchase, it's like putting that money in a savings account - you can see how much interest it would earn. When you spend money, you can see the interest you missed out on (opportunity cost).

All events can be edited or deleted after creation, and the app will automatically recalculate all metrics to reflect the changes.

## Project Structure

```
spardavel/
├── src/
│   ├── components/    # React components
│   ├── lib/          # Utility functions and business logic
│   ├── routes/       # Route components
│   ├── store/        # Zustand state management
│   ├── types/        # TypeScript type definitions
│   └── styles/       # Global styles
├── public/           # Static assets
├── SPEC.md          # Detailed technical specification
└── CLAUDE.md        # Instructions for AI agents
```

## Documentation

- **[SPEC.md](SPEC.md)** - Complete technical specification including event sourcing model, interest calculations, and data structures
- **[CLAUDE.md](CLAUDE.md)** - Development conventions and instructions for AI agents

## Contributing

This is a personal project, but issues and suggestions are welcome!

## License

Private project - All rights reserved

---

Built with ❤️ using modern web technologies
