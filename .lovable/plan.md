## Scope

Is project me koi `MassOrder.tsx` ya `UserEngagementOrder.tsx` nahi hai — equivalent page hai `src/pages/EngagementOrder.tsx` (1014 lines, single-link order builder). Saare feature changes wahaan apply honge. Perf changes app-wide.

⚠️ Project memory bolti hai "Do NOT change features or UI" (GitHub import). Ye request explicitly UI/feature add karne ko bol rahi hai, to wo rule is task ke liye override kar raha hu — confirm kar dena agar problem ho.

---

## Part A — EngagementOrder feature changes

### 1. Campaign Name
- EngagementOrder page ke top me ek `Campaign Name` input add karunga (optional, placeholder: `e.g. Diwali Reel Campaign`).
- State me `campaignName: string` rakhunga, order submit pe `engagement_orders.notes` ya naya field me bhejunga.
- DB: `engagement_orders` me `campaign_name TEXT` column add karne ke liye migration.

### 2. Per-type quantity override
- Har enabled engagement type ke card me already quantity/ratio control hai. Uske bagal me ek **"Custom qty"** number input add karunga (empty = use ratio, value = override).
- State shape:
  ```ts
  qtyOverrides: Partial<Record<EngagementType, number>>
  ```
- Compute logic:
  ```ts
  const raw = qtyOverrides[type] ?? Math.round(baseQty * ratio / 100);
  const qty = Math.max(minQty, raw);
  ```
- Price aur total auto recompute (existing memo me hook).
- Header me **"Reset to base ratio"** button — clears all overrides.

### 3. Custom timeframe (hours)
- Timeframe selector me presets ke saath ek **`Custom`** option add karunga.
- Select hone par ek `number` input (1–720) dikhega.
- Submit pe `duration_hours` directly user value use karega.

---

## Part B — Performance optimizations

### Lazy routing (`src/App.tsx`)
- `Index`, `Auth`, legal pages, aur saare admin pages ko `React.lazy()` me convert karunga.
- `<Suspense fallback={null}>` BrowserRouter ke andar.

### React Query tuning (`src/App.tsx`)
- `staleTime: 10*60*1000`, `gcTime: 30*60*1000` set karunga (already close hai, bump up).

### Subscription hook (`src/hooks/useSubscription.ts`)
- Agar `subscription.status === 'active'` to `subscription_requests` query skip — `enabled` guard.

### SubscriptionGuard
- Project me `GlobalSubscriptionGuard` use nahi ho raha (App.tsx me wrap nahi hai). `SubscriptionGuard` ka koi double-wrap call site bhi rg se check karunga, jo extras milein hatadunga.

### Heavy components in EngagementOrder
- `LiveGrowthChart` aur `DeliveryPreview` ko `React.lazy` + **"Show delivery preview"** toggle ke peeche.

### EngagementTypeCard cleanup
- `date-fns` / `recharts` / `organic-algorithm` ke direct imports check karke unused/heavy ones hatadunga ya lazy karunga. (Sirf demonstrable wins — actual file dekhne ke baad.)

### index.html + main.tsx
- Razorpay `<script>` tag (agar `index.html` me hai) hatake `RazorpayDepositCard` me dynamic loader add karunga.
- `main.tsx` me service worker **unregister** logic add karunga, `public/sw.js` ko no-op kar dunga taaki stale cache na pakde.

### Image compression
- `public/favicon.png`, `public/logo.png`, `public/icon-512x512.png`, `src/assets/logo.png` ko `sharp` se resize+optimize karunga (visual same rakhke).

---

## Out of scope / skipping
- Vite plugin install (`vite-imagetools`) — sirf zarurat pe.
- DB column rename — sirf `campaign_name` add hoga.
- Razorpay flow logic change nahi karunga, sirf script load timing.

---

## Order of execution
1. DB migration (`engagement_orders.campaign_name`).
2. EngagementOrder.tsx feature edits (campaign name, qty overrides, custom hours).
3. App.tsx lazy routes + React Query bump.
4. useSubscription.ts conditional query.
5. EngagementOrder lazy heavy children.
6. SW unregister + image compression + razorpay defer.
7. Build verification.

---

## Confirm karo
- Theek hai? Ya kuch part skip karu (e.g. SW disable, ya image compression)?
- "Do not change features/UI" memory override OK hai?
