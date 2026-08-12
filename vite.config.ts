import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { fileURLToPath, URL } from 'node:url'

// HTTPS=1 로 실행하면 자체 서명 인증서로 dev 서버를 https 로 띄운다.
// (모바일 카메라 등 보안 컨텍스트가 필요한 기능을 LAN에서 테스트할 때만 사용 — 기본은 http)
const useHttps = !!process.env.HTTPS

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    ...(useHttps ? [basicSsl()] : []),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // 무거운 AI 청크(onnxruntime wasm, transformers, 탐지 워커)는 앱 시작 시 미리 받지 않고
        // 해당 기능(영역별 보정 / Scene Match)에 진입할 때만 로드되도록 SW 프리캐시에서 제외한다.
        globIgnores: ['**/*.wasm', '**/transformers*.js', '**/detect.worker*.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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
