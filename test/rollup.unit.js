import progress from 'rollup-plugin-progress';
import babel from 'rollup-plugin-babel';

const config = {
    input: [
        '../src/kampos.js',
        '../src/ticker.js',
        '../src/core.js',
        '../src/effects/brightness-contrast.js'
    ],
    output: {
        dir: './src',
        format: 'cjs',
        sourcemap: false
    },
    plugins: [
        progress({
            clearLine: false
        }),
        babel()
    ]
};

export default config;
