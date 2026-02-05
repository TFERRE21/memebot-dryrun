import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let state = {
  ligado: false,
  config: null,
  simulacoes: []
};

app.post("/start", (req, res) => {
  state.ligado = true;
  state.config = req.body;
  state.simulacoes = [];

  res.json({
    ok: true,
    msg: "Bot ligado (simulação)",
    config: state.config
  });
});

app.post("/stop", (req, res) => {
  state.ligado = false;
  res.json({ ok: true });
});

app.get("/status", (req, res) => {
  res.json(state);
});

// 🔧 SIMULAÇÃO DE TESTE (FAKE)
async function scan() {
  if (!state.ligado || !state.config) return;

  state.simulacoes.push({
    token: "TEST-MEME",
    preco: 0.001,
    alvo: 0.001 * (1 + state.config.takeProfit / 100),
    marketCap: state.config.minCap + 1000,
    horario: new Date().toISOString()
  });
}

setInterval(scan, 15000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("Memebot DRY-RUN ONLINE")
);
