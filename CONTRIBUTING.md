## Build environment
1. Download and install [Git](https://www.git-scm.com/) to manage and retrieve the code.
2. Clone the Solid Backup code repository
   1. Open the Command Prompt (or BASH if you prefer)
   2. Navigate to the folder where you want the code to be on your computer. For example, `cd C:\Users\<username>\Documents\Code`
   3. Type: `git clone https://github.com/dbolton/SolidBackup.git` (This creates a folder named "SolidBackup" that contains the entire repository.) (Alternatively, you can use the Git GUI to clone the Solid Backup repository.)
2. Download and install [Node.JS](https://nodejs.org/).
3. After installing Node.JS you need to install [Electron](https://electron.atom.io/) for UI.
   1. Open the command prompt
   2. Navigate to the folder of your clone of the Solid Backup repository. For example, `cd C:\Users\<username>\Documents\Code\SolidBackup`
   3. Install Electron and Electron-Updater. Type:
      ```
      npm install electron
      npm install electron-updater
      npm install electron-log
      ```
5. Open a new command prompt with administrative permissions. (Solid Backup needs the administrative permissions).
6. Navigate to the SolidBackup folder. For example, `cd C:\Users\<username>\Documents\Code\SolidBackup`
7. Start Solid Backup by typing: `npm start`

## Create installer
See "https://electronjs.org/docs/tutorial/application-distribution" and "https://github.com/electron-userland/electron-builder/"

1. Download and install [Yarn](https://yarnpkg.com/en/docs/install#windows-tab)
2. Open a new command prompt and navigate to the Solid Backup directory (Again, Git CMD will work for this)
3. Type: `yarn add electron-builder --dev`
4. Create the installer by typing: `yarn dist`

Note: If your antivirus repeatedly tries to delete the final installer, try running `yarn dist` from command prompt _without_ administrative permission.