import { Request, Response } from 'express';
import { User as PrismaUser } from '@prisma/client';
import {
  getRootFoldersByOwner,
  createFolder,
  updateFolder,
  getAllFoldersForUser,
  getFolderByIdWithContents,
  getFolderBreadcrumb,
  deleteFolderAndContents
} from '../services/folder.service';

export const listRootFolders = async (req: Request, res: Response) => {
  const ownerId = (req.user as PrismaUser).id;

  try {
    const folders = await getRootFoldersByOwner(ownerId);
    res.render('folders/index', { folders });
  } catch (error) {
    console.error('Error fetching root folders:', error);
    req.flash('error', 'Failed to load folders');
    res.redirect('/dashboard');
  }
};

export async function createFolderForm(req: Request, res: Response) {
  const ownerId = (req.user as PrismaUser).id;
  const folders = await getAllFoldersForUser(ownerId);
  res.render('folders/create', { folders });
}

export const createFolderHandler = async (req: Request, res: Response) => {
  const ownerId = (req.user as PrismaUser).id;
  const { name, parentId } = req.body;

  try {
    await createFolder(name, ownerId, parentId);

    req.flash('success', 'Folder created successfully');
    res.redirect(parentId ? `/folders/${parentId}` : '/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to create folder');
    res.redirect('/folders/create');
  }
};

export const viewFolder = async (req: Request, res: Response) => {
  const folderId = req.params.id;

  const folder = await getFolderByIdWithContents(folderId);

  if (!folder) {
    req.flash('error', 'Folder not found');
    return res.redirect('/dashboard');
  }

  const breadcrumb = await getFolderBreadcrumb(folderId);
  res.render('folders/show', { folder, breadcrumb });
};

// GET /folders/edit/:id
export const editFolderForm = async (req: Request, res: Response) => {
  const ownerId = (req.user as PrismaUser).id;
  const folderId = req.params.id;

  const folder = await getFolderByIdWithContents(folderId);
  const folders = await getAllFoldersForUser(ownerId);

  if (!folder) {
    req.flash('error', 'Folder not found');
    return res.redirect('/dashboard');
  }

  res.render('folders/edit', { folder, folders }); // View para editar carpeta
};

// POST /folders/edit/:id
export const updateFolderHandler = async (req: Request, res: Response) => {
  const ownerId = (req.user as PrismaUser).id;
  const folderId = req.params.id;
  const { name, parentId } = req.body;

  try {
    await updateFolder(folderId, ownerId, { name, parentId });
    req.flash('success', 'Folder updated successfully');
    res.redirect(parentId ? `/folders/${parentId}` : '/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update folder');
    res.redirect(`/folders/edit/${folderId}`);
  }
};

// POST /folders/delete/:id
export const deleteFolderHandler = async (req: Request, res: Response) => {
  const ownerId = (req.user as PrismaUser).id;
  const folderId = req.params.id;

  try {
    const folder = await getFolderByIdWithContents(folderId);
    const parentId = folder?.parentId;

    await deleteFolderAndContents(folderId, ownerId);
    req.flash('success', 'Folder deleted successfully');
    res.redirect(parentId ? `/folders/${parentId}` : '/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete folder');
    res.redirect('/dashboard');
  }
};
