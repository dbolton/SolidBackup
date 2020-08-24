
const ipc = require('electron').ipcRenderer
const shell = require('electron').shell
const { app } = require('electron').remote

const os = require('os')

/*
EVENT BINDING
*/

// Browse for source folder
const sourceButton = document.getElementById('sourceFolderBrowse')

sourceButton.addEventListener('click', function (event) {
  ipc.send('open-source-folder-dialog', document.getElementById('sourceFolder').value)
})

ipc.on('selected-source-folder', function (event, path) {
  document.getElementById('sourceFolder').value = `${path}`
  document.getElementById('sourceFolder').dispatchEvent(new Event('change'))
  check()
})

// Browse for destination folder
const destinationButton = document.getElementById('destinationFolderBrowse')

destinationButton.addEventListener('click', function (event) {
  ipc.send('open-destination-folder-dialog', document.getElementById('destinationFolder').value)
})

ipc.on('selected-destination-folder', function (event, path) {
  document.getElementById('destinationFolder').value = `${path}`
  document.getElementById('destinationFolder').dispatchEvent(new Event('change'))
  check()
})

// Browse for excluded folder
const exclusionButton = document.getElementById('excludeFolderAdd')

exclusionButton.addEventListener('click', function (event) {
  ipc.send('open-exclude-folder-dialog', document.getElementById('sourceFolder').value)
})

ipc.on('selected-exclude-folder', addExclusion)
function addExclusion (event, path, folderOrFile) {
  var i = 0
  while (document.getElementById('exclude' + i)) { i++ } // find how many exclusions already exist

  var div = document.createElement('div')
  div.id = 'exclusionDiv' + i
  div.className = folderOrFile
  div.innerHTML = '<input type="text" id="exclude' + i + '" class="' + folderOrFile + '" size="50" value="">\n<button id="exclude' + i + 'Delete" type="button" class="delete" title="Delete">x</button><div id="exclude' + i + 'Message"></div>'
  document.getElementById('exclusions').appendChild(div)
  document.getElementById('exclude' + i).value = `${path}`
  document.getElementById('exclude' + i + 'Delete').addEventListener('click', deleteExclusion)

  if (event) { // enable save if called by an event (do not enable save if this is just the initial loading of a settings file)
    summarizeAndEnableSave()
    monitorExclusions()
    check()
  }
}

function deleteExclusion () {
  var elem = this.parentNode // DIV container which contains text input, delete button, and error message area
  var id = elem.id
  elem.parentNode.removeChild(elem)

  // renumber id's after deleted item
  for (var i = Number(id.match(/\d+/)[0]) + 1; document.getElementById('exclude' + i); i++) {
    // Get details from old div and delete
    var path = document.getElementById('exclude' + i).value
    var divContainer = document.getElementById('exclusionDiv' + i)
    var folderOrFile = divContainer.className
    divContainer.parentNode.removeChild(divContainer)

    // Create new div with renumbered id
    addExclusion('', path, folderOrFile)
  }
  monitorExclusions()
  summarizeAndEnableSave()
}

// Add Event listeners to progress section buttons
document.getElementById('editSettings').addEventListener('click', function () {
  document.getElementById('settingsSection').className = 'active'
  // location.href='#editSettings';
  document.body.scrollTop = document.documentElement.scrollTop = 0
})

const fileManagerBtn = document.getElementById('openBackup')
fileManagerBtn.addEventListener('click', function (event) {
  var pass = shell.openPath(document.getElementById('destinationFolder').value)
  if (!pass) {
    window.alert('Error: Unable to open the destination folder')
  }
})

document.getElementById('stopBackup').addEventListener('click', function () {
  ipc.send('kill-backup')
  console.log('kill-backup sent')
})

// Hide unneeded sections
// Schedule section
var scheduleSection = document.getElementsByClassName('collapsible')[0]
scheduleSection.getElementsByTagName('h3')[0].addEventListener('click', function () {
  scheduleSection.getElementsByTagName('h3')[0].classList.toggle('expanded')
  scheduleSection.getElementsByTagName('div')[1].classList.toggle('expanded')
})

// Advanced section
var advancedSection = document.getElementsByClassName('collapsible')[1]
advancedSection.getElementsByTagName('h3')[0].addEventListener('click', function () {
  advancedSection.getElementsByTagName('h3')[0].classList.toggle('expanded')
  advancedSection.getElementsByTagName('div')[1].classList.toggle('expanded')
})

