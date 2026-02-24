# Solar & Battery Monitoring Spec

**System:** Sungrow SH10RT-V112 hybrid inverter, 12.8 kWh battery, 10 kWp solar  
**Retailer:** Amber Electric (wholesale pricing)  
**Date:** 2026-02-24  

---

## 1. Amber Electric API

**Base URL:** `https://api.amber.com.au/v1`  
**Auth:** `Authorization: Bearer <token>` (token in `~/.config/amber/api_key`)  
**Site ID:** `01GM47PZ7VYRDP071ED43M47TX`  
**OpenAPI Spec:** `https://app.amber.com.au/swagger.json` (v2.1.0)

### 1.1 GET /sites

Returns array of sites. **Real-time.**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Site ID (ULID) |
| `nmi` | string | National Metering Identifier (3120736394) |
| `channels[]` | array | Meter channels |
| `channels[].identifier` | string | Channel ID (E1, B1) |
| `channels[].type` | enum | `general`, `controlledLoad`, `feedIn` |
| `channels[].tariff` | string | Tariff code (6900, 9800) |
| `network` | string | Network name (Energex) |
| `status` | enum | `pending`, `active`, `closed` |
| `activeFrom` | date | Date site became active (2022-12-12) |
| `intervalLength` | int | Billing interval: 5 or 30 minutes (ours: 5) |

### 1.2 GET /sites/{siteId}/prices/current

Returns current interval + forecasts for both channels. **Real-time (5-min refresh).**

Query params:
- `resolution` - 5, 15, or 30 min (default: site interval)
- `next` - number of forecast intervals to return (default: 17, i.e. ~48 for 5-min = 4 hours)

Returns array of `CurrentInterval` (1 per channel) + `ForecastInterval` (many per channel).

#### CurrentInterval fields:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"CurrentInterval"` |
| `date` | date | NEM date |
| `duration` | int | Interval length in minutes (5) |
| `startTime` | datetime | UTC start |
| `endTime` | datetime | UTC end |
| `nemTime` | datetime | NEM time (UTC+10, end of interval) |
| `perKwh` | float | **Your price** c/kWh inc GST, network fees, market fees |
| `spotPerKwh` | float | NEM wholesale spot price c/kWh inc GST |
| `renewables` | float | % renewables in the grid |
| `channelType` | enum | `general` (import) or `feedIn` (export) |
| `spikeStatus` | enum | `none`, `potential`, `spike` |
| `tariffInformation.period` | enum | `offPeak`, `shoulder`, `solarSponge`, `peak` |
| `tariffInformation.season` | enum | `default`, `summer`, `winter`, etc. |
| `descriptor` | enum | Price level: `negative`→`extremelyLow`→`veryLow`→`low`→`neutral`→`high`→`spike` |
| `estimate` | bool | `true` if price not yet locked in |

#### ForecastInterval (additional fields):

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"ForecastInterval"` |
| `advancedPrice.low` | float | Lower bound prediction c/kWh (inc fees) |
| `advancedPrice.predicted` | float | Best guess c/kWh (inc fees) |
| `advancedPrice.high` | float | Upper bound prediction c/kWh (inc fees) |
| `range.min` / `range.max` | float | NEM spot range during volatile periods |

**Key insight:** `perKwh` for feedIn is **negative** (e.g. -9.08 c/kWh) — this is what you GET PAID per kWh exported. The magnitude = your feed-in tariff.

### 1.3 GET /sites/{siteId}/prices?startDate=&endDate=

Historical prices. Returns `ActualInterval` records for completed intervals. **Historical only.**

Query params: `startDate`, `endDate` (YYYY-MM-DD), `resolution` (5/15/30)

Fields same as CurrentInterval minus `estimate` and `advancedPrice`. Returns both `general` and `feedIn` channel types interleaved.

**Note:** Returns MANY records — 576 per day at 5-min intervals (288 × 2 channels).

### 1.4 GET /sites/{siteId}/usage?startDate=&endDate=

Actual metered usage with costs. **Historical only** (data arrives ~24h delayed from meter).

Query params: `startDate`, `endDate` (YYYY-MM-DD). Resolution is always site interval (5 min). Passing `resolution` param returns 400.

Returns `Usage` records — all BaseInterval fields plus:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"Usage"` |
| `channelIdentifier` | string | `E1` (import) or `B1` (export) |
| `kwh` | float | Energy consumed (positive) or generated (negative for export) |
| `quality` | enum | `estimated` or `billable` |
| `cost` | float | Cost in **cents** for this interval (negative = credit for export) |

