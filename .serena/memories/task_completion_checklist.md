# Task Completion Checklist

## When a Task is Completed

### For Code Changes
1. ✅ Ensure all TypeScript types are correct (strict mode)
2. ✅ Verify component logic works as intended
3. ✅ Check that Tailwind CSS classes are applied correctly
4. ✅ Test responsive design if UI components added
5. ✅ Verify no console errors in browser DevTools
6. ✅ Ensure new code follows project conventions

### For New Features
1. ✅ Update `SPEC.md` if specifications change
2. ✅ Add type definitions to `src/types/` if needed
3. ✅ Create components in `src/components/` if reusable
4. ✅ Add utility functions to `src/lib/` if needed
5. ✅ Update store in `src/store/` if state management needed
6. ✅ Add routes to `src/routes/` if new pages added

### Version Control
1. ✅ Stage relevant changes: `git add .`
2. ✅ Review staged changes: `git diff --staged`
3. ✅ Create descriptive commit message
   - Format: `action: brief description` (e.g., "feat: implement event store")
   - Separate concerns: one feature/fix per commit
4. ✅ **NEVER include** "Claude Code", "Generated with", "Co-authored by" in commits
5. ✅ Push changes: `git push`

### Testing & Validation
1. ✅ Check dev server still runs: `bun run dev`
2. ✅ Verify changes in browser at `http://localhost:3000`
3. ✅ Look for any build warnings/errors
4. ✅ Test on mobile viewport if UI changes
5. ✅ Verify TypeScript compilation: `bunx tsc --noEmit`

### Documentation
1. ✅ Update inline comments only for non-obvious logic
2. ✅ Update `SPEC.md` for architectural changes
3. ✅ Update type definitions and interfaces
4. ✅ Add JSDoc for public functions/exports (optional, but helpful)

## No Linting/Formatting Yet
- Project currently has no automated linting or formatting
- Code style relies on following the conventions in `tech_stack_and_conventions.md`
- Consider setting up Biome or ESLint + Prettier in the future

## Important Reminders
- Keep dependencies updated (`latest` versions)
- Use Bun, not npm
- Follow TanStack Router convention-based routing
- Maintain TypeScript strict mode compliance
- Don't commit build artifacts or node_modules
