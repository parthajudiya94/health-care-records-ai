Healthcare AI MVP: Next.js 16, Prisma + MySQL, custom JWT auth, file uploads, AI summaries, reminders, and audit logging. See [`.env.example`](.env.example) for required variables and compliance notes.

## Getting Started

Copy [`.env.example`](.env.example) to `.env`, set `DATABASE_URL`, `JWT_SECRET`, and (optionally) `OPENAI_API_KEY` / `AI_MODEL` for AI summaries. Then:

```bash
npx prisma generate
npx prisma migrate deploy
# or: npx prisma db push
# Optional admin user (set ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD in .env first):
npx prisma db seed
```

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
