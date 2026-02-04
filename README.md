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

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start Vite dev server for local preview  |
| `npm run build`      | Production build via Rollup              |
| `npm run test`       | Run Jest tests                           |
| `npm run test:watch` | Run tests in watch mode                  |
| `npm run type-check` | TypeScript type checking                 |

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

Example experiments are available in the `/examples` folder.

## Compatibility

`plugin-math-games` requires jsPsych v8.0.0 or later.

## Documentation

See [documentation](/docs/plugin-math-games.md) for full API reference.

## Troubleshooting

### `npm install` fails with peer dependency errors

Try using `npm install --legacy-peer-deps` or update to Node.js v24+.

### Tests fail with `__PACKAGE_VERSION__ is not defined`

This should be fixed in the latest version. If you see this error, ensure you have the latest `jest.config.cjs`.

### Build fails with missing assets

Ensure you have all files from `src/assets/`. If cloning fresh, these should be included in the repository.

### `npm run dev` shows blank page

Check the browser console for errors. Ensure all dependencies are installed with `npm install`.

## License

MIT - see [LICENSE](LICENSE) for details.

## Author / Citation

[Junyi Chu](https://github.com/jchu10)
