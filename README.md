## BUILD ENVIRONMENT

1. Download and install [Git](https://git-scm.com/) to manage and retrieve the code.
2. Download and install [Node.JS](https://nodejs.org/).
3. After installing Node.JS you need to install [Electron](https://electron.atom.io/) for UI. Open a new command prompt. Change the directory to your clone of the BoltBackup repository and type: `npm install electron`
4. Download [ShadowSpawn](https://github.com/candera/shadowspawn/downloads) and place both the x64 and x86 versions of ShadowSpawn in the Binaries directory.
5. Open a new command prompt and navigate to the BoltBackup directory
6. Start BoltBackup by using the script: `npm start` (Alternatively you can manually type: `.\node_modules\.bin\electron`).


## DISTRIBUTING

See "https://electron.atom.io/docs/tutorial/application-distribution/" and "https://github.com/electron-userland/electron-builder/"

1. Download and install [Yarn](https://yarnpkg.com/en/docs/install#windows-tab)
2. Open a new command prompt and navigate to the BoltBackup directory
3. Type: `yarn add electron-builder --dev`
4. Create the installer by typing: `yarn dist`

