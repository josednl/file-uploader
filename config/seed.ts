import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum Permission
DO $$ BEGIN
  CREATE TYPE "Permission" AS ENUM ('READ', 'EDIT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FOLDERS
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  ownerId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parentId UUID REFERENCES folders(id) ON DELETE SET NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FILES
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  mimeType VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  ownerId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folderId UUID REFERENCES folders(id) ON DELETE SET NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHARED FOLDERS
CREATE TABLE IF NOT EXISTS shared_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folderId UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission "Permission" NOT NULL DEFAULT 'READ',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(folderId, userId)
);

-- PUBLIC FOLDER SHARES
CREATE TABLE IF NOT EXISTS public_folder_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folderId UUID NOT NULL UNIQUE REFERENCES folders(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expiresAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function main() {
  console.log('Seeding database...');
  const client = new Client({
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    database: process.env.PGDATABASE,
  });

  try {
    await client.connect();
    await client.query(SQL);
    console.log('✅ Seed complete');
  } catch (err) {
    console.error('❌ Error during seeding:', err);
  } finally {
    await client.end();
  }
}

main();
