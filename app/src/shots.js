// Fixed scenes for screenshots, driven by the URL query:
//
//   ?shot=cover&layout=hero&grade=sunset&size=1920x1080
//     &photos=person-cap,pier,boulevard&panels=0,1,2
//     &title=NEON%20BAY&subtitle=SUNSET%20HEIST
//       — the cover alone, filling the window (body.shot-cover hides the editor).
//   ?shot=editor&layout=grid&grade=sunset&photos=person-cap,pier,boulevard,person-longhair
//       — the full editor with photos loaded.
//
// `photos` is a comma list of sample ids. `panels` assigns a photo index to
// each panel; without it, panels take the photos in order. window.__shotReady
// is set by main.js once the scene has painted.

const DEFAULT_PHOTOS = ['person-cap', 'pier', 'boulevard', 'person-longhair'];

function sceneFromQuery(query) {
  const scene = {};
  const layout = query.get('layout');
  if (layout) scene.layout = layout;
  const grade = query.get('grade');
  if (grade) scene.grade = grade;
  const title = query.get('title');
  if (title !== null) scene.title = title;
  const subtitle = query.get('subtitle');
  if (subtitle !== null) scene.subtitle = subtitle;
  const size = query.get('size');
  if (size) scene.size = size;
  const panels = query.get('panels');
  if (panels) scene.panels = panels.split(',').map((n) => Number(n));
  const nums = (key) => {
    const v = query.get(key);
    return v ? v.split(',').map((n) => Number(n)) : null;
  };
  // Per-panel framing: ox / oy shift a photo inside its panel (fractions
  // of the panel), zoom enlarges it. Used to keep faces in frame.
  const ox = nums('ox');
  if (ox) scene.ox = ox;
  const oy = nums('oy');
  if (oy) scene.oy = oy;
  const zoom = nums('zoom');
  if (zoom) scene.zoom = zoom;
  return scene;
}

export async function runShot(shot, query, api) {
  const photoIds = (query.get('photos') || DEFAULT_PHOTOS.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const scene = sceneFromQuery(query);
  // Backwards compatibility with the starter's ?shot=cover&photo=pier form.
  const single = query.get('photo');
  if (single && !query.get('photos')) {
    scene.panels = undefined;
    await api.loadSamples([single]);
    api.applyScene({ ...scene, panels: undefined });
    if (shot === 'cover') document.body.classList.add('shot-cover');
    api.draw();
    return;
  }
  await api.loadSamples(photoIds);
  if (!scene.panels) {
    // Panels take the loaded photos in order, wrapping around.
    scene.panels = [0, 1, 2, 3];
  }
  api.applyScene(scene);
  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.draw();
}
