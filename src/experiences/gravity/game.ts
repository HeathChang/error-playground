/**
 * GravityGame — 탭으로 중력 방향을 천장↔바닥으로 뒤집어 스크롤 스파이크를 피하는 게임의 **순수 로직**.
 * DOM/Canvas 비의존 → 결정적 테스트 가능. (게임 머신 카트리지, docs/PLAN.md §5.5)
 */
import { createRng } from '../runner/rng';

export type GameStatus = 'ready' | 'running' | 'over';

export type ObstacleSide = 'top' | 'bottom';

export interface Obstacle {
  x: number;
  side: ObstacleSide;
  h: number; // 붙은 면에서 안쪽으로 뻗은 높이
  scored: boolean;
}

export interface GravityOptions {
  width: number;
  height: number;
  seed: number;
}

const PLAYER_X = 56;
const PLAYER_R = 10;
const GRAVITY = 1700; // px/s^2 (부호는 g로)
const MAX_VY = 640; // px/s (낙하 속도 클램프)
const SPEED = 150; // px/s (장애물 왼쪽 이동)
const OBST_W = 26;
const SPAWN_DX = 200; // 장애물 간 거리 (> OBST_W → 상·하 동시 x 겹침 없음 = 항상 통과 가능)
const MIN_H_RATIO = 0.18;
const MAX_H_RATIO = 0.42; // 중앙(height/2)에 있으면 어떤 장애물에도 안 닿는 상한 (테스트 관찰용)

/** 렌더가 공유하는 지오메트리. */
export const GRAVITY_GEO = { PLAYER_X, PLAYER_R, OBST_W } as const;

export class GravityGame {
  readonly width: number;
  readonly height: number;

  status: GameStatus = 'ready';
  playerY: number;
  vy = 0;
  g: 1 | -1 = 1; // +1=아래로, -1=위로
  obstacles: Obstacle[] = [];
  score = 0;

  private rng: () => number;
  private nextSpawnIn = 0;

  constructor(opts: GravityOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.playerY = opts.height / 2;
    this.rng = createRng(opts.seed);
    this.scheduleSpawn();
  }

  /** ready→시작(아래로 낙하), over→재시작, running→중력 반전. */
  input(): void {
    if (this.status === 'ready') {
      this.status = 'running';
      this.g = 1;
      return;
    }
    if (this.status === 'over') {
      this.reset();
      this.status = 'running';
      this.g = 1;
      return;
    }
    this.g = this.g === 1 ? -1 : 1;
  }

  step(dt: number): void {
    if (this.status !== 'running') return;

    this.vy += this.g * GRAVITY * dt;
    if (this.vy > MAX_VY) this.vy = MAX_VY;
    if (this.vy < -MAX_VY) this.vy = -MAX_VY;
    this.playerY += this.vy * dt;

    // 천장/바닥에 붙는 것은 안전(사망 아님) — 죽음은 장애물 충돌로만.
    if (this.playerY - PLAYER_R < 0) {
      this.playerY = PLAYER_R;
      this.vy = 0;
    } else if (this.playerY + PLAYER_R > this.height) {
      this.playerY = this.height - PLAYER_R;
      this.vy = 0;
    }

    const dx = SPEED * dt;
    for (const o of this.obstacles) o.x -= dx;

    this.nextSpawnIn -= dx;
    if (this.nextSpawnIn <= 0) this.spawn();

    // 장애물이 플레이어를 통과하면 득점.
    for (const o of this.obstacles) {
      if (!o.scored && o.x + OBST_W < PLAYER_X) {
        o.scored = true;
        this.score += 1;
      }
    }
    // 장애물 충돌 = 사망.
    for (const o of this.obstacles) {
      if (this.hits(o)) {
        this.status = 'over';
        break;
      }
    }
    // 화면 밖 제거.
    this.obstacles = this.obstacles.filter((o) => o.x + OBST_W > 0);
  }

  private hits(o: Obstacle): boolean {
    const left = PLAYER_X - PLAYER_R;
    const right = PLAYER_X + PLAYER_R;
    const top = this.playerY - PLAYER_R;
    const bottom = this.playerY + PLAYER_R;
    const xOverlap = left < o.x + OBST_W && right > o.x;
    if (!xOverlap) return false;
    return o.side === 'top' ? top < o.h : bottom > this.height - o.h;
  }

  private scheduleSpawn(): void {
    this.nextSpawnIn = SPAWN_DX;
  }

  private spawn(): void {
    const minH = this.height * MIN_H_RATIO;
    const maxH = this.height * MAX_H_RATIO;
    const side: ObstacleSide = this.rng() < 0.5 ? 'top' : 'bottom';
    const h = minH + this.rng() * (maxH - minH);
    this.obstacles.push({ x: this.width, side, h, scored: false });
    this.scheduleSpawn();
  }

  private reset(): void {
    this.playerY = this.height / 2;
    this.vy = 0;
    this.obstacles = [];
    this.score = 0;
    this.scheduleSpawn();
  }
}
