import { Request, Response } from 'express';
import {
  getRootFoldersByOwner,
  createFolder,
  updateFolder,
  getAllFoldersForUser,
  getFolderByIdWithContents,
  getFolderBreadcrumb,
  deleteFolderAndContents,
  createPublicShare,
  getFolderByPublicToken,
  shareFolderWithUser,
  getSharedUsersForFolder,
  getFoldersSharedWithUser,
  findAccessibleFolder,
  getUserPermissionForFolder,
} from '../services/folder.service';

import { getUserId } from '../../../utils/auth';

// GET /folders
export const listRootFolders = async (req: Request, res: Response) => {
  const ownerId = getUserId(req);
  try {
    const folders = await getRootFoldersByOwner(ownerId);
    res.render('folders/index', { folders });
  } catch (error) {
    console.error('Error fetching root folders:', error);
    req.flash('error', 'Failed to load folders');
    res.redirect('/dashboard');
  }
};

// GET /folders/create
export const createFolderForm = async (req: Request, res: Response) => {
  const ownerId = getUserId(req);
  const folders = await getAllFoldersForUser(ownerId);
  res.render('folders/create', { folders });
};

// POST /folders/create
export const createFolderHandler = async (req: Request, res: Response) => {
  const ownerId = getUserId(req);
  const { name, parentId } = req.body;

  try {
    await createFolder(name, ownerId, parentId || null);
    req.flash('success', 'Folder created successfully');
    res.redirect(parentId ? `/folders/${parentId}` : '/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to create folder');
    res.redirect('/folders/create');
  }
};

// GET /folders/:id
export const viewFolder = async (req: Request, res: Response) => {
  const folderId = req.params.id;
  const ownerId = getUserId(req);

  const folder = await findAccessibleFolder(folderId, ownerId);
  const permission = await getUserPermissionForFolder(folderId, ownerId);

  if (!permission) {
    req.flash('error', 'You do not have access to this folder.');
    return res.redirect('/folders');
  }

  if (!folder) {
    req.flash('error', 'Folder not found');
    return res.redirect('/dashboard');
  }

  const breadcrumb = await getFolderBreadcrumb(folderId);
  const sharedUsers = await getSharedUsersForFolder(folderId);

  res.render('folders/show', { folder, breadcrumb, sharedUsers, permission });
};

// GET /folders/edit/:id
export const editFolderForm = async (req: Request, res: Response) => {
  const ownerId = getUserId(req);
  const folderId = req.params.id;

  const folder = await getFolderByIdWithContents(folderId);
  const folders = await getAllFoldersForUser(ownerId);

  if (!folder) {
    req.flash('error', 'Folder not found');
    return res.redirect('/dashboard');
  }

  res.render('folders/edit', { folder, folders });
};

// POST /folders/edit/:id
export const updateFolderHandler = async (req: Request, res: Response) => {
  const ownerId = getUserId(req);
  const folderId = req.params.id;

  const permission = await getUserPermissionForFolder(folderId, ownerId);

  if (permission !== 'OWNER') {
    req.flash('error', 'Only the owner can perform this action.');
    return res.redirect(`/folders/${folderId}`);
  }

  const { name, parentId } = req.body;
  const normalizedParentId = parentId && parentId !== '' ? parentId : null;

  try {
    await updateFolder(folderId, ownerId, { name, parentId: normalizedParentId });
    req.flash('success', 'Folder updated successfully');
    res.redirect(normalizedParentId ? `/folders/${normalizedParentId}` : '/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update folder');
    res.redirect(`/folders/edit/${folderId}`);
  }
};

// POST /folders/delete/:id
export const deleteFolderHandler = async (req: Request, res: Response) => {
  const ownerId = getUserId(req);
  const folderId = req.params.id;

  const permission = await getUserPermissionForFolder(folderId, ownerId);
  if (permission !== 'OWNER') {
    req.flash('error', 'Only the owner can perform this action.');
    return res.redirect(`/folders/${folderId}`);
  }

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

// POST /folders/share/:id/public
export const createPublicShareHandler = async (req: Request, res: Response) => {
  const folderId = req.params.id;

  try {
    const share = await createPublicShare(folderId);
    req.flash('success', 'Public share link created');
    res.redirect(`/folders/${folderId}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Could not create public share');
    res.redirect(`/folders/${folderId}`);
  }
};

// GET /folders/shared/:token
export const viewSharedFolder = async (req: Request, res: Response) => {
  const token = req.params.token;

  const folder = await getFolderByPublicToken(token);
  if (!folder) {
    return res.status(404).render('404', { message: 'Shared folder not found' });
  }

  res.render('folders/shared_public', { folder });
};

// POST /folders/:id/share
export const handleShareFolder = async (req: Request, res: Response) => {
  const folderId = req.params.id;
  const { email, permission } = req.body;

  try {
    await shareFolderWithUser(folderId, email, permission);
    req.flash('success', `Folder shared with ${email}`);
  } catch (err: any) {
    req.flash('error', err.message || 'Failed to share folder');
  }

  res.redirect(`/folders/${folderId}`);
};

// GET /folders/shared
export const listSharedFolders = async (req: Request, res: Response) => {
  const userId = getUserId(req);

  try {
    const sharedFolders = await getFoldersSharedWithUser(userId);
    res.render('folders/shared', { sharedFolders });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load shared folders');
    res.redirect('/dashboard');
  }
};
