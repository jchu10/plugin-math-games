const baseConfig = require("@jspsych/config/jest").makePackageConfig(__dirname);

module.exports = {
    ...baseConfig,
    // Mock CSS and other asset imports
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    // Keep existing transform but ensure React JSX is handled
    globals: {
        'ts-jest': {
            tsconfig: {
                jsx: 'react-jsx',
            },
        },
    },
};