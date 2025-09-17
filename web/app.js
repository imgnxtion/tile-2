// Tile 2.0 — client-only, blueprint-driven tiled layout with Gamepad support

// Embedded blueprints for file:// usage. You can add more.
const BLUEPRINTS = [
  {
    id: 'dashboard-3x3',
    name: 'Dashboard 3x3',
    grid: { rows: 3, cols: 3 },
    frames: [
      // Fixed region top-left 1x1
      { id: 'frame-hero', row: 1, col: 1, rowSpan: 1, colSpan: 1 },
    ],
    tiles: [
      { id: 'sys', title: 'System', row: 1, col: 2, rowSpan: 1, colSpan: 2, color: '#4aa8ff' },
      { id: 'feed', title: 'Feed', row: 2, col: 1, rowSpan: 2, colSpan: 2, color: '#8a5cff' },
      { id: 'notes', title: 'Notes', row: 2, col: 3, rowSpan: 1, colSpan: 1, color: '#35c56f' },
      { id: 'tasks', title: 'Tasks', row: 3, col: 3, rowSpan: 1, colSpan: 1, color: '#f2a65a' },
    ],
    gates: {
      minSpan: { rows: 1, cols: 1 },
      maxSpan: { rows: 3, cols: 3 },
      allowOverlap: false,
      restrictToGrid: true,
      // Optional zones could be added here
    },
  },
  {
    id: 'wide-2x4',
    name: 'Wide 2x4',
    grid: { rows: 2, cols: 4 },
    frames: [
      { id: 'frame-banner', row: 1, col: 1, rowSpan: 1, colSpan: 1 },
      { id: 'frame-side', row: 2, col: 4, rowSpan: 1, colSpan: 1 },
    ],
    tiles: [
      { id: 'main', title: 'Main', row: 1, col: 2, rowSpan: 2, colSpan: 2, color: '#4aa8ff' },
      { id: 'aux', title: 'Aux', row: 1, col: 4, rowSpan: 1, colSpan: 1, color: '#f2a65a' },
      { id: 'log', title: 'Log', row: 2, col: 1, rowSpan: 1, colSpan: 1, color: '#35c56f' },
    ],
    gates: { minSpan: { rows: 1, cols: 1 }, maxSpan: { rows: 2, cols: 4 }, allowOverlap: false, restrictToGrid: true },
  },
  {
    id: 'kanban-3x4',
    name: 'Kanban 3x4',
    grid: { rows: 3, cols: 4 },
    frames: [],
    tiles: [
      { id: 'todo', title: 'To Do', row: 1, col: 1, rowSpan: 3, colSpan: 1, color: '#8a5cff' },
      { id: 'doing', title: 'Doing', row: 1, col: 2, rowSpan: 3, colSpan: 2, color: '#4aa8ff' },
      { id: 'done', title: 'Done', row: 1, col: 4, rowSpan: 3, colSpan: 1, color: '#35c56f' },
    ],
    gates: { minSpan: { rows: 1, cols: 1 }, maxSpan: { rows: 3, cols: 4 }, allowOverlap: false, restrictToGrid: true },
  },
];

// State
let state = {
  blueprintIndex: 0,
  tiles: [], // runtime tiles with computed rects
  frames: [],
  focusedId: null,
  maximizedId: null,
};

const els = {
  grid: document.getElementById('grid'),
  layoutName: document.getElementById('layoutName'),
};

function cloneBlueprint(index) {
  const bp = BLUEPRINTS[index];
  return JSON.parse(JSON.stringify(bp));
}

function applyGridTemplate(grid, rows, cols) {
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
}

function renderBlueprint(index) {
  const bp = cloneBlueprint(index);
  state.blueprintIndex = index;
  state.maximizedId = null;

  els.grid.innerHTML = '';
  els.layoutName.textContent = `• ${bp.name}`;
  applyGridTemplate(els.grid, bp.grid.rows, bp.grid.cols);

  // Render frames first
  state.frames = bp.frames.map(f => ({ ...f }));
  for (const frame of state.frames) {
    const div = document.createElement('div');
    div.className = 'frame';
    positionToGrid(div, frame);
    div.dataset.frameId = frame.id;
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = frame.id;
    div.appendChild(badge);
    els.grid.appendChild(div);
  }

  // Render tiles
  state.tiles = bp.tiles.map(t => ({ ...t }));
  for (const tile of state.tiles) {
    const div = renderTile(tile);
    els.grid.appendChild(div);
  }

  // Focus first tile
  if (state.tiles.length) focusTile(state.tiles[0].id);
}

