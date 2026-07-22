/**
 * charge — a11y: (1) 게임별 접근성 계약(캔버스 이름 · 라이브 상태 공지),
 *               (2) 공통 폴백 접근성 불변식이 charge 경로에도 실제로 걸리는지(스모크).
 *
 * 폴백(상태코드·메시지·홈/뒤로 링크)이 게임 오버레이에 가려 포인터/키보드로 못 닿는 회귀는
 * "게임 오버레이 위·바깥에 뜨는 코어 소유 탐색 레이어(`.ep-exit`)"로 **구조적으로** 막는다
 * (src/core/mount.ts · docs/PLAN.md §5.4/§14). 그 구조/이벤트 계약(오버레이 바깥 · z-index 위 ·
 * pointer-events · 게임 입력과 분리)은 모든 카트리지 공통이라 **core/mount.test.ts**가 정밀 검증하고,
 * 픽셀 단위 hit-test·포커스 가시성은 프로젝트 브라우저 스모크(docs/PLAN.md §15)가 보완한다.
 * 여기서는 charge를 코어 경로로 띄웠을 때 그 보장이 실제로 걸리는지 + charge 고유 계약만 확인한다.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../../core/mount';
import { captureRaf, mountedFallbackContainer, stubCanvas2d } from '../dom.testkit';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/** 라이브 영역 텍스트가 predicate를 만족할 때까지 rAF 프레임을 결정적으로 구동(최대 maxFrames). */
function runFramesUntil(raf: ReturnType<typeof captureRaf>, ok: () => boolean, maxFrames = 60): boolean {
  let t = 0;
  for (let i = 0; i < maxFrames; i += 1) {
    t += 250; // 프레임당 0.25s(콘솔 MAX_FRAME 캡) 전진 → 게이지가 레드라인까지 확실히 차오름
    raf.step(t);
    if (ok()) return true;
  }
  return ok();
}

describe('charge — 폴백 접근성 불변식이 코어 경로에 걸린다(스모크) (v2)', () => {
  it('keeps the base fallback and exposes an on-top, reachable exit nav while charge overlays it', async () => {
    stubCanvas2d();
    captureRaf();
    const { container, home } = mountedFallbackContainer();
    const handle = mount(container, { experience: 'charge', links: { home: '/', back: true } });

    // 게임(canvas)이 폴백 위에 오버레이로 마운트될 때까지 대기(동적 import).
    await vi.waitFor(() => {
      expect(container.querySelector('.ep-experience canvas')).not.toBeNull();
    });

    // (a) 기존 폴백 DOM은 게임이 떠도 제거되지 않는다(§5.4 불변식 — 언마운트 시 즉시 복귀).
    expect(container.contains(home)).toBe(true);

    // (b) 코어가 게임 오버레이 위·바깥에 홈/뒤로 탐색을 얹어 포인터·키보드 모두 도달 가능하게 한다.
    //     (정밀 구조 계약은 core/mount.test.ts. 여기선 charge 경로에 "걸렸는지"만 스모크.)
    const overlay = container.querySelector('.ep-experience') as HTMLElement;
    const nav = container.querySelector('.ep-exit') as HTMLElement;
    expect(nav).not.toBeNull();
    expect(overlay.contains(nav)).toBe(false); // 게임 입력 서브트리 밖 → 링크 클릭이 게임에 안 새어감
    expect(nav.style.pointerEvents).toBe('auto'); // 포인터 도달

    const exitHome = nav.querySelector('a') as HTMLAnchorElement;
    exitHome.focus();
    expect(container.ownerDocument.activeElement).toBe(exitHome); // 키보드 도달

    // (c) 언마운트: 오버레이·탐색 레이어는 사라지고 폴백은 그대로 남는다(누수 0 · 불변식 유지).
    handle.unmount();
    expect(container.querySelector('.ep-experience')).toBeNull();
    expect(container.querySelector('.ep-exit')).toBeNull();
    expect(container.contains(home)).toBe(true);
  });
});

describe('charge — 게임별 접근성 계약(캔버스 이름 · 라이브 상태 공지) (v2)', () => {
  it('gives the canvas a charge-specific accessible name and announces play state via a live region', async () => {
    stubCanvas2d();
    const raf = captureRaf();
    const { container } = mountedFallbackContainer();
    // locale를 ko로 고정 → 카트리지가 넘긴 게임별 대체 텍스트가 캔버스에 실렸는지 결정적으로 검증.
    const handle = mount(container, { experience: 'charge', locale: 'ko' });

    await vi.waitFor(() => {
      expect(container.querySelector('.ep-experience canvas')).not.toBeNull();
    });

    // 캔버스 정적 대체 텍스트: role="img" + charge 고유 설명(중립 기본값 '미니 게임 화면'이 아님).
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('충전 게임 — 레드라인 전에 방출');

    // 동적 상태는 시각 숨김 aria-live="polite" 텍스트로 스크린리더에 노출된다.
    const live = container.querySelector('[aria-live]') as HTMLElement;
    expect(live).not.toBeNull();
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toMatch(/준비/); // 마운트 직후 ready 공지

    // 시작 공지.
    const gameHost = container.querySelector('.ep-game') as HTMLElement;
    gameHost.dispatchEvent(new Event('pointerdown'));
    expect(live.textContent).toMatch(/시작/);

    // 게임오버 공지: 방출 없이 두면 게이지가 레드라인을 넘어 과충전(즉사) → 점수·재시작 안내가 라이브로 뜬다.
    expect(runFramesUntil(raf, () => /게임 오버/.test(live.textContent ?? ''))).toBe(true);
    expect(live.textContent).toContain(String(0)); // 방출 없이 죽었으므로 점수 0점
    expect(live.textContent).toMatch(/다시 시작/); // 재시작 가능 안내

    // 재시작 공지: 게임오버 상태에서 입력 → running 복귀를 라이브로 알린다.
    live.textContent = ''; // 게임오버 문구에도 "다시 시작"이 있으므로 비운 뒤 재시작 공지만 관찰
    gameHost.dispatchEvent(new Event('pointerdown'));
    expect(live.textContent).toMatch(/다시 시작/);

    // 점수 마일스톤(100점) 공지는 게임과 무관한 공통 콘솔 로직 → machine.test.ts에서 스크립트 게임으로
    // 결정적으로 검증한다(불투명한 게임 호스트를 통해 실제 방출 타이밍을 맞춰 마일스톤을 만드는 건
    // 비결정적/취약). charge의 점수 누적 자체는 game.test.ts(>100점)가 순수 로직으로 커버한다.

    handle.unmount();
  });
});
