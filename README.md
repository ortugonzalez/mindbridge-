# BRESO — Soledad 🌱

> "A todos nos hubiese gustado que nos ayudaran a entender lo que pasaba a nuestro alrededor."

## El problema
En Latinoamérica, el 80% de las personas con problemas de salud mental nunca accede a tratamiento. Las barreras son el costo, el estigma y la falta de sistemas de apoyo accesibles.

## La solución
BRESO es un agente de IA de bienestar emocional impulsado por **Soledad**, una acompañante que:
- Tiene conversaciones diarias de check-in con el usuario
- Detecta patrones emocionales y señales de crisis en tiempo real
- Alerta a contactos familiares de confianza cuando es necesario
- Coordina apoyo profesional
- Procesa suscripciones de forma autónoma via x402 en Celo

## Cómo funciona
1. El usuario se registra e indica si es para sí mismo o para acompañar a alguien
2. Chat diario con Soledad — que recuerda, aprende y se adapta
3. Si detecta señales de alerta → notifica al familiar inmediatamente
4. Pagos de suscripción en USDT sobre Celo via x402
5. DeFi cashback: el 30% del rendimiento generado se devuelve mensualmente

## Integración con Celo

| Feature | Implementación |
|---|---|
| Identidad del agente | Contrato ERC-8004 en Celo Sepolia |
| Pagos autónomos | x402 Thirdweb integration |
| Stablecoins | USDT en Celo para suscripciones |
| DeFi Yield | Sistema de cashback con Mento |
| Contrato | `0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa` |

## Stack técnico
- **Frontend:** React + Vite + Tailwind CSS — Vercel
- **Backend:** Python FastAPI — Railway
- **Base de datos:** Supabase (PostgreSQL + Auth)
- **IA:** Anthropic Claude (el cerebro de Soledad)
- **Blockchain:** Celo Sepolia (ERC-8004 + x402)
- **Emails:** Resend
- **PWA:** Service Worker con push notifications

## Agent Registry

| | |
|---|---|
| **AgentScan** | https://agentscan.info |
| **Contract** | `0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa` |
| **Standard** | ERC-8004 |
| **Network** | Celo Sepolia |

## Demo en vivo
- **App:** https://mindbridge-theta.vercel.app
- **API:** https://mindbridge-production-c766.up.railway.app/docs
- **Contrato:** https://celo-sepolia.blockscout.com/address/0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa
- **GitHub:** https://github.com/ortugonzalez/mindbridge-

## Tipos de usuario
- **Paciente:** Chat diario con Soledad, tracking de racha, detección de crisis
- **Familiar:** Resúmenes semanales, alertas en tiempo real, sin acceso a conversaciones privadas

## Planes de suscripción
| Plan | Precio | Features |
|---|---|---|
| Prueba gratuita | 15 días | Acceso completo |
| Esencial | $5 USD/mes | Check-ins diarios, 1 contacto de confianza |
| Premium | $12 USD/mes | Ilimitado + coordinación profesional |

Pagos procesados en USDT sobre Celo blockchain via x402.
DeFi cashback: 30% del rendimiento devuelto mensualmente como crédito de suscripción.

## Sistema de alertas
- 🟡 **Amarillo:** 24h sin check-in → email suave al familiar
- 🟠 **Naranja:** 48h sin check-in ó 3 días negativos → alerta urgente
- 🔴 **Rojo:** Keywords de crisis detectadas → push notification inmediata

## Construido para
Hackathon Celo "Build Agents for the Real World V2" — Marzo 2026
