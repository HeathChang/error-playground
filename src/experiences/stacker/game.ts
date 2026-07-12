/**
 * StackerGame — 좌우로 움직이는 블록을 탭해서 쌓는 게임의 **순수 로직**.
 * 겹친 만큼만 남고 삐져나온 부분은 잘린다 → 점점 좁아짐. 완전히 빗나가면 게임오버.
 * RNG 없이 완전 결정적 (배치는 입력 타이밍에만 의존).
 */
export type GameStatus = 'ready' | 'running' | 'over';

export interface Block {
  x: number;
  w: number;
}

export interface StackerOptions {
  width: number;
  height: number;
}

export const BLOCK_H = 18;
const BASE_W = 120;
const BASE_SPEED = 120; // px/s
const SPEED_RAMP = 7; // 배치마다 증가
const MAX_SPEED = 320;

export class StackerGame {
  readonly width: number;
  readonly height: number;

  status: GameStatus = 'ready';
  placed: Block[];
  current: Block;
  score = 0;

  private dir = 1;
  private speed = BASE_SPEED;

  constructor(opts: StackerOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.placed = [this.baseBlock()];
    this.current = { x: 0, w: BASE_W };
  }

  private baseBlock(): Block {
    return { x: (this.width - BASE_W) / 2, w: BASE_W };
  }

  private spawnCurrent(w: number): void {
    this.current = { x: 0, w };
    this.dir = 1;
  }

  /** ready→시작, over→재시작, running→현재 블록 배치. */
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
    // 배치: 아래 블록과 겹친 부분만 남긴다.
    const below = this.placed[this.placed.length - 1];
    const left = Math.max(this.current.x, below.x);
    const right = Math.min(this.current.x + this.current.w, below.x + below.w);
    const w = right - left;
    if (w <= 0) {
      this.status = 'over';
      return;
    }
    this.placed.push({ x: left, w });
    this.score += 1;
    this.speed = Math.min(MAX_SPEED, this.speed + SPEED_RAMP);
    this.spawnCurrent(w);
  }

  step(dt: number): void {
    if (this.status !== 'running') return;
    this.current.x += this.speed * this.dir * dt;
    if (this.current.x <= 0) {
      this.current.x = 0;
      this.dir = 1;
    } else if (this.current.x + this.current.w >= this.width) {
      this.current.x = this.width - this.current.w;
      this.dir = -1;
    }
  }

  get currentSpeed(): number {
    return this.speed;
  }

  private reset(): void {
    this.placed = [this.baseBlock()];
    this.score = 0;
    this.speed = BASE_SPEED;
    this.spawnCurrent(BASE_W);
  }
}
