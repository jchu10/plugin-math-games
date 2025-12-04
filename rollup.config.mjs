import { makeRollupConfig } from "@jspsych/config/rollup";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import postcss from "rollup-plugin-postcss";
import url from "@rollup/plugin-url";
import copy from 'rollup-plugin-copy';

import { createRequire } from 'node:module'; // Import helper
// ⚠️ FIX: Use createRequire to load JSON safely in an ESM config file
const require = createRequire(import.meta.url);
const { version } = require('./package.json'); // Safely reads JSON using CommonJS logic

const configs = makeRollupConfig("jsPsychMathGames");

configs.forEach((cfg) => {
    cfg.external = (cfg.external || []).filter(
        (dep) => dep !== "react" && dep !== "react-dom"
    );

    cfg.plugins = [
        resolve({ browser: true, extensions: [".js", ".ts", ".tsx"] }),
        replace({
            preventAssignment: true,
            values: {
                "__PACKAGE_VERSION__": JSON.stringify(version),
                "process.env.NODE_ENV": JSON.stringify("production")
            }
        }),
        postcss({ modules: false, extract: false, inject: true }),

        // 1) handle media imports
        url({
            include: ["**/*.png", "**/*.mp3", "**/*.wav", "**/*.flac"],
            // limit: Infinity,               // inline every asset as base64
            fileName: "assets/[name][extname]",
            // publicPath: "/dist/",  // the import will resolve to "dist/assets/..."
            // destDir: "dist",        // base output folder
        }),

        // 2) handle your package.json + other JSON
        json(),

        // 3) any remaining plugins from makeRollupConfig
        ...(cfg.plugins || []),

        // Add the copy plugin at the end to ensure it runs after bundling
        copy({
            targets: [
                { src: 'src/assets/**/*', dest: 'dist/assets' },
            ],
            // Optional: You might want to remove this if you only want explicitly imported files 
            // that the 'url' plugin handles, but this ensures everything else is copied.
            // flatten: false 
        }),
    ];

    // ensure UMD sees React/ReactDOM
    // const outputs = Array.isArray(cfg.output) ? cfg.output : [cfg.output];
    // cfg.output = outputs.map(o => ({
    //   ...o,
    //   globals: { ...(o.globals||{}), ...globalVars },
    // }));
});

export default configs;