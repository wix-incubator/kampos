import progress from 'rollup-plugin-progress';
import filesize from 'rollup-plugin-filesize';

const config = {
    input: 'demo.js',
    output: {
        file: 'index.js',
        format: 'iife',
        sourcemap: false,
    },
    plugins: [
        progress({
            clearLine: false,
        }),
        filesize(),
    ],
};

export default config;
