import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SCAN_INTERVAL = 15000;
const MONITOR_INTERVAL = 8000;

/* ======================
   ESTADO GLOBAL
====================== */
let status = {
  ligado: false,
  modo: "SIMULACAO", // REAL_OKX no futuro
  wallet: null,
  config: null,
  simulacoes: [],
  totalLucro: 0
};

const vistos = new Set();
let scanTimer = null;
let monitorTimer = null;

/* ======================
   ROTAS
====================== */
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

  res.json({ ok: true });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  status.config = null;

  if (scanTimer) clearInterval(scanTimer);
  if (monitorTimer) clearInterval(monitorTimer);

  scanTimer = null;
  monitorTimer = null;

  res.json({ ok: true });
});

app.get("/status", (req, res) => {
  res.json(status);
});

app.post("/wallet", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ erro: "Wallet inválida" });
  status.wallet = wallet;
  res.json({ ok: true, wallet });
});

/* ======================
   SCAN REAL (SOLANA)
====================== */
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
      if (!p.baseToken?.address) continue;
      if (!p.priceUsd || !p.fdv) continue;
      if (p.fdv < status.config.minCap) continue;
      if (!["raydium", "orca"].includes(p.dexId)) continue;
      if (!p.pairCreatedAt || now - p
