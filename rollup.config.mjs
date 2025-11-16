import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
  input: {
    background: 'background.js',
    content: 'content-enhanced.js',
    // popup removed
  },
  output: {
    dir: 'dist',
    format: 'esm',
    entryFileNames: chunk => {
      // popup bundle removed
      if (chunk.name === 'content') return 'content-enhanced.js';
      return '[name].js';
    },
    chunkFileNames: 'chunks/[name]-[hash].js',
    sourcemap: true
  },
  plugins: [
    resolve(),
    commonjs(),
    copy({
      targets: [
        { src: 'manifest.json', dest: 'dist' },
        { src: 'libs/**/*', dest: 'dist/libs' },
        { src: 'assets/**/*', dest: 'dist/assets' },
        { src: 'ui/**/*', dest: 'dist/ui' },
        { src: 'core/**/*', dest: 'dist/core' },
        { src: 'services/**/*', dest: 'dist/services' },
        { src: 'utils/**/*', dest: 'dist/utils' },
        // popup html removed
      ],
      copyOnce: false,
      hook: 'writeBundle'
    })
  ]
};
