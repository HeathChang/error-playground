/**
 * ChargeGame 테스트 공용 픽스처/헬퍼.
 * game.test.ts(핵심 메커닉)와 game.determinism.test.ts(결정성/레드라인)가 공유한다.
 * `.testkit.ts`라 vitest include(`*.test.ts`)·라이브러리 빌드에서 제외된다.
 */
import { ChargeGame, type ChargeOptions } from './game';

export const OPTS: ChargeOptions = { width: 320, height: 200, seed: 42 };

/** running으로 만든 뒤 방출 없이 charge가 target에 닿을 때까지 프레임 진행. */
export function chargeTo(g: ChargeGame, target: number, maxFrames = 600): void {
  for (let i = 0; i < maxFrames && g.status === 'running' && g.charge < target; i += 1) {
    g.step(1 / 60);
  }
}

/** "레드라인 직전 방출" 자동 플레이: 매 프레임 charge가 redline*frac 이상이면 방출. maxScore 반환. */
export function autoDischarge(g: ChargeGame, frames: number, frac = 0.9): number {
  let maxScore = 0;
  for (let i = 0; i < frames; i += 1) {
    if (g.status !== 'running') break;
    if (g.charge >= g.redline * frac) g.input(); // 안전 마진 안에서 방출(공개 입력 API만 사용)
    g.step(1 / 60);
    if (g.score > maxScore) maxScore = g.score;
  }
  return maxScore;
}

/** autoDischarge와 동일 플레이를 하되, 매 방출 직후 뽑힌 새 레드라인을 기록해 시퀀스를 반환. */
export function tracedDischarge(g: ChargeGame, frames: number, frac = 0.9): number[] {
  const redlines: number[] = [];
  for (let i = 0; i < frames; i += 1) {
    if (g.status !== 'running') break;
    if (g.charge >= g.redline * frac) {
      g.input();
      redlines.push(g.redline);
    }
    g.step(1 / 60);
  }
  return redlines;
}
