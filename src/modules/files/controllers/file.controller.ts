import { Request, Response } from 'express';
import { User as PrismaUser } from '@prisma/client';
import path from 'path';
import {
  findFilesByOwner,
  createFileRecord,
  findFileByIdAndOwner,
  deleteFileRecordAndFromDisk,
  findFileByIdAndOwnerWithFolder,
  moveFileToFolder,
  findFoldersByOwner,
  findAccessibleFile
} from '../services/file.service';

// GET /files - List all files for the authenticated user
export const listFiles = async (req: Request, res: Response) => {
  try {
    const ownerId = (req.user as PrismaUser)?.id;
    const files = await findFilesByOwner(ownerId);
    res.render('files/list', { files, folder: null });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).render('500', { error: ['Failed to load files'] });
  }
};

// POST /files/upload - Handle file upload
export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      req.flash('error', 'No file uploaded');
      return res.redirect('/files');
    }

    const ownerId = (req.user as PrismaUser)?.id;
    const folderId = req.body.folderId || null;
    await createFileRecord(req.file, ownerId!, folderId);

    req.flash('success', 'File uploaded successfully');
    if (folderId) {
      return res.redirect(`/folders/${folderId}`);
    }
    res.redirect('/files');
  } catch (error) {
    console.error('Error uploading file:', error);
    req.flash('error', 'Failed to upload file');
    res.redirect('/files');
  }
};

// GET /files/download/:id - Handle file download
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const ownerId = (req.user as PrismaUser)?.id;

    const file = await findAccessibleFile(fileId, ownerId);

    if (!file) {
      req.flash('error', 'File not found or access denied');
      return res.redirect('/files');
    }

    const absolutePath = path.join(path.join(__dirname, '../../../../uploads'), file.path);
    res.download(absolutePath, file.name);
  } catch (error) {
    console.error('Error downloading file:', error);
    req.flash('error', 'Failed to download file');
    res.redirect('/files');
  }
};


// POST /files/delete/:id - Handle file deletion
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const ownerId = (req.user as PrismaUser)?.id;
    const file = await findAccessibleFile(fileId, ownerId);

    if (!file) {
      req.flash('error', 'File not found or access denied');
      return res.redirect('/files');
    }

    const folderId = file.folderId;

    const deleted = await deleteFileRecordAndFromDisk(fileId, ownerId);

    if (!deleted) {
      req.flash('error', 'File not found');
      return res.redirect(folderId ? `/folders/${folderId}` : '/files');
    }

    req.flash('success', 'File deleted successfully');
    res.redirect(folderId ? `/folders/${folderId}` : '/files');
  } catch (error) {
    console.error('Error deleting file:', error);
    req.flash('error', 'Failed to delete file');
    res.redirect('/files');
  }
};

// GET /files/:id - File details
export const getFileDetails = async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const ownerId = (req.user as PrismaUser)?.id;
    const from = req.query.from?.toString();

    const file = await findAccessibleFile(fileId, ownerId);
    if (!file) {
      req.flash('error', 'File not found or access denied');
      return res.redirect('/files');
    }

    res.render('files/details', { file, from });
  } catch (error) {
    console.error('Error fetching file details:', error);
    req.flash('error', 'Failed to load file details');
    res.redirect('/files');
  }
};

// GET /files/move/:id - Show move form
export const showMoveFileForm = async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const ownerId = (req.user as PrismaUser)?.id;

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

// POST /files/move/:id - Handle move
export const handleMoveFile = async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const ownerId = (req.user as PrismaUser)?.id;
    const { folderId } = req.body;

    await moveFileToFolder(fileId, ownerId, folderId === 'none' ? null : folderId);

    req.flash('success', 'File moved successfully');
    res.redirect(folderId && folderId !== 'none' ? `/folders/${folderId}` : '/files');
  } catch (error) {
    console.error('Error moving file:', error);
    req.flash('error', 'Failed to move file');
    res.redirect('/files');
  }
};
