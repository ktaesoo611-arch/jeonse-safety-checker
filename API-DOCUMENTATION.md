# API Documentation - Jeonse Safety Checker

**Base URL**: `http://localhost:3000` (development)

---

## Table of Contents

1. [Create Analysis](#1-create-analysis)
2. [Get Analysis Status](#2-get-analysis-status)
3. [Get Analysis Report](#3-get-analysis-report)
4. [Upload Document](#4-upload-document)
5. [Parse Document](#5-parse-document)
6. [Error Codes](#error-codes)

---

## 1. Create Analysis

Creates a new jeonse safety analysis for a property.

### Endpoint
```
POST /api/analysis/create
```

### Request Body
```json
{
  "address": "string (required) - Full property address",
  "proposedJeonse": "number (required) - Proposed jeonse amount in KRW"
}
```

### Example Request
```bash
curl -X POST http://localhost:3000/api/analysis/create \
  -H "Content-Type: application/json" \
  -d '{
    "address": "서울특별시 강남구 역삼동 123-45",
    "proposedJeonse": 500000000
  }'
```

### Response (201 Created)
```json
{
  "analysisId": "68a4a312-c9fe-4fd3-82d4-5e9eaa7f16ec",
  "propertyId": "334d7980-5548-45f9-b70f-1332712e3fa1",
  "status": "pending",
  "createdAt": "2025-11-11T00:24:13.896Z",
  "message": "Analysis created successfully"
}
```

### Error Responses
- `400 Bad Request` - Invalid or missing required fields
- `500 Internal Server Error` - Database or server error

---

## 2. Get Analysis Status

Retrieves the current status and progress of an analysis.

### Endpoint
```
GET /api/analysis/status/{analysisId}
```

### URL Parameters
- `analysisId` (required) - UUID of the analysis

### Example Request
```bash
curl http://localhost:3000/api/analysis/status/68a4a312-c9fe-4fd3-82d4-5e9eaa7f16ec
```

### Response (200 OK)
```json
{
  "analysisId": "68a4a312-c9fe-4fd3-82d4-5e9eaa7f16ec",
  "status": "completed",
  "address": "서울특별시 강남구 역삼동 123-45",
  "proposedJeonse": 500000000,
  "createdAt": "2025-11-11T00:24:13.896Z",
  "completedAt": "2025-11-11T00:28:45.123Z",
  "progress": 100,
  "safetyScore": 84,
  "riskLevel": "SAFE",
  "documents": [
    {
      "id": "doc-uuid",
      "type": "deunggibu",
      "fileName": "등기부등본.pdf",
      "uploadedAt": "2025-11-11T00:25:30.000Z",
      "parsed": true
    }
  ]
}
```

### Status Values
- `pending` - Analysis created, awaiting document upload
- `processing` - Documents uploaded, parsing in progress
- `completed` - Analysis complete, report available
- `failed` - Analysis failed (check error details)

### Progress Values
- `0` - Pending
- `25` - Processing started
- `50-75` - Document parsing in progress
- `100` - Completed

### Error Responses
- `400 Bad Request` - Invalid UUID format
- `404 Not Found` - Analysis not found
- `500 Internal Server Error` - Database or server error

---

## 3. Get Analysis Report

Retrieves the complete risk analysis report (only available when status is 'completed').

### Endpoint
```
GET /api/analysis/report/{analysisId}
```

### URL Parameters
- `analysisId` (required) - UUID of the analysis

### Example Request
```bash
curl http://localhost:3000/api/analysis/report/68a4a312-c9fe-4fd3-82d4-5e9eaa7f16ec
```

### Response (200 OK)
```json
{
  "analysisId": "68a4a312-c9fe-4fd3-82d4-5e9eaa7f16ec",
  "generatedAt": "2025-11-11T00:30:00.000Z",
  "completedAt": "2025-11-11T00:28:45.123Z",

  "property": {
    "address": "서울특별시 강남구 역삼동 123-45",
    "proposedJeonse": 500000000,
    "estimatedValue": 1000000000,
    "area": 85.5,
    "buildingAge": 5,
    "propertyType": "아파트"
  },

  "riskAnalysis": {
    "overallScore": 84,
    "riskLevel": "SAFE",
    "verdict": "SAFE TO PROCEED - Score: 84/100. This property shows good fundamentals...",

    "scores": {
      "ltvScore": 60,
      "debtScore": 100,
      "legalScore": 100,
      "marketScore": 80,
      "buildingScore": 90
    },

    "metrics": {
      "ltv": 66.7,
      "totalDebt": 600000000,
      "availableEquity": 400000000,
      "debtCount": 1
    },

    "risks": [
      {
        "type": "HIGH_LTV",
        "severity": "MODERATE",
        "description": "LTV is 66.7%, approaching high-risk threshold"
      }
    ],

    "debtRanking": [
      {
        "rank": 1,
        "type": "근저당권",
        "creditor": "국민은행",
        "amount": 600000000,
        "registrationDate": "2023-01-15"
      }
    ],

    "smallAmountPriority": {
      "isEligible": true,
      "threshold": 165000000,
      "protectedAmount": 55000000,
      "region": "서울"
    }
  },

  "recommendations": {
    "mandatory": [
      "Get 확정일자 AND 전입신고 SAME DAY as payment",
      "Move in physically same day (점유 required for 대항력)"
    ],
    "recommended": [
      "Get jeonse insurance (전세보증보험)",
      "Verify owner's identity and ownership"
    ],
    "optional": [
      "Consider lower jeonse amount for better safety"
    ]
  },

  "summary": {
    "safetyScore": 84,
    "riskLevel": "SAFE",
    "isSafe": true,
    "isModerate": false,
    "isHigh": false,
    "isCritical": false,
    "criticalIssues": 0,
    "highIssues": 0,
    "moderateIssues": 2,
    "verdict": "SAFE TO PROCEED - Score: 84/100..."
  },

  "legalInfo": {
    "law": "주택임대차보호법 시행령",
    "effectiveDate": "2025. 3. 1.",
    "decree": "대통령령 제35161호, 2024. 12. 31., 일부개정"
  },

  "documents": [
    {
      "id": "doc-uuid",
      "type": "deunggibu",
      "fileName": "등기부등본.pdf",
      "uploadedAt": "2025-11-11T00:25:30.000Z",
      "parsed": true
    }
  ]
}
```

### Risk Levels
- `SAFE` (75-100) - Good fundamentals, manageable risk
- `MODERATE` (60-74) - Acceptable with protections
- `HIGH` (40-59) - Significant concerns, high risk
- `CRITICAL` (0-39) - Do not proceed, too dangerous

### Error Responses
- `400 Bad Request` - Analysis not completed yet or invalid UUID
- `404 Not Found` - Analysis not found
- `500 Internal Server Error` - Database or server error

---

## 4. Upload Document

Uploads a document (등기부등본 or 건축물대장) for analysis.

### Endpoint
```
POST /api/documents/upload
```

### Request (multipart/form-data)
- `analysisId` (required) - UUID of the analysis
- `documentType` (required) - Either "deunggibu" or "building_ledger"
- `file` (required) - PDF file (max 10MB)

### Example Request
```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -F "analysisId=68a4a312-c9fe-4fd3-82d4-5e9eaa7f16ec" \
  -F "documentType=deunggibu" \
  -F "file=@/path/to/등기부등본.pdf"
```

### Response (201 Created)
```json
{
  "documentId": "doc-uuid",
  "fileName": "등기부등본.pdf",
  "fileSize": 2458624,
  "fileUrl": "https://storage.supabase.co/...",
  "uploadedAt": "2025-11-11T00:25:30.000Z",
  "message": "Document uploaded successfully"
}
```

### File Requirements
- **Type**: PDF only
- **Size**: Max 10MB
- **Document Types**:
  - `deunggibu` - 등기부등본 (Property registration)
  - `building_ledger` - 건축물대장 (Building ledger)

### Error Responses
- `400 Bad Request` - Invalid fields, file type, or file size
- `404 Not Found` - Analysis not found
- `500 Internal Server Error` - Upload or database error

---

## 5. Parse Document

Parses an uploaded document and performs risk analysis.

### Endpoint
```
POST /api/documents/parse
```

### Request Body
```json
{
  "documentId": "doc-uuid"
}
```

### Example Request
```bash
curl -X POST http://localhost:3000/api/documents/parse \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "doc-uuid"
  }'
```

### Response (200 OK)
```json
{
  "documentId": "doc-uuid",
  "parsedData": {
    "property": {
      "address": "서울특별시 강남구 역삼동 123-45",
      "area": 85.5,
      "buildingAge": 5
    },
    "rights": [...],
    "valuation": {...}
  },
  "parsedAt": "2025-11-11T00:26:15.000Z",
  "message": "Document parsed successfully"
}
```

### Process Flow
1. Downloads document from storage
2. Extracts text using OCR (Google Vision API)
3. Parses 등기부등본 structure
4. Fetches MOLIT transaction data
5. Calculates property valuation
6. Performs risk analysis
7. Updates analysis status to 'completed'

### Error Responses
- `400 Bad Request` - Invalid document ID or unsupported type
- `404 Not Found` - Document not found
- `500 Internal Server Error` - Parsing or analysis error

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input, validation failed |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Database or server error |

### Error Response Format
```json
{
  "error": "Error message",
  "details": "Detailed error description (optional)"
}
```

---

## Complete Workflow Example

### Step 1: Create Analysis
```bash
curl -X POST http://localhost:3000/api/analysis/create \
  -H "Content-Type: application/json" \
  -d '{
    "address": "서울특별시 강남구 역삼동 123-45",
    "proposedJeonse": 500000000
  }'

# Response: { "analysisId": "xxx", "status": "pending" }
```

### Step 2: Upload Document
```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -F "analysisId=xxx" \
  -F "documentType=deunggibu" \
  -F "file=@등기부등본.pdf"

# Response: { "documentId": "yyy", ... }
```

### Step 3: Parse Document
```bash
curl -X POST http://localhost:3000/api/documents/parse \
  -H "Content-Type: application/json" \
  -d '{ "documentId": "yyy" }'

# Triggers analysis automatically
```

### Step 4: Check Status
```bash
curl http://localhost:3000/api/analysis/status/xxx

# Response: { "status": "completed", "progress": 100, ... }
```

### Step 5: Get Report
```bash
curl http://localhost:3000/api/analysis/report/xxx

# Response: Full risk analysis report
```

---

## Rate Limiting

Currently no rate limiting is implemented. In production, consider adding:
- Request rate limits per IP
- File upload size/count limits
- Analysis creation limits per user

---

## Authentication

Currently no authentication is required (development mode). In production, implement:
- JWT tokens or session-based auth
- User registration/login
- Analysis ownership verification
- Row-level security in Supabase

---

## CORS

All endpoints support CORS with the following headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

In production, restrict `Access-Control-Allow-Origin` to your frontend domain.

---

## Testing

### Run API Tests
```bash
npm run test:api
```

### Manual Testing with cURL
All examples above use cURL for easy manual testing.

### Frontend Testing
Use the provided endpoints from your Next.js frontend components.

---

## Support

For issues or questions:
1. Check server logs in terminal
2. Review [DAY-5-PROGRESS.md](DAY-5-PROGRESS.md) for implementation details
3. Check database schema in [database-schema.sql](database-schema.sql)

---

**Last Updated**: 2025-11-11 (Day 5)
**API Version**: 1.0.0
**Status**: Production-ready backend ✅
