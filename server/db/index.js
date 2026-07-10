const { Pool } = require("pg");

let pool;

function initDB() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool.on("error", (err) => {
    console.error("数据库连接池错误:", err.message);
  });
  console.log("Neon 数据库连接完成");
}

// ===== 兼容层：模拟 Supabase SDK 的链式调用 =====
class QueryBuilder {
  constructor(pool, table) {
    this.pool = pool;
    this.table = table;
    this._select = "*";
    this._filters = [];
    this._order = null;
    this._limit = null;
    this._values = [];
    this._operation = "select";
    this._insertData = null;
    this._updateData = null;
    this._upsertData = null;
    this._upsertConflict = null;
    this._countExact = false;
  }

  select(fields, opts) {
    if (opts && opts.count === "exact") this._countExact = true;
    this._select = fields || "*";
    this._operation = "select";
    return this;
  }

  insert(data) {
    this._operation = "insert";
    this._insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data) {
    this._operation = "update";
    this._updateData = data;
    return this;
  }

  upsert(data, opts) {
    this._operation = "upsert";
    this._upsertData = Array.isArray(data) ? data : [data];
    if (opts && opts.onConflict) this._upsertConflict = opts.onConflict;
    return this;
  }

  delete() {
    this._operation = "delete";
    return this;
  }

  eq(col, val) {
    this._filters.push({ type: "eq", col, val });
    return this;
  }

  neq(col, val) {
    this._filters.push({ type: "neq", col, val });
    return this;
  }

  gt(col, val) {
    this._filters.push({ type: "gt", col, val });
    return this;
  }

  gte(col, val) {
    this._filters.push({ type: "gte", col, val });
    return this;
  }

  lt(col, val) {
    this._filters.push({ type: "lt", col, val });
    return this;
  }

  lte(col, val) {
    this._filters.push({ type: "lte", col, val });
    return this;
  }

  like(col, val) {
    this._filters.push({ type: "like", col, val });
    return this;
  }

  in(col, vals) {
    this._filters.push({ type: "in", col, vals });
    return this;
  }

