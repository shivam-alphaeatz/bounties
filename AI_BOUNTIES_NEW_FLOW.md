# AI Bounties - New Flow Implementation

This document describes the new AI Bounties system that follows a status-based workflow for managing AI-generated bounties.

## Flow Overview

```
A[AI Generation Function (runs independently)] --> B[Insert into bounty_selection_history (status: pending)]
B --> C[UI fetches all PENDING bounties < 24h]
C --> D{Admin Reviews}

D -->|Approve| E[Update status = 'approved']
D -->|Reject| F[Update status = 'rejected']

E --> G[Click Submit Approved]
G --> H[Insert into bounties]
G --> I[Update history to 'finalized']
G --> J[Clear UI state]

B --> K[Background Cleanup: Delete old pending]
```

## Database Schema

### bounty_selection_history Table

```sql
CREATE TABLE bounty_selection_history (
    id SERIAL PRIMARY KEY,
    bucket_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    bounty TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('pending', 'approved', 'rejected', 'finalized')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    type TEXT DEFAULT 'daily',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Status Flow:**
- `pending` - Initial state when AI generates bounties
- `approved` - Admin approves the bounty
- `rejected` - Admin rejects the bounty (with optional notes)
- `finalized` - Bounty has been submitted to main bounties table

## Features

### 1. AI Bounties Tab
- **Location**: New tab in the main application
- **Purpose**: Manage AI-generated bounties with status-based workflow
- **Access**: Click "AI Bounties" tab in the main navigation

### 2. Status Management
- **Pending**: Bounties awaiting admin review
- **Approved**: Bounties approved by admin
- **Rejected**: Bounties rejected by admin (with optional notes)
- **Finalized**: Bounties submitted to main bounties table

### 3. Admin Actions
- **Approve**: Mark bounty as approved (moves to approved status)
- **Reject**: Mark bounty as rejected with optional notes
- **Submit Approved**: Move all approved bounties to main table and mark as finalized
- **Cleanup**: Remove old pending bounties (>24h)

### 4. Statistics Dashboard
- Real-time counts for each status
- Visual cards showing pending, approved, rejected, and finalized counts
- Filter dropdown to view bounties by status

### 5. Bounty Generation (Testing)
- **Generate New Bounties**: Creates sample bounties for testing
- **Categories**: Nourish, Rest, Active Life, Connect, Mindset, Explore
- **Types**: Daily, Weekly, Yearly

## How to Use

### Step 1: Generate Bounties
1. Navigate to the "AI Bounties" tab
2. Click "Generate New Bounties" to create sample bounties
3. Bounties will appear with "Pending" status

### Step 2: Review and Approve/Reject
1. Review pending bounties in the list
2. Click "Approve" to approve a bounty
3. Click "Reject" to reject a bounty (optional notes can be added)

### Step 3: Submit Approved Bounties
1. Once you have approved bounties, click "Submit Approved"
2. Approved bounties will be moved to the main bounties table
3. Status will change to "Finalized"

### Step 4: Cleanup (Optional)
1. Click "Cleanup Old Pending" to remove pending bounties older than 24 hours

## API Endpoints

### AIBountiesService Methods

```typescript
// Insert pending bounties
AIBountiesService.insertPendingBounties(bounties: PendingBounty[])

// Get pending bounties (< 24h)
AIBountiesService.getPendingBounties()

// Approve bounty
AIBountiesService.approveBounty(bountyId: number, notes?: string)

// Reject bounty
AIBountiesService.rejectBounty(bountyId: number, notes?: string)

// Submit approved bounties to main table
AIBountiesService.submitApprovedBounties()

// Finalize approved bounties
AIBountiesService.finalizeApprovedBounties()

// Cleanup old pending bounties
AIBountiesService.cleanupOldPendingBounties()

// Get all bounties
AIBountiesService.getAllBounties()

// Get bounties by status
AIBountiesService.getBountiesByStatus(status)

// Get bounty counts
AIBountiesService.getBountyCounts()
```

### AIBountyGenerator Methods

```typescript
// Generate bounties for all categories
AIBountyGenerator.generateAllCategoriesBounties(type, countPerCategory)

// Generate bounties for specific category
AIBountyGenerator.generateCategoryBounties(categoryId, type, count)

// Get available categories
AIBountyGenerator.getAvailableCategories()
```

## Database Setup

Run the updated `database_setup.sql` script to create the new `bounty_selection_history` table:

```bash
# In your Supabase SQL editor, run:
# Copy and paste the contents of database_setup.sql
```

## File Structure

```
src/
├── components/
│   ├── AIBountiesTab.tsx      # Main AI Bounties tab component
│   └── AIBountiesTab.css      # Styles for AI Bounties tab
├── services/
│   └── aiBountiesService.ts   # Service for AI bounties operations
├── utils/
│   └── aiBountyGenerator.ts   # AI bounty generation utility
└── App.tsx                    # Updated with AI Bounties tab
```

## Status Transitions

1. **pending** → **approved** (Admin approves)
2. **pending** → **rejected** (Admin rejects)
3. **approved** → **finalized** (Submit to main table)

## Benefits of New Flow

1. **Clear Status Tracking**: Each bounty has a clear status in the workflow
2. **No Duplicate Submissions**: Finalized bounties are removed from the review list
3. **Audit Trail**: Complete history of all bounty actions
4. **Batch Processing**: Submit multiple approved bounties at once
5. **Automatic Cleanup**: Old pending bounties are automatically cleaned up
6. **Better UX**: Tab-based interface instead of modal
7. **Real-time Statistics**: Live counts of bounties by status

## Testing

1. **Generate Test Data**: Use "Generate New Bounties" button
2. **Test Approval Flow**: Approve some bounties and submit them
3. **Test Rejection Flow**: Reject bounties with and without notes
4. **Test Cleanup**: Wait for bounties to age or use cleanup button
5. **Verify Main Table**: Check that submitted bounties appear in main bounties table

## Error Handling

- Network errors show retry options
- Database errors are logged and displayed to user
- Graceful degradation when services are unavailable
- User-friendly error messages

## Future Enhancements

- Direct AI API integration
- Batch approve/reject functionality
- Advanced filtering and search
- Export functionality
- User authentication and permissions
- Analytics dashboard
- Email notifications for new bounties 