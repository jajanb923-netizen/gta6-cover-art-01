// Neon Sunset Cover Studio — editor wiring.
//
// Loads photos (file picker, drag & drop, built-in samples), keeps the
// cover state, renders the live preview, and exports the PNG. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).

import { drawCover, panelAt, bandHeight, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = [
  { id: 'person-cap', label: 'Rider' },
  { id: 'person-longhair', label: 'Star' },
  { id: 'pier', label: 'Pier' },
  { id: 'boulevard', label: 'Boulevard' },
];

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const previewSizeEl = document.getElementById('previewSize');
let shotMode = false;

const state = {
  photos: [], // { img, name, sampleId } — at most 4
  panels: [0, 1, 2, 3].map((i) => ({ photo: i, zoom: 1, ox: 0, oy: 0 })),
  layout: 'grid',
  grade: 'sunset',
  title: 'NEON BAY',
  subtitle: 'SUNSET HEIST • A NEON BAY STORY',
  decorations: true,
  selectedPanel: 0,
  size: '1080x1080',
};

function photoImages() {
  return state.photos.map((p) => p.img);
}

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, {
    photos: photoImages(),
    panels: state.panels,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    decorations: state.decorations,
    selectedPanel: shotMode ? -1 : state.selectedPanel,
  });
  previewSizeEl.textContent = `${w} × ${h}`;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function addPhoto(img, name, sampleId) {
  if (state.photos.length >= 4) {
    statusEl.textContent = 'Four photos is the most — remove one first.';
    return false;
  }
  state.photos.push({ img, name, sampleId: sampleId || null });
  // The first photo fills every panel, so one photo already makes a cover.
  if (state.photos.length === 1) state.panels.forEach((p) => { p.photo = 0; });
  renderThumbs();
  syncPanelEditor();
  redraw();
  return true;
}

async function loadSample(id) {
  const found = SAMPLES.find((s) => s.id === id);
  if (!found) return false;
  if (state.photos.some((p) => p.sampleId === id)) return true;
  try {
    const img = await loadImage(`samples/${id}.jpg`);
    return addPhoto(img, found.label, id);
  } catch {
    statusEl.textContent = `Sample ${id} did not load.`;
    return false;
  }
}

async function loadSampleSet(ids) {
  for (const id of ids) await loadSample(id);
  // Spread the loaded photos across the panels in order.
  state.panels.forEach((p, i) => {
    p.photo = state.photos.length ? i % state.photos.length : 0;
  });
}

