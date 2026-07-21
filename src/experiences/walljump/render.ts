/**
 * 벽점프 게임 Canvas 2D 렌더 (순수 그리기 — 상태 변경 없음).
 * 좌우 두 벽을 그리고, 각 벽의 스파이크를 안쪽으로 뻗은 삼각형으로, 플레이어를 원으로 그린다.
 * 카메라는 game.cameraTop(최고점 래칫)에 고정 → 오르면 화면이 위로 스크롤되는 효과.
 * 캔버스 y(아래로 +)와 게임 worldY(아래로 +)가 같은 방향이라 screenY = worldY - cameraTop.
 */
import type { CanvasTheme } from '../canvas';
import { WALLJUMP_GEO, type Side, type WallJumpGame } from './game';

const { WALL_W, PR, SPIKE_HALF, SPIKE_LEN } = WALLJUMP_GEO;

/** 한 벽의 스파이크 하나를 안쪽으로 뻗은 삼각형으로 그린다. */
function drawSpike(
  ctx: CanvasRenderingContext2D,
  side: Side,
  wallX: number,
  screenY: number,
): void {
  const tipX = side === 'left' ? wallX + SPIKE_LEN : wallX - SPIKE_LEN;
  ctx.beginPath();
  ctx.moveTo(wallX, screenY - SPIKE_HALF);
  ctx.lineTo(tipX, screenY);
  ctx.lineTo(wallX, screenY + SPIKE_HALF);
  ctx.closePath();
  ctx.fill();
}

export function render(ctx: CanvasRenderingContext2D, game: WallJumpGame, theme: CanvasTheme): void {
  const { width, height } = game;
  const camTop = game.cameraTop;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // 좌우 벽.
  ctx.fillStyle = theme.muted;
  ctx.fillRect(0, 0, WALL_W, height);
  ctx.fillRect(width - WALL_W, 0, WALL_W, height);

  // 스파이크 — 화면에 보이는 것만.
  ctx.fillStyle = theme.accent;
  const leftInner = WALL_W;
  const rightInner = width - WALL_W;
  for (const s of game.spikes) {
    const screenY = s.worldY - camTop;
    if (screenY < -SPIKE_HALF || screenY > height + SPIKE_HALF) continue;
    drawSpike(ctx, s.side, s.side === 'left' ? leftInner : rightInner, screenY);
  }

  // 플레이어 — 공중이면 game.x(보간), 붙었으면 벽 표면.
  const px = game.airborne ? game.x : game.clungX(game.side);
  const py = game.worldY - camTop;
  ctx.fillStyle = theme.fg;
  ctx.beginPath();
  ctx.arc(px, py, PR, 0, Math.PI * 2);
  ctx.fill();

  // 점수.
  ctx.fillStyle = theme.fg;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(String(game.score).padStart(3, '0'), width - WALL_W - 6, 8);

  // 오버레이(하단 중앙 — 벽/플레이어를 덜 가리게).
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (game.status === 'ready') {
    ctx.fillText('스페이스 / 탭으로 반대 벽으로 점프!', width / 2, height - 16);
  } else if (game.status === 'over') {
    ctx.fillText(`게임 오버 · ${game.score}층 · 탭해서 재시작`, width / 2, height - 16);
  }
}
