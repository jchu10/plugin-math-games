# plugin-math-games

## Overview

This plugin displays math games. The games can be displayed until a button response is given, or for a fixed length of time.

## Installation

1. `% cd` to root directory of plugin (`jspsych-tangram-prep`)
2. install packages `% npm i`
3. to run local preview, `% npm run dev`
   - this procedure is powered by Vite, which has its own config file (`vite.config.ts`)
   - currently, stimuli and primitives are hard-coded.
4. To use in an existing jspsych experiment, you can either
   - install package from npm registry `% npm install plugin-math-games --save`
   - or `<script src="https://unpkg.com/plugin-math-games@VERSION"></script>` where version is 0.0.3 or later
   - or copy and import the built js files from `dist/` folder after building for production. Do so by including the script tags in your HTML file:
     `<script type="text/javascript" src="path/to/plugin-math-games/dist/index.browser.js"></script>`

## Development

To modify the stimuli or primitives, you will need to edit the relevant files in the `src/` directory.

1. to run tests, `% npm run test`
   - this procedure is powered by Jest, which has its own config file (`vitest.config.ts`)
2. to build for production, `% npm run build`
   - this procedure is powered by Rollup, which has its own config file (`rollup.config.js`)
   - output files are in `dist/` folder
3. to publish to npm, `% npm publish --access public`
   - make sure to update version number in `package.json` first

## Examples

An example experiment is available in the `/examples` folder

## Compatibility

`plugin-math-games` requires jsPsych v8.0.0 or later.

## Documentation

See [documentation](/docs/plugin-math-games.md)

## Author / Citation

[Junyi Chu](https://github.com/jchu10)
