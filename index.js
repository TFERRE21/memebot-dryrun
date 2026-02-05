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
  simulacoes: []
};

/* =========================
   ROTAS DA API
========================= */
app.post("/start", (req, res) => {
  const { network, minCap, tradeValueBRL, takeProfit } = req.body;

  status.ligado = true;
  status.config = {
    network,
    minCap,
    tradeValueBRL,
    takeProfit
  };
  status.simulacoes = [];

  res.json({
    ok: true,
    msg: "Bot ligado (simulação)",
    config: status.config
  });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  status.config = null;

  res.json({ ok: true, msg: "Bot parado" });
});

app.get("/status", (req, res) => {
  res.json(status);
});

/* =========================
   SCAN REAL + FALLBACK
========================= */
async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    const resp = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana",
      { timeout: 10000 }
    );

    const pairs = resp.data?.pairs || [];
    let encontrou = false;

    for (const p of pairs) {
      const marketCap =
        p.fdv || p.marketCap || 0;

      if (marketCap < status.config.minCap) continue;
      if (!p.priceUsd) continue;

      const entrada = Number(p.priceUsd);
      const alvo =
        entrada * (1 + status.config.takeProfit / 100);

      status.simulacoes.push({
        token: p.baseToken?.symbol || "UNKNOWN",
        address: p.baseToken?.address || "",
        dex: p.dexId,
        entrada,
        alvo,
        marketCap,
        horario: new Date().toISOString()
      });

      encontrou = true;
      break; // 1 simulação por ciclo (controle)
    }

    /* =========================
       FALLBACK (SE API VAZIA)
    ========================= */
    if (!encontrou) {
      status.simulacoes.push({
        token: "TEST-MEME",
        address: "0xTEST",
        dex: "fallback",
        entrada: 0.001,
        alvo: 0.001 * (1 + status.config.takeProfit / 100),
        marketCap: status.config.minCap + 100,
        horario: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Erro DexScreener:", err.message);

    // fallback em erro total
    status.simulacoes.push({
      token: "ERROR-MEME",
      address: "0xERROR",
      dex: "fallback-error",
      entrada: 0.0005,
      alvo: 0.0005 * (1 + status.config.takeProfit / 100),
      marketCap: status.config.minCap + 50,
      horario: new Date().toISOString()
    });
  }
}

/* =========================
   LOOP AUTOMÁTICO
========================= */
setInterval(scan, 15000);

/* =========================
   START SERVER (RENDER)
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🤖 Memebot DRY-RUN rodando na porta", PORT);
});
