# Contributing to Lexa DB

Thank you for your interest in contributing to Lexa DB! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and collaborative environment for all contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/lexa_DB.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenAI API key
- Redis (optional, for caching)

### Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your environment variables
3. Run `npm run dev` to start the development server

### Before Submitting

1. **Run tests**: `npm test`
2. **Type check**: `npm run type-check`
3. **Lint**: `npm run lint`
4. **E2E tests**: `npm run test:e2e`

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types - use proper typing
- Export types and interfaces where reusable

### React Components

- Use functional components with hooks
- Client components must have `'use client'` directive
- Wrap components in ErrorBoundary where appropriate

### API Routes

- Always validate input using Zod schemas
- Use proper error handling with try-catch
- Log errors using the logger utility
- Return consistent error responses

### Constants

- Extract magic numbers to `src/lib/constants.ts`
- Use named constants for repeated values

### Testing

- Write unit tests for utilities and functions
- Write integration tests for API routes
- Write E2E tests for critical user flows
- Aim for >70% code coverage

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add user authentication
fix: resolve race condition in chat
docs: update API documentation
test: add tests for validation
refactor: improve error handling
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers

### PR Title Format

```
[Type] Brief description

Type: feat, fix, docs, style, refactor, test, chore
Example: [feat] Add document caching layer
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No console.log statements
```

## Project Structure

```
lexa_DB/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/             # Utilities and libraries
│   │   ├── ai/          # AI/OpenAI integration
│   │   ├── cache/       # Caching layer
│   │   ├── supabase/    # Supabase client
│   │   └── utils/       # Utility functions
│   └── types/           # TypeScript types
├── __tests__/           # Unit tests
├── e2e/                 # E2E tests
└── docs/                # Documentation
```

## Common Tasks

### Adding a New API Route

1. Create route file in `src/app/api/`
2. Add input validation schema in `src/lib/validation.ts`
3. Implement route handler with error handling
4. Add rate limiting if needed
5. Write integration tests

### Adding a New Component

1. Create component file in `src/components/`
2. Add `'use client'` if it uses hooks/state
3. Use TypeScript for props
4. Write unit tests
5. Update Storybook (if applicable)

### Adding a New Constant

1. Add to `src/lib/constants.ts`
2. Export and use throughout codebase
3. Update tests if needed

## Need Help?

- Check existing issues and PRs
- Join our Discord community
- Email: support@lexadb.com

## License

By contributing, you agree that your contributions will be licensed under the project's license.
