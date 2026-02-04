import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Estado global do bot (simulação)
 */
let state = {
  ligado: false,
  config: null,
  simulacoes: []
};

/**
 * Rota raiz (health check)
 */
app.get("/", (req, res) => {
  res.json({ status: "Memebot DRY-RUN online" });
});

/**
 * Ligar bot (POST)
 */
app.post("/start", (req, res) => {
  const { network, minCap, tradeValueBRL, takeProfit } = req.body;

  // validações básicas
  if (!network || !minCap || !tradeValueBRL || !takeProfit) {
    return res.status(400).json({
      error: "Configuração inválida"
    });
  }

  state.ligado = true;
  state.config = {
    network,
    minCap,
    tradeValueBRL,
    takeProfit
  };

  res.json({
    msg: "Bot ligado (simulação)",
    config: state.config
  });
});

/**
 * Parar bot (POST)
 */
app.post("/stop", (req, res) => {
  state.ligado = false;
  res.json({ msg: "Bot parado" });
});

/**
 * Status do bot
 */
app.get("/status", (req, res) => {
  res.json(state);
});

/**
 * Scanner de memecoins (SIMULAÇÃO)
 */
async function scanMarket() {
  if (!state.ligado || !state.config) return;

  try {
    const resp = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    const pairs = resp.data.pairs || [];

    for (const p of pairs) {
      if (!p.fdv || !p.priceUsd) continue;

      if (p.fdv >= state.config.minCap) {
        const entrada = Number(p.priceUsd);
        const alvo =
          entrada * (1 + state.config.takeProfit / 100);

        state.simulacoes.push({
          token: p.baseToken.symbol,
          address: p.baseToken.address,
          entrada,
          alvo,
          marketCap: p.fdv,
          timestamp: new Date().toISOString()
        });

        // simula apenas 1 trade por ciclo
        break;
      }
    }
  } catch (err) {
    console.error("Erro ao consultar DexScreener");
  }
}

/**
 * Loop de simulação (15s)
 */
setInterval(scanMarket, 15000);

/**
 * Render usa PORT automaticamente
 */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🤖 Memebot DRY-RUN rodando na porta ${PORT}`);
});
