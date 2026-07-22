/**
 * 충전 게임 Canvas 2D 렌더 (순수 그리기 — 상태 변경 없음).
 * 세로 게이지(배터리) 하나를 그린다: 아래에서 위로 차오르는 fill + 최상단의 레드라인(과충전) 위험 구간 + 경계선.
 * 게임 로직은 game.charge(0..1)와 game.redline만 노출하므로 렌더는 이를 게이지 좌표로 매핑만 한다.
 */
import type { CanvasTheme } from '../canvas';
import type { ChargeGame } from './game';

const BAR_W = 46; // 게이지 폭(px)
const PAD_TOP = 26; // 게이지 상단 여백(점수 자리)
const PAD_BOTTOM = 34; // 게이지 하단 여백(오버레이 자리)
const DANGER = '#ef4444'; // 레드라인/위험 구간 색(라이트·다크 양쪽에서 읽힘)
const DANGER_FILL = 'rgba(239,68,68,0.28)'; // 위험 구간 반투명 오버레이

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export function render(ctx: CanvasRenderingContext2D, game: ChargeGame, theme: CanvasTheme): void {
  const { width, height } = game;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  const top = PAD_TOP;
  const barH = Math.max(40, height - PAD_TOP - PAD_BOTTOM);
  const bottom = top + barH;
  const barX = Math.round((width - BAR_W) / 2);

  // 게이지 트랙(빈 통).
  ctx.fillStyle = theme.muted;
  ctx.fillRect(barX, top, BAR_W, barH);

  // 충전 fill — 아래에서 위로.
  const fillH = clamp01(game.charge) * barH;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(barX, bottom - fillH, BAR_W, fillH);

  // 레드라인 위험 구간(레드라인 위쪽) — 반투명으로 fill 위에 덮어 "달아오름"을 표현.
  const redlineY = bottom - clamp01(game.redline) * barH;
  ctx.fillStyle = DANGER_FILL;
  ctx.fillRect(barX, top, BAR_W, redlineY - top);

  // 레드라인 마커 선.
  ctx.strokeStyle = DANGER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(barX - 4, redlineY);
  ctx.lineTo(barX + BAR_W + 4, redlineY);
  ctx.stroke();

  // 게이지 테두리.
  ctx.strokeStyle = theme.fg;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, top, BAR_W, barH);

  // 점수(좌상단 안 겹치게 우상단).
  ctx.fillStyle = theme.fg;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(String(game.score).padStart(3, '0'), width - 8, 8);

  // 오버레이(하단 중앙).
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (game.status === 'ready') {
    ctx.fillText('스페이스 / 탭으로 충전 시작', width / 2, height - 16);
  } else if (game.status === 'over') {
    ctx.fillStyle = DANGER;
    ctx.fillText(`과충전! · ${game.score}점 · 탭해서 재시작`, width / 2, height - 16);
  } else {
    ctx.fillText('레드라인 전에 탭으로 방출!', width / 2, height - 16);
  }
}
