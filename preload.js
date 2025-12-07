const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  isElectron: true,
  setAutoStart: (enabled) => ipcRenderer.invoke("setAutoStart", enabled),
  getSettings: () => ipcRenderer.invoke("getSettings"),
  setMinimizeToTray: (enabled) => ipcRenderer.invoke("setMinimizeToTray", enabled),
  setCheckForUpdatesOnStart: (enabled) => ipcRenderer.invoke("setCheckForUpdatesOnStart", enabled),
  onGetLocalStorage: () => {
    ipcRenderer.on("get-localstorage", () => {
      try {
        const dataStr = localStorage.getItem("auth_user");
        const data = dataStr ? JSON.parse(dataStr) : null;
        ipcRenderer.send("send-localstorage", data);
      } catch (error) {
        console.error("Error parsing localStorage:", error);
        ipcRenderer.send("send-localstorage", null);
      }
    });
  },
});
