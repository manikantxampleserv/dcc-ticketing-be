/**
 * Seed script for initializing the database with an admin user and employee.
 *
 * - Creates or updates an admin user with a secure password.
 * - Creates or updates a linked employee record for the admin user.
 * - Ensures the user and employee are properly linked via employee_id.
 * - Logs success or errors.
 *
 * JD (Job Description) for the seeded admin user:
 *   - Name: Admin User
 *   - Email: admin@mkx.com
 *   - Role: ADMIN
 *   - Job Title: System Administrator
 *   - Department: IT
 *   - Status: active
 *   - Responsibilities: System administration, initial setup, and management.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import logger from "../src/config/logger";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@mkx.com" },
    update: {
      name: "Admin User",
      password: hashedPassword,
      role: "ADMIN",
    },
    create: {
      name: "Admin User",
      email: "admin@mkx.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  const adminEmployee = await prisma.employee.upsert({
    where: { email: "admin@mkx.com" },
    update: {
      first_name: "Admin",
      last_name: "User",
      job_title: "System Administrator",
      department: "IT",
      joining_date: new Date(),
      status: "active",
      created_by: adminUser.id,
    },
    create: {
      first_name: "Admin",
      last_name: "User",
      email: "admin@mkx.com",
      job_title: "System Administrator",
      department: "IT",
      joining_date: new Date(),
      status: "active",
      created_by: adminUser.id,
    },
  });

  if (adminUser.employee_id !== adminEmployee.id) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { employee_id: adminEmployee.id },
    });
  }

  logger.success(
    "Admin user created with linked employee (JD: System Administrator, IT Department, active)"
  );
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
