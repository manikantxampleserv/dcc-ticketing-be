import axios from "axios";
import { PrismaClient } from "@prisma/client";
// import ExcelJS from "exceljs";
// import { uploadToBackblaze } from "types/uploadBackblaze";
import { uploadFile } from "./blackbaze";
import { generateTicketNumber } from "./GenerateTicket";
import pLimit from "p-limit";

const limit = pLimit(2); // max 2 parallel requests

const prisma = new PrismaClient();

const ZENDESK_DOMAIN = "https://dcctz.zendesk.com";

const AUTH = {
  username: "ashok.kumar@doubleclick.co.tz/token", // Zendesk email
  password: "mhk7W7m0sM5THqFYjQ6FjvW4c97X01IbhQ1x8xyR", // Zendesk API token
};

// Zendesk → SLA Priority Mapping
const zendeskToSLAPriority: any = {
  urgent: "Critical",
  high: "High",
  normal: "Medium",
  low: "Low",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const safeAxios = async (url: string, options: any = {}) => {
  while (true) {
    try {
      return await axios.get(url, {
        auth: AUTH,
        ...options,
      });
    } catch (err: any) {
      if (err.response?.status === 429) {
        const retryAfter = err.response.headers["retry-after"];
        const wait = retryAfter ? Number(retryAfter) * 1000 : 10000;

        console.log(`429 hit → waiting ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
};
export class ZendeskTicketImportService {
  // static async importTickets() {
  //   try {
  //     console.log("Starting Zendesk Ticket Import...");

  //     const url = `${ZENDESK_DOMAIN}/api/v2/incremental/tickets.json?start_time=0`;

  //     const response = await axios.get(url, { auth: AUTH });

  //     const tickets = response.data.tickets;

  //     const slaPriorities = await prisma.sla_configurations.findMany({
  //       where: { is_active: true },
  //     });

  //     const slaPriorityMap: any = {};

  //     slaPriorities.forEach((p) => {
  //       slaPriorityMap[p.priority] = p.id;
  //     });

  //     for (const t of tickets) {
  //       const ticketNumber = `ZD-${t.id}`;
  //       const email = t?.via?.source?.from?.address;

  //       const exists = await prisma.tickets.findUnique({
  //         where: { ticket_number: ticketNumber },
  //       });

  //       if (exists) {
  //         console.log(`Ticket already exists ${ticketNumber}`);
  //         continue;
  //       }

  //       const slaPriorityName = zendeskToSLAPriority[t.priority] || "Low";

  //       const slaPriorityId = slaPriorityMap[slaPriorityName];

  //       const formattedStatus = t.status
  //         ? t.status.charAt(0).toUpperCase() + t.status.slice(1)
  //         : "Open";
  //       const ticket = await prisma.tickets.create({
  //         data: {
  //           ticket_number: ticketNumber,
  //           subject: t.subject || "No Subject",
  //           description: t.description || "",
  //           email_body_text: t.description || "",
  //           priority: slaPriorityId,
  //           status: formattedStatus || "Open",
  //           source: t.via?.channel || "Email",
  //           tags: t.tags?.join(","),
  //           created_at: new Date(t.created_at),
  //           updated_at: new Date(t.updated_at),
  //         },
  //       });

  //       console.log("Ticket Imported:", ticket.ticket_number);

  //       await this.importComments(t.id, ticket.id);
  //     }
  //     console.log("Excel file created: zendesk_ticket_emails.xlsx");
  //   } catch (error: any) {
  //     console.error("Ticket Import Error:", error.message);
  //   }
  // }
  /*********** Final Data *******/
  static async importTickets() {
    try {
      console.log("Starting Zendesk Ticket Import...");

      let url = `${ZENDESK_DOMAIN}/api/v2/incremental/tickets.json?start_time=1767100000&include=users`;

      const slaPriorities = await prisma.sla_configurations.findMany({
        where: { is_active: true },
      });

      const slaPriorityMap: any = {};
      slaPriorities.forEach((p) => {
        slaPriorityMap[p.priority] = p.id;
      });

      /* -------- LOAD USERS & CUSTOMERS ONCE -------- */

      const users = await prisma.users.findMany();
      const customers = await prisma.customers.findMany();

      const userEmailMap: any = {};
      users.forEach((u) => {
        userEmailMap[u.email.toLowerCase()] = u.id;
      });

      const customerDomainMap: any = {};
      customers.forEach((c) => {
        const domain = c.email?.split("@")[1];
        if (domain) customerDomainMap[domain] = c.id;
      });

      while (url) {
        // let response;
        const response = await safeAxios(url);
        // try {
        //   response = await axios.get(url, { auth: AUTH });
        // } catch (err: any) {
        //   if (err.response?.status === 429) {
        //     console.log("Rate limit hit, waiting 10 seconds...");
        //     await new Promise((r) => setTimeout(r, 10000));
        //     continue;
        //   }
        //   throw err;
        // }
        const tickets = response.data.tickets;

        const userMap: any = {};
        (response.data.users || [])?.forEach((u: any) => {
          userMap[u.id] = {
            email: u.email?.toLowerCase(),
            name: u.name,
          };
        });

        for (const t of tickets) {
          const ticketNumber = `TCKT-${t.id}`;
          const email = t?.via?.source?.from?.address?.toLowerCase();
          const name = t?.via?.source?.from?.name?.toLowerCase();

          const exists = await prisma.tickets.findUnique({
            where: { ticket_number: ticketNumber },
          });

          if (exists) continue;

          /* -------- CUSTOMER DOMAIN MATCH -------- */

          let customerId = null;

          if (email && email.includes("@")) {
            const domain = email.split("@")[1];
            customerId = customerDomainMap[domain] || null;
          }

          /* -------- ASSIGNEE MATCH -------- */

          let assigneeId = null;

          const zendeskAssignee = userMap[t.assignee_id];

          if (zendeskAssignee?.email) {
            assigneeId = userEmailMap[zendeskAssignee.email] || null;
          }

          const slaPriorityName = zendeskToSLAPriority[t.priority] || "Low";
          const slaPriorityId = slaPriorityMap[slaPriorityName];

          const formattedStatus = t.status
            ? t.status.charAt(0).toUpperCase() + t.status.slice(1)
            : "Open";

          const ticket = await prisma.tickets.create({
            data: {
              ticket_number: ticketNumber,
              subject: t.subject || "No Subject",
              zendesk_ticket_id: t.id,
              description: t.description || "",
              email_body_text: t.description || "",
              priority: slaPriorityId,
              status: formattedStatus,
              source: t.via?.channel || "Email",
              tags: t.tags?.join(","),
              customer_id: customerId,
              assigned_agent_id: assigneeId,
              created_at: new Date(t.created_at),
              updated_at: new Date(t.updated_at),
              customer_email: email,
              customer_name: name,
            },
          });

          await prisma.tickets.update({
            where: {
              id: ticket.id,
            },
            data: {
              ticket_number: generateTicketNumber(ticket.id),
            },
          });

          console.log("Ticket Imported:", ticket.ticket_number);

          //   await this.importComments(
          //     t.id,
          //     ticket.id,
          //     userMap,
          //     customerDomainMap,
          //     userEmailMap,
          //   );
          await limit(() =>
            this.importComments(
              t.id,
              ticket.id,
              userMap,
              customerDomainMap,
              userEmailMap,
            ),
          );
        }

        url = response.data.next_page;
      }

      console.log("Zendesk Ticket Import Completed");
    } catch (error: any) {
      console.error("Ticket Import Error:", error.message);
    }
  }
  // static async importTickets() {
  //   try {
  //     console.log("Starting Zendesk Ticket Import...");

  //     let url = `${ZENDESK_DOMAIN}/api/v2/incremental/tickets.json?start_time=1767100000&include=users`;

  //     const slaPriorities = await prisma.sla_configurations.findMany({
  //       where: { is_active: true },
  //     });

  //     const slaPriorityMap: any = {};
  //     slaPriorities.forEach((p) => {
  //       slaPriorityMap[p.priority] = p.id;
  //     });

  //     while (url) {
  //       const response = await axios.get(url, { auth: AUTH });

  //       const tickets = response.data.tickets;

  //       const userMap: any = {};
  //       response.data.users?.forEach((u: any) => {
  //         userMap[u.id] = {
  //           email: u.email?.toLowerCase(),
  //           name: u.name,
  //         };
  //       });
  //       console.log("User Data : ", userMap);
  //       for (const t of tickets) {
  //         const ticketNumber = `ZD-${t.id}`;
  //         const email = t?.via?.source?.from?.address?.toLowerCase();
  //         const name = t?.via?.source?.from?.name?.toLowerCase();

  //         const exists = await prisma.tickets.findUnique({
  //           where: { ticket_number: ticketNumber },
  //         });

  //         if (exists) {
  //           console.log(`Ticket already exists ${ticketNumber}`);
  //           continue;
  //         }

  //         /* -------- GET CUSTOMER BY EMAIL -------- */
  //         let customerId = null;

  //         // fallback to domain match
  //         const domain = email?.split("@")[1];

  //         const domainCustomer = await prisma.customers.findFirst({
  //           where: {
  //             email: {
  //               contains: domain,
  //             },
  //           },
  //         });

  //         if (domainCustomer) {
  //           customerId = domainCustomer.id;
  //         }

  //         //  GET ASSIGNED TICKET ID
  //         let assigneeId = null;

  //         const zendeskAssignee = userMap[t.assignee_id];

  //         if (zendeskAssignee?.email) {
  //           const user = await prisma.users.findFirst({
  //             where: {
  //               email: zendeskAssignee?.email,
  //             },
  //           });

  //           if (user) {
  //             assigneeId = user.id;
  //           }
  //         }

  //         const slaPriorityName = zendeskToSLAPriority[t.priority] || "Low";
  //         const slaPriorityId = slaPriorityMap[slaPriorityName];

  //         const formattedStatus = t.status
  //           ? t.status.charAt(0).toUpperCase() + t.status.slice(1)
  //           : "Open";

  //         const ticket = await prisma.tickets.create({
  //           data: {
  //             ticket_number: ticketNumber,
  //             subject: t.subject || "No Subject",
  //             description: t.description || "",
  //             email_body_text: t.description || "",
  //             priority: slaPriorityId,
  //             status: formattedStatus,
  //             source: t.via?.channel || "Email",
  //             tags: t.tags?.join(","),
  //             customer_id: customerId,
  //             assigned_agent_id: assigneeId,
  //             created_at: new Date(t.created_at),
  //             updated_at: new Date(t.updated_at),
  //             customer_email: email,
  //             customer_name: name,
  //           },
  //         });

  //         console.log("Ticket Imported:", ticket.ticket_number);

  //         // await this.importComments(t.id, 0, userMap);
  //         await this.importComments(t.id, ticket.id, userMap);
  //       }

  //       /* -------- PAGINATION UNTIL TODAY -------- */
  //       url = response.data.next_page;
  //     }

  //     console.log("Zendesk Ticket Import Completed");
  //   } catch (error: any) {
  //     console.error("Ticket Import Error:", error.message);
  //   }
  // }
  // static async importTickets() {
  //   try {
  //     console.log("Starting Zendesk Ticket Import...");

  //     let url = `${ZENDESK_DOMAIN}/api/v2/incremental/tickets.json?start_time=0`;

  //     const slaPriorities = await prisma.sla_configurations.findMany({
  //       where: { is_active: true },
  //     });

  //     const slaPriorityMap: any = {};
  //     slaPriorities.forEach((p) => {
  //       slaPriorityMap[p.priority] = p.id;
  //     });

  //     while (url) {
  //       const response = await axios.get(url, { auth: AUTH });

  //       const tickets = response.data.tickets;

  //       for (const t of tickets) {
  //         const ticketNumber = `ZD-${t.id}`;
  //         const email = t?.via?.source?.from?.address?.toLowerCase();
  //         const name = t?.via?.source?.from?.name?.toLowerCase();

  //         const exists = await prisma.tickets.findUnique({
  //           where: { ticket_number: ticketNumber },
  //         });

  //         if (exists) {
  //           console.log(`Ticket already exists ${ticketNumber}`);
  //           continue;
  //         }

  //         /* -------- GET CUSTOMER BY EMAIL -------- */
  //         let customerId = null;

  //         if (email) {
  //           const customer = await prisma.customers.findFirst({
  //             where: {
  //               email: {
  //                 equals: email,
  //               },
  //             },
  //           });

  //           if (customer) {
  //             customerId = customer.id;
  //           }
  //         }

  //         const slaPriorityName = zendeskToSLAPriority[t.priority] || "Low";
  //         const slaPriorityId = slaPriorityMap[slaPriorityName];

  //         const formattedStatus = t.status
  //           ? t.status.charAt(0).toUpperCase() + t.status.slice(1)
  //           : "Open";

  //         const ticket = await prisma.tickets.create({
  //           data: {
  //             ticket_number: ticketNumber,
  //             subject: t.subject || "No Subject",
  //             description: t.description || "",
  //             email_body_text: t.description || "",
  //             priority: slaPriorityId,
  //             status: formattedStatus,
  //             source: t.via?.channel || "Email",
  //             tags: t.tags?.join(","),
  //             customer_id: customerId,
  //             created_at: new Date(t.created_at),
  //             updated_at: new Date(t.updated_at),
  //             customer_email: email,
  //             customer_name: name,
  //           },
  //         });

  //         console.log("Ticket Imported:", ticket.ticket_number);

  //         await this.importComments(t.id, ticket.id);
  //       }

  //       /* -------- PAGINATION UNTIL TODAY -------- */
  //       url = response.data.next_page;
  //     }

  //     console.log("Zendesk Ticket Import Completed");
  //   } catch (error: any) {
  //     console.error("Ticket Import Error:", error.message);
  //   }
  // }
  /************   Final for Excel print  ************/
  // static async importTickets() {
  //   try {
  //     console.log("Starting Zendesk Ticket Import...");

  //     let url = `${ZENDESK_DOMAIN}/api/v2/incremental/tickets.json?start_time=0000000000`;

  //     const emails: any[] = [];
  //     const uniqueEmails = new Set();

  //     const sleep = (ms: number) =>
  //       new Promise((resolve) => setTimeout(resolve, ms));

  //     while (url) {
  //       let response: any;

  //       try {
  //         response = await axios.get(url, { auth: AUTH });
  //       } catch (err: any) {
  //         if (err.response?.status === 429) {
  //           console.log("Rate limit hit. Waiting 10 seconds...");
  //           await sleep(10000);
  //           continue; // retry same URL
  //         } else {
  //           throw err;
  //         }
  //       }

  //       const tickets = response?.data?.tickets || [];

  //       console.log(`Fetched ${tickets.length} tickets`);

  //       for (const t of tickets) {
  //         const email = t?.via?.source?.from?.address?.toLowerCase();
  //         const name = t?.via?.source?.from?.name;

  //         if (!email) continue;

  //         // skip doubleclick domain
  //         if (email.endsWith("@doubleclick.co.tz")) continue;

  //         if (!uniqueEmails.has(email)) {
  //           uniqueEmails.add(email);

  //           emails.push({
  //             ticket_id: t.id,
  //             name,
  //             email,
  //           });
  //         }
  //       }

  //       if (response.data.end_of_stream) {
  //         console.log("All tickets fetched");
  //         break;
  //       }

  //       url = response.data.next_page;

  //       // prevent rate limit
  //       await sleep(1500);
  //     }

  //     console.log(`Total unique emails collected: ${emails.length}`);

  //     // Create Excel
  //     const workbook = new ExcelJS.Workbook();
  //     const worksheet = workbook.addWorksheet("Ticket Emails");

  //     worksheet.columns = [
  //       { header: "Ticket ID", key: "ticket_id", width: 20 },
  //       { header: "Name", key: "name", width: 40 },
  //       { header: "Email Address", key: "email", width: 50 },
  //     ];

  //     worksheet.addRows(emails);

  //     const buffer = await workbook.xlsx.writeBuffer();

  //     console.log("Excel file generated successfully");

  //     return buffer;
  //   } catch (error: any) {
  //     console.error("Ticket Import Error:", error.message);
  //   }
  // }
  // static async importTickets() {
  //   try {
  //     console.log("Starting Zendesk Ticket Import...");

  //     let url = `${ZENDESK_DOMAIN}/api/v2/incremental/tickets.json?start_time=0000000000`;

  //     const emails: any[] = [];

  //     while (url) {
  //       const response = await axios.get(url, { auth: AUTH });

  //       const tickets = response.data.tickets;

  //       console.log(`Fetched ${tickets.length} tickets`);

  //       for (const t of tickets) {
  //         const email = t?.via?.source?.from?.address;
  //         const name = t?.via?.source?.from?.name;
  //         if (t.status === "closed" || t.status === "deleted") {
  //           continue;
  //         }
  //         if (email) {
  //           emails.push({
  //             ticket_id: t.id,
  //             name: name,
  //             email: email,
  //           });
  //         }
  //       }

  //       // Stop if no more data
  //       if (response.data.end_of_stream) {
  //         console.log("All tickets fetched");
  //         break;
  //       }

  //       // Move to next page
  //       url = response.data.next_page;
  //     }

  //     // Create Excel
  //     const workbook = new ExcelJS.Workbook();
  //     const worksheet = workbook.addWorksheet("Ticket Emails");

  //     worksheet.columns = [
  //       { header: "Ticket ID", key: "ticket_id", width: 20 },
  //       { header: "Name", key: "name", width: 40 },
  //       { header: "Email Address", key: "email", width: 50 },
  //     ];

  //     emails.forEach((e) => worksheet.addRow(e));

  //     const buffer = await workbook.xlsx.writeBuffer();

  //     console.log(`Total emails exported: ${emails.length}`);

  //     return buffer;
  //   } catch (error: any) {
  //     console.error("Ticket Import Error:", error.message);
  //   }
  // }
  static async importComments(
    zendeskTicketId: number,
    localTicketId: number,
    userMap: any,
    customerDomainMap: any,
    userEmailMap: any,
  ) {
    try {
      const url = `${ZENDESK_DOMAIN}/api/v2/tickets/${zendeskTicketId}/comments.json`;

      // const response = await axios.get(url, { auth: AUTH });
      const response = await safeAxios(url);

      const comments = response.data.comments;
      for (const c of comments) {
        await new Promise((r) => setTimeout(r, 400));

        // ✅ prevent duplicate comments
        const existsComment = await prisma.ticket_comments.findFirst({
          where: {
            email_message_id: c.metadata?.system?.message_id,
          },
        });

        if (existsComment) continue;

        let userId = null;
        let customerId = null;
        let attachmentUrls: string[] = [];

        const zendeskAuthor = userMap[c.author_id];
        const authorEmail = zendeskAuthor?.email?.toLowerCase();

        if (authorEmail) {
          userId = userEmailMap[authorEmail] || null;

          if (!userId) {
            const domain = authorEmail.split("@")[1];
            customerId = customerDomainMap[domain] || null;
          }
        }

        /* -------- CC HANDLING (OPTIMIZED) -------- */

        const recipients = c?.via?.source?.from?.original_recipients || [];

        const ccData: any[] = [];

        for (const recipient of recipients) {
          const email = recipient.toLowerCase();

          if (email.includes("@dcctz.zendesk.com")) continue;

          const userId = userEmailMap[email] || null;

          if (userId) {
            ccData.push({ ticket_id: localTicketId, user_id: userId });
          } else {
            ccData.push({
              ticket_id: localTicketId,
              others_of_ticket_cc: email,
            });
          }
        }

        if (ccData.length) {
          await prisma.cc_of_ticket.createMany({
            data: ccData,
            // skipDuplicates: true,
          });
        }

        /* -------- ATTACHMENTS -------- */

        if (c.attachments?.length) {
          const attachmentLimit = pLimit(2);

          attachmentUrls = await Promise.all(
            c.attachments.map((a: any) =>
              attachmentLimit(async () => {
                const fileResponse = await safeAxios(a.content_url, {
                  responseType: "arraybuffer",
                });

                const buffer = Buffer.from(fileResponse.data);

                const fileName = `ticket-comment-attachments/ZD-${zendeskTicketId}/${Date.now()}-${a.file_name}`;

                return uploadFile(buffer, fileName, a.content_type);
              }),
            ),
          );
        }

        /* -------- SAVE COMMENT -------- */

        await prisma.ticket_comments.create({
          data: {
            ticket_id: localTicketId,
            comment_text: c.html_body || c.body,
            email_body_text: c.plain_body,
            comment_type: c.public ? "public" : "internal",
            is_internal: !c.public,
            email_message_id: c.metadata?.system?.message_id || null,
            created_at: new Date(c.created_at),
            user_id: userId,
            customer_id: customerId,
            attachment_urls: attachmentUrls.length
              ? attachmentUrls.join(",")
              : null,
          },
        });
      }
      // for (const c of comments) {
      //   await new Promise((r) => setTimeout(r, 200));
      //   let userId = null;
      //   let customerId = null;
      //   let attachmentUrls: string[] = [];

      //   const zendeskAuthor = userMap[c.author_id];
      //   const authorEmail = zendeskAuthor?.email?.toLowerCase();

      //   if (authorEmail) {
      //     userId = userEmailMap[authorEmail] || null;

      //     if (!userId) {
      //       const domain = authorEmail.split("@")[1];
      //       customerId = customerDomainMap[domain] || null;
      //     }
      //   }

      //   const recipients = c?.via?.source?.from?.original_recipients || [];

      //   for (const recipient of recipients) {
      //     const email = recipient.toLowerCase();

      //     /* skip zendesk system emails if needed */
      //     if (email.includes("@dcctz.zendesk.com")) continue;

      //     const userId = userEmailMap[email] || null;

      //     if (userId) {
      //       const exists = await prisma.cc_of_ticket.findFirst({
      //         where: {
      //           ticket_id: localTicketId,
      //           user_id: userId,
      //         },
      //       });

      //       if (!exists) {
      //         await prisma.cc_of_ticket.create({
      //           data: {
      //             ticket_id: localTicketId,
      //             user_id: userId,
      //           },
      //         });
      //       }
      //     } else {
      //       const exists = await prisma.cc_of_ticket.findFirst({
      //         where: {
      //           ticket_id: localTicketId,
      //           others_of_ticket_cc: email,
      //         },
      //       });

      //       if (!exists) {
      //         await prisma.cc_of_ticket.create({
      //           data: {
      //             ticket_id: localTicketId,
      //             others_of_ticket_cc: email,
      //           },
      //         });
      //       }
      //     }
      //   }
      //   /* -------- ATTACHMENTS -------- */

      //   // if (c.attachments?.length) {
      //   //   attachmentUrls = await Promise.all(
      //   //     c.attachments.map(async (a: any) => {
      //   //       const fileResponse = await axios.get(a.content_url, {
      //   //         responseType: "arraybuffer",
      //   //         auth: AUTH,
      //   //       });

      //   //       const buffer = Buffer.from(fileResponse.data);

      //   //       return uploadToBackblaze(buffer, a.file_name, a.content_type, {
      //   //         folder: `ticket-attachments/ZD-${zendeskTicketId}`,
      //   //         processImage: false,
      //   //       });
      //   //     }),
      //   //   );
      //   // }
      //   if (c.attachments?.length) {
      //     const attachmentLimit = pLimit(2);

      //     attachmentUrls = await Promise.all(
      //       c.attachments.map((a: any) =>
      //         attachmentLimit(async () => {
      //           const fileResponse = await safeAxios(a.content_url, {
      //             responseType: "arraybuffer",
      //           });

      //           const buffer = Buffer.from(fileResponse.data);

      //           const fileName = `ticket-comment-attachments/ZD-${zendeskTicketId}/${Date.now()}-${a.file_name}`;

      //           return uploadFile(buffer, fileName, a.content_type);
      //         }),
      //       ),
      //     );
      //   }
      //   // if (c.attachments?.length) {
      //   //   attachmentUrls = await Promise.all(
      //   //     c.attachments.map(async (a: any) => {
      //   //       const fileResponse = await safeAxios(a.content_url, {
      //   //         responseType: "arraybuffer",
      //   //       });
      //   //       // const fileResponse = await axios.get(a.content_url, {
      //   //       //   responseType: "arraybuffer",
      //   //       //   auth: AUTH,
      //   //       // });

      //   //       const buffer = Buffer.from(fileResponse.data);

      //   //       const fileName = `ticket-comment-attachments/ZD-${zendeskTicketId}/${Date.now()}-${a.file_name}`;

      //   //       return uploadFile(buffer, fileName, a.content_type);
      //   //     }),
      //   //   );
      //   // }

      //   await prisma.ticket_comments.create({
      //     data: {
      //       ticket_id: localTicketId,
      //       comment_text: c.html_body || c.body,
      //       email_body_text: c.plain_body,
      //       comment_type: c.public ? "public" : "internal",
      //       is_internal: !c.public,
      //       email_message_id: c.metadata?.system?.message_id || null,
      //       created_at: new Date(c.created_at),
      //       user_id: userId,
      //       customer_id: customerId,
      //       attachment_urls: attachmentUrls.length
      //         ? attachmentUrls.join(",")
      //         : null,
      //     },
      //   });
      // }

      console.log(`Comments Imported for ticket ${zendeskTicketId}`);
    } catch (error: any) {
      console.error(
        `Comment Import Error for ticket ${zendeskTicketId}:`,
        error.message,
      );
    }
  }
  // static async importComments(
  //   zendeskTicketId: number,
  //   localTicketId: number,
  //   userMap: any,
  // ) {
  //   try {
  //     const url = `${ZENDESK_DOMAIN}/api/v2/tickets/${zendeskTicketId}/comments.json`;

  //     const response = await axios.get(url, { auth: AUTH });

  //     const comments = response.data.comments;

  //     for (const c of comments) {
  //       let userId = null;
  //       let customerId = null;
  //       let attachmentUrls: string[] = [];

  //       /* ---------------- AUTHOR RESOLUTION ---------------- */

  //       const zendeskAuthor = userMap[c.author_id];
  //       const authorEmail = zendeskAuthor?.email?.toLowerCase();

  //       if (authorEmail) {
  //         const user = await prisma.users.findFirst({
  //           where: { email: authorEmail },
  //         });

  //         if (user) {
  //           userId = user.id;
  //         } else {
  //           const domain = authorEmail.split("@")[1];

  //           const customer = await prisma.customers.findFirst({
  //             where: {
  //               email: {
  //                 contains: domain,
  //               },
  //             },
  //           });

  //           if (customer) {
  //             customerId = customer.id;
  //           }
  //         }
  //       }

  //       /* ---------------- ATTACHMENT HANDLING ---------------- */

  //       if (c.attachments && c.attachments.length > 0) {
  //         // for (const a of c.attachments) {
  //         //   try {
  //         //     const fileResponse = await axios.get(a.content_url, {
  //         //       responseType: "arraybuffer",
  //         //       auth: AUTH, // Zendesk requires auth
  //         //     });

  //         //     const buffer = Buffer.from(fileResponse.data);

  //         //     const uploadedUrl = await uploadToBackblaze(
  //         //       buffer,
  //         //       a.file_name,
  //         //       a.content_type,
  //         //       {
  //         //         folder: `ticket-attachments/ZD-${zendeskTicketId}`,
  //         //         processImage: false,
  //         //       },
  //         //     );

  //         //     attachmentUrls.push(uploadedUrl);
  //         //   } catch (err) {
  //         //     console.error(`Attachment upload failed for ${a.file_name}`, err);
  //         //   }
  //         // }
  //         attachmentUrls = await Promise.all(
  //           c.attachments.map(async (a: any) => {
  //             const fileResponse = await axios.get(a.content_url, {
  //               responseType: "arraybuffer",
  //               auth: AUTH,
  //             });

  //             const buffer = Buffer.from(fileResponse.data);

  //             return uploadToBackblaze(buffer, a.file_name, a.content_type, {
  //               folder: `ticket-attachments/ZD-${zendeskTicketId}`,
  //               processImage: false,
  //             });
  //           }),
  //         );
  //       }
  //       console.log("Comments : ", attachmentUrls, userId, customerId);
  //       /* ---------------- SAVE COMMENT ---------------- */

  //       await prisma.ticket_comments.create({
  //         data: {
  //           ticket_id: localTicketId,
  //           comment_text: c.html_body || c.body,
  //           email_body_text: c.plain_body,
  //           comment_type: c.public ? "public" : "internal",
  //           is_internal: !c.public,
  //           email_message_id: c.metadata?.system?.message_id || null,
  //           created_at: new Date(c.created_at),

  //           user_id: userId,
  //           customer_id: customerId,

  //           attachment_urls:
  //             attachmentUrls.length > 0 ? attachmentUrls.join(",") : null,
  //         },
  //       });
  //     }

  //     console.log(`Comments Imported for ticket ${zendeskTicketId}`);
  //   } catch (error: any) {
  //     console.error(
  //       `Comment Import Error for ticket ${zendeskTicketId}:`,
  //       error.message,
  //     );
  //   }
  // }
  // static async importComments(
  //   zendeskTicketId: number,
  //   localTicketId: number,
  //   userMap: any[],
  // ) {
  //   try {
  //     const url = `${ZENDESK_DOMAIN}/api/v2/tickets/${zendeskTicketId}/comments.json`;

  //     const response = await axios.get(url, { auth: AUTH });

  //     const comments = response.data.comments;

  //     for (const c of comments) {
  //       await prisma.ticket_comments.create({
  //         data: {
  //           ticket_id: localTicketId,
  //           comment_text: c.html_body || c.body,
  //           email_body_text: c.plain_body,
  //           comment_type: c.public ? "public" : "internal",
  //           is_internal: !c.public,
  //           email_message_id: c.metadata?.system?.message_id || null,
  //           created_at: new Date(c.created_at),
  //         },
  //       });
  //     }

  //     console.log(`Comments Imported for ticket ${zendeskTicketId}`);
  //   } catch (error: any) {
  //     console.error(
  //       `Comment Import Error for ticket ${zendeskTicketId}:`,
  //       error.message,
  //     );
  //   }
  // }
}
