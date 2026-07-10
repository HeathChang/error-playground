/**
 * CubeGame — 회전 큐브 탭 게임의 **순수 로직** (DOM/CSS 의존 없음 → 결정적 테스트 가능).
 *
 * 규칙: 큐브가 Y축으로 자동 회전(4면 순환). "목표 면"이 정면에 정렬됐을 때 탭하면 득점.
 * 정면 판정은 angleY로부터 계산 → 렌더와 항상 일치(각도가 유일 진실).
 */
import { createRng } from '../runner/rng';

export type GameStatus = 'ready' | 'running' | 'over';

/** 정면에 올 수 있는 4개 면(Y 회전으로 순환). */
export const FACES = ['🏠', '⭐', '❤️', '🎮'] as const;

export interface CubeOptions {
  seed: number;
  duration?: number;
}

const BASE_SPEED = 70; // deg/s
const SPEED_RAMP = 7; // 히트마다 deg/s 증가
const MAX_SPEED = 260;
const BASE_TOL = 26; // 판정 허용 오차(deg)
const MIN_TOL = 12;
const DURATION = 25; // 초

/** deg를 [-180, 180]로 정규화. */
function norm180(deg: number): number {
  let d = ((deg % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

export class CubeGame {
  status: GameStatus = 'ready';
  angleY = 0;
  target = 0;
  score = 0;
  combo = 0;
  best = 0;
  timeLeft: number;
  lastHit: 'hit' | 'miss' | null = null;

  private rng: () => number;
  private speed = BASE_SPEED;
  private readonly duration: number;

  constructor(opts: CubeOptions) {
    this.rng = createRng(opts.seed);
    this.duration = opts.duration ?? DURATION;
    this.timeLeft = this.duration;
    this.target = this.pickTarget(-1);
  }

  get faceCount(): number {
    return FACES.length;
  }

  get currentSpeed(): number {
    return this.speed;
  }

  /** 현재 정면 면 인덱스 (angleY 최근접). */
  frontFace(): number {
    return ((Math.round(this.angleY / 90) % FACES.length) + FACES.length) % FACES.length;
  }

  /** 정면 정렬 오차(deg 절대값). 0이면 완벽 정렬. */
  alignmentError(): number {
    return Math.abs(norm180(this.angleY - this.frontFace() * 90));
  }

  private tolerance(): number {
    // 속도가 빠를수록 판정창이 좁아진다.
    return Math.max(MIN_TOL, BASE_TOL - (this.speed - BASE_SPEED) * 0.06);
  }

  private pickTarget(exclude: number): number {
    let t = Math.floor(this.rng() * FACES.length);
    if (t === exclude) t = (t + 1) % FACES.length;
    return t;
  }

  /** ready→시작, over→재시작, running→판정. */
  input(): void {
    if (this.status === 'ready') {
      this.status = 'running';
      return;
    }
    if (this.status === 'over') {
      this.reset();
      this.status = 'running';
      return;
    }
    if (this.frontFace() === this.target && this.alignmentError() <= this.tolerance()) {
      this.score += 1 + Math.floor(this.combo / 3); // 콤보 보너스
      this.combo += 1;
      this.best = Math.max(this.best, this.combo);
      this.speed = Math.min(MAX_SPEED, this.speed + SPEED_RAMP);
      this.lastHit = 'hit';
      this.target = this.pickTarget(this.frontFace());
    } else {
      this.combo = 0;
      this.lastHit = 'miss';
    }
  }

  step(dt: number): void {
    if (this.status !== 'running') return;
    this.angleY += this.speed * dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.status = 'over';
    }
  }

  private reset(): void {
    this.angleY = 0;
    this.speed = BASE_SPEED;
    this.score = 0;
    this.combo = 0;
    this.best = 0;
    this.timeLeft = this.duration;
    this.lastHit = null;
    this.target = this.pickTarget(-1);
  }
}
