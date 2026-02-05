<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Memebot — Solana</title>
<style>
body {
  font-family: Arial, sans-serif;
  background: #f6f6f6;
  padding: 30px;
}
.card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  max-width: 520px;
}
label { display:block; margin-top:12px }
input, button, select {
  width:100%;
  padding:10px;
  margin-top:6px;
}
.row { display:flex; gap:10px; margin-top:12px }
.row button { flex:1 }
.status {
  margin-top:15px;
  background:#eee;
  padding:10px;
  border-radius:6px;
  white-space:pre-wrap;
}
table {
  width:100%;
  margin-top:15px;
  border-collapse:collapse;
}
th, td {
  border:1px solid #ccc;
  padding:6px;
  font-size:13px;
}
th { background:#f0f0f0 }
.green { color:green }
.red { color:red }
</style>
</head>

<body>

<h2>🤖 Memebot — Solana</h2>

<div class="card">
<label>Market Cap mínimo (USD)</label>
<input id="minCap" type="number" value="30" />

<label>Valor por trade (R$)</label>
<input id="tradeValue" type="number" value="100" />

<label>Take Profit (%)</label>
<input id="takeProfit" type="number" value="20" />

<div class="row">
<button onclick="startBot()">▶️ Ligar bot</button>
<button onclick="stopBot()">⏹️ Parar bot</button>
</div>

<div class="status" id="status">Status: parado</div>

<h3>📊 Resultado</h3>
<div id="resultado"></div>

<table id="tabela">
<thead>
<tr>
<th>Token</th>
<th>Entrada</th>
<th>Alvo</th>
<th>Lucro (R$)</th>
</tr>
</thead>
<tbody></tbody>
</table>
</div>

<script>
const API = "https://memebot-dryrun.onrender.com";

async function startBot() {
  const cfg = {
    network: "solana",
    minCap: Number(minCap.value),
    tradeValueBRL: Number(tradeValue.value),
    takeProfit: Number(takeProfit.value)
  };

  await fetch(API + "/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cfg)
  });

  document.getElementById("status").innerText =
    "Status: bot LIGADO\n" + JSON.stringify(cfg, null, 2);
}

async function stopBot() {
  await fetch(API + "/stop", { method: "POST" });
  document.getElementById("status").innerText = "Status: parado";
}

async function syncStatus() {
  const r = await fetch(API + "/status");
  const data = await r.json();

  if (!data.ligado) return;

  let totalLucro = 0;
  const tbody = document.querySelector("#tabela tbody");
  tbody.innerHTML = "";

  for (const s of data.simulacoes) {
    const lucroPct = (s.alvo - s.entrada) / s.entrada;
    const lucroRS = data.config.tradeValueBRL * lucroPct;
    totalLucro += lucroRS;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.token}</td>
      <td>${s.entrada}</td>
      <td>${s.alvo.toFixed(6)}</td>
      <td class="${lucroRS >= 0 ? "green":"red"}">
        R$ ${lucroRS.toFixed(2)}
      </td>
    `;
    tbody.appendChild(tr);
  }

  document.getElementById("resultado").innerHTML = `
    Trades: <b>${data.simulacoes.length}</b><br>
    Resultado total:
    <b class="${totalLucro>=0?"green":"red"}">
      R$ ${totalLucro.toFixed(2)}
    </b>
  `;
}

setInterval(syncStatus, 5000);
</script>

</body>
</html>
