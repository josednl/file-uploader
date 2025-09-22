
import express from 'express';
import session from 'express-session';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
	secret: process.env.SESSION_SECRET || 'supersecret',
	resave: false,
	saveUninitialized: false
}));

// EJS View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Routes
app.get('/', (req, res) => {
	res.render('dashboard/index');
});

// Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
