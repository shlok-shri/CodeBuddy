import { WebContainer } from '@webcontainer/api';

let webContainerInstance = null

export const getWebContainer = async () => {
  try {
    if (webContainerInstance === null) {
      console.log("Booting WebContainer...");
      webContainerInstance = await WebContainer.boot();
      console.log("Booted:", webContainerInstance);
    }
    return webContainerInstance;
  } catch (err) {
    console.error("Error in getWebContainer:", err);
    throw err;
  }
};
