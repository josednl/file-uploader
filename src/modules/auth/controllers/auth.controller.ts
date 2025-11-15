import { Request, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcrypt';


export const showLoginForm = (req: Request, res: Response) => {
  res.render('auth/login');
};

export const showRegisterForm = (req: Request, res: Response) => {
  res.render('auth/register');
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
      req.flash('error', 'All fields are required');
      return res.redirect('/register');
    }

    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/register');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      req.flash('error', 'The email is not valid');
      return res.redirect('/register');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ name }, { email }],
      },
    });

    if (existingUser) {
      req.flash('error', 'The user or email is already registered');
      return res.redirect('/register');
    }

    // Create the user
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    req.flash('success', 'Successfully registered. Please log in.');
    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'Error creating account');
    res.redirect('/register');
  }
};

export const logoutUser = (req: Request, res: Response) => {
  req.logout(err => {
    if (err) {
      console.error('Error while logging out:', err);
      req.flash('error', 'Error while logging out');
      return res.redirect('/');
    }
    res.redirect('/');
  });
};
