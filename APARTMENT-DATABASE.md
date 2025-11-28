# Apartment Database

## Overview

The jeonse safety checker uses a comprehensive database of all Seoul apartments with recent transaction data from the MOLIT (Ministry of Land, Infrastructure and Transport) API.

## Database Statistics

- **Total apartments**: 4,370 unique buildings
- **Data source**: MOLIT Real Transaction Price API
- **Update frequency**: Monthly recommended
- **Coverage**: Last 6 months of transaction data
- **Districts covered**: All 25 Seoul districts (구)

## How It Works

### 1. Data Collection

The database is built by fetching transaction data from MOLIT for all Seoul districts:

```bash
# Build/rebuild the database
npx tsx scripts/build-apartment-database.ts
```

This process:
- Fetches transactions from last 6 months for each district
- Extracts unique apartment names
- Collects metadata: district, neighborhoods (동), transaction volumes, price ranges, unit sizes

### 2. Database Structure

The database is stored in `scripts/apartment-database.json`:

```json
{
  "generatedAt": "2025-11-14T04:01:37.123Z",
  "months": ["202511", "202510", "202509", "202508", "202507", "202506"],
  "totalTransactions": 38982,
  "totalApartments": 4370,
  "apartments": [
    {
      "name": "텐즈힐(1단지)",
      "district": "성동구",
      "districtCode": "11200",
      "dongs": ["하왕십리동"],
      "transactionCount": 65,
      "areas": [59, 72, 84, 129, 148],
      "priceRange": {
        "min": 1580000000,
        "max": 2550000000
      }
    }
  ]
}
```

### 3. Frontend Integration

The apartment list is automatically loaded in [lib/data/address-data.ts](lib/data/address-data.ts):

```typescript
// Automatically loads 4,370 apartments from database
export const SEOUL_APARTMENTS: Apartment[] = loadApartmentDatabase();

// Search with filters
const results = searchApartments('텐즈힐', '하왕십리동', '성동구');
```

## Updating the Database

### Manual Update

**Windows:**
```batch
scripts\update-apartment-database.bat
```

**Linux/Mac:**
```bash
bash scripts/update-apartment-database.sh
```

### Automated Monthly Updates

**Windows Task Scheduler:**
1. Open Task Scheduler
2. Create Basic Task
3. Schedule: Monthly, 1st day, 2:00 AM
4. Action: Start a program
   - Program: `cmd.exe`
   - Arguments: `/c "cd C:\Projects\jeonse-safety-checker && scripts\update-apartment-database.bat"`

**Linux/Mac Cron:**
```bash
# Edit crontab
crontab -e

# Add monthly update (1st of month at 2 AM)
0 2 1 * * cd /path/to/jeonse-safety-checker && bash scripts/update-apartment-database.sh
```

## Database Features

### 1. Building Phase Support

The system automatically handles apartment complexes with multiple phases:

- **Input**: "텐즈힐"
- **Matches**:
  - "텐즈힐(1단지)"
  - "텐즈힐(2단지)"

### 2. Smart Filtering

Filter by:
- **Name**: Partial or full apartment name
- **District (구)**: Filter by district
- **Neighborhood (동)**: Filter by specific dong
- **Combined**: All filters together

Example:
```typescript
// Find all apartments with "힐" in 하왕십리동, 성동구
searchApartments('힐', '하왕십리동', '성동구');
// Returns: 텐즈힐(1단지)
```

### 3. Fallback Strategy

If the database file is not found, the system falls back to a curated list of ~150 popular apartments.

## Testing

### Test Database Loading

```bash
npx tsx scripts/test-apartment-database.ts
```

Expected output:
```
✅ Loaded 4370 apartments from database
📊 Total apartments loaded: 4,370

🔍 Searching for "텐즈힐"...
   Found: 2 results
   - 텐즈힐(1단지) (성동구, dongs: 하왕십리동)
   - 텐즈힐(2단지) (성동구, dongs: 상왕십리동)
```

### Test MOLIT API Integration

```bash
npx tsx scripts/test-tenszhill.ts
```

Verifies:
- Building name matching with phases
- MOLIT API transaction data retrieval
- 111 transactions found for 텐즈힐

## Troubleshooting

### Database Not Loading

**Symptom**: Frontend only shows ~150 apartments

**Solution**:
1. Check if `scripts/apartment-database.json` exists
2. Rebuild: `npx tsx scripts/build-apartment-database.ts`
3. Verify MOLIT_API_KEY in `.env.local`

### MOLIT API Errors

**Symptom**: "No recent transaction data found"

**Possible causes**:
1. Building name mismatch (check exact name in MOLIT)
2. No recent transactions (building may be too new/old)
3. API rate limiting (wait and retry)

**Solution**: Use the fallback jeonse-ratio estimation (70% of property value)

### Missing Apartments

**Symptom**: Specific apartment not in database

**Reasons**:
1. No transactions in last 6 months
2. Not registered in MOLIT system
3. Name mismatch (check MOLIT database directly)

**Solution**: Users can still enter custom building names via the "Use custom name" button

## API Integration

The database integrates with MOLIT API for property valuation:

1. **User selects apartment** from dropdown (4,370 options)
2. **System fetches MOLIT data** using the exact building name
3. **Building phases handled** automatically ("텐즈힐" matches both phases)
4. **Transactions analyzed** to calculate property value
5. **Risk analysis** uses accurate valuation data

## Future Improvements

1. **Multi-city support**: Extend beyond Seoul (Busan, Incheon, etc.)
2. **Real-time updates**: API endpoint to trigger database refresh
3. **Apartment metadata**: Add building year, total floors, amenities
4. **English translations**: Improve English name coverage
5. **Search optimization**: Add fuzzy matching for typos

## Performance

- **Database file size**: ~2-3 MB
- **Load time**: <100ms (cached after first load)
- **Search performance**: O(n) linear search (fast enough for 4,370 items)
- **Update time**: ~3-5 minutes (depends on MOLIT API response time)

## Maintenance

- **Recommended update frequency**: Monthly
- **Backup retention**: Last 5 backups kept automatically
- **Monitoring**: Check update scripts run successfully
- **MOLIT API changes**: May require updates to parser logic
