const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let win;

function createWindow() {
  const primary = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    x: primary.workArea.x,
    y: primary.workArea.y,
    width: primary.workArea.width,
    height: primary.workArea.height,
    transparent: false, // can set true later for overlay style
    frame: true, // can set false later to be borderless
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Convert a rect defined in the display's workArea top-left coordinates
// to macOS global bottom-left coordinates for AX API.
function convertTopLeftWorkAreaToBottomLeftGlobal(display, rect) {
  const work = display.workArea; // { x, y, width, height } in global top-left space
  const bounds = display.bounds; // absolute full display bounds in top-left space

  const absTopLeftX = work.x + rect.x;
  const absTopLeftY = work.y + rect.y; // still top-left space

  // Convert to bottom-left: yBL = displayBottom - (absTopLeftY + rect.h)
  const displayBottom = bounds.y + bounds.height;
  const yBL = displayBottom - (absTopLeftY + rect.h);
  const xBL = absTopLeftX; // X axis is the same in both conventions

  return { x: Math.round(xBL), y: Math.round(yBL), w: Math.round(rect.w), h: Math.round(rect.h) };
}

function runWindowCtlSetFrame(rectBL) {
  // Path to the Swift CLI built binary (Release). Adjust if needed.
  const bin = path.resolve(__dirname, '..', 'native', 'macos', 'build', 'windowctl');
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ['set-frame', String(rectBL.x), String(rectBL.y), String(rectBL.w), String(rectBL.h)]);
    let out = '';
    let err = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { err += d.toString(); });
    child.on('close', code => {
      if (code === 0) resolve(out.trim()); else reject(new Error(`windowctl exited ${code}: ${err || out}`));
    });
  });
}

ipcMain.handle('apply-rect-top-left', async (event, payload) => {
  const { displayId, rect } = payload; // rect: { x, y, w, h } in workArea top-left coords

  const displays = screen.getAllDisplays();
  const display = displays.find(d => d.id === displayId) || screen.getPrimaryDisplay();
  const rectBL = convertTopLeftWorkAreaToBottomLeftGlobal(display, rect);

  try {
    // Hide self to allow previous app to become frontmost so AX targets it.
    if (win && !win.isDestroyed()) {
      win.hide();
    }
    // Small delay for focus handoff
    await new Promise(r => setTimeout(r, 220));
    const result = await runWindowCtlSetFrame(rectBL);
    // Optionally re-show window if the renderer requested sticky overlay
    if (win && !win.isDestroyed()) {
      win.showInactive();
    }
    return { ok: true, result };
  } catch (e) {
    if (win && !win.isDestroyed()) {
      win.showInactive();
    }
    return { ok: false, error: String(e) };
  }
});
