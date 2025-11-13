# Google Document AI Setup Guide

## Why Document AI?

Google Document AI is specifically designed for processing scanned documents and PDFs with OCR. Unlike Vision API which works with individual images, Document AI can:
- Accept PDF files directly (no conversion needed)
- Process multi-page documents
- Provide better OCR accuracy for Korean text in structured documents

## Setup Steps

### 1. Create or Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Note your **Project ID** (not the project name)

### 2. Enable Document AI API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Document AI API"
3. Click **Enable**

### 3. Create a Document AI Processor

1. Go to **Document AI** in the Google Cloud Console
2. Click **Create Processor**
3. Select **Document OCR** processor type
4. Choose region: **us** (United States) or **eu** (Europe)
5. Give it a name like "jeonse-ocr-processor"
6. Click **Create**
7. Note the **Processor ID** (it looks like: `abc123def456`)

### 4. Set up Authentication

You have two options:

#### Option A: Use API Key (Simpler, Currently Set)
Your existing `GOOGLE_VISION_API_KEY` should work if it has Document AI API enabled.

#### Option B: Use Service Account (More Secure, Recommended for Production)
1. Go to **IAM & Admin** > **Service Accounts**
2. Create a service account with "Document AI API User" role
3. Create and download a JSON key file
4. Save it to `./credentials/google-documentai.json`

### 5. Update Environment Variables

Add these to your `.env.local` file:

```bash
# Google Cloud Project Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
DOCUMENT_AI_PROCESSOR_ID=your-processor-id-here
DOCUMENT_AI_LOCATION=us  # or 'eu' depending on where you created the processor

# Optional: If using service account instead of API key
# GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-documentai.json
```

### 6. Test the Setup

1. Restart your dev server: `npm run dev`
2. Upload your 등기부등본 PDF
3. Check the server logs for "Using Google Document AI for OCR"

## Expected Results

Once properly configured, you should see in the server logs:

```
Attempting simple text extraction from PDF...
PDF appears to be image-based, trying Document AI OCR...
Using Google Document AI for OCR (sending PDF directly)...
Document AI OCR extraction successful: [number] characters
```

## Pricing

Document AI pricing (as of 2024):
- First 1,000 pages per month: **FREE**
- After that: ~$1.50 per 1,000 pages

For development and testing with small volumes, the free tier should be sufficient.

## Troubleshooting

### Error: "Google Document AI credentials not configured"
- Make sure `GOOGLE_VISION_API_KEY` is set in `.env.local`

### Error: "Permission denied" or "API not enabled"
- Enable Document AI API in Google Cloud Console
- Make sure your API key or service account has Document AI permissions

### Error: "Processor not found"
- Double-check your `GOOGLE_CLOUD_PROJECT_ID` and `DOCUMENT_AI_PROCESSOR_ID`
- Make sure the processor location matches `DOCUMENT_AI_LOCATION`

### Still getting mock data?
- Check server logs for specific error messages
- Verify the processor is in the correct location (us/eu)
- Ensure billing is enabled on your Google Cloud project (required for API usage)

## Alternative: Continue with Mock Data

If Document AI setup is complex for now, the application will continue to use mock data for testing the UI and workflow. You can set up real OCR later without affecting other features.
