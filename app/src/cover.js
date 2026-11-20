// Neon Sunset Cover Studio — the cover renderer.
//
// Draws a GTA-poster-style multi-panel cover onto any canvas: the photos
// fill comic-book panels across the top, and a sunset band along the foot
// carries a retro sun, palm silhouettes, a skyline and the big title.
// Everything is drawn with the canvas 2D API — no Rockstar art, logos or
// fonts anywhere. The only font is Anton (SIL OFL, shipped under app/fonts).

export const LAYOUTS = {
  grid: { label: 'Vice Grid', panels: 4 },
  hero: { label: 'Hero Split', panels: 3 },
  strip: { label: 'Sunset Strip', panels: 3 },
  spotlight: { label: 'Spotlight', panels: 2 },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    washTop: 'rgba(255, 122, 60, 0.10)',
    washBottom: 'rgba(214, 48, 120, 0.30)',
    band: ['#2b0f4a', '#ff5e3a', '#ff2e88', '#7a1e6e'],
    sun: '#ffd76a',
    titleTop: '#ffffff',
    titleBottom: '#ffd76a',
  },
  neon: {
    label: 'Neon Nights',
    washTop: 'rgba(123, 47, 247, 0.18)',
    washBottom: 'rgba(0, 212, 255, 0.18)',
    band: ['#12082e', '#5b21b6', '#c026d3', '#0ea5e9'],
    sun: '#7df9ff',
    titleTop: '#ffffff',
    titleBottom: '#9ff3ff',
  },
  golden: {
    label: 'Golden Hour',
    washTop: 'rgba(255, 190, 80, 0.16)',
    washBottom: 'rgba(255, 110, 20, 0.28)',
    band: ['#3a1c00', '#ff9a1f', '#ff6a00', '#7a2f00'],
    sun: '#fff3b0',
    titleTop: '#ffffff',
    titleBottom: '#ffe1a1',
  },
  noir: {
    label: 'Noir',
    washTop: 'rgba(30, 30, 40, 0.12)',
    washBottom: 'rgba(0, 0, 0, 0.30)',
    band: ['#1c1c22', '#3a3a44', '#101014', '#000000'],
    sun: '#e8e8e8',
    titleTop: '#ffffff',
    titleBottom: '#d8d8d8',
  },
};

// Height of the sunset band along the foot of the cover. Landscape covers
// get a taller band so the big title and the subtitle both fit inside it.
export function bandHeight(w, h) {
  return Math.round(h * (h >= w ? 0.27 : 0.36));
}

// Panel rectangles, in unit coordinates of the panel region (0..1).
export function panelRects(layout) {
  if (layout === 'hero') {
    return [
      { x: 0, y: 0, w: 0.6, h: 1 },
      { x: 0.6, y: 0, w: 0.4, h: 0.5 },
      { x: 0.6, y: 0.5, w: 0.4, h: 0.5 },
    ];
  }
  if (layout === 'strip') {
    return [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ];
  }
  if (layout === 'spotlight') {
    return [
      { x: 0, y: 0, w: 1, h: 1 },
      { x: 0.6, y: 0.58, w: 0.4, h: 0.42 },
    ];
  }
  return [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ];
}

