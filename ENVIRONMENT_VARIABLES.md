# Environment Variables for AI Bounties Project

## 🔑 **All Environment Variables Required**

Add these environment variables to your Vercel project settings:

### **Supabase Configuration**
```env
REACT_APP_SUPABASE_URL=https://nwfhqrmdjmjopbxulyhu.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Zmhxcm1kam1qb3BieHVseWh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI2NzkwMywiZXhwIjoyMDYxODQzOTAzfQ.QjKCJFJaJM1E3PKa22wJ2yvptXBLmYw-u4QF7fS0sfs
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Zmhxcm1kam1qb3BieHVseWh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjI2NzkwMywiZXhwIjoyMDYxODQzOTAzfQ.QjKCJFJaJM1E3PKa22wJ2yvptXBLmYw-u4QF7fS0sfs
```

### **Supabase Edge Function**
```env
REACT_APP_SUPABASE_EDGE_FUNCTION_URL=https://nwfhqrmdjmjopbxulyhu.supabase.co/functions/v1/bountygen
```

### **Google Sheets Configuration**
```env
REACT_APP_GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key_here
REACT_APP_GOOGLE_SHEET_ID=1cZWgH9Z_IqRFFCnicLlgvF_yr00G2lf4EloaJ_Jqxig
REACT_APP_GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/1cZWgH9Z_IqRFFCnicLlgvF_yr00G2lf4EloaJ_Jqxig/edit?usp=sharing
REACT_APP_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbzArXxUKxK9kK-7vQriO9L5265Pf4neJLDtXlBh-6x6KtYXSq89xRZZAuVOYydpM7Eu/exec
```

## 📋 **How to Add Environment Variables to Vercel**

1. **Go to your Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign in to your account
   - Select your AI Bounties project

2. **Navigate to Settings**
   - Click on your project
   - Go to the "Settings" tab
   - Click on "Environment Variables" in the left sidebar

3. **Add Each Variable**
   - Click "Add New"
   - Enter the variable name (e.g., `REACT_APP_SUPABASE_URL`)
   - Enter the value
   - Select "Production" and "Preview" environments
   - Click "Save"

4. **Redeploy Your Project**
   - After adding all variables, go to "Deployments"
   - Click "Redeploy" on your latest deployment

## 🔧 **What Each Variable Does**

### **Supabase Variables**
- `REACT_APP_SUPABASE_URL`: Your Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY`: Public anonymous key for client-side operations
- `REACT_APP_SUPABASE_SERVICE_ROLE_KEY`: Service role key for server-side operations (if needed)
- `REACT_APP_SUPABASE_EDGE_FUNCTION_URL`: URL for the bounty generation Edge Function

### **Google Sheets Variables**
- `REACT_APP_GOOGLE_SHEETS_API_KEY`: API key for Google Sheets API access
- `REACT_APP_GOOGLE_SHEET_ID`: ID of your Google Sheet
- `REACT_APP_GOOGLE_SHEET_URL`: Full URL to your Google Sheet
- `REACT_APP_GOOGLE_APPS_SCRIPT_URL`: URL of your Google Apps Script web app

## ⚠️ **Important Notes**

1. **All variables must start with `REACT_APP_`** - This is required for Create React App to expose them to the client-side code.

2. **Fallback Values** - The code includes fallback values for all hardcoded URLs, so if you don't set an environment variable, it will use the current hardcoded value.

3. **Security** - Never commit these values to your repository. They are now properly externalized.

4. **Google Sheets API Key** - You'll need to get this from Google Cloud Console if you want to use the Google Sheets API directly.

## 🚀 **After Setup**

Once you've added all environment variables to Vercel:

1. Your app will use the environment variables instead of hardcoded values
2. You can easily change any configuration by updating the environment variables in Vercel
3. Your sensitive keys are no longer exposed in your code
4. The app will work the same way but with better security and flexibility

## 📝 **Files Updated**

The following files have been updated to use environment variables:

- `src/supabaseClient.ts` - Supabase URL and key
- `src/components/AIBountiesModal.tsx` - Edge Function URL
- `src/services/googleSheetsService.ts` - Google Sheets URLs and IDs 