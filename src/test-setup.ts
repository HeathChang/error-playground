/**
 * Vitest(jsdom) 셋업.
 * jsdom은 canvas `getContext`를 구현하지 않아 호출 시 throw + 콘솔 경고를 낸다.
 * 테스트 환경에선 null을 반환하도록 스텁 → runner.isSupported()가 깔끔히 false가 되어
 * "지원 불가 → 폴백 유지" 경로를 노이즈 없이 검증한다.
 */
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext(): null {
    return null;
  } as HTMLCanvasElement['getContext'];
}
