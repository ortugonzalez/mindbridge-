# BRESO — Quickstart Guide (Hackathon MVP)

**Branch**: `001-breso-depression-agent` | **Updated**: 2026-03-20

This guide gets you from a clean checkout to a running demo in the minimum number of steps.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | `brew install python@3.11` or [python.org](https://python.org) |
| Node.js | 20+ | `brew install node` or [nodejs.org](https://nodejs.org) |
| pnpm | 8+ | `npm install -g pnpm` |
| Hardhat | via npm | included in `contracts/` |
| Git | any | |

---

## 1. Clone and configure environment

```bash
git clone <repo-url>
cd breso
cp agent/.env.example agent/.env
cp frontend/.env.example frontend/.env
cp contracts/.env.example contracts/.env
```

Edit `agent/.env` with your values:

```ini
# Claude API
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_MAX_TOKENS=1024

# Celo Alfajores
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
BRESO_AGENT_WALLET_PRIVATE_KEY=0x...     # Deployer/agent wallet private key
BRESO_AGENT_WALLET_ADDRESS=0x...

# Contract addresses (filled after deploy step below)
ERC8004_CONTRACT_ADDRESS=
CONSENT_REGISTRY_ADDRESS=

# Thirdweb x402
THIRDWEB_SECRET_KEY=...
USDT_CONTRACT_ADDRESS=0x...             # Testnet USDT on Alfajores

# Self Protocol
SELF_PROTOCOL_APP_ID=...
SELF_PROTOCOL_SCOPE=age_verification

# App
SECRET_KEY=<random-32-char-string>
DATABASE_URL=sqlite:///./db.sqlite
LOG_LEVEL=INFO
```

---

## 2. Deploy smart contracts

```bash
cd contracts
npm install
```

Fund the deployer wallet with testnet CELO:
- Get Alfajores CELO from the [Celo faucet](https://faucet.celo.org/alfajores)
- Get testnet USDT: deploy a mock ERC20 or use Alfajores testnet USDT (see research.md)

```bash
npx hardhat run scripts/deploy.ts --network alfajores
# Note the two contract addresses printed to console
```

Copy the addresses into `agent/.env` and `contracts/.env`.

Register BRESO as an ERC-8004 agent:

```bash
npx hardhat run scripts/register-agent.ts --network alfajores
# Note the NFT token ID — BRESO is now visible on 8004scan.io
```

---

## 3. Start the backend

```bash
cd agent
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Initialize SQLite database
python -c "from models.db import init_db; init_db()"

# Start server
uvicorn main:app --reload --port 8000
```

Verify at: http://localhost:8000/health

Explore the API at: http://localhost:8000/docs (Swagger UI)

---

## 4. Start the frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:5173

The frontend auto-detects browser language (ES/EN). Override with `?lang=es` or `?lang=en`.

---

## 5. Run the demo flow

Follow these steps in the browser to demonstrate all 8 hackathon demo points:

### Step 1: Onboarding (ES + EN)
1. Open the app — observe language auto-detection
2. Register a new user: set timezone, wallet address, preferred check-in time
3. Language switcher in header → switch between ES and EN

### Step 2: Profile building
1. Navigate to **Dashboard → Today's Check-in**
2. Send the first check-in message
3. Reply naturally → observe the personalization profile begin forming
4. Navigate to **Profile** to see interests/energy patterns being captured

### Step 3: Daily check-in with personalization
1. Complete 3–7 check-ins (can simulate with different tones)
2. Observe how check-in messages adapt to the user's profile over time
3. Check `/users/me/personalization` in Swagger to see the evolving profile

### Step 4: Alert detection
1. Submit several check-ins with negative/short responses to simulate deterioration
2. Use the `/alerts` endpoint or Dashboard to see the alert trigger
3. Observe the trusted contact notification (check mock email or console logs)

### Step 5: Professional coordination
1. Navigate to **Bookings → Decision Tree**
2. Walk through the 3-path decision tree
3. Select BRESO network path → observe autonomous booking initiation

### Step 6: USDT subscription payment
1. Navigate to **Subscription**
2. Select Essential ($5) or Premium ($12)
3. Connect wallet (MetaMask on Alfajores testnet)
4. Approve USDT payment via x402 → observe on-chain confirmation

### Step 7: AgentScan verification
1. Navigate to **Agent** page
2. Click the AgentScan link → opens 8004scan.io/agent/{tokenId}
3. Observe BRESO's registration, alert events, and payment transactions on-chain

### Step 8: ZK identity verification
1. Navigate to **Contacts → Add Contact**
2. Add a trusted contact email and wallet address
3. Contact receives Self Protocol verification link
4. Complete ZK verification → contact is activated (boolean result only, no data exposed)

---

## 6. Key test commands

```bash
# Backend tests
cd agent && pytest tests/ -v

# Contract tests
cd contracts && npx hardhat test

# Frontend tests
cd frontend && pnpm test
```

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| `ANTHROPIC_API_KEY` missing | Check `agent/.env`, ensure no trailing space |
| Contract deploy fails | Fund wallet with Alfajores CELO from faucet |
| x402 payment pending forever | Ensure wallet has testnet USDT balance |
| Self Protocol callback not firing | Use ngrok to expose localhost: `ngrok http 8000` → update `SELF_PROTOCOL_CALLBACK_URL` |
| 8004scan.io not showing BRESO | Wait ~60s after deployment; confirm ERC-8004 registration tx confirmed |
| SQLite locked | Stop all server instances before running tests |

---

## Useful links

- Celo Alfajores Explorer: https://alfajores.celoscan.io
- AgentScan: https://8004scan.io
- Alfajores Faucet: https://faucet.celo.org/alfajores
- Self Protocol Docs: https://docs.self.xyz
- Thirdweb x402 Docs: https://portal.thirdweb.com
- API Docs (local): http://localhost:8000/docs
