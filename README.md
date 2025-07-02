# Bounties Management System

A comprehensive React TypeScript application for managing bounties with AI-powered generation, approval workflows, and database integration.

## Features

### Core Functionality
- **Bounty Management**: Create, edit, and manage bounties with categories and weights
- **AI Bounty Generation**: Automated bounty generation using AI prompts
- **Approval Workflow**: Review and approve/reject AI-generated bounties
- **Database Integration**: Full CRUD operations with Supabase
- **Google Sheets Integration**: Export bounty data to Google Sheets

### AI Bounties System
- **Status-based Workflow**: Pending → Approved/Rejected → Finalized
- **Category Management**: Organize bounties by different life areas
- **Type Support**: Daily, weekly, and yearly bounty types
- **Bulk Operations**: Generate bounties for all categories at once
- **Cleanup Functionality**: Remove old pending bounties (24h+) automatically

### JSON Prompt Management
- **Dynamic JSON Editor**: Key-value pair interface for editing JSON prompts
- **Real-time Preview**: See JSON structure as you type
- **Validation**: Automatic JSON validation with visual feedback
- **CRUD Operations**: Full create, read, update, delete functionality

## Database Schema

### Main Tables
- `bounties`: Main bounties table
- `bountyBucketWeight`: Category weights for bounties
- `bounty_selection_history`: AI bounty workflow tracking
- `all_bounty_prompts`: JSON prompts for AI generation

### AI Bounties Flow
```
AI Generation → Pending Status → Admin Review → Approved/Rejected → Finalized
```

## Usage

### AI Bounties Management
1. **Generate Bounties**: Click "Generate All Categories" to create new AI bounties
2. **Review & Approve**: Review pending bounties and approve/reject them
3. **Submit to Main Table**: Submit approved bounties to the main bounties table
4. **Cleanup Old Pending**: Remove bounties older than 24 hours using the cleanup button

### Cleanup Functionality
- **Smart Cleanup Options**: Dropdown menu with two cleanup options
  - **Cleanup Old Pending**: Removes pending bounties older than 24 hours
  - **Cleanup All Pending**: Removes all pending bounties regardless of age
- **Real-time Counts**: Shows current pending bounty counts (total, old, recent)
- **Confirmation Dialogs**: Safe cleanup with detailed confirmation messages
- **Automatic Refresh**: Data refreshes automatically after cleanup operations

### JSON Prompt Management
1. **View Prompts**: Browse all JSON prompts in the Bounty Prompts tab
2. **Edit Prompts**: Use the key-value interface to modify JSON structure
3. **Add Fields**: Dynamically add new key-value pairs
4. **Preview JSON**: See the formatted JSON output in real-time

## API Integration

### Supabase Edge Functions
- **Bounty Generation**: `/functions/v1/bountygen` - Generate AI bounties
- **Bounties to Submit**: `/functions/v1/bounties_to_be_submitted` - Get approved bounties

### Environment Variables
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_SUPABASE_EDGE_FUNCTION_URL=your_edge_function_url
```

## Development

### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase account and project

### Installation
```bash
npm install
npm start
```

### Database Setup
Run the SQL scripts in `database_setup.sql` to create the required tables and indexes.

## Architecture

### Components
- `AIBountiesModal`: Main AI bounties management interface
- `AIBountiesTab`: Alternative AI bounties interface
- `BountyPromptsTable`: JSON prompt management
- `BountiesTable`: Main bounties display and management

### Services
- `AIBountiesService`: AI bounty operations and cleanup
- `BountyActionsService`: Bounty action management
- `GoogleSheetsService`: Google Sheets integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

