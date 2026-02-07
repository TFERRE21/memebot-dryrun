import express from "express";
import axios from "axios";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

// ================= CONFIG =================
const PORT = process.env.PORT || 3000;
const SCAN_INTERVAL = 15000;     // 15s
const MONITOR_INTERVAL = 8000;   // 8s
const TRAILING_PERC = 0.05;      // 5% trailing stop

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

// tokens já usados (anti-duplicação)
const vistos = new Set();

// ================= UTIL =================
async function sendTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await axios.post(
      `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
      { chat_id: TG_CHAT, text }
    );
  } catch (e) {
    console.log("Erro Telegram");
  }
}

// ================= ROTAS =================
app.post("/start", async (req, res) => {
  status.ligado = true;
  status.config = req.body;
  status.simulacoes = [];
  status.totalLucro = 0;
  vistos.clear();

  await sendTelegram("🟢 Bot LIGADO (SNIPER REAL)");

  res.json({
    ok: true,
    msg: "Bot ligado",
    config: status.config
  });
});

app.post("/stop", async (req, res) => {
  status.ligado = false;
  await sendTelegram("🔴 Bot PARADO");
  res.json({ ok: true });
});

app.get("/status", (req, res) => {
  res.json(status);
});

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
    const agora = Date.now();

    for (const p of pairs) {
      // validações básicas
      if (!p.baseToken?.address) continue;
      if (!p.priceUsd) continue;
      if (!p.liquidity?.usd || !p.volume?.h24) continue;
      if (!p.fdv || p.fdv < minCap) continue;

      // 🔹 DEX permitidas
      if (!["raydium", "orca"].includes(p.dexId)) continue;

      // 🔹 token novo (ATÉ 3 HORAS)
      if (!p.pairCreatedAt) continue;
      if (agora - p.pairCreatedAt > 3 * 60 * 60 * 1000) continue;

      // 🔹 liquidez e volume (AJUSTADO)
      if (p.liquidity.usd < 500) continue;
      if (p.volume.h24 < 500) continue;

      const tokenId = p.baseToken.address;
      if (vistos.has(tokenId)) continue;

      vistos.add(tokenId);

      const entrada = Number(p.priceUsd);
      const alvo = entrada * (1 + takeProfit / 100);
      const lucroEstimado = (tradeValueBRL * takeProfit) / 100;

      const trade = {
        token: p.baseToken.symbol,
        address: tokenId,
        dex: p.dexId,
        entrada,
        alvo,
        marketCap: p.fdv,
        liquidez: p.liquidity.usd,
        volume24h: p.volume.h24,
        horario: new Date().toISOString(),

        // paper trading
        status: "OPEN",
        maxPreco: entrada,
        stopAtual: entrada * (1 - TRAILING_PERC),
        lucroEstimado
      };

      status.simulacoes.push(trade);

      await sendTelegram(
        `🚀 NOVO TRADE\n` +
        `Token: ${trade.token}\n` +
        `DEX: ${trade.dex}\n` +
        `Entrada: ${trade.entrada}\n` +
        `Alvo: ${trade.alvo}`
      );

      break; // 1 trade por ciclo
    }
  } catch (e) {
    console.log("Erro no scan:", e.message);
  }
}

// ================= MONITOR (PAPER + TRAILING) =================
async function monitorTrades() {
  if (!status.ligado) return;

  for (const t of status.simulacoes) {
    if (t.status !== "OPEN") continue;

    // 🔁 SIMULA preço andando (substitui depois por preço real)
    const precoAtual = t.maxPreco * 1.02;

    // atualiza máximo e trailing stop
    if (precoAtual > t.maxPreco) {
      t.maxPreco = precoAtual;
      t.stopAtual = t.maxPreco * (1 - TRAILING_PERC);
    }

    // fecha trade (alvo ou trailing)
    if (precoAtual >= t.alvo || precoAtual <= t.stopAtual) {
      t.status = "CLOSED";
      status.totalLucro += t.lucroEstimado;

      await sendTelegram(
        `✅ TRADE FECHADO\n` +
        `Token: ${t.token}\n` +
        `Lucro: R$ ${t.lucroEstimado.toFixed(2)}`
      );
    }
  }
}

// ================= LOOPS =================
setInterval(scan, SCAN_INTERVAL);
setInterval(monitorTrades, MONITOR_INTERVAL);

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log("🤖 Memebot SNIPER REAL rodando");
});
