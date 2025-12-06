import { app, BrowserWindow, nativeImage, shell, Tray, Menu, Notification, ipcMain } from "electron"

import updater from "electron-updater" 

import path from "path";
import fetch from "node-fetch";
import { writeFileSync, readFileSync, existsSync } from "fs";


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
  "/settings": { details: "Cài đặt", state: "🛠️" },
  "*": { details: "Không xác định", state: "Lang thang 💀" },
}

const remindBeforeMinutes = 30;

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

const getConfig = (): Settings => {
    const settingsFilePath = path.join(app.getPath('userData'), "settings.json")
    if (!existsSync(settingsFilePath)) {
        writeFileSync(settingsFilePath, JSON.stringify({
            autoStart: false,
            minimizeToTray: true
        }))
        return {
            autoStart: false,
            minimizeToTray: true
        }
    }
    const data = readFileSync(settingsFilePath, "utf-8")
    return JSON.parse(data) as Settings
}

const checkClassReminder = (classData: ScheduleItem | null) => {

    if (!classData) return;

    console.log("Checking class reminder...");

    const classTime = new Date(classData.ThoiGianBD);
    const remindTime = new Date(classTime.getTime() - remindBeforeMinutes * 60 * 1000);

    const now = new Date();

    const diffMs = remindTime.getTime() - now.getTime(); // còn bao nhiêu ms đến remindTime
    const diffMinutes = diffMs / (60 * 1000);

    // nếu còn ≤30 phút nhưng chưa qua thời gian remindTime
    if (diffMinutes <= 30) {
        console.log("Sending class reminder notification...");
        new Notification({
            title: `Sắp đến tiết học ${classData.TenMonHoc}!`,
            body: `Tiết học ${classData.TenMonHoc} sẽ bắt đầu lúc ${classTime.toLocaleTimeString()} tại phòng ${classData.TenPhong}, ${classData.TenCoSo}.`,
        }).show();
    }
}

const updateConfig = (newConfig: Partial<Settings>) => {
    const currentConfig = getConfig()
    const updatedConfig = {...currentConfig, ...newConfig}
    const settingsFilePath = path.join(app.getPath('userData'), "settings.json")
    writeFileSync(settingsFilePath, JSON.stringify(updatedConfig, null, 4))
}

const createWindow = () => {


    const win = new BrowserWindow({
        title: "LHU Dashboard",
        width: 1280,
        height: 790,
        icon: appicon.resize({width: 256, height: 256}),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.resolve(process.cwd(), "preload.js")
        }
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

    win.on("close", (e) => {
        e.preventDefault()
        win.hide()
        new Notification({
            title: "LHU Dashboard",
            body: "Ứng dụng đang chạy dưới nền",
            icon: appicon
        }).show();
    })
    const tray = new Tray(appicon)
    const contextMenu = Menu.buildFromTemplate([
        {label: "Mở lại ứng dụng", click: () => win.show()},
        {label: "Thoát Ứng dụng", click: () => app.exit()}
    ])
    tray.setToolTip("LHU Dashboard")
    tray.setContextMenu(contextMenu
    )
    tray.on("double-click", () => {
        win.isVisible() ? win.hide() : win.show()
    })

    autoUpdater.checkForUpdatesAndNotify()
    
    // win.setMenu(null)
    // win.loadURL("https://lhu-dashboard.vercel.app")
    win.loadURL("http://localhost:5173") // dev

    return win

}

// Handle IPC 

ipcMain.handle("setAutoStart", (_, bool: boolean) => {
    // lưu setting
    updateConfig({autoStart: bool})
    console.log(`AutoStart set to: ${bool}`)
    app.setLoginItemSettings({ openAtLogin: bool }); // bật/tắt autostart
});

ipcMain.handle("getSettings", () => {
    return getConfig();
});

ipcMain.handle("setMinimizeToTray", (_, bool: boolean) => {
    updateConfig({minimizeToTray: bool})
    console.log(`MinimizeToTray set to: ${bool}`)
});

ipcMain.on("send-localstorage", async (event, data: User | null) => {
//   console.log("LocalStorage data from React:", data);
  if (data === null) {
    console.log("Skipping class reminder check, no user data.");
    return;
  };

  


  try {
    const payload = { studentID: data.UserID }; // just this
    console.log("Payload:", payload);
    const res = await fetch(`http://localhost:3000/next-class`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Fetch failed:", res.statusText);
      return;
    }

    const next_class: ScheduleItem = await res.json();

    checkClassReminder(next_class);
  } catch (err) {
    console.error("Error fetching next class:", err);
  }
});


// Mấy cái dưới này để quản lý vòng đời của app

const config: Settings = getConfig()

app.whenReady().then(() => {

    rpcClient.login({ clientId: clientID }).catch(console.error)

    app.setLoginItemSettings({
        openAtLogin: config.autoStart,
        openAsHidden: config.minimizeToTray
    })

    const win = createWindow()

    // This not works as expected
    win.webContents.on("did-finish-load", () => {
        win.webContents.send("get-localstorage"); // now it will actually reach the renderer
        setInterval(() => {
            win.webContents.send("get-localstorage")
        }, 60_000)
    });

})



app.setAppUserModelId("LHU Dashboard");


app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall()
})
