# Money Tracker

Upload your Resalat Bank statement PDF each month and see where your money went. The interface is in Persian (right-to-left) with the IRANSansDN font. It sorts every transaction with your own rules, compares spending with your budgets, tracks your car savings goal, and includes an 8-week learning plan.

- **Backend:** Go + Fiber. Reads the PDF with `pdftotext`, sorts transactions, stores everything in one JSON file on a Docker volume.
- **Frontend:** React + TanStack Start (routing, loaders, server functions) + Tailwind CSS. Persian, right-to-left, IRANSansDN font served from `frontend/public/fonts`.
- **Caddy:** the only thing open to the internet. Gets a free HTTPS certificate for your domain automatically.

```
browser ──HTTPS──> caddy ──> web (TanStack Start :3000) ──private network──> api (Go Fiber :8080) ──> /data/state.json
```

The Go API has no public port. Only the web container can reach it, and every request needs your password session.

## Run it on your VPS

You need a Linux VPS with Docker installed, and ideally a domain name.

1. **Point your domain at the VPS.** Add an `A` record, for example `money.yourdomain.com`, pointing to the VPS IP.

2. **Copy this folder to the VPS**, for example with `scp` or `git`:

```bash
scp -r money-tracker root@YOUR_VPS_IP:/opt/
```

3. **Create your settings file** on the VPS:

```bash
cd /opt/money-tracker
```

```bash
cp .env.example .env
```

```bash
openssl rand -hex 32
```

Open `.env` and fill in `DOMAIN`, a long `APP_PASSWORD`, and paste the random value into `SESSION_SECRET`.

4. **Start it:**

```bash
docker compose up -d --build
```

The first build takes a few minutes. Then open `https://money.yourdomain.com` and sign in with your password.

5. **Open the firewall** for ports 80 and 443 if your VPS has one:

```bash
ufw allow 80,443/tcp
```

### No domain?

Set `DOMAIN=:80` and `COOKIE_SECURE=false` in `.env`, then open `http://YOUR_VPS_IP`. This works, but your password travels unencrypted, so use a domain when you can.

## Every month

1. In the Resalat app: **سپرده → گردش → بر اساس تاریخ**, from the 1st to the last day of the month, **نمایش**, then save the PDF.
2. In Money Tracker: **Upload**, choose the PDF, **Upload and sort**. Uploading overlapping dates is safe, because repeats are skipped.
3. Open the month. In **Who is this?**, choose a category for each new person or shop and press **Save**. The app remembers it next month.
4. Check **Spending vs budget** and the **Car goal** page.

For the transactions you don't remember, plug your phone into your Mac and give Claude Code the prompt in [CLAUDE_CODE_PROMPT.md](CLAUDE_CODE_PROMPT.md). It reads the bank's SMS messages to find the real shop names.

## Updating, backups, logs

Update after changing code:

```bash
docker compose up -d --build
```

Back up your data (one JSON file):

```bash
docker compose cp api:/data/state.json ./state-backup.json
```

Restore a backup:

```bash
docker compose cp ./state-backup.json api:/data/state.json && docker compose restart api
```

See logs:

```bash
docker compose logs -f --tail 50
```

## Run it on your Mac for development

Needs Go 1.23+ and Node 20.19+ (or use Docker as above).

```bash
cd backend && APP_PASSWORD=dev SESSION_SECRET=$(openssl rand -hex 32) COOKIE_SECURE=false go run .
```

```bash
cd frontend && npm install && API_URL=http://localhost:8080 npm run dev
```

Then open http://localhost:3000.

Test the PDF parser on its own:

```bash
cd backend && go run . parse /path/to/Invoice.pdf
```

## How sorting works

Each transaction gets a category in this order:

1. A category you set by hand on that transaction.
2. Built-in: salary → حقوق ("حقوق … سند فایلی"), bank fees → کارمزد بانک, transfers between your own cards → حساب‌های خودم.
3. Your rules (**Settings → Sorting rules**), top to bottom, first match wins. A rule matches text in the description: a name, a card number or a terminal number. It can be limited to money in or out, or to an exact amount.
4. Money sent to someone and returned within 3 days becomes **رفت و برگشت**.
5. Everything else is **نامشخص** and is counted as spending until you label it.

Category types: **income** counts as money in, **spending** counts against your budget, **transfer** (own accounts, your brother's loan) is ignored in the totals.

## Security notes

- The app is for one person: one password, sessions last 30 days.
- Your statements contain names and card numbers. Keep the VPS updated, use a long password, and don't share the `.env` file.
- **Font license:** IRANSansDN is a commercial FontIran font (license file in `frontend/public/fonts/FontLicense.txt`). It's fine for your own private app if your copy is licensed; don't publish the app for others without a license.
- Wrong passwords are slowed down, but for extra safety you can also restrict access in Caddy, for example to your own IP.
# mony.omidfaryabi.ir
