import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let status = {
  ligado: false,
  config: null,
  simulacoes: [],
  totalLucro: 0
};

// guarda tokens já usados
const vistos = new Set();

const SCAN_INTERVAL = 15000; // 15s

/* ================= ROTAS ================= */

app.post("/start", (req, res) => {
  status.ligado = true;
  status.config = req.body;
  res.json({ ok: true, msg: "Bot ligado (REAL + SNIPER)", config: status.config });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  res.json({ ok: true, msg: "Bot parado" });
});

app.get("/status", (req, res) => {
  res.json(status);
});

/* ================= SCAN SNIPER REAL ================= */

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
      // filtros básicos
      if (!p.baseToken?.address) continue;
      if (!p.priceUsd || !p.liquidity?.usd) continue;
      if (!p.fdv || p.fdv < minCap) continue;

      // 🔹 SNIPER FILTERS
      if (p.liquidity.usd < 1000) continue;          // liquidez mínima
      if (p.volume?.h24 < 2000) continue;            // volume mínimo
      if (!["raydium", "orca"].includes(p.dexId)) continue;

      // token novo (até 60 min)
      if (!p.pairCreatedAt) continue;
      if (agora - p.pairCreatedAt > 60 * 60 * 1000) continue;

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
        lucroEstimado
      });

      status.totalLucro += lucroEstimado;

      // mantém histórico limpo
      if (status.simulacoes.length > 20) {
        status.simulacoes.shift();
      }

      break; // 1 sniper trade por scan
    }
  } catch (err) {
    console.error("Erro no scan sniper:", err.message);
  }
}

setInterval(scan, SCAN_INTERVAL);

/* ================= START ================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 Memebot REAL + SNIPER rodando")
);
