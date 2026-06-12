## Goal

Full Engagement page par har engagement type (views, likes, comments, saves, shares, etc.) ke liye user khud apna **delivery time** (kitne ghante me poora ho) set kar sake, aur service ke **minimum** ke hisaab se **maximum runs** ka warning automatically aaye — taaki user 10 se zyada runs (jab quantity = 1000, min = 100 ho) na laga sake.

## What already exists

- `EngagementTypeCard` me per-type "Delivery Time" presets (Auto/6h/12h/24h/48h/Custom) already hain, aur Custom me 1–168 ghante daal sakte hain.
- Schedule generator (`generateOrganicSchedule`) `timeLimitHours` ka use karta hai aur har type ke liye alag schedule banata hai.
- Service ka `min_quantity` already DB se aata hai (`providerMin`).

So custom time wala part 80% ready hai — bas isko reliable banana hai aur ek **runs cap** lagana hai.

## Changes

### 1. Per-type "Max Runs" cap (`src/components/engagement/EngagementTypeCard.tsx`)

- Formula: `maxRuns = floor(quantity / providerMin)`
  - Example: 1000 views, min 100 → max 10 runs.
- Settings panel me ek nayi field: **"Number of Runs"** (optional, default = Auto).
  - Input ya slider (1 se `maxRuns` tak).
  - Agar user `maxRuns` se zyada daalne ki koshish kare → input clamp ho jaye `maxRuns` par + red warning text dikhe:
    > "⚠ Maximum {maxRuns} runs allowed (quantity {qty} ÷ min {providerMin})"
- Ye value `config.customRunCount` me store hogi (naya optional field in `EngagementConfig`).

### 2. Schedule generator respect karega cap (`src/lib/organic-algorithm.ts`)

- `generateOrganicSchedule` me ek naya optional param `customRunCount?: number` add.
- Jab ye diya jaye: algorithm exactly utne hi runs banayega (clamp to `maxRunsByMin`).
- Quantity har run me roughly evenly distribute hogi (≥ providerMin per run), variance + peak-hours logic same rahega.

### 3. Delivery time reliability

- Custom hours value ko `min=1, max=168` clamp already hai — preserve.
- `DeliveryPreview` me jo "non-views types views duration follow karte hain" wala override hai use hata kar har type apna apna `timeLimitHours` strictly follow kare (warna user ki choice ignore hoti hai).

### 4. UI feedback

- Card ke header me jab `customRunCount` set ho: badge dikhe `"{N} runs in {hours}h"`.
- Quantity ya min badalne par agar pehle ka `customRunCount` ab > `maxRuns` ho → auto clamp + toast warning.

## Files to edit

- `src/lib/engagement-types.ts` — add `customRunCount?: number` to `EngagementConfig`.
- `src/components/engagement/EngagementTypeCard.tsx` — add Runs input + warning + maxRuns calc.
- `src/lib/organic-algorithm.ts` — accept and honor `customRunCount`.
- `src/components/engagement/DeliveryPreview.tsx` — pass `customRunCount` through, remove views-anchor duration override.
- `src/pages/EngagementOrder.tsx` — pass new config to backend (already passes full config object, so likely no change).

## Out of scope

- Backend (`process-engagement-order`, `execute-all-runs`) already runs whatever schedule we pass — no changes needed there.
- Pricing logic stays same (price is per-quantity, not per-run).

Confirm karo to main build mode me jaake implement kar du.