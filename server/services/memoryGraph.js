const { getDB } = require("../db/index");

// 提取关键词（简单版：分词 + 停用词过滤）
function extractKeywords(text) {
  const stopWords = new Set([
    "的",
    "了",
    "是",
    "在",
    "我",
    "你",
    "他",
    "她",
    "它",
    "们",
    "这",
    "那",
    "有",
    "和",
    "就",
    "不",
    "都",
    "而",
    "及",
    "与",
    "着",
    "之",
    "一",
    "个",
    "中",
    "大",
    "为",
    "上",
    "以",
    "到",
  ]);

  // 简单分词（2-4字词）
  const keywords = [];
  for (let len = 4; len >= 2; len--) {
    for (let i = 0; i <= text.length - len; i++) {
      const word = text.slice(i, i + len);
      if (!stopWords.has(word) && /[\u4e00-\u9fa5]{2,}/.test(word)) {
        keywords.push(word);
      }
    }
  }

  // 去重 + 取前10个
  return [...new Set(keywords)].slice(0, 10);
}

// 从记忆碎片创建图节点
async function buildMemoryGraph(personaId) {
  const db = getDB();

  // 获取所有记忆碎片
  const { data: fragments } = await db
    .from("memory_fragments")
    .select("*")
    .eq("persona_id", personaId)
    .order("created_at", { ascending: false });

  if (!fragments || fragments.length === 0) return;

  // 清空旧图
  await db.from("memory_graph").delete().eq("persona_id", personaId);

  // 为每个碎片创建节点
  for (const frag of fragments) {
    const keywords = extractKeywords(frag.content);
    const importance = frag.importance || 5;

    await db.from("memory_graph").insert({
      persona_id: personaId,
      content: frag.content,
      keywords,
      importance,
      source_type: "fragment",
      source_id: frag.id,
      linked_ids: [],
    });
  }

  // 构建关联（关键词重合 >= 2 就连接）
  const { data: nodes } = await db
    .from("memory_graph")
    .select("*")
    .eq("persona_id", personaId);

  for (const node of nodes) {
    const linked = [];
    for (const other of nodes) {
      if (node.id === other.id) continue;
      const overlap = node.keywords.filter((k) =>
        other.keywords.includes(k),
      ).length;
      if (overlap >= 2) {
        linked.push(other.id);
      }
    }
    if (linked.length > 0) {
      await db
        .from("memory_graph")
        .update({ linked_ids: linked })
        .eq("id", node.id);
    }
  }
}

// 搜索记忆（关键词匹配）
async function searchMemory(personaId, query, limit = 10) {
  const db = getDB();
  const keywords = extractKeywords(query);

  if (keywords.length === 0) return [];

  // 用 PostgreSQL 的 && (数组重叠) 运算符
  const { data } = await db
    .from("memory_graph")
    .select("*")
    .eq("persona_id", personaId)
    .filter("keywords", "ov", keywords)
    .order("importance", { ascending: false })
    .limit(limit);

  return data || [];
}

// 获取节点详情 + 邻居
async function getMemoryNode(nodeId) {
  const db = getDB();
  const { data: node } = await db
    .from("memory_graph")
    .select("*")
    .eq("id", nodeId)
    .limit(1);

  if (!node || node.length === 0) return null;

  const n = node[0];
  const { data: neighbors } = await db
    .from("memory_graph")
    .select("*")
    .in("id", n.linked_ids || []);

  return { ...n, neighbors: neighbors || [] };
}

// 获取全图（用于可视化）
async function getFullGraph(personaId) {
  const db = getDB();
  const { data: nodes } = await db
    .from("memory_graph")
    .select("*")
    .eq("persona_id", personaId)
    .order("importance", { ascending: false });

  return nodes || [];
}

module.exports = {
  buildMemoryGraph,
  searchMemory,
  getMemoryNode,
  getFullGraph,
  extractKeywords,
};
