# Crypto V4 Web Analyzer - V2

这是一个本地网页版本的加密货币合约数据面板。

## 支持币种

- BTCUSDT
- ETHUSDT
- HYPEUSDT
- NEARUSDT
- ZECUSDT
- PUMPUSDT

## 当前版本功能

- 获取 Binance USD-M Futures 的 24h 行情
- 获取当前价格、24h涨跌、高低点、成交量、成交额
- 获取 OI（持仓量）
- 获取资金费率
- 自动生成可复制给 AI 的分析 Prompt

## 使用方法

1. 解压 ZIP
2. 双击 index.html
3. 点击“获取最新数据”
4. 点击“复制 AI 分析 Prompt”
5. 粘贴到 AI 对话框分析

## 注意

- 这是纯前端版本，不需要安装 Python。
- 数据来自 Binance 公共接口。
- 如果浏览器或网络限制跨域访问，可能需要后续升级为 Python/Node 后端版本。
- 多空账户比、Top Trader 多空比、主动买卖量暂未接入。
