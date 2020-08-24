const path = require('path')
const ipc = require('electron').ipcMain
const { app, BrowserWindow } = require('electron')
const os = require('os')

const electron = require('electron')
const dialog = electron.dialog
var fs = require('fs')

// const errorChecking = require('./error-checking.js');

/*
FILE DIALOGS
*/

// const dialog = require('electron').dialog

ipc.on('open-source-folder-dialog', function (event, path) {
  var verifiedPath = checkPathExists(path, 'sourceFolder')
  console.log('sourceFolder path:', verifiedPath)
  dialog.showOpenDialog({
    defaultPath: verifiedPath.path,
    properties: ['openFile', 'openDirectory', 'showHiddenFiles']
  }, function (files) {
    if (files) event.sender.send('selected-source-folder', files)
  })
})

ipc.on('open-destination-folder-dialog', function (event, path) {
  var verifiedPath = checkPathExists(path, 'destinationFolder')
  dialog.showOpenDialog({
    defaultPath: verifiedPath.path,
    properties: ['openFile', 'openDirectory', 'showHiddenFiles']
  }, function (files) {
    if (files) event.sender.send('selected-destination-folder', files)
  })
})

ipc.on('open-exclude-folder-dialog', function (event, path) {
  var verifiedPath = checkPathExists(path, 'sourceFolder')
  dialog.showOpenDialog({
    defaultPath: verifiedPath.path,
    properties: ['openFile', 'openDirectory', 'showHiddenFiles']
  }, function (files) {
    console.log('files', files)
    if (files) event.sender.send('selected-exclude-folder', files, 'folder')
  })
})

/*
CHECK PATHS
*/
ipc.on('check', checkAllPathsFunction)
function checkAllPathsFunction (evnt, arg) {
  exports.checkAllPaths(evnt, arg)
}
exports.checkAllPaths = function (evnt, arg) {
  const bWindow = require('electron').BrowserWindow
  var win = bWindow.getFocusedWindow()

  var pass = true
  if (arg.pass === false) { // set pass as false if validation already failed on client side
    pass = false
  }
  if (arg.sourceFolder === '') { // set pass as false if path is blank
    win.webContents.send('path-error', 'sourceFolder', 'Error: Please select a folder.')
    pass = false
  }
  if (arg.destinationFolder === '') { // set pass as false if path is blank
    console.log('arg.destinationFolder', arg.destinationFolder)
    win.webContents.send('path-error', 'destinationFolder', 'Error: Please select a folder.')
    pass = false
  }

  if (pass) {
    var sourceFolder = path.resolve(arg.sourceFolder)
    var destinationFolder = path.resolve(arg.destinationFolder)

    var eSourceFolder = checkPathExists(sourceFolder, 'sourceFolder')
    var eDestinationFolder = checkPathExists(destinationFolder, 'destinationFolder')

    if ((eSourceFolder.pass === false) || (eDestinationFolder.pass === false)) { // if folders do not exist
      pass = false
    } else if (sourceFolder.substring(0, 1) === destinationFolder.substring(0, 1)) { // if drive letters are the same
      win.webContents.send('path-error', 'destinationFolder', 'Warning: The destination folder should be on a different drive than the source folder. Backing up to the same drive does not protect your data if that drive fails.')

      if (sourceFolder === destinationFolder) { // if source and destination are the same folder
        win.webContents.send('path-error', 'destinationFolder', 'Error: The destination folder cannot be the same as the source folder above.')
        pass = false
      } else if (!path.relative(sourceFolder, destinationFolder).startsWith('..')) { // if the destination folder is a sub directory of the source folder
        win.webContents.send('path-error', 'destinationFolder', 'Error: The destination folder cannot be a sub folder of the source.')
        pass = false
      }
    }

    console.log('[Valid paths] pass: ', pass)
  }
  return pass
}

