# DCC Ticketing System API

A comprehensive Data Center/Customer Care ticketing system built with Node.js, Express, TypeScript, and Prisma ORM.

## 🎯 Overview

The DCC Ticketing System is designed to manage customer support tickets, user management, agent assignments, and ticket lifecycle operations. It provides a robust API for handling support operations in data centers and customer care environments.

## ✨ Key Features

- 🎫 **Ticket Management** - Create, update, assign, and track support tickets
- 👥 **User Management** - Manage customers, agents, and administrators
- 🔐 **Authentication & Authorization** - JWT-based auth with role-based access control
- 📎 **File Attachments** - Support for ticket attachments
- 🔄 **Ticket Allocation** - Intelligent ticket assignment to agents
- 📊 **Analytics & Reporting** - Ticket statistics and performance metrics
- 🔍 **Advanced Search & Filtering** - Find tickets by status, priority, category, etc.
- 📱 **RESTful API** - Clean, well-documented REST endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQL Server with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Logging**: Custom logger implementation
- **Validation**: Built-in request validation

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- SQL Server database
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd dcc-ticketing-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="sqlserver://localhost:1433;database=DCC_Ticketing;user=sa;password=yourpassword;encrypt=true;trustServerCertificate=true"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key"

# Server Configuration
PORT=4000
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

### 4. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

### 5. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start at `http://localhost:4000`

## 📚 API Documentation

### 🔐 Authentication Endpoints

| Method | Endpoint                    | Description         |
| ------ | --------------------------- | ------------------- |
| `POST` | `/api/auth/register`        | Register new user   |
| `POST` | `/api/auth/login`           | User login          |
| `GET`  | `/api/auth/profile`         | Get user profile    |
| `PUT`  | `/api/auth/profile`         | Update user profile |
| `PUT`  | `/api/auth/change-password` | Change password     |

### 🎫 Ticket Management

| Method   | Endpoint                  | Description                    |
| -------- | ------------------------- | ------------------------------ |
| `GET`    | `/api/tickets`            | Get all tickets (with filters) |
| `GET`    | `/api/tickets/:id`        | Get ticket by ID               |
| `POST`   | `/api/tickets`            | Create new ticket              |
| `PUT`    | `/api/tickets/:id`        | Update ticket                  |
| `DELETE` | `/api/tickets/:id`        | Delete ticket                  |
| `PUT`    | `/api/tickets/:id/assign` | Assign ticket to agent         |
| `PUT`    | `/api/tickets/:id/status` | Update ticket status           |
| `GET`    | `/api/tickets/stats`      | Get ticket statistics          |

### 👥 User Management

| Method   | Endpoint           | Description            |
| -------- | ------------------ | ---------------------- |
| `GET`    | `/api/users`       | Get all users          |
| `GET`    | `/api/users/:id`   | Get user by ID         |
| `POST`   | `/api/users`       | Create new user        |
| `PUT`    | `/api/users/:id`   | Update user            |
| `DELETE` | `/api/users/:id`   | Delete/deactivate user |
| `GET`    | `/api/users/stats` | Get user statistics    |

### 📎 File Attachments

| Method   | Endpoint                       | Description            |
| -------- | ------------------------------ | ---------------------- |
| `POST`   | `/api/tickets/:id/attachments` | Upload attachment      |
| `GET`    | `/api/tickets/:id/attachments` | Get ticket attachments |
| `DELETE` | `/api/attachments/:id`         | Delete attachment      |

## 🔍 Query Parameters

### Ticket Filtering

```
GET /api/tickets?page=1&limit=10&status=Open&priority=High&search=network
```

