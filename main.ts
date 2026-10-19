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

const isIndevelopment = !app.isPackaged

const isTrustedURL = (value: string) => {
    try { return new URL(value).origin === (isIndevelopment ? 'http://localhost:5173' : 'https://lhu-dashboard.vercel.app') }
    catch { return false }
}
const isTrustedSender = (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) =>
    event.sender === mainWindow?.webContents && event.senderFrame === event.sender.mainFrame && isTrustedURL(event.senderFrame.url)


let lastInteraction: number | null = null;
let lastRpcPath: string | null = null;

let currentlyLoggedInUser: string | null = null;

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
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'build', `icon.${iconExt}`)
  }
  // Nếu chạy từ development
  return path.join(__dirname, 'assets', 'build', `icon.${iconExt}`)
}

const appicon = nativeImage.createFromPath(getIconPath())
// Windows toast images use PNG; the application/tray keeps its platform icon.
const notificationIcon = nativeImage.createFromPath(path.join(
    app.isPackaged ? process.resourcesPath : __dirname, 'assets', 'build', 'icon.png'
)).resize({ width: 256, height: 256 })

const uptime = new Date()

const rpcClient = new Client({transport: "ipc"})
type RouteKey =
  "/" | "/home" | "/login" | "/schedule" | "/timetable" | "/weather" | "/toollhu" |
  "/diemdanh" | "/mark" | "/qrscan" | "/parking" | "/settings" | "*" | '/chisaAI'

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
  "/toollhu": { details: "Tool LHU", state: "⚙️" },
    "/chisaAI": { details: "Chisa AI", state: "🤖" },
  "*": { details: "Không xác định", state: "Lang thang 💀" },
}

const createNotification = (title: string, body: string): Notification => {
    const notification = new Notification({
        title: title,
        body: body,
        icon: notificationIcon
    })
    notification.on('failed', (_, error) => console.error('Notification failed:', error))
    notification.on('click', () => {
        notification.close();
        if (mainWindow) {
            if (!mainWindow.isVisible()) {
                mainWindow.show();
            } else {
                mainWindow.focus();
            }
        }
    })
    return notification;
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
    if (!rpcClient || !clientID || !config().useDiscordRpc || !rpcClient.user) return

    if (lastInteraction !== null && new Date().getTime() - lastInteraction < 15e3 && lastRpcPath === path) return

    lastRpcPath = path

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
                {label: "Truy cập LHU Dashboard", url: "https://lhu-dashboard.chisadin.site"}
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
    if (!rpcClient || !clientID || !config().useDiscordRpc || !rpcClient.user) return
    if (lastInteraction !== null && new Date().getTime() - lastInteraction < 15e3) return
    lastInteraction = new Date().getTime()
    try {

        await rpcClient.setActivity({
            details: "Không hoạt động",
            state: "Ở chế độ rảnh",
            startTimestamp: uptime,
            largeImageKey: "appicon",
            instance: false,
            buttons: [
                {label: "Truy cập LHU Dashboard", url: "https://lhu-dashboard.chisadin.site"}
            ]
        })
    } catch (error) {
        console.error('Error setting idle activity:', error);
    }
}

const loginItemSettings = app.getLoginItemSettings();

