import { makeRollupConfig } from "@jspsych/config/rollup";
import postcss from 'rollup-plugin-postcss';

const configs = makeRollupConfig("jsPsychPluginMathGames");

// Modify the browser config to use umd format
const browserConfig = configs.find(config => config.output.file && config.output.file.includes('index.browser.js'));
if (browserConfig) {
    browserConfig.output.format = 'umd';
    browserConfig.output.name = 'jsPsychPluginMathGames';
    browserConfig.output.globals = { jspsych: 'jsPsych' };
}

// Add postcss plugin to all configurations
configs.forEach(config => {
    config.plugins.push(postcss({
        extract: true, // Extract CSS to a separate file
        minimize: true, // Minify the CSS
    }));
});

export default configs;