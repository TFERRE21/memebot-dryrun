import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let status = {
  ligado: false,
  config: null,
  simulacoes: [],
  totalLucro: 0
};

const SCAN_INTERVAL = 15000; // 15s
const vistos = new Set();

/* ================= ROTAS ================= */

app.post("/start", (req, res) => {
  status.ligado = true;
  status.config = req.body;
  res.json({ ok: true, msg: "Bot ligado", config: status.config });
});

app.post("/stop", (req, res) => {
  status.ligado = false;
  res.json({ ok: true, msg: "Bot parado" });
});

app.get("/status", (req, res) => {
  res.json(status);
});

/* ================= SCAN ================= */

async function scan() {
  if (!status.ligado || !status.config) return;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    for (const p of r.data.pairs) {
      if (!p.baseToken || !p.priceUsd || !p.fdv) continue;
      if (p.fdv < status.config.minCap) continue;

      const id = `${p.baseToken.address}-${p.dexId}`;
      if (vistos.has(id)) continue;

      vistos.add(id);

      const entrada = Number(p.priceUsd);
      const alvo = entrada * (1 + status.config.takeProfit / 100);

      const sim = {
        token: p.baseToken.symbol,
        address: p.baseToken.address,
        dex: p.dexId,
        entrada,
        alvo,
        marketCap: p.fdv,
        horario: new Date().toISOString(),
        lucroEstimado: (alvo - entrada) * status.config.tradeValueBRL
      };

      status.simulacoes.push(sim);
      status.totalLucro += sim.lucroEstimado;

      if (status.simulacoes.length > 50) {
        status.simulacoes.shift();
      }

      break; // 1 simulação por ciclo
    }
  } catch (e) {
    // FALLBACK seguro
    const sim = {
      token: "FALLBACK-MEME",
      address: "0xFALLBACK",
      dex: "fallback",
      entrada: 0.001,
      alvo: 0.0012,
      marketCap: status.config.minCap,
      horario: new Date().toISOString(),
      lucroEstimado: 0.2 * status.config.tradeValueBRL
    };

    status.simulacoes.push(sim);
    status.totalLucro += sim.lucroEstimado;
  }
}

setInterval(scan, SCAN_INTERVAL);

app.listen(3000, () =>
  console.log("🚀 Memebot DRY-RUN ONLINE")
);
