<script>
async function startBot() {
  const config = {
    network: "solana",
    minCap: Number(document.getElementById("minCap").value),
    tradeValueBRL: Number(document.getElementById("tradeValue").value),
    takeProfit: Number(document.getElementById("takeProfit").value)
  };

  const res = await fetch("https://memebot-dryrun.onrender.com/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(config)
  });

  const data = await res.json();

  document.getElementById("status").innerText =
    "Status: bot LIGADO\n" + JSON.stringify(data, null, 2);
}

async function stopBot() {
  await fetch("https://memebot-dryrun.onrender.com/stop", {
    method: "POST"
  });

  document.getElementById("status").innerText =
    "Status: bot PARADO";
}
</script>
