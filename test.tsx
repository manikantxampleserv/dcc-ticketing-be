// import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcrypt";

// const prisma = new PrismaClient();

// async function main() {
//   console.log("🌱 Starting DCC Consulting seeding...");

//   // 1. Roles
//   const roles = await prisma.role.createMany({
//     data: [
//       { name: "Admin" },
//       { name: "Manager" },
//       { name: "Agent" },
//       { name: "Customer" },
//     ],
//     skipDuplicates: true,
//   });

//   // 2. Departments
//   const departments = await prisma.department.createMany({
//     data: [
//       { department_name: "IT Support" },
//       { department_name: "HR" },
//       { department_name: "Finance" },
//     ],
//     skipDuplicates: true,
//   });

//   // 3. Users (with hashed passwords)
//   const passwordHash = await bcrypt.hash("Password@123", 10);
//   const admin = await prisma.users.upsert({
//     where: { email: "admin@dcc.com" },
//     update: {},
//     create: {
//       username: "admin",
//       email: "admin@dcc.com",
//       password_hash: passwordHash,
//       first_name: "Super",
//       last_name: "Admin",
//       role_id: 1, // Admin
//       department_id: 1, // IT Support
//     },
//   });

//   const manager = await prisma.users.upsert({
//     where: { email: "manager@dcc.com" },
//     update: {},
//     create: {
//       username: "manager",
//       email: "manager@dcc.com",
//       password_hash: passwordHash,
//       first_name: "Jane",
//       last_name: "Manager",
//       role_id: 2, // Manager
//       department_id: 2, // HR
//     },
//   });

//   const agentUser = await prisma.users.upsert({
//     where: { email: "agent@dcc.com" },
//     update: {},
//     create: {
//       username: "agent1",
//       email: "agent@dcc.com",
//       password_hash: passwordHash,
//       first_name: "John",
//       last_name: "Agent",
//       role_id: 3, // Agent
//       department_id: 1,
//     },
//   });

//   // 4. Agents table (link to users)
//   const agent = await prisma.agents.upsert({
//     where: { email: "agent@dcc.com" },
//     update: {},
//     create: {
//       first_name: "John",
//       last_name: "Agent",
//       email: "agent@dcc.com",
//       phone: "9876543210",
//       user_id: agentUser.id,
//     },
//   });

//   // 5. Companies & Customers
//   const company = await prisma.companies.upsert({
//     where: { domain: "acme.com" },
//     update: {},
//     create: {
//       company_name: "Acme Corp",
//       domain: "acme.com",
//       contact_email: "info@acme.com",
//       contact_phone: "1234567890",
//       address: "New York, USA",
//     },
//   });

//   const customer = await prisma.customers.upsert({
//     where: { email: "client@acme.com" },
//     update: {},
//     create: {
//       first_name: "Alice",
//       last_name: "Client",
//       email: "client@acme.com",
//       phone: "555123456",
//       job_title: "IT Manager",
//       company_id: company.id,
//     },
//   });

//   // 6. Categories
//   const category = await prisma.categories.upsert({
//     where: { id: 1 },
//     update: {},
//     create: {
//       category_name: "Technical Issue",
//       description: "Issues related to software or hardware",
//     },
//   });

//   // 7. SLA Configurations
//   await prisma.sla_configurations.createMany({
//     data: [
//       { priority: "Low", response_time_hours: 24, resolution_time_hours: 72 },
//       {
//         priority: "Medium",
//         response_time_hours: 12,
//         resolution_time_hours: 48,
//       },
//       { priority: "High", response_time_hours: 4, resolution_time_hours: 12 },
//     ],
//     skipDuplicates: true,
//   });

//   // 8. Sample Tickets
//   await prisma.tickets.createMany({
//     data: [
//       {
//         ticket_number: "TCK-1001",
//         customer_id: customer.id,
//         assigned_agent_id: agent.id,
//         category_id: category.id,
//         subject: "Cannot access HRMS portal",
//         description: "Employee unable to login to HRMS.",
//         priority: "High",
//         status: "Open",
//       },
//       {
//         ticket_number: "TCK-1002",
//         customer_id: customer.id,
//         assigned_agent_id: agent.id,
//         category_id: category.id,
//         subject: "Email not syncing",
//         description: "Outlook not syncing with server.",
//         priority: "Medium",
//         status: "Open",
//       },
//     ],
//     skipDuplicates: true,
//   });

//   console.log("✅ Seeding completed successfully!");
// }

// main()
//   .catch((e) => {
//     console.error("❌ Seeding error:", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
