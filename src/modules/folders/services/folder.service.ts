import { Folder, Permission, PrismaClient } from '@prisma/client';
import { deleteFileRecordAndFromDisk } from '../../files/services/file.service';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const getRootFoldersByOwner = async (ownerId: string): Promise<Folder[]> => {
  return prisma.folder.findMany({
    where: {
      ownerId,
      parentId: null,
    },
    include: {
      children: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export async function createFolder(name: string, ownerId: string, parentId?: string | null) {
  return prisma.folder.create({
    data: {
      name,
      ownerId,
      parentId: parentId || null,
    },
  });
}

export async function getAllFoldersForUser(ownerId: string): Promise<Folder[]> {
  return prisma.folder.findMany({ where: { ownerId } });
}

export async function getFolderByIdWithContents(folderId: string): Promise<Folder | null> {
  return prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      files: true,
      children: true,
    },
  });
}

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

export const updateFolder = async (
  folderId: string,
  ownerId: string,
  data: { name?: string; parentId?: string | null }
): Promise<Folder> => {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
  });

  if (!folder || folder.ownerId !== ownerId) throw new Error('Folder not found or unauthorized');

  return prisma.folder.update({
    where: { id: folderId },
    data: {
      name: data.name,
      parentId: data.parentId ?? null,
    },
  });
};


export const deleteFolderAndContents = async (
  folderId: string,
  ownerId: string
): Promise<void> => {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      files: true,
      children: true,
    },
  });

  if (!folder || folder.ownerId !== ownerId) {
    throw new Error('Folder not found or unauthorized');
  }

  // Delete files from this folder
  for (const file of folder.files) {
    await deleteFileRecordAndFromDisk(file.id, ownerId);
  }

  // Recursively delete child folders
  for (const childFolder of folder.children) {
    await deleteFolderAndContents(childFolder.id, ownerId);
  }

  // Delete the folder
  await prisma.folder.delete({
    where: { id: folderId },
  });
};

export const createPublicShare = async (folderId: string) => {
  const token = crypto.randomBytes(20).toString('hex');

  return prisma.publicFolderShare.create({
    data: {
      folderId,
      token,
    },
  });
}

export const getFolderByPublicToken = async (token: string) => {
  const share = await prisma.publicFolderShare.findUnique({
    where: { token },
    include: { folder: { include: { files: true, children: true } } },
  });

  return share ? share.folder : null;
}

export const shareFolderWithUser = async (
  folderId: string,
  userEmail: string,
  permission: Permission
) => {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if already shared
  const existing = await prisma.sharedFolder.findFirst({
    where: {
      folderId,
      userId: user.id,
    },
  });

  if (existing) {
    throw new Error('Folder already shared with this user');
  }

  return prisma.sharedFolder.create({
    data: {
      folderId,
      userId: user.id,
      permission,
    },
  });
};

export const getSharedUsersForFolder = async (folderId: string) => {
  return prisma.sharedFolder.findMany({
    where: { folderId },
    include: {
      user: true,
    },
  });
};

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

export const getAccessibleFolder = async (folderId: string, userId: string) => {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      files: true,
      children: true,
      owner: true,
    },
  });

  if (!folder) return null;

  // Verify if you are the owner or have shared access
  if (folder.ownerId === userId) return folder;

  const shared = await prisma.sharedFolder.findFirst({
    where: {
      folderId,
      userId,
    },
  });

  if (shared) return folder;

  return null;
};

export async function getUserPermissionForFolder(folderId: string, userId: string): Promise<'OWNER' | 'EDIT' | 'READ' | null> {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      sharedWithUsers: {
        where: { userId },
      },
    },
  });

  if (!folder) return null;

  if (folder.ownerId === userId) return 'OWNER';

  const shared = folder.sharedWithUsers[0];
  return shared?.permission ?? null;
}
