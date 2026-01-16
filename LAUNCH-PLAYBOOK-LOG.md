# K-Rent Safety Launch Playbook Log

## Overview
- **Start Date:** January 16, 2026
- **Target:** 50 free reports, 50+ emails, 10+ testimonials, first paid customers
- **Scarcity Counter Started At:** 50

---

## Week 1: Technical Fixes (Jan 16-22)
**Goal:** Fix the funnel before driving more traffic

### Completed Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Update homepage hero copy | ✅ Done | Jan 16 | New headline: "Stop overpaying for rent in Korea" |
| Remove login requirement before preview | ✅ Done | Jan 16 | Middleware updated, /analyze pages now public |
| Replace 'Unlock for Free' with email gate | ✅ Done | Jan 16 | Email capture form on preview page |
| Add scarcity counter (DB-backed) | ✅ Done | Jan 16 | `beta_settings` table, starts at 50 |
| Add scarcity counter to homepage | ✅ Done | Jan 16 | Hero + final CTA sections |
| Add scarcity counter to /check page | ✅ Done | Jan 16 | Replaced ₩39,900 price |
| Add scarcity counter to /analyze page | ✅ Done | Jan 16 | Replaced ₩39,900 price |
| Test full flow end-to-end | ✅ Done | Jan 16 | Anonymous user can complete full flow |
| Database migration | ✅ Done | Jan 16 | `beta_settings` + `beta_email_captures` tables |
| Fix counter decrement bug | ✅ Done | Jan 16 | Counter now only decrements after successful email capture |

### Technical Changes Made
- `app/page.tsx` - Homepage hero with scarcity counter
- `app/check/page.tsx` - Scarcity counter instead of price
- `app/analyze/[type]/page.tsx` - Scarcity counter instead of price
- `app/analyze/[type]/[id]/preview/page.tsx` - Email gate component
- `middleware.ts` - Removed auth requirement for /analyze routes
- `app/api/beta/counter/route.ts` - GET counter API
- `app/api/beta/unlock/route.ts` - POST email + decrement counter
- `app/api/analysis/create/route.ts` - Allow anonymous users
- `app/api/documents/upload/route.ts` - Service role client
- `app/api/documents/parse/route.ts` - Service role client
- `lib/supabase-server.ts` - Added `createServiceRoleClient()`

### New Conversion Flow
```
Homepage → /check → /analyze → Preview Page → Email Gate → Full Report
```
(No login required until email capture at preview unlock)

---

## Week 2: Soft Relaunch (Jan 23-29)
**Goal:** Announce the "limited free beta" to drive urgency

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Update pinned post with scarcity angle | ⬜ Pending | | |
| Mon: Educational post (등기부등본 tips) | ⬜ Pending | | |
| Wed: Story post (user found overpricing) | ⬜ Pending | | |
| Fri: Scarcity update comment | ⬜ Pending | | |
| Reply to housing questions daily | ⬜ Ongoing | | |
| Send first testimonial requests | ⬜ Pending | | |

### Pinned Post Template
```
Stop overpaying for rent in Korea.

I built K-Rent Safety — a free tool that checks if your jeonse or wolse quote is fair.

→ Compares your quote to real Ministry of Land data
→ Checks 20+ risk factors for deposit fraud
→ Gives you negotiation scripts if you're overpaying

⚠️ Free for the first 50 users only. After that, it's ₩39,900.

[X] spots remaining: https://www.krent-safety.com/
```

---

## Week 3: Social Proof & Urgency (Jan 30 - Feb 5)
**Goal:** Build trust with testimonials, increase urgency

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Send testimonial request emails | ⬜ Pending | | |
| Mon: Testimonial post | ⬜ Pending | | |
| Wed: Educational post (March lease season) | ⬜ Pending | | |
| Fri: Urgency post (spots running out) | ⬜ Pending | | |
| Add testimonial section to homepage | ⬜ Pending | | |
| Add "20-year veteran" credibility line | ⬜ Pending | | |

---

## Week 4: Paid Conversion (Feb 6-12)
**Goal:** Transition to paid, validate willingness to pay

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| End free beta (counter = 0) | ⬜ Pending | | |
| Announce paid launch | ⬜ Pending | | |
| Track first paid conversions | ⬜ Pending | | |

---

## Metrics Tracking

### Email Captures
| Date | Emails Captured | Total |
|------|-----------------|-------|
| Jan 16 | 1 | 1 |

### Free Reports Used
| Date | Reports | Remaining |
|------|---------|-----------|
| Jan 16 | 1 | 49 |

### Bug Fixes
| Date | Issue | Resolution |
|------|-------|------------|
| Jan 16 | Counter showed 48 but only 1 email captured | Fixed unlock API to not decrement counter if email insert fails. Reset counter to 49. |

### Testimonials Collected
| Date | From | Quote |
|------|------|-------|
| - | - | - |

---

## Database Tables

### beta_settings
- `free_unlocks_remaining`: Current counter value
- `total_unlocks_used`: Total reports unlocked

### beta_email_captures
- `email`: User's email
- `analysis_id`: Which report they unlocked
- `analysis_type`: jeonse or wolse
- `unlocked_at`: Timestamp

**View emails:** https://supabase.com/dashboard/project/ncqchpvhvoqeeydtmhut/editor/beta_email_captures

---

## Git Commits

| Commit | Date | Description |
|--------|------|-------------|
| c1821e5 | Jan 16 | Week 1 launch - remove login wall, add email gate & scarcity counter |
| 1e902a8 | Jan 16 | Replace price with scarcity counter on check page |
| 869c2b4 | Jan 16 | Replace price with scarcity counter on property input page |
| 1d9dc20 | Jan 16 | Fix counter decrement bug when email capture fails |
