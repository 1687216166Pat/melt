// server/db/index.js
const { createClient } = require("@supabase/supabase-js");

let supabase;

function initDB() {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  console.log("Supabase 连接完成");
}

function getDB() {
  return supabase;
}

module.exports = { initDB, getDB };
