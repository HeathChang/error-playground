/**
 * TimingGame — 좌우로 스윕하는 마커를 목표 존 안에서 **정밀 정지**시키는 게임의 순수 로직.
 * DOM/Canvas 비의존 → 결정적 테스트 가능. (게임 머신 카트리지, docs/PLAN.md §5.5)
 *
 * 기존 게임과의 차이: 회피/쌓기/리듬 탭이 아니라 "움직이는 마커를 원하는 지점에 멈추는" 정지 메커닉.
 * 성공하면 목표 존이 좁아지고 스윕이 빨라진다(난이도 램프). 존 밖에서 멈추면 게임오버.
 *
 * 좌표계: 트랙은 정규화된 [0,1] (해상도 독립) — 픽셀 매핑은 render.ts가 담당한다.
 */
import { createRng } from '../runner/rng';

export type GameStatus = 'ready' | 'running' | 'over';
export type Phase = 'sweep' | 'paused';

export interface TimingOptions {
  width: number;
  height: number;
  seed: number;
}

const SPEED_0 = 0.9; // 트랙/초 (초기 스윕 속도)
const SPEED_INC = 0.08; // 히트마다 가속
const SPEED_MAX = 2.2;
const HALF_0 = 0.16; // 목표 존 반폭(초기) → 폭 0.32
const HALF_DEC = 0.012; // 히트마다 존 축소
const HALF_MIN = 0.045; // 최소 반폭 → 폭 0.09
const PAUSE_TIME = 0.35; // 히트 후 정지 연출 시간(초). 이후 자동 재개.

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export class TimingGame {
  readonly width: number;
  readonly height: number;

  status: GameStatus = 'ready';
  score = 0;
  pos = 0; // 마커 위치 [0,1]
  dir: 1 | -1 = 1;
  speed = SPEED_0;
  target = 0.5; // 목표 존 중심 [0,1]
  half = HALF_0; // 목표 존 반폭
  phase: Phase = 'sweep';
  pauseLeft = 0;

  private rng: () => number;
  private stopRequested = false;

  constructor(opts: TimingOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.rng = createRng(opts.seed);
    this.target = this.pickTarget();
  }

  /** ready→시작, over→재시작, running(sweep)→정지 요청(평가는 step에서). */
  input(): void {
    if (this.status === 'ready') {
      this.status = 'running';
      this.phase = 'sweep';
      this.pos = 0;
      this.dir = 1;
      return;
    }
    if (this.status === 'over') {
      this.reset();
      this.status = 'running';
      return;
    }
    // running: 스윕 중일 때만 정지 시도(정지 연출 중 입력은 무시).
    if (this.phase === 'sweep') this.stopRequested = true;
  }

  step(dt: number): void {
    if (this.status !== 'running') return;

    if (this.phase === 'paused') {
      this.stopRequested = false; // 정지 연출 중 들어온 입력은 버린다.
      this.pauseLeft -= dt;
      if (this.pauseLeft <= 0) {
        // 정지 연출 동안엔 방금 성공한 목표/폭을 그대로 유지한다(렌더러가 그리는 존과 마커가 일치).
        // 난이도 램프와 다음 목표는 **재개 시점에** 적용해, pause 화면이 다른 목표를 보여 주지 않게 한다.
        this.speed = Math.min(SPEED_MAX, this.speed + SPEED_INC);
        this.half = Math.max(HALF_MIN, this.half - HALF_DEC);
        this.target = this.pickTarget();
        this.phase = 'sweep';
        this.pos = 0;
        this.dir = 1;
      }
      return;
    }

    // sweep: 정지 요청이 있으면 이번 프레임에 평가(마커는 멈춘 자리에서 판정 — 크리스프 스톱).
    if (this.stopRequested) {
      this.stopRequested = false;
      this.evaluateStop();
      return;
    }

    this.advance(dt);
  }

  /**
   * 마커를 dt만큼 진행시키고 벽에서 반사(ping-pong)한다.
   * 한 프레임의 이동이 트랙을 여러 번 가로질러도(외부에서 큰 dt로 호출해도) pos는 항상 [0,1]에 머문다.
   * ping-pong은 이동 거리 2마다 (pos, dir)가 원위치이므로, 이동량을 mod 2로 줄여 반사 루프를 유한하게 유지한다.
   */
  private advance(dt: number): void {
    this.pos += (this.dir * this.speed * dt) % 2;
    while (this.pos < 0 || this.pos > 1) {
      if (this.pos > 1) {
        this.pos = 2 - this.pos; // 오른쪽 벽 반사
        this.dir = -1;
      } else {
        this.pos = -this.pos; // 왼쪽 벽 반사
        this.dir = 1;
      }
    }
    this.pos = clamp01(this.pos); // 부동소수 오차 방어 — 불변식: pos ∈ [0,1]
  }

  /** 정지 위치가 목표 존 안이면 히트, 아니면 게임오버. */
  private evaluateStop(): void {
    if (Math.abs(this.pos - this.target) <= this.half) {
      this.score += 1;
      // 목표/폭은 그대로 두고 정지 연출로 전환한다 — pause 동안 마커(pos)가 표시된 목표 존 안에 머문다.
      // 난이도 램프·다음 목표는 재개 시(step의 paused 분기)에 적용한다.
      this.phase = 'paused';
      this.pauseLeft = PAUSE_TIME;
      return;
    }
    this.status = 'over';
  }

  /** 목표 존이 트랙을 벗어나지 않도록 중심을 [half, 1-half]에서 뽑는다. */
  private pickTarget(): number {
    return clamp01(this.half + this.rng() * (1 - 2 * this.half));
  }

  private reset(): void {
    this.score = 0;
    this.speed = SPEED_0;
    this.half = HALF_0;
    this.pos = 0;
    this.dir = 1;
    this.phase = 'sweep';
    this.pauseLeft = 0;
    this.stopRequested = false;
    this.target = this.pickTarget();
  }
}
