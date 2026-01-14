import { PrismaClient } from "@prisma/client";
import emailService from "types/sendEmailComment";

const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

export async function getFeedback(req: any, res: any): Promise<void> {
  try {
    const { t: token, v } = req.query as { t?: string; v?: string };
    if (!token || typeof v === "undefined") {
      res.status(400).send("Invalid link");
      return;
    }

    // Verify the signed link
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      res.status(400).send("Feedback link expired or invalid.");
      return;
    }

    const score = Number(v); // 1 (satisfied) or 0 (not satisfied)
    if (Number.isNaN(score) || (score !== 0 && score !== 1)) {
      res.status(400).send("Invalid score");
      return;
    }

    const { ticketId /*, email*/ } = payload as {
      ticketId: number;
      email?: string;
    };

    await prisma.$transaction(async (tx) => {
      // 1) Make sure ticket exists and is still awaiting feedback (status = 'Resolved')
      const ticket = await tx.tickets.findUnique({
        where: { id: ticketId },
        include: {
          users: true,
          customers: true,
          other_tickets: true,
          tickets: true,
          categories: true,
          agents_user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              manager: true,
            },
          },
          ticket_sla_history: true,
          sla_priority: true,
        },
      });
      if (!ticket) {
        throw Object.assign(new Error("Ticket not found"), { status: 400 });
      }

      // 2) Single-use guard: proceed ONLY if status is 'Resolved'
      // Use a conditional update so only the first click wins.
      const nextStatus = score === 1 ? "Closed" : "ReOpen";

      const result = await tx.tickets.updateMany({
        where: { id: ticketId, status: "Resolved" }, // only update if still unresolved feedback
        data: {
          status: nextStatus,
          updated_at: new Date(),
        },
      });

      if (result.count === 0) {
        // Someone already used the link (status no longer 'Resolved')
        throw Object.assign(
          new Error(
            "This feedback link has already been used or is no longer valid."
          ),
          { status: 410 }
        );
      }

      if (nextStatus === "ReOpen" && result) {
        const comments = await tx.ticket_comments.create({
          data: {
            ticket_id: ticket.id,
            // user_id: Number(ticket?.agents_user?.id),
            comment_text: `Ticket ${ticket.ticket_number} was reopened by the customer due to dissatisfaction with the resolution. 
The ticket remains assigned to Agent ${ticket?.agents_user?.first_name} ${ticket?.agents_user?.last_name}.`,
            comment_type: "System",
            is_internal: true,
          },
          include: {
            ticket_comment_users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        });

        await tx.notifications.create({
          data: {
            user_id: Number(ticket?.agents_user?.manager?.id),
            type: "ticket_reopen",
            title: `Ticket ${ticket.ticket_number} was reopened by the customer.`,
            message: `Ticket ${ticket.ticket_number} was reopened by the customer due to dissatisfaction with the resolution. 
The ticket remains assigned to Agent ${ticket?.agents_user?.first_name} ${ticket?.agents_user?.last_name}.`,
            ticket_id: ticket.id,
            read: false,
            sent_via: "in_app",
          },
        });
        await tx.notifications.create({
          data: {
            user_id: Number(ticket?.agents_user?.id),
            type: "ticket_reopen",
            title: `Ticket ${ticket.ticket_number} was reopened by the customer.`,
            message: `Ticket ${ticket.ticket_number} was reopened by the customer due to dissatisfaction with the resolution. 
The ticket remains assigned to Agent ${ticket?.agents_user?.first_name} ${ticket?.agents_user?.last_name}.`,
            ticket_id: ticket.id,
            read: false,
            sent_via: "in_app",
          },
        });
        const emailRs = emailService.sendCommentEmailToCustomer(
          ticket,
          { ...comments, mailCustomer: false },
          //           `Ticket ${ticket.ticket_number} was reopened by the customer due to dissatisfaction with the resolution.
          // The ticket remains assigned to Agent ${ticket?.agents_user?.first_name} ${ticket?.agents_user?.last_name}.`,
          [ticket?.agents_user?.manager?.email]
        );
      }

      // 3) (Optional) if satisfied & never had closed_at, set it
      if (score === 1 && !ticket.closed_at) {
        await tx.tickets.update({
          where: { id: ticketId },
          data: { closed_at: new Date() },
        });
      }
    });

    // Thank-you page with optional comment form
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You for Your Feedback!</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            overflow: hidden;
            position: relative;
        }

        .background-shapes {
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 0;
        }

        .shape {
            position: absolute;
            border-radius: 50%;
            opacity: 0.1;
            animation: float 20s infinite ease-in-out;
        }

        .shape:nth-child(1) {
            width: 300px;
            height: 300px;
            background: #fff;
            top: 10%;
            left: 10%;
            animation-delay: 0s;
        }

        .shape:nth-child(2) {
            width: 200px;
            height: 200px;
            background: #ffd700;
            top: 60%;
            right: 15%;
            animation-delay: 2s;
        }

        .shape:nth-child(3) {
            width: 150px;
            height: 150px;
            background: #ff6b9d;
            bottom: 20%;
            left: 20%;
            animation-delay: 4s;
        }

        @keyframes float {
            0%, 100% {
                transform: translateY(0) translateX(0);
            }
            33% {
                transform: translateY(-30px) translateX(20px);
            }
            66% {
                transform: translateY(20px) translateX(-20px);
            }
        }

        .container {
            text-align: center;
            background: rgba(255, 255, 255, 0.95);
            padding: 60px 50px;
            border-radius: 30px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            position: relative;
            z-index: 1;
            animation: slideUp 0.8s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .checkmark {
            width: 100px;
            height: 100px;
            margin: 0 auto 30px;
            position: relative;
            animation: scaleIn 0.5s ease-out 0.3s both;
        }

        @keyframes scaleIn {
            from {
                transform: scale(0);
            }
            to {
                transform: scale(1);
            }
        }

        .checkmark-circle {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
            }
            50% {
                box-shadow: 0 0 0 20px rgba(102, 126, 234, 0);
            }
        }

        .checkmark-icon {
            width: 45px;
            height: 70px;
            border: 4px solid white;
            border-left: none;
            border-top: none;
            transform: rotate(45deg);
            margin-bottom: 10px;
            animation: checkDraw 0.5s ease-out 0.6s both;
        }

        @keyframes checkDraw {
            from {
                width: 0;
                height: 0;
            }
            to {
                width: 40px;
                height: 70px;
            }
        }

        h1 {
            font-size: 2.5em;
            color: #333;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: fadeIn 0.8s ease-out 0.8s both;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        p {
            font-size: 1.1em;
            color: #666;
            line-height: 1.6;
            margin-bottom: 30px;
            animation: fadeIn 0.8s ease-out 1s both;
        }

        .stars {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 30px;
            animation: fadeIn 0.8s ease-out 1.2s both;
        }

        .star {
            font-size: 2em;
            color: #ffd700;
            animation: starPop 0.5s ease-out backwards;
        }

        .star:nth-child(1) { animation-delay: 1.3s; }
        .star:nth-child(2) { animation-delay: 1.4s; }
        .star:nth-child(3) { animation-delay: 1.5s; }
        .star:nth-child(4) { animation-delay: 1.6s; }
        .star:nth-child(5) { animation-delay: 1.7s; }

        @keyframes starPop {
            from {
                transform: scale(0) rotate(0deg);
            }
            50% {
                transform: scale(1.2) rotate(180deg);
            }
            to {
                transform: scale(1) rotate(360deg);
            }
        }

        .button {
            display: inline-block;
            padding: 15px 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1.1em;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            animation: fadeIn 0.8s ease-out 1.4s both;
        }

        .button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.6);
        }

        .confetti {
            position: absolute;
            width: 10px;
            height: 10px;
            background: #ffd700;
            animation: confettiFall 3s ease-out forwards;
        }

        @keyframes confettiFall {
            to {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
            }
        }
    </style>
