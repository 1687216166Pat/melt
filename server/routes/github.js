const express = require("express");
const router = express.Router();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "1687216166Pat";
const REPO_NAME = "melt";

// 辅助函数：调用 GitHub API
async function githubFetch(path, options = {}) {
  const url = `https://api.github.com${path}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Melt-Agent",
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

// 获取文件树
router.get("/tree", async (req, res) => {
  try {
    const { path = "", branch = "main" } = req.query;
    const data = await githubFetch(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${branch}`,
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 读取文件内容
router.get("/file", async (req, res) => {
  try {
    const { path, branch = "main" } = req.query;
    if (!path) return res.status(400).json({ error: "path required" });
    const data = await githubFetch(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${branch}`,
    );
    const content = Buffer.from(data.content, "base64").toString("utf-8");
    res.json({ path, content, sha: data.sha });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 创建或更新文件
router.post("/commit", async (req, res) => {
  try {
    const { path, content, message, sha, branch = "main" } = req.body;
    if (!path || !content || !message) {
      return res.status(400).json({ error: "path, content, message required" });
    }
    const encoded = Buffer.from(content).toString("base64");
    const body = { message, content: encoded, branch };
    if (sha) body.sha = sha; // 更新已有文件需要 sha
    const data = await githubFetch(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 创建分支
router.post("/branch", async (req, res) => {
  try {
    const { name, from = "main" } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const ref = await githubFetch(
      `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${from}`,
    );
    const sha = ref.object.sha;
    const data = await githubFetch(
      `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
      {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${name}`, sha }),
      },
    );
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
