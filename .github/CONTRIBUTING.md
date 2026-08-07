# Contributing to MarginMap

Thank you for contributing! This guide explains how to run quality gates locally before opening a pull request.

## Quality Gates

Every pull request must pass the automated CI checks. Run them locally with:

```bash
npm run check
```

This single command runs three checks in sequence:

| Command | What it does |
|---------|-------------|
| `npm run typecheck` | TypeScript strict compilation — catches type errors without emitting output |
| `npm run lint` | ESLint with `--max-warnings=0` — zero warnings allowed |
| `npm run format:check` | Prettier format validation — ensures consistent code style |

## Local Development Workflow

1. Make your changes.
2. Run `npm run check` to validate all quality gates.
3. If linting issues are found, auto-fix with `npm run lint:fix`.
4. If formatting issues are found, auto-fix with `npm run format`.
5. Re-run `npm run check` to confirm everything passes.
6. Commit and push.

## Pre-commit Hook (optional but recommended)

You can set up a pre-commit hook to run `npm run check` automatically before every commit:

```bash
# Create the hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
npm run check
EOF

chmod +x .git/hooks/pre-commit
```

## Troubleshooting

**TypeScript errors (`typecheck` fails)**
- Review the error output and fix the type issues in the indicated files.
- Run `npm run typecheck` to see all errors at once.

**Lint errors (`lint` fails)**
- Run `npm run lint:fix` to automatically fix fixable issues.
- Remaining errors must be fixed manually.

**Format errors (`format:check` fails)**
- Run `npm run format` to auto-format all files.
- Commit the formatting changes, then re-run `npm run check`.

## CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs `npm run check` on every push to `main` and on every pull request. A failing check will block the PR from being merged.
