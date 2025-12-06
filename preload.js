const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    isElectron: true,
    setAutoStart: (bool) => ipcRenderer.invoke("setAutoStart", bool),
    getSettings: () => ipcRenderer.invoke("getSettings"),
    setAutoStart: (enabled) => ipcRenderer.invoke("setAutoStart", enabled),
    setMinimizeToTray: (enabled) => ipcRenderer.invoke("setMinimizeToTray", enabled)
});
