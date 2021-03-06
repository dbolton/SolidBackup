const { app, BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')
const os = require('os')

const ipc = require('electron').ipcMain
const electron = require('electron')
const dialog = electron.dialog
const globalShortcut = electron.globalShortcut

var devBuild = false
var lsBackup // reference to spawned backup process
ipc.on('kill-backup', function () { killBackup(); console.log('kill-backup received') })
function killBackup () {
  lsBackup.kill('SIGINT')
  console.log('killed')
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow () {
  // Create the browser window.
  // win = new BrowserWindow({width: 1500, height: 700}); width 1500 when using DevTools
  win = new BrowserWindow({ width: 558, height: 700, show: false, focusable: true, skipTaskbar: false, webPreferences: { nodeIntegration: true, worldSafeExecuteJavaScript: true } })

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  // const electron = require('electron')
  // const BrowserWindow = electron.BrowserWindow
  const Menu = electron.Menu
  // const app = electron.app
  const username = os.userInfo()['username']

  let template = [{
    label: '&File',
    submenu: [{
      label: 'Run &Backup',
      accelerator: 'CmdOrCtrl+B',
      click: function (item, focusedWindow) {
        win.webContents.send('get-inputs-and-backup')
      }
    }, {
      label: '&Save Settings',
      accelerator: 'CmdOrCtrl+S',
      click: function (item, focusedWindow) {
        win.webContents.send('save-settings')
      }
    }, {
      label: '&Check Locations and Settings',
      accelerator: 'CmdOrCtrl+K',
      click: function (item, focusedWindow) {
        win.webContents.send('check')
      }
    }, {
      label: 'Presets',
      submenu: [{
        label: 'Reset to &Default Settings',
        accelerator: 'CmdOrCtrl+Shift+D',
        click: function (item, focusedWindow) {
          win.webContents.send('set-user-input', 'sourceFolder', 'C:\\Users\\' + username + '\\Documents')
          win.webContents.send('set-user-input', 'destinationFolder', '')
          win.webContents.send('set-user-input', 'full', '', true)
          win.webContents.send('set-user-input', 'numberOfFull', '3')
          win.webContents.send('set-user-input', 'numberOfMirror', '3')
          var date = new Date(new Date().getTime() + 10 * 60000) // 10 minutes ahead of current time
          win.webContents.send('set-user-input', 'startTime', (date.getHours() < 10 ? '0' : '') + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes())
          win.webContents.send('set-user-input', 'weekly', '', true)
          win.webContents.send('set-user-input', 'monday', '', false)
          win.webContents.send('set-user-input', 'tuesday', '', false)
          win.webContents.send('set-user-input', 'wednesday', '', false)
          win.webContents.send('set-user-input', 'thursday', '', false)
          win.webContents.send('set-user-input', 'friday', '', false)
          win.webContents.send('set-user-input', 'saturday', '', false)
          win.webContents.send('set-user-input', 'sunday', '', false)
          win.webContents.send('set-user-input', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()], '', true)
          win.webContents.send('set-user-input', 'shadow', '', true)
          win.webContents.send('check')
        }
      }, {
        label: '&E-mail Backup at CofC IHQ',
        accelerator: 'CmdOrCtrl+Shift+E',
        click: function (item, focusedWindow) {
          win.webContents.send('set-user-input', 'sourceFolder', 'C:\\Users\\' + username + '\\Documents\\Outlook Files')
          win.webContents.send('set-user-input', 'destinationFolder', '\\\\hqfs1\\general\\Users\\' + username)
          win.webContents.send('set-user-input', 'mirror', '', true)
          win.webContents.send('set-user-input', 'numberOfMirror', '1')
          var date = new Date(new Date().getTime() + 10 * 60000) // 10 minutes ahead of current time
          win.webContents.send('set-user-input', 'startTime', (date.getHours() < 10 ? '0' : '') + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes())
          win.webContents.send('set-user-input', 'weekly', '', true)
          win.webContents.send('set-user-input', 'monday', '', false)
          win.webContents.send('set-user-input', 'tuesday', '', false)
          win.webContents.send('set-user-input', 'wednesday', '', false)
          win.webContents.send('set-user-input', 'thursday', '', false)
          win.webContents.send('set-user-input', 'friday', '', false)
          win.webContents.send('set-user-input', 'saturday', '', false)
          win.webContents.send('set-user-input', 'sunday', '', false)
          win.webContents.send('set-user-input', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()], '', true)
          win.webContents.send('set-user-input', 'shadow', '', true)
          win.webContents.send('check')
        }
      }, {
        label: '&Test Settings (for Development)',
        accelerator: 'CmdOrCtrl+Shift+Alt+D',
        click: function (item, focusedWindow) {
          win.webContents.send('set-user-input', 'sourceFolder', 'C:\\Users\\dbolton\\Documents\\IT\\Backup\\Test Space')
          win.webContents.send('set-user-input', 'destinationFolder', 'F:\\Backup (Test)')
          win.webContents.send('set-user-input', 'full', '', true)
          win.webContents.send('set-user-input', 'numberOfFull', '3')
          var date = new Date(new Date().getTime() + 2 * 60000) // 2 minutes ahead of current time
          win.webContents.send('set-user-input', 'startTime', (date.getHours() < 10 ? '0' : '') + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes())
          win.webContents.send('set-user-input', 'daily', '', true)
          win.webContents.send('set-user-input', 'shadow', '', false)
          win.webContents.send('check')
        }
      }, {
        label: 'Author’s &Personal Settings',
        accelerator: 'CmdOrCtrl+Shift+P',
        click: function (item, focusedWindow) {
          win.webContents.send('set-user-input', 'sourceFolder', 'C:\\Users\\')
          win.webContents.send('set-user-input', 'destinationFolder', 'F:\\Backup (work-bb)')
          win.webContents.send('set-user-input', 'mirror', '', true)
          win.webContents.send('set-user-input', 'numberOfMirror', '3')
          win.webContents.send('set-user-input', 'startTime', '12:30')
          win.webContents.send('set-user-input', 'weekly', '', true)
          win.webContents.send('set-user-input', 'monday', '', true)
          win.webContents.send('set-user-input', 'tuesday', '', true)
          win.webContents.send('set-user-input', 'wednesday', '', true)
          win.webContents.send('set-user-input', 'thursday', '', true)
          win.webContents.send('set-user-input', 'friday', '', true)
          win.webContents.send('set-user-input', 'saturday', '', false)
          win.webContents.send('set-user-input', 'sunday', '', false)
          win.webContents.send('set-user-input', 'shadow', '', true)
          win.webContents.send('check')
        }
      }]
    }]
  }, {
    label: '&Edit',
    submenu: [{
      label: 'Undo',
      accelerator: 'CmdOrCtrl+Z',
      role: 'undo'
    }, {
      label: 'Redo',
      accelerator: 'Shift+CmdOrCtrl+Z',
      role: 'redo'
    }, {
      type: 'separator'
    }, {
      label: 'Cut',
      accelerator: 'CmdOrCtrl+X',
      role: 'cut'
    }, {
      label: 'Copy',
      accelerator: 'CmdOrCtrl+C',
      role: 'copy'
    }, {
      label: 'Paste',
      accelerator: 'CmdOrCtrl+V',
      role: 'paste'
    }, {
      label: 'Select All',
      accelerator: 'CmdOrCtrl+A',
      role: 'selectall'
    }]
  }, {
    label: '&View',
    submenu: [{
      label: 'Show Settings',
      accelerator: 'CmdOrCtrl+T',
      id: 'show-settings',
      enabled: true,
      click: function (item, focusedWindow) {
        win.webContents.send('show-settings')
        // item.enabled = false;
        // Menu.getApplicationMenu().getMenuItemById('show-backup-log').enabled = false; //not sure how to get reference to the menu item. This doesn't work because 'menu' is not defined within the function.
        // menu.getMenuItemById('show-backup-log').enabled = true; //not sure how to get reference to the menu item. This doesn't work because 'menu' is not defined within the function.
      }
    }, {
      label: 'Show Backup Log',
      accelerator: 'CmdOrCtrl+L',
      id: 'show-backup-log',
      enabled: true,
      click: function (item, focusedWindow) {
        win.webContents.send('show-backup-log')
        // menu.getMenuItemById('show-settings').enabled = true; //not sure how to get reference to the menu item.
        // item.enabled = false;
      }
    }, {
      type: 'separator'
    }, {
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click: function (item, focusedWindow) {
        if (focusedWindow) {
          // on reload, start fresh and close any old
          // open secondary windows
          if (focusedWindow.id === 1) {
            BrowserWindow.getAllWindows().forEach(function (win) {
              if (win.id > 1) {
                win.close()
              }
            })
          }
          focusedWindow.reload()
        }
      }
    }, {
      label: 'Toggle Full Screen',
      accelerator: (function () {
        if (process.platform === 'darwin') {
          return 'Ctrl+Command+F'
        } else {
          return 'F11'
        }
      })(),
      click: function (item, focusedWindow) {
        if (focusedWindow) {
          focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
        }
      }
    }, {
      label: 'Toggle Developer Tools',
      accelerator: (function () {
        if (process.platform === 'darwin') {
          return 'Alt+Command+I'
        } else {
          return 'Ctrl+Shift+I'
        }
      })(),
      click: function (item, focusedWindow) {
        if (focusedWindow) {
          focusedWindow.toggleDevTools()
        }
      }
    }]
  }, {
    label: '&Window',
    role: 'window',
    submenu: [{
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    }, {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    }, {
      type: 'separator'
    }, {
      label: 'Reopen Window',
      accelerator: 'CmdOrCtrl+Shift+T',
      enabled: false,
      key: 'reopenMenuItem',
      click: function () {
        app.emit('activate')
      }
    }]
  }, {
    label: '&Help',
    role: 'help',
    submenu: [{
      type: 'separator'
    }, {
      label: 'About',
      click: function (item, focusedWindow) {
        if (focusedWindow) {
          const options = {
            type: 'info',
            title: 'About',
            buttons: ['OK'],
            message: 'Solid Backup by David Bolton\n\nVersion: ' + electron.app.getVersion()
          }
          electron.dialog.showMessageBox(focusedWindow, options, function () {})
        }
      }
    }, {
      label: 'Visit website',
      click: function () {
        electron.shell.openExternal('https://github.com/dbolton/SolidBackup')
      }
    }]
  }]

  function addUpdateMenuItems (items, position) {
    if (process.mas) return

    const version = electron.app.getVersion()
    let updateItems = [{
      label: `Version ${version}`,
      enabled: false
    }]

    items.splice.apply(items, [position, 0].concat(updateItems))
  }

  function findReopenMenuItem () {
    const menu = Menu.getApplicationMenu()
    if (!menu) return

    let reopenMenuItem
    menu.items.forEach(function (item) {
      if (item.submenu) {
        item.submenu.items.forEach(function (item) {
          if (item.key === 'reopenMenuItem') {
            reopenMenuItem = item
          }
        })
      }
    })
    return reopenMenuItem
  }

  if (process.platform === 'darwin') {
    const name = electron.app.getName()
    template.unshift({
      label: name,
      submenu: [{
        label: `About ${name}`,
        role: 'about'
      }, {
        type: 'separator'
      }, {
        label: 'Services',
        role: 'services',
        submenu: []
      }, {
        type: 'separator'
      }, {
        label: `Hide ${name}`,
        accelerator: 'Command+H',
        role: 'hide'
      }, {
        label: 'Hide Others',
        accelerator: 'Command+Alt+H',
        role: 'hideothers'
      }, {
        label: 'Show All',
        role: 'unhide'
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: function () {
          app.quit()
        }
      }]
    })

    // Window menu.
    template[3].submenu.push({
      type: 'separator'
    }, {
      label: 'Bring All to Front',
      role: 'front'
    })

    addUpdateMenuItems(template[0].submenu, 1)
  }

  if (process.platform === 'win32') {
    const helpMenu = template[template.length - 1].submenu
    addUpdateMenuItems(helpMenu, 0)
  }

  // app.on('ready', function () {
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // get updates
  const { autoUpdater } = require('electron-updater')
  autoUpdater.checkForUpdatesAndNotify()

  const log = require('electron-log')
  autoUpdater.logger = log
  autoUpdater.logger.transports.file.level = 'info'
  log.info('App starting...')

  function sendStatusToWindow (text) {
    log.info(text)
  }

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...')
  })
  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('Update available.')
  })
  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Update not available.')
  })
  autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error in auto-updater. ' + err)
  })
  autoUpdater.on('download-progress', (progressObj) => {
    let logMessage = 'Download speed: ' + progressObj.bytesPerSecond
    logMessage = logMessage + ' - Downloaded ' + progressObj.percent + '%'
    logMessage = logMessage + ' (' + progressObj.transferred + '/' + progressObj.total + ')'
    sendStatusToWindow(logMessage)
  })
  autoUpdater.on('update-downloaded', (info, releaseNotes, releaseName) => {
    sendStatusToWindow('Update downloaded')

    const dialogOpts = {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Solid Backup Update',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail: 'A new version of Solid Backup has been downloaded. Restart the application to apply the updates. If you are in the middle of a backup, choose "Later".'
    }

    dialog.showMessageBox(dialogOpts, (response) => {
      if (response === 0) autoUpdater.quitAndInstall()
    })
  })

  // })

  app.on('browser-window-created', function () {
    let reopenMenuItem = findReopenMenuItem()
    if (reopenMenuItem) reopenMenuItem.enabled = false
  })

  app.on('window-all-closed', function () {
    let reopenMenuItem = findReopenMenuItem()
    if (reopenMenuItem) reopenMenuItem.enabled = true
  })

  //
  // PROCESS COMMAND LINE ARGUMENTS
  // E.g. You can run a backup from the Window Scheduler using the command: SolidBackup.exe /run
  //
  let commandLineArg = process.argv
  // win.webContents.on('dom-ready', function() { win.webContents.send('path-error', 'general', 'Command Line Arguments: '+commandLineArg+'; length: '+commandLineArg.length); } );

  for (var i = 1; i < commandLineArg.length; i++) {
    if (commandLineArg[i] === '/run') {
      console.log('commandLineArg[' + i + ']: ' + commandLineArg[i])
      win.showInactive()// show window but not in foreground (to avoid interrupting user)
      console.log('win.showInactive()')
      console.log('win id')

      // win.webContents.send('get-inputs-and-backup');
      win.webContents.on('did-finish-load', function () {
        // var start = openSettings();
        win.webContents.send('get-inputs-and-backup')
      })
    } else if (commandLineArg[i] === '/dev') {
      // show Developer Tools and resize window to accommodate
      console.log(commandLineArg[i], 'Show developer tools')
      win.setSize(win.getSize()[0] + 500, win.getSize()[1])
      win.maximize()
      win.toggleDevTools()
      devBuild = true
    } else if (commandLineArg[i] === '.') {
      // do nothing
    } else {
      console.log(commandLineArg[i], 'is not a known argument')
    }
  }
  if (!win.isVisible()) {
    win.show()// show window if not already opened in the background (via the /run command line parameter above)
    console.log('win.show()')
  }

  //
  // Check whether Solid Backup is running as an administrator (only needed if a user overrides the "run as administrator" setting on the exe file)
  //
  var exec = require('child_process').exec
  exec('NET SESSION', function (err, so, se) {
    if (err) {
      console.error('exec error: ' + err)
    }
    if (se.length === 0) {
      console.log('Solid Backup running as administrator')
    } else {
      console.log('Solid Backup not running as administrator')
      const options = {
        type: 'question',
        title: 'Solid Backup Needs to Run as Administrator',
        buttons: ['Run as Administrator', 'Cancel'],
        message: 'Solid Backup needs to run as administrator. Without administrator access, Solid Backup cannot make complete backups or schedule backups.\n\nPlease choose "run as administrator" (below), then choose "yes" a moment later when Windows asks for permission.'
      }
      win.webContents.on('dom-ready', function () {
        electron.dialog.showMessageBox(win, options, function (response) {
          if (response === 0) { // User clicked "Run as Administrator"
            console.log('Restart Solid Backup to run as administrator')

            var spawn = require('child_process').spawn
            var exeName = app.getPath('exe').substring(app.getPath('exe').lastIndexOf('\\') + 1, app.getPath('exe').length) // Solid Backup.exe if running released version. electron.exe if running dev version
            var pathToSolidBackupExe = app.getPath('exe')
            if (pathToSolidBackupExe.indexOf('electron.exe') > -1) {
              pathToSolidBackupExe = 'C:\\Users\\dbolton\\AppData\\Local\\Programs\\solidbackup\\SolidBackup.exe' // for testing purposes only
            }
            // launch daemon to kill Solid Backup and relauch with elevated privileges. (When running dev. version, kills electron.exe instead of SolidBackup.exe)
            // var daemon = spawn('taskkill /IM SolidBackup.exe || (taskkill /IM electron.exe && start ElevateSolidBackup.vbs) && start ElevateSolidBackup.vbs', [], {
            var daemon = spawn('taskkill /IM ' + exeName + ' && start Binaries\\ElevateSolidBackup.vbs ' + pathToSolidBackupExe, [], {
              shell: true,
              detached: true
            })
          }
        })
      })
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

app.on('will-quit', function () {
  globalShortcut.unregisterAll()
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

//
// IMPORT JS
//
var chkBackup = require('./main-process/chk-backup.js')

//
// SAVE SETTINGS
//
ipc.on('save-settings', saveSettings)
function saveSettings (msg, arg) {
  if (arg.pass) {
    arg.pass = chkBackup.checkAllPaths('save', arg)
  }
  if (!arg.pass) {
    dialog.showMessageBox({
      type: 'error',
      title: 'Save Settings Failed',
      message: 'Unable to save the settings. Please review the error messages on the page.',
      buttons: ['OK']
    })
    return
  }
  var fs = require('fs')
  var settingsFile = '\\solidbackup\\backup-settings.txt'
  if (devBuild) {
    settingsFile = '\\solidbackup\\backup-settings-dev.txt'
  }
  fs.writeFile(app.getPath('appData') + settingsFile, JSON.stringify(arg, null, 2), function (err) {
    if (err) {
      console.log('Error saving to backup-settings.txt:', err)
    } else {
      console.log('Backup settings saved to ' + app.getPath('appData') + settingsFile)
    }
  })

  // Save scheduled task
  // var pathToSolidBackupExe = path.resolve('SolidBackup.exe');//current directory is lost if started as a scheduled task
  var pathToSolidBackupExe = app.getPath('exe')
  if (pathToSolidBackupExe.indexOf('electron.exe') > -1) {
    pathToSolidBackupExe = 'C:\\Users\\dbolton\\AppData\\Local\\Programs\\solidbackup\\SolidBackup.exe' // for testing purposes only
  }
  console.log('pathToSolidBackupExe:', pathToSolidBackupExe)

  // schtasks /Create /SC DAILY /TN solidbackup /TR "'C:\Users\dbolton\Downloads\SolidBackup-win32-x64\SolidBackup.exe' /run" /ST 11:25 /RL HIGHEST /F
  var scheduleCommand = 'schtasks /Create /TN SolidBackup /TR "\'' + pathToSolidBackupExe + '\' /run" /RL HIGHEST /F'

  // Description for solidbackup task: Runs your scheduled backups. If this task is disable or removed, SolidBackup will be unable to run your scheduled backup.
  //
  // SCHEDULE TASK COMMAND
  // /RL HIGHEST gives administrative privileges
  // /F forcefully creates the task and suppresses warnings if the task already exists
  //

  if (arg['noSchedule']) {
    // scheduleCommand = 'schtasks /Delete /TN SolidBackup /F';
    // scheduleCommand = 'schtasks /Query /TN "SolidBackup" 2> nul && schtasks /Delete /TN "SolidBackup" /F >nul' //check if SolidBackup task exists. If it does, delete it.
    scheduleCommand = 'schtasks /Query /TN "SolidBackup" 2> nul && (schtasks /Delete /TN "SolidBackup" /F) || (exit /b 0)' // check if SolidBackup task exists. If it does, delete it. If it doesn't, reset error code to 0 to avoid error messages in the GUI
  } else if (arg['daily']) {
    scheduleCommand += ' /SC DAILY /ST ' + arg['startTime']
  } else if (arg['weekly']) {
    scheduleCommand += ' /SC WEEKLY /ST ' + arg['startTime'] + ' /D "'
    if (arg['monday']) scheduleCommand += ' MON'
    if (arg['tuesday']) scheduleCommand += ' TUE'
    if (arg['wednesday']) scheduleCommand += ' WED'
    if (arg['thursday']) scheduleCommand += ' THU'
    if (arg['friday']) scheduleCommand += ' FRI'
    if (arg['saturday']) scheduleCommand += ' SAT'
    if (arg['sunday']) scheduleCommand += ' SUN'
    scheduleCommand += '"'
  } else if (arg['monthly']) {
    scheduleCommand += ' /SC MONTHLY /ST ' + arg['startTime'] + ' /D "'
    scheduleCommand += arg['date']
    scheduleCommand += '"'
  }

  console.log('scheduleCommand:', scheduleCommand)
  var spawn = require('child_process').spawn

  var ls = spawn(scheduleCommand, [], { shell: true })

  ls.stdout.on('data', function (data) {
    console.log('stdout: ' + data)
  })

  ls.stderr.on('data', function (data) {
    console.log('stderr: ' + data)

    dialog.showMessageBox({
      type: 'error',
      title: 'Scheduled Task Failed',
      message: 'Unable to save the scheduled task. \n\n' + data,
      buttons: ['OK']
    })
  })

  ls.on('exit', function (code) {
    console.log('child process exited with code ' + code)

    if (code > 0) {
      // If scheduled task command exists with a non-success code
      dialog.showMessageBox({
        type: 'error',
        title: 'Scheduled Task Failed',
        message: 'Unable to save the scheduled task.',
        buttons: ['OK']
      })
    } else {

    }
  })
}

//
// OPEN SETTINGS
//
ipc.on('open-settings', openSettings)
function openSettings (msg, arg) {
  var fs = require('fs')
  var settingsFile = '\\solidbackup\\backup-settings.txt'
  if (devBuild) {
    settingsFile = '\\solidbackup\\backup-settings-dev.txt'
  }
  fs.readFile(app.getPath('appData') + settingsFile, 'utf8', function (err, data) {
    if ((err) && (arg !== 'first-run')) { // ignore error if this is the first run (i.e. the settings file hasn't been created yet)
      const options = {
        type: 'error',
        title: 'Error',
        buttons: ['OK'],
        message: 'Unable to open settings file.'
      }
      electron.dialog.showMessageBox(win, options, function () {})
      return console.log('Error opening backup-settings.txt:', err)
    }

    if (!err) {
      // upgrade from underscore_variable_naming_convention to cammelCase.
      data = data.replace('"destination_folder":', '"destinationFolder":').replace('"no_schedule":', '"noSchedule":').replace('"number_of_differential":', '"numberOfDifferential":').replace('"number_of_full_diff":', '"numberOfFullDiff":').replace('"number_of_full":', '"numberOfFull":').replace('"number_of_mirror":', '"numberOfMirror":').replace('"source_folder":', '"sourceFolder":').replace('"start_time":', '"startTime":')

      win.webContents.send('open-settings', JSON.parse(data))
    }
  })
}
