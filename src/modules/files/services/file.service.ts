import { PrismaClient, File } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(__dirname, '../../../../uploads');

export const findFilesByOwner = async (ownerId: string): Promise<File[]> => {
  return prisma.file.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
};

export const createFileRecord = async (
  fileData: Express.Multer.File,
  ownerId: string,
  folderId?: string | null
): Promise<File> => {
  return prisma.file.create({
    data: {
      name: fileData.originalname,
      path: fileData.filename,
      mimeType: fileData.mimetype,
      size: fileData.size,
      ownerId,
      folderId: folderId ?? null,
    },
  });
};

export const findFileByIdAndOwner = async (
  fileId: string,
  ownerId: string
): Promise<(File & { absolutePath: string }) | null> => {
  const file = await prisma.file.findFirst({
    where: { id: fileId, ownerId },
  });

  if (!file) {
    return null;
  }

  const absolutePath = path.join(UPLOADS_DIR, file.path);

  try {
    await fs.access(absolutePath);
    return { ...file, absolutePath };
  } catch {
    console.warn(`File record found in DB but not on filesystem: ${absolutePath}`);
    return null;
  }
};

export const deleteFileRecordAndFromDisk = async (
  fileId: string,
  ownerId: string
): Promise<boolean> => {
  const file = await prisma.file.findFirst({
    where: { id: fileId, ownerId },
  });

  if (!file) {
    return false;
  }

  // Transaction to ensure both DB record and file are deleted, or neither.
  const filePath = path.join(UPLOADS_DIR, file.path);

  try {
    // Delete file from filesystem first
    await fs.unlink(filePath);
    // Then delete from DB
    await prisma.file.delete({
      where: { id: fileId },
    });
    return true;
  } catch (error) {
    console.error(`Failed to delete file ${fileId} or its record. Path: ${filePath}`, error);
    // Re-throw the error to be caught by the controller
    throw new Error('Error during file deletion process.');
  }
};

export const findFileByIdAndOwnerWithFolder = async (
  fileId: string,
  ownerId: string
): Promise<(File & { folder: { id: string; name: string } | null }) | null> => {
  return prisma.file.findFirst({
    where: { id: fileId, ownerId },
    include: { folder: true },
  });
};

export const findFoldersByOwner = async (ownerId: string) => {
  return prisma.folder.findMany({
    where: { ownerId },
    orderBy: { name: 'asc' },
  });
};

export const moveFileToFolder = async (
  fileId: string,
  ownerId: string,
  folderId: string | null
): Promise<File> => {
  return prisma.file.update({
    where: {
      id: fileId,
      ownerId,
    },
    data: {
      folderId,
    },
  });
};
