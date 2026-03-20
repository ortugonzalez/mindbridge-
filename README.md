# BRESO — Bilingual AI Mental Wellness Companion

BRESO is an AI agent for early depression detection in Latin America. It performs daily conversational check-ins, detects behavioral patterns, alerts trusted contacts, and coordinates professional support — all on the Celo blockchain.

## Quick Start

See **[specs/001-breso-depression-agent/quickstart.md](specs/001-breso-depression-agent/quickstart.md)** for the full setup guide and 8-step demo flow.

## Structure

```
agent/       # Python 3.11 + FastAPI backend + AI agent (Claude API)
contracts/   # Solidity smart contracts on Celo Alfajores (ERC-8004, ConsentRegistry)
frontend/    # React 18 + Vite + TypeScript demo UI (bilingual ES/EN)
specs/       # Feature specifications, plans, data model, tasks
```

## Tech Stack

- **AI**: Claude API (claude-sonnet-4-6) via Anthropic SDK
- **Backend**: Python 3.11, FastAPI, supabase-py
- **Database**: Supabase (PostgreSQL + Auth + Realtime + Storage + RLS)
- **Frontend**: React 18, Vite, TypeScript, Supabase JS, react-i18next
- **Blockchain**: Celo Alfajores testnet (ERC-8004, x402/Thirdweb, Self Protocol)

## Development

```bash
# Backend
cd agent && pip install -r requirements.txt && uvicorn main:app --reload

# Frontend
cd frontend && pnpm install && pnpm dev

# Contracts
cd contracts && npm install && npx hardhat compile
```

## Design Documents

- [Feature Spec](specs/001-breso-depression-agent/spec.md)
- [Implementation Plan](specs/001-breso-depression-agent/plan.md)
- [Data Model](specs/001-breso-depression-agent/data-model.md)
- [API Contract](specs/001-breso-depression-agent/contracts/agent-api.yaml)
- [Task List](specs/001-breso-depression-agent/tasks.md)
