# Bounty Royale - Launch checklist

The game is built. Below is everything between you and a live, money-making game.
Items marked (you) need a human; everything else is already done in the code.

## 1. Try it locally (5 min)
- Double-click `Bounty-Royale-Preview.html` for a full single-player feel test, OR
- Run the real multiplayer build: install Node 18+, then in this folder: `npm install` then `npm start`, open http://localhost:3000 in TWO tabs.

## 2. Put it online (you - ~15 min, ~$7/mo)
- Follow DEPLOY.md (Replit easiest). Upload the zip, press Run, get a public link.
- Open the link in two tabs/phones to confirm real multiplayer works.

## 3. Soft launch on TikTok (you)
- Record 5-10 short clips of clutch moments (a Titan getting swarmed, a last-second igloo escape, an evolution, a Reaper execute).
- Put the game link in your bio; post clips daily; reply to comments with the link.
- Watch day-1 / day-7 return rate. That number decides everything.

## 4. Turn on real money (you - when you have traction)
- Register a business entity + open Stripe.
- Add keys to `.env` (see `.env.example`).
- Premium cosmetics are **wired to Stripe Checkout** (server-authoritative ownership, premium is Stripe-only, plus a Founder's Pack bundle). Just add your `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` and a webhook pointing at `/webhook`. Test with Stripe test mode first.

## 5. Scale up (later, only if it pops)
- Move player profiles from the local `data/profiles.json` to a managed database (so saves survive restarts and multiple servers).
- Add multiple game rooms / instances for thousands of concurrent players. (Ask me - it's a known change.)

## What's already done for you
Game + 3 classes + branching evolution, abilities, health combat, igloos, bots with
anti-stuck AI, sound, particles, screen shake, accounts + saved progress (levels/coins/best),
cosmetic shop (buy + equip), leaderboard, minimap, mobile controls, instant guest join.
