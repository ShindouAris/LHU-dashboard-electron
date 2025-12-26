const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  // Variables
  isElectron: true,
  
  // Methods
  getSettings: () => ipcRenderer.invoke("getSettings"),
  forceRestartApp: () => ipcRenderer.invoke("restartApp"),
  loggedOffUser: () => ipcRenderer.invoke('userLoggedOff'),
  
  // Functions to set individual settings
  setAutoStart: (enabled) => ipcRenderer.invoke("setAutoStart", enabled),
  setCheckForUpdatesOnStart: (enabled) => ipcRenderer.invoke("setCheckForUpdatesOnStart", enabled),
  setMinimizeToTray: (enabled) => ipcRenderer.invoke("setMinimizeToTray", enabled),
  setNotifyNextClassStartedSoon: (enabled) => ipcRenderer.invoke("setNotifyNextClassStartedSoon", enabled),
  setMinimizeOnClose: (enabled) => ipcRenderer.invoke("setMinimizeOnClose", enabled),
  setHardwareAcceleration: (enabled) => ipcRenderer.invoke("setHardwareAcceleration", enabled),
  setUseDiscordRpc: (enabled) => ipcRenderer.invoke("setUseDiscordRpc", enabled),

  // Callbacks
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
