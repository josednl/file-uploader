import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { User as PrismaUser } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// GET /files - List all files for the authenticated user
export const listFiles = async (req: Request, res: Response) => {
  try {
    const ownerId = (req.user as PrismaUser)?.id;
    const files = await prisma.file.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
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
    await prisma.file.create({
      data: {
        name: req.file.originalname,
        path: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        ownerId: ownerId!,
      },
    });

    req.flash('success', 'File uploaded successfully');
    res.redirect('/files');
  } catch (error) {
    console.error('Error uploading file:', error);
    req.flash('error', 'Failed to upload file');
    res.redirect('/files');
  }
};

// GET /files/:id/download - Handle file download
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const ownerId = (req.user as PrismaUser)?.id;

    const file = await prisma.file.findFirst({
      where: { id: fileId, ownerId },
    });

    if (!file) {
      req.flash('error', 'File not found');
      return res.redirect('/files');
    }

    const filePath = path.join(__dirname, '../../../../uploads', file.path);
    console.log('Attempting to download file from path:', filePath);
    if (!fs.existsSync(filePath)) {
      req.flash('error', 'File not found on server');
      return res.redirect('/files');
    }
    res.download(filePath, file.name);
  } catch (error) {
    console.error('Error downloading file:', error);
    req.flash('error', 'Failed to download file');
    res.redirect('/files');
  }
};

// POST /files/:id/delete - Handle file deletion
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const ownerId = (req.user as PrismaUser)?.id;

    const file = await prisma.file.findFirst({
      where: { id: fileId, ownerId },
    });

    if (!file) {
      req.flash('error', 'File not found');
      return res.redirect('/files');
    }

    await prisma.file.delete({
      where: { id: fileId },
    });

    // Delete the file from the filesystem
    const filePath = path.join(__dirname, '../../../../uploads', file.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    req.flash('success', 'File deleted successfully');
    res.redirect('/files');
  } catch (error) {
    console.error('Error deleting file:', error);
    req.flash('error', 'Failed to delete file');
    res.redirect('/files');
  }
};

export const getFileDetails = async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const ownerId = (req.user as PrismaUser)?.id;

    const file = await prisma.file.findFirst({
      where: { id: fileId, ownerId },
    });

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