| Parameter    | Type   | Description                   |
| ------------ | ------ | ----------------------------- |
| `page`       | number | Page number (default: 1)      |
| `limit`      | number | Items per page (max: 100)     |
| `search`     | string | Search in subject/description |
| `status`     | string | Filter by status              |
| `priority`   | string | Filter by priority            |
| `category`   | string | Filter by category            |
| `assignedTo` | number | Filter by assigned user ID    |
| `createdBy`  | number | Filter by creator user ID     |
| `dateFrom`   | string | Start date (ISO format)       |
| `dateTo`     | string | End date (ISO format)         |

## 📊 Data Models

### Ticket Statuses

- `Open` - Newly created ticket
- `In Progress` - Being worked on
- `Pending` - Waiting for customer response
- `Resolved` - Issue fixed
- `Closed` - Ticket completed

### Ticket Priorities

- `Low` - Non-urgent issues
- `Medium` - Standard priority
- `High` - Urgent issues
- `Critical` - System down/critical issues

### User Roles

- `Admin` - Full system access
- `Manager` - Department management
- `Agent` - Handle tickets
- `Customer` - Create tickets

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access Control** - Different permissions per role
- **Password Hashing** - bcryptjs with salt rounds
- **Input Validation** - Request validation and sanitization
- **SQL Injection Prevention** - Prisma ORM protection
- **CORS Configuration** - Cross-origin request handling

## 🏗️ Project Structure

```
src/
├── controllers/          # Request handlers
│   ├── auth.controller.ts
│   ├── ticket.controller.ts
│   └── user.controller.ts
├── middlewares/          # Custom middleware
│   ├── auth.middleware.ts
│   └── validation.middleware.ts
├── routes/              # API routes
│   ├── auth.routes.ts
│   ├── ticket.routes.ts
│   └── user.routes.ts
├── utils/               # Utility functions
│   └── prisma.config.ts
├── config/              # Configuration files
│   └── logger.ts
└── types/               # TypeScript type definitions
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts
```

## 📈 Performance & Monitoring

- **Database Indexing** - Optimized queries with proper indexes
- **Pagination** - Efficient data loading
- **Caching** - Response caching for frequently accessed data
- **Logging** - Comprehensive request/error logging
- **Health Checks** - Server status monitoring

## 🔧 Configuration

### Environment Variables

| Variable       | Description                  | Default     |
| -------------- | ---------------------------- | ----------- |
| `DATABASE_URL` | SQL Server connection string | Required    |
| `JWT_SECRET`   | JWT signing secret           | Required    |
| `PORT`         | Server port                  | 4000        |
| `NODE_ENV`     | Environment mode             | development |
| `LOG_LEVEL`    | Logging level                | info        |

### Database Configuration

The system uses SQL Server with Prisma ORM. Key tables include:

- `Users` - System users (agents, customers, admins)
- `Tickets` - Support tickets
- `TicketAllocations` - Ticket assignment history
- `TicketAttachments` - File attachments
- `UserSessions` - User session management

## 📋 Example Requests

### Create a New Ticket

```bash
curl -X POST http://localhost:4000/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subject": "Network connectivity issue",
    "description": "Unable to connect to internal servers",
    "priority": "High",
    "category": "Network"
  }'
```

### Get Tickets with Filters

```bash
curl -X GET "http://localhost:4000/api/tickets?status=Open&priority=High&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Assign Ticket to Agent

```bash
curl -X PUT http://localhost:4000/api/tickets/123/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "assignedTo": 456
  }'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](../../issues) page
2. Review the API documentation
3. Check server logs for error details
4. Test the health endpoint: `GET /health`

## 🚧 Roadmap

- [ ] Real-time notifications
- [ ] Email integration
- [ ] Advanced reporting dashboard
- [ ] Mobile app support
- [ ] Multi-tenant support
- [ ] Integration with external systems
- [ ] Automated ticket routing
- [ ] SLA management

## 👥 Team

- **Backend Development** - API and database design
- **Frontend Integration** - React/Vue.js compatibility
- **DevOps** - Deployment and infrastructure
- **QA** - Testing and quality assurance

---

**Built with ❤️ for efficient customer support operations**
