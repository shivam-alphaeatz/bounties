# AI Bounties Management System

A React TypeScript application for managing AI-generated bounties with Supabase integration and database storage.

## Features

- **AI Bounties Modal**: Fetch and manage AI-generated bounties by category
- **Approval/Rejection System**: Approve or reject bounties with optional rejection reasons
- **Database Integration**: Save bounty actions to Supabase database
- **Local Storage Fallback**: Data is saved locally if database connection fails
- **CSV Export**: Export bounty actions to CSV format
- **Category Management**: Fetch new bounties for specific categories
- **Database Testing**: Built-in tools to test database connection and table setup

## Database Setup

The app uses Supabase with the following table structure:

### bounty_selection_history table
```sql
CREATE TABLE bounty_selection_history (
  id SERIAL PRIMARY KEY,
  bucket_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  bounty TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### bounties table (main table)
- `id`: Primary key
- `name`: Bounty name
- `category`: Category name
- `weight`: Bounty weight (1-10)
- `expiry_days`: Days until expiry
- `submitted_at`: Submission timestamp

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Set up the database**:
   - Create the `bounty_selection_history` table using the SQL above
   - Create the `bounties` table for approved bounties
   - Set up appropriate RLS policies

4. **Start the development server**:
   ```bash
   npm start
   ```

## Usage

1. **Open the AI Bounties Modal**: Click the "AI Bounties" button in the main app
2. **Fetch Bounties**: The modal will automatically load bounties for all categories
3. **Review Bounties**: Browse through bounties organized by category
4. **Take Actions**:
   - **Approve**: Click "Approve" to accept a bounty
   - **Reject**: Click "Reject" to reject a bounty (you can add a reason)
   - **Add New**: Click "Add New" to fetch fresh bounties for a specific category
5. **Save Data**: Click "Save to Database" to save all actions to Supabase
6. **Export**: Use "Export to CSV" to download your data
7. **Submit Approved**: Use "Submit Approved to Main Table" to move approved bounties to the main bounties table

## API Integration

The app fetches AI-generated bounties from:
`https://nwfhqrmdjmjopbxulyhu.supabase.co/functions/v1/bountygen`

- Send `{"bucket_id": null}` to fetch all categories
- Send `{"bucket_id": categoryId}` to fetch specific category

## Category Mapping

- Bucket ID 1: Nourish
- Bucket ID 2: Rest
- Bucket ID 3: Active Life
- Bucket ID 4: Connect
- Bucket ID 5: Mindset
- Bucket ID 6: Explore

## Troubleshooting

### Database Issues
- Use the "Test DB" button to check database connection
- Check the browser console for detailed error messages
- Verify your Supabase credentials in the `.env` file
- Ensure the `bounty_selection_history` table exists

### General Issues
- Check the browser console for error messages
- Verify all environment variables are set correctly
- Ensure your Supabase project is properly configured

## File Structure

```
src/
├── components/
│   ├── AIBountiesModal.tsx      # Main modal component
│   ├── AIBountiesModal.css      # Modal styles
│   ├── BountiesTable.tsx        # Bounties display table
│   ├── BountyForm.tsx           # Bounty submission form
│   └── ...
├── services/
│   ├── bountyActionsService.ts  # Database operations
│   ├── googleSheetsService.ts   # Google Sheets integration (optional)
│   └── supabaseClient.ts        # Supabase client
├── utils/
│   └── databaseTest.ts          # Database testing utilities
└── ...
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

