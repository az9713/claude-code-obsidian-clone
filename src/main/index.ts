import { app, BrowserWindow, dialog, ipcMain, shell, Menu, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { WatcherService } from './watcher-service'
import * as fs from 'fs'

const CONFIG_DIR = join(app.getPath('home'), '.nexusnotes')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

let mainWindow: BrowserWindow | null = null
let watcherService: WatcherService | null = null

function loadConfig(): { vaultPath?: string; windowBounds?: Electron.Rectangle } {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
    }
  } catch {
    // ignore
  }
  return {}
}

function saveConfig(config: Record<string, unknown>): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  const existing = loadConfig()
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...existing, ...config }, null, 2))
}

function createWindow(): void {
  const config = loadConfig()
  const bounds = config.windowBounds || { width: 1200, height: 800 }

  mainWindow = new BrowserWindow({
    ...bounds,
    show: false,
    autoHideMenuBar: true,
    title: 'Nexus Notes',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.on('close', () => {
    if (mainWindow) {
      saveConfig({ windowBounds: mainWindow.getBounds() })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Intercept Chromium-reserved shortcuts (Ctrl+N, Ctrl+O, Ctrl+G, Ctrl+D, Ctrl+Shift+F, Ctrl+W)
  // and forward them to the renderer before Chromium eats them
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control || input.meta) {
      const key = input.key.toLowerCase()
      if (
        key === 'n' ||
        key === 'o' ||
        key === 'g' ||
        key === 'd' ||
        key === 'w' ||
        (input.shift && key === 'f')
      ) {
        // Prevent Chromium from handling this shortcut
        event.preventDefault()
        // Forward to renderer as a custom IPC event
        if (!mainWindow!.isDestroyed()) {
          mainWindow!.webContents.send('shortcut', {
            key,
            ctrl: input.control,
            shift: input.shift,
            meta: input.meta
          })
        }
      }
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.nexusnotes.app')

  // Remove default menu so Ctrl+N, Ctrl+O, etc. aren't intercepted by Electron
  const emptyMenu = Menu.buildFromTemplate([])
  Menu.setApplicationMenu(emptyMenu)

  registerIpcHandlers()

  // Handle vault selection
  ipcMain.handle('vault:select', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Vault Folder'
    })
    if (!result.canceled && result.filePaths.length > 0) {
      const vaultPath = result.filePaths[0]
      saveConfig({ vaultPath })
      return vaultPath
    }
    return null
  })

  ipcMain.handle('vault:getSaved', () => {
    const config = loadConfig()
    return config.vaultPath || null
  })

  ipcMain.handle('vault:startWatching', (_event, vaultPath: string) => {
    if (watcherService) {
      watcherService.close()
    }
    watcherService = new WatcherService(vaultPath, mainWindow!)
    return true
  })

  ipcMain.handle('vault:stopWatching', () => {
    if (watcherService) {
      watcherService.close()
      watcherService = null
    }
    return true
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (watcherService) {
    watcherService.close()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
