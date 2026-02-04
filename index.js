import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

let status = {
  ligado: false,
  simulacoes: []
};

const MARKETCAP_MIN = 20000;
const TAKE_PROFIT = 1.2;

app.post("/start", (req, res) => {
  status.ligado = true;
  res.json({ msg: "Bot ligado (simulação)" });
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

    for (const p of r.data.pairs) {
      if (p.fdv >= MARKETCAP_MIN) {
        status.simulacoes.push({
          token: p.baseToken.symbol,
          preco: p.priceUsd,
          alvo: p.priceUsd * TAKE_PROFIT
        });
        break;
      }
    }
  } catch (e) {
    console.log("Erro API");
  }
}

setInterval(scan, 15000);

app.listen(3000, () =>
  console.log("Memebot DRY-RUN rodando")
);
