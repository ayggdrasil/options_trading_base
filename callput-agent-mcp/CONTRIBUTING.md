# Contributing to Callput Agent MCP Server

Thank you for your interest in contributing! 🎉

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/callput-agent-mcp.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Submit a pull request

## Development Setup

```bash
npm install
npm run build
node build/test_connection.js  # Verify it works
```

## Code Style

- TypeScript with strict mode
- Use `async/await` for promises
- Add JSDoc comments for public functions
- Follow existing code patterns

## Testing

Before submitting, ensure:
- [ ] Code builds without errors: `npm run build`
- [ ] Connection test passes: `node build/test_connection.js`
- [ ] No TypeScript errors
- [ ] Documentation updated if needed

## Pull Request Guidelines

- Clear, descriptive title
- Reference any related issues
- Describe what changed and why
- Include test results if applicable

## Questions?

Open an issue for discussion before major changes!
