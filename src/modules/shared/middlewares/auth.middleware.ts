import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'You must log in to access this page.');
  res.redirect('/login');
};

export const requireNoAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/dashboard');
};
