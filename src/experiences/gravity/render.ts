/**
 * 중력 반전 게임 Canvas 2D 렌더 (순수 그리기 — 상태 변경 없음).
 * 장애물은 충돌 판정(AABB)과 동일한 사각형으로 그려 히트박스와 화면이 일치한다.
 */
import type { CanvasTheme } from '../canvas';
import { GRAVITY_GEO, type GravityGame } from './game';

const { PLAYER_X, PLAYER_R, OBST_W } = GRAVITY_GEO;

export function render(ctx: CanvasRenderingContext2D, game: GravityGame, theme: CanvasTheme): void {
  const { width, height } = game;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // 천장/바닥 가이드 라인
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.lineTo(width, 1);
  ctx.moveTo(0, height - 1);
  ctx.lineTo(width, height - 1);
  ctx.stroke();

  // 장애물(스파이크 블록)
  ctx.fillStyle = theme.accent;
  for (const o of game.obstacles) {
    const y = o.side === 'top' ? 0 : height - o.h;
    ctx.fillRect(o.x, y, OBST_W, o.h);
  }

  // 플레이어
  ctx.fillStyle = theme.fg;
  ctx.beginPath();
  ctx.arc(PLAYER_X, game.playerY, PLAYER_R, 0, Math.PI * 2);
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
    ctx.fillText('스페이스 / 탭으로 중력 반전', width / 2, height / 2);
  } else if (game.status === 'over') {
    ctx.fillText(`게임 오버 · 점수 ${game.score} · 탭해서 재시작`, width / 2, height / 2);
  }
}
