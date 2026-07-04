const SYMBOLS = [
  { symbol: "BTCUSDT", group: "市场基准" },
  { symbol: "ETHUSDT", group: "市场基准" },
  { symbol: "HYPEUSDT", group: "目标币种" },
  { symbol: "NEARUSDT", group: "目标币种" },
  { symbol: "ZECUSDT", group: "目标币种" },
  { symbol: "PUMPUSDT", group: "目标币种" },
];

const BASE = "https://fapi.binance.com";
const DATA_BASE = "https://fapi.binance.com/futures/data";
let latestResults = [];
let latestPeriod = "1h";
let latestLimit = "1";

const els = {
  fetchBtn: document.getElementById("fetchBtn"),
  copyBtn: document.getElementById("copyBtn"),
  cards: document.getElementById("cards"),
  status: document.getElementById("status"),
  promptOutput: document.getElementById("promptOutput"),
  coinCopyButtons: document.getElementById("coinCopyButtons"),
  periodSelect: document.getElementById("periodSelect"),
  limitSelect: document.getElementById("limitSelect"),
};

function fmt(value, digits = 4) {
  if (value === null || value === undefined || value === "") return "暂未接入/无数据";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function pct(value, digits = 4) {
  if (value === null || value === undefined || value === "") return "暂未接入/无数据";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return (n * 100).toFixed(digits) + "%";
}

function signedPct(value, digits = 2) {
  if (value === null || value === undefined || value === "") return "暂未接入/无数据";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function safeFetch(label, fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return { ok: false, error: `${label}: ${err.message}` };
  }
}

function latest(arr) {
  return Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null;
}

async function fetchSymbol(symbol, period, limit) {
  const q = `symbol=${symbol}`;
  const dl = `symbol=${symbol}&period=${period}&limit=${limit}`;

  const [ticker, premium, oi, globalLS, topAcc, topPos, taker] = await Promise.all([
    safeFetch("24h行情", () => getJson(`${BASE}/fapi/v1/ticker/24hr?${q}`)),
    safeFetch("标记/指数/资金费率", () => getJson(`${BASE}/fapi/v1/premiumIndex?${q}`)),
    safeFetch("OI", () => getJson(`${BASE}/fapi/v1/openInterest?${q}`)),
    safeFetch("多空账户比", () => getJson(`${DATA_BASE}/globalLongShortAccountRatio?${dl}`)),
    safeFetch("Top账户多空比", () => getJson(`${DATA_BASE}/topLongShortAccountRatio?${dl}`)),
    safeFetch("Top持仓多空比", () => getJson(`${DATA_BASE}/topLongShortPositionRatio?${dl}`)),
    safeFetch("主动买卖量", () => getJson(`${DATA_BASE}/takerlongshortRatio?${dl}`)),
  ]);

  const t = ticker.ok ? ticker.data : null;
  const p = premium.ok ? premium.data : null;
  const o = oi.ok ? oi.data : null;
  const g = globalLS.ok ? latest(globalLS.data) : null;
  const ta = topAcc.ok ? latest(topAcc.data) : null;
  const tp = topPos.ok ? latest(topPos.data) : null;
  const tk = taker.ok ? latest(taker.data) : null;

  return {
    symbol,
    ok: ticker.ok,
    errors: [ticker, premium, oi, globalLS, topAcc, topPos, taker].filter(x => !x.ok).map(x => x.error),
    price: t?.lastPrice,
    changePct: t?.priceChangePercent,
    high: t?.highPrice,
    low: t?.lowPrice,
    volume: t?.volume,
    quoteVolume: t?.quoteVolume,
    openInterest: o?.openInterest,
    markPrice: p?.markPrice,
    indexPrice: p?.indexPrice,
    fundingRate: p?.lastFundingRate,
    nextFundingTime: p?.nextFundingTime,
    globalLongShortRatio: g?.longShortRatio,
    globalLongAccount: g?.longAccount,
    globalShortAccount: g?.shortAccount,
    topAccountLongShortRatio: ta?.longShortRatio,
    topAccountLongAccount: ta?.longAccount,
    topAccountShortAccount: ta?.shortAccount,
    topPositionLongShortRatio: tp?.longShortRatio,
    topPositionLongAccount: tp?.longAccount,
    topPositionShortAccount: tp?.shortAccount,
    takerBuySellRatio: tk?.buySellRatio,
    takerBuyVol: tk?.buyVol,
    takerSellVol: tk?.sellVol,
  };
}

function clsChange(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "";
  return n >= 0 ? "up" : "down";
}

function row(label, value, cls = "") {
  return `<div class="row"><span>${label}</span><span class="${cls}">${value}</span></div>`;
}

function renderCards(results) {
  els.cards.innerHTML = results.map(d => `
    <article class="card">
      <h3>${d.symbol}<span class="badge">${SYMBOLS.find(s => s.symbol === d.symbol)?.group || ""}</span></h3>
      ${row("价格", fmt(d.price))}
      ${row("24h涨跌", signedPct(d.changePct), clsChange(d.changePct))}
      ${row("24h高/低", `${fmt(d.high)} / ${fmt(d.low)}`)}
      ${row("24h成交量", fmt(d.volume))}
      ${row("24h成交额", fmt(d.quoteVolume))}
      ${row("OI 持仓量", fmt(d.openInterest))}
      ${row("资金费率", pct(d.fundingRate))}
      ${row("标记/指数价格", `${fmt(d.markPrice)} / ${fmt(d.indexPrice)}`)}
      ${row("多空账户比", fmt(d.globalLongShortRatio))}
      ${row("多账户/空账户", `${pct(d.globalLongAccount, 2)} / ${pct(d.globalShortAccount, 2)}`)}
      ${row("Top账户多空比", fmt(d.topAccountLongShortRatio))}
      ${row("Top持仓多空比", fmt(d.topPositionLongShortRatio))}
      ${row("主动买/卖量", `${fmt(d.takerBuyVol)} / ${fmt(d.takerSellVol)}`)}
      ${row("主动买卖比", fmt(d.takerBuySellRatio))}
      ${d.errors.length ? row("提示", d.errors.slice(0, 2).join("；"), "warn") : ""}
    </article>
  `).join("");
}

function block(d) {
  return `【${d.symbol}】
- 价格：${fmt(d.price)}
- 24h涨跌：${signedPct(d.changePct)}
- 24h高/低：${fmt(d.high)} / ${fmt(d.low)}
- 24h成交量：${fmt(d.volume)}
- 24h成交额：${fmt(d.quoteVolume)}
- OI持仓量：${fmt(d.openInterest)}
- 资金费率：${pct(d.fundingRate)}
- 标记价格/指数价格：${fmt(d.markPrice)} / ${fmt(d.indexPrice)}
- 多空账户比：${fmt(d.globalLongShortRatio)}（多账户：${pct(d.globalLongAccount, 2)}，空账户：${pct(d.globalShortAccount, 2)}）
- Top Trader账户多空比：${fmt(d.topAccountLongShortRatio)}（多账户：${pct(d.topAccountLongAccount, 2)}，空账户：${pct(d.topAccountShortAccount, 2)}）
- Top Trader持仓多空比：${fmt(d.topPositionLongShortRatio)}（多持仓：${pct(d.topPositionLongAccount, 2)}，空持仓：${pct(d.topPositionShortAccount, 2)}）
- 主动买量/卖量：${fmt(d.takerBuyVol)} / ${fmt(d.takerSellVol)}
- 主动买卖比：${fmt(d.takerBuySellRatio)}
- 数据状态：${d.errors.length ? d.errors.join("；") : "正常"}`;
}


function buildSingleCoinPrompt(results, targetSymbol, period, limit) {
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  const btc = results.find(d => d.symbol === "BTCUSDT");
  const target = results.find(d => d.symbol === targetSymbol);
  if (!target) return "";

  const btcSection = btc
    ? block(btc)
    : "【BTCUSDT】\n- 数据状态：未获取到 BTC 基准数据";

  const compareNote = targetSymbol === "BTCUSDT"
    ? "本次分析对象就是 BTC，请重点分析 BTC 自身趋势、合约结构和市场风险。"
    : "请重点比较本币种与 BTC 的强弱关系：如果 BTC 弱而本币种强，判断是否为独立资金拉盘、轧空或诱多；如果 BTC 强而本币种弱，判断是否为资金流出或相对弱势。";

  return `请作为专业加密货币衍生品交易分析师，基于以下“截止当前时间点”的 Binance USD-M 合约数据，分析 ${targetSymbol} 的主力行为、轧空/诱多概率、关键风险和未来24小时走势。

分析要求：
1. 不要只看价格，重点结合 OI、资金费率、多空账户比、Top Trader、多空持仓、主动买卖量和成交量结构。
2. 必须先用 BTCUSDT 作为市场基准，再分析 ${targetSymbol} 是否强于/弱于 BTC。
3. ${compareNote}
4. 给出 ${targetSymbol} 未来24小时偏多/偏空/震荡概率，并明确关键风险位。
5. 如果某个字段无数据，要说明可能是交易所接口或合约支持限制，不要编造。

更新时间：${now}
数据周期：${period}，返回条数：${limit}

【BTC 市场基准】

${btcSection}

【本币种数据】

${block(target)}
`;
}

function renderCoinCopyButtons(results) {
  if (!els.coinCopyButtons) return;
  if (!results.length) {
    els.coinCopyButtons.innerHTML = `<span class="muted">请先获取数据</span>`;
    return;
  }

  els.coinCopyButtons.innerHTML = results.map(d => `
    <button class="coin-copy-btn" data-symbol="${d.symbol}">复制 ${d.symbol} + BTC</button>
  `).join("");

  els.coinCopyButtons.querySelectorAll("button[data-symbol]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const symbol = btn.dataset.symbol;
      const text = buildSingleCoinPrompt(latestResults, symbol, latestPeriod, latestLimit);
      if (!text.trim()) {
        alert("请先获取数据");
        return;
      }
      await navigator.clipboard.writeText(text);
      els.promptOutput.value = text;
      els.status.textContent = `${symbol} + BTC AI Prompt 已复制`;
    });
  });
}

