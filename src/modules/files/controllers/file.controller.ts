import { Request, Response } from 'express';
import { User as PrismaUser } from '@prisma/client';
import {
  findFilesByOwner,
  createFileRecord,
  findFileByIdAndOwner,
  deleteFileRecordAndFromDisk,
} from '../services/file.service';

// GET /files - List all files for the authenticated user
export const listFiles = async (req: Request, res: Response) => {
  try {
    const ownerId = (req.user as PrismaUser)?.id;
    const files = await findFilesByOwner(ownerId);
    res.render('files/list', { files });
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
    await createFileRecord(req.file, ownerId!);

    req.flash('success', 'File uploaded successfully');
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

    const file = await findFileByIdAndOwner(fileId, ownerId);

    if (!file) {
      req.flash('error', 'File not found');
      return res.redirect('/files');
    }

    res.download(file.absolutePath, file.name);
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

    const deleted = await deleteFileRecordAndFromDisk(fileId, ownerId);

    if (!deleted) {
      req.flash('error', 'File not found');
      return res.redirect('/files');
    }

    req.flash('success', 'File deleted successfully');
    res.redirect('/files');
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

    const file = await findFileByIdAndOwner(fileId, ownerId);

    if (!file) {
      req.flash('error', 'File not found');
      return res.redirect('/files');
    }

    res.render('files/details', { file });
  } catch (error) {
    console.error('Error fetching file details:', error);
    req.flash('error', 'Failed to load file details');
    res.redirect('/files');
  }
};
