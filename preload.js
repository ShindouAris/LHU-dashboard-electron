const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    isElectron: true,
    setAutoStart: (bool) => ipcRenderer.invoke("setAutoStart", bool),
    getSettings: () => ipcRenderer.invoke("getSettings"),
    setAutoStart: (enabled) => ipcRenderer.invoke("setAutoStart", enabled),
    setMinimizeToTray: (enabled) => ipcRenderer.invoke("setMinimizeToTray", enabled),
    onGetLocalStorage: () => {
    ipcRenderer.on("get-localstorage", () => {
      const dataStr = localStorage.getItem("auth_user");
      const data = JSON.parse(dataStr);
      ipcRenderer.send("send-localstorage", data);
    });
  },
});
