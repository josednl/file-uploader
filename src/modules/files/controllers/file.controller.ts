import { Request, Response } from 'express';
import path from 'path';
import {
  findFilesByOwner,
  createFileRecord,
  deleteFileRecordAndFromDisk,
  findFileByIdAndOwnerWithFolder,
  moveFileToFolder,
  findFoldersByOwner,
  findAccessibleFile
} from '../services/file.service';

import { getUserId } from '../../../utils/auth';

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

    const absolutePath = path.resolve('uploads', result.file.path);
    res.download(absolutePath, result.file.name);
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
    res.render('files/details', { file, from });
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

    const folders = await findFoldersByOwner(ownerId);
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
