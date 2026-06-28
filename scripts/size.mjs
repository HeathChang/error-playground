// 빌드 산출물의 raw / gzip 크기를 측정하고 코어 예산(≤ 8KB gzip)을 검사한다.
// docs/PLAN.md §11 — CI 사이즈 게이트의 기반.
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_GZIP = 8 * 1024; // 코어 8KB gzip
const targets = [
  'dist/error-playground.js', // ESM
  'dist/error-playground.iife.js', // IIFE (CDN/인라인)
];

let failed = false;
for (const file of targets) {
  if (!existsSync(file)) {
    console.error(`✗ ${file} — 없음 (먼저 \`npm run build\`)`);
    failed = true;
    continue;
  }
  const buf = readFileSync(file);
  const gzip = gzipSync(buf).length;
  const ok = gzip <= BUDGET_GZIP;
  const mark = ok ? '✓' : '✗';
  console.log(
    `${mark} ${file.padEnd(34)} ${(buf.length / 1024).toFixed(2)}KB raw  /  ${(gzip / 1024).toFixed(2)}KB gzip  (예산 ≤ ${BUDGET_GZIP / 1024}KB)`,
  );
  if (!ok) failed = true;
}

process.exit(failed ? 1 : 0);
