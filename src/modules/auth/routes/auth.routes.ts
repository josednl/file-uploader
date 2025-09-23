import express from 'express';
import passport from 'passport';
import {
  showLoginForm,
  showRegisterForm,
  registerUser,
  logoutUser,
} from '../controllers/auth.controller';
import { requireNoAuth } from '../../shared/middlewares/auth.middleware';

const router = express.Router();

router.get('/login', requireNoAuth, showLoginForm);
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,
  })
);

router.get('/register', requireNoAuth, showRegisterForm);
router.post('/register', registerUser);

router.get('/logout', logoutUser);
router.post('/logout', logoutUser);

export default router;
