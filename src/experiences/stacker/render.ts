/**
 * 스태커 게임 Canvas 2D 렌더 (순수 그리기 — 상태 변경 없음).
 * 스택이 화면보다 높아지면 위쪽이 보이도록 아래로 오프셋.
 */
import { BLOCK_H, type StackerGame } from './game';

export interface StackerTheme {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
}

export function render(ctx: CanvasRenderingContext2D, game: StackerGame, theme: StackerTheme): void {
  const { width, height } = game;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  const levels = game.placed.length; // 쌓인 층 수
  const stackTop = (levels + 1) * BLOCK_H; // 현재(움직이는) 블록 포함 높이
  const offset = Math.max(0, stackTop - (height - 16));

  const yOf = (level: number): number => height - (level + 1) * BLOCK_H + offset;

  // 쌓인 블록
  for (let i = 0; i < game.placed.length; i += 1) {
    const b = game.placed[i];
    ctx.fillStyle = i === 0 ? theme.muted : theme.accent;
    ctx.fillRect(b.x, yOf(i), b.w, BLOCK_H - 2);
  }

  // 현재 움직이는 블록
  if (game.status !== 'over') {
    ctx.fillStyle = theme.fg;
    ctx.fillRect(game.current.x, yOf(levels), game.current.w, BLOCK_H - 2);
  }

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
    ctx.fillText('스페이스 / 탭으로 블록 쌓기', width / 2, height / 2);
  } else if (game.status === 'over') {
    ctx.fillText(`게임 오버 · ${game.score}층 · 탭해서 재시작`, width / 2, height / 2);
  }
}
