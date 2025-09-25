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
    createPublicShareHandlder,
    viewSharedFolder,
    handleShareFolder,
    listSharedFolders
} from '../controllers/folder.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requireAuth, listRootFolders);
router.get('/new', createFolderForm);
router.post('/create', createFolderHandler);
router.get('/shared', listSharedFolders);
router.get('/:id', viewFolder);
router.get('/edit/:id', editFolderForm);
router.post('/edit/:id', updateFolderHandler);
router.post('/delete/:id', deleteFolderHandler);
router.post('/share/:id/public', createPublicShareHandlder);
router.get('/shared/:token', viewSharedFolder);
router.post('/:id/share', handleShareFolder);

export default router;
