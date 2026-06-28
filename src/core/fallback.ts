/**
 * Tier 0 정적 폴백 — 어떤 실패 경로에서도 보장되는 최소 화면.
 * 불변식: 상태코드 + 핵심 메시지 + 홈/뒤로 링크는 항상 접근 가능 (docs/PLAN.md §5.4).
 * 보안: 외부 입력은 textContent로만 주입(XSS 방지), 이동 URL은 스킴 검증 (ruler/security.md).
 */
import type { ErrorStatus, PlaygroundConfig, ResolvedTheme } from './types';

/** 컨테이너에 요소 자식이 있으면 모드 B(기존 폴백 유지), 없으면 모드 A(코어가 렌더). */
export function detectMode(container: HTMLElement): 'A' | 'B' {
  return container.childElementCount > 0 ? 'B' : 'A';
}

/** 안전한 이동 URL만 허용한다 (open redirect / `javascript:` 차단). */
export function safeHref(url: string | undefined): string {
  if (!url) return '/';
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url;
  return '/'; // reason: 안전하지 않은 스킴은 홈으로 폴백 (ruler/security.md)
}

const DEFAULT_MESSAGES: Record<number, { title: string; description: string }> = {
  404: { title: '404 — 페이지를 찾을 수 없어요', description: '요청하신 페이지가 없거나 이동되었어요.' },
  500: { title: '500 — 문제가 발생했어요', description: '잠시 후 다시 시도해 주세요.' },
};

function messagesFor(status: ErrorStatus, config: PlaygroundConfig): { title: string; description: string } {
  const fallback = DEFAULT_MESSAGES[status] ?? {
    title: `${status} — 오류가 발생했어요`,
    description: '문제가 발생했어요.',
  };
  return {
    title: config.messages?.title ?? fallback.title,
    description: config.messages?.description ?? fallback.description,
  };
}

const STYLE_ID = 'ep-fallback-style';

/** 스코프된 폴백 스타일을 1회만 주입한다(`.ep-root` 한정 — 호스트 CSS 미오염). */
function ensureStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.ep-root{--ep-color-text:#0f172a;--ep-color-muted:#64748b;--ep-color-bg:#f8fafc;--ep-color-brand:#0ea5e9;--ep-color-focus:#0ea5e9;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
  padding:32px 16px;text-align:center;color:var(--ep-color-text);background:var(--ep-color-bg);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;}
.ep-root[data-ep-theme="dark"]{--ep-color-text:#f8fafc;--ep-color-muted:#94a3b8;--ep-color-bg:#0f172a;}
.ep-root .ep-title{margin:0;font-size:1.25rem;font-weight:700;}
.ep-root .ep-desc{margin:0;color:var(--ep-color-muted);font-size:.95rem;}
.ep-root .ep-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;}
.ep-root .ep-btn{display:inline-block;padding:8px 16px;border-radius:8px;border:1px solid var(--ep-color-brand);
  background:var(--ep-color-brand);color:#fff;text-decoration:none;font-size:.9rem;cursor:pointer;}
.ep-root .ep-btn--ghost{background:transparent;color:var(--ep-color-brand);}
.ep-root .ep-btn:focus-visible{outline:2px solid var(--ep-color-focus);outline-offset:2px;}
`.trim();
  doc.head.appendChild(style);
}

/**
 * Tier 0 폴백을 컨테이너에 렌더하고 루트 요소를 반환한다(언마운트용).
 * 모드 A(빈 컨테이너)에서만 호출된다.
 */
export function renderFallback(
  container: HTMLElement,
  config: PlaygroundConfig,
  theme: ResolvedTheme,
  status: ErrorStatus,
  locale: string,
): HTMLElement {
  const doc = container.ownerDocument;
  ensureStyle(doc);

  const { title, description } = messagesFor(status, config);

  const root = doc.createElement('div');
  root.className = 'ep-root';
  root.setAttribute('data-ep-theme', theme);
  root.setAttribute('role', 'alert');
  root.lang = locale; // 스크린 리더 언어 힌트 (ruler/a11y.md)

  const h1 = doc.createElement('h1');
  h1.className = 'ep-title';
  h1.textContent = title; // textContent: XSS 방지
  root.appendChild(h1);

  const desc = doc.createElement('p');
  desc.className = 'ep-desc';
  desc.textContent = description;
  root.appendChild(desc);

  const actions = doc.createElement('div');
  actions.className = 'ep-actions';

  const home = doc.createElement('a');
  home.className = 'ep-btn';
  home.href = safeHref(config.links?.home);
  home.textContent = '홈으로';
  actions.appendChild(home);

  if (config.links?.back) {
    const back = doc.createElement('button');
    back.type = 'button';
    back.className = 'ep-btn ep-btn--ghost';
    back.textContent = '뒤로 가기';
    back.addEventListener('click', () => doc.defaultView?.history.back());
    actions.appendChild(back);
  }

  root.appendChild(actions);
  container.appendChild(root);
  return root;
}
