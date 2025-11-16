# MTB Trail Finder

A Next.js application for finding mountain biking trails and joining events based on your expertise level.

## Features

- 🔍 **Search Trails**: Search and filter trails by name, difficulty, and location
- 📅 **Events**: View events categorized by expertise level (beginner, intermediate, advanced, expert)
- ➕ **Create Events**: Create new events with expertise-based filtering
- 👥 **Join Events**: Join events that match your skill level
- 🗄️ **Local PostgreSQL**: Uses local PostgreSQL database (no Supabase)

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL installed and running locally

## Setup

1. **Install dependencies:**
   ```bash
   yarn install
   # or
   npm install
   ```

2. **Set up PostgreSQL database:**
   ```bash
   # Create the database
   createdb mtb_trail_finder
   # or using psql
   psql -U postgres -c "CREATE DATABASE mtb_trail_finder;"
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your PostgreSQL credentials:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=mtb_trail_finder
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

4. **Run database migrations:**
   ```bash
   yarn db:migrate
   # or
   npm run db:migrate
   ```

5. **Seed the database with sample trails (optional):**
   ```bash
   yarn db:seed
   # or
   npm run db:seed
   ```

   This will add 50 trails in Kathmandu Valley with varying difficulty levels (easy, medium, hard).

6. **Start the development server:**
   ```bash
   yarn dev
   # or
   npm run dev
   ```

7. **Open [http://localhost:3000](http://localhost:3000)** in your browser.

## Database Schema

The application uses the following main tables:

- **trails**: Stores trail information (name, difficulty, location, etc.)
- **events**: Stores event information with required expertise level
- **event_participants**: Tracks participants for each event

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── events/       # Events pages
│   │   ├── trails/       # Trails search page
│   │   └── layout.tsx    # Root layout
│   ├── lib/
│   │   └── db.ts         # Database connection
│   └── types/
│       └── index.ts      # TypeScript types
├── database/
│   └── migrations/       # Database migrations
└── scripts/
    ├── migrate.js        # Migration script
    └── seed-trails.js    # Seed script for sample trails
```

## API Routes

- `GET /api/trails` - Search trails (query params: search, difficulty, location)
- `GET /api/events` - List events (query params: expertise, upcoming)
- `POST /api/events` - Create a new event
- `POST /api/events/[id]/join` - Join an event

## Technologies

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **Tailwind CSS** - Styling
- **date-fns** - Date formatting

