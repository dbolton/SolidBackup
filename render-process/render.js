
const ipc = require('electron').ipcRenderer
const shell = require('electron').shell
const { app } = require('electron').remote

const os = require('os')

/*
EVENT BINDING
*/

// Browse for source folder
const source_button = document.getElementById('source_folder_browse')

source_button.addEventListener('click', function (event) {
  ipc.send('open-source-folder-dialog', document.getElementById('source_folder').value)
})

ipc.on('selected-source-folder', function (event, path) {
  document.getElementById('source_folder').value = `${path}`
  document.getElementById('source_folder').dispatchEvent(new Event('change'))
  check()
})

// Browse for destination folder
const destination_button = document.getElementById('destination_folder_browse')

destination_button.addEventListener('click', function (event) {
  ipc.send('open-destination-folder-dialog', document.getElementById('destination_folder').value)
})

ipc.on('selected-destination-folder', function (event, path) {
  document.getElementById('destination_folder').value = `${path}`
  document.getElementById('destination_folder').dispatchEvent(new Event('change'))
  check()
})

// Browse for excluded folder
const exclusion_button = document.getElementById('exclude_folder_add')

exclusion_button.addEventListener('click', function (event) {
  ipc.send('open-exclude-folder-dialog', document.getElementById('source_folder').value)
})

ipc.on('selected-exclude-folder', addExclusion)
function addExclusion (event, path, folder_or_file) {
  var i = 0
  while (document.getElementById('exclude_' + i)) { i++ } // find how many exclusions already exist

  var div = document.createElement('div')
  div.id = 'exclusion_div_' + i
  div.className = folder_or_file
  div.innerHTML = '<input type="text" id="exclude_' + i + '" class="' + folder_or_file + '" size="50" value="">\n<button id="exclude_' + i + '_delete" type="button" class="delete" title="Delete">x</button><div id="exclude_' + i + '_message"></div>'
  document.getElementById('exclusions').appendChild(div)
  document.getElementById('exclude_' + i).value = `${path}`
  document.getElementById('exclude_' + i + '_delete').addEventListener('click', deleteExclusion)

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
  for (var i = Number(id.match(/\d+/)[0]) + 1; document.getElementById('exclude_' + i); i++) {
    // Get details from old div and delete
    var path = document.getElementById('exclude_' + i).value
    var div_container = document.getElementById('exclusion_div_' + i)
    var folder_or_file = div_container.className
    div_container.parentNode.removeChild(div_container)

    // Create new div with renumbered id
    addExclusion('', path, folder_or_file)
  }
  monitorExclusions()
  summarizeAndEnableSave()
}

// Add Event listeners to progress section buttons
document.getElementById('edit_settings').addEventListener('click', function () {
  document.getElementById('settings_section').className = 'active'
  // location.href='#edit_settings';
  document.body.scrollTop = document.documentElement.scrollTop = 0
})

const fileManagerBtn = document.getElementById('open_backup')
fileManagerBtn.addEventListener('click', function (event) {
  var pass = shell.openItem(document.getElementById('destination_folder').value)
  if (!pass) {
    alert('Error: Unable to open the destination folder')
  }
})

document.getElementById('stop_backup').addEventListener('click', function () {
  ipc.send('kill-backup')
  console.log('kill-backup sent')
})

// Hide unneeded sections
// Schedule section
var schedule_section = document.getElementsByClassName('collapsible')[0]
schedule_section.getElementsByTagName('h3')[0].addEventListener('click', function () {
  schedule_section.getElementsByTagName('h3')[0].classList.toggle('expanded')
  schedule_section.getElementsByTagName('div')[1].classList.toggle('expanded')
})

// Advanced section
var advanced_section = document.getElementsByClassName('collapsible')[1]
advanced_section.getElementsByTagName('h3')[0].addEventListener('click', function () {
  advanced_section.getElementsByTagName('h3')[0].classList.toggle('expanded')
  advanced_section.getElementsByTagName('div')[1].classList.toggle('expanded')
})

