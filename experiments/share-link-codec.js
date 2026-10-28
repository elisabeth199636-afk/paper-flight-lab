/* Feasibility prototype only. Not loaded by the game or published as a feature. */
const ShareLinkProof = (() => {
  const keys = ['nose', 'wing', 'trim', 'body', 'opening', 'dihedral'];
  const ranges = [[0, 100], [0, 100], [-4, 12], [4, 24], [0, 30], [-15, 35]];
  const maxTokenLength = 8192;

  function validate(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        Object.keys(payload).sort().join(',') !== 'c,model,name,p,v' ||
        payload.v !== 1 || payload.model !== 1) throw new Error('Unsupported share format or flight model');
    if (typeof payload.name !== 'string' || !payload.name.trim() ||
        Array.from(payload.name).length > 20 || /[\u0000-\u001f\u007f<>]/u.test(payload.name)) {
      throw new Error('Invalid player name');
    }
    if (!Array.isArray(payload.p) || payload.p.length !== keys.length) throw new Error('Invalid parameters');
    const params = {};
    keys.forEach((key, i) => {
      const value = payload.p[i], [min, max] = ranges[i];
      if (!Number.isFinite(value) || value < min || value > max ||
          (key === 'trim' ? !Number.isInteger(value * 2) : !Number.isInteger(value))) {
        throw new Error('Invalid parameter: ' + key);
      }
      params[key] = value;
    });
    if (!Array.isArray(payload.c) || payload.c.length > 100) throw new Error('Too many cut lines');
    params.cuts = payload.c.map(cut => {
      if (!Array.isArray(cut) || cut.length !== 4 || ![-1, 0, 1].includes(cut[0]) ||
          !cut.slice(1).every(n => Number.isFinite(n) && Math.abs(n) <= 1e6) ||
          Math.hypot(cut[1], cut[2]) < 1e-8) throw new Error('Invalid cut line');
      return { side: cut[0], line: cut.slice(1) };
    });
    return { name: payload.name.trim(), model: 1, params };
  }

  function create(baseURL, name, params) {
    const payload = {
      v: 1, model: 1, name,
      p: keys.map(key => params[key]),
      c: (params.cuts ?? []).map(cut => [cut.side, ...cut.line])
    };
    validate(payload);
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (token.length > maxTokenLength) throw new Error('Share link is too long');
    const url = new URL(baseURL);
    url.search = '';
    url.hash = 'flight=' + token;
    return url.href;
  }

  function parse(link) {
    if (typeof link !== 'string' || link.length > 12000) throw new Error('Share link is too long');
    const hash = new URL(link).hash;
    if (!hash.startsWith('#flight=')) return null;
    const token = hash.slice(8);
    if (!token || token.length > maxTokenLength || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error('Invalid share link');
    try {
      const binary = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      return validate(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
    } catch (error) {
      throw new Error('Invalid share design: ' + error.message);
    }
  }

  return { create, parse };
})();

if (typeof module !== 'undefined') module.exports = ShareLinkProof;
