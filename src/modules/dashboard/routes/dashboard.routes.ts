import express from 'express';
import { requireAuth } from '../../shared/middlewares/auth.middleware';

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.render('dashboard/index');
});

export default router;
