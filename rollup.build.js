import progress from 'rollup-plugin-progress';
import filesize from 'rollup-plugin-filesize';

const config = {
    input: 'src/index.js',
    output: {
        file: 'index.js',
        format: 'esm'
    },
    plugins: [
        progress({
            clearLine: false
        }),
        filesize()
    ]
};

export default config;
