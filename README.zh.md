# BlockVectra 多链 viem 模板

本 TypeScript 示例动态读取 BlockVectra 链目录，使用同一把 API Key 创建 [viem](https://viem.sh/) 客户端，展示方法策略判断，并将 RPC 返回的链号与目录对照。

参考文档：[一把 Key 走全链指南](https://docs.blockvectra.com/zh/guides/one-key-many-chains/?ref=gh-multichain-viem) 与 [BlockVectra JSON-RPC 规范](https://docs.blockvectra.com/openapi/json-rpc.yaml?ref=gh-multichain-viem)。

---

## 功能特性

1. **动态链发现**：运行时调用 `GET https://api.blockvectra.com/v1/chains` 获取当前支持的网络及静态参数（公开接口，免认证、免计费、无调用频率限制）。
2. **统一 Transport 与认证**：使用标准化 URL 模板 `https://api.blockvectra.com/v1/{chain}` 初始化 viem 客户端，并通过 `x-api-key` 请求头传递 API Key。
3. **并发 RPC 查询**：通过 `Promise.all` 并发查询各链的 `eth_blockNumber` 与 `eth_chainId`，输出各链状态对照表。
4. **方法策略预检演示**：实现官方方法策略校验逻辑（`methods.allow` 与 `methods.deny`），在发起 RPC 请求前预判方法是否受支持，避免不必要的 `-32601` 报错。
5. **无需浏览器**：纯代码与命令行交互，适配自动化脚本、AI Agent 与 CI/CD 流程。

---

## 架构与核心概念

### 统一端点结构

BlockVectra 依据 URL 路径中的 `{chain}` 标识将请求路由至目标链。所有受支持的链共用同一个 API Key、账户余额池与速率限制：

| 端点 | HTTP 方法 | 认证方式 | 说明 |
|---|---|---|---|
| `https://api.blockvectra.com/v1/chains` | `GET` | 无需认证 | 公开链目录与静态参数 |
| `https://api.blockvectra.com/v1/{chain}` | `POST` | `x-api-key: {key}` | 链级 JSON-RPC 2.0 端点 |
| `https://api.blockvectra.com/v1/data/{chain}/…` | `GET` | `x-api-key: {key}` | 链级 REST Data API |

> **末尾斜杠注意事项**：JSON-RPC 端点必须以链名结尾，不能带末尾斜杠（例如 `/v1/robinhood_mainnet`）。带有末尾斜杠的请求将返回 HTTP 404 且响应体为空。

### 方法策略判定规则

依据 [BlockVectra JSON-RPC 规范](https://docs.blockvectra.com/openapi/json-rpc.yaml?ref=gh-multichain-viem)：
- **`methods.allow`**：节点确认支持的具体方法名列表（精确匹配，无通配符）。
- **`methods.deny`**：显式禁止的方法或前缀规则（如 `eth_subscribe`、`eth_newFilter`）。
- **优先级原则**：命中 `deny` 规则一律拒绝，即使存在于 `allow` 中也以 `deny` 为准（deny 优先）。
- **默认行为**：调用未在 `allow` 列表中的方法返回 JSON-RPC 错误码 `-32601`（`method not available: <method>`，reason 为 `method_not_allowed`，不计费）。

---

## 环境准备

- Node.js >= 18.0.0
- npm、pnpm 或 yarn

---

## 安装与配置

1. 克隆仓库并进入项目目录：

   ```bash
   git clone https://github.com/blockvectra/multichain-viem.git
   cd multichain-viem
   ```

2. 安装依赖（仅依赖 `viem` 与 `tsx`）：

   ```bash
   npm install
   ```

3. 在运行示例的 shell 中设置 API Key：

   ```bash
   export BLOCKVECTRA_API_KEY="your_api_key"
   ```

   `npm start` 读取这个环境变量，不会自动加载 `.env`。

---

## 获取 API Key

API Key 在所有链、JSON-RPC 与 Data API 间通用。可以通过以下方式获取：

1. **网页控制台**：登录并在控制台创建 API Key：[https://blockvectra.com/zh/get-api-key/](https://blockvectra.com/zh/get-api-key/?ref=gh-multichain-viem)。
2. **程序化开户**：使用以太坊钱包私钥（EIP-191 / SIWE）完成签名认证，并通过 `POST https://console-api.blockvectra.com/v1/keys` 创建 API Key。详见 [程序化开户指南](https://docs.blockvectra.com/zh/guides/programmatic-signup/?ref=gh-multichain-viem)。

关于定价与免费额度详情，请参阅 [定价页面](https://blockvectra.com/zh/pricing/?ref=gh-multichain-viem)。

---

## 运行示例

在同一 shell 中设置 `BLOCKVECTRA_API_KEY` 后运行：

```bash
npm start
```

程序输出当前链目录、方法策略判断和 RPC 结果表。对每个启用 JSON-RPC 的网络，它会请求最新区块高度与链号，并显示链号是否与目录一致，或请求发生的错误。策略表仅展示判断结果，不会据此跳过后续请求。

未设置 Key 时，程序仍会向 `/v1/{chain}` 发送未认证请求，不会切换到免 Key 的 `/public` 端点。要先体验免 Key 读取，可使用 [Robinhood 测试网 Starter](https://github.com/blockvectra/robinhood-testnet-starter/blob/main/README.zh.md)。

---

## 风险提示与免责声明

Robinhood Chain 数据仅代表链上活动数据，不是股价，不构成投资建议。

---

## 相关文档与规范

- [一把 Key 走全链指南](https://docs.blockvectra.com/zh/guides/one-key-many-chains/?ref=gh-multichain-viem)
- [JSON-RPC OpenAPI 规范](https://docs.blockvectra.com/openapi/json-rpc.yaml?ref=gh-multichain-viem)
- [Data API OpenAPI 规范](https://docs.blockvectra.com/openapi/data.yaml?ref=gh-multichain-viem)
- [价格与方案](https://blockvectra.com/zh/pricing/?ref=gh-multichain-viem)
- [程序化开户指南](https://docs.blockvectra.com/zh/guides/programmatic-signup/?ref=gh-multichain-viem)

---

## 开源协议

[MIT](LICENSE)
