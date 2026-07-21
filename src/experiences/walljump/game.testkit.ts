/**
 * WallJumpGame 테스트 공용 픽스처/헬퍼.
 * game.test.ts(핵심 메커닉)와 game.determinism.test.ts(결정성/스폰)가 공유한다.
 * `.testkit.ts`라 vitest include(`*.test.ts`)·라이브러리 빌드에서 제외된다.
 */
import { WallJumpGame, type Side, type WallJumpOptions } from './game';

export const OPTS: WallJumpOptions = { width: 320, height: 200, seed: 42 };

/** 벽에 붙을 때마다 즉시 벽차기하는 "쉼 없이 오르기". 공개 입력 API만 사용. */
export function autoClimb(g: WallJumpGame, frames: number): number {
  let maxScore = 0;
  for (let i = 0; i < frames; i += 1) {
    if (g.status !== 'running') break;
    if (!g.airborne) g.input(); // 붙은 순간에만 벽차기(공중에선 무시됨)
    g.step(1 / 60);
    if (g.score > maxScore) maxScore = g.score;
  }
  return maxScore;
}

/** running 상태로 만든 뒤, 공중에서 벗어날(착지) 때까지 프레임 진행. 착지 side 반환. */
export function flyUntilLanded(g: WallJumpGame, maxFrames = 120): Side {
  for (let i = 0; i < maxFrames && g.airborne; i += 1) g.step(1 / 60);
  return g.side;
}
