// CDP screenshot + eval helper (node >=22 built-in WebSocket)
const [, , targetUrl, action, ...rest] = process.argv;

async function main() {
  const list = await (await fetch(`http://localhost:${process.env.CDP_PORT || 9222}/json`)).json();
  const target = list.find((t) => t.url.includes(targetUrl));
  if (!target) { console.error("target not found:", targetUrl, list.map(t=>t.url)); process.exit(1); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    }
  };
  await new Promise((r) => (ws.onopen = r));

  if (action === "shot") {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const fs = require("fs");
    const out = rest[0] || "shot.png";
    fs.writeFileSync(out, Buffer.from(data, "base64"));
    console.log("saved", out);
  } else if (action === "eval") {
    const r = await send("Runtime.evaluate", {
      expression: rest.join(" "),
      returnByValue: true,
      awaitPromise: true,
    });
    console.log(JSON.stringify(r.result?.value ?? r.result, null, 1));
  }
  ws.close();
  process.exit(0);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
