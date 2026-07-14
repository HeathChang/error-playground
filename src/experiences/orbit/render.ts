/**
 * 오빗 게임 Canvas 2D 렌더 (순수 그리기 — 상태 변경 없음).
 */
import type { CanvasTheme } from '../canvas';
import type { OrbitGame } from './game';

function pointOn(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export function render(ctx: CanvasRenderingContext2D, game: OrbitGame, theme: CanvasTheme): void {
  const { width, height, cx, cy, rInner, rOuter } = game;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // 두 궤도(가이드 링)
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1;
  for (const r of [rInner, rOuter]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 장애물
  ctx.fillStyle = theme.accent;
  for (const o of game.obstacles) {
    if (o.resolved) continue;
    const [ox, oy] = pointOn(cx, cy, game.laneRadius(o.lane), o.angle);
    ctx.beginPath();
    ctx.arc(ox, oy, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 점(플레이어)
  const [dx, dy] = pointOn(cx, cy, game.laneRadius(game.dotLane), game.angle);
  ctx.fillStyle = theme.fg;
  ctx.beginPath();
  ctx.arc(dx, dy, 7, 0, Math.PI * 2);
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
    ctx.fillText('스페이스 / 탭으로 궤도 전환', cx, cy);
  } else if (game.status === 'over') {
    ctx.fillText(`게임 오버 · 점수 ${game.score} · 탭해서 재시작`, cx, cy);
  }
}
