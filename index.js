import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

/* =========================
   CONFIGURAÇÃO GLOBAL
========================= */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

/* =========================
   ESTADO DO BOT (DRY-RUN)
========================= */
let status = {
  ligado: false,
  config: null,
  simulacoes: []
};

/* =========================
   ROTAS DA API
========================= */

// LIGAR BOT
app.post("/start", (req, res) => {
  status.ligado = true;
  status.config = req.body;
  status.simulacoes = [];

  console.log("BOT LIGADO:", status.config);

  res.json({
    msg: "Bot ligado (simulação)",
    config: status.config
  });
});

// PARAR BOT
app.post("/stop", (req, res) => {
  status.ligado = false;

  console.log("BOT PARADO");

  res.json({ msg: "Bot parado" });
});

// STATUS
app.get("/status", (req, res) => {
  res.json(status);
});

/* =========================
   SCANNER (DEXSCREENER)
========================= */
async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    const response = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    for (const pair of response.data.pairs) {
      if (!pair.fdv || !pair.priceUsd) continue;

      if (pair.fdv >= status.config.minCap) {
        const preco = Number(pair.priceUsd);
        const alvo =
          preco * (1 + status.config.takeProfit / 100);

        status.simulacoes.push({
          token: pair.baseToken.symbol,
          preco,
          alvo,
          timestamp: new Date().toISOString()
        });

        console.log("SIMULAÇÃO:", pair.baseToken.symbol);
        break; // 1 trade por ciclo
      }
    }
  } catch (err) {
    console.error("Erro ao buscar dados da DexScreener");
  }
}

// roda a cada 15 segundos
setInterval(scan, 15000);

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Memebot DRY-RUN rodando na porta", PORT);
});