function renderTile(tile) {
  const div = document.createElement('div');
  div.className = 'tile';
  div.dataset.tileId = tile.id;
  positionToGrid(div, tile);

  const title = document.createElement('div');
  title.className = 'titlebar';
  title.innerHTML = `<span>${tile.title}</span><span style="color:${tile.color}">◼</span>`;
  const body = document.createElement('div');
  body.className = 'body';
  body.textContent = `row ${tile.row}, col ${tile.col} • ${tile.rowSpan}x${tile.colSpan}`;
  div.appendChild(title);
  div.appendChild(body);

  div.addEventListener('click', () => focusTile(tile.id));
  return div;
}

function positionToGrid(el, pos) {
  el.style.gridRow = `${pos.row} / span ${pos.rowSpan}`;
  el.style.gridColumn = `${pos.col} / span ${pos.colSpan}`;
}

function tileById(id) { return state.tiles.find(t => t.id === id); }
function elByTileId(id) { return els.grid.querySelector(`[data-tile-id="${id}"]`); }

function focusTile(id) {
  if (!id) return;
  state.focusedId = id;
  els.grid.querySelectorAll('.tile').forEach(n => n.classList.remove('focused'));
  const el = elByTileId(id);
  if (el) el.classList.add('focused');
}

function toggleMaximizeFocused() {
  const id = state.focusedId;
  if (!id) return;
  const el = elByTileId(id);
  if (!el) return;
  const bp = BLUEPRINTS[state.blueprintIndex];

  const wasMax = state.maximizedId === id;
  // Reset any current max
  els.grid.querySelectorAll('.tile').forEach(n => n.classList.remove('maximized'));
  if (wasMax) {
    state.maximizedId = null;
    layoutRefresh();
    return;
  }

  // Maximize to full grid (respect frames by overlaying visually only)
  state.maximizedId = id;
  el.classList.add('maximized');
  el.style.gridRow = `1 / span ${bp.grid.rows}`;
  el.style.gridColumn = `1 / span ${bp.grid.cols}`;
  // Hide others visually
  els.grid.querySelectorAll('.tile').forEach(n => {
    if (n.dataset.tileId !== id) n.classList.add('hidden');
  });
}

function layoutRefresh() {
  const bp = BLUEPRINTS[state.blueprintIndex];
  // Unhide all and reapply positions
  els.grid.querySelectorAll('.tile').forEach(n => n.classList.remove('hidden'));
  for (const t of state.tiles) {
    const el = elByTileId(t.id);
    if (el) positionToGrid(el, t);
  }
  // Ensure grid template matches (in case of layout switch)
  applyGridTemplate(els.grid, bp.grid.rows, bp.grid.cols);
}

// Occupancy map utilities
function makeOccupancy() {
  const bp = BLUEPRINTS[state.blueprintIndex];
  const grid = Array.from({ length: bp.grid.rows }, () => Array(bp.grid.cols).fill(null));
  // Mark frames as blocked '#'
  for (const f of state.frames) {
    fillCells(grid, f, '#');
  }
  for (const t of state.tiles) {
    fillCells(grid, t, t.id);
  }
  return grid;
}

function fillCells(grid, pos, val) {
  for (let r = pos.row; r < pos.row + pos.rowSpan; r++) {
    for (let c = pos.col; c < pos.col + pos.colSpan; c++) {
      grid[r - 1][c - 1] = val;
    }
  }
}

