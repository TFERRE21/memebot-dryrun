import express from "express";
import axios from "axios";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SCAN_INTERVAL = 15000;

// =====================
// PERSISTÊNCIA
// =====================
const STORAGE_FILE = "./storage.json";

function loadState() {
  if (!fs.existsSync(STORAGE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STORAGE_FILE));
}

function saveState() {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(status, null, 2));
}

// =====================
// ESTADO
// =====================
let status = loadState() || {
  ligado: false,
  config: null,
  simulacoes: [],
  totalLucro: 0
};

const vistos = new Set(
  (status.simulacoes || []).map(s => s.address)
);

// =====================
// AUTO-START
// =====================
if (status.ligado && status.config) {
  console.log("🔁 Auto-start: bot voltou LIGADO");
}

// =====================
// ROTAS
// =====================
app.post("/start", (req, res) => {
  status.ligado = true;
  status.config = req.body;
  saveState();
  res.json({ ok: true, msg: "Bot ligado", status });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  saveState();
  res.json({ ok: true, msg: "Bot parado" });
});

app.get("/status", (req, res) => {
  res.json(status);
});

// =====================
// SCAN SNIPER REAL
// =====================
async function scan() {
  if (!status.ligado || !status.config) return;

  const { minCap, tradeValueBRL, takeProfit } = status.config;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana",
      { timeout: 10000 }
    );

    const pairs = r.data?.pairs || [];
    const agora = Date.now();

    for (const p of pairs) {
      if (!p.baseToken?.address) continue;
      if (!p.priceUsd || !p.liquidity?.usd || !p.volume?.h24) continue;
      if (!p.fdv || p.fdv < minCap) continue;
      if (!["raydium", "orca"].includes(p.dexId)) continue;
      if (!p.pairCreatedAt) continue;
      if (agora - p.pairCreatedAt > 3 * 60 * 60 * 1000) continue;
      if (p.liquidity.usd < 500) continue;
      if (p.volume.h24 < 500) continue;

      const tokenId = p.baseToken.address;
      if (vistos.has(tokenId)) continue;

      vistos.add(tokenId);

      const entrada = Number(p.priceUsd);
      const alvo = entrada * (1 + takeProfit / 100);
      const lucroEstimado = (tradeValueBRL * takeProfit) / 100;

      status.simulacoes.push({
        token: p.baseToken.symbol,
        address: tokenId,
        dex: p.dexId,
        entrada,
        alvo,
        marketCap: p.fdv,
        liquidez: p.liquidity.usd,
        volume24h: p.volume.h24,
        horario: new Date().toISOString(),
        status: "OPEN",
        lucroEstimado
      });

      status.totalLucro += lucroEstimado;
      saveState();

      break;
    }
  } catch (e) {
    console.log("Erro scan:", e.message);
  }
}

setInterval(scan, SCAN_INTERVAL);

// =====================
app.listen(PORT, () => {
  console.log("🤖 Memebot ONLINE (auto-start + persistência)");
});