var reload_log

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
    if (this.className == 'weekly_day') {
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
  for (var i = 0; document.getElementById('exclude_' + i); i++) {
    document.getElementById('exclude_' + i).addEventListener('change', summarizeAndEnableSave)
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
  document.getElementById('settings_section').className = 'inactive'
  document.getElementById('progress_section').className = 'active'
  document.getElementById('progress_status').innerHTML = 'Backup in progress'
  document.getElementById('backup').disabled = true
  ipc.send('run-backup', getAllUserInputs())
}

// show settings
ipc.on('show-settings', function () {
  document.getElementById('settings_section').className = 'active'
  document.getElementById('progress_section').className = 'inactive'
})
// show backup log
ipc.on('show-backup-log', function () {
  document.getElementById('settings_section').className = 'inactive'
  document.getElementById('progress_section').className = 'active'
})
// update backup log
var first_char = 334
var encoding = 'utf-16'
if (/6\..*/.test(os.release())) { // Robocopy on Windows 7 does not do a true Unicode log (it has a bug). UNILOG is actually iso-8859-1 instead of utf-8
  first_char = 165
  encoding = 'iso-8859-1'
}
var previous_log_length = 0
ipc.on('update-backup-log-display', function (event, log, when) {
  if (previous_log_length == 0) {
    document.getElementById('log').innerHTML = 'Loading shadow copy.\n\n' // reset log display if this is the first run
    if (log.length > first_char) {
      previous_log_length = first_char // skips the ROBOCOPY heading in the log, to avoid user confusion
    }
  }

  document.getElementById('log').insertAdjacentHTML('beforeend', new TextDecoder(encoding).decode(log.subarray(previous_log_length, log.length)))
  previous_log_length = log.length
  document.getElementById('log').scrollTop = document.getElementById('log').scrollHeight

  if (when == 'last_time') {
    previous_log_length = 0
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
  document.getElementById('progress_status').innerHTML = msg
  document.getElementById('backup').disabled = false

  if (msg == 'Backup failed.') {
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
  document.getElementById('source_folder').value = data['source_folder']
  document.getElementById('destination_folder').value = data['destination_folder']

  // Full backup settings
  document.getElementById('full').checked = data['full']
  document.getElementById('number_of_full').value = data['number_of_full']

  // Mirror backup settings
  document.getElementById('mirror').checked = data['mirror']
  document.getElementById('number_of_mirror').value = data['number_of_mirror']

  // Automatic backup settings
  document.getElementById('automatic').checked = data['automatic']

  // Differential backup settings
  document.getElementById('differential').checked = data['differential']
  document.getElementById('number_of_full_diff').value = data['number_of_full_diff']
  document.getElementById('number_of_differential').value = data['number_of_differential']

  // Schedule settings
  document.getElementById('start_time').value = data['start_time']
  document.getElementById('no_schedule').checked = data['no_schedule']
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
  document.getElementById('monthly_select').value = data['date']

  // Files or folders to exclude from backup
  if (data['excludes']) { // if data['excludes'] doesn't exist (i.e. settings file from ver. 0.1.2 or before) then ignore without error
    var number_of_exclusion_divs = document.getElementById('exclusions').children.length

    if (data['excludes'].length >= number_of_exclusion_divs) {
      for (var i = 0; i < number_of_exclusion_divs; i++) { // fill in existing exclusion divs
        document.getElementById('exclude_' + i).className = data['excludes'][i].className
        document.getElementById('exclude_' + i).value = data['excludes'][i].value
      }
      for (var i = number_of_exclusion_divs; i < data['excludes'].length; i++) { // add additional exclusion divs as needed
        addExclusion('', data['excludes'][i].value, data['excludes'][i].className)
      }
    } else { // untested: is this even needed? Could be needed if presets open separate settings files. Right now the only time openSettings is called is on page load.
      for (var i = 0; i < data['excludes'].length; i++) { // fill in existing exclusion divs
        document.getElementById('exclude_' + i).className = data['excludes'][i].className
        document.getElementById('exclude_' + i).value = data['excludes'][i].value
      }
      for (var i = data['excludes'].length; i <= number_of_exclusion_divs; i++) { // delete exclusion divs that are no longer needed
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
  var hours_minutes = document.getElementById('start_time').value.split(':')
  var date = new Date()
  date.setHours(hours_minutes[0], hours_minutes[1], 0)
  var time = date.toLocaleTimeString().replace(/(\d+:\d+):00(.*)/, '$1$2') // time in local format (minus seconds)

  var summary = ''

  if (document.getElementById('no_schedule').checked) { // No schedule
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
    switch (document.getElementById('monthly_select').value) { // check it is not null
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
        date = document.getElementById('monthly_select').value + 'th'
        break
    }
    summary += 'Monthly on the ' + date + ' at ' + time
  }
  document.getElementById('schedule-summary').innerHTML = summary

  // Summarize Advanced settings
  var summary = ''
  var number_of_exclusion_divs = document.getElementById('exclusions').children.length
  if (number_of_exclusion_divs < 1) {
    summary += 'No exclusions'
  } else if (number_of_exclusion_divs < 2) {
    summary += number_of_exclusion_divs + ' exclusion'
  } else {
    summary += number_of_exclusion_divs + ' exclusions'
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

document.getElementById('source_folder').addEventListener('invalid', getAllUserInputs)
document.getElementById('destination_folder').addEventListener('invalid', getAllUserInputs)
document.getElementById('number_of_full').addEventListener('invalid', getAllUserInputs)
document.getElementById('number_of_full_diff').addEventListener('invalid', getAllUserInputs)
document.getElementById('number_of_differential').addEventListener('invalid', getAllUserInputs)
document.getElementById('start_time').addEventListener('invalid', getAllUserInputs)

ipc.on('check', function () {
  check()
})
function check (event) {
  summarize()
  ipc.send('check', getAllUserInputs(), false)
}
function reportError (area_id, message) {
  document.getElementById(area_id + '_message').innerHTML = message
  document.getElementById(area_id).className = 'error'
}
function getAllUserInputs () {
  clearAllErrors()

  var user_input = {

    // Folder settings
    'source_folder': document.getElementById('source_folder').value,
    'destination_folder': document.getElementById('destination_folder').value,

    // Full backup settings
    'full': document.getElementById('full').checked,
    'number_of_full': document.getElementById('number_of_full').value,

    // Mirror backup settings
    'mirror': document.getElementById('mirror').checked,
    'number_of_mirror': document.getElementById('number_of_mirror').value,

    // Automatic backup settings
    'automatic': document.getElementById('automatic').checked,

    // Differential backup settings
    'differential': document.getElementById('differential').checked,
    'number_of_full_diff': document.getElementById('number_of_full_diff').value,
    'number_of_differential': document.getElementById('number_of_differential').value,

    // Schedule settings
    'start_time': document.getElementById('start_time').value,
    'no_schedule': document.getElementById('no_schedule').checked,
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
    'date': document.getElementById('monthly_select').value,

    // Files or folders to exclude from backup
    'excludes': [], // filled in with loop below

    // Type of backup
    'type': document.querySelector('input[name="backup_type"]:checked').value,

    // Is the user input valid?
    'pass': true

  }

  // Excluded files or folders
  var i = 0
  while (document.getElementById('exclude_' + i)) {
    user_input['excludes'].push({
      className: document.getElementById('exclude_' + i).className,
      value: document.getElementById('exclude_' + i).value })
    i++
  }

  // Number of backups
  if (!((user_input['number_of_full'] >= 1) && (user_input['number_of_full'] <= 99) && (Math.round(user_input['number_of_full'], 0) == user_input['number_of_full']))) {
    user_input['pass'] = false
    reportError('number_of_full', 'Error: The number of full backups must be a whole number between 1 and 99')
  }
  if (!((user_input['number_of_full_diff'] >= 1) && (user_input['number_of_full_diff'] <= 99) && (Math.round(user_input['number_of_full_diff'], 0) == user_input['number_of_full_diff']))) {
    user_input['pass'] = false
    reportError('number_of_full_diff', 'Error: The number of full backups must be a whole number between 1 and 99')
  }
  if (!((user_input['number_of_differential'] >= 1) && (user_input['number_of_differential'] <= 99) && (Math.round(user_input['number_of_differential'], 0) == user_input['number_of_differential']))) {
    user_input['pass'] = false
    reportError('number_of_differential', 'Error: The number of differential backups must be a whole number between 1 and 99')
  }

  // Schedule settings
  if ((user_input['start_time'] == '') && !(user_input['no_schedule'])) {
    user_input['pass'] = false
    reportError('start_time', 'Error: Please complete the start time, including hours, minutes, and AM/PM')

    var collapsible = document.getElementsByClassName('collapsible')[0]
    collapsible.getElementsByTagName('h3')[0].classList.add('expanded')
    collapsible.getElementsByTagName('div')[1].classList.add('expanded')
  }
  if ((user_input['weekly']) && !(user_input['monday']) && !(user_input['tuesday']) && !(user_input['wednesday']) && !(user_input['thursday']) && !(user_input['friday']) && !(user_input['saturday']) && !(user_input['sunday'])) {
    user_input['pass'] = false
    reportError('weekly_days', 'Error: Please select at least one day for the weekly backup to take place.')

    var collapsible = document.getElementsByClassName('collapsible')[0]
    collapsible.getElementsByTagName('h3')[0].classList.add('expanded')
    collapsible.getElementsByTagName('div')[1].classList.add('expanded')
  }
  if ((user_input['monthly']) && !(user_input['date'])) { // && !(user_input['d1']) && !(user_input['d2']) && !(user_input['d3']) && !(user_input['d4']) && !(user_input['d5']) && !(user_input['d6']) && !(user_input['d7']) && !(user_input['d8']) && !(user_input['d9']) && !(user_input['d10']) && !(user_input['d11']) && !(user_input['d12']) && !(user_input['d13']) && !(user_input['d4']) && !(user_input['d15']) && !(user_input['d16']) && !(user_input['d17']) && !(user_input['d18']) && !(user_input['d19']) && !(user_input['d20']) && !(user_input['d21']) && !(user_input['d22']) && !(user_input['d23']) && !(user_input['d24']) && !(user_input['d25']) && !(user_input['d26']) && !(user_input['d27']) && !(user_input['d28']) && !(user_input['d29']) && !(user_input['d30']) && !(user_input['d31']) && !(user_input['dlast'])) { //No longer needed now that the date is a select menu rather than checkboxes or radio dials
    user_input['pass'] = false
    reportError('monthly_days_message', 'Error: Please select a date for the monthly backup to take place.')

    var collapsible = document.getElementsByClassName('collapsible')[0]
    collapsible.getElementsByTagName('h3')[0].classList.add('expanded')
    collapsible.getElementsByTagName('div')[1].classList.add('expanded')
  }

  document.getElementById('ready').checked = true

  console.log('user_input.pass:', user_input.pass)
  return user_input
}
function clearAllErrors () {
  var list_of_message_areas = document.getElementsByClassName('message')

  for (var i = 0; i < list_of_message_areas.length; i++) {
    list_of_message_areas[i].innerHTML = '' // clear error message
    document.getElementById(list_of_message_areas[i].id.split('_message')[0]).className = '' // reset input corresponding input so it no longer appears red
  }
}

// Errors and warnings
ipc.on('path-error', function (event, which_folder, message) {
  document.getElementById(which_folder + '_message').innerHTML = message
  if (which_folder != 'general') document.getElementById(which_folder).classList.add('error')
})
ipc.on('clear-all-errors', function () {
  document.getElementById('source_folder_message').innerHTML = ''
  document.getElementById('source_folder').className = ''

  document.getElementById('destination_folder_message').innerHTML = ''
  document.getElementById('destination_folder').className = ''
})
