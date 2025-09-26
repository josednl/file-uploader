import { Router } from 'express';
import { viewSharedFolder } from '../controllers/folder.controller';
import { downloadPublicFile, viewSharedFile } from '../../files/controllers/file.controller';

const router = Router();

router.get('/:token/:folderId?', viewSharedFolder);
router.get('/:token/file/:fileId', viewSharedFile);
router.get('/:token/folder/:folderId', viewSharedFolder);
router.get('/:token/download/:fileId', downloadPublicFile);

export default router;
