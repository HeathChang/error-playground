/**
 * WallJumpGame — 두 벽 사이 세로 통로를 벽차기(wall kick)로 오르는 게임의 **순수 로직**.
 * DOM/Canvas 비의존 → 결정적 테스트 가능. (게임 머신 카트리지, docs/PLAN.md §5.5)
 *
 * 기존 게임과의 차이: 회피(runner/flappy/orbit/gravity)·쌓기(stacker)·리듬 탭(rhythm)·
 * 선형 정지(timing)·경로 추적(zigzag)·각도 정렬(rotor)이 아니라, "한쪽 벽에 붙어 미끄러지다
 * 탭 한 번으로 반대 벽으로 대각선 위로 벽차기"하는 **벽점프(wall-kick climb)** 메커닉이다.
 * 두 압력이 공존한다: (1) 안 차면 미끄러져 화면 밖으로 추락(사망), (2) 붙은 벽의 스파이크에 닿으면 사망.
 *
 * 좌표계: worldY는 캔버스와 동일하게 **아래로 증가**. 오르기 = worldY 감소(음수). 카메라는
 * 최고 높이(bestWorldY)에 고정(래칫)되어 렌더가 파생하며, 순수 로직은 추락 판정만 스칼라로 한다.
 */
import { createRng } from '../runner/rng';

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

const WALL_W = 14; // 벽 두께(px)
const PR = 9; // 플레이어 반지름(px)
const GRAVITY = 900; // px/s^2 (공중에서 vy에 가산, 아래로 +)
const SLIDE_0 = 58; // 벽에 붙어 미끄러지는 속도(px/s) — 시작
const SLIDE_INC = 3; // 점수(층)마다 미끄럼 가속(난이도 램프)
const SLIDE_MAX = 130; // 미끄럼 상한
const JUMP_VY = 340; // 벽차기 상승 임펄스(px/s, 위 = 음수로 적용)
const FLIGHT_T = 0.42; // 목표 비행 시간(s) → vx = gap / FLIGHT_T (폭과 무관하게 일정)
const SPIKE_HALF = 9; // 스파이크 세로 반높이(충돌 밴드)
const FIRST_SPIKE = 260; // 첫 스파이크까지 상승 거리(px) — 시작 즉사 방지
const GAP_0 = 150; // 스파이크 세로 간격 시작(px)
const GAP_MIN = 96; // 간격 하한
const GAP_DEC = 3; // 층마다 간격 감소(난이도 램프)
const SPAWN_AHEAD = 40; // 화면 위쪽으로 이만큼 미리 스폰(px)
const FLOOR_PX = 80; // 점수 1점당 상승 거리(px)
const FOLLOW_RATIO = 0.42; // 렌더 카메라: 플레이어(최고점)를 화면 세로 42% 지점에 둠
const SPIKE_LEN = 14; // 스파이크가 벽에서 안쪽으로 뻗는 길이(px, 렌더 전용)
// 한 step()이 전진할 최대 dt(초). 과대·비정상 dt로 인한 폭주/무한 루프를 막는다
// (공용 콘솔의 MAX_FRAME과 정합 — docs/PLAN.md §5.5. 순수 로직 단독 호출에 대한 방어).
const MAX_STEP = 0.25;

/** 렌더가 공유하는 지오메트리/상수. */
export const WALLJUMP_GEO = { WALL_W, PR, SPIKE_HALF, SPIKE_LEN, FOLLOW_RATIO } as const;

export class WallJumpGame {
  readonly width: number;
  readonly height: number;

  status: GameStatus = 'ready';
  score = 0;

  side: Side = 'left'; // 붙어 있는(또는 향하는) 벽
  airborne = false; // 공중(벽차기 비행 중)인가
  x = WALL_W + PR; // 플레이어 x(px) — 공중일 때만 변함(좌우 벽 사이 보간)
  worldY = 0; // 플레이어 월드 Y(아래로 +)
  vy = 0; // 세로 속도(아래로 +)
  vx = 0; // 가로 속도(공중, 목표 벽 방향)
  bestWorldY = 0; // 지금까지 최고 높이(가장 작은 worldY) — 카메라/추락 판정 기준
  spikes: Spike[] = [];

  private readonly seed: number;
  private readonly gap: number; // 두 벽에 붙는 x 사이 거리
  private readonly vxMag: number; // 비행 가로 속도 크기(= gap / FLIGHT_T)
  private readonly fallLimit: number; // 최고점 대비 이만큼 내려가면 추락사
  private rng!: () => number;
  private nextSpawnWorldY = -FIRST_SPIKE;
  private spikeGap = GAP_0;

  constructor(opts: WallJumpOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.seed = opts.seed;
    this.gap = Math.max(40, opts.width - 2 * WALL_W - 2 * PR);
    this.vxMag = this.gap / FLIGHT_T;
    this.fallLimit = opts.height * (1 - FOLLOW_RATIO);
    this.init();
  }

  /** 지정 벽에 붙었을 때의 x(px). 렌더·비행 도착 판정 공용. */
  clungX(side: Side): number {
    return side === 'left' ? WALL_W + PR : this.width - WALL_W - PR;
  }