function checkPathExists (path, whichFolder) {
  try {
    fs.statSync(path)
    return { path: path, pass: true }
  } catch (e) {
    try {
      const bWindow = require('electron').BrowserWindow
      var win = bWindow.getFocusedWindow()
      win.webContents.send('path-error', whichFolder, 'Error: The folder does not exist.')
      return { path: path, pass: false, error: e }
    } catch (e) {
      return { path: path, pass: false, error: e }
    }
  }
}

/*
RUN BACKUP
*/
function getDateTime (now) {
  var year = now.getFullYear()
  var month = now.getMonth() + 1
  var day = now.getDate()
  var hour = now.getHours()
  var minute = now.getMinutes()
  var second = now.getSeconds()
  if (month.toString().length === 1) {
    month = '0' + month
  }
  if (day.toString().length === 1) {
    day = '0' + day
  }
  if (hour.toString().length === 1) {
    hour = '0' + hour
  }
  if (minute.toString().length === 1) {
    minute = '0' + minute
  }
  if (second.toString().length === 1) {
    second = '0' + second
  }
  var dateTime = year + '-' + month + '-' + day + ' ' + hour + '.' + minute + '.' + second
  return dateTime
}

ipc.on('run-backup', runBackup)
function runBackup (msg, arg) {
  msg.preventDefault()

  const bWindow = require('electron').BrowserWindow
  // console.log(BrowserWindow.getAllWindows()[0])
  // var win = bWindow.fromId(0);
  var win = bWindow.getAllWindows()[0]

  var sourceFolder = path.resolve(arg.sourceFolder)
  var destinationFolder = path.resolve(arg.destinationFolder)

  if (exports.checkAllPaths(msg, arg) === false) {
    dialog.showMessageBox({
      type: 'error',
      title: 'Backup Failed',
      message: 'Backup failed. Please check the folder locations for errors.',
      buttons: ['OK']
    })
    console.log('checkAllPaths: false')

    win.webContents.send('reset-progress', 'Backup failed.')

    return false
  }

  win.webContents.send('save-settings') // if settings pass all sanity checks, go ahead and save them.
  win.webContents.send('notification', 'Backup started.')

  var destinationSubFolder = generateDestinationSubFolder(arg, sourceFolder, destinationFolder)

  // var pathToShadowSpawn = path.resolve("Binaries\\ShadowSpawn-0.2.2-x86\\ShadowSpawn.exe"); current directory lost when run as scheduled task
  var pathToShadowSpawn = app.getAppPath().split('\\resources\\app.asar').join('') + '\\Binaries\\ShadowSpawn-0.2.2-x86\\ShadowSpawn.exe' // 32-bit version
  if (String(os.arch) === 'x64') {
    // pathToShadowSpawn = path.resolve("Binaries\\ShadowSpawn-0.2.2-x64\\ShadowSpawn.exe"); current directory lost when run as scheduled task
    pathToShadowSpawn = app.getAppPath().split('\\resources\\app.asar').join('') + '\\Binaries\\ShadowSpawn-0.2.2-x64\\ShadowSpawn.exe' // 64-bit version
  }
  console.log('pathToShadowSpawn', pathToShadowSpawn)

  promiseGetAvailableDriveLetter.then(function (shadowDriveLetter) {
    console.log('then')

    // Get backup type (e.g. full, mirror, etc.)
    var backupType = ' ' // blank assumes full backup type
    if (arg.type === 'mirror') {
      backupType = '/MIR ' // Mirror a directory tree (Mirror also deletes files in the backup to match the source)
    }

    // Get exclusions
    var fileExclusions = '/XF desktop.ini ' // exclude the file desktop.ini since it hides the true name of the My Documents folder for example.
    var folderExclusions = ''
    if (arg.excludes) {
      folderExclusions += '/XD ' // exclude directories
      for (var i = 0; i < arg.excludes.length; i++) {
        if (arg.excludes[i].className === 'file') {
          fileExclusions += '"' + arg.excludes[i].value.replace(sourceFolder, shadowDriveLetter + ':') + '" '
        } else if (arg.excludes[i].className === 'folder') {
          folderExclusions += '"' + arg.excludes[i].value.replace(sourceFolder, shadowDriveLetter + ':') + '" '
        }
      }
    }
    console.log('folderExclusions: ' + folderExclusions)

    var backupCommand = '"' + pathToShadowSpawn + '" "' + sourceFolder + '" ' + shadowDriveLetter + ': robocopy ' + shadowDriveLetter + ': "' + destinationFolder + destinationSubFolder + '" /UNILOG:%appdata%\\SolidBackup\\log.txt ' + backupType + '/E /COPY:DAT /FFT /Z ' + fileExclusions + folderExclusions + '/XJ /R:1 /W:3 /NP /ETA'

    console.log('backupCommand: ' + backupCommand)
    // var backupCommand = pathToShadowSpawn + ' "' + sourceFolder + '" ' + shadowDriveLetter + ': robocopy ' + shadowDriveLetter + ':\ "' + destinationFolder + destinationSubFolder + '" ' + backupType + '/E /COPY:DAT /FFT /Z ' + fileExclusions + folderExclusions + '/XJ /R:5 /W:10 /NP /ETA /UNICODE /UNILOG:%appdata%\\SolidBackup\\log.txt'; //works if decoded as UTF-16
    // var backupCommand = 'robocopy "' + sourceFolder + '" "' + destinationFolder + destinationSubFolder + '" /E /COPY:DAT /FFT /Z /XF desktop.ini /XJ /R:5 /W:10 /NP /ETA /LOG:"%appdata%\\SolidBackup\\log.txt"'; //skips shadow spawn (speeds things up for testing)
    /*
  BACKUP COMMAND

  ShadowSpawn creates a Volume Shadow Copy on Windows that lets you copy files even if they are open/locked. For details see https://github.com/candera/shadowspawn

  RoboCopy is a Windows command for copying files. I used the following options with RoboCopy. For details see https://ss64.com/nt/robocopy.html

  /E Copy Subfolders, including Empty Subfolders
  /COPY:DAT copy all but S=Security, O=Owner info, and U=aUditing info (since users may not have elevated priviledges on a network drive (in a corporate environment).
  /FFT Assume FAT File Times (2-second date/time granularity): can help with backing up to a Linux network drive where the clock would otherwise cause problems when determining what files have updated
  /Z Copy files in restartable mode (survive network glitch)
  /ZB Use restartable mode; if access denied use Backup mode ***what is backup mode?
  /UNILOG:log_file Output status to Unicode Log file (Recommended for performance)
  /XF desktop.ini Stops folders from being renamed. E.g. The date on the end of the "destinationSubFolder" gets dropped to match the original. For more details, see: https://superuser.com/questions/567331/robocopy-mir-changes-destination-folder-name-how-to-prevent-that#744582
  /XD excludes any directores the user specifies
  /XJ eXclude Junctions (These can cause endless loops of nested folders on the backup destination. For explanation, see: https://www.sevenforums.com/general-discussion/60292-robocopy-mass-nesting-bug.html )
  /R:1 number of Retries on failed copies: default 1 million
  /W:3 Wait time between retries: default is 30 seconds
  /NP No Progress - don't display percentage copied (it creates very long log files)
  /ETA Show Estimated Time of Arrival of copied files
  */

    var spawn = require('child_process').spawn

    // lsBackup = spawn('cmd.exe', ['/c', backupCommand, sourceFolder, destinationFolder, "/E /COPYALL /FFT /Z /XJ /ETA"]);
    // lsBackup = spawn('cmd.exe', ['/c', backupCommand, sourceFolder, destinationFolder, ["/E","/COPYALL","/FFT","/Z","/XJ","/ETA"]]);

    var lsBackup = spawn(backupCommand, [], { shell: true })

    fs.writeFile(app.getPath('appData') + '\\solidbackup\\log.txt', '', function (err) {
      if (err) {
        console.log('Error writing to log.txt', err)
      } else {
        console.log('Log.txt can be saved to')
        updateBackupLog()
      }
    })

    lsBackup.stdout.on('data', function (data) {
      // console.log('stdout: ' + data);
      console.log('' + data)
    })

    lsBackup.stderr.on('data', function (data) {
      console.log('stderr: ' + data)

      dialog.showMessageBox({
        type: 'error',
        title: 'Backup Failed',
        message: 'Backup failed. Error: ' + data + '\n\n' + backupCommand,
        buttons: ['OK']
      })
    })

    lsBackup.on('exit', function (code) {
      console.log('child process exited with code ' + code)

      if ((code === 1) || (code === 2)) {
        // If there is an error while processing (e.g. ShadowSpawn fails to
        // create the shadow copy), ShadowSpawn exits with status 1.

        // If there is an error in usage (i.e. the user specifies an unknown
        // option), ShadowSpawn exits with status 2.

        win.webContents.send('reset-progress', 'Backup failed.')
        win.webContents.send('notification', 'Backup failed.')
        dialog.showMessageBox({
          type: 'error',
          title: 'Backup Failed',
          message: 'Backup failed (Exit code ' + code + ')',
          buttons: ['OK']
        })
      } else {
        // ShadowSpawn finishes successfully
        fs.readdir(destinationFolder, function (err, files) {
          if (err) {
            throw err
          }
          cleanUpOldBackups(files, arg, sourceFolder, destinationFolder)
        })

        win.webContents.send('reset-progress', 'Backup complete!')
        updateBackupLog(true)
        win.webContents.send('notification', 'Backup complete.')
      }
    })

    return true
  })
}

