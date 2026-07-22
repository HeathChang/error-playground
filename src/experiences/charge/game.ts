/**
 * ChargeGame — 자동으로 차오르는 충전 미터를 "레드라인(과충전)"에 닿기 전에 탭으로 방출하는 게임의 **순수 로직**.
 * DOM/Canvas 비의존 → 결정적 테스트 가능. (게임 머신 카트리지, docs/PLAN.md §5.5)
 *
 * 기존 게임과의 차이: 회피(runner/flappy/orbit/gravity)·쌓기(stacker)·리듬 탭(rhythm)·
 * 선형 정지(timing)·경로 추적(zigzag)·각도 정렬(rotor)·벽점프(walljump)가 아니라,
 * "차오르는 게이지를 넘치기 직전까지 끌어올렸다가 방출"하는 **브링크맨십(push-your-luck)** 메커닉이다.
 * timing/rotor가 "중앙 존/목표에 정확히 맞추기"(양쪽으로 빗나감)라면, charge는 **한쪽으로만 실패**한다:
 * 높이 채울수록 고득점이지만 레드라인을 넘으면 즉사 → 욕심 vs 안전의 위험관리.
 *
 * 게이지: charge는 0..1로 정규화. redline은 과충전 임계값(0<redline≤1)으로 매 판 RNG로 뽑는다
 * → charge가 redline에 닿으면 오버로드(사망). 방출 점수는 방출 순간의 charge에 비례(높을수록 큼).
 */
import { createRng } from '../runner/rng';

export type GameStatus = 'ready' | 'running' | 'over';

export interface ChargeOptions {
  width: number;
  height: number;
  seed: number;
}

const RATE_0 = 0.5; // 충전 속도(1/s) 시작 — 0에서 1까지 약 2초
const RATE_INC = 0.05; // 방출 성공마다 가속(난이도 램프)
const RATE_MAX = 1.7; // 충전 속도 상한
const REDLINE_MIN = 0.7; // 레드라인(과충전 임계값) 하한 — 매 판 이 사이에서 RNG로 뽑음
const REDLINE_MAX = 0.97; // 레드라인 상한(1.0 = 게이지 최상단)
const SCORE_SCALE = 100; // 방출 점수 = round(charge * SCORE_SCALE) → 게이지가 높을수록 고득점
// 한 step()이 전진할 최대 dt(초). 과대·비정상 dt로 인한 게이지 폭주/무한 루프를 막는다
// (공용 콘솔의 MAX_FRAME과 정합 — docs/PLAN.md §5.5. 순수 로직 단독 호출에 대한 방어).
const MAX_STEP = 0.25;

export class ChargeGame {
  readonly width: number;
  readonly height: number;

  status: GameStatus = 'ready';
  score = 0;
  charge = 0; // 현재 충전량(0..1)
  redline = REDLINE_MAX; // 이번 판의 과충전 임계값(charge가 닿으면 오버로드)
  rate = RATE_0; // 현재 충전 속도(1/s)

  private readonly seed: number;
  private rng!: () => number;

  constructor(opts: ChargeOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.seed = opts.seed;
    this.init();
  }

  /** 지금 방출하면 얻을 점수(방출 순간 charge에 비례) — 판정/렌더 공용, 상태 변경 없음. */
  get payout(): number {
    return Math.round(this.charge * SCORE_SCALE);
  }

  /** ready→시작(충전), over→재시작, running→방출(레드라인 전이면 득점·가속·리셋, 넘었으면 오버로드). */
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
    if (this.charge >= this.redline) {
      this.status = 'over'; // 방어: step이 먼저 잡지만, 레드라인에서 방출은 실패로 처리
      return;
    }
    this.discharge();
  }

  step(dt: number): void {
    if (this.status !== 'running') return;
    // 비정상 dt 방어: 순수 로직이 외부에서 직접 호출되거나 호출자가 rAF 타임스탬프를 잘못 넘겨도
    // 게이지 손상(NaN/Infinity)·역충전(음수·0)·폭주(과대 dt)가 없도록 한다.
    if (!Number.isFinite(dt) || dt <= 0) return;
    const d = dt > MAX_STEP ? MAX_STEP : dt;
    this.charge += this.rate * d;
    if (this.charge >= this.redline) {
      this.charge = this.redline; // 렌더가 레드라인에 딱 붙게(과over-shoot 없이) — 오버로드 순간 시각화
      this.status = 'over';
    }
  }

  /** 레드라인 전 방출: 점수 적립 → 가속 → 게이지 0으로 → 새 레드라인 뽑기. */
  private discharge(): void {
    this.score += this.payout;
    this.rate = Math.min(RATE_MAX, this.rate + RATE_INC);
    this.charge = 0;
    this.pickRedline();
  }

  /** 새 레드라인을 [REDLINE_MIN, REDLINE_MAX)에서 뽑는다(RNG 주입 → 결정적). */
  private pickRedline(): void {
    this.redline = REDLINE_MIN + this.rng() * (REDLINE_MAX - REDLINE_MIN);
  }

  /**
   * 초기(=재시작) 상태 구성. 생성자와 재시작(input() from 'over')이 **같은 진입점**을 공유한다.
   * RNG를 seed로 다시 만들기 때문에 같은 seed면 최초 생성뿐 아니라 **재시작 후에도 동일한 레드라인 시퀀스**가 나온다
   * (재현성 계약: docs/PLAN.md §5.5 "결정성은 game.ts의 속성").
   */
  private init(): void {
    this.score = 0;
    this.charge = 0;
    this.rate = RATE_0;
    this.rng = createRng(this.seed);
    this.pickRedline();
  }
}
