# Progress Page Testing Guide

## What Was Fixed
✅ **Removed**: Simulated progress timer (was causing 95% → 25% → 100% jumps)
✅ **Added**: Single source of truth - server-side progress only
✅ **Improved**: Faster polling (1 second vs 2 seconds)
✅ **Added**: Strategic delays (1.5s each) between database updates to ensure frontend sees all intermediate states

## Manual Testing Steps

### 1. Start a New Analysis
1. Open http://localhost:3000
2. Fill in the form:
   - District: 동대문구
   - Dong: 청량리동
   - Building: 청계한신휴플러스
   - Jeonse: 500000000
3. Click "Continue to document upload →"

### 2. Upload Document
1. Upload the test PDF: `test/registry_report/청계한신휴플러스 108동 2003호_registry.pdf`
2. Click "Start Analysis"
3. You'll be redirected to `/analyze/[id]/processing`

### 3. Watch Progress Bar
**What you should see:**
- ✅ Progress starts at 0%
- ✅ Smoothly increases: 0% → 25% → 50% → 75% → 100%
- ✅ NO backwards jumps
- ✅ Step indicators sync with progress
- ✅ Current step animates with bouncing dots

**What you should NOT see:**
- ❌ Progress jumping backwards (95% → 25%)
- ❌ Progress getting stuck
- ❌ Steps out of sync with progress percentage

### 4. Verify API Polling
Open browser DevTools → Network tab:
- ✅ Should see `/api/analysis/status/[id]` requests every 1 second
- ✅ Each response should have increasing `progress` value
- ✅ Progress should be monotonically increasing (never decreasing)

### 5. Check Console
Open browser DevTools → Console:
- ✅ Should see no errors
- ✅ May see: "Status check error:" only if network fails (expected)

## Expected Progress Flow

```
Time  | Progress | Step | What's Happening
------|----------|------|------------------
0s    | 0%       | 0    | Analysis created
2s    | 25%      | 1    | Document parsing started
10s   | 75%      | 3    | Document parsed, mortgages extracted
11-12s| 75-85%   | 3-4  | Transitioning (1.5s delay)
12s   | 85%      | 4    | Status=completed, finalizing results
13-14s| 85-100%  | 4-5  | Transitioning (1.5s delay)
14s   | 100%     | 5    | Results saved → Redirects to report
```

## Code Changes Summary

**Before** (processing/page.tsx):
```typescript
// BAD: Two competing progress systems
useEffect(() => {
  // Simulated progress (fake timer)
  setProgress(Math.min((elapsed / totalDuration) * 100, 95));
}, []);

useEffect(() => {
  // Server progress (real data)
  setProgress(data.progress);
}, []);
```

**After** (processing/page.tsx):
```typescript
// GOOD: Single source of truth
useEffect(() => {
  // Only server progress
  if (typeof data.progress === 'number') {
    setProgress(data.progress);
    const stepIndex = Math.floor((data.progress / 100) * steps.length);
    setCurrentStep(stepIndex);
  }
}, []);
```

## Success Criteria

✅ Progress bar moves forward only (0% → 100%)
✅ No backwards jumps
✅ Step indicators sync correctly
✅ Completes in ~10-15 seconds
✅ Auto-redirects to report page at 100%

## If You See Issues

**Issue**: Progress stuck at 25%
**Cause**: Backend processing failed
**Fix**: Check API logs, verify Supabase connection

**Issue**: Progress jumps backwards
**Cause**: The fix wasn't applied correctly
**Fix**: Verify processing/page.tsx has only ONE useEffect for polling

**Issue**: No progress at all (stays 0%)
**Cause**: API endpoint not returning progress
**Fix**: Check `/api/analysis/status/[id]` response
