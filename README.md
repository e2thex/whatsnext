# Task Management Application

A modern task management application built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- Create, update, and manage tasks
- Real-time task status updates
- Clean and modern UI with Tailwind CSS
- Type-safe development with TypeScript
- Secure data storage with Supabase

## Prerequisites

- Node.js 18+ and npm
- Supabase account

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd whatsnext
```

2. Install dependencies:
```bash
npm install
```

3. Create a Supabase project:
   - Go to [Supabase](https://supabase.com)
   - Create a new project
   - Create a new table called `tasks` with the following schema:
     ```sql
     create table tasks (
       id uuid default uuid_generate_v4() primary key,
       created_at timestamp with time zone default timezone('utc'::text, now()) not null,
       title text not null,
       description text,
       status text default 'todo'::text not null,
       due_date timestamp with time zone,
       user_id uuid not null
     );
     ```

4. Configure environment variables:
   - Copy `.env.local` to `.env.local`
   - Update the values with your Supabase project URL and anon key

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

This application can be deployed to Vercel with the following steps:

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Add your environment variables in the Vercel project settings
4. Deploy!

## Tech Stack

- [Next.js](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://github.com/colinhacks/zod)
- [date-fns](https://date-fns.org/)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
