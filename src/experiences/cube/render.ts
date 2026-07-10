/**
 * 큐브 게임의 CSS 3D 뷰. 순수 DOM(캔버스 아님) — `transform-style: preserve-3d` 사용.
 * 보안: 모든 텍스트는 textContent로만 주입 (ruler/security.md). 스타일은 `.ep-cube-*`로 스코프.
 */
import { FACES, type CubeGame } from './game';

const STYLE_ID = 'ep-cube-style';

function ensureStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const s = doc.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
.ep-cube-wrap{--c-bg:#f8fafc;--c-fg:#0f172a;--c-muted:#64748b;--c-accent:#0ea5e9;
  position:relative;height:200px;display:flex;align-items:center;justify-content:center;
  background:var(--c-bg);color:var(--c-fg);border-radius:8px;overflow:hidden;user-select:none;
  font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;}
.ep-cube-wrap[data-ep-theme="dark"]{--c-bg:#0f172a;--c-fg:#f8fafc;--c-muted:#94a3b8;}
.ep-cube-scene{perspective:600px;}
.ep-cube{position:relative;width:96px;height:96px;transform-style:preserve-3d;
  transform:rotateX(-14deg) rotateY(0deg);}
.ep-cube-face{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:40px;border:2px solid var(--c-muted);border-radius:12px;
  background:rgba(14,165,233,.10);}
.ep-cube-face.is-target{border-color:var(--c-accent);
  box-shadow:0 0 0 3px var(--c-accent),0 0 22px var(--c-accent);}
.ep-cube-hud{position:absolute;top:8px;left:0;right:0;display:flex;justify-content:center;
  gap:14px;font-size:13px;color:var(--c-muted);}
.ep-cube-hud b{color:var(--c-fg);}
.ep-cube-overlay{position:absolute;left:0;right:0;bottom:10px;text-align:center;
  font-size:13px;color:var(--c-muted);padding:0 8px;}
`.trim();
  doc.head.appendChild(s);
}

export interface CubeView {
  update(game: CubeGame): void;
  destroy(): void;
}

const FACE_ANGLES = ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(270deg)'];

export function createCubeView(host: HTMLElement, theme: 'light' | 'dark'): CubeView {
  const doc = host.ownerDocument;
  ensureStyle(doc);

  const wrap = doc.createElement('div');
  wrap.className = 'ep-cube-wrap';
  wrap.setAttribute('data-ep-theme', theme);

  const scene = doc.createElement('div');
  scene.className = 'ep-cube-scene';
  const cube = doc.createElement('div');
  cube.className = 'ep-cube';

  const faces: HTMLElement[] = [];
  for (let i = 0; i < FACES.length; i += 1) {
    const face = doc.createElement('div');
    face.className = 'ep-cube-face';
    face.textContent = FACES[i];
    face.style.transform = `${FACE_ANGLES[i]} translateZ(48px)`;
    cube.appendChild(face);
    faces.push(face);
  }
  scene.appendChild(cube);
  wrap.appendChild(scene);

  const hud = doc.createElement('div');
  hud.className = 'ep-cube-hud';
  const targetEl = doc.createElement('span');
  const scoreEl = doc.createElement('span');
  const comboEl = doc.createElement('span');
  const timeEl = doc.createElement('span');
  hud.append(targetEl, scoreEl, comboEl, timeEl);

  const overlay = doc.createElement('div');
  overlay.className = 'ep-cube-overlay';

  wrap.append(hud, overlay);
  host.appendChild(wrap);

  return {
    update(game: CubeGame): void {
      cube.style.transform = `rotateX(-14deg) rotateY(${-game.angleY}deg)`;
      for (let i = 0; i < faces.length; i += 1) {
        faces[i].classList.toggle('is-target', i === game.target && game.status === 'running');
      }
      targetEl.textContent = `목표 ${FACES[game.target]}`;
      scoreEl.textContent = `점수 ${game.score}`;
      comboEl.textContent = `콤보 ${game.combo}`;
      timeEl.textContent = `⏱ ${Math.ceil(game.timeLeft)}`;

      if (game.status === 'ready') {
        overlay.textContent = '탭 / 스페이스로 시작 — 반짝이는 면이 정면에 오면 탭!';
      } else if (game.status === 'over') {
        overlay.textContent = `게임 오버 · 점수 ${game.score} · 탭해서 재시작`;
      } else {
        overlay.textContent = '반짝이는 면을 정면에서 탭!';
      }
    },
    destroy(): void {
      wrap.remove();
    },
  };
}
