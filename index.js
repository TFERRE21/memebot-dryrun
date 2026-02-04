<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Memebot — Solana</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; background:#f7f7f7 }
    h1 { margin-bottom: 10px }
    .card { background:#fff; padding:20px; border-radius:8px; max-width:560px }
    label { display:block; margin-top:12px }
    input, select, button {
      width:100%; padding:10px; margin-top:6px; font-size:14px
    }
    button { cursor:pointer }
    .row { display:flex; gap:10px; margin-top:16px }
    .row button { flex:1 }
    .status { margin-top:15px; padding:10px; background:#eee; border-radius:6px; white-space:pre-wrap }
    ul { padding-left:18px }
    li { margin-bottom:6px }
    .profit { margin-top:10px; font-weight:bold }
  </style>
</head>
<body>

<h1>🤖 Memebot — Solana</h1>

<div class="card">
  <label>Rede</label>
  <select disabled>
    <option>Solana</option>
  </select>

  <label>Market Cap mínimo (USD)</label>
  <input type="number" id="minCap" value="20000" />

  <label>Valor por trade (R$)</label>
  <input type="number" id="tradeValue" value="100" />

  <label>Take Profit (%)</label>
  <input type="number" id="takeProfit" value="20" />

  <div class="row">
    <button onclick="startBot()">▶️ Ligar bot</button>
    <button onclick="stopBot()">⏹️ Parar bot</button>
  </div>

  <div class="status" id="status">
    Conectando ao servidor...
  </div>

  <div class="profit" id="profit"></div>
  <ul id="simulacoes"></ul>
</div>

<script>
const API = "https://memebot-dryrun.onrender.com";

async function refreshStatus() {
  try {
    const r = await fetch(API + "/status");
    const data = await r.json();

    // status texto
    document.getElementById("status").innerText =
      data.ligado ? "🟢 BOT LIGADO" : "🔴 BOT PARADO";

    // simulações
    const ul = document.getElementById("simulacoes");
    ul.innerHTML = "";

    let lucroTotal = 0;
    const tradeValue = data.config?.tradeValueBRL || 0;
    const takeProfit = data.config?.takeProfit || 0;

    if (data.simulacoes) {
      data.simulacoes.forEach(s => {
        const lucro = tradeValue * (takeProfit / 100);
        lucroTotal += lucro;

        const li = document.createElement("li");
        li.innerText =
          `${s.token} | Entrada: $${Number(s.preco).toFixed(6)} → Alvo: $${Number(s.alvo).toFixed(6)} (+${takeProfit}%)`;
        ul.appendChild(li);
      });
    }

    document.getElementById("profit").innerText =
      `💰 Lucro acumulado (simulado): R$ ${lucroTotal.toFixed(2)}`;

  } catch (e) {
    document.getElementById("status").innerText =
      "Erro ao conectar ao servidor";
  }
}

async function startBot() {
  const config = {
    network: "solana",
    minCap: Number(document.getElementById("minCap").value),
    tradeValueBRL: Number(document.getElementById("tradeValue").value),
    takeProfit: Number(document.getElementById("takeProfit").value)
  };

  await fetch(API + "/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });

  refreshStatus();
}

async function stopBot() {
  await fetch(API + "/stop", { method: "POST" });
  refreshStatus();
}

setInterval(refreshStatus, 5000);
refreshStatus();
</script>

</body>
</html>
