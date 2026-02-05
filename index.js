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

const SCAN_INTERVAL = 15000; // 15s

// -------------------- ROTAS --------------------

app.post("/start", (req, res) => {
  const { network, minCap, tradeValueBRL, takeProfit } = req.body;

  if (!network || !minCap || !tradeValueBRL || !takeProfit) {
    return res.status(400).json({ ok: false, msg: "Config inválida" });
  }

  status.ligado = true;
  status.config = { network, minCap, tradeValueBRL, takeProfit };

  res.json({
    ok: true,
    msg: "Bot ligado (dados reais)",
    config: status.config
  });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  status.config = null;
  res.json({ ok: true, msg: "Bot parado" });
});

app.get("/status", (req, res) => {
  res.json(status);
});

// -------------------- SCAN REAL --------------------

async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    const resp = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    const pairs = resp.data.pairs || [];

    for (const p of pairs) {
      const marketCap =
        p.fdv ||
        p.marketCap ||
        (p.liquidity ? p.liquidity.usd : 0);

      if (!marketCap || marketCap < status.config.minCap) continue;
      if (!p.priceUsd || !p.baseToken?.symbol) continue;

      // evita duplicar token
      const jaExiste = status.simulacoes.find(
        s => s.address === p.baseToken.address
      );
      if (jaExiste) continue;

      const entrada = Number(p.priceUsd);
      const alvo = entrada * (1 + status.config.takeProfit / 100);

      status.simulacoes.unshift({
        token: p.baseToken.symbol,
        address: p.baseToken.address,
        dex: p.dexId,
        entrada,
        alvo,
        marketCap,
        horario: new Date().toISOString()
      });

      // limita histórico
      if (status.simulacoes.length > 50) {
        status.simulacoes.pop();
      }

      // registra apenas 1 por ciclo
      break;
    }
  } catch (err) {
    console.error("Erro no scan:", err.message);
  }
}

setInterval(scan, SCAN_INTERVAL);

// -------------------- START SERVER --------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 Memebot DRY-RUN (REAL) rodando na porta", PORT)
);
