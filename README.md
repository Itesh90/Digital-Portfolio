# Digital Portfolio Builder

AI-powered portfolio generator that transforms your resume into a stunning professional portfolio website.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend**: Supabase (Auth, Database, Edge Functions, Storage)
- **AI**: Google Gemini for content generation

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Itesh90/Digital-Portfolio.git
   cd Digital-Portfolio
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Add your Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Run development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── frontend/           # Next.js application
│   ├── app/           # App router pages
│   ├── components/    # React components
│   ├── lib/           # Supabase client & utilities
│   └── types/         # TypeScript definitions
│
└── supabase/          # Supabase configuration
    ├── schema.sql     # Database schema & RLS
    └── functions/     # Edge Functions (AI processing)
```

## Deployment

- **Frontend**: Deploy to Vercel
- **Backend**: Supabase (managed)

## License

MIT
