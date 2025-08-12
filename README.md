# HRMS API Collection

A comprehensive Postman collection for the HR Management System (HRMS) API.

## 📋 Collection Overview

This collection includes all endpoints for:

- 🔐 **Authentication** (Register/Login)
- 🤖 **AI-Powered Employee Creation** (Natural language processing)
- 👥 **Employee Management** (CRUD operations)
- 👤 **User Management** (CRUD operations)
- 📊 **Statistics & Reports** (Dashboard data)
- 🔍 **Health Checks** (Server status)

## 🚀 Quick Start

### 1. Import the Collection

1. Open **Postman**
2. Click **Import** button
3. Select the `HRMS_API_Collection.json` file
4. The collection will be imported with all endpoints

### 2. Set Up Environment Variables

Create a new environment in Postman with these variables:

| Variable      | Value                   | Description                     |
| ------------- | ----------------------- | ------------------------------- |
| `base_url`    | `http://localhost:4000` | Your server URL                 |
| `api_version` | `v1`                    | API version                     |
| `auth_token`  | (leave empty)           | Will be auto-filled after login |

### 3. Start Your Server

```bash
npm start
```

Your server should be running at `http://localhost:4000`

## 🔐 Authentication Flow

### Step 1: Register a User

1. Go to **🔐 Authentication** folder
2. Run **"Register User"** request
3. This creates a new user account

### Step 2: Login

1. Run **"Login User"** request
2. The auth token will be automatically saved
3. All subsequent requests will use this token

## 🤖 AI Employee Creation

### Natural Language Employee Creation

Use the **"Create Employee via AI"** request to create employees using natural language:

**Example Prompt:**

```json
{
  "prompt": "Please create new records for three new hires. First, John Doe, a Software Engineer in the Engineering department starting on 2025-01-15, his email is john.doe@company.com. Second, Jane Smith, a Product Manager in the Product department starting on 2025-01-20, her email is jane.smith@company.com."
}
```

**Features:**

- ✅ Automatic email validation
- ✅ Smart department mapping
- ✅ Date formatting
- ✅ Duplicate detection
- ✅ Multiple employees in one request

## 👥 Employee Management

### Available Endpoints:

| Method   | Endpoint                                                                             | Description                         |
| -------- | ------------------------------------------------------------------------------------ | ----------------------------------- |
| `GET`    | `/api/v1/employees`                                                                  | Get all employees (with pagination) |
| `GET`    | `/api/v1/employees?page=1&limit=10&department=Engineering&status=active&search=john` | Get employees with filters          |
| `GET`    | `/api/v1/employees/1`                                                                | Get employee by ID                  |
| `PUT`    | `/api/v1/employees/1`                                                                | Update employee                     |
| `DELETE` | `/api/v1/employees/1`                                                                | Delete employee                     |

### Query Parameters for Employee List:

| Parameter    | Type   | Description                            |
| ------------ | ------ | -------------------------------------- |
| `page`       | number | Page number (default: 1)               |
| `limit`      | number | Items per page (default: 10, max: 100) |
| `department` | string | Filter by department                   |
| `status`     | string | Filter by status (`active`/`inactive`) |
| `search`     | string | Search in name, email, job title       |

## 👤 User Management

### Available Endpoints:

| Method   | Endpoint                                    | Description                     |
| -------- | ------------------------------------------- | ------------------------------- |
| `GET`    | `/api/v1/users`                             | Get all users (with pagination) |
| `GET`    | `/api/v1/users?page=1&limit=10&search=john` | Get users with filters          |
| `GET`    | `/api/v1/users/1`                           | Get user by ID                  |
| `POST`   | `/api/v1/users`                             | Create new user                 |
| `PUT`    | `/api/v1/users/1`                           | Update user                     |
| `DELETE` | `/api/v1/users/1`                           | Delete user                     |

### Query Parameters for User List:

| Parameter | Type   | Description                            |
| --------- | ------ | -------------------------------------- |
| `page`    | number | Page number (default: 1)               |
| `limit`   | number | Items per page (default: 10, max: 100) |
| `search`  | string | Search in name and email               |

### User Creation/Update Fields:

| Field      | Type   | Required | Description                             |
| ---------- | ------ | -------- | --------------------------------------- |
| `name`     | string | Yes      | User's full name                        |
| `email`    | string | Yes      | User's email address                    |
| `password` | string | Yes\*    | User's password (required for creation) |

\*Note: Password is required for user creation but optional for updates.

## 📊 Statistics & Reports

### Employee Statistics

- **Endpoint:** `GET /api/v1/employees/stats`
- **Returns:** Total employees, active/inactive counts, department breakdown

### Department List

- **Endpoint:** `GET /api/v1/departments`
- **Returns:** All departments with employee counts

### User Statistics

- **Endpoint:** `GET /api/v1/users/stats`
- **Returns:** Total users, users created this month/year

## 🔍 Health & Status

### Health Check

- **Endpoint:** `GET /health`
- **Returns:** Server status and timestamp

## 📚 API Documentation

### Swagger UI

- **URL:** `http://localhost:4000/docs`
- **Features:** Interactive API documentation with testing interface

## 🛠️ Advanced Features

### Auto-Authentication

The collection includes scripts that:

- ✅ Automatically save auth tokens from login responses
- ✅ Apply auth tokens to all requests
- ✅ Log response times and status codes

### Environment Variables

The collection uses these variables:

- `{{base_url}}` - Your server URL
- `{{api_version}}` - API version (v1)
- `{{auth_token}}` - Authentication token

## 📝 Example Requests

### Create Employee via AI

```bash
curl -X POST http://localhost:4000/api/v1/employees \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a new employee record for Sarah Wilson, who is joining as a Marketing Specialist in the Marketing department. Her email is sarah.wilson@company.com and she starts on 2025-01-25."
  }'
```

### Get Employees with Filters

```bash
curl -X GET "http://localhost:4000/api/v1/employees?page=1&limit=10&department=Engineering&status=active&search=john"
```

### Get Employee Statistics

```bash
curl -X GET http://localhost:4000/api/v1/employees/stats
```

### Create User

```bash
curl -X POST http://localhost:4000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@company.com",
    "password": "password123"
  }'
```

### Get Users with Search

```bash
curl -X GET "http://localhost:4000/api/v1/users?page=1&limit=10&search=john"
```

### Get User Statistics

```bash
curl -X GET http://localhost:4000/api/v1/users/stats
```

## 🔧 Troubleshooting

### Common Issues:

1. **Server Not Running**

   - Make sure your server is started with `npm start`
   - Check if port 4000 is available

2. **Authentication Errors**

   - Run the login request first
   - Check if the auth token is being saved

3. **AI Features Not Working**

   - Set `GEMINI_API_KEY` in your `.env` file
   - Get API key from: https://makersuite.google.com/app/apikey

4. **Database Issues**
   - Run Prisma migrations: `npx prisma migrate dev`
   - Check database connection

## 📞 Support

If you encounter any issues:

1. Check the server logs
2. Verify your environment variables
3. Test the health endpoint first
4. Check the Swagger documentation at `/docs`

## 🎯 Next Steps

1. **Import the collection** into Postman
2. **Set up environment variables**
3. **Start your server**
4. **Test the health endpoint**
5. **Register and login**
6. **Start creating employees!**

---

**Happy API Testing! 🚀**
