# Vercel Deployment Guide

This guide explains how to deploy the AI Bounties app to Vercel and how it works without a traditional database.

## How It Works on Vercel

Since Vercel doesn't provide database functionality, this app is designed to work with:

1. **Google Sheets** - Primary data storage
2. **Local Storage** - Browser-based backup storage
3. **CSV Export** - Manual data export option

## Deployment Steps

### 1. Prepare Your Repository

1. Make sure your code is in a Git repository (GitHub, GitLab, etc.)
2. Ensure you have the following files:
   - `package.json`
   - `vercel.json` (optional, for custom configuration)

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with your Git provider
3. Click "New Project"
4. Import your repository
5. Configure your project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (or your project root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### 3. Environment Variables (Optional)

If you want to use Supabase as an optional backup (not required for Vercel):

```bash
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key
```

**Note**: These are optional. The app will work perfectly without them.

### 4. Deploy

Click "Deploy" and wait for the build to complete.

## How Data is Stored

### Primary Storage: Google Sheets
- All bounty actions are saved directly to your Google Sheet
- Your sheet: https://docs.google.com/spreadsheets/d/1cZWgH9Z_IqRFFCnicLlgvF_yr00G2lf4EloaJ_Jqxig/edit?usp=sharing
- Data is written automatically when you click "Save to Google Sheets"

### Backup Storage: Local Storage
- All data is also saved to your browser's local storage
- This persists between sessions on the same browser
- Works even if Google Sheets is unavailable

### Export Option: CSV
- Use the "Export to CSV" button to download your data
- Perfect for backup or analysis

## User Experience

### When You Approve/Reject Bounties
1. Action is immediately saved to local storage
2. No error messages (database is optional)
3. Data is safe and persistent

### When You Click "Save to Google Sheets"
1. **Success**: Data written directly to Google Sheets ✅
2. **Fallback**: Data copied to clipboard, sheet opens for manual pasting 📋
3. **Final Fallback**: Data saved locally with export option 💾

### When You Submit Approved Bounties
1. Data is sent to Google Sheets
2. Approved bounties are removed from the list
3. Clean, organized workflow

## Benefits of This Approach

✅ **No Database Required** - Works perfectly on Vercel
✅ **Real-time Collaboration** - Google Sheets can be shared with team
✅ **Data Safety** - Multiple backup methods
✅ **Easy Export** - CSV download for analysis
✅ **No Setup Complexity** - Just deploy and use

## Troubleshooting

### If Google Sheets Integration Fails
- Check that your Google Apps Script is deployed correctly
- Verify the web app URL in `src/services/googleSheetsService.ts`
- Use the clipboard fallback method

### If Local Storage is Full
- Export your data to CSV
- Clear browser data for the site
- Start fresh

### If You Need Database Functionality
- Set up a separate Supabase project
- Add environment variables to Vercel
- The app will use both Google Sheets and database

## Customization

### Change Google Sheet
1. Update `SHEET_URL` and `SHEET_ID` in `src/services/googleSheetsService.ts`
2. Deploy your Google Apps Script to the new sheet
3. Update the web app URL

### Add More Export Options
- Modify `src/services/googleSheetsService.ts`
- Add new export formats
- Update the UI accordingly

## Performance

- **Fast Loading** - No database queries on page load
- **Offline Capable** - Works without internet (local storage)
- **Scalable** - Google Sheets handles large datasets
- **Cost Effective** - No database hosting costs

This approach makes the app perfect for Vercel hosting while maintaining all functionality! 