**Example daily summary (2026-02-23):**
- Import (E1): 36.1 kWh, $8.51
- Export (B1): 2.3 kWh, -$0.14 (revenue)
- 576 records/day (288 × 2 channels)

**Important:** Today's usage returns empty `[]` — data only available after metering (typically next day).

### 1.5 GET /state/{state}/renewables/current

Grid renewables percentage for a state. **Real-time (30-min intervals).**

| Field | Type | Description |
|-------|------|-------------|
| `type` | enum | `CurrentRenewable`, `ActualRenewable`, `ForecastRenewable` |
| `duration` | int | 30 minutes |
| `renewables` | float | % of generation from renewables |
| `descriptor` | enum | `best`, `great`, `ok`, `notGreat`, `worst` |

### 1.6 Enums Reference

**PriceDescriptor:** `negative` → `extremelyLow` → `veryLow` → `low` → `neutral` → `high` → `spike`  
**SpikeStatus:** `none`, `potential`, `spike`  
**RenewableDescriptor:** `best`, `great`, `ok`, `notGreat`, `worst`  
**TariffPeriod:** `offPeak`, `shoulder`, `solarSponge`, `peak`  
**TariffSeason:** `default`, `summer`, `autumn`, `winter`, `spring`, `nonSummer`, `holiday`, `weekend`, `weekendHoliday`, `weekday`

---

## 2. iSolarCloud Portal Data

**URL:** `https://auweb3.isolarcloud.com`  
**User:** thebnut  
**Plant:** Banya street (Residential ESS, 10 kWp)  
**Device:** Energy Storage System_001_001, S/N: A2270743684, Model: SH10RT-V112  
**Firmware:** CB0-1.0.18.0-AB0-1.0.17.0-AA10-1.0.6.0  
**Grid:** AS/NZS 4777.2:2020 Australia A/STNW1170

### 2.1 Overview Page (Real-time)

Power flow diagram showing:
- **PV Power** (W) — solar panel output
- **Battery Power** (W) — charge/discharge 
- **Battery SOC** (%) — state of charge (e.g. 100%)
- **Grid Power** (kW) — import/export
- **Load Power** (kW) — household consumption
- **Power flow direction** — animated arrows showing energy routing

Summary cards:
- Real-time power (W)
- Installed power (10 kWp)
- Energy analysis: Production, Consumption, Net (kWh)
- Net revenue (AUD) — daily/weekly/monthly/yearly/lifetime
- Emission reduction stats (CO₂, coal saved, trees equivalent)

### 2.2 Live Data Page (Real-time, ~5s refresh)

**Main measuring point:**

| Data Point | Example | Notes |
|------------|---------|-------|
| Total DC power | 0 W | Solar DC input |
| Total active power | -22 W | AC output (negative = consuming from grid?) |
| Phase A/B/C voltage | 243.2 / 247 / 248 V | Three-phase voltages |
| Phase A/B/C current | 0.5 / 0.4 / 0.4 A | Three-phase currents |
| Grid frequency | 49.98 Hz | |
| Daily PV yield | 51 kWh | |
| **MPPT 1 voltage/current** | 0 V / 0 A | String 1 |
| **MPPT 2 voltage/current** | 0 V / 0 A | String 2 |
| **Battery level (SOC)** | 100% | State of charge |
| **Battery SOH** | 94% | State of health |
| **Battery charging power** | 0 W | |
| **Battery discharging power** | 0 W | |
| Battery type | Sungrow high-voltage Li-ion | |
| Battery capacity | 12.8 kWh | |
| Grid energy purchasing power | 1.4 kW | Import from grid |
| Feed-in power | 0 W | Export to grid |
| Meter phase A/B/C active power | 577 / 772 / 31 W | Per-phase grid meter |

Also has **AC curve** tab (likely AC voltage/current waveforms).

### 2.3 Curve Page (Historical charts)

Time-series charts for:
- Total DC power (kW)
- Total active power (kW)
- Battery charging power (kW)
- Battery discharging power (kW)

Configurable: Day/Week/Month/Year/Custom, 15-min intervals, with Filter options.
**Has download button** — can export data as Excel or CSV.

