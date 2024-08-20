import progress from 'rollup-plugin-progress';
import filesize from 'rollup-plugin-filesize';

export default {
    input: './index.js',
    output: {
        name: 'kampos',
        file: 'index.umd.js',
        format: 'umd',
        sourcemap: false
    },
    plugins: [
        progress({
            clearLine: false
        }),
        filesize()
    ]
};
