# Suggested Commands for Development

## Project Scripts
All scripts are run with `bun`:

```bash
bun run dev       # Start Vite dev server (http://localhost:3000)
bun run build     # Build for production (creates dist/)
bun run preview   # Preview production build locally
```

## Package Management
```bash
bun install       # Install all dependencies
bun add <pkg>     # Add a new dependency
bun remove <pkg>  # Remove a dependency
bun update        # Update all dependencies to latest
```

## Git Commands
```bash
git status        # Check current branch and changes
git diff          # View unstaged changes
git add .         # Stage all changes
git commit        # Create a commit
git push          # Push to remote
git log --oneline # View commit history
```

## File System Utilities (macOS/Darwin)
```bash
ls -la           # List files with details
find . -name     # Find files by pattern
grep -r          # Search files for patterns
cat              # Display file contents
mkdir -p         # Create directories recursively
rm -f            # Remove files
rm -rf           # Remove directories recursively
```

## TypeScript & Type Checking
```bash
bunx tsc --noEmit  # Check TypeScript types without emitting (if needed)
```

## Development Workflow
1. Start dev server: `bun run dev`
2. Make code changes - Vite will hot-reload
3. Navigate to `http://localhost:3000` to test
4. Stage changes: `git add .`
5. Commit: `git commit -m "message"`
6. Push: `git push`

## Testing & Quality (To Be Implemented)
- No linting, formatting, or testing setup yet
- Future: Consider adding Biome for linting/formatting
- Future: Consider adding Vitest for unit testing

## Documentation Access
```bash
# Get Tailwind CSS 4 docs (CSS-first configuration)
context7_get-library-docs --library "/tailwindlabs/tailwindcss/next" --topic "css configuration"

# Get DaisyUI 5 docs (theme customization)
context7_get-library-docs --library "/saadeghi/daisyui" --topic "themes"
```

## Important Notes
- Always use `bun` instead of `npm`
- Always use latest versions of dependencies
- Never include Claude Code attribution in commits
- TanStack Start routes are convention-based (files in `src/routes/`)
- Tailwind CSS 4 uses `@tailwindcss/vite` plugin (no PostCSS config needed)
- All Tailwind/DaisyUI config is in `src/root.css` using CSS directives
