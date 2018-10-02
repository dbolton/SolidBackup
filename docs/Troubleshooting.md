Troubleshooting
===============

## Error: "There is not enough space on the disk."
**ToDo**

## Error: "The file or directory is corrupted and unreadable."
Three possible causes:
1. The source disk is corrupted.
2. The destination disk is corrupted.
3. Third-party software (such as anti-virus) is interfering with the backup.

To check for disk corruption on both your source disk and destination disk, see [Run Check Disk from Windows Explorer to Check for and Fix Disk Errors](https://technet.microsoft.com/en-us/library/ee872427.aspx) or if you are used to using the command prompt you can follow the instructions at [How to Scan & Fix Hard Drives with CHKDSK in Windows 10](https://www.tekrevue.com/tip/fix-hard-drives-chkdsk-windows-10/).

Corruption can happen if the disk loses power or gets unplugged while the computer is still writing data to the disk (see [Safely removing the USB device from the computer](https://kb.sandisk.com/app/answers/detail/a_id/309/~/safely-removing-the-usb-device-from-the-computer) and [Safely Remove USB Drives Just by Unplugging them](https://www.pcworld.com/article/254868/safely_remove_usb_drives_just_by_unplugging_them.html])).

If disk corruption happens regularly it could be a sign that the disk is about to fail and needs to be replaced. You can check the health of the disk by reading its [S.M.A.R.T. data](https://www.howtogeek.com/134735/how-to-see-if-your-hard-drive-is-dying/). If you hear a clicking sound from a mechanical hard disk, then it is definitely at the end of its life. Viruses are another common cause of disk corruption.
