/**
 * RotorGame — 원형 다이얼을 도는 바늘을 목표 섹터(호)와 정렬됐을 때 탭해 맞추는 게임의 **순수 로직**.
 * DOM/Canvas 비의존 → 결정적 테스트 가능. (게임 머신 카트리지, docs/PLAN.md §5.5)
 *
 * 기존 게임과의 차이: 회피(runner/flappy/orbit/gravity)·쌓기(stacker)·리듬 탭(rhythm)·
 * 선형 정지(timing)·경로 추적(zigzag)이 아니라, "회전하는 바늘을 목표 각도 섹터와 정렬"시키는
 * 각도 정렬(rotation alignment) 메커닉이다. 정렬된 순간 탭하면 성공, 벗어난 채 탭하면 게임오버.
 *
 * 좌표계: 각도는 라디안이며 항상 [0, TAU)로 정규화. angle=바늘, targetAngle=목표 섹터 중심, arc=섹터 반폭.
 * 매 성공마다 목표가 새 각도로 이동하고 회전이 빨라지며(가속) 섹터가 좁아진다(난이도 램프).
 */
import { createRng } from '../runner/rng';

export type GameStatus = 'ready' | 'running' | 'over';

export interface RotorOptions {
  width: number;
  height: number;
  seed: number;
}

const TAU = Math.PI * 2;
const SPEED_0 = 2.2; // rad/s (약 0.35 rev/s)
const SPEED_INC = 0.18; // 성공마다 가속(난이도 램프)
const SPEED_MAX = 7;
const ARC_0 = 0.42; // 목표 섹터 반폭(rad) — 시작 난이도(전체 폭 ≈ 48°)
const ARC_MIN = 0.16; // 섹터 반폭 하한(rad, ≈ 9°)
const ARC_DEC = 0.02; // 성공마다 좁아짐
const MIN_GAP = 0.8; // 새 목표는 현재 바늘에서 최소 이만큼 떨어짐(rad) → 즉시 재히트 방지(항상 arc보다 큼)
const FLIP_CHANCE = 0.4; // 성공 시 회전 방향 반전 확률(RNG) — 변주
// 한 step()이 전진할 최대 dt(초). 과대·비정상 dt로 인한 각도 폭주/무한 루프를 막는다
// (공용 콘솔의 MAX_FRAME과 정합 — docs/PLAN.md §5.5. 순수 로직 단독 호출에 대한 방어).
const MAX_STEP = 0.25;

/** 각도를 [0, TAU)로 정규화. */
function norm(a: number): number {
  const m = a % TAU;
  return m < 0 ? m + TAU : m;
}

/** 두 각도 사이 최단 거리(rad, 0..π) — 랩어라운드 고려. */
function angularDist(a: number, b: number): number {
  const d = Math.abs(norm(a) - norm(b));
  return d > Math.PI ? TAU - d : d;
}

/** 렌더가 공유하는 상수. */
export const ROTOR_GEO = { TAU } as const;

export class RotorGame {
  readonly width: number;
  readonly height: number;

  status: GameStatus = 'ready';
  score = 0;
  angle = 0; // 바늘 각도(rad, [0,TAU))
  targetAngle = 0; // 목표 섹터 중심(rad)
  arc = ARC_0; // 목표 섹터 반폭(rad)
  speed = SPEED_0; // 각속도(rad/s)
  dir: 1 | -1 = 1; // 회전 방향

  private readonly seed: number;
  private rng!: () => number;

  constructor(opts: RotorOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.seed = opts.seed;
    this.init();
  }

  /** 바늘이 목표 섹터 안에 있는가(정렬됨). 판정·렌더 공용 — 상태 변경 없음. */
  get aligned(): boolean {
    return angularDist(this.angle, this.targetAngle) <= this.arc;
  }

  /** ready→시작(회전), over→재시작, running→정렬 판정(맞으면 득점·이동·램프, 벗어나면 게임오버). */
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
    if (this.aligned) {
      this.score += 1;
      this.speed = Math.min(SPEED_MAX, this.speed + SPEED_INC);
      this.arc = Math.max(ARC_MIN, this.arc - ARC_DEC);
      if (this.rng() < FLIP_CHANCE) this.dir = (this.dir === 1 ? -1 : 1) as 1 | -1;
      this.pickTarget();
      return;
    }
    this.status = 'over';
  }

  step(dt: number): void {
    if (this.status !== 'running') return;
    // 비정상 dt 방어: 순수 로직이 외부에서 직접 호출되거나 호출자가 rAF 타임스탬프를 잘못 넘겨도
    // 각도 손상(NaN/Infinity)·역회전(음수·0)·폭주(과대 dt)가 없도록 한다.
    if (!Number.isFinite(dt) || dt <= 0) return;
    const d = dt > MAX_STEP ? MAX_STEP : dt;
    this.angle = norm(this.angle + this.dir * this.speed * d);
  }

  /** 새 목표 각도를 현재 바늘에서 최소 MIN_GAP 떨어진 곳으로 뽑는다(즉시 재히트 방지). */
  private pickTarget(): void {
    const span = TAU - 2 * MIN_GAP;
    const offset = MIN_GAP + this.rng() * span;
    this.targetAngle = norm(this.angle + offset);
  }

  /**
   * 초기(=재시작) 상태 구성. 생성자와 재시작(input() from 'over')이 **같은 진입점**을 공유한다.
   * RNG를 seed로 다시 만들기 때문에 같은 seed면 최초 생성뿐 아니라 **재시작 후에도 동일한 목표 시퀀스**가 나온다
   * (재현성 계약: docs/PLAN.md §5.5 "결정성은 game.ts의 속성").
   */
  private init(): void {
    this.score = 0;
    this.angle = 0;
    this.arc = ARC_0;
    this.speed = SPEED_0;
    this.dir = 1;
    this.rng = createRng(this.seed);
    this.pickTarget();
  }
}
