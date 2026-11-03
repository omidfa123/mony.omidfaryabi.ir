# Prompt for Claude Code: monthly money check with my phone

Copy everything between the two lines below into Claude Code. Plug your phone into the Mac by USB first and allow USB debugging. Fill in the month and, if you have it, the path to the statement PDF.

---

I'm Omid. I want to understand last month's spending and identify the transactions I don't remember.

**This month:** 1405/__ (fill in, e.g. 1405/09)
**Statement PDF (optional):** ______ (if empty, open the Resalat app on my phone and download it)
**My Money Tracker app:** https://______ (my VPS; I upload the PDF there myself)

## What you can do
- My Samsung phone (SM-A566B) is connected by USB with debugging allowed. Use `adb` (installed at `/usr/local/bin/adb`).
- **Read-only.** Never tap transfer (انتقال), buy, sell, confirm, withdraw, lock, or anything that moves money. Never type passwords. If a screen needs a password, stop and ask me.
- **Before every tap or swipe, check there is no phone call:** `adb shell dumpsys telephony.registry | grep mCallState` must be `mCallState=0`. Last time a swipe answered a call by accident.
- Read only SMS from the sender `ResalatBank` (and, for a specific transaction, messages within ±15 minutes of it). Never store or show one-time codes (رمز). Mask any digits after "رمز" or "کد".

## How to get the statement PDF (if I didn't give one)
1. Open the Resalat app: `adb shell monkey -p mob.banking.android.resalat -c android.intent.category.LAUNCHER 1`
2. Account list → **گردش** (not **انتقال**). Set **بر اساس: تاریخ**, from the 1st to the last day of the month, then **نمایش**.
3. Tap the PDF/share icon. The file lands in `/storage/emulated/0/Android/data/mob.banking.android.resalat/cache/temporary/Invoice_*.pdf`. Pull it with `adb pull`.
4. Convert with `pdftotext -layout`. Each transaction ends on the line with time, date and row number; the amounts line is (balance, credit, debit). The text uses Arabic presentation forms, so normalize with NFKC. Check that the totals match the "جمع واریز / جمع برداشت" shown in the app.

## How to identify hidden merchants
- Card purchases show only the payment company and a terminal number (for example "پایانه به پرداخت ملت 6118675"). For each one, find the ResalatBank SMS that starts with `محرمانه / خرید / <merchant> / <amount in rial>` at the same date and minute. That names the real merchant.
- For card-to-card transfers, the statement shows the receiver's name. For incoming transfers it often shows only a card number.
- Group the unknown ones by person, card or terminal, then ask me about the ones you still can't identify.

## What we already know (don't ask me again)
**Me:** account owner امید فاریابی, Resalat savings account 10.10336663.1. Own cards 5041721204013214 (Resalat) and 6219861868612416 (Saman). I live alone in Iran.

**Income**
- Salary from my company: about 67–77m toman a month, described as "حقوق … سند فایلی".
- Bonus every 3 months, about 50m: from **آمنه غیورمینائی** (PAYA).
- Company extras: **زینب بهمن آبادی**, **پویا داده پرداز سلامت توس**.
- **سرمایه زرین ماندگار**: investment fund payout (4,682,261 T on 1405/07/10).
- Family members (…فاریابی) sometimes pay back debts they owe me. The 20m from **مبین فاریابی** "بابت تسهیلات" was that.

**Not my spending (pass-through)**
- **Card 5022291523239513 (Pasargad)** is my **brother**, sending money for **his** Resalat loan **1-1147793**, whose installments I pay. Both sides are a transfer.
- 30m to **علی اسدالهی** came back the next day (round trip).

**Spending categories and who's who**
- **Family:** جمیله / منوچهر / مهدی / مبین فاریابی, **پورمولائی**. Going forward about 10m a month.
- **Groceries:** **میرصادقی** (supermarket), **قاسمیان** (حسن و حسین قاسمیان, shop), **Tara** wallet top-ups ("توسعه تجارت و فناوری", terminal 12534009).
- **Food delivery:** Snappfood (SNAPPFOOD, اسنپ فود, terminal 5667931). About 9.8m a month in the last review. Goal: at most 3.5m.
- **Taxi:** Tapsi (terminals 6118675, 9573431) and Snapp (80080727, 99407171, اسنپ). About 9m a month. I switched to public transport.
- **Commute taxi:** transfers of exactly 90,000 toman to different drivers.
- **VPS and AI subscriptions:** Bitpin (سنا ایمن مبادله منطقه آزاد انزلی / بیت پین), then USDT to HPX, then HPX card. About 8.3m a month.
- **Phone & internet:** Irancell (6624032), Hamrah-e Aval (5381413, 30952742), Shatel, Ebcom.
- **Clothes:** شهبازی. **Travel:** MrBilit. **Health:** Snapp Doctor (7078000).
- **Loans:** Pasargad loan (terminal 77998997) and Digipay installments are **finished**.

**Last review (1405/05/11 → 1405/08/11):** regular income ~100m a month (salary + bonus + company extras), spending ~91.7m, kept ~8m. With family at ~10m, loans finished, public transport, less Snappfood and fewer subscriptions, the target is to keep ~50m a month.

**Goal:** buy a car (~1bn toman) with an emergency fund of ~150m first, a down payment, and a smaller loan (~600m). HPX/HyperPay is **not** for savings: HPY and HBT are almost worthless and can't be sold.

## What I want back
1. A table for the month: income, spending by category, kept, and **compared with my budgets**: Family 10m, Groceries 10m, Food delivery 3.5m, Taxi 1.5m, Commute 1.5m, Subscriptions 5.5m, Phone 3m, Clothes 2m, Transfers to people 5m.
2. **Every transaction you couldn't identify**, grouped, with date, time, amount and whatever the SMS says, so I can tell you what it was.
3. New rules I should add in Money Tracker → Settings → Sorting rules (text to match, money in/out, category).
4. The 3 biggest things I could cut next month, with the toman amount for each.
5. Progress toward the car: what I kept this month, total saved, months left.

Write the report as a Markdown file in this folder and keep it short.

---
