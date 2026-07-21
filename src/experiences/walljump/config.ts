/**
 * 벽점프 게임의 튜닝 상수·타입·렌더 공유 지오메트리 (순수 데이터, 로직 없음).
 * game.ts(순수 로직)와 render.ts(그리기)가 공유한다 → game.ts를 200줄 규칙 아래로 유지 (ruler/base.md).
 * 좌표계: worldY는 캔버스와 동일하게 **아래로 증가**. 오르기 = worldY 감소(음수).
 */
export type GameStatus = 'ready' | 'running' | 'over';
export type Side = 'left' | 'right';

export interface Spike {
  side: Side;
  worldY: number; // 스파이크 중심의 월드 Y
}

export interface WallJumpOptions {
  width: number;
  height: number;
  seed: number;
}

export const WALL_W = 14; // 벽 두께(px)
export const PR = 9; // 플레이어 반지름(px)
export const GRAVITY = 900; // px/s^2 (공중에서 vy에 가산, 아래로 +)
export const SLIDE_0 = 58; // 벽에 붙어 미끄러지는 속도(px/s) — 시작
export const SLIDE_INC = 3; // 점수(층)마다 미끄럼 가속(난이도 램프)
export const SLIDE_MAX = 130; // 미끄럼 상한
export const JUMP_VY = 340; // 벽차기 상승 임펄스(px/s, 위 = 음수로 적용)
export const FLIGHT_T = 0.42; // 목표 비행 시간(s) → vx = gap / FLIGHT_T (폭과 무관하게 일정)
export const SPIKE_HALF = 9; // 스파이크 세로 반높이(충돌 밴드)
export const FIRST_SPIKE = 260; // 첫 스파이크까지 상승 거리(px) — 시작 즉사 방지
export const GAP_0 = 150; // 스파이크 세로 간격 시작(px)
export const GAP_MIN = 96; // 간격 하한
export const GAP_DEC = 3; // 층마다 간격 감소(난이도 램프)
export const SPAWN_AHEAD = 40; // 화면 위쪽으로 이만큼 미리 스폰(px)
export const FLOOR_PX = 80; // 점수 1점당 상승 거리(px)
export const FOLLOW_RATIO = 0.42; // 렌더 카메라: 플레이어(최고점)를 화면 세로 42% 지점에 둠
export const SPIKE_LEN = 14; // 스파이크가 벽에서 안쪽으로 뻗는 길이(px, 렌더 전용)
// 한 step()이 전진할 최대 dt(초). 과대·비정상 dt로 인한 폭주/무한 루프를 막는다
// (공용 콘솔의 MAX_FRAME과 정합 — docs/PLAN.md §5.5. 순수 로직 단독 호출에 대한 방어).
export const MAX_STEP = 0.25;

/** 렌더가 공유하는 지오메트리/상수. */
export const WALLJUMP_GEO = { WALL_W, PR, SPIKE_HALF, SPIKE_LEN, FOLLOW_RATIO } as const;
