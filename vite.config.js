import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: '/build/',
    build: {
        manifest: true,
        outDir: 'public/build',
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                    const ext = assetInfo.name.split('.').pop();
                    if (ext === 'css') {
                        return 'css/[name].min.css';
                    } else if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
                        return 'images/' + assetInfo.name;
                    } else {
                        return 'others/' + assetInfo.name;
                    }
                },
                entryFileNames: 'js/[name].js',
            },
        },
    },
    plugins: [
        laravel({
            input: [
                'resources/scss/theme.scss',
                'resources/js/app.js',
            ],
            refresh: true,
        }),
        viteStaticCopy({
            targets: [
                { src: 'resources/fonts', dest: '' },
                { src: 'resources/images', dest: '' },
            ],
        }),
        react(),
    ],
});

