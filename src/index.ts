import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import notificationRoutes from './routes/notifications.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes); // Global task routes
app.use('/projects', taskRoutes); // Project-specific task routes
app.use('/notifications', notificationRoutes);

app.all('/', (req, res) => {
  res.send("🟢Running🟢")
})
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});