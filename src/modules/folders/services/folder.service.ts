import { Folder, PrismaClient } from '@prisma/client';
import { deleteFileRecordAndFromDisk } from '../../files/services/file.service';
import fs from 'fs/promises';
import path from 'path';

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
      parentId: data.parentId ?? folder.parentId,
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
