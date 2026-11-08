const { app, BrowserWindow, ipcMain, dialog, safeStorage, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { LocalService, initSQL } = require('./service.cjs');
let win, service;
function encryption(dir) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows no ofrece protección de claves. No se abrirá el almacén sin cifrado.');
  const keyPath = path.join(dir, 'clave-local.dpapi');
  let key;
  if (fs.existsSync(keyPath)) key = Buffer.from(safeStorage.decryptString(fs.readFileSync(keyPath)), 'hex');
  else { key = crypto.randomBytes(32); fs.writeFileSync(keyPath, safeStorage.encryptString(key.toString('hex')), { mode: 0o600 }); }
  return {
    encrypt(data) { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key, iv); const body = Buffer.concat([c.update(data), c.final()]); return Buffer.concat([Buffer.from('SICA1'), iv, c.getAuthTag(), body]); },
    decrypt(data) { if (data.subarray(0,5).toString() !== 'SICA1') throw new Error('Almacén inválido.'); const c = crypto.createDecipheriv('aes-256-gcm', key, data.subarray(5,17)); c.setAuthTag(data.subarray(17,33)); return Buffer.concat([c.update(data.subarray(33)), c.final()]); }
  };
}
app.setName('SICA Local Prueba');
if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(async () => {
  try {
    const dir = app.getPath('userData'); fs.mkdirSync(dir, { recursive: true });
    service = new LocalService(path.join(dir,'deposito.sica'), encryption(dir), await initSQL(__dirname));
    const status = service.open();
    const entry = path.join(__dirname, '..', 'dist', 'index.html');
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !['file:', 'data:', 'blob:', 'devtools:'].some(p => details.url.startsWith(p)) }));
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, cb) => cb(false));
    win = new BrowserWindow({ width: 1280, height: 900, minWidth: 960, minHeight: 650, show: false, title: 'SICA Local · Datos ficticios', webPreferences: { preload: path.join(__dirname,'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
    win.removeMenu();
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', e => e.preventDefault());
    ipcMain.handle('sica-local', async (event, request) => {
      try {
        if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('Origen no autorizado.');
        if (!request || typeof request.method !== 'string') throw new Error('Solicitud inválida.');
        let result;
        switch(request.method) {
          case 'status': result = { configured: status.configured }; break;
          case 'setup': result = service.setup(request.data); status.configured = true; break;
          case 'login': result = service.login(request.data); break;
          case 'logout': service.logout(); result = null; break;
          case 'read': result = service.read(); break;
          case 'command': result = service.command(request.data); break;
          case 'backup': {
            const bytes = service.backup(request.data?.password);
            const choice = await dialog.showSaveDialog(win, { title: 'Guardar respaldo cifrado', defaultPath: `SICA-respaldo-${new Date().toISOString().slice(0,10)}.sicabackup`, filters: [{ name: 'Respaldo SICA', extensions: ['sicabackup'] }] });
            if (choice.canceled || !choice.filePath) { result = { canceled: true }; break; }
            fs.writeFileSync(choice.filePath, bytes, { mode: 0o600 }); result = { saved: true }; break;
          }
          case 'restore': {
            const choice = await dialog.showOpenDialog(win, { title: 'Seleccionar respaldo SICA', properties: ['openFile'], filters: [{ name: 'Respaldo SICA', extensions: ['sicabackup'] }] });
            if (choice.canceled || !choice.filePaths[0]) { result = { canceled: true }; break; }
            const confirm = await dialog.showMessageBox(win, { type: 'warning', buttons: ['Cancelar','Restaurar'], defaultId: 0, cancelId: 0, message: 'La restauración sustituye los datos locales. Cree un respaldo antes de continuar.' });
            if (confirm.response !== 1) { result = { canceled: true }; break; }
            result = service.restore(fs.readFileSync(choice.filePaths[0]), request.data?.password); status.configured = true; break;
          }
          default: throw new Error('Operación no permitida.');
        }
        return { ok: true, value: result };
      } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Error local' }; }
    });
    await win.loadFile(entry); win.show();
  } catch(e) { dialog.showErrorBox('SICA no pudo abrirse', e instanceof Error ? e.message : 'Error local'); app.quit(); }
});
app.on('window-all-closed', () => app.quit());
app.on('second-instance', () => { if(win) { if(win.isMinimized()) win.restore(); win.focus(); } });