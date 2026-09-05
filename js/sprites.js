/**
 * Procedural pixel-art mech sprites as data-URL PNGs.
 * Distinctive silhouettes/colors per unit id.
 */
(function () {
  const CACHE = {};
  const SIZE = 32;

  function hexToRgb(hex) {
    hex = String(hex || '#888').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    if (isNaN(n)) return [136, 136, 136];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function shade(rgb, f) {
    return rgb.map(c => Math.max(0, Math.min(255, Math.floor(c * f))));
  }

  function setPx(data, x, y, rgb, a) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    const i = (y * SIZE + x) * 4;
    data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = a == null ? 255 : a;
  }

  function fillRect(data, x, y, w, h, rgb) {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) setPx(data, xx, yy, rgb);
  }

  function drawMech(data, palette, style) {
    const body = palette.body;
    const accent = palette.accent;
    const dark = shade(body, 0.55);
    const light = shade(body, 1.25);
    const outline = [20, 20, 28];

    // legs
    fillRect(data, 10, 22, 4, 8, dark);
    fillRect(data, 18, 22, 4, 8, dark);
    fillRect(data, 9, 28, 5, 3, outline);
    fillRect(data, 18, 28, 5, 3, outline);

    // torso
    fillRect(data, 10, 12, 12, 11, body);
    fillRect(data, 11, 13, 10, 4, light);
    fillRect(data, 13, 16, 6, 5, accent);

    // head / v-fin variants
    fillRect(data, 13, 7, 6, 6, body);
    fillRect(data, 14, 8, 4, 3, light);
    fillRect(data, 15, 9, 2, 2, [40, 200, 255]); // mono-eye-ish

    if (style === 'freedom' || style === 'hi_nu' || style === 'justice') {
      // wing binders
      fillRect(data, 4, 10, 6, 3, accent);
      fillRect(data, 22, 10, 6, 3, accent);
      fillRect(data, 3, 12, 4, 8, shade(accent, 0.8));
      fillRect(data, 25, 12, 4, 8, shade(accent, 0.8));
      // v-fin
      fillRect(data, 14, 4, 1, 4, light);
      fillRect(data, 17, 4, 1, 4, light);
      fillRect(data, 15, 3, 2, 2, accent);
    } else if (style === 'wing' || style === 'wing_zero') {
      // angel wings
      fillRect(data, 2, 8, 8, 2, light);
      fillRect(data, 22, 8, 8, 2, light);
      fillRect(data, 1, 10, 6, 6, shade(light, 0.9));
      fillRect(data, 25, 10, 6, 6, shade(light, 0.9));
      fillRect(data, 15, 4, 2, 3, accent); // tall fin
      fillRect(data, 14, 5, 1, 2, light);
      fillRect(data, 17, 5, 1, 2, light);
    } else if (style === 'unicorn') {
      // psycho-frame glow + horn
      fillRect(data, 15, 2, 2, 6, accent);
      fillRect(data, 14, 3, 4, 1, light);
      fillRect(data, 9, 14, 2, 8, accent);
      fillRect(data, 21, 14, 2, 8, accent);
    } else if (style === 'sazabi') {
      // wide shoulders + funnel pods
      fillRect(data, 5, 11, 6, 6, dark);
      fillRect(data, 21, 11, 6, 6, dark);
      fillRect(data, 4, 8, 3, 3, accent);
      fillRect(data, 25, 8, 3, 3, accent);
      fillRect(data, 14, 5, 4, 2, light); // wide head
    } else if (style === 'zaku') {
      // mono-eye dome + spike
      fillRect(data, 12, 6, 8, 5, dark);
      fillRect(data, 14, 8, 4, 2, [255, 60, 40]);
      fillRect(data, 15, 3, 2, 4, outline);
      fillRect(data, 6, 14, 4, 3, dark); // shoulder spike side
    } else if (style === 'strike') {
      // Aile-ish binders + sword hint
      fillRect(data, 6, 10, 4, 10, accent);
      fillRect(data, 22, 10, 4, 10, accent);
      fillRect(data, 24, 8, 2, 14, light); // sword
      fillRect(data, 15, 4, 2, 3, light);
    } else if (style === 'ship') {
      // support ship silhouette
      for (let i = 0; i < SIZE * SIZE * 4; i++) data[i] = 0;
      fillRect(data, 4, 14, 24, 8, body);
      fillRect(data, 6, 12, 16, 3, light);
      fillRect(data, 20, 10, 8, 4, accent);
      fillRect(data, 8, 20, 4, 4, dark);
      fillRect(data, 20, 20, 4, 4, dark);
      return;
    } else if (style === 'ball') {
      for (let i = 0; i < SIZE * SIZE * 4; i++) data[i] = 0;
      fillRect(data, 8, 8, 16, 16, body);
      fillRect(data, 10, 10, 12, 12, light);
      fillRect(data, 14, 14, 4, 4, accent);
      fillRect(data, 12, 6, 8, 3, dark);
      return;
    } else {
      // generic GM / cannon arms
      fillRect(data, 6, 14, 4, 8, dark);
      fillRect(data, 22, 14, 4, 8, dark);
      fillRect(data, 15, 5, 2, 3, light);
    }

    // arms
    fillRect(data, 6, 14, 4, 8, body);
    fillRect(data, 22, 14, 4, 8, body);
    // outline bits
    fillRect(data, 10, 12, 1, 11, outline);
    fillRect(data, 21, 12, 1, 11, outline);
  }

  const STYLE_MAP = {
    freedom: 'freedom', justice: 'freedom', hi_nu: 'hi_nu',
    wing_zero_ew: 'wing_zero', wing: 'wing',
    unicorn_dest: 'unicorn',
    sazabi: 'sazabi', zaku2_char: 'zaku', zaku2: 'zaku', zack: 'zaku',
    strike: 'strike', impulse: 'strike',
    ball: 'ball',
    eternal: 'ship', archangel: 'ship', whitebase: 'ship', minerva: 'ship',
  };

  const ACCENT_MAP = {
    freedom: '#ffffff', wing_zero_ew: '#3a7cff', wing: '#3a7cff',
    unicorn_dest: '#ff66cc', hi_nu: '#a0d0ff', sazabi: '#ffcc00',
    justice: '#ffe066', strike: '#ffffff', zaku2: '#222', zaku2_char: '#222',
    gundam: '#de2222', exia: '#88ffaa',
  };

  function accentFor(unit) {
    if (ACCENT_MAP[unit.id]) return hexToRgb(ACCENT_MAP[unit.id]);
    const c = hexToRgb(unit.color);
    return shade(c, 1.4);
  }

  function generate(unit) {
    if (!unit || !unit.id) return null;
    if (CACHE[unit.id]) return CACHE[unit.id];

    // Prefer HTMLCanvasElement (has toDataURL). OffscreenCanvas lacks sync toDataURL.
    let canvas, ctx;
    if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      ctx = canvas.getContext('2d');
    } else if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(SIZE, SIZE);
      ctx = canvas.getContext('2d');
    } else {
      return null;
    }

    const img = ctx.createImageData(SIZE, SIZE);
    const body = hexToRgb(unit.color);
    const accent = accentFor(unit);
    const style = STYLE_MAP[unit.id] || 'generic';
    drawMech(img.data, { body, accent }, style);
    ctx.putImageData(img, 0, 0);

    let url;
    if (canvas.convertToBlob) {
      // sync path via toDataURL not on OffscreenCanvas — fall through document path preferred
    }
    if (typeof canvas.toDataURL === 'function') {
      url = canvas.toDataURL('image/png');
    } else {
      // node/offscreen fallback: build minimal PNG manually is heavy; return null
      return null;
    }
    CACHE[unit.id] = url;
    return url;
  }

  /** Pre-generate all known units/supports when DOM ready */
  function warmAll() {
    const units = (typeof GGEN_UNITS !== 'undefined' ? GGEN_UNITS : []).concat(
      typeof GGEN_SUPPORTS !== 'undefined' ? GGEN_SUPPORTS : []
    );
    units.forEach(u => generate(u));
  }

  window.Sprites = { generate, warmAll, CACHE, SIZE };
})();
