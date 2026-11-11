require('dotenv').config();
const express = require('express');
const connectDB = require('./db');

const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const assetRoutes = require('./routes/assets');
const teamRoutes = require('./routes/team');
const profileRoutes = require('./routes/profile');
const publicRoutes = require('./routes/public');
const storageRoutes = require('./routes/storage');

const app = express();
app.use(express.json());

connectDB().catch((e) => {
  console.error('MongoDB connection failed:', e.message);
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/storage', storageRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`secondary-api listening on ${PORT}`));
