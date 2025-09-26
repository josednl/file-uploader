import { PrismaClient, File, Prisma } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { getUserPermissionForFolder } from '../../folders/services/folder.service';

const prisma = new PrismaClient();
const UPLOADS_DIR = path.resolve('uploads');

// Get file by ID
export async function getFileById(fileId: string) {
  return await prisma.file.findUnique({
    where: { id: fileId },
  });
}

// Get file by ID with folder info
export const getFileByIdWithFolder = async (fileId: string) => {
  return prisma.file.findUnique({
    where: { id: fileId },
    include: {
      folder: true,
    },
  });
};

// Get user's files
export const findFilesByOwner = async (ownerId: string): Promise<File[]> => {
  return prisma.file.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
};

// Create uploaded file record
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

// Delete file record and remove from disk
export const deleteFileRecordAndFromDisk = async (
  fileId: string,
  userId: string,
  trx?: Prisma.TransactionClient
): Promise<void> => {
  const client = trx || prisma;

  const file = await client.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('File not found or unauthorized');
  }

  const filePath = path.join(UPLOADS_DIR, file.path);

  const deleteOperation = async (tx: Prisma.TransactionClient) => {
    await fs.unlink(filePath).catch(err => {
      console.warn(`Failed to delete file from disk: ${filePath}`, err.message);
    });

    await tx.file.delete({
      where: { id: fileId },
    });
  };

  if (trx) {
    await deleteOperation(client);
  } else {
    await prisma.$transaction(deleteOperation);
  }
};

// Find file by ID and owner, including folder info
export const findFileByIdAndOwnerWithFolder = async (
  fileId: string,
  ownerId: string
): Promise<(File & { folder: { id: string; name: string } | null }) | null> => {
  return prisma.file.findFirst({
    where: { id: fileId, ownerId },
    include: { folder: { select: { id: true, name: true } } },
  });
};

// Move file to another folder
export const moveFileToFolder = async (
  fileId: string,
  ownerId: string,
  folderId: string | null
): Promise<File> => {
  return prisma.file.update({
    where: { id: fileId, ownerId },
    data: { folderId },
  });
};

// Find file by ID and check if user has access (owner or via shared folder)
export const findAccessibleFile = async (fileId: string, userId: string) => {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: {
      folder: {
        include: {
          sharedWithUsers: true,
          publicShare: true,
        },
      },
    },
  });

  if (!file) return null;

  if (file.ownerId === userId) {
    return { file, permission: 'OWNER' as const };
  }

  if (!file.folderId) {
    return null;
  }

  const permission = await getUserPermissionForFolder(file.folderId, userId);
  if (!permission) return null;

  return { file, permission };
};
