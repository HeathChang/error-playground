/**
 * RhythmGame — 판정선으로 내려오는 노트를 타이밍 맞춰 탭하는 게임의 **순수 로직**.
 * DOM/Canvas 비의존 → 결정적 테스트 가능. (게임 머신 카트리지)
 */
import { createRng } from '../runner/rng';

export type GameStatus = 'ready' | 'running' | 'over';
export type Judge = 'perfect' | 'good' | 'miss';

export interface Note {
  y: number;
  judged: boolean;
}

export interface RhythmOptions {
  width: number;
  height: number;
  seed: number;
}

const SPEED = 150; // px/s (노트 낙하)
const LINE_OFFSET = 36; // 바닥에서 판정선까지
const PERFECT = 14; // Perfect 허용 오차(px)
const GOOD = 34; // Good 허용 오차(px)
const PAST = 30; // 판정선 아래로 이만큼 지나면 놓침
const LIVES = 3;
const SPAWN_MIN = 0.45;
const SPAWN_RANGE = 0.6;

export class RhythmGame {
  readonly width: number;
  readonly height: number;
  readonly lineY: number;

  status: GameStatus = 'ready';
  notes: Note[] = [];
  score = 0;
  combo = 0;
  lives = LIVES;
  lastJudge: Judge | null = null;

  private rng: () => number;
  private nextSpawnIn = 0.6;

  constructor(opts: RhythmOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.lineY = opts.height - LINE_OFFSET;
    this.rng = createRng(opts.seed);
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
    // 판정선에 가장 가까운 미판정 노트를 찾는다.
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < this.notes.length; i += 1) {
      if (this.notes[i].judged) continue;
      const d = Math.abs(this.notes[i].y - this.lineY);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    if (best < 0 || bestDist > GOOD) {
      // 헛탭: 콤보만 리셋(라이프 손실 없음)
      this.combo = 0;
      this.lastJudge = 'miss';
      return;
    }
    this.notes[best].judged = true;
    if (bestDist <= PERFECT) {
      this.score += 2 + Math.floor(this.combo / 4);
      this.lastJudge = 'perfect';
    } else {
      this.score += 1;
      this.lastJudge = 'good';
    }
    this.combo += 1;
  }

  step(dt: number): void {
    if (this.status !== 'running') return;

    for (const n of this.notes) n.y += SPEED * dt;

    // 판정선을 지나친 노트 = 놓침
    for (const n of this.notes) {
      if (!n.judged && n.y > this.lineY + PAST) {
        n.judged = true;
        this.combo = 0;
        this.lives -= 1;
        this.lastJudge = 'miss';
        if (this.lives <= 0) this.status = 'over';
      }
    }

    this.notes = this.notes.filter((n) => n.y < this.height + 20);

    if (this.status !== 'running') return;
    this.nextSpawnIn -= dt;
    if (this.nextSpawnIn <= 0) {
      this.notes.push({ y: 0, judged: false });
      this.nextSpawnIn = SPAWN_MIN + this.rng() * SPAWN_RANGE;
    }
  }

  private reset(): void {
    this.notes = [];
    this.score = 0;
    this.combo = 0;
    this.lives = LIVES;
    this.lastJudge = null;
    this.nextSpawnIn = 0.6;
  }
}
