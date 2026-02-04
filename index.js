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

// ▶️ START
app.post("/start", (req, res) => {
  status.ligado = true;
  status.config = req.body;
  status.simulacoes = [];

  console.log("BOT LIGADO COM CONFIG:", status.config);

  res.json({
    ok: true,
    msg: "Bot ligado (simulação)",
    config: status.config
  });
});

// ⏹️ STOP
app.post("/stop", (req, res) => {
  status.ligado = false;
  res.json({ ok: true, msg: "Bot parado" });
});

// 📊 STATUS
app.get("/status", (req, res) => {
  res.json(status);
});

// 🔁 SCAN
async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    const minCap = status.config.minCap;
    const takeProfit = status.config.takeProfit;

    for (const p of r.data.pairs) {
      if (!p.fdv || !p.priceUsd) continue;

      if (p.fdv >= minCap) {
        const preco = Number(p.priceUsd);
        const alvo = preco * (1 + takeProfit / 100);

        status.simulacoes.push({
          token: p.baseToken.symbol,
          preco,
          alvo,
          hora: new Date().toISOString()
        });

        console.log("SIMULAÇÃO:", p.baseToken.symbol);
        break; // 1 por ciclo
      }
    }
  } catch (e) {
    console.log("Erro no scan:", e.message);
  }
}

setInterval(scan, 15000);

app.listen(3000, () =>
  console.log("🚀 Memebot DRY-RUN rodando na porta 3000")
);
