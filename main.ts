import { app, BrowserWindow, nativeImage, shell, Tray, Menu, Notification, ipcMain, dialog } from "electron"

import updater from "electron-updater" 
import path from "path";
import fetch from "node-fetch";
import { parseISO } from "date-fns";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";

// Xử lý __dirname trong ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const autoUpdater = updater.autoUpdater

import { Client } from "discord-rpc"

const clientID = "1446675403581292706"

let lastInteraction: number | null = null;

// Sử dụng __dirname để đảm bảo icon được tải đúng trong production
const getIconPath = () => {
  // Chọn định dạng icon phù hợp với OS
  let iconExt = 'png'
  if (process.platform === 'win32') {
    iconExt = 'ico'
  } else if (process.platform === 'darwin') {
    iconExt = 'icns'
  }

  // Kiểm tra nếu chạy từ packaged app (ASAR)
  if (process.resourcesPath?.includes('app.asar')) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'build', `icon.${iconExt}`)
  }
  // Nếu chạy từ development
  return path.join(__dirname, 'assets', 'build', `icon.${iconExt}`)
}

const appicon = nativeImage.createFromPath(getIconPath())

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

// Track notified classes to prevent spam
const notifiedClasses = new Set<number>();

rpcClient.on("ready", () => {
    console.log(`Client ${clientID} ready`);

})

rpcClient.on("disconnected", () => {
    console.log(`Client ${clientID} disconnected`);
    
})

