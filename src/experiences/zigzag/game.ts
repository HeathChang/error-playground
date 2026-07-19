/**
 * ZigzagGame — 45° 굽잇길을 벗어나지 않도록 탭으로 진행 방향을 좌우 토글하는 게임의 **순수 로직**.
 * DOM/Canvas 비의존 → 결정적 테스트 가능. (게임 머신 카트리지, docs/PLAN.md §5.5)
 *
 * 기존 게임과의 차이: 회피(runner/flappy/orbit/gravity)·쌓기(stacker)·리듬 탭(rhythm)·정지(timing)가 아니라
 * "생성되는 굽잇길을 따라 계속 정렬을 유지하는" 경로 추적(steering) 메커닉이다. 길 밖으로 벗어나면 게임오버.
 *
 * 좌표계: 월드 픽셀. ballY는 진행에 따라 단조 증가(+y=전진) → 카메라/화면 매핑은 render.ts가 담당.
 * 길은 항상 45°(기울기 ±1)이고 좌우로 번갈아 꺾이므로, 중심선 x는 y의 단일값 함수 pathX(y)로 구해진다.
 * 공은 vy=speed(전진 고정) + vx=dir*speed(좌우) 로 45°로 움직인다 → dir을 세그먼트 방향에 맞추면 정렬 유지.
 */
import { createRng } from '../runner/rng';

export type GameStatus = 'ready' | 'running' | 'over';

export interface Point {
  x: number;
  y: number;
}

export interface ZigzagOptions {
  width: number;
  height: number;
  seed: number;
}

const BALL_R = 9;
const HALF = 26; // 중심선 대비 허용 수평 오차(px). |err| > HALF → 사망
const SPEED_0 = 120; // px/s (전진·좌우 동일 → 45°)
const SPEED_INC = 2.5; // 코너 통과마다 가속(난이도 램프)
const SPEED_MAX = 240;
const LEN_MIN = 64; // 세그먼트 y-길이(px) — 코너 사이 간격
const LEN_MAX = 150;
const AHEAD = 340; // 공 앞으로 미리 생성해 둘 거리(최대 캔버스 높이 커버)
const BEHIND = 160; // 공 뒤로 유지할 거리(렌더용) — 그 너머는 프루닝
const START_DIR: 1 | -1 = 1;
// 한 step()이 전진할 최대 dt(초). 과대·비정상 dt로 인한 경로 폭주/무한 루프를 막는다
// (공용 콘솔의 MAX_FRAME과 정합 — docs/PLAN.md §5.5. 순수 로직 단독 호출에 대한 방어).
const MAX_STEP = 0.25;

/** 렌더가 공유하는 지오메트리. */
export const ZIGZAG_GEO = { BALL_R, HALF } as const;

export class ZigzagGame {
  readonly width: number;
  readonly height: number;

  status: GameStatus = 'ready';
  score = 0;
  ballX = 0;
  ballY = 0;
  speed = SPEED_0;
  points: Point[] = [{ x: 0, y: 0 }]; // 길 중심선 폴리라인(슬라이딩 윈도우)

  /**
   * 플레이어가 조종하는 진행 방향. **외부에선 읽기 전용** — 변경은 오직 input()으로만.
   * (렌더/테스트가 관찰은 하되, 상태를 우회 조작해 "가짜 성공" 테스트가 되는 걸 구조적으로 막는다.)
   */
  get dir(): 1 | -1 {
    return this._dir;
  }

  private readonly seed: number;
  private rng!: () => number;
  private _dir: 1 | -1 = START_DIR;
  private lastSegDir: 1 | -1 = -START_DIR as 1 | -1; // 첫 생성 세그먼트가 START_DIR가 되도록
  private nextCornerY = 0;

  constructor(opts: ZigzagOptions) {
    this.width = opts.width;
    this.height = opts.height;
    this.seed = opts.seed;
    this.init();
  }

