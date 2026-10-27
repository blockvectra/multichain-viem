# BlockVectra Multichain viem Template

A TypeScript example that discovers BlockVectra networks, creates [viem](https://viem.sh/) clients with one API key, displays method-policy checks and compares RPC chain IDs with the directory.

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

1. Clone the repository and enter its directory:

   ```bash
   git clone https://github.com/blockvectra/multichain-viem.git
   cd multichain-viem
   ```

2. Install dependencies (only `viem` and `tsx`):

   ```bash
   npm install
   ```

3. Set your API key in the shell that will run the example:

   ```bash
   export BLOCKVECTRA_API_KEY="your_api_key"
   ```

   `npm start` reads this environment variable; it does not load `.env` automatically.

---

## Obtaining an API Key

API keys are pooled across all chains, JSON-RPC, and the Data API. You can obtain a key through either method:

1. **Web Console**: Log in and create a key at [https://blockvectra.com/en/get-api-key/](https://blockvectra.com/en/get-api-key/?ref=gh-multichain-viem).
2. **Programmatic Onboarding**: Sign in headlessly via Ethereum wallet signature (EIP-191 / SIWE) and generate an API key via `POST https://console-api.blockvectra.com/v1/keys`. See the [Programmatic Sign-up Guide](https://docs.blockvectra.com/en/guides/programmatic-signup/?ref=gh-multichain-viem).

For pricing details and free credit allowances, see the [Pricing page](https://blockvectra.com/en/pricing/?ref=gh-multichain-viem).

---

## Running the Example

With `BLOCKVECTRA_API_KEY` exported in the same shell, run:

```bash
npm start
```

The program prints the current chain directory, method-policy evaluations and a table of RPC results. For each network with JSON-RPC enabled, it requests the latest block number and chain ID, then reports whether the chain ID matches the directory or an error occurred. The policy table is informational; it does not skip subsequent requests.

Without a key, the program still requests `/v1/{chain}` without authentication. It does not switch to a keyless `/public` endpoint. For a keyless first read, use the [Robinhood Testnet Starter](https://github.com/blockvectra/robinhood-testnet-starter).

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