// --- Thumbnails -------------------------------------------------------------
function renderThumbs() {
  const box = document.getElementById('thumbs');
  box.innerHTML = '';
  document.getElementById('photoCount').textContent = `${state.photos.length} / 4`;
  if (!state.photos.length) {
    const p = document.createElement('p');
    p.className = 'thumbs-empty';
    p.textContent = 'No photos yet — add one above or tap a sample.';
    box.appendChild(p);
    return;
  }
  state.photos.forEach((photo, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `Use ${photo.name} in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = photo.name;
    const x = document.createElement('span');
    x.className = 'x';
    x.textContent = '×';
    x.title = 'Remove photo';
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      removePhoto(i);
    });
    b.append(img, n, x);
    b.addEventListener('click', () => {
      state.panels[state.selectedPanel].photo = i;
      syncPanelEditor();
      redraw();
    });
    box.appendChild(b);
  });
  document.querySelectorAll('.sample-btn').forEach((btn) => {
    btn.classList.toggle('used', state.photos.some((p) => p.sampleId === btn.dataset.sample));
  });
}

function removePhoto(i) {
  state.photos.splice(i, 1);
  state.panels.forEach((p) => {
    if (p.photo === i) p.photo = 0;
    else if (p.photo > i) p.photo -= 1;
  });
  renderThumbs();
  syncPanelEditor();
  redraw();
}

// --- Layout / grade buttons ---------------------------------------------------
function buildChoiceButtons(el, entries, current, onPick, swatchClass) {
  el.innerHTML = '';
  Object.entries(entries).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = swatchClass ? 'grade-btn' : 'layout-btn';
    if (key === current) b.classList.add('active');
    if (swatchClass) {
      const sw = document.createElement('span');
      sw.className = `swatch ${key}`;
      b.append(sw, document.createTextNode(def.label));
    } else {
      const mini = document.createElement('span');
      mini.className = `mini-layout l-${key}`;
      const count = def.panels;
      for (let n = 0; n < count; n += 1) mini.appendChild(document.createElement('i'));
      b.append(mini, document.createTextNode(def.label));
    }
    b.addEventListener('click', () => onPick(key));
    el.appendChild(b);
  });
}

function refreshChoiceButtons() {
  buildChoiceButtons(document.getElementById('layoutRow'), LAYOUTS, state.layout, (key) => {
    state.layout = key;
    state.selectedPanel = 0;
    refreshChoiceButtons();
    syncPanelEditor();
    redraw();
  });
  buildChoiceButtons(document.getElementById('gradeRow'), GRADES, state.grade, (key) => {
    state.grade = key;
    refreshChoiceButtons();
    redraw();
  }, true);
}

// --- Panel editor ---------------------------------------------------------------
function syncPanelEditor() {
  const i = state.selectedPanel;
  const panel = state.panels[i];
  document.getElementById('panelLabel').textContent = `Panel ${i + 1} of ${panelCount()}`;
  const select = document.getElementById('panelPhoto');
  select.innerHTML = '';
  if (!state.photos.length) {
    const o = document.createElement('option');
    o.textContent = 'No photo yet';
    select.appendChild(o);
  }
  state.photos.forEach((photo, n) => {
    const o = document.createElement('option');
    o.value = String(n);
    o.textContent = `${n + 1} · ${photo.name}`;
    if (n === panel.photo) o.selected = true;
    select.appendChild(o);
  });
  const zoom = document.getElementById('zoom');
  zoom.value = String(Math.round(panel.zoom * 100));
  document.getElementById('zoomValue').textContent = `${Math.round(panel.zoom * 100)}%`;
}

function selectPanel(i) {
  if (i < 0 || i >= panelCount()) return;
  state.selectedPanel = i;
  syncPanelEditor();
  redraw();
}

// --- Export -----------------------------------------------------------------------
function exportCover() {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, {
    photos: photoImages(),
    panels: state.panels,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    decorations: state.decorations,
    selectedPanel: -1,
  });
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-sunset-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved neon-sunset-cover-${w}x${h}.png`;
  }, 'image/png');
}

// Renders the current cover at any size and hands back a PNG data URL.
// Used by the screenshot tooling; the button above is the real export path.
window.__exportCover = async function exportCoverDataUrl(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, {
    photos: photoImages(),
    panels: state.panels,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    decorations: state.decorations,
    selectedPanel: -1,
  });
  return off.toDataURL('image/png');
};

// --- File input + drag & drop -------------------------------------------------------
document.getElementById('photoInput').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      await addPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 14) || 'Photo');
    } catch {
      statusEl.textContent = `Could not read ${file.name}.`;
    }
  }
  e.target.value = '';
});

const dropzone = document.getElementById('dropzone');
['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropzone.classList.add('over');
}));
['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropzone.classList.remove('over');
}));
dropzone.addEventListener('drop', async (e) => {
  for (const file of e.dataTransfer.files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      await addPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 14) || 'Photo');
    } catch {
      statusEl.textContent = `Could not read ${file.name}.`;
    }
  }
});

// --- Sample buttons -----------------------------------------------------------------
const samplesBox = document.getElementById('samples');
SAMPLES.forEach((s) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sample-btn';
  b.dataset.sample = s.id;
  b.title = `Add sample photo: ${s.label}`;
  const img = document.createElement('img');
  img.src = `samples/${s.id}.jpg`;
  img.alt = `${s.label} sample photo`;
  const label = document.createElement('span');
  label.textContent = s.label;
  b.append(img, label);
  b.addEventListener('click', () => loadSample(s.id));
  samplesBox.appendChild(b);
});

