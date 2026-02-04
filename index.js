import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let status = {
  ligado: false,
  simulacoes: []
};

const MARKETCAP_MIN = 20000;
const TAKE_PROFIT = 1.2;

/* ▶️ LIGAR BOT (GET + POST) */
app.get("/start", (req, res) => {
  status.ligado = true;
  res.json({ msg: "Bot ligado (simulação)" });
});

app.post("/start", (req, res) => {
  status.ligado = true;
  res.json({ msg: "Bot ligado (simulação)" });
});

/* ⏹️ PARAR BOT (GET + POST) */
app.get("/stop", (req, res) => {
  status.ligado = false;
  res.json({ msg: "Bot parado" });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  res.json({ msg: "Bot parado" });
});

/* 📡 STATUS */
app.get("/status", (req, res) => {
  res.json(status);
});

/* 🔍 SCAN SIMULADO */
async function scan() {
  if (!status.ligado) return;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    for (const p of r.data.pairs) {
      if (!p.fdv || !p.priceUsd) continue;
      if (p.fdv < MARKETCAP_MIN) continue;

      const existe = status.simulacoes.find(
        t => t.token === p.baseToken.symbol
      );
      if (existe) continue;

      status.simulacoes.push({
        token: p.baseToken.symbol,
        preco: Number(p.priceUsd),
        alvo: Number(p.priceUsd) * TAKE_PROFIT
      });

      console.log(
        `📈 SIMULADO ${p.baseToken.symbol} | entrada ${p.priceUsd} | alvo ${p.priceUsd * TAKE_PROFIT}`
      );

      break;
    }
  } catch (e) {
    console.log("Erro API DexScreener");
  }
}

setInterval(scan, 15000);

app.listen(3000, () => {
  console.log("🚀 Memebot DRY-RUN rodando na porta 3000");
});


