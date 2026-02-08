import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   ESTADO GLOBAL DO BOT
========================= */
let status = {
  ligado: false,
  config: null,
  simulacoes: [],
  totalLucro: 0
};

const SCAN_INTERVAL = 15000; // 15s
let scanTimer = null;

/* =========================
   ROTAS API
========================= */

// Iniciar bot
app.post("/start", (req, res) => {
  const { network, minCap, tradeValueBRL, takeProfit } = req.body;

  if (!network || !minCap || !tradeValueBRL || !takeProfit) {
    return res.status(400).json({ erro: "Configuração inválida" });
  }

  status.ligado = true;
  status.config = { network, minCap, tradeValueBRL, takeProfit };
  status.simulacoes = [];
  status.totalLucro = 0;

  if (!scanTimer) {
    scanTimer = setInterval(scan, SCAN_INTERVAL);
  }

  res.json({ ok: true, msg: "Bot ligado (simulação)", config: status.config });
});

// Parar bot
app.post("/stop", (req, res) => {
  status.ligado = false;
  status.config = null;

  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
  }

  res.json({ ok: true, msg: "Bot parado" });
});

// Status
app.get("/status", (req, res) => {
  res.json(status);
});

/* =========================
   FUNÇÃO SCAN (REAL + FALLBACK)
========================= */
async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    const url = "https://api.dexscreener.com/latest/dex/pairs/solana";
    const response = await axios.get(url, { timeout: 10000 });

    const pairs = response.data?.pairs || [];

    for (const p of pairs) {
      const marketCap = p.fdv || p.marketCap || 0;

      if (marketCap < status.config.minCap) continue;

      const entrada = Number(p.priceUsd);
      if (!entrada || entrada <= 0) continue;

      const alvo = entrada * (1 + status.config.takeProfit / 100);
      const lucroEstimado = status.config.tradeValueBRL *
        (status.config.takeProfit / 100);

      status.simulacoes.unshift({
        token: p.baseToken?.symbol || "UNKNOWN",
        address: p.baseToken?.address || "N/A",
        dex: p.dexId || "dex",
        entrada,
        alvo,
        marketCap,
        horario: new Date().toISOString(),
        lucroEstimado
      });

      status.totalLucro += lucroEstimado;

      // limita histórico
      if (status.simulacoes.length > 50) {
        status.simulacoes.pop();
      }

      break; // 1 trade por scan
    }
  } catch (err) {
    // FALLBACK SE API CAIR
    const lucroEstimado = status.config.tradeValueBRL *
      (status.config.takeProfit / 100);

    status.simulacoes.unshift({
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

    if (status.simulacoes.length > 50) {
      status.simulacoes.pop();
    }
  }
}

/* =========================
   START SERVER (RENDER)
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Memebot DRY-RUN rodando na porta", PORT);
});