</head>
<body>
    <div class="background-shapes">
        <div class="shape"></div>
        <div class="shape"></div>
        <div class="shape"></div>
    </div>

    <div class="container">
        <div class="checkmark">
            <div class="checkmark-circle">
                <div class="checkmark-icon"></div>
            </div>
        </div>
        
        <h1>Thank You!</h1>
        
        <p>Your feedback means the world to us. We appreciate you taking the time to share your thoughts and help us improve.</p>
        
    </div>

    <script>
        function createConfetti() {
            const colors = ['#667eea', '#764ba2', '#ffd700', '#ff6b9d', '#4facfe'];
            for (let i = 0; i < 50; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';
                    confetti.style.left = Math.random() * 100 + '%';
                    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.animationDelay = Math.random() * 0.5 + 's';
                    confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
                    document.body.appendChild(confetti);
                    
                    setTimeout(() => confetti.remove(), 3000);
                }, i * 30);
            }
        }

        window.addEventListener('load', () => {
            setTimeout(createConfetti, 1000);
        });
    </script>
</body>
</html>
    `);
  } catch (err: any) {
    console.error(err);
    const status =
      Number(err?.status) ||
      (/Ticket not found/i.test(err?.message) ? 400 : 500);
    const msg =
      err?.message && typeof err.message === "string"
        ? err.message
        : "Something went wrong.";
    res.status(status).send(msg);
  }
}

// router.post('/feedback/comment', express.urlencoded({ extended: false }), async (req, res) => {
//   try {
//     const { t: token, comment } = req.body;
//     if (!token) return res.status(400).send('Invalid request');
//     const payload = jwt.verify(token, JWT_SECRET);

//     const tokenId = payload.jti || token.slice(-24);
//     const conn = await pool.getConnection();
//     try {
//       await conn.execute(
//         `UPDATE ticket_feedback SET comment = ?
//          WHERE token_id = ?`,
//         [comment || '', tokenId]
//       );
//     } finally {
//       conn.release();
//     }
//     res.send('Comment saved. Thank you!');
//   } catch (e) {
//     res.status(400).send('Invalid or expired link.');
//   }
// });

// module.exports = router;
