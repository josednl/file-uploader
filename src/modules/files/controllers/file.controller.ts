import { Request, Response } from 'express';
import path from 'path';
import {
  findFilesByOwner,
  createFileRecord,
  deleteFileRecordAndFromDisk,
  findFileByIdAndOwnerWithFolder,
  moveFileToFolder,
  findAccessibleFile,
  getFileById,
  getFileByIdWithFolder,
} from '../services/file.service';
import { getUserId } from '../../../utils/auth';
import {
  getAllFoldersForUser,
  getFolderByPublicToken,
  isFolderDescendant,
} from '../../folders/services/folder.service';
import { supabase } from '../../../lib/supabase';

// GET /files
export const listFiles = async (req: Request, res: Response) => {
  const ownerId = getUserId(req);

  try {
    const files = await findFilesByOwner(ownerId);
    res.render('files/list', { files, folder: null });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).render('500', { error: ['Failed to load files'] });
  }
};

// POST /files/upload
export const uploadFile = async (req: Request, res: Response) => {
  const ownerId = getUserId(req);
  const folderId = req.body.folderId || null;

  if (!req.file) {
    req.flash('error', 'No file uploaded');
    return res.redirect('/files');
  }

  try {
    await createFileRecord(req.file, ownerId, folderId);
    req.flash('success', 'File uploaded successfully');
    res.redirect(folderId ? `/folders/${folderId}` : '/files');
  } catch (error) {
    console.error('Error uploading file:', error);
    req.flash('error', 'Failed to upload file');
    res.redirect('/files');
  }
};

// GET /files/download/:id
export const downloadFile = async (req: Request, res: Response) => {
  const fileId = req.params.id;
  const userId = getUserId(req);

  try {
    const result = await findAccessibleFile(fileId, userId);
    if (!result) {
      req.flash('error', 'File not found or access denied');
      return res.redirect('/files');
    }

    const file = result.file;

    const urlParts = file.path.split('/');
    const filename = urlParts[urlParts.length - 1];

    const { data, error } = await supabase
      .storage
      .from(process.env.SUPABASE_STORAGE_BUCKET!)
      .download(filename);

    if (error || !data) throw error || new Error('File not found in storage');

    const buffer = Buffer.from(await data.arrayBuffer());

    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.send(buffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    req.flash('error', 'Failed to download file');
    res.redirect('/files');
  }
};

// POST /files/delete/:id
export const deleteFile = async (req: Request, res: Response) => {
  const fileId = req.params.id;
  const ownerId = getUserId(req);

  try {
    const result = await findAccessibleFile(fileId, ownerId);

    if (!result || (result.permission !== 'EDIT' && result.permission !== 'OWNER')) {
      req.flash('error', 'File not found or access denied');
      return res.redirect('/files');
    }

    const folderId = result.file.folderId;

    await deleteFileRecordAndFromDisk(fileId, ownerId);

    req.flash('success', 'File deleted successfully');
    res.redirect(folderId ? `/folders/${folderId}` : '/files');
  } catch (error) {
    console.error('Error deleting file:', error);
    req.flash('error', 'Failed to delete file');
    res.redirect('/files');
  }
};

// GET /files/details/:id
export const getFileDetails = async (req: Request, res: Response) => {
  const fileId = req.params.id;
  const ownerId = getUserId(req);
  const from = req.query.from?.toString();

  try {
    const result = await findAccessibleFile(fileId, ownerId);

    if (!result) {
      req.flash('error', 'File not found or access denied');
      return res.redirect('/files');
    }
    const file = result.file;
    const permission = result.permission;
    res.render('files/details', { file, from, permission });
  } catch (error) {
    console.error('Error fetching file details:', error);
    req.flash('error', 'Failed to load file details');
    res.redirect('/files');
  }
};

// GET /files/move/:id
export const showMoveFileForm = async (req: Request, res: Response) => {
  const fileId = req.params.id;
  const ownerId = getUserId(req);

  try {
    const file = await findFileByIdAndOwnerWithFolder(fileId, ownerId);

    if (!file) {
      req.flash('error', 'File not found');
      return res.redirect('/files');
    }

    const folders = await getAllFoldersForUser(ownerId);
    res.render('files/move', { file, folders });
  } catch (error) {
    console.error('Error rendering move file form:', error);
    req.flash('error', 'Failed to load move form');
    res.redirect('/files');
  }
};

// POST /files/move/:id
export const handleMoveFile = async (req: Request, res: Response) => {
  const fileId = req.params.id;
  const ownerId = getUserId(req);
  const { folderId } = req.body;

  try {
    await moveFileToFolder(fileId, ownerId, folderId === 'none' ? null : folderId);
    req.flash('success', 'File moved successfully');
    res.redirect(folderId && folderId !== 'none' ? `/folders/${folderId}` : '/files');
  } catch (error) {
    console.error('Error moving file:', error);
    req.flash('error', 'Failed to move file');
    res.redirect('/files');
  }
};

export const downloadPublicFile = async (req: Request, res: Response) => {
  const { token, fileId } = req.params;

  try {
    const publicShare = await getFolderByPublicToken(token);
    if (!publicShare) {
      req.flash('error', 'Invalid or expired public link');
      return res.redirect('/');
    }

    const file = await getFileByIdWithFolder(fileId);
    if (!file) {
      req.flash('error', 'File not found');
      return res.redirect(`/shared/${token}`);
    }

    const isAccessible = await isFolderDescendant(file.folderId!, publicShare.folderId);
    if (!isAccessible) {
      req.flash('error', 'Access denied to this file');
      return res.redirect(`/shared/${token}`);
    }

    const urlParts = file.path.split('/');
    const filename = urlParts[urlParts.length - 1];

    const { data, error } = await supabase
      .storage
      .from(process.env.SUPABASE_STORAGE_BUCKET!)
      .download(filename);

    if (error || !data) throw error || new Error('File not found in storage');

    const buffer = Buffer.from(await data.arrayBuffer());

    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.send(buffer);
  } catch (error) {
    console.error('Error downloading public file:', error);
    req.flash('error', 'Unable to download file');
    res.redirect(`/shared/${token}`);
  }
};

export const viewSharedFile = async (req: Request, res: Response) => {
  const token = req.params.token;
  const fileId = req.params.fileId;

  try {
    const publicShare = await getFolderByPublicToken(token);
    if (!publicShare) {
      req.flash('error', 'Invalid or expired public link');
      return res.redirect('/');
    }

    const rootFolder = publicShare.folder;

    const file = await getFileById(fileId);
    if (!file) {
      req.flash('error', 'File not found');
      return res.redirect(`/shared/public/${token}`);
    }

    if (file.folderId && file.folderId !== rootFolder.id) {
      const isAccessible = await isFolderDescendant(file.folderId, rootFolder.id);
      if (!isAccessible) {
        req.flash('error', 'Access denied to this file');
        return res.redirect(`/shared/public/${token}`);
      }
    }
    res.render('files/public-show', {
      file,
      permission: 'READ',
      sharedToken: token,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Unable to load shared file');
    res.redirect('/');
  }
};
