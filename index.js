import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Estado global do bot
 */
let state = {
  ligado: false,
  config: null,
  simulacoes: [],
  vistos: new Set()
};

/**
 * Ligar bot
 */
app.post("/start", (req, res) => {
  state.ligado = true;
  state.config = req.body;
  state.simulacoes = [];
  state.vistos = new Set();

  console.log("🟢 BOT LIGADO:", state.config);

  res.json({
    ok: true,
    msg: "Bot ligado (dry-run, dados reais)",
    config: state.config
  });
});

/**
 * Parar bot
 */
app.post("/stop", (req, res) => {
  state.ligado = false;
  console.log("🔴 BOT PARADO");
  res.json({ ok: true });
});

/**
 * Status
 */
app.get("/status", (req, res) => {
  res.json({
    ligado: state.ligado,
    config: state.config,
    simulacoes: state.simulacoes
  });
});

/**
 * 🔎 SCAN — DADOS REAIS COM FALLBACK
 * Roda a cada 15 segundos
 */
async function scan() {
  if (!state.ligado || !state.config) return;

  const minCap = Number(state.config.minCap);
  const takeProfit = Number(state.config.takeProfit);

  try {
    let pairs = [];

    // 1️⃣ Tentativa principal
    try {
      const resp = await axios.get(
        "https://api.dexscreener.com/latest/dex/pairs/solana",
        { timeout: 10000 }
      );
      pairs = resp.data?.pairs || [];
    } catch (e) {
      console.log("⚠️ Falha endpoint pairs");
    }

    // 2️⃣ Fallback
    if (pairs.length === 0) {
      const resp = await axios.get(
        "https://api.dexscreener.com/latest/dex/search/?q=solana",
        { timeout: 10000 }
      );
      pairs = resp.data?.pairs || [];
    }

    for (const p of pairs) {
      if (!p?.baseToken?.address) continue;
      if (state.vistos.has(p.baseToken.address)) continue;

      const fdv = Number(p.fdv || 0);
      const price = Number(p.priceUsd || 0);

      if (fdv < minCap || price <= 0) continue;

      const simulacao = {
        token: p.baseToken.symbol,
        address: p.baseToken.address,
        dex: p.dexId,
        entrada: price,
        alvo: price * (1 + takeProfit / 100),
        marketCap: fdv,
        horario: new Date().toISOString()
      };

      state.simulacoes.push(simulacao);
      state.vistos.add(p.baseToken.address);

      // limita histórico
      if (state.simulacoes.length > 20) {
        state.simulacoes.shift();
      }

      console.log("📈 SIMULAÇÃO REAL:", simulacao);
      break; // 1 por ciclo
    }
  } catch (e) {
    console.error("❌ Erro geral no scan:", e.message);
  }
}

/**
 * Loop automático
 */
setInterval(scan, 15000);

/**
 * Servidor
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Memebot DRY-RUN (dados reais + fallback) ONLINE");
});