  /** ready→시작(굴러가기), over→재시작, running→진행 방향 좌우 토글. */
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
    this._dir = this._dir === 1 ? -1 : 1;
  }

  step(dt: number): void {
    if (this.status !== 'running') return;
    // 비정상 dt 방어: 순수 로직이 외부에서 직접 호출되거나 호출자가 rAF 타임스탬프를 잘못 넘겨도
    // 좌표 손상(NaN/Infinity)·역주행(음수·0)·경로 폭주(과대 dt)·무한 루프가 없도록 한다.
    if (!Number.isFinite(dt) || dt <= 0) return;
    const d = dt > MAX_STEP ? MAX_STEP : dt;

    const s = this.speed;
    this.ballY += s * d;
    this.ballX += this._dir * s * d;

    this.ensurePath(this.ballY + AHEAD);

    // 코너 통과 = 득점 + 난이도 램프. (큰 dt로 여러 코너를 한 번에 지날 수도 있어 while로 소진)
    while (this.ballY >= this.nextCornerY) {
      this.score += 1;
      this.speed = Math.min(SPEED_MAX, this.speed + SPEED_INC);
      this.nextCornerY = this.cornerYAfter(this.nextCornerY);
    }

    // 길 밖(중심선에서 HALF 초과) = 사망.
    if (Math.abs(this.ballX - this.pathX(this.ballY)) > HALF) {
      this.status = 'over';
      return;
    }

    this.prune();
  }

  /** 중심선 x를 y에서 단일값으로 보간(길은 45°, y 단조 증가 → x는 y의 함수). */
  pathX(y: number): number {
    const pts = this.points;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      if (y <= b.y) {
        const slope = b.y === a.y ? 0 : (b.x - a.x) / (b.y - a.y); // ±1
        return a.x + slope * (y - a.y);
      }
    }
    return pts[pts.length - 1].x;
  }

  /** y 바로 다음 코너의 y. (ensurePath로 항상 존재를 보장) */
  private cornerYAfter(y: number): number {
    this.ensurePath(y + AHEAD);
    for (const p of this.points) {
      if (p.y > y) return p.y;
    }
    return y; // 도달 불가(방어) — ensurePath가 앞선 점을 보장
  }

  /** targetY까지 길을 좌우 번갈아 45°로 이어붙인다. */
  private ensurePath(targetY: number): void {
    let last = this.points[this.points.length - 1];
    while (last.y < targetY) {
      const dir = (this.lastSegDir === 1 ? -1 : 1) as 1 | -1;
      this.lastSegDir = dir;
      const len = LEN_MIN + this.rng() * (LEN_MAX - LEN_MIN);
      last = { x: last.x + dir * len, y: last.y + len };
      this.points.push(last);
    }
  }

  /** 공 뒤로 BEHIND 넘어간 점을 제거해 메모리를 바운드한다(최소 2점 유지). */
  private prune(): void {
    const floor = this.ballY - BEHIND;
    while (this.points.length > 2 && this.points[1].y < floor) {
      this.points.shift();
    }
  }

  /**
   * 초기(=재시작) 상태 구성. 생성자와 재시작(input() from 'over')이 **같은 진입점**을 공유한다.
   * RNG를 seed로 다시 만들기 때문에, 같은 seed면 최초 생성뿐 아니라 **재시작 후에도 동일한 경로**가 나온다
   * (재현성 계약: docs/PLAN.md §5.5 "결정성은 game.ts의 속성").
   */
  private init(): void {
    this.score = 0;
    this.ballX = 0;
    this.ballY = 0;
    this._dir = START_DIR;
    this.speed = SPEED_0;
    this.points = [{ x: 0, y: 0 }];
    this.rng = createRng(this.seed);
    this.lastSegDir = -START_DIR as 1 | -1;
    this.ensurePath(AHEAD);
    this.nextCornerY = this.points[1].y; // 첫 코너
  }
}
