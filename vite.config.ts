import { defineConfig } from 'vitest/config';

// M0: 단일 라이브러리 빌드로 ESM + IIFE 두 포맷 출력.
// 동적 import(경험 청크)가 들어오는 M1부터는 코어 IIFE + ESM 청크로 분리 예정 (docs/PLAN.md §8).
export default defineConfig({
  // dev 서버: 루트(/)에 데모 허브 index.html을 서빙하고 자동으로 연다.
  // 라이브러리 빌드(build.lib)는 index.html을 무시하고 src/core/index.ts를 엔트리로 쓴다.
  server: {
    open: '/',
  },
  build: {
    lib: {
      entry: 'src/core/index.ts',
      name: 'ErrorPlayground', // IIFE 전역: window.ErrorPlayground.mount(...)
      formats: ['es', 'iife'],
      fileName: (format) =>
        format === 'es' ? 'error-playground.js' : 'error-playground.iife.js',
    },
    minify: 'esbuild',
    sourcemap: true,
    target: 'es2020',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
});
