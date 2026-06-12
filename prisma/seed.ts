/**
 * Create or update a seeded admin user when ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD
 * are set in the environment. Never log secrets. Run: npx prisma db seed
 */
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    console.log(
      "Skipping admin seed: set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in .env to create/update an admin."
    );
    return;
  }
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    create: {
      name: "Admin",
      email,
      password: passwordHash,
      role: Role.ADMIN,
    },
    update: {
      name: "Admin",
      password: passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log("Admin user seeded for the given email.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async () => {
    console.error("Seed error");
    await prisma.$disconnect();
    process.exit(1);
  });