function canPlace(id, target) {
  const bp = BLUEPRINTS[state.blueprintIndex];
  const g = bp.grid;
  const gates = bp.gates || {};
  const minR = gates.minSpan?.rows ?? 1;
  const minC = gates.minSpan?.cols ?? 1;
  const maxR = gates.maxSpan?.rows ?? g.rows;
  const maxC = gates.maxSpan?.cols ?? g.cols;

  if (target.row < 1 || target.col < 1) return false;
  if (target.row + target.rowSpan - 1 > g.rows) return false;
  if (target.col + target.colSpan - 1 > g.cols) return false;
  if (target.rowSpan < minR || target.colSpan < minC) return false;
  if (target.rowSpan > maxR || target.colSpan > maxC) return false;

  // Build occupancy without this tile
  const occ = makeOccupancy();
  for (let r = 0; r < g.rows; r++)
    for (let c = 0; c < g.cols; c++)
      if (occ[r][c] === id) occ[r][c] = null;

  for (let r = target.row; r < target.row + target.rowSpan; r++) {
    for (let c = target.col; c < target.col + target.colSpan; c++) {
      if (occ[r - 1][c - 1] !== null) return false; // collision with frame or other tile
    }
  }
  return true;
}

function moveFocused(dr, dc) {
  const t = tileById(state.focusedId);
  if (!t) return;
  const next = { ...t, row: t.row + dr, col: t.col + dc };
  if (canPlace(t.id, next)) {
    Object.assign(t, next);
    layoutRefresh();
    focusTile(t.id);
  } else {
    flashDanger(t.id);
  }
}

function resizeFocused(drSpan, dcSpan) {
  const t = tileById(state.focusedId);
  if (!t) return;
  const next = { ...t, rowSpan: clamp(t.rowSpan + drSpan, 1, 100), colSpan: clamp(t.colSpan + dcSpan, 1, 100) };
  if (canPlace(t.id, next)) {
    Object.assign(t, next);
    layoutRefresh();
    focusTile(t.id);
  } else {
    flashDanger(t.id);
  }
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function flashDanger(id) {
  const el = elByTileId(id);
  if (!el) return;
  el.classList.add('danger');
  setTimeout(() => el.classList.remove('danger'), 140);
}

function nearestTileInDirection(fromId, dir) {
  const src = tileById(fromId);
  if (!src) return null;
  const sx = src.col + src.colSpan / 2;
  const sy = src.row + src.rowSpan / 2;

  let best = null;
  let bestScore = Infinity;
  for (const t of state.tiles) {
    if (t.id === fromId) continue;
    const tx = t.col + t.colSpan / 2;
    const ty = t.row + t.rowSpan / 2;
    const dx = tx - sx;
    const dy = ty - sy;

    // Filter by directional cone
    if (dir === 'left' && dx >= -0.1) continue;
    if (dir === 'right' && dx <= 0.1) continue;
    if (dir === 'up' && dy >= -0.1) continue;
    if (dir === 'down' && dy <= 0.1) continue;

    const dist = Math.hypot(dx, dy);
    // Prefer closer in the primary axis
    const axisBias = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = dist + axisBias * 0.5;
    if (score < bestScore) { bestScore = score; best = t; }
  }
  return best?.id ?? null;
}

function navigate(dir) {
  const nextId = nearestTileInDirection(state.focusedId, dir);
  if (nextId) focusTile(nextId); else flashDanger(state.focusedId);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
  if (state.maximizedId && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].indexOf(e.key) === -1) {
    // When maximized, only allow un-maximize with Enter to avoid confusion
  }
  switch (e.key) {
    case 'ArrowLeft': e.shiftKey ? resizeFocused(0, -1) : navigate('left'); break;
    case 'ArrowRight': e.shiftKey ? resizeFocused(0, +1) : navigate('right'); break;
    case 'ArrowUp': e.shiftKey ? resizeFocused(-1, 0) : navigate('up'); break;
    case 'ArrowDown': e.shiftKey ? resizeFocused(+1, 0) : navigate('down'); break;
    case 'Enter': toggleMaximizeFocused(); break;
    case '[': prevLayout(); break;
    case ']': nextLayout(); break;
    case 'r': case 'R': resetLayout(); break;
    case 's': case 'S': saveLayout(); break;
    case 'l': case 'L': loadLayout(); break;
    case 'f': case 'F': toggleFullscreen(); break;
  }
});

