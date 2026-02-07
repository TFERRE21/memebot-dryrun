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

const SCAN_INTERVAL = 15000; // 15s

// =======================
// ROTAS
// =======================

app.post("/start", (req, res) => {
  status.ligado = true;
  status.config = req.body;
  res.json({ ok: true, msg: "Bot ligado (simulação)", config: status.config });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  status.config = null;
  res.json({ ok: true, msg: "Bot parado" });
});

app.get("/status", (req, res) => {
  res.json(status);
});

// =======================
// SCAN PRINCIPAL
// =======================

async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    const { minCap, tradeValueBRL, takeProfit } = status.config;

    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    const pairs = r.data.pairs || [];

    for (const p of pairs) {
      if (!p.priceUsd || !p.fdv) continue;
      if (p.fdv < minCap) continue;

      const entrada = Number(p.priceUsd);
      const alvo = entrada * (1 + takeProfit / 100);
      const lucroEstimado = (tradeValueBRL * takeProfit) / 100;

      status.simulacoes.push({
        token: p.baseToken.symbol,
        address: p.baseToken.address,
        dex: p.dexId,
        entrada,
        alvo,
        marketCap: p.fdv,
        horario: new Date().toISOString(),
        lucroEstimado
      });

      status.totalLucro += lucroEstimado;

      // limita histórico
      if (status.simulacoes.length > 20) {
        status.simulacoes.shift();
      }

      break; // 1 trade por ciclo
    }

  } catch (err) {
    // FALLBACK (prova de vida)
    const lucroEstimado = (status.config.tradeValueBRL * status.config.takeProfit) / 100;

    status.simulacoes.push({
      token: "FALLBACK-MEME",
      address: "0xFALLBACK",
      dex: "fallback",
      entrada: 0.001,
      alvo: 0.0012,
      marketCap: status.config.minCap,
      horario: new Date().toISOString(),
      lucroEstimado
    });

    status.totalLucro += lucroEstimado;

    if (status.simulacoes.length > 20) {
      status.simulacoes.shift();
    }
  }
}

setInterval(scan, SCAN_INTERVAL);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🤖 Memebot DRY-RUN rodando")
);
