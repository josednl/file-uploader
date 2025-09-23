import express, { Request, Response } from 'express';
import session from 'express-session';
import path from 'path';
import flash from 'connect-flash';
import passport from './modules/auth/passport/passport.config';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/routes/auth.routes';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: false,
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.render('dashboard/index');
  } else {
    res.render('welcome');
  }
});

// Auth routes
app.use('/', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404');
});

//Error handling middleware
app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res
    .status(500)
    .render('500', {
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
