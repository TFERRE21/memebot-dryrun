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

app.get("/", (req, res) => {
  res.send("Memebot DRY-RUN ONLINE");
});

app.get("/status", (req, res) => {
  res.json(status);
});

app.post("/start", (req, res) => {
  status.ligado = true;
  status.config = req.body;
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

  res.json({
    ok: true,
    msg: "Bot parado"
  });
});

// Simulação real com dados reais (DexScreener)
async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    for (const p of r.data.pairs) {
      if (!p.fdv || p.fdv < status.config.minCap) continue;

      const entrada = Number(p.priceUsd);
      const alvo = entrada * (1 + status.config.takeProfit / 100);

      status.simulacoes.push({
        token: p.baseToken.symbol,
        marketCap: p.fdv,
        entrada,
        alvo,
        hora: new Date().toISOString()
      });

      // limita histórico
      if (status.simulacoes.length > 20) {
        status.simulacoes.shift();
      }

      break; // 1 por ciclo (realista)
    }
  } catch (e) {
    console.log("Erro ao consultar DexScreener");
  }
}

setInterval(scan, 15000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("Memebot DRY-RUN rodando na porta", PORT)
);
