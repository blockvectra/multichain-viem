# BlockVectra 多链 viem 模板

本示例展示如何动态发现 BlockVectra 支持的所有区块链网络，使用同一把 API Key 为各链创建 [viem](https://viem.sh/) 公共客户端（Public Client），并发查询各链最新区块高度与 Chain ID，并在调用前基于官方方法策略（Method Policy）完成可用性预检。

参考文档：[一把 Key 走全链指南](https://docs.blockvectra.com/zh/guides/one-key-many-chains/) 与 [BlockVectra JSON-RPC 规范](https://docs.blockvectra.com/openapi/json-rpc.yaml)。

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

依据 [BlockVectra JSON-RPC 规范](https://docs.blockvectra.com/openapi/json-rpc.yaml)：
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

1. 进入项目目录：

   ```bash
   cd multichain-viem
   ```

2. 安装依赖（仅依赖 `viem` 与 `tsx`）：

   ```bash
   npm install
   ```

3. （可选）配置环境变量：

   ```bash
   cp .env.example .env
   ```

   在 `.env` 中填入你的 API Key：

   ```bash
   BLOCKVECTRA_API_KEY="rgw_your_api_key_here"
   ```

---

## 获取 API Key

API Key 在所有链、JSON-RPC 与 Data API 间通用。可以通过以下方式获取：

1. **网页控制台**：登录并在控制台创建 API Key：[https://blockvectra.com/zh/get-api-key/](https://blockvectra.com/zh/get-api-key/)。
2. **程序化开户**：使用以太坊钱包私钥（EIP-191 / SIWE）完成签名认证，并通过 `POST https://console-api.blockvectra.com/v1/keys` 创建 API Key。详见 [程序化开户指南](https://docs.blockvectra.com/zh/guides/programmatic-signup/)。

关于定价与免费额度详情，请参阅 [定价页面](https://blockvectra.com/zh/pricing/)。

---

## 运行示例

### 1. 未配置 Key 验证（无需 Key）

若环境变量未设置 `BLOCKVECTRA_API_KEY`，示例将完成公共链信息发现与方法策略校验，并在 RPC 查询阶段演示未授权请求的标准网关返回：

```bash
npm start
```

#### 实测控制台输出

```text
=== BlockVectra Multichain Viem Template ===

API Key status: None (testing unauthenticated flow)

[1/3] Fetching public chain directory from GET /v1/chains...
Discovered 5 supported networks.

[2/3] Demonstrating method policy evaluation across chains:
┌─────────┬─────────────────────┬─────────────────┬───────────────┬────────────────────────┬─────────────┬───────────────┐
│ (index) │ Chain Slug          │ eth_blockNumber │ eth_subscribe │ debug_traceTransaction │ trace_block │ personal_sign │
├─────────┼─────────────────────┼─────────────────┼───────────────┼────────────────────────┼─────────────┼───────────────┤
│ 0       │ 'base_mainnet'      │ 'ALLOW'         │ 'DENY'        │ 'NO'                   │ 'NO'        │ 'NO'          │
│ 1       │ 'bsc_mainnet'       │ 'ALLOW'         │ 'DENY'        │ 'NO'                   │ 'NO'        │ 'NO'          │
│ 2       │ 'eth_mainnet'       │ 'ALLOW'         │ 'DENY'        │ 'ALLOW'                │ 'ALLOW'     │ 'NO'          │
│ 3       │ 'hyperevm_mainnet'  │ 'ALLOW'         │ 'DENY'        │ 'NO'                   │ 'NO'        │ 'NO'          │
│ 4       │ 'robinhood_mainnet' │ 'ALLOW'         │ 'DENY'        │ 'ALLOW'                │ 'NO'        │ 'NO'          │
└─────────┴─────────────────────┴─────────────────┴───────────────┴────────────────────────┴─────────────┴───────────────┘

[3/3] Concurrently querying live RPC (eth_chainId & eth_blockNumber) via viem...
┌─────────┬─────────────────────┬───────────────────┬─────────────┬──────────────┬──────────────┬───────────────────────┐
│ (index) │ Chain Slug          │ Network Name      │ Expected ID │ RPC Chain ID │ Latest Block │ RPC Status            │
├─────────┼─────────────────────┼───────────────────┼─────────────┼──────────────┼──────────────┼───────────────────────┤
│ 0       │ 'base_mainnet'      │ 'Base'            │ 8453        │ '—'          │ '—'          │ '401 missing_api_key' │
│ 1       │ 'bsc_mainnet'       │ 'BNB Smart Chain' │ 56          │ '—'          │ '—'          │ '401 missing_api_key' │
│ 2       │ 'eth_mainnet'       │ 'Ethereum'        │ 1           │ '—'          │ '—'          │ '401 missing_api_key' │
│ 3       │ 'hyperevm_mainnet'  │ 'HyperEVM'        │ 999         │ '—'          │ '—'          │ '401 missing_api_key' │
│ 4       │ 'robinhood_mainnet' │ 'Robinhood Chain' │ 4663        │ '—'          │ '—'          │ '401 missing_api_key' │
└─────────┴─────────────────────┴───────────────────┴─────────────┴──────────────┴──────────────┴───────────────────────┘
ℹ️  Note: RPC requests returned 401 missing_api_key because BLOCKVECTRA_API_KEY is not set.
   To query live block data, obtain an API key and set BLOCKVECTRA_API_KEY.
   Web Console: https://blockvectra.com/zh/get-api-key/
   Programmatic Onboarding: https://docs.blockvectra.com/zh/guides/programmatic-signup/

Notice: On-chain activity data only; not stock prices, and does not constitute investment advice.
```

### 2. 配置 Key 运行

设置有效 API Key 后，viem 会在请求头中附带 `x-api-key`，并发拉取各链实时数据：

```bash
export BLOCKVECTRA_API_KEY="rgw_..."
npm start
```

预期对照表输出：

```text
┌─────────┬─────────────────────┬───────────────────┬─────────────┬──────────────┬──────────────┬────────────────────┐
│ (index) │ Chain Slug          │ Network Name      │ Expected ID │ RPC Chain ID │ Latest Block │ RPC Status         │
├─────────┼─────────────────────┼───────────────────┼─────────────┼──────────────┼──────────────┼────────────────────┤
│ 0       │ 'base_mainnet'      │ 'Base'            │ 8453        │ 8453         │ '27189104'   │ '200 OK (Matched)' │
│ 1       │ 'bsc_mainnet'       │ 'BNB Smart Chain' │ 56          │ 56           │ '43105820'   │ '200 OK (Matched)' │
│ 2       │ 'eth_mainnet'       │ 'Ethereum'        │ 1           │ 1            │ '21820492'   │ '200 OK (Matched)' │
│ 3       │ 'hyperevm_mainnet'  │ 'HyperEVM'        │ 999         │ 999          │ '1849201'    │ '200 OK (Matched)' │
│ 4       │ 'robinhood_mainnet' │ 'Robinhood Chain' │ 4663        │ 4663         │ '77215402'   │ '200 OK (Matched)' │
└─────────┴─────────────────────┴───────────────────┴─────────────┴──────────────┴──────────────┴────────────────────┘
```

---

## 风险提示与免责声明

Robinhood Chain 数据仅代表链上活动数据，不是股价，不构成投资建议。

---

## 相关文档与规范

- [一把 Key 走全链指南](https://docs.blockvectra.com/zh/guides/one-key-many-chains/)
- [JSON-RPC OpenAPI 规范](https://docs.blockvectra.com/openapi/json-rpc.yaml)
- [Data API OpenAPI 规范](https://docs.blockvectra.com/openapi/data.yaml)
- [价格与方案](https://blockvectra.com/zh/pricing/)
- [程序化开户指南](https://docs.blockvectra.com/zh/guides/programmatic-signup/)

---

## 开源协议

[MIT](LICENSE)
