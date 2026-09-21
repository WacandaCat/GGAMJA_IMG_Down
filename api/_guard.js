// 서버가 임의 주소를 대신 요청하지 못하도록 목적지 호스트를 제한한다(SSRF 방지).
// ALLOWED_HOSTS 환경변수(쉼표 구분)가 있으면 그 호스트(하위 도메인 포함)만 허용,
// 없으면 내부망·로컬·클라우드 메타데이터만 차단하고 공개 인터넷은 허용한다.
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || '')
  .split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);

function isBlockedHost(host) {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '169.254.169.254') return true; // 클라우드 메타데이터
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127 || a === 10 || a === 0) return true;      // 루프백 / 사설망 / 예약
    if (a === 172 && b >= 16 && b <= 31) return true;       // 사설망
    if (a === 192 && b === 168) return true;                // 사설망
    if (a === 169 && b === 254) return true;                // 링크로컬
  }
  return false;
}

export function assertAllowed(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error('Invalid URL'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Invalid URL');
  const host = u.hostname;
  if (ALLOWED_HOSTS.length) {
    const ok = ALLOWED_HOSTS.some((a) => host === a || host.endsWith('.' + a));
    if (!ok) throw new Error(`Host not allowed: ${host}`);
    return;
  }
  if (isBlockedHost(host)) throw new Error(`Host not allowed: ${host}`);
}
