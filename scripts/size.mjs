// 빌드 산출물의 gzip 크기를 측정하고 예산을 검사한다 (docs/PLAN.md §11).
//
// 예산 해석:
//  - ESM 코어(error-playground.js): 번들러 소비자가 받는 "진짜 코어". 경험은 lazy 청크로 분리되므로
//    이 값이 커지면 안 된다 → 8KB 하드 게이트.
//  - IIFE(error-playground.iife.js): CDN용 올인원 번들. 설계상 모든 경험을 인라인하므로 경험이 늘면
//    함께 커진다(정상) → 별도의 느슨한 예산. IIFE를 작게 유지하려면 assetBase(외부 청크, v2)가 필요.
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const targets = [
  { file: 'dist/error-playground.js', label: 'ESM 코어 (lazy 경험)', budget: 8 * 1024 },
  { file: 'dist/error-playground.iife.js', label: 'IIFE 올인원 (경험 인라인)', budget: 24 * 1024 },
];

let failed = false;
for (const { file, label, budget } of targets) {
  if (!existsSync(file)) {
    console.error(`✗ ${file} — 없음 (먼저 \`npm run build\`)`);
    failed = true;
    continue;
  }
  const buf = readFileSync(file);
  const gzip = gzipSync(buf).length;
  const ok = gzip <= budget;
  if (!ok) failed = true;
  console.log(
    `${ok ? '✓' : '✗'} ${label.padEnd(24)} ${(gzip / 1024).toFixed(2)}KB gzip  (예산 ≤ ${budget / 1024}KB)  ${file}`,
  );
}

process.exit(failed ? 1 : 0);
