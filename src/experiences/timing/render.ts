/**
 * 타이밍 스톱 게임 Canvas 2D 렌더 (순수 그리기 — 상태 변경 없음).
 * 정규화 좌표 [0,1]를 트랙 픽셀 폭에 매핑해 목표 존과 마커를 그린다.
 */
import type { CanvasTheme } from '../canvas';
import type { TimingGame } from './game';

const MARGIN = 24; // 트랙 좌우 여백(px)
const TRACK_H = 10; // 트랙 두께(px)
const ZONE_H = 22; // 목표 존 높이(px)
const MARKER_W = 4; // 마커 두께(px)
const MARKER_H = 40; // 마커 높이(px)

export function render(ctx: CanvasRenderingContext2D, game: TimingGame, theme: CanvasTheme): void {
  const { width, height } = game;
  const barLeft = MARGIN;
  const barW = width - MARGIN * 2;
  const barY = Math.round(height * 0.58);
  const toX = (u: number): number => barLeft + u * barW;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // 트랙(레일)
  ctx.fillStyle = theme.muted;
  ctx.fillRect(barLeft, barY - TRACK_H / 2, barW, TRACK_H);

  // 목표 존
  const zoneLeft = toX(game.target - game.half);
  const zoneRight = toX(game.target + game.half);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(zoneLeft, barY - ZONE_H / 2, zoneRight - zoneLeft, ZONE_H);

  // 마커(정지 연출 중이면 성공을 뜻하는 accent, 아니면 fg)
  ctx.fillStyle = game.phase === 'paused' ? theme.accent : theme.fg;
  ctx.fillRect(toX(game.pos) - MARKER_W / 2, barY - MARKER_H / 2, MARKER_W, MARKER_H);

  // 점수
  ctx.fillStyle = theme.fg;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(String(game.score).padStart(3, '0'), width - 8, 8);

  // 안내/오버레이 (트랙과 겹치지 않게 위쪽에)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const midY = Math.round(height * 0.28);
  if (game.status === 'ready') {
    ctx.fillText('스페이스 / 탭으로 목표 존에서 정지!', width / 2, midY);
  } else if (game.status === 'over') {
    ctx.fillText(`게임 오버 · 점수 ${game.score} · 탭해서 재시작`, width / 2, midY);
  }
}
