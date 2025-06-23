# Google Sheets Integration Setup

This guide will help you set up direct integration with your Google Sheets so that bounty data is automatically written when you press the "Save to Database" button.

## Option 1: Google Apps Script (Recommended)

### Step 1: Create Google Apps Script
1. Go to [https://script.google.com/](https://script.google.com/)
2. Click "New project"
3. Replace the default code with the following:

```javascript
function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    const sheetId = data.sheetId;
    const rows = data.data;
    
    // Get the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    const sheet = spreadsheet.getActiveSheet();
    
    // Write the data to the sheet
    if (rows && rows.length > 0) {
      const range = sheet.getRange(1, 1, rows.length, rows[0].length);
      range.setValues(rows);
    }
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Data written successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Handle GET requests (for testing)
  return ContentService
    .createTextOutput(JSON.stringify({ 
      success: true, 
      message: 'Google Apps Script is running' 
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Step 2: Deploy the Script
1. Click "Deploy" > "New deployment"
2. Choose "Web app" as the type
3. Set "Execute as" to "Me"
4. Set "Who has access" to "Anyone"
5. Click "Deploy"
6. Copy the web app URL (it will look like: `https://script.google.com/macros/s/AKfycbz.../exec`)

### Step 3: Update the React App
1. Open `src/services/googleSheetsService.ts`
2. Replace the placeholder URL on line 73:
   ```typescript
   const webAppUrl = `YOUR_ACTUAL_WEB_APP_URL_HERE`;
   ```

## Option 2: Google Sheets API (Alternative)

If you prefer to use the Google Sheets API directly:

### Step 1: Enable Google Sheets API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Create credentials (API Key)
5. Add the API key to your `.env` file:
   ```
   REACT_APP_GOOGLE_SHEETS_API_KEY=your_api_key_here
   ```

### Step 2: Share Your Sheet
Make sure your Google Sheet is shared with the appropriate permissions for the API to write to it.

## Option 3: Manual Copy-Paste (Current Fallback)

The current implementation includes a fallback that:
1. Copies formatted data to your clipboard
2. Opens your Google Sheet in a new tab
3. Allows you to paste the data manually

This method works immediately without any setup.

## Testing the Integration

1. Open your React app
2. Load some AI bounties
3. Approve or reject some bounties
4. Click "Save to Database"
5. Check your Google Sheet to see if the data was added

## Troubleshooting

### If Google Apps Script doesn't work:
- Check that the web app URL is correct
- Verify the script is deployed as a web app
- Check the browser console for error messages

### If Google Sheets API doesn't work:
- Verify your API key is correct
- Check that the Google Sheets API is enabled
- Ensure your sheet has the correct permissions

### If manual copy-paste doesn't work:
- Check that your browser allows clipboard access
- Try refreshing the page and trying again

## Current Implementation

The app now tries multiple methods in order:
1. Google Apps Script (if configured)
2. Google Sheets API (if API key is provided)
3. Manual copy-paste (fallback)

This ensures that your data will always be saved to Google Sheets, even if some methods fail. 