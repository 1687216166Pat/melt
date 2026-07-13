import { openDB } from "idb";

const dbPromise = openDB("melt-media", 1, {
  upgrade(db) {
    db.createObjectStore("images");
  },
});

export const mediaStore = {
  async saveImage(id, base64) {
    return (await dbPromise).put("images", base64, id);
  },
  async getImage(id) {
    return (await dbPromise).get("images", id);
  },
  async clear() {
    return (await dbPromise).clear("images");
  },
};
