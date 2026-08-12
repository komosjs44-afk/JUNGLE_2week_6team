import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // onnxruntime-web(WASM, 세그멘테이션 POC용)은 수십 MB라 SW 프리캐시에서 제외한다.
        // 앱 시작 시 미리 받지 않고, /dev/segment 진입 시 필요할 때만 로드된다.
        globIgnores: ['**/*.wasm'],
      },
      manifest: {
        name: 'RE:FRAME',
        short_name: 'RE:FRAME',
        description: '마음에 든 사진을, 직접 다시 찍다.',
        theme_color: '#007a5e',
        background_color: '#f7faf9',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
