import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/auth.middleware';
import {
  listRootFolders,
  createFolderForm,
  createFolderHandler,
  viewFolder,
  editFolderForm,
  updateFolderHandler,
  deleteFolderHandler,
  createPublicShareHandler,
  handleShareFolder,
  listSharedFolders,
  updateSharedPermissionHandler,
  removeSharedUserHandler,
  unshareFolderPublicHandler,
} from '../controllers/folder.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requireAuth, listRootFolders);
router.get('/create', createFolderForm);
router.post('/create', createFolderHandler);
router.get('/shared', listSharedFolders);
router.get('/:id', viewFolder);
router.get('/edit/:id', editFolderForm);
router.post('/edit/:id', updateFolderHandler);
router.post('/delete/:id', deleteFolderHandler);
router.post('/share/:id/public', createPublicShareHandler);
router.post('/:id/share', handleShareFolder);
router.post('/:id/share/update', updateSharedPermissionHandler);
router.post('/:id/unshare/user', removeSharedUserHandler);
router.post('/:id/unshare/public', unshareFolderPublicHandler);

export default router;