function prevLayout() { const i = (state.blueprintIndex - 1 + BLUEPRINTS.length) % BLUEPRINTS.length; renderBlueprint(i); }
function nextLayout() { const i = (state.blueprintIndex + 1) % BLUEPRINTS.length; renderBlueprint(i); }
function resetLayout() { renderBlueprint(state.blueprintIndex); }

function saveLayout() {
  const key = `tile20:${BLUEPRINTS[state.blueprintIndex].id}`;
  const payload = { tiles: state.tiles, maximizedId: state.maximizedId };
  localStorage.setItem(key, JSON.stringify(payload));
  toast('Layout saved');
}

function loadLayout() {
  const key = `tile20:${BLUEPRINTS[state.blueprintIndex].id}`;
  const raw = localStorage.getItem(key);
  if (!raw) { toast('No saved layout'); return; }
  const payload = JSON.parse(raw);
  state.tiles = payload.tiles;
  state.maximizedId = payload.maximizedId ?? null;
  layoutRefresh();
  if (state.maximizedId) toggleMaximizeFocused();
  focusTile(state.tiles[0]?.id);
  toast('Layout loaded');
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
}

function toast(msg) {
  const div = document.createElement('div');
  div.textContent = msg;
  Object.assign(div.style, {
    position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.6)', color: '#d8dee9', padding: '6px 10px', borderRadius: '6px', border: '1px solid #283142', zIndex: 9
  });
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 900);
}

// Gamepad handling (XInput mapping; Steam Controller via Steam Input)
const GAMEPAD = {
  deadzone: 0.3,
  prevButtons: [],
  prevAxes: [],
  repeatAt: 220, // ms for held navigation repeat
  lastNavAt: 0,
};

function gamepadLoop(ts) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = pads[0];
  if (gp) handleGamepad(gp, ts);
  requestAnimationFrame(gamepadLoop);
}

function handleGamepad(gp, ts) {
  const now = ts || performance.now();
  const a = gp.axes || [];
  const b = gp.buttons || [];
  const dz = GAMEPAD.deadzone;

  function pressed(i) { return !!(b[i] && b[i].pressed); }
  function justPressed(i) { return pressed(i) && !GAMEPAD.prevButtons[i]; }

  // Axes: 0=X (left stick), 1=Y (left stick)
  const lx = a[0] || 0;
  const ly = a[1] || 0;
  const lActive = Math.abs(lx) > dz || Math.abs(ly) > dz;
  const resizing = pressed(6) || pressed(7); // LT or RT held

  if (lActive) {
    // Debounce/Repeat
    if (!GAMEPAD.lastNavAt || now - GAMEPAD.lastNavAt > GAMEPAD.repeatAt) {
      if (resizing) {
        if (lx < -dz) resizeFocused(0, -1);
        else if (lx > dz) resizeFocused(0, +1);
        if (ly < -dz) resizeFocused(-1, 0);
        else if (ly > dz) resizeFocused(+1, 0);
      } else {
        if (lx < -dz) navigate('left');
        else if (lx > dz) navigate('right');
        if (ly < -dz) navigate('up');
        else if (ly > dz) navigate('down');
      }
      GAMEPAD.lastNavAt = now;
    }
  } else {
    GAMEPAD.lastNavAt = 0;
  }

  // D-Pad buttons (12..15)
  if (justPressed(12)) navigate('up');
  if (justPressed(13)) navigate('down');
  if (justPressed(14)) navigate('left');
  if (justPressed(15)) navigate('right');

  // A (0) toggle maximize
  if (justPressed(0)) toggleMaximizeFocused();
  // LB (4)/RB (5) layout prev/next
  if (justPressed(4)) prevLayout();
  if (justPressed(5)) nextLayout();
  // Start (9) save, Back (8) load
  if (justPressed(9)) saveLayout();
  if (justPressed(8)) loadLayout();

  GAMEPAD.prevButtons = b.map(x => !!x.pressed);
  GAMEPAD.prevAxes = a.slice(0);
}

// Init
renderBlueprint(0);
requestAnimationFrame(gamepadLoop);

