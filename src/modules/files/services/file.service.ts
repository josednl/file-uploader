import { PrismaClient, File, Folder, Prisma } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { hasAccessToFolderRecursively } from '../../folders/services/folder.service';

const prisma = new PrismaClient();
const UPLOADS_DIR = path.resolve('uploads');

// 📄 Obtener archivos del usuario
export const findFilesByOwner = async (ownerId: string): Promise<File[]> => {
  return prisma.file.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
};

// 📤 Crear registro de archivo subido
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

// 🗑 Eliminar archivo (registro + disco)
export const deleteFileRecordAndFromDisk = async (
  fileId: string,
  userId: string,
  trx?: Prisma.TransactionClient
): Promise<void> => {
  const client = trx || prisma;

  const file = await client.file.findUnique({
    where: { id: fileId },
  });

  if (!file || file.ownerId !== userId) {
    throw new Error('File not found or unauthorized');
  }

  const filePath = path.join(UPLOADS_DIR, file.path);

  const deleteOperation = async (tx: Prisma.TransactionClient) => {
    await fs.unlink(filePath).catch((err) => {
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

// 🔍 Buscar archivo por ID con su carpeta (solo si es del dueño)
export const findFileByIdAndOwnerWithFolder = async (
  fileId: string,
  ownerId: string
): Promise<(File & { folder: { id: string; name: string } | null }) | null> => {
  return prisma.file.findFirst({
    where: { id: fileId, ownerId },
    include: { folder: { select: { id: true, name: true } } },
  });
};

// 📁 Obtener carpetas para mover archivos
export const findFoldersByOwner = async (ownerId: string) => {
  return prisma.folder.findMany({
    where: { ownerId },
    orderBy: { name: 'asc' },
  });
};

// 🔁 Mover archivo a otra carpeta
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

// 🔒 Buscar archivo con acceso válido para el usuario
export const findAccessibleFile = async (
  fileId: string,
  userId: string
): Promise<(File & { folder?: Folder | null }) | null> => {
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

  if (file.ownerId === userId) return file;

  if (file.folderId) {
    const hasAccess = await hasAccessToFolderRecursively(file.folderId, userId);
    if (hasAccess) return file;
  }

  return null;
};
