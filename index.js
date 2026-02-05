import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let state = {
  ligado: false,
  config: null,
  simulacoes: [],
  vistos: new Set() // evita duplicar tokens
};

/* ---------------- START ---------------- */
app.post("/start", (req, res) => {
  state.ligado = true;
  state.config = req.body;
  state.simulacoes = [];
  state.vistos = new Set();

  console.log("🟢 BOT LIGADO:", state.config);

  res.json({
    ok: true,
    msg: "Bot ligado (dry-run, dados reais)",
    config: state.config
  });
});

/* ---------------- STOP ---------------- */
app.post("/stop", (req, res) => {
  state.ligado = false;
  console.log("🔴 BOT PARADO");
  res.json({ ok: true });
});

/* ---------------- STATUS ---------------- */
app.get("/status", (req, res) => {
  res.json({
    ligado: state.ligado,
    config: state.config,
    simulacoes: state.simulacoes
  });
});

/* ---------------- SCAN (DEXSCREENER REAL) ---------------- */
async function scan() {
  if (!state.ligado || !state.config) return;

  try {
    const resp = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana",
      { timeout: 10000 }
    );

    const pairs = resp.data?.pairs || [];
    const minCap = Number(state.config.minCap);
    const takeProfit = Number(state.config.takeProfit);

    for (const p of pairs) {
      if (!p?.baseToken?.address) continue;
      if (state.vistos.has(p.baseToken.address)) continue;

      const fdv = Number(p.fdv || 0);
      const price = Number(p.priceUsd || 0);

      if (fdv < minCap || price <= 0) continue;

      const simulacao = {
        token: p.baseToken.symbol,
        address: p.baseToken.address,
        dex: p.dexId,
        entrada: price,
        alvo: price * (1 + takeProfit / 100),
        marketCap: fdv,
        horario: new Date().toISOString()
      };

      state.simulacoes.push(simulacao);
      state.vistos.add(p.baseToken.address);

      // limita histórico para não crescer infinito
      if (state.simulacoes.length > 20) {
        state.simulacoes.shift();
      }

      console.log("📈 SIMULAÇÃO REAL:", simulacao);
      break; // 1 por ciclo (realista)
    }
  } catch (e) {
    console.error("❌ Erro DexScreener:", e.message);
  }
}

/* ---------------- LOOP ---------------- */
setInterval(scan, 15000);

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 Memebot DRY-RUN (dados reais) rodando na porta", PORT)
);
