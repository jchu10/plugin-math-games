# plugin-math-games

A jsPsych plugin that embeds Phaser-based math games into psychological experiments. Players answer math questions in themed game environments (space/classroom) with adaptive difficulty.

## Prerequisites

- **Node.js**: v24.0.0 or later
- **npm**: v9.0.0 or later

## Quick Start (Contributors)

```bash
# Clone the repository
git clone https://github.com/jchu10/plugin-math-games.git
cd plugin-math-games

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contributor guidelines.

## Installation (Users)

Install from npm:
```bash
npm install plugin-math-games --save
```

Or include via CDN:
```html
<script src="https://unpkg.com/plugin-math-games@VERSION"></script>
```

Or copy the built files from `dist/` after building:
```html
<script type="text/javascript" src="path/to/plugin-math-games/dist/index.browser.js"></script>
```

## Development Commands

| Command                  | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `npm run dev`            | Start Vite dev server (opens `dev/index.html`) |
| `npm run dev:examples`   | Start examples demo site locally               |
| `npm run build`          | Production library build via Rollup            |
| `npm run build:examples` | Build examples demo site for GitHub Pages      |
| `npm run preview:examples` | Preview the built examples site locally      |
| `npm run test`           | Run Jest tests                                 |
| `npm run test:watch`     | Run tests in watch mode                        |
| `npm run type-check`     | TypeScript type checking                       |

## Publishing

To publish a new version to npm:

1. Update version number:
   - Patch (bug fixes): `npm version patch`
   - Minor (new features): `npm version minor`
   - Major (breaking changes): `npm version major`

2. Push the version tag:
   ```bash
   git push && git push --tags
   ```

3. Create a GitHub release - this will automatically publish to npm via CI/CD.

## Examples

Example experiments are available in the `/examples` folder. A live demo is deployed to [jchu10.github.io/plugin-math-games](https://jchu10.github.io/plugin-math-games/).

## Documentation

See [CONTRIBUTING.md](CONTRIBUTING.md) for project structure and contributor guidelines.

## Compatibility

`plugin-math-games` requires jsPsych v8.0.0 or later.

## License

MIT - see [LICENSE](LICENSE) for details.

## Author / Citation

[Junyi Chu](https://github.com/jchu10)
