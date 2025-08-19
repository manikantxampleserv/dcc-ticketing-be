import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seeding");

  try {
    console.log("Creating departments");
    const itDepartment = await prisma.department.create({
      data: {
        department_name: "IT Support",
        is_active: "Y",
      },
    });

    const salesDepartment = await prisma.department.create({
      data: {
        department_name: "Sales",
        is_active: "Y",
      },
    });

    console.log("Departments created successfully");

    console.log("Creating roles");
    const adminRole = await prisma.role.create({
      data: {
        name: "Admin",
        is_active: "Y",
      },
    });

    const agentRole = await prisma.role.create({
      data: {
        name: "Agent",
        is_active: "Y",
      },
    });

    const userRole = await prisma.role.create({
      data: {
        name: "User",
        is_active: "Y",
      },
    });

    console.log("Roles created successfully");

    console.log("Creating users");
    const passwordHash = await bcrypt.hash("123456", 10);

    const adminUser = await prisma.users.create({
      data: {
        username: "admin",
        email: "admin@ampleserv.com",
        password_hash: passwordHash,
        first_name: "System",
        last_name: "Admin",
        phone: "+1234567890",
        role_id: adminRole.id,
        department_id: itDepartment.id,
        is_active: true,
      },
    });

    const agentUser = await prisma.users.create({
      data: {
        username: "agent.user",
        email: "agent.user@dcc.com",
        password_hash: passwordHash,
        first_name: "Agent",
        last_name: "User",
        phone: "+1234567891",
        role_id: agentRole.id,
        department_id: itDepartment.id,
        is_active: true,
      },
    });

    const endUser = await prisma.users.create({
      data: {
        username: "end.user",
        email: "end.user@dcc.com",
        password_hash: passwordHash,
        first_name: "End",
        last_name: "User",
        phone: "+1234567892",
        role_id: userRole.id,
        department_id: salesDepartment.id,
        is_active: true,
      },
    });

    console.log("Users created successfully");

    console.log("Creating agent record");
    const agent = await prisma.agents.create({
      data: {
        user_id: agentUser.id,
        first_name: "Agent",
        last_name: "John",
        email: agentUser.email,
        phone: agentUser.phone,
        role: "Agent",
        department: "IT Support",
        is_active: true,
        hire_date: new Date(),
      },
    });

    console.log("Agent created:", agent.email);

    console.log("Creating ticket categories");
    const techSupportCategory = await prisma.categories.create({
      data: {
        category_name: "Technical Support",
        description: "Technical issues and troubleshooting",
        is_active: true,
      },
    });

    const billingCategory = await prisma.categories.create({
      data: {
        category_name: "Billing",
        description: "Billing and payment related issues",
        is_active: true,
      },
    });

    console.log("Categories created");

    console.log("Creating sample company and customer");
    const sampleCompany = await prisma.companies.create({
      data: {
        company_name: "Sample Corp",
        domain: "samplecorp.com",
        contact_email: "contact@samplecorp.com",
        contact_phone: "+1234567890",
        address: "123 Business St, City, State 12345",
        is_active: true,
      },
    });

    const sampleCustomer = await prisma.customers.create({
      data: {
        company_id: sampleCompany.id,
        first_name: "John",
        last_name: "Customer",
        email: "john.customer@samplecorp.com",
        phone: "+1234567893",
        job_title: "IT Manager",
        is_active: true,
      },
    });

    console.log("Sample company and customer created");

    console.log("Seeding completed successfully");

    const roleCount = await prisma.role.count();
    const userCount = await prisma.users.count();
    const agentCount = await prisma.agents.count();
    const departmentCount = await prisma.department.count();
    const companyCount = await prisma.companies.count();
    const customerCount = await prisma.customers.count();
    const categoryCount = await prisma.categories.count();
  } catch (error) {
    console.error("Seeding failed:", error);
    throw error;
  }
}

main()
  .then(async () => {
    console.log("Disconnecting from database");
    await prisma.$disconnect();
    console.log("Database disconnected");
  })
  .catch(async (e) => {
    console.error("Seeding error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
