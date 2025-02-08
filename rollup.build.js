import progress from 'rollup-plugin-progress';
import filesize from 'rollup-plugin-filesize';
import glslify from 'rollup-plugin-glslify';

export default {
    input: 'index.js',
    output: {
        file: 'dist/index.cjs',
        format: 'cjs',
    },
    plugins: [
        progress({
            clearLine: false,
        }),
        filesize(),
        glslify(),
    ],
};
