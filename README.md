# BlockVectra Multichain viem Template

A minimal, production-grade TypeScript template demonstrating how to dynamically discover all BlockVectra-supported blockchain networks, create [viem](https://viem.sh/) public clients for each network using a single API key, query live chain states concurrently, and evaluate RPC method policies programmatically.

Based on the [One key, many chains guide](https://docs.blockvectra.com/en/guides/one-key-many-chains/?ref=gh-multichain-viem) and the [BlockVectra JSON-RPC specification](https://docs.blockvectra.com/openapi/json-rpc.yaml?ref=gh-multichain-viem).

---

## Features

1. **Dynamic Chain Discovery**: Fetches active networks and static parameters at runtime from `GET https://api.blockvectra.com/v1/chains` (public, unauthenticated, unmetered, and unbilled).
2. **Unified Transport & Auth**: Instantiates viem public clients using the standard URL template `https://api.blockvectra.com/v1/{chain}` with the API key supplied via the `x-api-key` HTTP header.
3. **Concurrent RPC Execution**: Queries `eth_blockNumber` and `eth_chainId` across all served chains in parallel via `Promise.all`, outputting a structured comparison table.
4. **Method Policy Pre-flight Verification**: Implements the official method policy evaluation algorithm (`methods.allow` vs `methods.deny`) to determine whether an RPC method is supported before dispatching calls.
5. **Zero Browser Dependency**: Fully automated and suitable for AI agents, backend services, and CI/CD pipelines.

---

## Architecture and Key Concepts

### Unified Endpoint Structure

BlockVectra routes JSON-RPC calls by chain slug in the URL path. All supported chains share the same API key, balance pool, and rate limits:

| Endpoint | Method | Authentication | Description |
|---|---|---|---|
| `https://api.blockvectra.com/v1/chains` | `GET` | None | Public chain directory and static parameters |
| `https://api.blockvectra.com/v1/{chain}` | `POST` | `x-api-key: {key}` | Chain-scoped JSON-RPC 2.0 endpoint |
| `https://api.blockvectra.com/v1/data/{chain}/…` | `GET` | `x-api-key: {key}` | Chain-scoped REST Data API |

> **Note on trailing slashes**: The JSON-RPC endpoint must end with the chain slug without a trailing slash (e.g., `/v1/robinhood_mainnet`). Requests with a trailing slash return HTTP 404 with an empty body.

### Method Policy Evaluation Rules

According to the [BlockVectra JSON-RPC Specification](https://docs.blockvectra.com/openapi/json-rpc.yaml?ref=gh-multichain-viem):
- **`methods.allow`**: Curated list of concrete method names confirmed to be supported by the chain's underlying node.
- **`methods.deny`**: Explicitly blocked methods or prefix wildcards (e.g., `eth_subscribe`, `eth_newFilter`).
- **Precedence**: Any match in `deny` takes precedence over `allow` ("deny wins").
- **Fallback**: Calling a method not present in `allow` returns JSON-RPC error code `-32601` (`method not available: <method>`, reason `method_not_allowed`, not billed).

---

## Prerequisites

- Node.js >= 18.0.0
- npm, pnpm, or yarn

---

## Installation & Setup

1. Navigate to the project directory:

   ```bash
   cd multichain-viem
   ```

2. Install dependencies (only `viem` and `tsx`):

   ```bash
   npm install
   ```

3. (Optional) Configure your API key:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your key:

   ```bash
   BLOCKVECTRA_API_KEY="rgw_your_api_key_here"
   ```

---

## Obtaining an API Key

API keys are pooled across all chains, JSON-RPC, and the Data API. You can obtain a key through either method:

1. **Web Console**: Log in and create a key at [https://blockvectra.com/en/get-api-key/](https://blockvectra.com/en/get-api-key/?ref=gh-multichain-viem).
2. **Programmatic Onboarding**: Sign in headlessly via Ethereum wallet signature (EIP-191 / SIWE) and generate an API key via `POST https://console-api.blockvectra.com/v1/keys`. See the [Programmatic Sign-up Guide](https://docs.blockvectra.com/en/guides/programmatic-signup/?ref=gh-multichain-viem).

For pricing details and free credit allowances, see the [Pricing page](https://blockvectra.com/en/pricing/?ref=gh-multichain-viem).

---

## Running the Example

### Unauthenticated Verification (No Key Required)

If `BLOCKVECTRA_API_KEY` is not provided, the template performs dynamic chain discovery and method policy evaluation, then executes the RPC queries to demonstrate the standard unauthenticated gateway response:

```bash
npm start
```

#### Actual Execution Output

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
   Web Console: https://blockvectra.com/en/get-api-key/
   Programmatic Onboarding: https://docs.blockvectra.com/en/guides/programmatic-signup/

Notice: On-chain activity data only; not stock prices, and does not constitute investment advice.
```

### Authenticated Run (With API Key)

When `BLOCKVECTRA_API_KEY` is set, viem sends the key in the `x-api-key` header, successfully retrieving live block numbers and chain IDs across all chains:

```bash
export BLOCKVECTRA_API_KEY="rgw_..."
npm start
```

Expected table output:

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

## Important Notice

Robinhood Chain data represents on-chain activity data only; not stock prices, and does not constitute investment advice.

---

## Related Specifications & Documentation

- [One key, many chains guide](https://docs.blockvectra.com/en/guides/one-key-many-chains/?ref=gh-multichain-viem)
- [JSON-RPC OpenAPI Specification](https://docs.blockvectra.com/openapi/json-rpc.yaml?ref=gh-multichain-viem)
- [Data API OpenAPI Specification](https://docs.blockvectra.com/openapi/data.yaml?ref=gh-multichain-viem)
- [Plans & Pricing](https://blockvectra.com/en/pricing/?ref=gh-multichain-viem)
- [Programmatic Sign-up Guide](https://docs.blockvectra.com/en/guides/programmatic-signup/?ref=gh-multichain-viem)

---

## License

[MIT](LICENSE)
