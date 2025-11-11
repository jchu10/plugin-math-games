import { makeRollupConfig } from "@jspsych/config/rollup";
import postcss from 'rollup-plugin-postcss';

const configs = makeRollupConfig("jsPsychPluginMathGames");

// Add postcss plugin to all configurations
configs.forEach(config => {
    config.plugins.push(postcss({
        extract: true, // Extract CSS to a separate file
        minimize: true, // Minify the CSS
    }));
});

export default configs;