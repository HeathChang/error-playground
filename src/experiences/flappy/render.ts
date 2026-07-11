/**
 * 플래피 게임 Canvas 2D 렌더 (순수 그리기 — 상태 변경 없음).
 */
import { FLAPPY_GEO, type FlappyGame } from './game';

export interface FlappyTheme {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
}

const { BIRD_X, BIRD_R, PIPE_W, GAP_H } = FLAPPY_GEO;

export function render(ctx: CanvasRenderingContext2D, game: FlappyGame, theme: FlappyTheme): void {
  const { width, height, groundY } = game;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // 파이프 (위/아래 기둥)
  ctx.fillStyle = theme.accent;
  for (const p of game.pipes) {
    ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
    ctx.fillRect(p.x, p.gapY + GAP_H, PIPE_W, groundY - (p.gapY + GAP_H));
  }

  // 지면
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 1);
  ctx.lineTo(width, groundY + 1);
  ctx.stroke();

  // 새
  ctx.fillStyle = theme.fg;
  ctx.beginPath();
  ctx.arc(BIRD_X, game.birdY, BIRD_R, 0, Math.PI * 2);
  ctx.fill();

  // 점수
  ctx.fillStyle = theme.fg;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(String(game.score).padStart(3, '0'), width - 8, 8);

  // 오버레이
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (game.status === 'ready') {
    ctx.fillText('스페이스 / 탭으로 날갯짓', width / 2, height / 2);
  } else if (game.status === 'over') {
    ctx.fillText(`게임 오버 · 점수 ${game.score} · 탭해서 재시작`, width / 2, height / 2);
  }
}
