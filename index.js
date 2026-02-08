import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// CONFIG
// =========================
const PORT = process.env.PORT || 3000;
const SCAN_INTERVAL = 15000; // 15s
const MONITOR_INTERVAL = 8000; // 8s
const MODO_REAL = process.env.MODO_REAL === "true"; // false por padrão

// =========================
// ESTADO
// =========================
let status = {
  ligado: false,
  modo: MODO_REAL ? "REAL_OKX" : "SIMULACAO",
  config: null,
  simulacoes: [],
  totalLucro: 0
};

const vistos = new Set();
let scanTimer = null;
let monitorTimer = null;

// =========================
// ROTAS
// =========================
app.post("/start", (req, res) => {
  const { network, minCap, tradeValueBRL, takeProfit } = req.body;
  if (!network || !minCap || !tradeValueBRL || !takeProfit) {
    return res.status(400).json({ erro: "Config inválida" });
  }

  status.ligado = true;
  status.config = { network, minCap, tradeValueBRL, takeProfit };
  status.simulacoes = [];
  status.totalLucro = 0;
  vistos.clear();

  if (!scanTimer) scanTimer = setInterval(scan, SCAN_INTERVAL);
  if (!monitorTimer) monitorTimer = setInterval(monitorTrades, MONITOR_INTERVAL);

  res.json({ ok: true, msg: "Bot ligado", status });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  status.config = null;

  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  if (monitorTimer) { clearInterval(monitorTimer); monitorTimer = null; }

  res.json({ ok: true, msg: "Bot parado" });
});

app.get("/status", (req, res) => res.json(status));

// =========================
// SCAN REAL (DEXSCREENER)
// =========================
async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana",
      { timeout: 10000 }
    );

    const pairs = r.data?.pairs || [];
    const now = Date.now();

    for (const p of pairs) {
      // filtros básicos
      if (!p.baseToken?.address) continue;
      if (!p.priceUsd || !p.fdv) continue;
      if (p.fdv < status.config.minCap) continue;

      // DEX reais
      if (!["raydium", "orca"].includes(p.dexId)) continue;

      // token recente (até 3h)
      if (!p.pairCreatedAt || now - p.pairCreatedAt > 3 * 60 * 60 * 1000) continue;

      // liquidez/volume mínimos
      if ((p.liquidity?.usd || 0) < 500) continue;
      if ((p.volume?.h24 || 0) < 500) continue;

      const id = p.baseToken.address;
      if (vistos.has(id)) continue;
      vistos.add(id);

      const entrada = Number(p.priceUsd);
      const alvo = entrada * (1 + status.config.takeProfit / 100);
      const lucroEstimado = status.config.tradeValueBRL * (status.config.takeProfit / 100);

      status.simulacoes.push({
        token: p.baseToken.symbol,
        address: id,
        dex: p.dexId,
        entrada,
        alvo,
        marketCap: p.fdv,
        liquidez: p.liquidity.usd,
        volume24h: p.volume.h24,
        horario: new Date().toISOString(),
        status: "OPEN",
        lucroEstimado,
        maxPreco: entrada
      });

      break; // 1 trade por ciclo
    }
  } catch (e) {
    console.log("Erro scan:", e.message);
  }
}

// =========================
// MONITOR REAL (PREÇO REAL)
// =========================
async function monitorTrades() {
  if (!status.ligado) return;

  for (const t of status.simulacoes) {
    if (t.status !== "OPEN") continue;

    try {
      // busca preço REAL do par
      const r = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${t.address}`,
        { timeout: 10000 }
      );