  order(col, opts) {
    this._order = { col, asc: opts && opts.ascending !== false };
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  _buildWhere() {
    if (this._filters.length === 0) return { clause: "", values: [] };
    const values = [];
    const parts = this._filters.map((f) => {
      if (f.type === "eq") {
        values.push(f.val);
        return `"${f.col}" = $${values.length}`;
      }
      if (f.type === "neq") {
        values.push(f.val);
        return `"${f.col}" != $${values.length}`;
      }
      if (f.type === "gt") {
        values.push(f.val);
        return `"${f.col}" > $${values.length}`;
      }
      if (f.type === "gte") {
        values.push(f.val);
        return `"${f.col}" >= $${values.length}`;
      }
      if (f.type === "lt") {
        values.push(f.val);
        return `"${f.col}" < $${values.length}`;
      }
      if (f.type === "lte") {
        values.push(f.val);
        return `"${f.col}" <= $${values.length}`;
      }
      if (f.type === "like") {
        values.push(f.val);
        return `"${f.col}" LIKE $${values.length}`;
      }
      if (f.type === "in") {
        const placeholders = f.vals.map((_, i) => {
          values.push(f.vals[i]);
          return `$${values.length}`;
        });
        return `"${f.col}" IN (${placeholders.join(", ")})`;
      }
      return "";
    });
    return { clause: "WHERE " + parts.join(" AND "), values };
  }

  async _execute() {
    try {
      if (this._operation === "select") {
        const { clause, values } = this._buildWhere();
        let sql = `SELECT ${this._select} FROM "${this.table}" ${clause}`;
        if (this._order) {
          sql += ` ORDER BY "${this._order.col}" ${this._order.asc ? "ASC" : "DESC"}`;
        }
        if (this._limit) sql += ` LIMIT ${this._limit}`;
        const result = await this.pool.query(sql, values);
        return { data: result.rows, error: null };
      }

      if (this._operation === "insert") {
        const results = [];
        for (const row of this._insertData) {
          const cols = Object.keys(row);
          const vals = Object.values(row);
          const placeholders = vals.map((_, i) => `$${i + 1}`);
          const sql = `INSERT INTO "${this.table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
          const result = await this.pool.query(sql, vals);
          results.push(...result.rows);
        }
        return { data: results, error: null };
      }

      if (this._operation === "update") {
        const { clause, values } = this._buildWhere();
        const cols = Object.keys(this._updateData);
        const vals = Object.values(this._updateData);
        const setClauses = cols.map((c, i) => `"${c}" = $${i + 1}`);
        const whereValues = values.map((v, i) => v);
        // 重新编号 where 的占位符
        const { clause: whereClause, values: wVals } = this._buildWhereOffset(
          cols.length,
        );
        const allVals = [...vals, ...wVals];
        const sql = `UPDATE "${this.table}" SET ${setClauses.join(", ")} ${whereClause} RETURNING *`;
        const result = await this.pool.query(sql, allVals);
        return { data: result.rows, error: null };
      }

      if (this._operation === "upsert") {
        const results = [];
        for (const row of this._upsertData) {
          const cols = Object.keys(row);
          const vals = Object.values(row);
          const placeholders = vals.map((_, i) => `$${i + 1}`);
          const conflict = this._upsertConflict || cols[0];
          const updateSet = cols
            .filter((c) => c !== conflict)
            .map((c) => `"${c}" = EXCLUDED."${c}"`)
            .join(", ");
          const sql = `INSERT INTO "${this.table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders.join(", ")}) ON CONFLICT ("${conflict}") DO UPDATE SET ${updateSet} RETURNING *`;
          const result = await this.pool.query(sql, vals);
          results.push(...result.rows);
        }
        return { data: results, error: null };
      }

      if (this._operation === "delete") {
        const { clause, values } = this._buildWhere();
        const sql = `DELETE FROM "${this.table}" ${clause}`;
        const result = await this.pool.query(sql, values);
        return { data: result.rows, error: null };
      }

      return { data: null, error: "未知操作" };
    } catch (e) {
      console.error(`[DB错误] ${this.table} ${this._operation}:`, e.message);
      return { data: null, error: e.message };
    }
  }

  _buildWhereOffset(offset) {
    if (this._filters.length === 0) return { clause: "", values: [] };
    const values = [];
    const parts = this._filters.map((f) => {
      if (f.type === "eq") {
        values.push(f.val);
        return `"${f.col}" = $${offset + values.length}`;
      }
      if (f.type === "neq") {
        values.push(f.val);
        return `"${f.col}" != $${offset + values.length}`;
      }
      if (f.type === "gt") {
        values.push(f.val);
        return `"${f.col}" > $${offset + values.length}`;
      }
      if (f.type === "gte") {
        values.push(f.val);
        return `"${f.col}" >= $${offset + values.length}`;
      }
      if (f.type === "lt") {
        values.push(f.val);
        return `"${f.col}" < $${offset + values.length}`;
      }
      if (f.type === "lte") {
        values.push(f.val);
        return `"${f.col}" <= $${offset + values.length}`;
      }
      if (f.type === "like") {
        values.push(f.val);
        return `"${f.col}" LIKE $${offset + values.length}`;
      }
      if (f.type === "in") {
        const placeholders = f.vals.map((v) => {
          values.push(v);
          return `$${offset + values.length}`;
        });
        return `"${f.col}" IN (${placeholders.join(", ")})`;
      }
      return "";
    });
    return { clause: "WHERE " + parts.join(" AND "), values };
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
}

class DBClient {
  constructor(pool) {
    this.pool = pool;
  }

  from(table) {
    return new QueryBuilder(this.pool, table);
  }

  // 直接执行原始 SQL
  async query(sql, values) {
    try {
      const result = await this.pool.query(sql, values);
      return { data: result.rows, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }
}

function getDB() {
  return new DBClient(pool);
}

module.exports = { initDB, getDB };
