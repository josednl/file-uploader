/*
  Warnings:

  - You are about to drop the column `shared` on the `folders` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."Permission" AS ENUM ('READ', 'EDIT');

-- AlterTable
ALTER TABLE "public"."folders" DROP COLUMN "shared";

-- CreateTable
CREATE TABLE "public"."public_folder_shares" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_folder_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shared_folders" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permission" "public"."Permission" NOT NULL DEFAULT 'READ',

    CONSTRAINT "shared_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_folder_shares_folderId_key" ON "public"."public_folder_shares"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX "public_folder_shares_token_key" ON "public"."public_folder_shares"("token");

-- AddForeignKey
ALTER TABLE "public"."public_folder_shares" ADD CONSTRAINT "public_folder_shares_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "public"."folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shared_folders" ADD CONSTRAINT "shared_folders_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "public"."folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shared_folders" ADD CONSTRAINT "shared_folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
