import express from "express";
import axios from "axios";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

// ================= CONFIG =================
const PORT = process.env.PORT || 3000;
const SCAN_INTERVAL = 15000; // 15s
const MONITOR_INTERVAL = 8000; // 8s
const TRAILING_PERC = 0.05; // 5%
const MODO_REAL = process.env.MODO_REAL === "true";

// Telegram
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

// ================= STATE =================
let status = {
  ligado: false,
  config: null,
  simulacoes: [],
  totalLucro: 0
};

const vistos = new Set();

// ================= UTILS =================
async function sendTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await axios.post(
      `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
      { chat_id: TG_CHAT, text }
    );
  } catch {}
}

// ================= ROTAS =================
app.post("/start", async (req, res) => {
  status.ligado = true;
  status.config = req.body;
  status.simulacoes = [];
  status.totalLucro = 0;
  await sendTelegram("🟢 Bot LIGADO (paper trading)");
  res.json({ ok: true, status });
});

app.post("/stop", async (req, res) => {
  status.ligado = false;
  await sendTelegram("🔴 Bot PARADO");
  res.json({ ok: true });
});

app.get("/status", (req, res) => res.json(status));

// ================= SCAN SNIPER REAL =================
async function scan() {
  if (!status.ligado || !status.config) return;

  const { minCap, tradeValueBRL, takeProfit } = status.config;

  try {
    const r = await axios.get(
      "https://api.dexscreener.com/latest/dex/pairs/solana",
      { timeout: 10000 }
    );
    const pairs = r.data?.pairs || [];
    const now = Date.now();

    for (const p of pairs) {
      if (!p.baseToken?.address) continue;
      if (!p.priceUsd || !p.liquidity?.usd || !p.volume?.h24) continue;
      if (!p.fdv || p.fdv < minCap) continue;

      // SNIPER
      if (p.liquidity.usd < 1000) continue;
      if (p.volume.h24 < 2000) continue;
      if (!["raydium", "orca"].includes(p.dexId)) continue;
      if (!p.pairCreatedAt || now - p.pairCreatedAt > 60 * 60 * 1000) continue;

      const id = p.baseToken.address;
      if (vistos.has(id)) continue;
      vistos.add(id);

      const entrada = Number(p.priceUsd);
      const alvo = entrada * (1 + takeProfit / 100);
      const lucroEstimado = (tradeValueBRL * takeProfit) / 100;

      const trade = {
        token: p.baseToken.symbol,
        address: id,
        dex: p.dexId,
        entrada,
        alvo,
        marketCap: p.fdv,
        liquidez: p.liquidity.usd,
        volume24h: p.volume.h24,
        horario: new Date().toISOString(),
        status: "OPEN",
        maxPreco: entrada,
        stopAtual: entrada * (1 - TRAILING_PERC),
        lucroEstimado
      };

      status.simulacoes.push(trade);
      await sendTelegram(
        `🚀 NOVO TRADE\n${trade.token}\nEntrada: ${entrada}\nAlvo: ${alvo}`
      );

      break; // 1 por ciclo
    }
  } catch (e) {
    // silêncio: sem fallback (A + C)
  }
}

// ================= MONITOR (PAPER + TRAILING) =================
async function monitorTrades() {
  if (!status.ligado) return;

  for (const t of status.simulacoes) {
    if (t.status !== "OPEN") continue;

    // Simulação de preço (troque por preço real depois)
    const precoAtual = t.maxPreco * 1.02;

    // Atualiza máximo e trailing
    if (precoAtual > t.maxPreco) {
      t.maxPreco = precoAtual;
      t.stopAtual = t.maxPreco * (1 - TRAILING_PERC);
    }

    // Bateu alvo ou stop
    if (precoAtual >= t.alvo || precoAtual <= t.stopAtual) {
      t.status = "CLOSED";
      status.totalLucro += t.lucroEstimado;

      await sendTelegram(
        `✅ TRADE FECHADO\n${t.token}\nLucro: R$ ${t.lucroEstimado.toFixed(2)}`
      );
    }
  }
}

setInterval(scan, SCAN_INTERVAL);
setInterval(monitorTrades, MONITOR_INTERVAL);

app.listen(PORT, () =>
  console.log("🤖 Memebot ONLINE (paper trading + sniper)")
);
