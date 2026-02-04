# Contributing to plugin-math-games

Thank you for your interest in contributing to plugin-math-games! This document provides guidelines and instructions for contributing.

## Prerequisites

- **Node.js**: v24.0.0 or later
- **npm**: v9.0.0 or later

You can check your versions with:
```bash
node --version
npm --version
```

## Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/plugin-math-games.git
   cd plugin-math-games
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Verify your setup** by running tests:
   ```bash
   npm run test
   ```

## Development Commands

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start Vite dev server for local preview  |
| `npm run build`      | Production build via Rollup              |
| `npm run test`       | Run Jest tests                           |
| `npm run test:watch` | Run tests in watch mode                  |
| `npm run type-check` | TypeScript type checking                 |

## Project Structure

```
plugin-math-games/
├── src/
│   ├── index.ts              # jsPsych plugin entry point
│   ├── core/                 # Phaser game scenes and logic
│   │   ├── GameScene.ts      # Main gameplay scene
│   │   ├── GameWelcome.ts    # Welcome/instructions scene
│   │   ├── GameOver.tsx      # Game over scene
│   │   ├── GameLogger.ts     # Event logging service
│   │   └── mathquestions.ts  # Question generation service
│   ├── react/                # React components
│   └── assets/               # Game assets (images, audio)
├── dist/                     # Built output (git-ignored)
├── examples/                 # Example experiments
└── docs/                     # Documentation
```

## Code Style Guidelines

- Use TypeScript for all new code
- Follow existing code patterns and naming conventions
- Run `npm run type-check` before committing to catch type errors
- Keep functions focused and reasonably sized

## Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and test them:
   ```bash
   npm run test
   npm run type-check
   npm run build
   ```

3. **Commit your changes** with clear, descriptive messages:
   ```bash
   git commit -m "Add feature: description of what you added"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** on GitHub

## Pull Request Process

1. Ensure all tests pass and the build succeeds
2. Update documentation if you've changed functionality
3. Fill out the pull request template completely
4. Link any related issues in your PR description
5. Wait for review - maintainers may request changes

## Reporting Issues

When reporting bugs, please include:
- Node.js and npm versions
- Browser and version (if applicable)
- Steps to reproduce the issue
- Expected vs actual behavior
- Any error messages or console output

## Questions?

If you have questions, feel free to:
- Open an issue for discussion
- Check existing issues for similar questions

Thank you for contributing!
