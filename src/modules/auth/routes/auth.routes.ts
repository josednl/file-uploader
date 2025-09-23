import express from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify if the user is NOT authenticated
const isNotAuthenticated = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/dashboard');
};

// GET /auth/login - Show login form
router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('auth/login', { error: req.flash('error') });
});

// POST /auth/login - Process login
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/auth/login',
    failureFlash: true,
  })
);

// GET /auth/register - Show registration form
router.get('/register', isNotAuthenticated, (req, res) => {
  res.render('auth/register', { error: req.flash('error') });
});

// POST /auth/register - Process registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
      req.flash('error', 'All fields are required');
      return res.redirect('/auth/register');
    }

    if (password !== confirmPassword) {
      req.flash('error', 'The passwords do not match');
      return res.redirect('/auth/register');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ name }],
      },
    });

    if (existingUser) {
      req.flash('error', 'The username is already taken');
      return res.redirect('/auth/register');
    }

    // Create the new user
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        password: hashedPassword,
      },
    });

    req.flash('success', 'Account created successfully. Please log in.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'Error creating account');
    res.redirect('/auth/register');
  }
});

// POST /auth/logout - Logout user
router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

export default router;
