/**
 * OrbitGame — 점이 중심 둘레의 두 궤도(안/바깥)를 도는 **방사형 회피** 게임의 순수 로직.
 * 앞쪽 장애물이 현재 궤도(레인)에 있으면 탭해서 반대 궤도로 피한다. DOM/Canvas 비의존 → 결정적.
 */
import { createRng } from '../runner/rng';

export type GameStatus = 'ready' | 'running' | 'over';

export interface Obstacle {
  angle: number; // 절대 각도(rad, 단조 증가)
  lane: 0 | 1; // 0=안쪽, 1=바깥쪽
  resolved: boolean;
}

export interface OrbitOptions {
  width: number;
  height: number;
  seed: number;
}

const BASE_W = 1.8; // rad/s
const RAMP = 0.14; // rad/s 증가 / 초
const MAX_W = 4.6;
const GAP = 0.95; // 장애물 간 각도 간격
const AHEAD = Math.PI * 2 + 0.6; // 앞쪽 버퍼
const FIRST = 1.4; // 첫 장애물까지 여유

export class OrbitGame {
  readonly width: number;
  readonly height: number;
  readonly cx: number;
  readonly cy: number;
  readonly rInner: number;
  readonly rOuter: number;

  status: GameStatus = 'ready';
  angle = 0;
  dotLane: 0 | 1 = 0;
  obstacles: Obstacle[] = [];
  score = 0;

  private rng: () => number;
  private w = BASE_W;
  private elapsed = 0;
  private nextAngle = FIRST;

  constructor(opts: OrbitOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.cx = opts.width / 2;
    this.cy = opts.height / 2;
    this.rOuter = Math.min(opts.width, opts.height) / 2 - 16;
    this.rInner = this.rOuter - 26;
    this.rng = createRng(opts.seed);
    this.fill();
  }

  laneRadius(lane: 0 | 1): number {
    return lane === 1 ? this.rOuter : this.rInner;
  }

  /** ready→시작, over→재시작, running→레인 토글. */
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
    this.dotLane = this.dotLane === 0 ? 1 : 0;
  }

  step(dt: number): void {
    if (this.status !== 'running') return;
    this.elapsed += dt;
    this.w = Math.min(MAX_W, BASE_W + RAMP * this.elapsed);
    this.angle += this.w * dt;

    for (const o of this.obstacles) {
      if (!o.resolved && o.angle <= this.angle) {
        o.resolved = true;
        if (o.lane === this.dotLane) {
          this.status = 'over';
          return;
        }
        this.score += 1;
      }
    }
    this.fill();
    this.obstacles = this.obstacles.filter((o) => o.angle > this.angle - 1);
  }

  private fill(): void {
    while (this.nextAngle < this.angle + AHEAD) {
      const lane: 0 | 1 = this.rng() < 0.5 ? 0 : 1;
      this.obstacles.push({ angle: this.nextAngle, lane, resolved: false });
      this.nextAngle += GAP;
    }
  }

  private reset(): void {
    this.angle = 0;
    this.dotLane = 0;
    this.obstacles = [];
    this.score = 0;
    this.w = BASE_W;
    this.elapsed = 0;
    this.nextAngle = FIRST;
    this.fill();
  }
}