// --- Text, grade, layout, size controls ------------------------------------------------
document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
document.getElementById('decor').addEventListener('change', (e) => {
  state.decorations = e.target.checked;
  redraw();
});
document.getElementById('panelPhoto').addEventListener('change', (e) => {
  state.panels[state.selectedPanel].photo = Number(e.target.value);
  redraw();
});
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].zoom = Number(e.target.value) / 100;
  document.getElementById('zoomValue').textContent = `${e.target.value}%`;
  redraw();
});
document.getElementById('fillAll').addEventListener('click', () => {
  const photo = state.panels[state.selectedPanel].photo;
  state.panels.forEach((p) => { p.photo = photo; });
  statusEl.textContent = 'Every panel now shows the same photo.';
  redraw();
});
document.getElementById('resetPanel').addEventListener('click', () => {
  const p = state.panels[state.selectedPanel];
  p.zoom = 1;
  p.ox = 0;
  p.oy = 0;
  syncPanelEditor();
  redraw();
});
const panStep = 0.06;
document.getElementById('panLeft').addEventListener('click', () => { state.panels[state.selectedPanel].ox -= panStep; redraw(); });
document.getElementById('panRight').addEventListener('click', () => { state.panels[state.selectedPanel].ox += panStep; redraw(); });
document.getElementById('panUp').addEventListener('click', () => { state.panels[state.selectedPanel].oy -= panStep; redraw(); });
document.getElementById('panDown').addEventListener('click', () => { state.panels[state.selectedPanel].oy += panStep; redraw(); });
document.querySelectorAll('input[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.size = radio.value;
    redraw();
  });
});
document.getElementById('export').addEventListener('click', exportCover);

// --- Preview: click to select a panel, drag to pan, scroll to zoom ----------------------
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(state.layout, canvas.width, canvas.height, p.x, p.y);
  if (hit >= 0) selectPanel(hit);
  drag = { x: p.x, y: p.y, panel: state.selectedPanel };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[drag.panel];
  const regionH = canvas.height - bandHeight(canvas.width, canvas.height);
  // Pan in fractions of the canvas size, so a drag feels the same at any zoom.
  panel.ox += (p.x - drag.x) / canvas.width;
  panel.oy += (p.y - drag.y) / regionH;
  drag = { x: p.x, y: p.y, panel: drag.panel };
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selectedPanel];
  panel.zoom = Math.max(1, Math.min(2.6, panel.zoom * (1 - e.deltaY * 0.0012)));
  syncPanelEditor();
  redraw();
}, { passive: false });

// --- Boot -------------------------------------------------------------------------------
async function boot() {
  refreshChoiceButtons();
  renderThumbs();
  syncPanelEditor();
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch {
    // Anton falls back to a heavy system sans; the cover still draws.
  }
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    shotMode = true;
    await runShot(shot, query, {
      loadSamples: loadSampleSet,
      applyScene(scene) {
        if (scene.layout) state.layout = scene.layout;
        if (scene.grade) state.grade = scene.grade;
        if (scene.title !== undefined) {
          state.title = scene.title;
          document.getElementById('title').value = scene.title;
        }
        if (scene.subtitle !== undefined) {
          state.subtitle = scene.subtitle;
          document.getElementById('subtitle').value = scene.subtitle;
        }
        if (scene.size && SIZES[scene.size]) state.size = scene.size;
        if (scene.panels) {
          scene.panels.forEach((photo, i) => {
            if (state.panels[i]) state.panels[i].photo = photo;
          });
        }
        if (scene.ox) scene.ox.forEach((v, i) => { if (state.panels[i]) state.panels[i].ox = v; });
        if (scene.oy) scene.oy.forEach((v, i) => { if (state.panels[i]) state.panels[i].oy = v; });
        if (scene.zoom) scene.zoom.forEach((v, i) => { if (state.panels[i]) state.panels[i].zoom = v; });
        state.selectedPanel = 0;
        refreshChoiceButtons();
        syncPanelEditor();
        redraw();
      },
      draw: redraw,
    });
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
    return;
  }
  await loadSampleSet(['person-cap', 'pier', 'boulevard', 'person-longhair']);
  state.selectedPanel = 0;
  syncPanelEditor();
  redraw();
}

boot();
