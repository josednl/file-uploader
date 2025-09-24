import express from 'express';
import multer from 'multer';
import { requireAuth } from '../../shared/middlewares/auth.middleware';
import {
  uploadFile,
  listFiles,
  downloadFile,
  deleteFile,
  getFileDetails,
} from '../controllers/file.controller';

const router = express.Router();
router.use(requireAuth);

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.get('/', listFiles);
router.get('/:id', getFileDetails);
router.get('/upload', (req, res) => {
  res.render('files/upload');
});
router.post('/upload', upload.single('file'), uploadFile);
router.get('/download/:id', downloadFile);
router.post('/delete/:id', deleteFile);

export default router;
