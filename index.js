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

app.post("/start", (req, res) => {
  status.ligado = true;
  status.config = req.body;
  res.json({ msg: "Bot ligado", config: status.config });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  res.json({ msg: "Bot parado" });
});

app.get("/status", (req, res) => {
  res.json(status);
});

async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    for (const p of r.data.pairs) {
      if (p.fdv && p.fdv >= status.config.minCap) {
        status.simulacoes.push({
          token: p.baseToken.symbol,
          preco: p.priceUsd,
          alvo: p.priceUsd * (1 + status.config.takeProfit / 100)
        });
        break;
      }
    }
  } catch (e) {
    console.log("Erro DexScreener");
  }
}

setInterval(scan, 15000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("Memebot DRY-RUN rodando")
);
