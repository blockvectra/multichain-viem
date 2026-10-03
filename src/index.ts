import { createPublicClient, http } from "viem";

const GATEWAY_URL = "https://api.blockvectra.com/v1";

export interface MethodPolicy {
  allow?: string[];
  deny?: string[];
}

export interface ChainInfo {
  chain: string;
  name: string;
  chain_id: number;
  jsonrpc: boolean;
  data: boolean;
  methods?: MethodPolicy | null;
  max_logs_block_range: number;
  state_window_blocks: number | null;
}

export interface MethodCheckResult {
  allowed: boolean;
  reason: string;
}

/**
 * Evaluates whether a JSON-RPC method is permitted according to /v1/chains policy.
 * - Exact matching for allow lists; exact or prefix wildcard for deny lists.
 * - Deny rule strictly takes precedence over allow ("deny wins").
 * - Methods omitted from allow return JSON-RPC error -32601 (method not allowed).
 */
export function isMethodAllowed(method: string, policy?: MethodPolicy | null): MethodCheckResult {
  if (!policy) return { allowed: false, reason: "No method policy configured" };
  const allow = policy.allow || [];
  const deny = policy.deny || [];

  const matches = (pattern: string) =>
    pattern.endsWith("*") ? method.startsWith(pattern.slice(0, -1)) : method === pattern;

  if (deny.some(matches)) {
    return { allowed: false, reason: "Explicitly denied in policy (deny wins)" };
  }
  if (allow.some(matches)) {
    return { allowed: true, reason: "Allowed in chain policy" };
  }
  return { allowed: false, reason: "Not in allow list (returns -32601)" };
}

/**
 * Creates a viem public client for a BlockVectra-supported chain.
 * Key passed in the x-api-key header; URL formatted as https://api.blockvectra.com/v1/{chain}
 */
export function createBlockVectraClient(chainSlug: string, apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  return createPublicClient({
    transport: http(`${GATEWAY_URL}/${chainSlug}`, {
      fetchOptions: { headers },
    }),
  });
}

async function main() {
  const apiKey = process.env.BLOCKVECTRA_API_KEY?.trim();
  console.log("=== BlockVectra Multichain Viem Template ===\n");
  console.log(`API Key status: ${apiKey ? `Configured (${apiKey.slice(0, 8)}...)` : "None (testing unauthenticated flow)"}`);

  // 1. Discover all chains dynamically from GET /v1/chains
  console.log("\n[1/3] Fetching public chain directory from GET /v1/chains...");
  const chainsRes = await fetch(`${GATEWAY_URL}/chains`);
  if (!chainsRes.ok) {
    throw new Error(`Failed to fetch /v1/chains: HTTP ${chainsRes.status}`);
  }
  const { chains } = (await chainsRes.json()) as { chains: ChainInfo[] };
  console.log(`Discovered ${chains.length} supported networks.`);

  // 2. Demonstrate method policy checks against /v1/chains methods specification
  console.log("\n[2/3] Demonstrating method policy evaluation across chains:");
  const testMethods = [
    "eth_blockNumber",
    "eth_subscribe",
    "debug_traceTransaction",
    "trace_block",
    "personal_sign",
  ];

  const policyTable = chains.map((c) => {
    const row: Record<string, string> = { "Chain Slug": c.chain };
    for (const m of testMethods) {
      const res = isMethodAllowed(m, c.methods);
      row[m] = res.allowed ? "ALLOW" : (c.methods?.deny?.includes(m) ? "DENY" : "NO");
    }
    return row;
  });
  console.table(policyTable);

  // 3. Concurrently query latest block number and chainId for each chain using viem
  console.log("\n[3/3] Concurrently querying live RPC (eth_chainId & eth_blockNumber) via viem...");
  const rpcChains = chains.filter((c) => c.jsonrpc);

  const queryPromises = rpcChains.map(async (c) => {
    const client = createBlockVectraClient(c.chain, apiKey);
    try {
      const [liveBlockNumber, liveChainId] = await Promise.all([
        client.getBlockNumber(),
        client.getChainId(),
      ]);
      return {
        "Chain Slug": c.chain,
        "Network Name": c.name,
        "Expected ID": c.chain_id,
        "RPC Chain ID": liveChainId,
        "Latest Block": liveBlockNumber.toString(),
        "RPC Status": liveChainId === c.chain_id ? "200 OK (Matched)" : `Mismatch (${liveChainId})`,
      };
    } catch (err: any) {
      let rpcStatus = "Error";
      if (err?.cause?.data?.reason === "missing_api_key" || err?.cause?.code === -32024) {
        rpcStatus = "401 missing_api_key";
      } else if (err?.status === 404) {
        rpcStatus = "404 invalid_key";
      } else {
        rpcStatus = err?.shortMessage || err?.message || "Error";
      }
      return {
        "Chain Slug": c.chain,
        "Network Name": c.name,
        "Expected ID": c.chain_id,
        "RPC Chain ID": "—",
        "Latest Block": "—",
        "RPC Status": rpcStatus,
      };
    }
  });

  const results = await Promise.all(queryPromises);
  console.table(results);

  // Informative summary
  if (!apiKey) {
    console.log("ℹ️  Note: RPC requests returned 401 missing_api_key because BLOCKVECTRA_API_KEY is not set.");
    console.log("   To query live block data, obtain an API key and set BLOCKVECTRA_API_KEY.");
    console.log("   Web Console: https://blockvectra.com/en/get-api-key/");
    console.log("   Programmatic Onboarding: https://docs.blockvectra.com/en/guides/programmatic-signup/\n");
  } else {
    console.log("Query complete.\n");
  }

  console.log("Notice: On-chain activity data only; not stock prices, and does not constitute investment advice.");
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
