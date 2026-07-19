/**
 * 지그재그 게임 Canvas 2D 렌더 (순수 그리기 — 상태 변경 없음).
 * 카메라는 공을 화면 (width/2, height*CAM_Y)에 고정하고 월드를 스크롤한다.
 * 길은 중심선 폴리라인을 두꺼운 스트로크로 그려 폭 2*HALF의 밴드처럼 보이게 한다(히트박스와 정합).
 */
import type { CanvasTheme } from '../canvas';
import { ZIGZAG_GEO, type ZigzagGame } from './game';

const { BALL_R, HALF } = ZIGZAG_GEO;
const CAM_Y = 0.66; // 공을 화면 세로 66% 지점에 고정 → 앞길이 위로 넉넉히 보인다

export function render(ctx: CanvasRenderingContext2D, game: ZigzagGame, theme: CanvasTheme): void {
  const { width, height } = game;
  const ballScreenY = height * CAM_Y;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // 월드→화면 변환: 공을 (width/2, ballScreenY)에 고정, +y(전진)는 화면 위로.
  const sx = (x: number): number => width / 2 + (x - game.ballX);
  const sy = (y: number): number => ballScreenY - (y - game.ballY);

  const pts = game.points;
  if (pts.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(sx(pts[0].x), sy(pts[0].y));
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(sx(pts[i].x), sy(pts[i].y));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // 바깥 테두리 → 안쪽 길 순으로 두 번 그려 경계를 또렷하게.
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = HALF * 2 + 6;
    ctx.stroke();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = HALF * 2;
    ctx.stroke();
  }

  // 플레이어(공) — 항상 화면 중앙 x, 고정 y.
  ctx.fillStyle = theme.fg;
  ctx.beginPath();
  ctx.arc(width / 2, ballScreenY, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  // 점수
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(String(game.score).padStart(3, '0'), width - 8, 8);

  // 오버레이
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (game.status === 'ready') {
    ctx.fillText('스페이스 / 탭으로 방향 전환 — 길을 따라가요', width / 2, height / 2);
  } else if (game.status === 'over') {
    ctx.fillText(`게임 오버 · 점수 ${game.score} · 탭해서 재시작`, width / 2, height / 2);
  }
}