var reloadLog
function updateBackupLog (reset) {
  const bWindow = require('electron').BrowserWindow
  var win = bWindow.getAllWindows()[0]

  if (reset) {
    clearInterval(reloadLog)
    setTimeout(function () { // update one last time after clearing the timer.
      fs.readFile(app.getPath('appData') + '\\solidbackup\\log.txt', function (err, data) {
        if (err) {
          console.log('Error reading log.txt', err)
        } else {
          win.webContents.send('update-backup-log-display', data, 'lastTime')
        }
      })
    }, 4000)
  } else {
    reloadLog = setInterval(function () {
      fs.readFile(app.getPath('appData') + '\\solidbackup\\log.txt', function (err, data) {
        if (err) {
          console.log('Error reading log.txt', err)
        } else {
          win.webContents.send('update-backup-log-display', data)
        }
      })
    }, 2000)
  }
}

var promiseGetAvailableDriveLetter = new Promise(function (resolve, reject) {
  var letters = ['Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'A', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']
  var usedLetters = ''
  var letter = ''

  var exec = require('child_process').exec
  var cmd = 'wmic logicaldisk get deviceid'
  exec(cmd, function (err, stdout, stderr) {
    if (err) {
      console.log('error running wmic logicaldisk list command')
      console.log(err)
      return
    }
    // console.log(stdout)
    usedLetters = stdout.split(/\s*\n/)
    for (var i = 0; i < letters.length; i++) {
      if (usedLetters.indexOf(letters[i] + ':') > -1) {
        console.log('Drive letter', letters[i], 'is taken')
      } else {
        letter = letters[i]
        break
      }
    }

    if (stderr) {
      console.log('stderr data')
      console.log(stderr)
      reject(stderr)
    } else {
      console.log('Drive letter ' + letter + ' is available')
      resolve(letter)
    }
  })

  /*
  for (var i = 0; i < letters.length; i++) {
    try {
      // fs.readdir(letters[i] + ':\\', function (err) {
        // if (err) {
          // throw err;
        // }
      // });
      fs.statSync(letters[i] + ':\\');
      console.log('Drive letter' + letters[i] + ' is taken');
    } catch(e) {
      letter = letters[i];
      break;
    }
  } */
})

