import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let status = {
  ligado: false,
  config: null,
  simulacoes: []
};

const SCAN_INTERVAL = 15000; // 15s

/* ======================
   ROTAS
====================== */

app.post("/start", (req, res) => {
  status.ligado = true;
  status.config = req.body;
  status.simulacoes = [];
  res.json({ ok: true, msg: "Bot ligado (simulação)", config: status.config });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  res.json({ ok: true, msg: "Bot parado" });
});

app.get("/status", (req, res) => {
  res.json(status);
});

/* ======================
   SCAN REAL + FALLBACK
====================== */

async function scan() {
  if (!status.ligado || !status.config) return;

  const { minCap, takeProfit } = status.config;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    for (const p of r.data.pairs) {
      if (
        p.fdv &&
        p.priceUsd &&
        p.fdv >= minCap &&
        !status.simulacoes.find(s => s.address === p.pairAddress)
      ) {
        const entrada = Number(p.priceUsd);
        const alvo = entrada * (1 + takeProfit / 100);

        status.simulacoes.push({
          token: p.baseToken.symbol,
          address: p.pairAddress,
          dex: p.dexId,
          entrada,
          alvo,
          marketCap: p.fdv,
          horario: new Date().toISOString()
        });

        // gera 1 por scan (controle)
        break;
      }
    }
  } catch (err) {
    // fallback garantido (prova de vida)
    status.simulacoes.push({
      token: "FALLBACK-MEME",
      address: "0xFALLBACK",
      dex: "fallback",
      entrada: 0.001,
      alvo: 0.0012,
      marketCap: minCap,
      horario: new Date().toISOString()
    });
  }
}

/* ======================
   LOOP
====================== */

setInterval(scan, SCAN_INTERVAL);

/* ======================
   START
====================== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Memebot DRY-RUN rodando");
});
