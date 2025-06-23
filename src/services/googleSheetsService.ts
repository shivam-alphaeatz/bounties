export interface BountySheetData {
  name: string;
  category: string;
  weight: number;
  expiry_days: number;
  submitted_at: string;
}

export interface BountyActionSheetData {
  bucket_id: number;
  category: string;
  bounty: string;
  action: 'approved' | 'rejected';
  timestamp: string;
  rejection_reason?: string;
}

export class GoogleSheetsService {
  // Google Sheets configuration from environment variables
  private static readonly SHEET_URL = process.env.REACT_APP_GOOGLE_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1cZWgH9Z_IqRFFCnicLlgvF_yr00G2lf4EloaJ_Jqxig/edit?usp=sharing';
  private static readonly SHEET_ID = process.env.REACT_APP_GOOGLE_SHEET_ID || '1cZWgH9Z_IqRFFCnicLlgvF_yr00G2lf4EloaJ_Jqxig';
  private static readonly GOOGLE_APPS_SCRIPT_URL = process.env.REACT_APP_GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzArXxUKxK9kK-7vQriO9L5265Pf4neJLDtXlBh-6x6KtYXSq89xRZZAuVOYydpM7Eu/exec';
  
  static async submitBountiesToSheet(bounties: BountySheetData[]): Promise<void> {
    try {
      // Prepare the data for Google Sheets
      const sheetData = [
        ['Bounty Name', 'Category', 'Weight', 'Expiry Days', 'Submitted At'],
        ...bounties.map(bounty => [
          bounty.name,
          bounty.category,
          bounty.weight.toString(),
          bounty.expiry_days.toString(),
          bounty.submitted_at
        ])
      ];

      // For now, we'll use a simple approach to prepare the data
      // In a production environment, you would use the Google Sheets API
      console.log('Data prepared for Google Sheets:', sheetData);
      
      // You can implement the actual Google Sheets API integration here
      // For now, we'll create a downloadable CSV that can be imported to Google Sheets
      this.downloadCSVForSheets(sheetData);
      
    } catch (error) {
      console.error('Failed to submit to Google Sheets:', error);
      throw error;
    }
  }

  static async submitBountyActionsToSheet(actions: BountyActionSheetData[]): Promise<void> {
    try {
      // Prepare the data for Google Sheets
      const sheetData = [
        ['Bucket ID', 'Category', 'Bounty', 'Action', 'Timestamp', 'Rejection Reason'],
        ...actions.map(action => [
          action.bucket_id.toString(),
          action.category,
          action.bounty,
          action.action,
          action.timestamp,
          action.rejection_reason || ''
        ])
      ];

      console.log('Submitting bounty actions to Google Sheets:', sheetData);
      
      // Try to use Google Sheets API if available
      await this.writeToGoogleSheets(sheetData);
      
    } catch (error) {
      console.error('Failed to submit bounty actions to Google Sheets:', error);
      // Fallback to clipboard copy
      await this.copyBountyActionsToClipboard(actions);
      throw error;
    }
  }

  private static async writeToGoogleSheets(data: string[][]): Promise<void> {
    try {
      // Method 1: Try using Google Apps Script web app
      const webAppUrl = this.GOOGLE_APPS_SCRIPT_URL;
      
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetId: this.SHEET_ID,
          data: data
        }),
      });

      if (response.ok) {
        console.log('Successfully wrote to Google Sheets via Apps Script');
        return;
      }
    } catch (error) {
      console.log('Apps Script method failed, trying alternative approach');
    }

    // Method 2: Use Google Sheets API directly (requires API key)
    try {
      const apiKey = process.env.REACT_APP_GOOGLE_SHEETS_API_KEY;
      if (apiKey) {
        const range = 'Sheet1!A:F';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/${range}?valueInputOption=RAW&key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: data
          }),
        });

        if (response.ok) {
          console.log('Successfully wrote to Google Sheets via API');
          return;
        }
      }
    } catch (error) {
      console.log('Google Sheets API method failed');
    }

    // Method 3: Fallback - copy to clipboard and open sheet
    console.log('Falling back to clipboard copy method');
    // Remove headers for clipboard copy (only copy data rows)
    const dataRows = data.slice(1); // Skip the header row
    const formattedData = this.formatDataForCopyPaste(dataRows);
    await navigator.clipboard.writeText(formattedData);
    
    // Open the sheet for manual pasting
    this.openSheetInNewTab();
    
    throw new Error('Please paste the copied data into the Google Sheet manually');
  }

  private static formatDataForCopyPaste(data: string[][]): string {
    return data
      .map(row => row.join('\t'))
      .join('\n');
  }

  static downloadCSVForSheets(data: string[][]): void {
    const csvContent = data.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bounties_for_sheets_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  static getSheetUrl(): string {
    return this.SHEET_URL;
  }

  static openSheetInNewTab(): void {
    window.open(this.SHEET_URL, '_blank');
  }

  // Method to prepare data for manual copy-paste to Google Sheets
  static getFormattedDataForCopyPaste(bounties: BountySheetData[]): string {
    const headers = ['Bounty Name', 'Category', 'Weight', 'Expiry Days', 'Submitted At'];
    const rows = bounties.map(bounty => [
      bounty.name,
      bounty.category,
      bounty.weight.toString(),
      bounty.expiry_days.toString(),
      bounty.submitted_at
    ]);

    return [headers, ...rows]
      .map(row => row.join('\t'))
      .join('\n');
  }

  // Method to copy data to clipboard
  static async copyToClipboard(bounties: BountySheetData[]): Promise<boolean> {
    try {
      const formattedData = this.getFormattedDataForCopyPaste(bounties);
      await navigator.clipboard.writeText(formattedData);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  // Method to copy bounty actions to clipboard (without headers)
  static async copyBountyActionsToClipboard(actions: BountyActionSheetData[]): Promise<boolean> {
    try {
      const rows = actions.map(action => [
        action.bucket_id.toString(),
        action.category,
        action.bounty,
        action.action,
        action.timestamp,
        action.rejection_reason || ''
      ]);

      const formattedData = rows
        .map(row => row.join('\t'))
        .join('\n');

      await navigator.clipboard.writeText(formattedData);
      return true;
    } catch (error) {
      console.error('Failed to copy bounty actions to clipboard:', error);
      return false;
    }
  }
} 