function generateDestinationSubFolder (arg, sourceFolder, destinationFolder) {
  // either renames an old sub folder or creates a new sub folder
  var now = new Date()
  var destinationSubFolder = sourceFolder.substring(sourceFolder.lastIndexOf('\\'), sourceFolder.length) + ' ' + getDateTime(now) + ' (' + arg.type + ')'
  var files = fs.readdirSync(destinationFolder)

  /// ///fs.mkdirSync(destinationFolder + destinationSubFolder);

  if (arg.type === 'mirror') {
    var nameOfSourceFolder = sourceFolder.substring(sourceFolder.lastIndexOf('\\') + 1, sourceFolder.length).replace(/([\^$+.,=()[\]{}])/g, '\\$1') // Gets folder name and escapes RegExp special characters
    var backupsRe = new RegExp(nameOfSourceFolder + ' \\d\\d\\d\\d-\\d\\d-\\d\\d \\d\\d\.\\d\\d\.\\d\\d \\(' + arg.type + '\\)')

    exec = require('child_process').exec

    var matchingBackups = []
    for (var i = 0; i < files.length; i++) {
      if (backupsRe.test(files[i])) {
        matchingBackups.push(files[i])
      }
    }
    console.log('matchingBackups:' + matchingBackups + ' arg.numberOfMirror:' + arg.numberOfMirror)
    if (matchingBackups.length >= arg.numberOfMirror) {
      var oldestBackup = matchingBackups[0]

      fs.renameSync(destinationFolder + '\\' + oldestBackup, destinationFolder + destinationSubFolder)
      /* numberOfBackupsToDelete = matchingBackups.length - arg['numberOfFull'];
      for (var i = 0; i < numberOfBackupsToDelete; i++) {
        console.log('delete old backup: ', matchingBackups[i]);
        exec('rmdir /s /q "' + destinationFolder + '\\' + matchingBackups[i] + '"', function (err) {
          if (err) { console.log('Error removing old backup:', err); }
        });
      } */
    } else {
      fs.mkdirSync(destinationFolder + destinationSubFolder)
    }
  } else { // full backup
    fs.mkdirSync(destinationFolder + destinationSubFolder)
  }

  return destinationSubFolder
}

