import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SERVER_PATH = path.join(__dirname, 'build/index.js');
const ASSET = 'ETH';

console.log("🚀 Starting Integration Test for Callput MCP Server...");
console.log(`   Server Path: ${SERVER_PATH}`);

const server = spawn('node', [SERVER_PATH], {
    stdio: ['pipe', 'pipe', process.stderr]
});

let messageBuffer = '';
let step = 0;
let requestId = 1;
let legs = [];

// Helper to send requests
function send(method, params) {
    const msg = {
        jsonrpc: "2.0",
        id: requestId++,
        method,
        params
    };
    server.stdin.write(JSON.stringify(msg) + "\n");
}

server.stdout.on('data', (data) => {
    const chunk = data.toString();
    messageBuffer += chunk;

    // Process messages (newline delimited)
    // There might be multiple lines or partial lines
    const lines = messageBuffer.split('\n');

    // The last element is potentially partial, keep it in buffer
    messageBuffer = lines.pop();

    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const response = JSON.parse(line);
            handleResponse(response);
        } catch (e) {
            console.error("Failed to parse JSON line:", line.substring(0, 50) + "...");
        }
    }
});

function handleResponse(response) {
    if (response.id === null) return; // Notification?

    // Step 0: Initialize response (Server might send nothing or result for initialize)
    // We expect result for our first request `initialize`? 
    // Wait, the client sends `initialize`. Server responds. 
    // I sent `initialize` at bottom.

    if (step === 0 && response.result) {
        console.log("✅ Server Initialized");

        // Step 1: List Tools
        send("tools/list", {});
        step++;
        return;
    }

    // Step 1: Tool List Response
    if (step === 1 && response.result) {
        console.log("✅ Tools Listed");
        const tools = response.result.tools.map(t => t.name);
        console.log(`   Available: ${tools.join(", ")}`);

        if (!tools.includes("get_option_chains") || !tools.includes("request_quote")) {
            console.error("❌ Missing required tools!");
            process.exit(1);
        }

        // Step 2: Get Option Chains
        console.log(`\n🔍 Fetching Option Chains for ${ASSET}...`);
        send("tools/call", {
            name: "get_option_chains",
            arguments: { underlying_asset: ASSET }
        });
        step++;
        return;
    }

    // Step 2: Option Chains Response
    if (step === 2) {
        if (response.error) {
            console.error("❌ get_option_chains failed:", response.error);
            process.exit(1);
        }

        const content = JSON.parse(response.result.content[0].text);

        // Verify Structure
        if (!content.expiries || !content.asset) {
            console.error("❌ Invalid Response Structure (Expected hierarchical 'expiries'):", Object.keys(content));
            console.log("Received:", JSON.stringify(content, null, 2).substring(0, 200));
            process.exit(1);
        }

        console.log("✅ Hierarchical Data Received");
        const expiries = Object.keys(content.expiries);
        console.log(`   Expiries: ${expiries.length} found`);

        if (expiries.length === 0) {
            console.error("❌ No options found. Cannot proceed with quote test.");
            process.exit(1);
        }

        // Pick valid legs for a Spread
        // Need 2 Calls from same expiry
        const expiry = expiries[0];
        const expiryData = content.expiries[expiry];

        if (expiryData.call && expiryData.call.length >= 2) {
            // Sort by strike
            const calls = expiryData.call.sort((a, b) => a.s - b.s);

            // Bull Call Spread: Buy Low (Long), Sell High (Short)
            // Long: calls[0] (Lower Strike)
            // Short: calls[1] (Higher Strike)

            legs = [calls[0], calls[1]];
            console.log(`\n🎯 Selected Legs for Bull Call Spread (Expiry: ${expiry}):`);
            console.log(`   Long (Buy):  Strike ${legs[0].s}, ID: ${legs[0].id}`);
            console.log(`   Short (Sell): Strike ${legs[1].s}, ID: ${legs[1].id}`);

            // Step 3: Request Quote
            console.log("\n💸 Requesting Quote for BuyCallSpread...");
            send("tools/call", {
                name: "request_quote",
                arguments: {
                    strategy: "BuyCallSpread",
                    long_leg_id: legs[0].id,
                    short_leg_id: legs[1].id,
                    amount: 1
                }
            });
            step++;
        } else {
            console.log(`   Expiry ${expiry} has ${expiryData.call.length} calls. Trying next expiry...`);
            // Check other expiries? Simplified check: fail if first doesn't work.
            console.error("❌ Not enough Calls in first expiry to form a spread.");
            process.exit(1);
        }
        return;
    }

    // Step 3: Quote Response
    if (step === 3) {
        if (response.error) {
            console.error("❌ request_quote failed:", response.error);
            // Print error details if available
            process.exit(1);
        }

        const quote = JSON.parse(response.result.content[0].text);
        console.log("✅ Quote Generated Successfully!");
        console.log(`   To: ${quote.to}`);
        console.log(`   Data Length: ${quote.data.length} bytes`);
        console.log(`   Description: ${quote.description}`);

        console.log("\n🎉 Integration Test PASSED!");
        process.exit(0);
    }
}

// Start
send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0" }
});
