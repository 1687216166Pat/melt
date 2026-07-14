// src/utils/mediaDb.js

// 数据库名称保持一致或使用新的，这里我们用个更通用的名字
const DB_NAME = "MeltAppDB";
// 关键：版本号必须增加！这样 onupgradeneeded 才会触发
const DB_VERSION = 2;

// 统一管理所有的 "表" (Object Store)
const STORES = {
  // 沿用你旧的图片存储逻辑，但现在它只是众多表中的一个
  message_images: "message_images",
  // 新增的表
  local_memories: "local_memories",
  local_fragments: "local_fragments",
  local_arcs: "local_arcs",
  local_timeline: "local_timeline",
};

let db = null;

/**
 * 初始化并打开 IndexedDB 数据库。
 * 这是所有操作的入口。
 * @returns {Promise<IDBDatabase>} 数据库实例
 */
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject("IndexedDB 初始化失败");
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log("IndexedDB database opened successfully.");
      resolve(db);
    };

    // 只有在 DB_VERSION 增加时才会触发
    request.onupgradeneeded = (event) => {
      console.log("Upgrading IndexedDB...");
      const tempDb = event.target.result;

      // 遍历我们定义的所有 STORES，如果不存在就创建它
      Object.values(STORES).forEach((storeName) => {
        if (!tempDb.objectStoreNames.contains(storeName)) {
          const store = tempDb.createObjectStore(storeName, {
            // 智能判断主键：大部分我们用自增ID，图片用你之前的 id
            keyPath: storeName === STORES.message_images ? "id" : "id",
            autoIncrement: storeName !== STORES.message_images,
          });

          // 为特定表创建索引，用于未来高效查询
          if (storeName === STORES.local_fragments) {
            store.createIndex("heatIndex", "heat", { unique: false });
          }
          if (storeName === STORES.local_timeline) {
            store.createIndex("dateIndex", "date", { unique: false });
          }
        }
      });
      console.log("IndexedDB upgrade complete.");
    };
  });
}

// --- 通用 CRUD API ---

/**
 * 通用方法：获取一条数据
 * @param {string} storeName - 表名
 * @param {any} key - 主键
 * @returns {Promise<object|null>} 数据对象或 null
 */
async function get(storeName, key) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 通用方法：获取一个表的所有数据
 * @param {string} storeName - 表名
 * @returns {Promise<Array<object>>}
 */
async function getAll(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 通用方法：添加或更新一条数据 (put = add or update)
 * @param {string} storeName - 表名
 * @param {object} data - 要存的数据
 * @returns {Promise<any>} 主键
 */
async function put(storeName, data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    // 自动添加/更新时间戳
    const dataToStore = { ...data, updatedAt: new Date().toISOString() };
    if (!data.createdAt) {
      dataToStore.createdAt = new Date().toISOString();
    }
    const request = store.put(dataToStore);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 通用方法：删除一条数据
 * @param {string} storeName - 表名
 * @param {any} key - 主键
 * @returns {Promise<void>}
 */
async function remove(storeName, key) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 通用方法：清空一个表
 * @param {string} storeName - 表名
 * @returns {Promise<void>}
 */
async function clear(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

// 导出所有方法，并额外导出一个 STORES 常量方便外部使用
export { STORES, initDB, get, getAll, put, remove, clear };