function cleanUpOldBackups (files, arg, sourceFolder, destinationFolder) {
  var nameOfSourceFolder = sourceFolder.substring(sourceFolder.lastIndexOf('\\') + 1, sourceFolder.length).replace(/([\^$+.,=()[\]{}])/g, '\\$1') // Gets folder name and escapes RegExp special characters
  var backupsRe = new RegExp(nameOfSourceFolder + ' \\d\\d\\d\\d-\\d\\d-\\d\\d \\d\\d\.\\d\\d\.\\d\\d \\(' + arg.type + '\\)')

  exec = require('child_process').exec

  if ((arg.type === 'full') || (arg.type === 'mirror')) {
    var matchingBackups = []
    for (var i = 0; i < files.length; i++) {
      if (backupsRe.test(files[i])) {
        matchingBackups.push(files[i])
      }
    }

    var numberOfBackupsToDelete = 0
    if (arg.type === 'full') {
      numberOfBackupsToDelete = matchingBackups.length - arg.numberOfFull
    } else if (arg.type === 'mirror') {
      numberOfBackupsToDelete = matchingBackups.length - arg.numberOfMirror
    }

    for (let i = 0; i < numberOfBackupsToDelete; i++) {
      console.log('delete old backup: ', matchingBackups[i])
      exec('rmdir /s /q "' + destinationFolder + '\\' + matchingBackups[i] + '"', function (err) {
        if (err) { console.log('Error removing old backup:', err) }
      })
    }
  }
}
