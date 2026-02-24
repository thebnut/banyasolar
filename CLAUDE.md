# Banya Solar — Build Brief

## What
A web dashboard for monitoring and analysing a residential solar + battery system.
**System:** Sungrow SH10RT-V112 hybrid inverter, 12.8 kWh battery, 10 kWp solar panels, Brisbane QLD.
**Retailer:** Amber Electric (wholesale/real-time pricing).

## Data Available
In `data/` folder:
- `all_usage.json` — ~53K records of 5-minute metered usage (Nov 2025 - Feb 2026). Each record has: date, nemTime, kwh, cost (cents), perKwh (c/kWh), spotPerKwh, channelType (general=import, feedIn=export), descriptor, spikeStatus, tariffInformation, renewables %.
- `all_prices.json` — ~56K records of 5-minute wholesale prices for same period. Same fields minus kwh/cost.

## Tech Stack
- **Next.js 14+ (App Router)** with TypeScript
- **Tailwind CSS** for styling — clean, modern, dark-mode dashboard aesthetic
- **Recharts or similar** for data visualisation (investigate best BI charting library for this use case — consider Tremor, Nivo, or Recharts)
- **Static data** — process the JSON data at build time into optimised daily/hourly aggregates. No backend API needed initially.
- Deploy to **Vercel** as `banyasolar`

## Views / Pages Required

### 1. Dashboard (Home)
- Today's summary cards: total import, total export, net cost, avg import price, avg export price
- Current period info (if we had real-time data)
- Last 7 days trend chart (daily import/export/cost)
- Last 7 days revenue chart

### 2. Daily Explorer
- Date picker to select any day
- 5-minute resolution chart showing: import kWh, export kWh, import price, export price
- Stacked area or line chart
- Daily summary stats
- Highlight expensive intervals (descriptor == "high" or "spike")

### 3. Cost Analysis
- Monthly cost breakdown (bar chart)
- Daily cost heatmap (calendar view)
- Peak vs off-peak vs shoulder split
- What you paid vs what you would have paid on flat rate (~30c/kWh import, ~5c/kWh export)
- Total savings/losses from wholesale pricing

### 4. Battery Performance (KEY PAGE)
- **This is the most important page**
- Since we only have grid meter data (import/export), we need to INFER battery behaviour:
  - When solar > consumption but NOT exporting much → battery is charging
  - When no solar but NOT importing much → battery is discharging
  - When importing heavily at night despite having a battery → battery NOT discharging (ERROR)
- **Error Detection:**
  - Flag intervals where: price is HIGH (>30c/kWh) AND importing heavily (>1kWh in interval) — this means the battery should have been discharging but wasn't
  - Flag intervals where: price is NEGATIVE or very low AND exporting → should have been charging instead
  - Calculate "missed savings" — the cost difference between what happened vs optimal battery usage
- **Optimal Battery Score:**
  - For each day, calculate what an ideal battery would have done:
    - Charge during cheapest hours (up to 12.8 kWh)
    - Discharge during most expensive hours
  - Compare actual grid usage pattern vs optimal
  - Score as percentage (100% = perfect battery arbitrage)
- Show this as a daily scorecard with trend over time

### 5. Price Analysis
- Price distribution histogram
- Time-of-day price heatmap (hour × day-of-week)
- Spike frequency and patterns
- Renewable % correlation with price
- Feed-in rate trends

### 6. Export/Reporting
- Downloadable CSV of daily summaries
- Key metrics summary panel

## Design Guidelines
- Dark mode primary (energy dashboard aesthetic)
- Use amber/orange accent colours (fits the Amber Electric brand)
- Cards with subtle borders, rounded corners
- Responsive — works on desktop and mobile
- Clean typography, minimal clutter
- Use colour coding: green = earning/good, red = spending/bad, amber = warning

## Data Processing
- Process the raw 5-min data into daily aggregates at build time
- Create hourly aggregates for the daily explorer
- Pre-calculate all battery performance metrics
- Store processed data as JSON that pages can import
- Keep raw data in repo but gitignore if too large (>50MB) — use a processing script instead

## Key Calculations

### Net Cost
- Import cost = sum of (kwh × perKwh) for general channel (or use cost field directly)
- Export revenue = sum of |cost| for feedIn channel (cost is negative)
- Net = import cost - export revenue

### Battery Inference (from grid data only)
Since we don't have direct battery SOC data, we infer:
- **Solar production estimate:** During daylight hours (6am-6pm), if exporting, solar ≥ consumption + export
- **Battery charging:** Solar hours + low export + low import = excess going to battery
- **Battery discharging:** Dark hours + low import = battery supplying load
- **Battery idle/not working:** Dark hours + high import = battery NOT helping

### Optimal Battery Calculation
For each day:
1. Sort all 5-min intervals by import price (descending)
2. The most expensive intervals totalling 12.8 kWh should have been served by battery (discharge)
3. The cheapest intervals totalling 12.8 kWh should have been used to charge
4. Calculate the arbitrage value: avg discharge price - avg charge price × 12.8 kWh
5. Compare to actual behaviour

## Important Notes
- Amber is the source of truth for revenue/cost — use cost field from usage data
- channelType "general" = grid import (you pay), "feedIn" = grid export (you earn)
- cost field is in CENTS, not dollars
- perKwh is in CENTS per kWh
- feedIn perKwh is NEGATIVE (represents what you get paid)
- Battery capacity is 12.8 kWh
- System has been on Amber since Dec 2022 but data only goes back to Nov 2025

When completely finished building and all pages work, run:
```
cd ~/Projects/banyasolar && git add -A && git commit -m "Initial build: Banya Solar dashboard" && git push origin main
```

Then deploy to Vercel:
```
cd ~/Projects/banyasolar && vercel --prod --yes
```

Then notify me:
```
openclaw system event --text "Done: Banya Solar dashboard built and deployed to Vercel. All pages functional." --mode now
```
