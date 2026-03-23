# BRENSO — Soledad 🌱

> "We all wished someone had helped us understand what was happening around us."

## The Problem

In Latin America, 80% of people with mental health issues never access treatment.
The barriers: cost, stigma, and lack of accessible support systems.

## The Solution

BRENSO is an AI mental wellness agent powered by **Soledad**, an AI companion that:
- Has daily check-in conversations with users
- Detects emotional patterns and crisis signals in real time
- Alerts trusted family contacts when needed
- Coordinates professional support
- Processes subscriptions autonomously via x402 on Celo

## How It Works

1. User signs up and selects their role (patient or family)
2. Daily chat with Soledad — who remembers, learns and adapts
3. Crisis signals detected → family notified immediately
4. Subscription payments in USDT on Celo via x402
5. DeFi cashback: 30% of yield returned monthly as credit

## Celo Integration

| Feature | Implementation |
|---|---|
| Agent Identity | ERC-8004 contract on Celo Sepolia |
| Autonomous Payments | x402 via Thirdweb |
| Stablecoins | USDT on Celo for subscriptions |
| DeFi Yield | Mento Protocol cashback |
| Contract | `0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa` |

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS — Vercel
- **Backend:** Python FastAPI — Railway
- **Database:** Supabase (PostgreSQL + Auth)
- **AI:** Anthropic Claude (Soledad's brain)
- **Blockchain:** Celo Sepolia (ERC-8004 + x402)
- **Emails:** Resend
- **PWA:** Service Worker with push notifications

## Live Demo

- **App:** https://mindbridge-theta.vercel.app
- **API:** https://mindbridge-production-c766.up.railway.app/docs
- **Contract:** https://celo-sepolia.blockscout.com/address/0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa
- **GitHub:** https://github.com/ortugonzalez/mindbridge-

## Agent Registry

- **AgentScan:** https://agentscan.info
- **Contract:** `0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa`
- **Standard:** ERC-8004
- **Network:** Celo Sepolia

## User Types

- **Patient:** Daily chat with Soledad, streak tracking, crisis detection
- **Family:** Weekly summaries, real-time alerts, no access to private conversations

## Subscription Plans

| Plan | Price | Features |
|---|---|---|
| Free Trial | 15 days | Full access |
| Essential | $5 USD/month | Daily check-ins, 1 trusted contact |
| Premium | $12 USD/month | Unlimited + professional coordination |

Payments processed in USDT on Celo blockchain via x402.
DeFi cashback: 30% of yield returned monthly as subscription credit.

## Crisis Detection

- 🟡 **Yellow:** 24h no check-in → gentle family email
- 🟠 **Orange:** 48h no check-in or 3 negative days → urgent alert
- 🔴 **Red:** Crisis keywords detected → immediate push notification

## Built for

Celo "Build Agents for the Real World V2" Hackathon — March 2026
