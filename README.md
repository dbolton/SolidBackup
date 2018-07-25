BUILD ENVIRONMENT
1. Download and install Git from https://git-scm.com/
2. Download and install Node.JS from https://nodejs.org/
3. After installing Node.JS we need to install electron for UI < https://electron.atom.io/ >. Open a new command prompt. CD to your copy of the BoltBackup project folder and type: npm install electron
4. Download ShadowSpawn < https://github.com/candera/shadowspawn/downloads > and place both the x64 and x86 versions of ShadowSpawn in the Binaries directory. 

5. Open a new command prompt and navigate to the BoltBackup directory
6. Start BoltBackup by using the script: npm start (Alternatively you can manually type:  .\node_modules\.bin\electron .

DISTRIBUTING
See https://electron.atom.io/docs/tutorial/application-distribution/
https://github.com/electron-userland/electron-builder

1. Download and install yarn from https://yarnpkg.com/en/docs/install#windows-tab
2. Open a new command prompt and navigate to the BoltBackup directory
3. Type: yarn add electron-builder --dev
4. Create the installer by typing: yarn dist

DISTRIBUTING UPDATES
See https://www.electron.build/auto-update

1. If this is your first time, install electron-updater as a dependency: CD to your copy of the BoltBackup project folder and type: yarn add electron-updater
2. 


