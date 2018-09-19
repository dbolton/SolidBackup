## Obtain source code
1. Download and install [Git](https://www.git-scm.com/) to manage and retrieve the code. The default installation settings are fine.
2. Clone the SolidBackup code repository
   1. From the **Start Menu**, open **Command Prompt** (or **Git Bash** if prefer the GNU/Linux-style shell).
   2. Navigate to the folder where you want to save the code on your computer. For example, `cd C:\Users\<username>\Documents\Code`
   3. Type: `git clone https://github.com/dbolton/SolidBackup.git` (This creates a folder named "SolidBackup" that contains the entire repository.) (Alternatively, you can use the Git GUI to clone the SolidBackup repository.)

## Install dependencies
3. Download and install [Node.JS](https://nodejs.org/).
4. Download and install [Yarn](https://yarnpkg.com/en/docs/install#windows-tab).
5. SolidBackup uses [Electron](https://electron.atom.io/) for UI and several related Node.JS modules. You can install all these dependencies at once.
   1. Open **Command Prompt**
   2. Navigate to your SolidBackup folder (your clone of the SolidBackup repository). For example, `cd C:\Users\<username>\Documents\Code\SolidBackup`
   3. Install dependencies. Type: `yarn install`

## Run
1. Open a new **Command Prompt** with administrative permissions. (From the **Start Menu**, right click on **Command Prompt** and choose **Run as administrator**. You can also modify shortcuts of **Command Prompt** by opening it's properties and ticking "Run as Administrator" under "Compatibility"). SolidBackup needs administrative permission to access any file on the system, create a shadow volume, and schedule tasks.
2. Navigate to your SolidBackup folder. For example, `cd C:\Users\<username>\Documents\Code\SolidBackup`
3. Start SolidBackup by typing: `yarn start` (for normal mode) or `yarn dev` (for developer mode).

Normal mode matches what end users see when they run the application. Developer mode opens the Developer Tools pane and maximizes the window. For convenience, you can consolidate all three steps above and just double click **Run dev mode.bat**. (You can execute it in BASH by typing "./Run\ dev\ mode.bat").

## Create installer
See "https://electronjs.org/docs/tutorial/application-distribution" and "https://github.com/electron-userland/electron-builder/"

1. Open **Command Prompt**
2. Navigate to the SolidBackup directory
3. Create the installer by typing: `yarn dist`

Note: If your anti-virus program repeatedly tries to delete the final installer, try running `yarn dist` from command prompt _without_ administrative permission.
