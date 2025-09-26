import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const DEMO_PATH = path.join(__dirname, '../../../../demo');

const demoFolders = [
  { id: '1', name: 'Animals', createdAt: new Date('2023-09-10') },
  { id: '2', name: 'Design Assets', createdAt: new Date('2023-09-18') },
  { id: '3', name: 'Documentation', createdAt: new Date('2023-09-25') }
];

// GET /
export const guestHome = (req: Request, res: Response) => {
  const demoUser = { name: 'Guest User' };

  res.render('guest/demo-dashboard', {
    demoUser,
    demoFolders
  });
};

// GET /folder/:id
export const viewDemoFolder = (req: Request, res: Response) => {
  const folderId = req.params.id;
  const folder = demoFolders.find(f => f.id === folderId);

  if (!folder) {
    req.flash('error', 'Folder not found');
    return res.redirect('/');
  }

  const fullPath = path.join(DEMO_PATH, folder.name.toLowerCase());

  const items: {
    id: string;
    name: string;
    size: number;
    createdAt: Date | null;
    isDirectory: boolean;
  }[] = [];

  if (fs.existsSync(fullPath)) {
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(fullPath, entry.name);
      const stats = fs.statSync(entryPath);

      items.push({
        id: encodeURIComponent(path.join(folder.name.toLowerCase(), entry.name)),
        name: entry.name,
        size: entry.isDirectory() ? 0 : stats.size,
        createdAt: stats.birthtime ?? null,
        isDirectory: entry.isDirectory()
      });
    }
  }
  console.log(folder);

  res.render('guest/demo-folder', {
    folder: {
      id: folder.id,
      name: folder.name,
      createdAt: new Date(),
    },
    items,
    guest: true
  });
};

// GET /folder/1/file/:filename
export const viewDemoFile = (req: Request, res: Response) => {
  const folderId = req.params.id;
  const filename = req.params.filename;

  const folder = demoFolders.find(f => f.id === folderId);
  if (!folder) {
    return res.status(404).send('Folder not found');
  }

  const folderPath = path.join(DEMO_PATH, folder.name.toLowerCase());
  const filePath = path.join(folderPath, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.render('guest/demo-file', {
    file: {
      name: path.basename(filePath),                                                     
      folder: path.basename(folderPath)                 
    },
    folderId : folder.id,
    guest: true
  });
};

// GET /folder/:id/file/:filename/download
export const downloadDemoFile = (req: Request, res: Response) => {
  const folderId = req.params.id;
  const filename = req.params.filename;

  const folder = demoFolders.find(f => f.id === folderId);
  if (!folder) {
    return res.status(404).send('Folder not found');
  }

  const folderPath = path.join(DEMO_PATH, folder.name.toLowerCase());
  const filePath = path.join(folderPath, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(500).send('Failed to download file.');
    }
  });
};
