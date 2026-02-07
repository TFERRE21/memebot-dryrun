 import express from "express";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import { antiRugCheck } from "./antiRug.js";
import { alert } from "./telegram.js";
import { buy, sell } from "./okx.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const STORAGE = "./storage.json";
const SCAN_INTERVAL = 15000;

// ---------- PERSISTÊNCIA ----------
function load() {
  if (!fs.existsSync(STORAGE)) {
    return { ligado:false, config:null, simulacoes:[], totalLucro:0, tradesHoje:0 };
  }
  return JSON.parse(fs.readFileSync(STORAGE));
}
function save() {
  fs.writeFileSync(STORAGE, JSON.stringify(status, null, 2));
}

// ---------- ESTADO ----------
let status = load();
const vistos = new Set((status.simulacoes || []).map(s => s.address));

// ---------- ROTAS ----------
app.post("/start", async (req, res) => {
  status.ligado = true;
  status.config = req.body;
  save();
  await alert("🟢 Bot LIGADO");
  res.json({ ok: true, status });
});

app.post("/stop", async (req, res) => {
  status.ligado = false;
  save();
  await alert("🔴 Bot PARADO");
  res.json({ ok: true });
});

app.get("/status", (req, res) => res.json(status));

// ---------- SCAN (SNIPER REAL) ----------
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
      if (!p.baseToken?.address || !p.priceUsd || !p.fdv) continue;
      if (p.fdv < minCap) continue;
      if (!["raydium","orca"].includes(p.dexId)) continue;
      if (!p.pairCreatedAt || agora - p.pairCreatedAt > 3 * 60 * 60 * 1000) continue;
      if (!antiRugCheck(p)) continue;

      const addr = p.baseToken.address;
      if (vistos.has(addr)) continue;
      vistos.add(addr);

      const entrada = Number(p.priceUsd);
      const alvo = entrada * (1 + takeProfit / 100);
      const lucroEstimado = (tradeValueBRL * takeProfit) / 100;

      const trade = {
        token: p.baseToken.symbol,
        address: addr,
        dex: p.dexId,
        entrada,
        alvo,
        marketCap: p.fdv,
        liquidez: p.liquidity?.usd || 0,
        volume24h: p.volume?.h24 || 0,
        horario: new Date().toISOString(),
        status: "OPEN",
        lucroEstimado
      };

      status.simulacoes.push(trade);
      save();

      await alert(`🚀 NOVO TRADE ${trade.token}\nEntrada: ${entrada}\nAlvo: ${alvo}`);

      // OKX (real só se MODO_REAL=true)
      await buy("SOL-USDT", tradeValueBRL);

      break; // 1 trade por ciclo
    }
  } catch (e) {
    console.log("Erro scan:", e.message);
  }
}

setInterval(scan, SCAN_INTERVAL);

// ---------- START ----------
app.listen(PORT, () => {
  console.log("🤖 Memebot ONLINE (mantido + itens adicionados)");
});
