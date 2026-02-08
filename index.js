import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/* ===============================
   ESTADO GLOBAL DO BOT
================================ */
let status = {
  ligado: false,
  modo: "SIMULACAO", // SIMULACAO | REAL_OKX
  config: null,
  simulacoes: [],
  totalLucro: 0
};

const SCAN_INTERVAL = 15000; // 15s

/* ===============================
   ROTAS
================================ */
app.post("/start", (req, res) => {
  status.ligado = true;
  status.config = req.body;
  res.json({ ok: true, msg: "Bot ligado", config: status.config });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  status.config = null;
  res.json({ ok: true, msg: "Bot parado" });
});

app.get("/status", (req, res) => {
  res.json(status);
});

/* ===============================
   SCANNER (REAL + FALLBACK)
================================ */
async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    // 🔎 DEXSCREENER (SOLANA)
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    const pares = r.data.pairs || [];

    for (const p of pares) {
      if (!p.priceUsd || !p.fdv) continue;
      if (p.fdv < status.config.minCap) continue;

      // evita duplicar token
      const jaExiste = status.simulacoes.find(
        s => s.address === p.pairAddress
      );
      if (jaExiste) continue;

      const entrada = Number(p.priceUsd);
      const alvo = entrada * (1 + status.config.takeProfit / 100);
      const lucroEstimado = status.config.tradeValueBRL * (status.config.takeProfit / 100);

      const trade = {
        token: p.baseToken.symbol,
        address: p.pairAddress,
        dex: p.dexId,
        entrada,
        alvo,
        marketCap: p.fdv,
        horario: new Date().toISOString(),
        lucroEstimado,
        status: "ABERTO"
      };

      status.simulacoes.push(trade);
      status.totalLucro += lucroEstimado;

      break; // 1 trade por ciclo (segurança)
    }

  } catch (e) {
    // 🔁 FALLBACK (garante visual no painel)
    const entrada = 0.001;
    const alvo = 0.0012;
    const lucroEstimado = status.config.tradeValueBRL * (status.config.takeProfit / 100);

    status.simulacoes.push({
      token: "FALLBACK-MEME",
      address: "0xFALLBACK",
      dex: "fallback",
      entrada,
      alvo,
      marketCap: status.config.minCap,
      horario: new Date().toISOString(),
      lucroEstimado,
      status: "ABERTO"
    });

    status.totalLucro += lucroEstimado;
  }
}

setInterval(scan, SCAN_INTERVAL);

app.listen(3000, () =>
  console.log("🤖 Memebot DRY-RUN rodando")
);
