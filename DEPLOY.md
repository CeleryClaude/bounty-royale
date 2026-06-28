# Bounty Royale - how to put it online (no coding needed)

Your game is one small web app: a server (`server.js`) that hosts the page AND runs the
live match, plus the game itself (`public/index.html`). To let people play from a TikTok
link, it needs to run on an always-on host. Here's the easy way.

## What you'll need
- A free hosting account (Replit, below). ~10 minutes.
- For a real launch: about **US$7/month** for an always-on plan. (Free tiers fall asleep
  after a few minutes and players get an error - fine for testing, not for a TikTok push.)

---

## Option A - Replit (easiest, recommended)

1. Go to **replit.com** and sign up (free).
2. Click **Create Repl** -> choose **Node.js** -> name it `bounty-royale` -> **Create Repl**.
3. In the file list on the left, click the **three dots (...)** -> **Upload file**, and upload
   the `bounty-royale.zip` I gave you. Replit unzips it. (Or drag in `server.js`,
   `package.json`, and the whole `public` folder.) Make sure you can see `server.js`,
   `package.json`, and a `public` folder containing `index.html`.
4. Press the big green **Run** button. Replit installs everything and starts the server.
   A preview window opens showing your game - that's it running.
5. Click the **open-in-new-tab** arrow on the preview to get your public link
   (like `https://bounty-royale.yourname.repl.co`). Anyone with that link can play.
6. For a 24/7 link for TikTok: click **Deploy** (top right) -> **Autoscale** -> follow the
   prompts. This is the part that costs a few dollars a month. While testing, the Run
   preview works free as long as the tab stays open.

Put that link in your TikTok bio or video, and people click straight into the game.

---

## Option B - Render (also good for always-on)

1. Put this project in a free **GitHub** repo (GitHub's website lets you upload the files).
2. Go to **render.com** -> sign up -> **New +** -> **Web Service**.
3. Connect your GitHub and pick the repo. Render reads `render.yaml` automatically.
4. Choose the **Starter** plan (~$7/mo, always on) -> **Create Web Service**.
5. When it finishes, Render gives you a public `https://...onrender.com` link. Share that.

---

## How players join
No install, no login. They open your link, type a name (optional), pick a class, and they're
dropped into the same live arena as everyone else. Bots fill the empty space and reroute when
cornered, so it never feels dead.

## Changing the game later
All the knobs are near the top of `server.js`:
- `CLASSES` - each fighter's health / damage / speed / growth / igloo-fit / steal bonus.
- `igloos` - positions, sizes (`r`) and who fits (`cap`).
- `BND` - the arena size.
Tell me what to change (new class, bigger map, faster combat, more igloos) and I'll update the files.

## Heads-up on scale
This handles small/medium lobbies well. If a TikTok video blows up and thousands try to join at
once, you'll need to add multiple rooms and a bigger host - tell me when you get there and I'll
help you scale it.

## Update: what changed (v4)
- The game now has **accounts + saved progress**. Profiles are stored in `data/profiles.json`
  on the server's disk. On free/ephemeral hosts this resets if the server restarts - for
  permanent saves, use a host with a persistent disk, or move to a managed database later.
- There is a **cosmetic shop** (buy/equip with coins earned in-game). Items tagged PREMIUM
  Free + soft-currency (coin) items buy/equip with coins; PREMIUM items (fancy colours, Chrome/Neon/Holographic finishes, crowns, Flame Crown) are real-money only via Stripe and CANNOT be bought with coins. There is also a **Founder's Pack** that unlocks every premium item in one purchase. Right now, without Stripe keys, premium items
  is purchasable with earned coins so the loop is fully playable.
- No new setup needed to deploy - it still runs with just `npm install` + `npm start`.

## Update: scale + real money (v5)
- **Multiple rooms**: players auto-split into capped lobbies (16 each); new rooms spin up under load and empty ones are cleaned up. Handles a traffic spike on one server. (For truly massive scale, run several server instances behind a load balancer + shared DB - ask when you're there.)
- **Real-money premium cosmetics (Stripe)**: fully wired, server-authoritative, and tamper-proof. Ownership lives on the server profile; the client can never grant itself a skin. To turn on: set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in your host's env, and point a Stripe webhook at `https://YOURGAME/webhook` for event `checkout.session.completed`. The flow: client clicks Unlock -> `POST /create-checkout-session` -> Stripe Checkout -> on success Stripe calls `/webhook` -> server adds the item (or all premium, for the Founder's Pack) to the player's `owned` list -> next snapshot the cosmetic is equippable. Without keys, premium items simply can't be purchased and the rest of the game runs fine. **Test with Stripe test keys + `stripe listen --forward-to localhost:PORT/webhook` before going live.**
