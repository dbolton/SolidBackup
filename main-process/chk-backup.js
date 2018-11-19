const path = require('path')
const ipc = require('electron').ipcMain
const { app, BrowserWindow } = require('electron')
const os = require('os')

const electron = require('electron')
const dialog = electron.dialog
var fs = require('fs')

// const error_checking = require('./error-checking.js');

/*
FILE DIALOGS
*/

// const dialog = require('electron').dialog

ipc.on('open-source-folder-dialog', function (event, path) {
  var verified_path = checkPathExists(path, 'source_folder')
  console.log('source_folder path:', verified_path)
  dialog.showOpenDialog({
    defaultPath: verified_path['path'],
    properties: ['openFile', 'openDirectory', 'showHiddenFiles']
  }, function (files) {
    if (files) event.sender.send('selected-source-folder', files)
  })
})

ipc.on('open-destination-folder-dialog', function (event, path) {
  var verified_path = checkPathExists(path, 'destination_folder')
  dialog.showOpenDialog({
    defaultPath: verified_path['path'],
    properties: ['openFile', 'openDirectory', 'showHiddenFiles']
  }, function (files) {
    if (files) event.sender.send('selected-destination-folder', files)
  })
})

ipc.on('open-exclude-folder-dialog', function (event, path) {
  var verified_path = checkPathExists(path, 'source_folder')
  dialog.showOpenDialog({
    defaultPath: verified_path['path'],
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
  if (arg['pass'] == false) { // set pass as false if validation already failed on client side
    pass = false
  }
  if (arg['source_folder'] == '') { // set pass as false if path is blank
    win.webContents.send('path-error', 'source_folder', 'Error: Please select a folder.')
    pass = false
  }
  if (arg['destination_folder'] == '') { // set pass as false if path is blank
    console.log("arg['destination_folder']", arg['destination_folder'])
    win.webContents.send('path-error', 'destination_folder', 'Error: Please select a folder.')
    pass = false
  }

  if (pass) {
    var source_folder = path.resolve(arg['source_folder'])
    var destination_folder = path.resolve(arg['destination_folder'])

    var e_source_folder = checkPathExists(source_folder, 'source_folder')
    var e_destination_folder = checkPathExists(destination_folder, 'destination_folder')

    if ((e_source_folder['pass'] == false) || (e_destination_folder['pass'] == false)) { // if folders do not exist
      pass = false
    } else if (source_folder.substring(0, 1) == destination_folder.substring(0, 1)) { // if drive letters are the same
      win.webContents.send('path-error', 'destination_folder', 'Warning: The destination folder should be on a different drive than the source folder. Backing up to the same drive does not protect your data if that drive fails.')

      if (source_folder == destination_folder) { // if source and destination are the same folder
        win.webContents.send('path-error', 'destination_folder', 'Error: The destination folder cannot be the same as the source folder above.')
        pass = false
      } else if (!path.relative(source_folder, destination_folder).startsWith('..')) { // if the destination folder is a sub directory of the source folder
        win.webContents.send('path-error', 'destination_folder', 'Error: The destination folder cannot be a sub folder of the source.')
        pass = false
      }
    }

    console.log('[Valid paths] pass: ', pass)
  }
  return pass
}

function checkPathExists (path, which_folder) {
  try {
    fs.statSync(path)
    return { 'path': path, 'pass': true }
  } catch (e) {
    try {
      if (true === true) { // remote.send({action:'prompt', message:'The following folder does not exist. Would you like to create the folder? \n\n' + folder})) {
        // fs.mkdirSync(path);
        const bWindow = require('electron').BrowserWindow
        var win = bWindow.getFocusedWindow()
        win.webContents.send('path-error', which_folder, 'Error: The folder does not exist.')
        return { 'path': path, 'pass': false, 'error': e }
      } else {
        return { 'path': path, 'pass': false, 'error': e }
      }
    } catch (e) {
      return { 'path': path, 'pass': false, 'error': e }
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
  if (month.toString().length == 1) {
    var month = '0' + month
  }
  if (day.toString().length == 1) {
    var day = '0' + day
  }
  if (hour.toString().length == 1) {
    var hour = '0' + hour
  }
  if (minute.toString().length == 1) {
    var minute = '0' + minute
  }
  if (second.toString().length == 1) {
    var second = '0' + second
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

  var source_folder = path.resolve(arg['source_folder'])
  var destination_folder = path.resolve(arg['destination_folder'])

  if (exports.checkAllPaths(msg, arg) == false) {
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

  var destination_sub_folder = generateDestinationSubFolder(arg, source_folder, destination_folder)

  // var path_to_shadowspawn = path.resolve("Binaries\\ShadowSpawn-0.2.2-x86\\ShadowSpawn.exe"); current directory lost when run as scheduled task
  var path_to_shadowspawn = app.getAppPath().split('\\resources\\app.asar').join('') + '\\Binaries\\ShadowSpawn-0.2.2-x86\\ShadowSpawn.exe' // 32-bit version
  if (os.arch = 'x64') {
    // path_to_shadowspawn = path.resolve("Binaries\\ShadowSpawn-0.2.2-x64\\ShadowSpawn.exe"); current directory lost when run as scheduled task
    path_to_shadowspawn = app.getAppPath().split('\\resources\\app.asar').join('') + '\\Binaries\\ShadowSpawn-0.2.2-x64\\ShadowSpawn.exe' // 64-bit version
  }
  console.log('path_to_shadowspawn', path_to_shadowspawn)

  promiseGetAvailableDriveLetter.then(function (shadow_drive_letter) {
    console.log('then')

    // Get backup type (e.g. full, mirror, etc.)
    var backup_type = ' ' // blank assumes full backup type
    if (arg.type = 'mirror') {
      backup_type = '/MIR ' // Mirror a directory tree (Mirror also deletes files in the backup to match the source)
    }

    // Get exclusions
    var file_exclusions = '/XF desktop.ini ' // exclude the file desktop.ini since it hides the true name of the My Documents folder for example.
    var folder_exclusions = ''
    if (arg.excludes) {
      folder_exclusions += '/XD ' // exclude directories
      for (var i = 0; i < arg.excludes.length; i++) {
        if (arg.excludes[i].className == 'file') {
          file_exclusions += '"' + arg.excludes[i].value.replace(source_folder, shadow_drive_letter + ':') + '" '
        } else if (arg.excludes[i].className == 'folder') {
          folder_exclusions += '"' + arg.excludes[i].value.replace(source_folder, shadow_drive_letter + ':') + '" '
        }
      }
    }
    console.log('folder_exclusions: ' + folder_exclusions)

    var backup_command = path_to_shadowspawn + ' "' + source_folder + '" ' + shadow_drive_letter + ': robocopy ' + shadow_drive_letter + ':\ "' + destination_folder + destination_sub_folder + '" /UNILOG:%appdata%\\SolidBackup\\log.txt ' + backup_type + '/E /COPY:DAT /FFT /Z ' + file_exclusions + folder_exclusions + '/XJ /R:1 /W:3 /NP /ETA'
    // var backup_command = path_to_shadowspawn + ' "' + source_folder + '" ' + shadow_drive_letter + ': robocopy ' + shadow_drive_letter + ':\ "' + destination_folder + destination_sub_folder + '" ' + backup_type + '/E /COPY:DAT /FFT /Z ' + file_exclusions + folder_exclusions + '/XJ /R:5 /W:10 /NP /ETA /UNICODE /UNILOG:%appdata%\\SolidBackup\\log.txt'; //works if decoded as UTF-16
    // var backup_command = 'robocopy "' + source_folder + '" "' + destination_folder + destination_sub_folder + '" /E /COPY:DAT /FFT /Z /XF desktop.ini /XJ /R:5 /W:10 /NP /ETA /LOG:"%appdata%\\SolidBackup\\log.txt"'; //skips shadow spawn (speeds things up for testing)
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
	/XF desktop.ini Stops folders from being renamed. E.g. The date on the end of the "destination_sub_folder" gets dropped to match the original. For more details, see: https://superuser.com/questions/567331/robocopy-mir-changes-destination-folder-name-how-to-prevent-that#744582
	/XD excludes any directores the user specifies
	/XJ eXclude Junctions (These can cause endless loops of nested folders on the backup destination. For explanation, see: https://www.sevenforums.com/general-discussion/60292-robocopy-mass-nesting-bug.html )
	/R:1 number of Retries on failed copies: default 1 million
	/W:3 Wait time between retries: default is 30 seconds
	/NP No Progress - don't display percentage copied (it creates very long log files)
	/ETA Show Estimated Time of Arrival of copied files
	*/

    var spawn = require('child_process').spawn

    // ls_backup = spawn('cmd.exe', ['/c', backup_command, source_folder, destination_folder, "/E /COPYALL /FFT /Z /XJ /ETA"]);
    // ls_backup = spawn('cmd.exe', ['/c', backup_command, source_folder, destination_folder, ["/E","/COPYALL","/FFT","/Z","/XJ","/ETA"]]);

    var ls_backup = spawn(backup_command, [], { shell: true })

    fs.writeFile(app.getPath('appData') + '\\solidbackup\\log.txt', '', function (err) {
      if (err) {
        console.log('Error writing to log.txt', err)
      } else {
        console.log('Log.txt can be saved to')
        updateBackupLog()
      }
    })

    ls_backup.stdout.on('data', function (data) {
      // console.log('stdout: ' + data);
      console.log('' + data)
    })

    ls_backup.stderr.on('data', function (data) {
      console.log('stderr: ' + data)

      dialog.showMessageBox({
        type: 'error',
        title: 'Backup Failed',
        message: 'Backup failed. Error: ' + data + '\n\n' + backup_command,
        buttons: ['OK']
      })
    })

    ls_backup.on('exit', function (code) {
      console.log('child process exited with code ' + code)

      if ((code == 1) || (code == 2)) {
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
        fs.readdir(destination_folder, function (err, files) {
          if (err) {
            throw err
          }
          cleanUpOldBackups(files, arg, source_folder, destination_folder)
        })

        win.webContents.send('reset-progress', 'Backup complete!')
        updateBackupLog(true)
        win.webContents.send('notification', 'Backup complete.')
      }
    })

    return true
  })
}

var reload_log
function updateBackupLog (reset) {
  const bWindow = require('electron').BrowserWindow
  var win = bWindow.getAllWindows()[0]

  if (reset) {
    clearInterval(reload_log)
    setTimeout(function () { // update one last time after clearing the timer.
      fs.readFile(app.getPath('appData') + '\\solidbackup\\log.txt', function (err, data) {
        if (err) {
          console.log('Error reading log.txt', err)
        } else {
          win.webContents.send('update-backup-log-display', data, 'last_time')
        }
      })
    }, 4000)
  } else {
    reload_log = setInterval(function () {
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
  var used_letters = ''
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
    used_letters = stdout.split(/\s*\n/)
    for (var i = 0; i < letters.length; i++) {
      if (used_letters.indexOf(letters[i] + ':') > -1) {
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

function generateDestinationSubFolder (arg, source_folder, destination_folder) {
  // either renames an old sub folder or creates a new sub folder
  var now = new Date()
  var destination_sub_folder = source_folder.substring(source_folder.lastIndexOf('\\'), source_folder.length) + ' ' + getDateTime(now) + ' (' + arg['type'] + ')'
  var files = fs.readdirSync(destination_folder)

  /// ///fs.mkdirSync(destination_folder + destination_sub_folder);

  if (arg.type == 'mirror') {
    var name_of_source_folder = source_folder.substring(source_folder.lastIndexOf('\\') + 1, source_folder.length).replace(/([\^\$\+\.\,\=\(\)\[\]\{\}])/g, '\\$1') // Gets folder name and escapes RegExp special characters
    var backups_re = new RegExp(name_of_source_folder + ' \\d\\d\\d\\d-\\d\\d-\\d\\d \\d\\d\.\\d\\d\.\\d\\d \\(' + arg['type'] + '\\)')

    exec = require('child_process').exec

    if (arg.type == 'mirror') {
      var matching_backups = []
      for (var i = 0; i < files.length; i++) {
        if (backups_re.test(files[i])) {
          matching_backups.push(files[i])
        }
      }

      if (matching_backups.length >= arg.number_of_mirror) {
        var oldest_backup = matching_backups[0]

        fs.renameSync(destination_folder + '\\' + oldest_backup, destination_folder + destination_sub_folder)
        /* number_of_backups_to_delete = matching_backups.length - arg['number_of_full'];
				for (var i = 0; i < number_of_backups_to_delete; i++) {
					console.log('delete old backup: ', matching_backups[i]);
					exec('rmdir /s /q "' + destination_folder + '\\' + matching_backups[i] + '"', function (err) {
						if (err) { console.log('Error removing old backup:', err); }
					});
				} */
      } else {
        fs.mkdirSync(destination_folder + destination_sub_folder)
      }
    }
  } else { // full backup
    fs.mkdirSync(destination_folder + destination_sub_folder)
  }

  return destination_sub_folder
}

function cleanUpOldBackups (files, arg, source_folder, destination_folder) {
  var name_of_source_folder = source_folder.substring(source_folder.lastIndexOf('\\') + 1, source_folder.length).replace(/([\^\$\+\.\,\=\(\)\[\]\{\}])/g, '\\$1') // Gets folder name and escapes RegExp special characters
  var backups_re = new RegExp(name_of_source_folder + ' \\d\\d\\d\\d-\\d\\d-\\d\\d \\d\\d\.\\d\\d\.\\d\\d \\(' + arg.type + '\\)')

  exec = require('child_process').exec

  if ((arg['type'] == 'full') || (arg.type == 'mirror')) {
    var matching_backups = []
    for (var i = 0; i < files.length; i++) {
      if (backups_re.test(files[i])) {
        matching_backups.push(files[i])
      }
    }

    var number_of_backups_to_delete = 0
    if (arg.type == 'full') {
      number_of_backups_to_delete = matching_backups.length - arg['number_of_full']
    } else if (arg.type == 'mirror') {
      number_of_backups_to_delete = matching_backups.length - arg['number_of_mirror']
    }

    for (var i = 0; i < number_of_backups_to_delete; i++) {
      console.log('delete old backup: ', matching_backups[i])
      exec('rmdir /s /q "' + destination_folder + '\\' + matching_backups[i] + '"', function (err) {
        if (err) { console.log('Error removing old backup:', err) }
      })
    }
  }
}
