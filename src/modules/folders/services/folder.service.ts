import { Folder, Permission, Prisma, PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { deleteFileRecordAndFromDisk } from '../../files/services/file.service';
import { folderFullInclude, folderMinimalInclude, folderWithRelationsInclude } from '../constants/folder.includes';

const prisma = new PrismaClient();

// Get root folders for a user
export const getRootFoldersByOwner = async (ownerId: string): Promise<Folder[]> => {
  return prisma.folder.findMany({
    where: { ownerId, parentId: null },
    include: folderWithRelationsInclude,
    orderBy: { createdAt: 'desc' },
  });
};

// Create a new folder
export const createFolder = async (name: string, ownerId: string, parentId?: string | null) => {
  return prisma.folder.create({
    data: { name, ownerId, parentId: parentId || null },
  });
};

// Get all folders for a user
export const getAllFoldersForUser = async (ownerId: string): Promise<Folder[]> => {
  return prisma.folder.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
};

// Get folder by ID with relations
export const getFolderByIdWithContents = async (folderId: string): Promise<Folder | null> => {
  return prisma.folder.findUnique({
    where: { id: folderId },
    include: folderWithRelationsInclude,
  });
};

// Get folder by ID without relations
export async function getFolderById(folderId: string) {
  return prisma.folder.findUnique({
    where: { id: folderId },
  });
}

// Get breadcrumb for a folder
export async function getFolderBreadcrumb(folderId: string): Promise<Folder[]> {
  const breadcrumb: Folder[] = [];

  let current = await prisma.folder.findUnique({ where: { id: folderId } });

  while (current) {
    breadcrumb.unshift(current);
    if (!current.parentId) break;
    current = await prisma.folder.findUnique({ where: { id: current.parentId } });
  }

  return breadcrumb;
}

// Update folder details
export const updateFolder = async (
  folderId: string,
  ownerId: string,
  data: { name?: string; parentId?: string | null }
): Promise<Folder> => {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });

  if (!folder || folder.ownerId !== ownerId) {
    throw new Error('Folder not found or unauthorized');
  }

  return prisma.folder.update({
    where: { id: folderId },
    data: {
      name: data.name,
      parentId: data.parentId ?? null,
    },
  });
};

// Delete folder and its contents recursively
export const deleteFolderAndContents = async (
  folderId: string,
  ownerId: string,
  trx?: Prisma.TransactionClient
): Promise<void> => {
  const client = trx || prisma;

  const folder = await client.folder.findUnique({
    where: { id: folderId },
    include: folderWithRelationsInclude,
  });

  if (!folder) {
    throw new Error('Folder not found or unauthorized');
  }

  const operation = async (trx: Prisma.TransactionClient) => {
    for (const file of folder.files) {
      await deleteFileRecordAndFromDisk(file.id, ownerId, trx);
    }

    for (const child of folder.children) {
      await deleteFolderAndContents(child.id, ownerId, trx);
    }

    await trx.folder.delete({ where: { id: folderId } });
  };

  if (trx) {
    await operation(trx);
  } else {
    await prisma.$transaction(async (trx) => {
      await operation(trx);
    });
  }
};

// Create public share for a folder
export const createPublicShare = async (folderId: string) => {
  const token = crypto.randomBytes(20).toString('hex');

  return prisma.publicFolderShare.create({
    data: { folderId, token },
  });
};

// Get folder by public share token
export const getFolderByPublicToken = async (token: string) => {
  const share = await prisma.publicFolderShare.findUnique({
    where: { token },
    include: {
      folder: { include: folderWithRelationsInclude },
    },
  });

  return share?.folder || null;
};

// Share folder with a user
export const shareFolderWithUser = async (
  folderId: string,
  userEmail: string,
  permission: Permission
) => {
  const user = await prisma.user.findUnique({ where: { email: userEmail } });

  if (!user) throw new Error('User not found');

  const existing = await prisma.sharedFolder.findFirst({
    where: { folderId, userId: user.id },
  });

  if (existing) throw new Error('Folder already shared with this user');

  return prisma.sharedFolder.create({
    data: { folderId, userId: user.id, permission },
  });
};

// Get users with whom a folder is shared
export const getSharedUsersForFolder = async (folderId: string) => {
  return prisma.sharedFolder.findMany({
    where: { folderId },
    include: { user: true },
  });
};

// Get folders shared with a user
export const getFoldersSharedWithUser = async (userId: string) => {
  return prisma.sharedFolder.findMany({
    where: { userId },
    include: {
      folder: {
        include: {
          owner: true,
        },
      },
    },
  });
};

// Check if user has access to folder (directly or via parent)
export async function hasAccessToFolderRecursively(folderId: string, userId: string): Promise<boolean> {
  let current = await prisma.folder.findUnique({
    where: { id: folderId },
    include: { sharedWithUsers: true },
  });

  while (current) {
    if (current.ownerId === userId) return true;

    if (current.sharedWithUsers.some((s) => s.userId === userId)) {
      return true;
    }

    if (!current.parentId) break;

    current = await prisma.folder.findUnique({
      where: { id: current.parentId },
      include: { sharedWithUsers: true },
    });
  }

  return false;
}

// Find folder if user has access
export async function findAccessibleFolder(folderId: string, userId: string): Promise<Folder | null> {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: folderFullInclude,
  });

  if (!folder) return null;

  const hasAccess = await hasAccessToFolderRecursively(folder.id, userId);
  return hasAccess ? folder : null;
}

// Get user's permission for a folder (considering inheritance)
export async function getUserPermissionForFolder(
  folderId: string,
  userId: string
): Promise<'OWNER' | 'EDIT' | 'READ' | null> {
  let current = await prisma.folder.findUnique({
    where: { id: folderId },
    include: { sharedWithUsers: true },
  });

  while (current) {
    if (current.ownerId === userId) return 'OWNER';

    const shared = current.sharedWithUsers.find((s) => s.userId === userId);
    if (shared) return shared.permission;

    if (!current.parentId) break;

    current = await prisma.folder.findUnique({
      where: { id: current.parentId },
      include: { sharedWithUsers: true },
    });
  }

  return null;
}

export async function updateFolderPermission(folderId: string, targetUserId: string, newPermission: 'READ' | 'EDIT') {
  return prisma.sharedFolder.updateMany({
    where: {
      folderId,
      userId: targetUserId,
    },
    data: {
      permission: newPermission,
    },
  });
}

export async function removeSharedUser(folderId: string, targetUserId: string) {
  return prisma.sharedFolder.deleteMany({
    where: {
      folderId,
      userId: targetUserId,
    },
  });
}
