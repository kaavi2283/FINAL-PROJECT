const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');
const attemptRoutes = require('./routes/attempts');

app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/attempts', attemptRoutes);

const frontendDist = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    database: db.getDbType(),
    timestamp: new Date()
  });
});

async function start() {
  try {
    await db.initDb();
    
    app.listen(PORT, () => {
      console.log('server started on port ' + PORT);
      console.log('db mode: ' + db.getDbType());
    });
  } catch (err) {
    console.error('error starting server: ', err);
    process.exit(1);
  }
}

start();