function buildPrompt(results, period, limit) {
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  const benchmarks = results.filter(d => ["BTCUSDT", "ETHUSDT"].includes(d.symbol));
  const targets = results.filter(d => !["BTCUSDT", "ETHUSDT"].includes(d.symbol));
  return `请作为专业加密货币衍生品交易分析师，基于以下“截止当前时间点”的 Binance USD-M 合约数据，分析主力行为、轧空/诱多概率、关键风险和未来24小时走势。

分析要求：
1. 不要只看价格，重点结合 OI、资金费率、多空账户比、Top Trader、多空持仓、主动买卖量和成交量结构。
2. 先判断 BTC/ETH 市场基准强弱，再分析目标币种是否存在独立行情。
3. 给出每个币未来24小时偏多/偏空/震荡概率，并明确关键风险位。
4. 如果某个字段无数据，要说明可能是交易所接口或合约支持限制，不要编造。

更新时间：${now}
数据周期：${period}，返回条数：${limit}

【市场基准】

${benchmarks.map(block).join("\n\n")}

【目标币种】

${targets.map(block).join("\n\n")}
`;
}

async function run() {
  els.fetchBtn.disabled = true;
  els.status.textContent = "正在获取数据...";
  els.cards.innerHTML = "";
  const period = els.periodSelect.value;
  const limit = els.limitSelect.value;
  try {
    const results = [];
    for (const item of SYMBOLS) {
      els.status.textContent = `正在获取 ${item.symbol}...`;
      results.push(await fetchSymbol(item.symbol, period, limit));
    }
    latestResults = results;
    latestPeriod = period;
    latestLimit = limit;
    renderCards(results);
    renderCoinCopyButtons(results);
    els.promptOutput.value = buildPrompt(results, period, limit);
    els.status.textContent = "数据获取完成";
  } catch (err) {
    els.status.textContent = `获取失败：${err.message}`;
  } finally {
    els.fetchBtn.disabled = false;
  }
}

async function copyPrompt() {
  if (!els.promptOutput.value.trim()) {
    alert("请先获取数据");
    return;
  }
  await navigator.clipboard.writeText(els.promptOutput.value);
  els.status.textContent = "AI Prompt 已复制";
}

els.fetchBtn.addEventListener("click", run);
els.copyBtn.addEventListener("click", copyPrompt);

renderCoinCopyButtons([]);
