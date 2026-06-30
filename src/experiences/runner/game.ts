/**
 * 러너 게임의 **순수 로직** — DOM/Canvas에 의존하지 않는다.
 * 렌더(render.ts)·입력/루프(index.ts)와 분리되어 결정적으로 테스트 가능하다.
 * 좌표계: 원점 좌상단, y 아래로 증가. 플레이어/장애물은 지면 위에 선다.
 */
import { createRng } from './rng';

export type GameStatus = 'ready' | 'running' | 'over';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RunnerOptions {
  width: number;
  height: number;
  seed: number;
}

const GROUND_H = 16;
const PLAYER_W = 18;
const PLAYER_H = 22;
const GRAVITY = 2200; // px/s^2
const JUMP_V = 760; // px/s (위쪽)
const BASE_SPEED = 320; // px/s
const SPEED_RAMP = 8; // px/s 증가 / 초
const MAX_SPEED = 760; // px/s
const OB_MIN_W = 12;
const OB_MAX_W = 26;
const OB_MIN_H = 20;
const OB_MAX_H = 44;
const SPAWN_MIN = 220; // 다음 장애물까지 최소 거리(px)
const SPAWN_RANGE = 280;

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class RunnerGame {
  readonly width: number;
  readonly height: number;
  readonly groundY: number;

  status: GameStatus = 'ready';
  player: Box;
  obstacles: Box[] = [];

  private rng: () => number;
  private vy = 0;
  private elapsed = 0;
  private score = 0;
  private speed = BASE_SPEED;
  private nextSpawnIn = 0;

  constructor(opts: RunnerOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.groundY = opts.height - GROUND_H;
    this.rng = createRng(opts.seed);
    this.player = { x: 32, y: this.groundY - PLAYER_H, w: PLAYER_W, h: PLAYER_H };
    this.scheduleSpawn();
  }

  get scoreValue(): number {
    return Math.floor(this.score);
  }

  get currentSpeed(): number {
    return this.speed;
  }

  /** 유일한 사용자 입력. ready→시작, over→재시작, running→점프(접지 시에만). */
  jump(): void {
    if (this.status === 'ready') {
      this.status = 'running';
      this.vy = -JUMP_V;
      return;
    }
    if (this.status === 'over') {
      this.reset();
      this.status = 'running';
      return;
    }
    if (this.isGrounded()) this.vy = -JUMP_V;
  }

  /** 고정 timestep(dt초)으로 한 스텝 진행. running이 아니면 아무것도 하지 않는다. */
  step(dt: number): void {
    if (this.status !== 'running') return;

    this.elapsed += dt;
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + SPEED_RAMP * this.elapsed);

    // 플레이어 물리
    this.vy += GRAVITY * dt;
    this.player.y += this.vy * dt;
    const floor = this.groundY - this.player.h;
    if (this.player.y > floor) {
      this.player.y = floor;
      this.vy = 0;
    }

    // 장애물 이동 + 화면 밖 제거
    const dx = this.speed * dt;
    for (const o of this.obstacles) o.x -= dx;
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > 0);

    // 거리 기반 스폰
    this.nextSpawnIn -= dx;
    if (this.nextSpawnIn <= 0) this.spawn();

    // 점수(거리 기반)
    this.score += dx * 0.05;

    // 충돌 → 게임 오버
    for (const o of this.obstacles) {
      if (intersects(this.player, o)) {
        this.status = 'over';
        break;
      }
    }
  }

  private isGrounded(): boolean {
    return this.player.y >= this.groundY - this.player.h - 0.5;
  }

  private scheduleSpawn(): void {
    this.nextSpawnIn = SPAWN_MIN + this.rng() * SPAWN_RANGE;
  }

  private spawn(): void {
    const w = OB_MIN_W + this.rng() * (OB_MAX_W - OB_MIN_W);
    const h = OB_MIN_H + this.rng() * (OB_MAX_H - OB_MIN_H);
    this.obstacles.push({ x: this.width, y: this.groundY - h, w, h });
    this.scheduleSpawn();
  }

  private reset(): void {
    this.vy = 0;
    this.elapsed = 0;
    this.score = 0;
    this.speed = BASE_SPEED;
    this.obstacles = [];
    this.player.y = this.groundY - this.player.h;
    this.scheduleSpawn();
  }
}
