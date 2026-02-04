import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// estado global do bot
let status = {
  ligado: false,
  config: null,
  simulacoes: []
};

// ===== ROTAS =====

// health check
app.get("/", (req, res) => {
  res.send("Memebot DRY-RUN ONLINE");
});

// ligar bot
app.post("/start", (req, res) => {
  const { network, minCap, tradeValueBRL, takeProfit } = req.body;

  if (!network || !minCap || !tradeValueBRL || !takeProfit) {
    return res.status(400).json({ error: "Configuração inválida" });
  }

  status.ligado = true;
  status.config = {
    network,
    minCap,
    tradeValueBRL,
    takeProfit
  };
  status.simulacoes = [];

  console.log("BOT LIGADO:", status.config);

  res.json({
    ok: true,
    msg: "Bot ligado (simulação)",
    status
  });
});

// parar bot
app.post("/stop", (req, res) => {
  status.ligado = false;
  console.log("BOT PARADO");

  res.json({ ok: true, msg: "Bot parado" });
});

// status
app.get("/status", (req, res) => {
  res.json(status);
});

// ===== SCANNER =====
async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    for (const p of r.data.pairs) {
      const fdv = Number(p.fdv || 0);
      const price = Number(p.priceUsd || 0);

      if (fdv >= status.config.minCap && price > 0) {
        status.simulacoes.push({
          token: p.baseToken.symbol,
          address: p.baseToken.address,
          entrada: price,
          alvo: price * (1 + status.config.takeProfit / 100),
          marketCap: fdv,
          timestamp: new Date().toISOString()
        });

        console.log("SIMULAÇÃO:", p.baseToken.symbol);
        break;
      }
    }
  } catch (e) {
    console.log("Erro DexScreener");
  }
}

// roda a cada 15s
setInterval(scan, 15000);

app.listen(PORT, () => {
  console.log("Memebot DRY-RUN rodando na porta", PORT);
});