var reloadLog

// Call save settings
document.getElementById('save').addEventListener('click', function (event) {
  check()
  ipc.send('save-settings', getAllUserInputs())
  document.getElementById('save').disabled = true
})
ipc.on('save-settings', function () {
  check()
  ipc.send('save-settings', getAllUserInputs())
  document.getElementById('save').disabled = true
})

// React if input elements change
function summarizeAndEnableSave () {
  document.getElementById('save').disabled = false // activate the save button
  summarize()
}
var inputs = document.getElementsByTagName('input')
for (var i = 0; i < inputs.length; i++) {
  inputs[i].addEventListener('change', function () {
    if (this.className === 'weeklyDay') {
      document.getElementById('weekly').checked = true // if user changes a day of the week, automatically select weekly schedule
    }
    summarizeAndEnableSave()
  })
}
document.getElementsByTagName('select')[0].addEventListener('change', function () {
  document.getElementById('monthly').checked = true
  summarizeAndEnableSave()
})
function monitorExclusions () {
  for (var i = 0; document.getElementById('exclude' + i); i++) {
    document.getElementById('exclude' + i).addEventListener('change', summarizeAndEnableSave)
  }
}

// Call backup function
document.getElementById('backup-form').addEventListener('submit', function (event) {
  event.preventDefault()
  // var notification = new Notification('Backup started');
  initiateBackup()
})

/*
END OF EVENT BINDING
*/

// update HTML to show progress of backup
function initiateBackup () {
  document.getElementById('settingsSection').className = 'inactive'
  document.getElementById('progressSection').className = 'active'
  document.getElementById('progressStatus').innerHTML = 'Backup in progress'
  document.getElementById('backup').disabled = true
  ipc.send('run-backup', getAllUserInputs())
}

// show settings
ipc.on('show-settings', function () {
  document.getElementById('settingsSection').className = 'active'
  document.getElementById('progressSection').className = 'inactive'
})
// show backup log
ipc.on('show-backup-log', function () {
  document.getElementById('settingsSection').className = 'inactive'
  document.getElementById('progressSection').className = 'active'
})
// update backup log
var firstChar = 334
var encoding = 'utf-16'
if (/6\..*/.test(os.release())) { // Robocopy on Windows 7 does not do a true Unicode log (it has a bug). UNILOG is actually iso-8859-1 instead of utf-8
  firstChar = 165
  encoding = 'iso-8859-1'
}
var previousLogLength = 0
ipc.on('update-backup-log-display', function (event, log, when) {
  if (previousLogLength === 0) {
    document.getElementById('log').innerHTML = 'Loading shadow copy.\n\n' // reset log display if this is the first run
    if (log.length > firstChar) {
      previousLogLength = firstChar // skips the ROBOCOPY heading in the log, to avoid user confusion
    }
  }

  document.getElementById('log').insertAdjacentHTML('beforeend', new TextDecoder(encoding).decode(log.subarray(previousLogLength, log.length)))
  previousLogLength = log.length
  document.getElementById('log').scrollTop = document.getElementById('log').scrollHeight

  if (when === 'lastTime') {
    previousLogLength = 0
  }
})

// display notifications
ipc.on('notification', function (event, msg) {
  let myNotification = new Notification('Solid Backup', {
    body: msg
  })
})

// update HTML after backup completes (or fails)
ipc.on('reset-progress', function (event, msg) {
  document.getElementById('progressStatus').innerHTML = msg
  document.getElementById('backup').disabled = false

  if (msg === 'Backup failed.') {
    setTimeout(function () { document.getElementById('log').innerHTML += '\n\nBackup failed.' }, 2000)
    // Wait 2 seconds so that the log finishes loading before adding "Backup failed" to bottom of displayed log
  }

  // const { remote } = require('electron')
  // remote.getCurrentWindow().show(); //show window (in case it is running in the background)
  // console.log('remote.getCurrentWindow().show()');
})

// Let main process collect user input and then run backup
ipc.on('get-inputs-and-backup', function () {
  if (document.getElementById('ready').checked) {
    console.log('ready')
    initiateBackup()
  } else {
    console.log('not ready')
    // document.getElementById('ready').addEventListener('change',initiateBackup);
    setTimeout(initiateBackup, 5000)
  }
})

