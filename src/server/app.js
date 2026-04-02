import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRouter   from './routes/auth.route.js';
import reposRouter  from './routes/repos.route.js';
import deleteRouter from './routes/delete.route.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '../../public');

const app = express();

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// API routes
app.use('/api/auth',   authRouter);
app.use('/api/repos',  reposRouter);
app.use('/api/delete', deleteRouter);

export default app;
