import { makeRollupConfig } from "@jspsych/config/rollup";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import postcss from "rollup-plugin-postcss";
import url from "@rollup/plugin-url";
import json from "@rollup/plugin-json";

const configs = makeRollupConfig("jsPsychMathGames");

configs.forEach((cfg) => {
    cfg.external = (cfg.external || []).filter(
        (dep) => dep !== "react" && dep !== "react-dom"
    );

    cfg.plugins = [
        resolve({ browser: true, extensions: [".js", ".ts", ".tsx"] }),
        commonjs(),

        replace({ preventAssignment: true, "process.env.NODE_ENV": JSON.stringify("production") }),
        postcss({ modules: false, extract: false, inject: true }),

        // 1) handle media imports
        url({
            include: ["**/*.png", "**/*.mp3", "**/*.wav", "**/*.flac"],
            limit: Infinity,               // inline every asset as base64
            // fileName: "assets/[name][extname]",
            // publicPath: "/dist/",  // the import will resolve to "dist/assets/..."
            // destDir: "dist",        // base output folder
        }),

        // 2) handle your package.json + other JSON
        json(),

        // 3) any remaining plugins from makeRollupConfig
        ...(cfg.plugins || []),
    ];

    // ensure UMD sees React/ReactDOM
    // const outputs = Array.isArray(cfg.output) ? cfg.output : [cfg.output];
    // cfg.output = outputs.map(o => ({
    //   ...o,
    //   globals: { ...(o.globals||{}), ...globalVars },
    // }));
});

export default configs;