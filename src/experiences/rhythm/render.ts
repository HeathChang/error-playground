/**
 * 리듬 게임 Canvas 2D 렌더 (순수 그리기 — 상태 변경 없음).
 */
import type { CanvasTheme } from '../canvas';
import type { RhythmGame } from './game';

const NOTE_R = 9;

export function render(ctx: CanvasRenderingContext2D, game: RhythmGame, theme: CanvasTheme): void {
  const { width, height, lineY } = game;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // 판정선
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, lineY);
  ctx.lineTo(width, lineY);
  ctx.stroke();

  // 노트 (미판정만)
  ctx.fillStyle = theme.fg;
  for (const n of game.notes) {
    if (n.judged) continue;
    ctx.beginPath();
    ctx.arc(width / 2, n.y, NOTE_R, 0, Math.PI * 2);
    ctx.fill();
  }

  // HUD: 점수 · 콤보 · 라이프
  ctx.fillStyle = theme.fg;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(`콤보 ${game.combo}`, 8, 8);
  ctx.textAlign = 'right';
  ctx.fillText(`${'♥'.repeat(Math.max(0, game.lives))}  ${String(game.score).padStart(3, '0')}`, width - 8, 8);

  // 판정 피드백
  if (game.status === 'running' && game.lastJudge) {
    ctx.fillStyle = game.lastJudge === 'miss' ? theme.muted : theme.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = game.lastJudge === 'perfect' ? 'PERFECT' : game.lastJudge === 'good' ? 'GOOD' : 'MISS';
    ctx.fillText(label, width / 2, lineY - 28);
  }

  // 오버레이
  ctx.fillStyle = theme.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (game.status === 'ready') {
    ctx.fillText('노트가 선에 닿을 때 스페이스 / 탭', width / 2, height / 2);
  } else if (game.status === 'over') {
    ctx.fillText(`게임 오버 · 점수 ${game.score} · 탭해서 재시작`, width / 2, height / 2);
  }
}
