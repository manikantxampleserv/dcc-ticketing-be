import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
async function main() {
  try {
    console.log("Cleaning existing data");
    await prisma.tickets.deleteMany({});
    await prisma.customers.deleteMany({});
    await prisma.companies.deleteMany({});
    await prisma.agents.deleteMany({});
    await prisma.users.deleteMany({});
    await prisma.categories.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.role.deleteMany({});
    console.log("Existing data cleared");
  } catch (error) {
    console.error("Seeding failed:", error);
    throw error;
  }
}

main().then(async () => {
  console.log("Disconnecting from database");
  await prisma.$disconnect();
  console.log("Database disconnected");
});
