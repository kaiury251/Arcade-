const { app, BrowserWindow, Menu } = require('electron');

app.commandLine.appendSwitch('no-sandbox');

function create() {
  const w = new BrowserWindow({
    width: 800,
    height: 600,
    useContentSize: true,
    title: 'Arcade 3 em 1',
    backgroundColor: '#0b1020',
    autoHideMenuBar: true,
  });
  Menu.setApplicationMenu(null);
  w.loadFile('index.html');
  w.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      w.setFullScreen(!w.isFullScreen());
      e.preventDefault();
    }
  });
}

app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
