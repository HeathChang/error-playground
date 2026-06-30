/**
 * 러너 게임 상태를 Canvas 2D에 그린다(미니멀 도형 — 아트 에셋 0, 용량 최소).
 * 순수 그리기 함수: 게임 상태를 변경하지 않는다.
 */
import type { RunnerGame } from './game';

export interface RunnerTheme {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
}

export function render(ctx: CanvasRenderingContext2D, game: RunnerGame, theme: RunnerTheme): void {
  const { width, height, groundY } = game;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // 지면
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 1);
  ctx.lineTo(width, groundY + 1);
  ctx.stroke();

  // 장애물
  ctx.fillStyle = theme.accent;
  for (const o of game.obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);

  // 플레이어
  ctx.fillStyle = theme.fg;
  const p = game.player;
  ctx.fillRect(p.x, p.y, p.w, p.h);

  // 점수
  ctx.fillStyle = theme.fg;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(String(game.scoreValue).padStart(5, '0'), width - 8, 8);

  // 상태 오버레이
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (game.status === 'ready') {
    ctx.fillText('스페이스 / 탭으로 시작', width / 2, height / 2);
  } else if (game.status === 'over') {
    ctx.fillText('게임 오버 — 스페이스 / 탭으로 재시작', width / 2, height / 2);
  }
}
