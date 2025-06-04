# Bounty Tracker

A React application that connects to a Supabase database to display bounties and their associated categories.

## Features

- View all bounties in a table format
- View bounties with their associated categories
- Responsive design for all screen sizes

## Technologies Used

- React
- TypeScript
- Supabase (for database)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```

## Project Structure

- `src/components/BountiesTable.tsx` - Component to display the bounties table
- `src/components/BountyBucketWeightTable.tsx` - Component to display bounties with their categories
- `src/supabaseClient.ts` - Supabase client configuration

## Database Schema

The application connects to a Supabase database with the following tables:

### bounties
- id (primary key)
- date
- bounty
- Duration
- created_at

### bountyBucketWeight
- id (primary key)
- bountyId (foreign key to bounties.id)
- bucketId (maps to categories)
- created_at

## License

This project is licensed under the MIT License.
