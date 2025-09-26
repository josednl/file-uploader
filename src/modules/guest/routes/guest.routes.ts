import { Router } from 'express';
import {
  guestHome,
  viewDemoFolder,
  viewDemoFile,
  downloadDemoFile,
} from '../controllers/guest.controller';

const router = Router();

router.get('/', guestHome);
router.get('/folder/:id', viewDemoFolder);
router.get('/folder/:id/file/:filename', viewDemoFile);
router.get('/folder/:id/file/:filename/download', downloadDemoFile);

export default router;