  /** 렌더용 카메라 상단 worldY(최고점 기준 래칫) — screenY = worldY - cameraTop. */
  get cameraTop(): number {
    return this.bestWorldY - this.height * FOLLOW_RATIO;
  }

  /** ready→시작, over→재시작, running→(벽에 붙어 있을 때만) 반대 벽으로 벽차기. */
  input(): void {
    if (this.status === 'ready') {
      this.status = 'running';
      return;
    }
    if (this.status === 'over') {
      this.init(); // 같은 seed의 결정적 시작 상태로 복원(RNG 포함)
      this.status = 'running';
      return;
    }
    if (this.airborne) return; // 공중에선 찰 수 없다 — 벽에 붙었을 때만
    this.kick();
  }

  step(dt: number): void {
    if (this.status !== 'running') return;
    // 비정상 dt 방어: NaN/Infinity·음수·0으로 상태가 손상되지 않게 한다.
    if (!Number.isFinite(dt) || dt <= 0) return;
    const d = dt > MAX_STEP ? MAX_STEP : dt;

    if (this.airborne) {
      this.vy += GRAVITY * d;
      this.worldY += this.vy * d;
      this.x += this.vx * d;
      const targetX = this.clungX(this.side);
      const arrived = this.side === 'right' ? this.x >= targetX : this.x <= targetX;
      if (arrived) {
        this.x = targetX;
        this.airborne = false;
        this.vy = 0; // 착지 → 다음 프레임부터 미끄럼
      }
    } else {
      this.vy = this.slideSpeed();
      this.worldY += this.vy * d;
    }

    if (this.worldY < this.bestWorldY) this.bestWorldY = this.worldY;
    this.updateScore();
    this.spawnAhead();
    this.prune();

    // 추락사: 최고점보다 fallLimit 이상 아래로 내려가면(= 화면 밖으로).
    if (this.worldY - this.bestWorldY > this.fallLimit) {
      this.status = 'over';
      return;
    }
    // 스파이크 충돌은 **벽에 붙어 있을 때만** 판정한다(공중 = 벽 사이 = 안전).
    if (!this.airborne && this.hitsSpike()) {
      this.status = 'over';
    }
  }

  /** 반대 벽으로 대각선 위 벽차기: side를 목표 벽으로 뒤집고 상승+가로 임펄스를 준다. */
  private kick(): void {
    this.side = this.side === 'left' ? 'right' : 'left';
    this.airborne = true;
    this.vy = -JUMP_VY;
    this.vx = this.side === 'right' ? this.vxMag : -this.vxMag;
  }

  private slideSpeed(): number {
    return Math.min(SLIDE_MAX, SLIDE_0 + this.score * SLIDE_INC);
  }

  /** 점수 = 오른 높이(층). bestWorldY만 줄어들므로 점수는 단조 증가. */
  private updateScore(): void {
    const climbed = -this.bestWorldY;
    const floors = climbed > 0 ? Math.floor(climbed / FLOOR_PX) : 0;
    if (floors > this.score) this.score = floors;
  }

  /**
   * 화면 위쪽(카메라 상단) 너머 SPAWN_AHEAD까지 스파이크를 미리 채운다.
   * 한 altitude에는 **한쪽 벽에만** 스파이크가 생겨 항상 반대 벽으로 피할 수 있다(솔벌빌리티 보장).
   */
  private spawnAhead(): void {
    const ceiling = this.cameraTop - SPAWN_AHEAD;
    while (this.nextSpawnWorldY > ceiling) {
      const side: Side = this.rng() < 0.5 ? 'left' : 'right';
      this.spikes.push({ side, worldY: this.nextSpawnWorldY });
      this.spikeGap = Math.max(GAP_MIN, GAP_0 - this.score * GAP_DEC);
      this.nextSpawnWorldY -= this.spikeGap;
    }
  }

  /** 화면 아래로 충분히 내려간 스파이크 제거(메모리 누수 방지). */
  private prune(): void {
    if (this.spikes.length === 0) return;
    const floor = this.cameraTop + this.height + SPIKE_LEN;
    this.spikes = this.spikes.filter((s) => s.worldY < floor);
  }

  /** 붙어 있는 벽의 스파이크와 세로 밴드가 겹치면 충돌. */
  private hitsSpike(): boolean {
    for (const s of this.spikes) {
      if (s.side !== this.side) continue;
      if (Math.abs(s.worldY - this.worldY) < PR + SPIKE_HALF) return true;
    }
    return false;
  }

  /**
   * 초기(=재시작) 상태 구성. 생성자와 재시작(input() from 'over')이 **같은 진입점**을 공유한다.
   * RNG를 seed로 다시 만들기 때문에 같은 seed면 최초 생성뿐 아니라 **재시작 후에도 동일한 스파이크 시퀀스**가 나온다
   * (재현성 계약: docs/PLAN.md §5.5 "결정성은 game.ts의 속성").
   */
  private init(): void {
    this.score = 0;
    this.side = 'left';
    this.airborne = false;
    this.x = this.clungX('left');
    this.worldY = 0;
    this.vy = 0;
    this.vx = 0;
    this.bestWorldY = 0;
    this.spikes = [];
    this.spikeGap = GAP_0;
    this.nextSpawnWorldY = -FIRST_SPIKE;
    this.rng = createRng(this.seed);
  }
}
