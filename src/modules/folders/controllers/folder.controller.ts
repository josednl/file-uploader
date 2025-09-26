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
  updateFolderPermission,
  getFolderById,
  removeSharedUser,
  isFolderDescendant,
  deletePublicSharesByFolderId,
} from '../services/folder.service';
import { getUserId } from '../../../utils/auth';
import { get } from 'http';

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
  const userId = getUserId(req);
  const folderId = req.params.id;

  try {
    const permission = await getUserPermissionForFolder(folderId, userId);

    if (!permission) {
      req.flash('error', 'Access denied.');
      return res.redirect('/dashboard');
    }

    const folder = await getFolderByIdWithContents(folderId);
    if (!folder) {
      req.flash('error', 'Folder not found');
      return res.redirect('/dashboard');
    }

    const isOwner = folder.ownerId === userId;
    const isRoot = folder.parentId === null;

    if (isRoot && !isOwner) {
      req.flash('error', 'Only the owner can delete the root folder.');
      return res.redirect(`/folders/${folderId}`);
    }

    if (permission === 'EDIT' && !isRoot) {
    } else if (permission === 'EDIT' && isRoot) {
      req.flash('error', 'You cannot delete a shared root folder.');
      return res.redirect(`/folders/${folderId}`);
    }

    await deleteFolderAndContents(folderId, userId);

    req.flash('success', 'Folder deleted successfully');
    const parentId = folder.parentId;
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

  try {
    const publicShare = await getFolderByPublicToken(token);

    if (!publicShare) {
      req.flash('error', 'Invalid or expired public link');
      return res.redirect('/');
    }

    const folderId = req.params.folderId || publicShare.folder.id;
    const rootFolder = publicShare.folder;

    const targetFolder = await safeGetFolderWithContents(folderId, token, req, res);
    if (!targetFolder) return;

    if (folderId && folderId !== rootFolder.id) {
      const isAccessible = await isFolderDescendant(folderId, rootFolder.id);

      if (!isAccessible) {
        req.flash('error', 'Access denied to this folder');
        return res.redirect(`/shared/public/${token}`);
      }
    }

    const breadcrumb = await getFolderBreadcrumb(targetFolder.id);

    res.render('folders/public-show', {
      folder: targetFolder,
      breadcrumb,
      permission: 'READ',
      sharedToken: token,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Unable to load shared folder');
    res.redirect('/');
  }
};

async function safeGetFolderWithContents(
  folderId: string,
  token: string,
  req: Request,
  res: Response
) {
  const folder = await getFolderByIdWithContents(folderId);
  if (!folder) {
    req.flash('error', 'Folder not found');
    res.redirect(`/shared/public/${token}`);
    return null;
  }
  return folder;
}

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

// POST /folders/:id/share/update
export const updateSharedPermissionHandler = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const folderId = req.params.id;
  const { userId: targetUserId, permission } = req.body;

  try {
    const folder = await getFolderById(folderId);

    if (!folder || folder.ownerId !== userId) {
      req.flash('error', 'Access denied');
      return res.redirect(`/folders/${folderId}`);
    }

    if (!['READ', 'EDIT'].includes(permission)) {
      req.flash('error', 'Invalid permission');
      return res.redirect(`/folders/${folderId}`);
    }

    if (targetUserId === userId) {
      req.flash('error', 'You cannot change your own permission');
      return res.redirect(`/folders/${folderId}`);
    }

    const result = await updateFolderPermission(folderId, targetUserId, permission);

    if (result.count === 0) {
      req.flash('error', 'Permission not updated. Maybe user is not shared with this folder.');
    } else {
      req.flash('success', 'Permission updated');
    }

    res.redirect(`/folders/${folderId}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update permission');
    res.redirect(`/folders/${folderId}`);
  }
};

export const removeSharedUserHandler = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const folderId = req.params.id;
  const targetUserId = req.body.userId; // enviado desde un form oculto o input

  try {
    const folder = await getFolderById(folderId);

    if (!folder || folder.ownerId !== userId) {
      req.flash('error', 'Access denied');
      return res.redirect(`/folders/${folderId}`);
    }

    if (targetUserId === userId) {
      req.flash('error', 'You cannot remove yourself from the shared list');
      return res.redirect(`/folders/${folderId}`);
    }

    const result = await removeSharedUser(folderId, targetUserId);

    if (result.count === 0) {
      req.flash('error', 'User was not shared with this folder');
    } else {
      req.flash('success', 'Access removed for user');
    }

    res.redirect(`/folders/${folderId}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to remove access');
    res.redirect(`/folders/${folderId}`);
  }
};

export const unshareFolderPublicHandler = async (req: Request, res: Response) => {
  const folderId = req.params.id;
  const userId = getUserId(req);

  if (!userId) {
    req.flash('error', 'You must be logged in');
    return res.redirect('/login');
  }

  try {
    const folder = await getFolderById(folderId);

    if (!folder || folder.ownerId !== userId) {
      req.flash('error', 'Unauthorized');
      return res.redirect('/');
    }

    await deletePublicSharesByFolderId(folderId);

    req.flash('success', 'Public link disabled successfully');
    res.redirect(`/folders/${folderId}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to disable public link');
    res.redirect(`/folders/${folderId}`);
  }
};
