import { app, BrowserWindow, nativeImage } from "electron"

const appicon = nativeImage.createFromPath("./assets/appicon.jpg")
const createWindow = () => {

    const win = new BrowserWindow({
        title: "LHU Dashboard",
        width: 1280,
        height: 725,
        icon: appicon
    })
    
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


app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        console.log("See yaaa!")
        app.quit()
    }
}
)