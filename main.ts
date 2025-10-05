import { app, BrowserWindow, nativeImage, shell } from "electron"
import updater from "electron-updater"
const autoUpdater = updater.autoUpdater

const appicon = nativeImage.createFromPath("./assets/build/icon.png")
const createWindow = () => {

    const win = new BrowserWindow({
        title: "LHU Dashboard",
        width: 1280,
        height: 790,
        icon: appicon
    })

    // đừng mở link trong app pls 🙏🙏

    win.webContents.setWindowOpenHandler(({url}) => {
        shell.openExternal(url)
        return {action: "deny"}
    })

    autoUpdater.checkForUpdatesAndNotify()
    
    win.setMenu(null)
    win.loadURL("https://lhu-dashboard.vercel.app")
}

// Mấy cái dưới này để quản lý vòng đời của app, docs của electron bảo v 🐧🐧

app.whenReady().then(() => {
    createWindow()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall()
})


app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        console.log("See yaaa!")
        app.quit()
    }
}
)