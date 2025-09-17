// Electron renderer overlay that selects a grid rect and applies it to the frontmost window

const { tileOS } = window;

const LAYOUTS = [
  { id: '2x2', name: '2 x 2', rows: 2, cols: 2 },
  { id: '2x3', name: '2 x 3', rows: 2, cols: 3 },
  { id: '3x3', name: '3 x 3', rows: 3, cols: 3 },
  { id: '2x4', name: '2 x 4', rows: 2, cols: 4 },
];

let state = {
  layoutIndex: 2,
  sel: { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
  display: null,
};

const els = {
  grid: document.getElementById('grid'),
  layoutName: document.getElementById('layoutName'),
};

function setGrid(rows, cols) {
  els.grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  els.grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
}

function renderLayout(i) {
  const layout = LAYOUTS[i];
  state.layoutIndex = i;
  els.layoutName.textContent = `• ${layout.name}`;
  setGrid(layout.rows, layout.cols);
  els.grid.innerHTML = '';

  const total = layout.rows * layout.cols;
  for (let n = 0; n < total; n++) {
    const cell = document.createElement('div');
    cell.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))';
    cell.style.border = '1px solid #1d2330';
    cell.style.borderRadius = '6px';
    els.grid.appendChild(cell);
  }

  drawSelector();
}

function drawSelector() {
  // Remove existing selector
  const old = document.querySelector('.selector');
  if (old) old.remove();

  const layout = LAYOUTS[state.layoutIndex];
  const sel = state.sel;
  const div = document.createElement('div');
  div.className = 'selector';
  div.style.gridRow = `${sel.row} / span ${sel.rowSpan}`;
  div.style.gridColumn = `${sel.col} / span ${sel.colSpan}`;
  els.grid.appendChild(div);
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function moveSel(dr, dc) {
  const layout = LAYOUTS[state.layoutIndex];
  const s = state.sel;
  s.row = clamp(s.row + dr, 1, layout.rows - s.rowSpan + 1);
  s.col = clamp(s.col + dc, 1, layout.cols - s.colSpan + 1);
  drawSelector();
}

function resizeSel(drSpan, dcSpan) {
  const layout = LAYOUTS[state.layoutIndex];
  const s = state.sel;
  s.rowSpan = clamp(s.rowSpan + drSpan, 1, layout.rows - s.row + 1);
  s.colSpan = clamp(s.colSpan + dcSpan, 1, layout.cols - s.col + 1);
  drawSelector();
}

function prevLayout() { renderLayout((state.layoutIndex - 1 + LAYOUTS.length) % LAYOUTS.length); normalizeSel(); }
function nextLayout() { renderLayout((state.layoutIndex + 1) % LAYOUTS.length); normalizeSel(); }

function normalizeSel() {
  const layout = LAYOUTS[state.layoutIndex];
  const s = state.sel;
  s.row = clamp(s.row, 1, layout.rows);
  s.col = clamp(s.col, 1, layout.cols);
  s.rowSpan = clamp(s.rowSpan, 1, layout.rows - s.row + 1);
  s.colSpan = clamp(s.colSpan, 1, layout.cols - s.col + 1);
  drawSelector();
}

async function applyToFrontmost() {
  if (!tileOS || !tileOS.applyRectTopLeft) {
    toast('Native bridge unavailable');
    return;
  }

  const { displayId, workAreaSize, workAreaOffset } = await getPrimaryDisplay();
  const layout = LAYOUTS[state.layoutIndex];
  const cellW = workAreaSize.w / layout.cols;
  const cellH = workAreaSize.h / layout.rows;
  const x = Math.round((state.sel.col - 1) * cellW);
  const y = Math.round((state.sel.row - 1) * cellH);
  const w = Math.round(state.sel.colSpan * cellW);
  const h = Math.round(state.sel.rowSpan * cellH);

  const rect = { x, y, w, h };
  const res = await tileOS.applyRectTopLeft(displayId, rect);
  if (res && res.ok) toast('Applied'); else toast('Failed');
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

function getPrimaryDisplay() {
  // Ask main for display info via a hidden dom-message hop; preload does not expose screen
  // For MVP, assume primary display at (workArea x,y) = (0,0). Users on multi-display can adjust later.
  // Electron main converts workArea top-left to bottom-left.
  // We'll approximate workArea size by the window’s inner size.
  return Promise.resolve({
    displayId: 0,
    workAreaSize: { w: window.innerWidth - 16, h: window.innerHeight - 16 },
    workAreaOffset: { x: 0, y: 0 },
  });
}

// Keyboard
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft': e.shiftKey ? resizeSel(0, -1) : moveSel(0, -1); break;
    case 'ArrowRight': e.shiftKey ? resizeSel(0, +1) : moveSel(0, +1); break;
    case 'ArrowUp': e.shiftKey ? resizeSel(-1, 0) : moveSel(-1, 0); break;
    case 'ArrowDown': e.shiftKey ? resizeSel(+1, 0) : moveSel(+1, 0); break;
    case 'Enter': applyToFrontmost(); break;
    case '[': prevLayout(); break;
    case ']': nextLayout(); break;
    case 'f': case 'F': toggleFullscreen(); break;
  }
});

function toggleFullscreen() { document.documentElement.requestFullscreen?.(); }

// Gamepad
const GAMEPAD = { deadzone: 0.3, prevButtons: [], lastNavAt: 0, repeatAt: 220 };
function gamepadLoop(ts) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = pads[0];
  if (gp) handleGamepad(gp, ts || performance.now());
  requestAnimationFrame(gamepadLoop);
}
function handleGamepad(gp, now) {
  const a = gp.axes || [];
  const b = gp.buttons || [];
  const dz = GAMEPAD.deadzone;
  const lx = a[0] || 0; const ly = a[1] || 0;
  const resizing = (b[6]?.pressed) || (b[7]?.pressed);
  const active = Math.abs(lx) > dz || Math.abs(ly) > dz;

  if (active && (!GAMEPAD.lastNavAt || now - GAMEPAD.lastNavAt > GAMEPAD.repeatAt)) {
    if (resizing) {
      if (lx < -dz) resizeSel(0, -1); else if (lx > dz) resizeSel(0, +1);
      if (ly < -dz) resizeSel(-1, 0); else if (ly > dz) resizeSel(+1, 0);
    } else {
      if (lx < -dz) moveSel(0, -1); else if (lx > dz) moveSel(0, +1);
      if (ly < -dz) moveSel(-1, 0); else if (ly > dz) moveSel(+1, 0);
    }
    GAMEPAD.lastNavAt = now;
  }
  if (!active) GAMEPAD.lastNavAt = 0;

  // D-pad
  if (b[12]?.pressed && !GAMEPAD.prevButtons[12]) moveSel(-1, 0);
  if (b[13]?.pressed && !GAMEPAD.prevButtons[13]) moveSel(+1, 0);
  if (b[14]?.pressed && !GAMEPAD.prevButtons[14]) moveSel(0, -1);
  if (b[15]?.pressed && !GAMEPAD.prevButtons[15]) moveSel(0, +1);

  // A
  if (b[0]?.pressed && !GAMEPAD.prevButtons[0]) applyToFrontmost();
  // LB/RB
  if (b[4]?.pressed && !GAMEPAD.prevButtons[4]) prevLayout();
  if (b[5]?.pressed && !GAMEPAD.prevButtons[5]) nextLayout();

  GAMEPAD.prevButtons = b.map(x => !!x.pressed);
}

renderLayout(state.layoutIndex);
requestAnimationFrame(gamepadLoop);
