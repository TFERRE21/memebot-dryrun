import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

let status = {
  ligado: false,
  config: null,
  simulacoes: []
};

// valores padrão
let MIN_CAP = 20000;
let TAKE_PROFIT = 1.2;

app.post("/start", (req, res) => {
  status.ligado = true;

  if (req.body?.minCap) MIN_CAP = req.body.minCap;
  if (req.body?.takeProfit)
    TAKE_PROFIT = 1 + req.body.takeProfit / 100;

  status.config = req.body;

  res.json({
    msg: "Bot ligado (simulação)",
    config: status.config
  });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  res.json({ msg: "Bot parado" });
});

app.get("/status", (req, res) => {
  res.json(status);
});

async function scan() {
  if (!status.ligado) return;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    const now = new Date().toISOString();

    for (const p of r.data.pairs) {
      if (!p.priceUsd || !p.fdv) continue;
      if (p.fdv < MIN_CAP) continue;

      status.simulacoes.push({
        token: p.baseToken.symbol,
        precoEntrada: Number(p.priceUsd),
        alvo: Number((p.priceUsd * TAKE_PROFIT).toFixed(6)),
        marketCap: p.fdv,
        hora: now
      });

      // limita histórico
      if (status.simulacoes.length > 20) {
        status.simulacoes.shift();
      }

      break; // 1 simulação por ciclo
    }
  } catch (e) {
    console.log("Erro ao buscar dados da DexScreener");
  }
}

setInterval(scan, 15000);

app.listen(3000, () =>
  console.log("Memebot DRY-RUN rodando")
);