### 2.4 Device Page

Lists inverter with: Device name, model, S/N, status, Total DC power, Total active power.

### 2.5 Settings Page

**Quick setting tab:**
- Quick charge — force battery charging from grid
- Quick discharge — force rapid battery discharge

**Device parameters tab:**
- Initial grid connection settings
- Country/region, grid type, firmware version
- Common settings (batch configurable)

**General information tab** — plant details  
**Tariff tab** — tariff configuration

### 2.6 Additional Pages (from menu)

- **Fault** — fault/alarm history
- **Plant configuration** — system configuration
- **Firmware update** — OTA firmware management
- **Cloud strategies** — cloud-based control strategies (potentially SmartShift related!)
- **Strategy configuration** — ground-level strategy settings
- **Report** — generate reports (global menu)

### 2.7 iSolarCloud API Options

**Official Developer API exists:** `https://developer-api.isolarcloud.com/`
- Requires requesting an **App Key** from Sungrow
- Provides programmatic access to plant/device data
- Community projects: [pysolarcloud](https://github.com/bugjam/pysolarcloud), [Sungrow-API](https://github.com/jsanchezdelvillar/Sungrow-API)

**Alternative: Modbus** — Sungrow SH10RT supports local Modbus TCP on port 502
- Direct LAN access to ALL inverter registers
- Real-time data without cloud dependency
- Home Assistant integration: [Sungrow-SHx-Inverter-Modbus-Home-Assistant](https://github.com/mkaiser/Sungrow-SHx-Inverter-Modbus-Home-Assistant)
- Can read AND write registers (battery control!)

**Data export:** Curve page has Excel/CSV export functionality.

---

## 3. Monitoring Opportunities

### 3.1 Price-Based Alerts (Amber API — real-time)

| Alert | Trigger | Data Source |
|-------|---------|-------------|
| **Price spike** | `spikeStatus == "spike"` or `descriptor == "spike"` | prices/current |
| **Potential spike** | `spikeStatus == "potential"` | prices/current |
| **Negative prices** | `perKwh < 0` on general channel | prices/current |
| **Extremely cheap** | `descriptor == "extremelyLow"` | prices/current |
| **High price + battery full + not discharging** | High price + SOC 100% + discharge 0W | Amber + iSolarCloud |
| **Negative price + not charging from grid** | Negative import price + charging power 0W | Amber + iSolarCloud |
| **Price forecast summary** | Next 4h average price, expected peaks | prices/current forecasts |

### 3.2 System Health Alerts (iSolarCloud)

| Alert | Trigger | Data Source |
|-------|---------|-------------|
| **Battery SOH degradation** | SOH drops below threshold | Live data |
| **Grid voltage anomaly** | Phase voltage outside 220-253V | Live data |
| **Grid frequency anomaly** | Frequency outside 49.85-50.15 Hz | Live data |
| **Inverter offline** | Status != Normal | Plant/Device page |
| **Solar underperformance** | Daily yield << expected for weather | Overview |
| **MPPT string mismatch** | Significant difference between MPPT1/MPPT2 | Live data |

### 3.3 Cost Analytics (Amber Usage API — daily)

| Metric | Calculation | Data Source |
|--------|-------------|-------------|
| **Daily cost summary** | Sum E1 costs, sum B1 credits | usage endpoint |
| **Net daily cost** | Import cost - export revenue | usage endpoint |
| **Average import price paid** | Total cost / total kWh imported | usage endpoint |
| **Average export price received** | Total revenue / total kWh exported | usage endpoint |
| **Peak vs off-peak split** | Group by tariffInformation.period | usage endpoint |
| **Weekly/monthly trends** | Aggregate daily summaries | usage endpoint |

### 3.4 SmartShift Effectiveness Scoring

| Metric | Calculation | Notes |
|--------|-------------|-------|
| **Battery arbitrage value** | Compare discharge price vs charge price | Need charge/discharge times from iSolarCloud + prices from Amber |
| **Optimal vs actual timing** | Compare actual charge/discharge times to optimal (lowest/highest prices) | Cross-reference Amber prices with battery curve |
| **Missed opportunities** | Price spikes where battery was full but not discharging, or negative prices where battery wasn't charging | Real-time cross-check |
| **Self-consumption ratio** | Solar consumed vs solar exported | Usage E1 vs B1 data |

### 3.5 Battery Cycle Tracking

| Metric | Calculation |
|--------|-------------|
| **Daily cycles** | Total kWh charged / battery capacity (12.8 kWh) |
| **Charge/discharge efficiency** | kWh discharged / kWh charged (round-trip efficiency) |
| **SOH trend** | Track Battery SOH % over time |
| **Depth of discharge** | Min SOC reached per cycle |

---

## 4. Data Gaps

| Gap | Impact | Workaround |
|-----|--------|------------|
| **No Amber API for SmartShift commands** | Can't see what SmartShift told the battery to do | Must infer from battery behavior |
| **No real-time SOC via Amber API** | Amber only has price/usage, not battery state | Need iSolarCloud or Modbus |
| **iSolarCloud API requires App Key request** | Can't programmatically access battery data without applying | Use Modbus, or scrape portal |
| **Usage data ~24h delayed** | Can't do real-time cost tracking | Use prices/current × estimated consumption |
| **No battery command history** | Can't audit what charged/discharged the battery and why | Infer from SOC + power curves |
| **No Amber forecast accuracy history** | Can't score forecast quality over time | Would need to log forecasts and compare to actuals |
| **Grid import/export not in Amber real-time** | prices/current has no kWh data | Only in usage (next day) |
| **iSolarCloud cloud dependency** | If Sungrow cloud is down, no monitoring | Modbus is local fallback |

---

## 5. Recommendations — Implementation Priority

### Phase 1: Quick Wins (Amber API only, no new integrations)

1. **Price alert bot** — Poll `prices/current` every 5 min
   - Alert on spike/potential spike
   - Alert on negative prices (opportunity to charge)
   - Alert on extremelyLow prices
   - Daily forecast summary (next 4h outlook)

2. **Daily cost summary** — Run daily at midnight
   - Pull yesterday's usage, calculate import cost, export revenue, net cost
   - Track average prices paid/received
   - Compare to what you would have paid on flat rate

### Phase 2: Cross-Source Monitoring (Amber + iSolarCloud scraping or Modbus)

3. **SmartShift effectiveness monitor**
   - Log battery SOC + charge/discharge power every 5 min (from iSolarCloud Live Data or Modbus)
   - Cross-reference with Amber prices
   - Score: "battery discharged X kWh at avg Y c/kWh, charged Z kWh at avg W c/kWh, arbitrage value = $N"
   - Alert when SmartShift misses obvious opportunities

4. **Real-time decision alerts**
   - "Price is X c/kWh, battery at Y%, should be discharging but isn't"
   - "Negative prices, battery at Z%, should be charging but isn't"

### Phase 3: Full Automation (Modbus control)

5. **Direct battery control via Modbus**
   - Override SmartShift when it's clearly wrong
   - Force charge during negative prices
   - Force discharge during spikes
   - Requires Modbus TCP connection to inverter on LAN

6. **Predictive scheduling**
   - Use Amber forecast + weather forecast + historical consumption patterns
   - Pre-position battery SOC for expected price peaks

### Recommended Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Amber API   │────▶│              │────▶│ Alerts      │
│ (prices,    │     │  Monitor     │     │ (Google Chat │
│  usage)     │     │  Script      │     │  via OpenClaw)│
└─────────────┘     │              │     └─────────────┘
                    │  (cron/      │
┌─────────────┐     │   daemon)    │     ┌─────────────┐
│ iSolarCloud │────▶│              │────▶│ Daily       │
│ (Modbus or  │     │              │     │ Reports     │
│  API/scrape)│     └──────────────┘     └─────────────┘
└─────────────┘            │
                           ▼
                    ┌──────────────┐
                    │ Historical   │
                    │ Data Store   │
                    │ (SQLite/JSON)│
                    └──────────────┘
```

### Quick Start Command

```bash
# Current price check
curl -s -H "Authorization: Bearer $(cat ~/.config/amber/api_key)" \
  "https://api.amber.com.au/v1/sites/01GM47PZ7VYRDP071ED43M47TX/prices/current" | \
  python3 -c "import json,sys; [print(f\"{d['channelType']}: {d['perKwh']:.1f} c/kWh ({d['descriptor']}) spike={d['spikeStatus']}\") for d in json.load(sys.stdin) if d['type']=='CurrentInterval']"
```