const setActivity = async (path: string) => {
    if (!rpcClient || !clientID) return

    if (lastInteraction !== null && new Date().getTime() - lastInteraction < 15e3) return

    lastInteraction = new Date().getTime()

    const key = (routeRPCMap[path as RouteKey] ? path : "*") as RouteKey
    const data = routeRPCMap[key]

    try {

        rpcClient.setActivity({
            details: data.details || "Đang xem lịch học",
            state: data.state || "Đang xem lịch học",
            startTimestamp: uptime,
            largeImageKey: "appicon",
            instance: false,
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

const setActivityIdle = async () => {
    if (!rpcClient || !clientID) return
    if (lastInteraction !== null && new Date().getTime() - lastInteraction < 15e3) return
    lastInteraction = new Date().getTime()
    try {

        rpcClient.setActivity({
            details: "Không hoạt động",
            state: "Ở chế độ rảnh",
            startTimestamp: new Date(),
            largeImageKey: "appicon",
            instance: false,
            buttons: [
                {label: "Truy cập LHU Dashboard", "url": "https://lhu-dashboard.chisadin.site"}
            ]
        })
    } catch (error) {
        console.error('Error setting idle activity:', error);
    }
}

const DEFAULT_SETTINGS: Settings = {
    autoStart: false,
    minimizeToTray: true,
    checkForUpdatesOnStart: true,
}

const getConfig = (): Settings => {
    const settingsFilePath = path.join(app.getPath('userData'), "settings.json")

    let settings: Partial<Settings> = {}
    
    if (existsSync(settingsFilePath)) {
        try {
            const data = readFileSync(settingsFilePath, "utf-8")
            settings = JSON.parse(data)
        } catch {
            settings = {}
        }
    }

    const mergedSettings: Settings = { ...DEFAULT_SETTINGS, ...settings }

    writeFileSync(settingsFilePath, JSON.stringify(mergedSettings, null, 2))

    return mergedSettings
}

export const StartAfter = (dateString: string): string | null => {
  try {
    const now = new Date()
    const date = parseISO(dateString)
    if (date <= now) return null

    const diffMs = date.getTime() - now.getTime()
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

    let result = ''
    if (days > 0) result += `${days} ngày `
    if (hours > 0) result += `${hours} giờ `
    if (minutes > 0) result += `${minutes} phút `
    if (seconds > 0) result += `${seconds} giây`

    return result.trim() || '1 giây'
  } catch {
    return null
  }
}

const checkClassReminder = (classData: ScheduleItem | null) => {

    if (!classData) return;

    console.log("Checking class reminder...");

    const classTime = new Date(classData.ThoiGianBD);
    const remindTime = new Date(classTime.getTime() - remindBeforeMinutes * 60 * 1000);

    const now = new Date();

    // Clean up notified classes that have already passed
    const classEndTime = new Date(classData.ThoiGianKT);
    if (now.getTime() > classEndTime.getTime()) {
        notifiedClasses.delete(classData.ID);
        console.log(`Class ${classData.ID} has ended, removed from notified list`);
        return;
    }

    const diffMs =  remindTime.getTime() - now.getTime(); // còn bao nhiêu ms đến remindTime
    const diffMinutes = diffMs / (60 * 1000);

    // nếu còn ≤30 phút nhưng chưa qua thời gian remindTime và chưa thông báo
    if (diffMinutes <= 30 && !notifiedClasses.has(classData.ID)) {
        console.log("Sending class reminder notification...");
        new Notification({
            title: `Sắp đến tiết học ${classData.TenMonHoc}!`,
            body: `Tiết học ${classData.TenMonHoc} sẽ bắt đầu sau ${StartAfter(classData.ThoiGianBD) || '1 giây'} tại phòng ${classData.TenPhong}, ${classData.TenCoSo}.`,
            icon: appicon
        }).show();
        notifiedClasses.add(classData.ID);
        console.log(`Class ${classData.ID} notified and added to tracking`);
    }
}

const updateConfig = (newConfig: Partial<Settings>) => {
    const currentConfig = getConfig()
    const updatedConfig = {...currentConfig, ...newConfig}
    const settingsFilePath = path.join(app.getPath('userData'), "settings.json")
    writeFileSync(settingsFilePath, JSON.stringify(updatedConfig, null, 4))
}

let mainWindow: BrowserWindow | null = null

const createWindow = () => {

    const win = new BrowserWindow({
        title: "LHU Dashboard",
        width: 1280,
        height: 790,
        icon: appicon.resize({width: 256, height: 256}),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(app.isPackaged ? process.resourcesPath : __dirname, "preload.js")
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
        setActivityIdle();
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

    win.setMenu(null)
    win.loadURL("https://lhu-dashboard.vercel.app")

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

ipcMain.handle("setCheckForUpdatesOnStart", (_, bool: boolean) => {
    updateConfig({checkForUpdatesOnStart: bool})
    console.log(`CheckForUpdatesOnStart set to: ${bool}`)
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
    const res = await fetch(`https://calenapi.chisadin.site/next-class`, {
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
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    app.on("second-instance", () => {
        if (!mainWindow) return
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
    })

    app.whenReady().then(() => {

        if (config.checkForUpdatesOnStart) {
            autoUpdater.checkForUpdatesAndNotify()
        }

        rpcClient.login({ clientId: clientID }).catch(console.error)

        app.setLoginItemSettings({
            openAtLogin: config.autoStart,
            openAsHidden: config.minimizeToTray
        })

        mainWindow = createWindow()

        mainWindow.webContents.on("did-finish-load", () => {
            mainWindow?.webContents.send("get-localstorage");
            setInterval(() => {
                mainWindow?.webContents.send("get-localstorage")
            }, 60_000)
        });

    })
}



app.setAppUserModelId("LHU Dashboard");


app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow()
  }
})

autoUpdater.on("update-downloaded", (info) => {
    const win = BrowserWindow.getFocusedWindow()

    const choice = dialog.showMessageBoxSync(win!, {
        type: 'question',
        buttons: ['Cập nhật ngay', 'Để sau'],
        defaultId: 0,
        cancelId: 1,
        title: 'Đã có bản cập nhật',
        message: `Phiên bản ${info.version} đã được tải về và sẵn sàng để cài đặt, bạn có muốn cập nhật ngay bây giờ không?`,
        detail: 'Ứng dụng sẽ tự động khởi động lại sau khi cập nhật.'
    })

    if (choice === 0) {
        autoUpdater.quitAndInstall()
    }

})
