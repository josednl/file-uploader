# File Uploader

## Description

This project is a modern web application for uploading and managing files securely. Users can register, log in, and upload various file types to the server. The app provides a responsive UI and supports persistent session storage using PostgreSQL. It’s built with scalability and developer productivity in mind, leveraging technologies like Prisma, TypeScript, and Tailwind CSS.

---

## Features

- **User Authentication**: Secure sign-up and login functionality using Passport.js.
- **File Uploads**: Upload and manage files through a clean UI using Multer.
- **Session Persistence**: Sessions are stored in a PostgreSQL database for reliability and scalability.
- **Flash Messages**: Provides feedback to users (e.g., errors, success messages) using connect-flash.
- **TypeScript Support**: Full TypeScript support for better developer experience and maintainability.
- **Tailwind Styling**: Styled with Tailwind CSS for a clean and modern user interface.
- **Database ORM**: Prisma is used for schema modeling and database interaction.

---

## Technologies Used

- **Frontend**: EJS, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL
- **Authentication**: Passport.js, Express-session, connect-pg-simple
- **File Uploads**: Multer
- **ORM**: Prisma
- **Utility**: dotenv, connect-flash, uuid

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en)
- [npm](https://docs.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/)

---

### Installation

1. Clone the repository

```bash
git clone https://github.com/josednl/file-uploader.git
cd file-uploader
```

2. Install dependencies

```bash
npm install
```

3. Create a .env file in the root directory with the following variables:

```bash
DATABASE_URL=<Your DB connection URL>
PGHOST=<Your DB host or localhost>
PGUSER=<Your DB user>
PGDATABASE=<Your DB name>
PGPASSWORD=<Your DB password>
PGPORT=<Your DB port>
SESSION_SECRET=<A long, random string>
```

4. Run database migrations and generate Prisma client

```bash
npm run prisma:migrate
npm run prisma:generate
```

5. Start development server

```bash
npm run dev
```

6. Start Tailwind

```bash
npm run build:css
```

7. Open your browser

Navigate to `http://localhost:3000` to view the application
