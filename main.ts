import { app, BrowserWindow, nativeImage, shell } from "electron"
import updater from "electron-updater" 
const autoUpdater = updater.autoUpdater

import { Client } from "discord-rpc"

const clientID = "1446675403581292706"

const appicon = nativeImage.createFromPath("./assets/build/icon.png")

const uptime = new Date()

const rpcClient = new Client({transport: "ipc"})
type RouteKey =
  "/" | "/home" | "/login" | "/schedule" | "/timetable" | "/weather" |
  "/diemdanh" | "/mark" | "/qrscan" | "/parking" | "/settings" | "*"

const routeRPCMap: Record<RouteKey, { details: string; state: string }> = {
  "/": { details: "Trang chính", state: "Dashboard" },
  "/home": { details: "Trang chính", state: "Dashboard" },
  "/login": { details: "Đăng nhập", state: "Xin quyền truy cập" },
  "/schedule": { details: "Thời khóa biểu", state: "📅" },
  "/timetable": { details: "Thời khóa biểu chi tiết", state: "📘" },
  "/weather": { details: "Thời tiết", state: "🌤" },
  "/diemdanh": { details: "Điểm danh", state: "🟢" },
  "/mark": { details: "Xem điểm", state: "📊" },
  "/qrscan": { details: "Quét QR", state: "📷" },
  "/parking": { details: "Gửi xe", state: "🅿" },
  "/settings": { details: "Cài đặt", state: "⚙" },
  "*": { details: "Không xác định", state: "Lang thang 💀" },
}


rpcClient.on("ready", () => {
    console.log(`Client ${clientID} ready`);

})

rpcClient.on("disconnected", () => {
    console.log(`Client ${clientID} disconnected`);
    
})

const setActivity = (path: string) => {
    if (!rpcClient || !clientID) return

    const key = (routeRPCMap[path as RouteKey] ? path : "*") as RouteKey
    const data = routeRPCMap[key]

    try {

        rpcClient.setActivity({
            details: data.details || "Đang xem lịch học",
            state: data.state || "Đang xem lịch học",
            startTimestamp: uptime,
            largeImageKey: "appicon",
            instance: true,
            buttons: [
                {label: "Truy cập LHU Dashboard", "url": "https://lhu-dashboard.chisadin.site"}
            ]
        }).then(() => {
            console.log(`Updated RPC: ${path}`)
        }).catch((error) => {
            console.error('Error setting activity:', error);
        })

    } catch (error) {
        console.error('Error setting activity:', error);
    }
}
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

    rpcClient.on("ready", () => {
        console.log(`RPC connected: ${rpcClient.user?.username}`)
        setActivity("/") 
    })

    win.webContents.on("did-navigate-in-page", (e, url) => {
        
        const path = new URL(url).pathname
        setActivity(path)
    })

    autoUpdater.checkForUpdatesAndNotify()
    
    win.setMenu(null)
    win.loadURL("https://lhu-dashboard.vercel.app")
}

// Mấy cái dưới này để quản lý vòng đời của app, docs của electron bảo v 🐧🐧

app.whenReady().then(() => {
    rpcClient.login({ clientId: clientID }).catch(console.error)
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