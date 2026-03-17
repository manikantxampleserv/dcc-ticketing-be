"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZendeskTicketImportService = void 0;
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
// import ExcelJS from "exceljs";
// import { uploadToBackblaze } from "../types/uploadBackblaze.js";
const blackbaze_1 = require("./blackbaze");
const GenerateTicket_1 = require("./GenerateTicket");
const prisma = new client_1.PrismaClient();
const ZENDESK_DOMAIN = "https://dcctz.zendesk.com";
const AUTH = {
    username: "ashok.kumar@doubleclick.co.tz/token", // Zendesk email
    password: "mhk7W7m0sM5THqFYjQ6FjvW4c97X01IbhQ1x8xyR", // Zendesk API token
};
// Zendesk → SLA Priority Mapping
const zendeskToSLAPriority = {
    urgent: "Critical",
    high: "High",
    normal: "Medium",
    low: "Low",
};
class ZendeskTicketImportService {
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
    static importTickets() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            try {
                console.log("Starting Zendesk Ticket Import...");
                let url = `${ZENDESK_DOMAIN}/api/v2/incremental/tickets.json?start_time=1773705600&include=users`;
                const slaPriorities = yield prisma.sla_configurations.findMany({
                    where: { is_active: true },
                });
                const slaPriorityMap = {};
                slaPriorities.forEach((p) => {
                    slaPriorityMap[p.priority] = p.id;
                });
                /* -------- LOAD USERS & CUSTOMERS ONCE -------- */
                const users = yield prisma.users.findMany();
                const customers = yield prisma.customers.findMany();
                const userEmailMap = {};
                users.forEach((u) => {
                    userEmailMap[u.email.toLowerCase()] = u.id;
                });
                const customerDomainMap = {};
                customers.forEach((c) => {
                    var _a;
                    const domain = (_a = c.email) === null || _a === void 0 ? void 0 : _a.split("@")[1];
                    if (domain)
                        customerDomainMap[domain] = c.id;
                });
                while (url) {
                    let response;
                    try {
                        response = yield axios_1.default.get(url, { auth: AUTH });
                    }
                    catch (err) {
                        if (((_a = err.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
                            console.log("Rate limit hit, waiting 10 seconds...");
                            yield new Promise((r) => setTimeout(r, 10000));
                            continue;
                        }
                        throw err;
                    }
                    const tickets = response.data.tickets;
                    const userMap = {};
                    (_b = (response.data.users || [])) === null || _b === void 0 ? void 0 : _b.forEach((u) => {
                        var _a;
                        userMap[u.id] = {
                            email: (_a = u.email) === null || _a === void 0 ? void 0 : _a.toLowerCase(),
                            name: u.name,
                        };
                    });
                    for (const t of tickets.slice(22)) {
                        const ticketNumber = `TCKT-${t.id}`;
                        const email = (_f = (_e = (_d = (_c = t === null || t === void 0 ? void 0 : t.via) === null || _c === void 0 ? void 0 : _c.source) === null || _d === void 0 ? void 0 : _d.from) === null || _e === void 0 ? void 0 : _e.address) === null || _f === void 0 ? void 0 : _f.toLowerCase();
                        const name = (_k = (_j = (_h = (_g = t === null || t === void 0 ? void 0 : t.via) === null || _g === void 0 ? void 0 : _g.source) === null || _h === void 0 ? void 0 : _h.from) === null || _j === void 0 ? void 0 : _j.name) === null || _k === void 0 ? void 0 : _k.toLowerCase();
                        const exists = yield prisma.tickets.findUnique({
                            where: { ticket_number: ticketNumber },
                        });
                        if (exists)
                            continue;
                        /* -------- CUSTOMER DOMAIN MATCH -------- */
                        let customerId = null;
                        if (email && email.includes("@")) {
                            const domain = email.split("@")[1];
                            customerId = customerDomainMap[domain] || null;
                        }
                        /* -------- ASSIGNEE MATCH -------- */
                        let assigneeId = null;
                        const zendeskAssignee = userMap[t.assignee_id];
                        if (zendeskAssignee === null || zendeskAssignee === void 0 ? void 0 : zendeskAssignee.email) {
                            assigneeId = userEmailMap[zendeskAssignee.email] || null;
                        }
                        const slaPriorityName = zendeskToSLAPriority[t.priority] || "Low";
                        const slaPriorityId = slaPriorityMap[slaPriorityName];
                        const formattedStatus = t.status
                            ? t.status.charAt(0).toUpperCase() + t.status.slice(1)
                            : "Open";
                        const ticket = yield prisma.tickets.create({
                            data: {
                                ticket_number: ticketNumber,
                                subject: t.subject || "No Subject",
                                description: t.description || "",
                                email_body_text: t.description || "",
                                priority: slaPriorityId,
                                status: formattedStatus,
                                source: ((_l = t.via) === null || _l === void 0 ? void 0 : _l.channel) || "Email",
                                tags: (_m = t.tags) === null || _m === void 0 ? void 0 : _m.join(","),
                                customer_id: customerId,
                                assigned_agent_id: assigneeId,
                                created_at: new Date(t.created_at),
                                updated_at: new Date(t.updated_at),
                                customer_email: email,
                                customer_name: name,
                            },
                        });
                        yield prisma.tickets.update({
                            where: {
                                id: ticket.id,
                            },
                            data: {
                                ticket_number: (0, GenerateTicket_1.generateTicketNumber)(ticket.id),
                            },
                        });
                        console.log("Ticket Imported:", ticket.ticket_number);
                        yield this.importComments(t.id, ticket.id, userMap, customerDomainMap, userEmailMap);
                    }
                    url = response.data.next_page;
                }
                console.log("Zendesk Ticket Import Completed");
            }
            catch (error) {
                console.error("Ticket Import Error:", error.message);
            }
        });
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
    static importComments(zendeskTicketId, localTicketId, userMap, customerDomainMap, userEmailMap) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            try {
                const url = `${ZENDESK_DOMAIN}/api/v2/tickets/${zendeskTicketId}/comments.json`;
                const response = yield axios_1.default.get(url, { auth: AUTH });
                const comments = response.data.comments;
                for (const c of comments) {
                    let userId = null;
                    let customerId = null;
                    let attachmentUrls = [];
                    const zendeskAuthor = userMap[c.author_id];
                    const authorEmail = (_a = zendeskAuthor === null || zendeskAuthor === void 0 ? void 0 : zendeskAuthor.email) === null || _a === void 0 ? void 0 : _a.toLowerCase();
                    if (authorEmail) {
                        userId = userEmailMap[authorEmail] || null;
                        if (!userId) {
                            const domain = authorEmail.split("@")[1];
                            customerId = customerDomainMap[domain] || null;
                        }
                    }
                    const recipients = ((_d = (_c = (_b = c === null || c === void 0 ? void 0 : c.via) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.from) === null || _d === void 0 ? void 0 : _d.original_recipients) || [];
                    for (const recipient of recipients) {
                        const email = recipient.toLowerCase();
                        /* skip zendesk system emails if needed */
                        if (email.includes("@dcctz.zendesk.com"))
                            continue;
                        const userId = userEmailMap[email] || null;
                        if (userId) {
                            const exists = yield prisma.cc_of_ticket.findFirst({
                                where: {
                                    ticket_id: localTicketId,
                                    user_id: userId,
                                },
                            });
                            if (!exists) {
                                yield prisma.cc_of_ticket.create({
                                    data: {
                                        ticket_id: localTicketId,
                                        user_id: userId,
                                    },
                                });
                            }
                        }
                        else {
                            const exists = yield prisma.cc_of_ticket.findFirst({
                                where: {
                                    ticket_id: localTicketId,
                                    others_of_ticket_cc: email,
                                },
                            });
                            if (!exists) {
                                yield prisma.cc_of_ticket.create({
                                    data: {
                                        ticket_id: localTicketId,
                                        others_of_ticket_cc: email,
                                    },
                                });
                            }
                        }
                    }
                    /* -------- ATTACHMENTS -------- */
                    // if (c.attachments?.length) {
                    //   attachmentUrls = await Promise.all(
                    //     c.attachments.map(async (a: any) => {
                    //       const fileResponse = await axios.get(a.content_url, {
                    //         responseType: "arraybuffer",
                    //         auth: AUTH,
                    //       });
                    //       const buffer = Buffer.from(fileResponse.data);
                    //       return uploadToBackblaze(buffer, a.file_name, a.content_type, {
                    //         folder: `ticket-attachments/ZD-${zendeskTicketId}`,
                    //         processImage: false,
                    //       });
                    //     }),
                    //   );
                    // }
                    if ((_e = c.attachments) === null || _e === void 0 ? void 0 : _e.length) {
                        attachmentUrls = yield Promise.all(c.attachments.map((a) => __awaiter(this, void 0, void 0, function* () {
                            const fileResponse = yield axios_1.default.get(a.content_url, {
                                responseType: "arraybuffer",
                                auth: AUTH,
                            });
                            const buffer = Buffer.from(fileResponse.data);
                            const fileName = `ticket-comment-attachments/ZD-${zendeskTicketId}/${Date.now()}-${a.file_name}`;
                            return (0, blackbaze_1.uploadFile)(buffer, fileName, a.content_type);
                        })));
                    }
                    yield prisma.ticket_comments.create({
                        data: {
                            ticket_id: localTicketId,
                            comment_text: c.html_body || c.body,
                            email_body_text: c.plain_body,
                            comment_type: c.public ? "public" : "internal",
                            is_internal: !c.public,
                            email_message_id: ((_g = (_f = c.metadata) === null || _f === void 0 ? void 0 : _f.system) === null || _g === void 0 ? void 0 : _g.message_id) || null,
                            created_at: new Date(c.created_at),
                            user_id: userId,
                            customer_id: customerId,
                            attachment_urls: attachmentUrls.length
                                ? attachmentUrls.join(",")
                                : null,
                        },
                    });
                }
                console.log(`Comments Imported for ticket ${zendeskTicketId}`);
            }
            catch (error) {
                console.error(`Comment Import Error for ticket ${zendeskTicketId}:`, error.message);
            }
        });
    }
}
exports.ZendeskTicketImportService = ZendeskTicketImportService;
