const { contextBridge, ipcRenderer } = require('electron');
const call = (method, data) => ipcRenderer.invoke('sica-local', { method, data });
contextBridge.exposeInMainWorld('sicaLocal', Object.freeze({
  status: () => call('status'), setup: data => call('setup', data), login: data => call('login', data),
  logout: () => call('logout'), read: () => call('read'), command: data => call('command', data),
  backup: password => call('backup', { password }), restore: password => call('restore', { password }),
}));