// A tiny deterministic PRNG so the film grain is identical on every render.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawPhotoInPanel(ctx, photo, rect, panel, gradeKey) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!photo) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#3b2350');
    g.addColorStop(1, '#160a24');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `bold ${Math.round(h * 0.09)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(w / iw, h / ih);
  const scale = base * (panel.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const maxOx = Math.max(0, (dw - w) / 2);
  const maxOy = Math.max(0, (dh - h) / 2);
  const ox = Math.max(-maxOx, Math.min(maxOx, (panel.ox || 0) * w));
  const oy = Math.max(-maxOy, Math.min(maxOy, (panel.oy || 0) * h));
  if (gradeKey === 'noir') ctx.filter = 'grayscale(1) contrast(1.18) brightness(1.02)';
  ctx.drawImage(photo, x + (w - dw) / 2 + ox, y + (h - dh) / 2 + oy, dw, dh);
  ctx.filter = 'none';
  const grade = GRADES[gradeKey] || GRADES.sunset;
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  // A soft inner shadow so panels read as separate frames.
  const edge = ctx.createLinearGradient(x, y, x, y + h * 0.12);
  edge.addColorStop(0, 'rgba(0,0,0,0.28)');
  edge.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = edge;
  ctx.fillRect(x, y, w, h * 0.12);
  ctx.restore();
}

function drawRetroSun(ctx, cx, cy, r, colour, slitColour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = slitColour;
  let y = cy + r * 0.08;
  let n = 0;
  while (y < cy + r * 0.98) {
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    const thick = r * 0.035 + n * r * 0.02;
    ctx.fillRect(cx - half - 2, y, half * 2 + 4, thick);
    y += thick + r * 0.09;
    n += 1;
  }
  ctx.restore();
}

function drawPalm(ctx, x, base, s, colour) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  // Curved trunk.
  ctx.lineWidth = Math.max(3, 10 * s);
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + 18 * s, base - 110 * s, x - 6 * s, base - 205 * s);
  ctx.stroke();
  const topX = x - 6 * s;
  const topY = base - 205 * s;
  // Fronds: out and up, drooping at the tip.
  ctx.lineWidth = Math.max(2, 5 * s);
  for (let a = -165; a <= 165; a += 33) {
    const ang = (a - 90) * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(ang) * 62 * s,
      topY + Math.sin(ang) * 46 * s - 30 * s,
      topX + Math.cos(ang) * 108 * s,
      topY + Math.sin(ang) * 58 * s + 52 * s,
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(topX, topY + 6 * s, 7 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSkyline(ctx, x0, x1, base, s, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  let x = x0;
  let i = 0;
  const heights = [46, 78, 38, 92, 62, 104, 52, 84, 44, 70];
  while (x < x1) {
    const w = (40 + (i % 3) * 14) * s;
    const h = heights[i % heights.length] * s;
    ctx.fillRect(x, base - h, w, h);
    if (i % 3 === 0) ctx.fillRect(x + w / 2 - 1.5 * s, base - h - 18 * s, 3 * s, 18 * s);
    for (let wy = base - h + 9 * s; wy < base - 7 * s; wy += 15 * s) {
      for (let wx = x + 7 * s; wx < x + w - 6 * s; wx += 12 * s) {
        if (((wx + wy) / s) % 3 < 1) ctx.fillStyle = '#ffd678';
        else ctx.fillStyle = colour;
        ctx.fillRect(wx, wy, 4 * s, 5 * s);
      }
    }
    ctx.fillStyle = colour;
    x += w + 5 * s;
    i += 1;
  }
  ctx.restore();
}

function drawHalftone(ctx, x, y, cols, rows, step, maxR, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const f = 1 - (r / rows) * 0.7 - (c / cols) * 0.3;
      const rad = Math.max(0.6, maxR * f);
      ctx.beginPath();
      ctx.arc(x + c * step, y + r * step, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTitle(ctx, text, sub, cx, bandY, bandH, w, grade) {
  const clean = (text || '').trim().toUpperCase() || 'NEON BAY';
  const subClean = (sub || '').trim().toUpperCase();
  // Fit the title to the width, and keep it inside the band.
  let size = Math.min(w * 0.17, bandH * 0.66);
  const setFont = () => {
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
  };
  setFont();
  while (ctx.measureText(clean).width > w * 0.9 && size > 24) {
    size -= 4;
    setFont();
  }
  const titleY = bandY + bandH * 0.48;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(cx, 0);
  ctx.rotate(-0.018);
  ctx.translate(-cx, 0);
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  const fill = ctx.createLinearGradient(0, titleY - size * 0.55, 0, titleY + size * 0.55);
  fill.addColorStop(0, grade.titleTop);
  fill.addColorStop(1, grade.titleBottom);
  ctx.shadowColor = 'rgba(10, 0, 20, 0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.045;
  ctx.strokeStyle = '#14060f';
  ctx.lineWidth = Math.max(3, size * 0.085);
  ctx.strokeText(clean, cx, titleY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = fill;
  ctx.fillText(clean, cx, titleY);
  // A thin white pinstripe under the title, poster style, with the
  // subtitle sitting below it — never on top of it.
  const tw = Math.min(w * 0.86, ctx.measureText(clean).width);
  const stripeY = titleY + size * 0.54;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(cx - tw / 2, stripeY, tw, Math.max(2, size * 0.02));
  ctx.restore();
  if (subClean) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let subSize = Math.max(13, Math.min(w * 0.028, bandH * 0.09));
    ctx.font = `700 ${subSize}px system-ui, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.max(2, subSize * 0.22)}px`;
    while (ctx.measureText(subClean).width > w * 0.84 && subSize > 10) {
      subSize -= 1;
      ctx.font = `700 ${subSize}px system-ui, sans-serif`;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    const subY = Math.min(
      stripeY + subSize * 0.9 + Math.max(8, size * 0.06),
      bandY + bandH - subSize * 0.65,
    );
    ctx.fillText(subClean, cx, subY);
    ctx.restore();
  }
}

/**
 * Draws the whole cover. `state` is:
 * { photos, panels, layout, grade, title, subtitle, decorations }.
 * photos: array of images (or null). panels: [{ photo, zoom, ox, oy }].
 * The canvas is drawn at its own pixel size — set it to the export size.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = state.layout in LAYOUTS ? state.layout : 'grid';
  const rects = panelRects(layout);
  const panels = state.panels || [];
  const bandH = bandHeight(W, H);
  const regionH = H - bandH;
  const gap = Math.max(5, Math.round(Math.min(W, H) * 0.011));

  ctx.fillStyle = '#12081c';
  ctx.fillRect(0, 0, W, H);

  // --- Panels -------------------------------------------------------------
  rects.forEach((r, i) => {
    const px = gap + r.x * (W - gap * 2);
    const py = gap + r.y * (regionH - gap * 2);
    const pw = r.w * (W - gap * 2) - (r.x + r.w < 1 ? gap : 0);
    const ph = r.h * (regionH - gap * 2) - (r.y + r.h < 1 ? gap : 0);
    const panel = panels[i] || { photo: i, zoom: 1, ox: 0, oy: 0 };
    const photo = state.photos ? state.photos[panel.photo] || null : null;
    drawPhotoInPanel(ctx, photo, { x: px, y: py, w: pw, h: ph }, panel, state.grade);
    // White frame around each panel, like a printed poster.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, W * 0.0022);
    ctx.strokeRect(px, py, pw, ph);
    if (state.selectedPanel === i) {
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = Math.max(3, W * 0.004);
      ctx.setLineDash([Math.max(8, W * 0.012), Math.max(6, W * 0.008)]);
      ctx.strokeRect(px - 3, py - 3, pw + 6, ph + 6);
      ctx.setLineDash([]);
    }
    ctx.restore();
  });

  // --- Sunset band ----------------------------------------------------------
  const bandY = regionH;
  const band = ctx.createLinearGradient(0, bandY, 0, H);
  grade.band.forEach((c, i) => band.addColorStop(i / (grade.band.length - 1), c));
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, W, bandH);
  // Skyline silhouette along the top of the band, then the retro sun
  // rising behind it, then palms framing the band.
  if (state.decorations !== false) {
    const bandS = (bandH * 0.2) / 104;
    drawRetroSun(ctx, W * 0.5, bandY + bandH * 0.52, bandH * 0.5, grade.sun, grade.band[0]);
    drawSkyline(ctx, 0, W, bandY + bandH * 0.24, bandS, 'rgba(16, 4, 28, 0.9)');
    const palmS = bandH / 230;
    drawPalm(ctx, W * 0.045, H - bandH * 0.02, palmS, 'rgba(14, 4, 24, 0.95)');
    drawPalm(ctx, W * 0.955, H - bandH * 0.02, palmS * 0.85, 'rgba(14, 4, 24, 0.95)');
    // Halftone dots in the band corners.
    drawHalftone(ctx, W * 0.015, bandY + bandH * 0.62, 6, 4, Math.max(9, W * 0.011), Math.max(2, W * 0.0032), 'rgba(255,255,255,0.35)');
    drawHalftone(ctx, W * 0.93, bandY + bandH * 0.62, 6, 4, Math.max(9, W * 0.011), Math.max(2, W * 0.0032), 'rgba(255,255,255,0.35)');
  }
  drawTitle(ctx, state.title, state.subtitle, W / 2, bandY, bandH, W, grade);

  // --- Finish: grain, vignette, outer frame --------------------------------
  const rand = mulberry32(20261121);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  for (let n = 0; n < Math.round((W * H) / 9000); n += 1) {
    ctx.fillRect(rand() * W, rand() * H, 1.4, 1.4);
  }
  ctx.restore();
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(10,0,20,0)');
  vig.addColorStop(1, 'rgba(10,0,20,0.30)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(3, W * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
}

// Hit-test: which panel (index) contains canvas point (x, y), or -1.
export function panelAt(layout, canvasW, canvasH, x, y) {
  const rects = panelRects(layout);
  const bandH = bandHeight(canvasW, canvasH);
  const regionH = canvasH - bandH;
  const gap = Math.max(5, Math.round(Math.min(canvasW, canvasH) * 0.011));
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const r = rects[i];
    const px = gap + r.x * (canvasW - gap * 2);
    const py = gap + r.y * (regionH - gap * 2);
    const pw = r.w * (canvasW - gap * 2) - (r.x + r.w < 1 ? gap : 0);
    const ph = r.h * (regionH - gap * 2) - (r.y + r.h < 1 ? gap : 0);
    if (x >= px && x <= px + pw && y >= py && y <= py + ph) return i;
  }
  return -1;
}
