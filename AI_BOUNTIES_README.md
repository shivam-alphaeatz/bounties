# AI Bounties Feature

This feature allows users to review and approve/reject AI-generated bounties from different categories. The system fetches bounties from an external API and provides a user-friendly interface for managing them.

## Features

- **AI Bounties Button**: Located in the header, opens a modal with AI-generated bounties
- **Category-based Display**: Bounties are organized by categories (Nourish, Rest, Active Life, Connect, Mindset, Explore)
- **Initial Load**: Fetches all categories with `{"id": null}` on first load
- **Category-specific Fetching**: "Add New" button for each category fetches bounties for that specific category
- **Approve/Reject Actions**: Users can approve or reject individual bounties
- **Rejection Reasons**: Optional notes/reasons can be added when rejecting bounties
- **Get More Bounties**: When a category has no available bounties, users can fetch new ones
- **Data Persistence**: Actions are saved to both Supabase database and localStorage
- **Export Functionality**: Export all actions to CSV format (includes rejection reasons)
- **Real-time Summary**: Shows count of approved and rejected bounties
- **Submit to Main Table**: Submit approved bounties to the main bounties table with configurable weight and expiry
- **Google Sheets Integration**: Data is automatically copied to clipboard for easy pasting into Google Sheets

## Setup Instructions

### 1. Database Setup

Run the SQL script in `database_setup.sql` in your Supabase SQL editor to create the required table:

```sql
-- Execute the contents of database_setup.sql in your Supabase SQL editor
```

### 2. API Configuration

The feature uses the following API endpoint:
- **URL**: `https://alphaeatz.app.n8n.cloud/webhook-test/cdcb24a8-d6de-498b-a365-0e2939f1dcd1`
- **Method**: POST
- **Initial Body**: `{"id": null}` (fetches all categories)
- **Category-specific Body**: `{"id": 1}` (fetches bounties for category ID 1)

### 3. Google Sheets Integration

The feature integrates with your Google Sheets:
- **Sheet URL**: [https://docs.google.com/spreadsheets/d/1cZWgH9Z_IqRFFCnicLlgvF_yr00G2lf4EloaJ_Jqxig/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1cZWgH9Z_IqRFFCnicLlgvF_yr00G2lf4EloaJ_Jqxig/edit?usp=sharing)
- **Data Format**: Bounty Name, Category, Weight, Expiry Days, Submitted At
- **Integration Method**: Data is copied to clipboard for easy pasting

### 4. Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Click the "AI Bounties" button in the header to open the modal

## How It Works

### 1. Initial Bounty Fetching
- When the modal opens, it automatically fetches bounties from all categories using `{"id": null}`
- Bounties are grouped by category (bucket_id)
- Each category shows available bounties with approve/reject buttons

### 2. Category-specific Fetching
- **"Add New" button**: Located next to each category header
- **Category-specific API call**: Sends `{"id": bucket_id}` to get new bounties for that specific category
- **Targeted loading**: Only fetches bounties for the selected category

### 3. Managing Bounties
- **Approve**: Marks a bounty as approved and removes it from the list
- **Reject**: Opens a rejection modal to add optional reason/notes
- **Get More Bounties**: Available when a category has no remaining bounties

### 4. Rejection Reasons
- **Rejection Modal**: Opens when clicking "Reject" button
- **Optional Notes**: Users can add reasons or notes for rejection
- **Data Storage**: Rejection reasons are stored in the database and included in CSV exports
- **Cancel Option**: Users can cancel rejection and return to bounty list

### 5. Data Storage
- Actions are immediately saved to Supabase database
- Fallback to localStorage if database save fails
- All actions include timestamp, category, and rejection reason (if applicable)

### 6. Submit to Main Table
- **Submit Approved to Main Table**: Button appears when there are approved bounties
- **Configurable Settings**: Set weight (1-10) and expiry days (1-30) for each bounty
- **Default Values**: Weight = 1, Expiry = 1 day
- **Google Sheets Integration**: Data is copied to clipboard for easy pasting
- **Database Insertion**: Bounties are added to the main bounties table

### 7. Export
- Export all actions to CSV format
- CSV includes: Bucket ID, Category, Bounty, Action, Timestamp, Rejection Reason

## File Structure

```
src/
├── components/
│   ├── AIBountiesModal.tsx      # Main modal component with rejection modal
│   └── AIBountiesModal.css      # Modal styles including rejection modal
├── services/
│   ├── bountyActionsService.ts  # Database and storage service
│   └── googleSheetsService.ts   # Google Sheets integration
└── App.tsx                      # Updated with AI Bounties button
```

## API Response Format

The API returns an array of bounty objects:

```json
[
  {
    "bucket_id": 1,
    "prompt": "...",
    "bounties": [
      "Enjoy a small handful of almonds as a snack today.",
      "Include spinach in your lunchtime salad today.",
      "Drink a glass of unsweetened iced tea today."
    ]
  }
]
```

## Category Mapping

- `1` → Nourish
- `2` → Rest  
- `3` → Active Life
- `4` → Connect
- `5` → Mindset
- `6` → Explore

## Submit Process

1. **Approve Bounties**: Click approve on desired bounties
2. **Submit Button**: Click "Submit Approved to Main Table"
3. **Configure Settings**: Adjust weight and expiry for each bounty
4. **Google Sheets**: Click "Open Google Sheets" to open the sheet
5. **Paste Data**: Use Ctrl+V to paste the copied data
6. **Submit**: Click "Submit X Bounties" to add to main table

## Rejection Process

1. **Click Reject**: Click reject button on a bounty
2. **Rejection Modal**: Modal opens with bounty details
3. **Add Reason**: Optionally enter rejection reason or notes
4. **Confirm**: Click "Confirm Rejection" to save
5. **Cancel**: Click "Cancel" to return without rejecting

## Error Handling

- Network errors show retry button
- Database errors fallback to localStorage
- User-friendly error messages
- Graceful degradation

## Future Enhancements

- Direct Google Sheets API integration
- Batch approve/reject functionality
- Filtering by category or date
- Search functionality
- Bulk export options
- User authentication and permissions
- Analytics dashboard for bounty performance
- Rejection reason templates 