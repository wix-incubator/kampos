import progress from 'rollup-plugin-progress';
import filesize from 'rollup-plugin-filesize';
import babel from 'rollup-plugin-babel';

const config = {
    input: 'src/index.js',
    output: {
        name: 'kampos',
        file: 'index.js',
        format: 'umd',
        sourcemap: false
    },
    plugins: [
        progress({
            clearLine: false
        }),
        babel(),
        filesize()
    ]
};

export default config;