// open saved settings
summarize()
ipc.send('open-settings', 'first-run')// get access to file via main.js
ipc.on('open-settings', function (msg, data) {
  openSettings(msg, data)
})
function openSettings (msg, data) {
  console.log('settings data:', data)

  // Folder settings
  document.getElementById('sourceFolder').value = data['sourceFolder']
  document.getElementById('destinationFolder').value = data['destinationFolder']

  // Full backup settings
  document.getElementById('full').checked = data['full']
  document.getElementById('numberOfFull').value = data['numberOfFull']

  // Mirror backup settings
  document.getElementById('mirror').checked = data['mirror']
  document.getElementById('numberOfMirror').value = data['numberOfMirror']

  // Automatic backup settings
  document.getElementById('automatic').checked = data['automatic']

  // Differential backup settings
  document.getElementById('differential').checked = data['differential']
  document.getElementById('numberOfFullDiff').value = data['numberOfFullDiff']
  document.getElementById('numberOfDifferential').value = data['numberOfDifferential']

  // Schedule settings
  document.getElementById('startTime').value = data['startTime']
  document.getElementById('noSchedule').checked = data['noSchedule']
  document.getElementById('daily').checked = data['daily']

  // Weekly schedule settings
  document.getElementById('weekly').checked = data['weekly']
  document.getElementById('monday').checked = data['monday']
  document.getElementById('tuesday').checked = data['tuesday']
  document.getElementById('wednesday').checked = data['wednesday']
  document.getElementById('thursday').checked = data['thursday']
  document.getElementById('friday').checked = data['friday']
  document.getElementById('saturday').checked = data['saturday']
  document.getElementById('sunday').checked = data['sunday']

  // Monthly schedule settings
  document.getElementById('monthly').checked = data['monthly']
  document.getElementById('monthlySelect').value = data['date']

  // Files or folders to exclude from backup
  if (data['excludes']) { // if data['excludes'] doesn't exist (i.e. settings file from ver. 0.1.2 or before) then ignore without error
    var numberOfExclusionDivs = document.getElementById('exclusions').children.length

    if (data['excludes'].length >= numberOfExclusionDivs) {
      for (var i = 0; i < numberOfExclusionDivs; i++) { // fill in existing exclusion divs
        document.getElementById('exclude' + i).className = data['excludes'][i].className
        document.getElementById('exclude' + i).value = data['excludes'][i].value
      }
      for (var i = numberOfExclusionDivs; i < data['excludes'].length; i++) { // add additional exclusion divs as needed
        addExclusion('', data['excludes'][i].value, data['excludes'][i].className)
      }
    } else { // untested: is this even needed? Could be needed if presets open separate settings files. Right now the only time openSettings is called is on page load.
      for (var i = 0; i < data['excludes'].length; i++) { // fill in existing exclusion divs
        document.getElementById('exclude' + i).className = data['excludes'][i].className
        document.getElementById('exclude' + i).value = data['excludes'][i].value
      }
      for (var i = data['excludes'].length; i <= numberOfExclusionDivs; i++) { // delete exclusion divs that are no longer needed
        var elem = this.parentNode // DIV container which contains text input, delete button, and error message area
        var id = elem.id
        elem.parentNode.removeChild(elem)
      }
    }
  }
  monitorExclusions() // adds change event listening

  check()
}

// Summarize Schedule and Advanced settings
function summarize () {
  var hoursMinutes = document.getElementById('startTime').value.split(':')
  var date = new Date()
  date.setHours(hoursMinutes[0], hoursMinutes[1], 0)
  var time = date.toLocaleTimeString().replace(/(\d+:\d+):00(.*)/, '$1$2') // time in local format (minus seconds)

  var summary = ''

  if (document.getElementById('noSchedule').checked) { // No schedule
    summary += 'No schedule'
  } else if (document.getElementById('daily').checked) { // Daily
    summary += 'Daily at ' + time
  } else if (document.getElementById('weekly').checked) { // Weekly
    summary += 'Every '
    if (document.getElementById('monday').checked) summary += 'Mon '
    if (document.getElementById('tuesday').checked) summary += 'Tue '
    if (document.getElementById('wednesday').checked) summary += 'Wed '
    if (document.getElementById('thursday').checked) summary += 'Thu '
    if (document.getElementById('friday').checked) summary += 'Fri '
    if (document.getElementById('saturday').checked) summary += 'Sat '
    if (document.getElementById('sunday').checked) summary += 'Sun '
    summary += 'at ' + time
  } else if (document.getElementById('monthly').checked) { // Monthly
    var date = ''
    switch (document.getElementById('monthlySelect').value) { // check it is not null
      case '':
        console.log('Error: date is blank')
        break
      case '1':
        date = '1st'
        break
      case '2':
        date = '2nd'
        break
      case '3':
        date = '3rd'
        break
      case 'LAST':
        date = 'last day'
        break
      default:
        date = document.getElementById('monthlySelect').value + 'th'
        break
    }
    summary += 'Monthly on the ' + date + ' at ' + time
  }
  document.getElementById('schedule-summary').innerHTML = summary

  // Summarize Advanced settings
  var summary = ''
  var numberOfExclusionDivs = document.getElementById('exclusions').children.length
  if (numberOfExclusionDivs < 1) {
    summary += 'No exclusions'
  } else if (numberOfExclusionDivs < 2) {
    summary += numberOfExclusionDivs + ' exclusion'
  } else {
    summary += numberOfExclusionDivs + ' exclusions'
  }
  document.getElementById('advanced-summary').innerHTML = summary
}

