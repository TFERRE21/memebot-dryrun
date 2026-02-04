import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

/* 🔓 libera chamadas do navegador (Vercel → Render) */
app.use(cors());
app.use(express.json());

/* 📊 estado do bot */
let status = {
  ligado: false,
  simulacoes: []
};

/* ⚙️ configurações da simulação */
const MARKETCAP_MIN = 20000; // USD
const TAKE_PROFIT = 1.2;     // +20%

/* ▶️ ligar bot */
app.post("/start", (req, res) => {
  status.ligado = true;
  res.json({ msg: "Bot ligado (simulação)" });
});

/* ⏹️ parar bot */
app.post("/stop", (req, res) => {
  status.ligado = false;
  res.json({ msg: "Bot parado" });
});

/* 📡 status para o painel */
app.get("/status", (req, res) => {
  res.json(status);
});

/* 🔍 scan de memecoins (simulação) */
async function scan() {
  if (!status.ligado) return;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    for (const p of r.data.pairs) {
      if (!p.fdv || !p.priceUsd) continue;
      if (p.fdv < MARKETCAP_MIN) continue;

      /* evita duplicar o mesmo token */
      const jaExiste = status.simulacoes.find(
        t => t.token === p.baseToken.symbol
      );
      if (jaExiste) continue;

      status.simulacoes.push({
        token: p.baseToken.symbol,
        preco: Number(p.priceUsd),
        alvo: Number(p.priceUsd) * TAKE_PROFIT
      });

      console.log(
        `📈 SIMULADO: ${p.baseToken.symbol} | entrada ${p.priceUsd} | alvo ${p.priceUsd * TAKE_PROFIT}`
      );

      break; // 1 simulação por ciclo
    }
  } catch (e) {
    console.log("Erro API DexScreener");
  }
}

/* 🔁 loop contínuo */
setInterval(scan, 15000);

/* 🚀 servidor */
app.listen(3000, () => {
  console.log("🚀 Memebot DRY-RUN rodando na porta 3000");
});

