SolidBackup_path = WScript.Arguments.Item(0)
Set UAC = CreateObject("Shell.Application")
UAC.ShellExecute SolidBackup_path, "", "", "runas", 1