// Set user input (with predefined settings (mostly secret shortcuts for testing purposes only)
ipc.on('set-user-input', function (msg, id, value, checked) {
  setUserInput(id, value, checked)
})
function setUserInput (id, value, checked) {
  if (checked == null) {
    document.getElementById(id).value = value
  } else {
    document.getElementById(id).checked = checked
  }
}

// Check user input
document.getElementById('check').addEventListener('click', check)

document.getElementById('sourceFolder').addEventListener('invalid', getAllUserInputs)
document.getElementById('destinationFolder').addEventListener('invalid', getAllUserInputs)
document.getElementById('numberOfFull').addEventListener('invalid', getAllUserInputs)
document.getElementById('numberOfFullDiff').addEventListener('invalid', getAllUserInputs)
document.getElementById('numberOfDifferential').addEventListener('invalid', getAllUserInputs)
document.getElementById('startTime').addEventListener('invalid', getAllUserInputs)

ipc.on('check', function () {
  check()
})
function check (event) {
  summarize()
  ipc.send('check', getAllUserInputs(), false)
}
function reportError (areaId, message) {
  document.getElementById(areaId + 'Message').innerHTML = message
  document.getElementById(areaId).className = 'error'
}
function getAllUserInputs () {
  clearAllErrors()

  var userInput = {

    // Folder settings
    'sourceFolder': document.getElementById('sourceFolder').value,
    'destinationFolder': document.getElementById('destinationFolder').value,

    // Full backup settings
    'full': document.getElementById('full').checked,
    'numberOfFull': document.getElementById('numberOfFull').value,

    // Mirror backup settings
    'mirror': document.getElementById('mirror').checked,
    'numberOfMirror': document.getElementById('numberOfMirror').value,

    // Automatic backup settings
    'automatic': document.getElementById('automatic').checked,

    // Differential backup settings
    'differential': document.getElementById('differential').checked,
    'numberOfFullDiff': document.getElementById('numberOfFullDiff').value,
    'numberOfDifferential': document.getElementById('numberOfDifferential').value,

    // Schedule settings
    'startTime': document.getElementById('startTime').value,
    'noSchedule': document.getElementById('noSchedule').checked,
    'daily': document.getElementById('daily').checked,

    // Weekly schedule settings
    'weekly': document.getElementById('weekly').checked,
    'monday': document.getElementById('monday').checked,
    'tuesday': document.getElementById('tuesday').checked,
    'wednesday': document.getElementById('wednesday').checked,
    'thursday': document.getElementById('thursday').checked,
    'friday': document.getElementById('friday').checked,
    'saturday': document.getElementById('saturday').checked,
    'sunday': document.getElementById('sunday').checked,

    // Monthly schedule settings
    'monthly': document.getElementById('monthly').checked,
    'date': document.getElementById('monthlySelect').value,

    // Files or folders to exclude from backup
    'excludes': [], // filled in with loop below

    // Type of backup
    'type': document.querySelector('input[name="backupType"]:checked').value,

    // Is the user input valid?
    'pass': true

  }

  // Excluded files or folders
  var i = 0
  while (document.getElementById('exclude' + i)) {
    userInput['excludes'].push({
      className: document.getElementById('exclude' + i).className,
      value: document.getElementById('exclude' + i).value })
    i++
  }

  // Number of backups
  if (!((userInput['numberOfFull'] >= 1) && (userInput['numberOfFull'] <= 99) && (Math.round(userInput['numberOfFull'], 0) === Number(userInput['numberOfFull'])))) {
    userInput['pass'] = false
    reportError('numberOfFull', 'Error: The number of full backups must be a whole number between 1 and 99')
  }
  if (!((userInput['numberOfFullDiff'] >= 1) && (userInput['numberOfFullDiff'] <= 99) && (Math.round(userInput['numberOfFullDiff'], 0) === Number(userInput['numberOfFullDiff'])))) {
    userInput['pass'] = false
    reportError('numberOfFullDiff', 'Error: The number of full backups must be a whole number between 1 and 99')
  }
  if (!((userInput['numberOfDifferential'] >= 1) && (userInput['numberOfDifferential'] <= 99) && (Math.round(userInput['numberOfDifferential'], 0) === Number(userInput['numberOfDifferential'])))) {
    userInput['pass'] = false
    reportError('numberOfDifferential', 'Error: The number of differential backups must be a whole number between 1 and 99')
  }

  // Schedule settings
  if ((userInput['startTime'] === '') && !(userInput['noSchedule'])) {
    userInput['pass'] = false
    reportError('startTime', 'Error: Please complete the start time, including hours, minutes, and AM/PM')

    var collapsible = document.getElementsByClassName('collapsible')[0]
    collapsible.getElementsByTagName('h3')[0].classList.add('expanded')
    collapsible.getElementsByTagName('div')[1].classList.add('expanded')
  }
  if ((userInput['weekly']) && !(userInput['monday']) && !(userInput['tuesday']) && !(userInput['wednesday']) && !(userInput['thursday']) && !(userInput['friday']) && !(userInput['saturday']) && !(userInput['sunday'])) {
    userInput['pass'] = false
    reportError('weeklyDays', 'Error: Please select at least one day for the weekly backup to take place.')

    var collapsible = document.getElementsByClassName('collapsible')[0]
    collapsible.getElementsByTagName('h3')[0].classList.add('expanded')
    collapsible.getElementsByTagName('div')[1].classList.add('expanded')
  }
  if ((userInput['monthly']) && !(userInput['date'])) { // && !(userInput['d1']) && !(userInput['d2']) && !(userInput['d3']) && !(userInput['d4']) && !(userInput['d5']) && !(userInput['d6']) && !(userInput['d7']) && !(userInput['d8']) && !(userInput['d9']) && !(userInput['d10']) && !(userInput['d11']) && !(userInput['d12']) && !(userInput['d13']) && !(userInput['d4']) && !(userInput['d15']) && !(userInput['d16']) && !(userInput['d17']) && !(userInput['d18']) && !(userInput['d19']) && !(userInput['d20']) && !(userInput['d21']) && !(userInput['d22']) && !(userInput['d23']) && !(userInput['d24']) && !(userInput['d25']) && !(userInput['d26']) && !(userInput['d27']) && !(userInput['d28']) && !(userInput['d29']) && !(userInput['d30']) && !(userInput['d31']) && !(userInput['dlast'])) { //No longer needed now that the date is a select menu rather than checkboxes or radio dials
    userInput['pass'] = false
    reportError('monthlyDaysMessage', 'Error: Please select a date for the monthly backup to take place.')

    var collapsible = document.getElementsByClassName('collapsible')[0]
    collapsible.getElementsByTagName('h3')[0].classList.add('expanded')
    collapsible.getElementsByTagName('div')[1].classList.add('expanded')
  }

  document.getElementById('ready').checked = true

  console.log('userInput.pass:', userInput.pass)
  return userInput
}
function clearAllErrors () {
  var listOfMessageAreas = document.getElementsByClassName('message')

  for (var i = 0; i < listOfMessageAreas.length; i++) {
    listOfMessageAreas[i].innerHTML = '' // clear error message
    document.getElementById(listOfMessageAreas[i].id.split('Message')[0]).className = '' // reset input corresponding input so it no longer appears red
  }
}

// Errors and warnings
ipc.on('path-error', function (event, whichFolder, message) {
  document.getElementById(whichFolder + 'Message').innerHTML = message
  if (whichFolder !== 'general') document.getElementById(whichFolder).classList.add('error')
})
ipc.on('clear-all-errors', function () {
  document.getElementById('sourceFolderMessage').innerHTML = ''
  document.getElementById('sourceFolder').className = ''

  document.getElementById('destinationFolderMessage').innerHTML = ''
  document.getElementById('destinationFolder').className = ''
})
