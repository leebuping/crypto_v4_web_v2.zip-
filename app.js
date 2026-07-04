const benchmarkSymbols = ["BTCUSDT", "ETHUSDT"];
const targetSymbols = ["HYPEUSDT", "NEARUSDT", "ZECUSDT", "PUMPUSDT"];
const allSymbols = [...benchmarkSymbols, ...targetSymbols];

const fetchBtn = document.getElementById("fetchBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const benchmarkCards = document.getElementById("benchmarkCards");
const targetCards = document.getElementById("targetCards");
const promptBox = document.getElementById("promptBox");

let latestData = [];

function formatNumber(value, digits = 4) {
  if (value === null || value === undefined || value === "") return "N/A";
  const num = Number(value);
  if (Number.isNaN(num)) return "N/A";
  if (Math.abs(num) >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (Math.abs(num) >= 1_000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return num.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
}

function formatPercent(value, digits = 2) {
  const num = Number(value);
  if (Number.isNaN(num)) return "N/A";
  const sign = num > 0 ? "+" : "";
  return sign + num.toFixed(digits) + "%";
}

function pctClass(value) {
  const num = Number(value);
  if (num > 0) return "positive";
  if (num < 0) return "negative";
  return "";
}

async function fetchTicker(symbol) {
  const url = `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${symbol} 24h行情获取失败`);
  return await res.json();
}

async function fetchFunding(symbol) {
  const url = `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${symbol} 资金费率获取失败`);
  return await res.json();
}

async function fetchOpenInterest(symbol) {
  const url = `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${symbol} OI获取失败`);
  return await res.json();
}

async function fetchSymbolData(symbol) {
  try {
    const [ticker, funding, oi] = await Promise.all([
      fetchTicker(symbol),
      fetchFunding(symbol),
      fetchOpenInterest(symbol),
    ]);

    const price = Number(ticker.lastPrice);
    const quoteVolume = Number(ticker.quoteVolume);
    const openInterest = Number(oi.openInterest);
    const oiValue = openInterest * price;
    const fundingRate = Number(funding.lastFundingRate) * 100;

    return {
      symbol,
      ok: true,
      price,
      changePercent: Number(ticker.priceChangePercent),
      high: Number(ticker.highPrice),
      low: Number(ticker.lowPrice),
      volume: Number(ticker.volume),
      quoteVolume,
      openInterest,
      oiValue,
      fundingRate,
      markPrice: Number(funding.markPrice),
      indexPrice: Number(funding.indexPrice),
      nextFundingTime: funding.nextFundingTime ? new Date(funding.nextFundingTime).toLocaleString() : "N/A",
    };
  } catch (err) {
    return { symbol, ok: false, error: err.message };
  }
}

function createCard(item) {
  const div = document.createElement("div");
  div.className = "card";

  if (!item.ok) {
    div.innerHTML = `<h3>${item.symbol}</h3><div class="row"><span class="label">状态</span><span class="value negative">失败</span></div><div class="row"><span class="label">原因</span><span class="value">${item.error}</span></div>`;
    return div;
  }

  div.innerHTML = `
    <h3>${item.symbol}</h3>
    <div class="row"><span class="label">价格</span><span class="value">${formatNumber(item.price)}</span></div>
    <div class="row"><span class="label">24h涨跌</span><span class="value ${pctClass(item.changePercent)}">${formatPercent(item.changePercent)}</span></div>
    <div class="row"><span class="label">24h高点</span><span class="value">${formatNumber(item.high)}</span></div>
    <div class="row"><span class="label">24h低点</span><span class="value">${formatNumber(item.low)}</span></div>
    <div class="row"><span class="label">24h成交量</span><span class="value">${formatNumber(item.volume)}</span></div>
    <div class="row"><span class="label">24h成交额</span><span class="value">${formatNumber(item.quoteVolume)}</span></div>
    <div class="row"><span class="label">OI币本位</span><span class="value">${formatNumber(item.openInterest)}</span></div>
    <div class="row"><span class="label">OI估算U本位</span><span class="value">${formatNumber(item.oiValue)}</span></div>
    <div class="row"><span class="label">资金费率</span><span class="value ${pctClass(item.fundingRate)}">${formatPercent(item.fundingRate, 4)}</span></div>
    <div class="row"><span class="label">标记价格</span><span class="value">${formatNumber(item.markPrice)}</span></div>
  `;
  return div;
}

