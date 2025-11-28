# Setting Up Document AI Form Parser

Follow these steps to create and configure the Form Parser processor.

## Option 1: Google Cloud Console (Recommended - Visual)

### 1. Navigate to Document AI
```
https://console.cloud.google.com/ai/document-ai/processors
```

### 2. Create New Processor
1. Click **"CREATE PROCESSOR"** button
2. In the processor type list, find and select:
   - **"Form Parser"**
   - Description: "Extract text, layout, and structural information from documents"
3. Configure:
   - **Processor name**: `deunggibu-form-parser`
   - **Region**: `us` (United States) - recommended for best performance
   - Or choose `eu` if you prefer European region
4. Click **"CREATE"**

### 3. Copy Processor ID
After creation, you'll see:
```
Processor ID: 1234567890abcdef  ← Copy this!
```

The full processor name will be:
```
projects/jeonse-safety-checker/locations/us/processors/1234567890abcdef
```

### 4. Update Environment Variables
Open `.env.local` and update:
```bash
# Replace with your new Form Parser processor ID
DOCUMENT_AI_PROCESSOR_ID=1234567890abcdef
```

## Option 2: gcloud CLI (Advanced)

### Prerequisites
```bash
# Install gcloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set project
gcloud config set project jeonse-safety-checker
```

### Create Processor
```bash
# Create Form Parser processor
gcloud documentai processors create \
  --type=FORM_PARSER_PROCESSOR \
  --display-name="deunggibu-form-parser" \
  --location=us

# Expected output:
# Created processor [projects/jeonse-safety-checker/locations/us/processors/1234567890abcdef]
# Processor ID: 1234567890abcdef
```

### List Processors (verify creation)
```bash
gcloud documentai processors list --location=us

# Output should show:
# NAME: deunggibu-form-parser
# TYPE: FORM_PARSER_PROCESSOR
# STATE: ENABLED
```

### Update Environment
```bash
# Copy the processor ID and update .env.local
echo "DOCUMENT_AI_PROCESSOR_ID=1234567890abcdef" >> .env.local
```

## Verify Setup

### Test Processor
Run this command to verify the processor is working:
```bash
# We'll create a test script for this
npx tsx scripts/test-form-parser.ts
```

## Next Steps

Once the processor is created and environment variables are updated:
1. Restart the dev server to pick up new env vars
2. Run the test script to verify it works
3. Compare results with current OCR system
4. Gradually migrate to Form Parser

## Troubleshooting

### Error: "Permission Denied"
Ensure your service account has the role:
- `roles/documentai.apiUser`

Fix:
```bash
gcloud projects add-iam-policy-binding jeonse-safety-checker \
  --member="serviceAccount:your-service-account@jeonse-safety-checker.iam.gserviceaccount.com" \
  --role="roles/documentai.apiUser"
```

### Error: "Processor not found"
Double-check:
1. Processor ID in .env.local matches the one created
2. Project ID is correct
3. Region matches (us vs eu)

### Error: "Invalid processor type"
Make sure you selected **"Form Parser"** not:
- Document OCR (generic)
- Invoice Parser
- Receipt Parser

The type must be exactly: `FORM_PARSER_PROCESSOR`
