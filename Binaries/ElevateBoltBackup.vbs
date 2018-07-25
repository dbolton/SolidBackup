BoltBackup_path = WScript.Arguments.Item(0)
Set UAC = CreateObject("Shell.Application")
UAC.ShellExecute BoltBackup_path, "", "", "runas", 1