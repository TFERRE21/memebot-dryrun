<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Memebot — Solana</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; background:#f7f7f7 }
    h1 { margin-bottom: 10px }
    .card { background:#fff; padding:20px; border-radius:8px; max-width:520px }
    label { display:block; margin-top:12px }
    input, select, button {
      width:100%; padding:10px; margin-top:6px; font-size:14px
    }
    button { cursor:pointer }
    .row { display:flex; gap:10px; margin-top:16px }
    .row button { flex:1 }
    .status { margin-top:15px; padding:10px; background:#eee; border-radius:6px; white-space:pre-wrap }
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
    Status: aguardando servidor...
  </div>
</div>

<script>
const API = "https://memebot-dryrun.onrender.com";

// 🔁 Atualiza status automaticamente
async function refreshStatus() {
  try {
    const r = await fetch(API + "/status");
    const data = await r.json();

    let text = data.ligado ? "🟢 BOT LIGADO\n" : "🔴 BOT PARADO\n";
    if (data.config) {
      text += "\nConfig:\n" + JSON.stringify(data.config, null, 2);
    }
    if (data.simulacoes && data.simulacoes.length > 0) {
      text += "\n\nSimulações:\n" + JSON.stringify(data.simulacoes, null, 2);
    }

    document.getElementById("status").innerText = text;
  } catch (e) {
    document.getElementById("status").innerText =
      "Erro ao conectar ao servidor";
  }
}

// ▶️ Ligar bot
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

// ⏹️ Parar bot
async function stopBot() {
  await fetch(API + "/stop", { method: "POST" });
  refreshStatus();
}

// inicia polling a cada 5s
setInterval(refreshStatus, 5000);
refreshStatus();
</script>

</body>
</html>
