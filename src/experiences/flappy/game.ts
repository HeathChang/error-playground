/**
 * FlappyGame — 탭으로 날갯짓하며 파이프 사이를 통과하는 게임의 **순수 로직**.
 * DOM/Canvas 비의존 → 결정적 테스트 가능. (게임 머신 카트리지)
 */
import { createRng } from '../runner/rng';

export type GameStatus = 'ready' | 'running' | 'over';

export interface Pipe {
  x: number;
  gapY: number; // 통과 구멍의 위쪽 y
  scored: boolean;
}

export interface FlappyOptions {
  width: number;
  height: number;
  seed: number;
}

const GROUND_H = 16;
const BIRD_X = 60;
const BIRD_R = 11;
const GRAVITY = 1500; // px/s^2
const FLAP_V = -400; // px/s (위로)
const SPEED = 140; // px/s (파이프 왼쪽 이동)
const PIPE_W = 44;
const GAP_H = 84; // 통과 구멍 높이
const SPAWN_DX = 190; // 파이프 간 거리
const TOP_MARGIN = 20;

/** 렌더가 공유하는 지오메트리. */
export const FLAPPY_GEO = { BIRD_X, BIRD_R, PIPE_W, GAP_H } as const;

export class FlappyGame {
  readonly width: number;
  readonly height: number;
  readonly groundY: number;

  status: GameStatus = 'ready';
  birdY: number;
  vy = 0;
  pipes: Pipe[] = [];
  score = 0;

  private rng: () => number;
  private nextSpawnIn = 0;

  constructor(opts: FlappyOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.groundY = opts.height - GROUND_H;
    this.birdY = opts.height / 2;
    this.rng = createRng(opts.seed);
    this.scheduleSpawn();
  }

  /** ready→시작(첫 플랩), over→재시작, running→플랩. */
  input(): void {
    if (this.status === 'ready') {
      this.status = 'running';
      this.vy = FLAP_V;
      return;
    }
    if (this.status === 'over') {
      this.reset();
      this.status = 'running';
      this.vy = FLAP_V;
      return;
    }
    this.vy = FLAP_V;
  }

  step(dt: number): void {
    if (this.status !== 'running') return;

    this.vy += GRAVITY * dt;
    this.birdY += this.vy * dt;

    // 천장은 클램프(사망 아님)
    if (this.birdY - BIRD_R < 0) {
      this.birdY = BIRD_R;
      this.vy = 0;
    }
    // 바닥 충돌 = 사망
    if (this.birdY + BIRD_R >= this.groundY) {
      this.birdY = this.groundY - BIRD_R;
      this.status = 'over';
      return;
    }

    const dx = SPEED * dt;
    for (const p of this.pipes) p.x -= dx;

    this.nextSpawnIn -= dx;
    if (this.nextSpawnIn <= 0) this.spawn();

    // 파이프 통과 시 득점
    for (const p of this.pipes) {
      if (!p.scored && p.x + PIPE_W < BIRD_X) {
        p.scored = true;
        this.score += 1;
      }
    }
    // 파이프 충돌 = 사망
    for (const p of this.pipes) {
      if (this.hits(p)) {
        this.status = 'over';
        break;
      }
    }
    // 화면 밖 제거
    this.pipes = this.pipes.filter((p) => p.x + PIPE_W > 0);
  }

  private hits(p: Pipe): boolean {
    const left = BIRD_X - BIRD_R;
    const right = BIRD_X + BIRD_R;
    const top = this.birdY - BIRD_R;
    const bottom = this.birdY + BIRD_R;
    const xOverlap = left < p.x + PIPE_W && right > p.x;
    if (!xOverlap) return false;
    const inGap = top >= p.gapY && bottom <= p.gapY + GAP_H;
    return !inGap;
  }

  private scheduleSpawn(): void {
    this.nextSpawnIn = SPAWN_DX;
  }

  private spawn(): void {
    const maxGapY = this.groundY - GAP_H - TOP_MARGIN;
    const gapY = TOP_MARGIN + this.rng() * (maxGapY - TOP_MARGIN);
    this.pipes.push({ x: this.width, gapY, scored: false });
    this.scheduleSpawn();
  }

  private reset(): void {
    this.birdY = this.height / 2;
    this.vy = 0;
    this.pipes = [];
    this.score = 0;
    this.scheduleSpawn();
  }
}
