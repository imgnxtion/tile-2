const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tileOS', {
  applyRectTopLeft: (displayId, rect) => ipcRenderer.invoke('apply-rect-top-left', { displayId, rect }),
});

