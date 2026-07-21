/**
 * 로터 게임 Canvas 2D 렌더 (순수 그리기 — 상태 변경 없음).
 * 화면 중앙에 다이얼 링을 그리고, 목표 섹터(호)를 강조색으로, 바늘을 링 반지름까지 그린다.
 * 바늘이 목표 섹터 안(game.aligned)이면 강조색으로 바뀌어 "지금 탭!" 신호를 준다.
 * 캔버스 각도 방향(y 아래)은 게임에 영향 없음 — 각도→좌표 매핑은 순수 시각 표현이다.
 */
import type { CanvasTheme } from '../canvas';
import { ROTOR_GEO, type RotorGame } from './game';

const { TAU } = ROTOR_GEO;

export function render(ctx: CanvasRenderingContext2D, game: RotorGame, theme: CanvasTheme): void {
  const { width, height } = game;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const r = Math.max(20, Math.min(width, height) * 0.36);

  // 다이얼 링(트랙).
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();

  // 목표 섹터(호) — 강조색 굵은 스트로크.
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, game.targetAngle - game.arc, game.targetAngle + game.arc);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // 바늘 — 정렬되면 강조색(탭 신호), 아니면 전경색.
  ctx.strokeStyle = game.aligned ? theme.accent : theme.fg;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(game.angle) * r, cy + Math.sin(game.angle) * r);
  ctx.stroke();

  // 중심 허브.
  ctx.fillStyle = theme.fg;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, TAU);
  ctx.fill();

  // 점수.
  ctx.fillStyle = theme.fg;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(String(game.score).padStart(3, '0'), width - 8, 8);

  // 오버레이(다이얼을 가리지 않게 하단 중앙).
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (game.status === 'ready') {
    ctx.fillText('바늘이 밝은 구간에 오면 스페이스 / 탭!', cx, height - 16);
  } else if (game.status === 'over') {
    ctx.fillText(`게임 오버 · 점수 ${game.score} · 탭해서 재시작`, cx, height - 16);
  }
}