function renderCards(data) {
  benchmarkCards.innerHTML = "";
  targetCards.innerHTML = "";

  data.filter(x => benchmarkSymbols.includes(x.symbol)).forEach(item => benchmarkCards.appendChild(createCard(item)));
  data.filter(x => targetSymbols.includes(x.symbol)).forEach(item => targetCards.appendChild(createCard(item)));
}

function blockForSymbol(item) {
  if (!item.ok) {
    return `【${item.symbol}】\n- 数据状态：获取失败\n- 失败原因：${item.error}\n`;
  }
  return `【${item.symbol}】\n` +
    `- 价格：${formatNumber(item.price)}\n` +
    `- 24h涨跌：${formatPercent(item.changePercent)}\n` +
    `- 24h高/低：${formatNumber(item.high)} / ${formatNumber(item.low)}\n` +
    `- 24h成交量：${formatNumber(item.volume)}\n` +
    `- 24h成交额：${formatNumber(item.quoteVolume)}\n` +
    `- OI币本位：${formatNumber(item.openInterest)}\n` +
    `- OI估算U本位：${formatNumber(item.oiValue)}\n` +
    `- 资金费率：${formatPercent(item.fundingRate, 4)}\n` +
    `- 标记价格：${formatNumber(item.markPrice)}\n` +
    `- 指数价格：${formatNumber(item.indexPrice)}\n` +
    `- 下一次资金费率结算：${item.nextFundingTime}\n` +
    `- 多空账户比：暂未接入\n` +
    `- Top Trader多空比：暂未接入\n` +
    `- 主动买量/卖量：暂未接入\n`;
}

function buildPrompt(data) {
  const now = new Date().toLocaleString();
  const benchmark = data.filter(x => benchmarkSymbols.includes(x.symbol)).map(blockForSymbol).join("\n");
  const targets = data.filter(x => targetSymbols.includes(x.symbol)).map(blockForSymbol).join("\n");

  return `请作为专业加密货币衍生品交易分析师，基于以下“截止当前时间点的最近24小时”多币种合约数据，分析市场结构、主力行为、轧空/诱多概率、关键风险和未来24小时走势。\n\n重点要求：\n1. 不要只看价格，要重点结合 OI、资金费率、成交量结构、BTC/ETH基准环境。\n2. 对 BTC、ETH 作为市场基准进行判断。\n3. 对 HYPE、NEAR、ZEC、PUMP 分别判断强弱、风险、是否存在独立行情。\n4. 给出未来24小时概率路径：上涨、震荡、下跌、极端插针。\n5. 明确指出哪些数据暂缺，不能过度推断。\n\n更新时间：${now}\n数据源：Binance USD-M Futures 公共接口\n\n【市场基准】\n${benchmark}\n【目标币种】\n${targets}\n\n请输出：\n- 市场总体判断\n- BTC/ETH 对山寨币的影响\n- 每个目标币种的多空结构判断\n- 轧空概率\n- 诱多概率\n- 未来24小时走势概率\n- 关键风险位和观察指标\n- 最后给出保守、激进两种交易思路。`;
}

async function getData() {
  statusEl.textContent = "正在获取 Binance 合约数据...";
  fetchBtn.disabled = true;
  latestData = await Promise.all(allSymbols.map(fetchSymbolData));
  renderCards(latestData);
  promptBox.value = buildPrompt(latestData);
  const successCount = latestData.filter(x => x.ok).length;
  statusEl.textContent = `完成：成功 ${successCount}/${allSymbols.length}，更新时间 ${new Date().toLocaleString()}`;
  fetchBtn.disabled = false;
}

async function copyPrompt() {
  if (!promptBox.value.trim()) {
    statusEl.textContent = "还没有 Prompt，请先获取数据。";
    return;
  }
  await navigator.clipboard.writeText(promptBox.value);
  statusEl.textContent = "AI 分析 Prompt 已复制。";
}

fetchBtn.addEventListener("click", getData);
copyBtn.addEventListener("click", copyPrompt);
clearBtn.addEventListener("click", () => {
  latestData = [];
  benchmarkCards.innerHTML = "";
  targetCards.innerHTML = "";
  promptBox.value = "";
  statusEl.textContent = "已清空。";
});