// @ts-expect-error Build xong mất type nên kệ nó đi
const DEFAULT_SETTINGS: Settings = {
    autoStart: loginItemSettings.openAtLogin || false,
    minimizeToTray: loginItemSettings.openAsHidden || false, // MacOS api deprecated so return false if undefined
    checkForUpdatesOnStart: true,
    notifyNextClassStartedSoon: true,
    minimizeOnClose: true,
    hardwareAcceleration: true,
    useDiscordRpc: true
}
// @ts-expect-error Build xong mất type nên kệ nó đi
const getConfig = (): Settings => {
    const settingsFilePath = path.join(app.getPath('userData'), "settings.json")
    // @ts-expect-error Build xong mất type nên kệ nó đi
    let settings: Partial<Settings> = {}
    
    if (existsSync(settingsFilePath)) {
        try {
            const data = readFileSync(settingsFilePath, "utf-8")
            settings = JSON.parse(data)
        } catch {
            settings = {}
        }
    }
    const mergedSettings = { ...DEFAULT_SETTINGS }
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (settings && typeof settings[key] === 'boolean') mergedSettings[key] = settings[key]
    }
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
// @ts-expect-error Build xong mất type nên kệ nó đi
const config: () => Settings = () => {return getConfig()};
// @ts-expect-error Build xong mất type nên kệ nó đi
const checkClassReminder = (classData: ScheduleItem | null) => {

    if (!classData || !config().notifyNextClassStartedSoon) return;
    console.log("Checking class reminder...");

    const classTime = new Date(classData.ThoiGianBD);

    const now = new Date();

    // Clean up notified classes that have already passed
    const classEndTime = new Date(classData.ThoiGianKT);
    if (now.getTime() > classEndTime.getTime()) {
        notifiedClasses.delete(classData.ID);
        console.log(`Class ${classData.ID} has ended, removed from notified list`);
        return;
    }

    if (now.getTime() > classTime.getTime()) {
        notifiedClasses.delete(classData.ID);
        console.log(`Class ${classData}.ID has already started, removed from notified list`);
        return;
    }

    const diffMs = classTime.getTime() - now.getTime();
    const diffMinutes = diffMs / (60 * 1000);

    // Chỉ nhắc trong 30 phút trước giờ học.
    if (diffMinutes <= remindBeforeMinutes && diffMinutes > 0 && !notifiedClasses.has(classData.ID)) {
        console.log("Sending class reminder notification...");
        createNotification(
            `Sắp đến tiết học ${classData.TenMonHoc}!`,
            `Tiết học ${classData.TenMonHoc} sẽ bắt đầu sau ${StartAfter(classData.ThoiGianBD) || '1 giây'} tại phòng ${classData.TenPhong}, ${classData.TenCoSo}.`
        ).show();
        notifiedClasses.add(classData.ID);
        console.log(`Class ${classData.ID} notified and added to tracking`);
    }
}
// @ts-expect-error Build xong mất type nên kệ nó đi
const fetchNextClassAndCheck = async (data: User | null) => {
    try {
        const payload = { studentID: data?.UserID ?? currentlyLoggedInUser };
        console.log("Payload:", payload);

        if (data === null && currentlyLoggedInUser === null) {
            console.log("No user data available, skipping fetch.");
            return;
        }
        if (data !== null) {
            currentlyLoggedInUser = data.UserID;
        }


        const res = await fetch(`https://calenapi.chisadin.site/next-class`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeout: 15_000,
        });

        if (!res.ok) {
        console.error("Fetch failed:", res.statusText);
        return;
        }
        // @ts-expect-error Build xong mất type nên kệ nó đi
        const next_class: ScheduleItem = await res.json();

        if (payload.studentID === currentlyLoggedInUser) checkClassReminder(next_class);
  } catch (err) {
    console.error("Error fetching next class:", err);
  }
}
// @ts-expect-error Build xong mất type nên kệ nó đi
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
        try {
            if (['https:', 'http:', 'mailto:'].includes(new URL(url).protocol)) void shell.openExternal(url).catch(console.error)
        } catch { /* Ignore malformed URLs. */ }
        return {action: "deny"}
    })

    win.webContents.on('will-navigate', (event, url) => {
        if (!isTrustedURL(url)) event.preventDefault()
    })
    win.webContents.on('will-redirect', (event, url) => {
        if (!isTrustedURL(url)) event.preventDefault()
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
        if (!config().minimizeOnClose) {
            if (process.platform !== "darwin") {
                app.quit()
            }
            return
        }
        e.preventDefault()
        win.hide()
        createNotification(
            "LHU Dashboard",
            "Ứng dụng đang chạy dưới nền"
        ).show();
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
    if (!isIndevelopment) {
        win.setMenu(null)
        win.loadURL("https://lhu-dashboard.vercel.app")
    }
    else {
        win.loadURL("http://localhost:5173") // dev
    }

    return win

}

// Handle IPC
const handleIPC = (channel: string, listener: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any) => {
    ipcMain.handle(channel, (event, ...args) => {
        if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender')
        if (channel.startsWith('set') && (args.length !== 1 || typeof args[0] !== 'boolean')) throw new Error('Expected boolean setting')
        return listener(event, ...args)
    })
}


handleIPC("setAutoStart", (_, bool: boolean) => {
    // lưu setting
    updateConfig({autoStart: bool})
    console.log(`AutoStart set to: ${bool}`)
    app.setLoginItemSettings({ openAtLogin: bool }); // bật/tắt autostart
});

handleIPC("getSettings", () => {
    return getConfig();
});

handleIPC("setMinimizeToTray", (_, bool: boolean) => {
    updateConfig({minimizeToTray: bool})
    console.log(`MinimizeToTray set to: ${bool}`)
    app.setLoginItemSettings({ openAsHidden: bool });
});

handleIPC("setCheckForUpdatesOnStart", (_, bool: boolean) => {
    updateConfig({checkForUpdatesOnStart: bool})
    console.log(`CheckForUpdatesOnStart set to: ${bool}`)
});

handleIPC("setNotifyNextClassStartedSoon", (_, bool: boolean) => {
    updateConfig({notifyNextClassStartedSoon: bool})
    if (bool && !reminderCheckerInterval) {
        createReminderChecker();
    }
    if (!bool && reminderCheckerInterval) {
        clearReminderChecker();
    }
    console.log(`NotifyNextClassStartedSoon set to: ${bool}`)
});

handleIPC("setMinimizeOnClose", (_, bool: boolean) => {
    updateConfig({minimizeOnClose: bool})
    console.log(`MinimizeOnClose set to: ${bool}`)
});

handleIPC("setHardwareAcceleration", (_, bool: boolean) => {
    updateConfig({hardwareAcceleration: bool})
    console.log(`HardwareAcceleration set to: ${bool}`)
});
// @ts-expect-error Build xong mất type nên kệ nó đi
ipcMain.on("send-localstorage", async (event, data: User | null) => {
  if (!isTrustedSender(event)) return;
  if (data !== null && (typeof data !== 'object' || typeof data.UserID !== 'string' || !data.UserID.trim())) return;
//   console.log("LocalStorage data from React:", data);
  if (data === null) {
    currentlyLoggedInUser = null;
    notifiedClasses.clear();
    console.log("Skipping class reminder check, no user data.");
    return;
  };

    await fetchNextClassAndCheck(data);
});

handleIPC("restartApp", () => {
    app.relaunch();
    app.exit(0);
});

handleIPC('userLoggedOff', () => {
    currentlyLoggedInUser = null;
    notifiedClasses.clear();
    console.log("User logged off, cleared currentlyLoggedInUser");
});

handleIPC("setUseDiscordRpc", (_, bool: boolean) => {
    updateConfig({useDiscordRpc: bool})
    console.log(`UseDiscordRpc set to: ${bool}`)
    if (bool && !rpcIntervalTask) {
        createRpcClient();
    }
    if (!bool && rpcIntervalTask) {
        cancelRpcClient();
    }
});


// Quản lý mấy cái cron

let reminderCheckerInterval: NodeJS.Timeout | undefined;

const createReminderChecker = () => {
    if (reminderCheckerInterval) return;
    reminderCheckerInterval = setInterval(() => {
        if (mainWindow) {
            if (currentlyLoggedInUser === null) {
                mainWindow.webContents.send("get-localstorage");
            }
            fetchNextClassAndCheck(null);
        }
    }, 60_000);
}

const clearReminderChecker = () => {
    if (reminderCheckerInterval) {
        clearInterval(reminderCheckerInterval);
        reminderCheckerInterval = undefined;
    }
}

let rpcIntervalTask: NodeJS.Timeout | undefined;

const createRpcClient = () => {
    if (rpcIntervalTask) return;
    lastInteraction = null;
    rpcIntervalTask = setInterval(() => {
        if (!rpcClient || !config().useDiscordRpc) return

        if (!rpcClient.user) {
            // The client is not logged in, attempt to log in again
            rpcClient.login({ clientId: clientID }).catch(console.error)
        }
        if (lastInteraction === null || new Date().getTime() - lastInteraction >= 15e3) {
            if (mainWindow && mainWindow.isVisible()) {
                const url = new URL(mainWindow.webContents.getURL())
                const path = url.pathname
                setActivity(path)
            } else {
                setActivityIdle()
            }
        }
}, 15_000);
}

const cancelRpcClient = () => {
    if (rpcIntervalTask) {
        clearInterval(rpcIntervalTask)
        rpcIntervalTask = undefined
        if (rpcClient.user) void rpcClient.clearActivity().catch(console.error)
    }
}

// Mấy cái dưới này để quản lý vòng đời của app

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
        
    if (!config().hardwareAcceleration) {
        app.disableHardwareAcceleration()
    }

    app.on("second-instance", () => {
        if (!mainWindow) return
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
    })

    app.whenReady().then(() => {

        if (config().checkForUpdatesOnStart) {
            autoUpdater.checkForUpdatesAndNotify()
        }

        if (config().useDiscordRpc) rpcClient.login({ clientId: clientID }).catch(console.error)

        app.setLoginItemSettings({
            openAtLogin: config().autoStart,
            openAsHidden: config().minimizeToTray
        })

        mainWindow = createWindow()

        mainWindow.webContents.on("did-finish-load", () => {
            if (config().notifyNextClassStartedSoon) {
                mainWindow?.webContents.send("get-localstorage");
                createReminderChecker();
            }
        });

        if (config().useDiscordRpc) {
            createRpcClient();
        }        

    })
}



// Must match electron-builder's appId and the installed Start Menu shortcut.
app.setAppUserModelId("com.chisadinchan.lhudashboard");


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
