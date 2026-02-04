<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Memebot — Solana</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 30px;
      background: #f7f7f7;
    }

    h1 {
      margin-bottom: 10px;
    }

    .card {
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      max-width: 520px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    label {
      display: block;
      margin-top: 12px;
      font-weight: bold;
    }

    input, select, button {
      width: 100%;
      padding: 10px;
      margin-top: 6px;
      font-size: 14px;
    }

    button {
      cursor: pointer;
    }

    .row {
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }

    .row button {
      flex: 1;
    }

    .status {
      margin-top: 15px;
      padding: 10px;
      background: #eee;
      border-radius: 6px;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 13px;
    }
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
Status: parado
  </div>

</div>

<script>
async function startBot() {
  const config = {
    network: "solana",
    minCap: Number(document.getElementById("minCap").value),
    tradeValueBRL: Number(document.getElementById("tradeValue").value),
    takeProfit: Number(document.getElementById("takeProfit").value)
