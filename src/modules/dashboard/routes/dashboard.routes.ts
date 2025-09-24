import express from 'express';
import { requireAuth } from '../../shared/middlewares/auth.middleware';
import { renderDashboard } from '../controllers/dashboard.controller';

const router = express.Router();
router.use(requireAuth);

router.get('/', renderDashboard);

export default router;
