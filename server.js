// server.js
const express = require('express');
// const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Conexão MongoDB - comentado temporariamente para teste
/*
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/downloadapi', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Schema do Usuario
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Schema da API Key
const ApiKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  keyName: { type: String, required: true },
  apiKey: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  requestCount: { type: Number, default: 0 },
  dailyLimit: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now }
});

// Schema dos Downloads
const DownloadSchema = new mongoose.Schema({
  apiKey: { type: String, required: true },
  platform: { type: String, required: true },
  url: { type: String, required: true },
  format: { type: String, required: true },
  success: { type: Boolean, required: true },
  filePath: String,
  error: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const ApiKey = mongoose.model('ApiKey', ApiKeySchema);
const Download = mongoose.model('Download', DownloadSchema);
*/

// Middleware de autenticação JWT - simplificado para teste
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  // Para teste, aceitar qualquer token
  req.user = { userId: 'test', username: 'testuser' };
  next();
};

// Middleware de verificação da API Key - simplificado para teste
const verifyApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API Key requerida' });
  }

  // Para teste, aceitar qualquer API key
  req.apiKey = apiKey;
  req.keyRecord = { dailyLimit: 1000 };
  next();
};

// Função para executar o script Python
const executePythonScript = (platform, url, format) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'download_service.py');
    const venvPython = path.join(__dirname, 'venv', 'bin', 'python');
    const command = `"${venvPython}" "${scriptPath}" "${platform}" "${url}" "${format}"`;
    
    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
};

// ROTAS DE AUTENTICAÇÃO - simplificadas para teste

// Registro
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    res.status(201).json({ message: 'Usuário criado com sucesso (modo teste)' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const token = jwt.sign(
      { userId: 'test', username: username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    res.json({ token, userId: 'test' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTAS DE API KEYS - simplificadas para teste

// Gerar nova API Key
app.post('/api/keys/generate', authenticateToken, async (req, res) => {
  try {
    const { keyName } = req.body;
    const apiKey = 'api_' + crypto.randomBytes(32).toString('hex');
    res.json({ apiKey, keyName });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar API Key' });
  }
});

// Listar API Keys do usuário
app.get('/api/keys', authenticateToken, async (req, res) => {
  try {
    res.json([{ keyName: 'Test Key', apiKey: 'test_key_123', isActive: true }]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar API Keys' });
  }
});

// Desativar API Key
app.put('/api/keys/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    res.json({ message: 'API Key desativada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao desativar API Key' });
  }
});

// ROTAS DE DOWNLOAD

// Download YouTube
app.post('/api/download/youtube', verifyApiKey, async (req, res) => {
  try {
    const { url, type = 'mp4' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    const validTypes = ['mp3', 'mp4', 'm4a', 'wav'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Tipo de formato inválido' });
    }

    const result = await executePythonScript('youtube', url, type);

    // Para teste, não salvar no banco
    /*
    const download = new Download({
      apiKey: req.apiKey,
      platform: 'youtube',
      url,
      format: type,
      success: result.success,
      filePath: result.file_path,
      error: result.error
    });
    await download.save();
    */

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro no download: ' + error.message });
  }
});

// Download Facebook
app.post('/api/download/facebook', verifyApiKey, async (req, res) => {
  try {
    const { url, type = 'mp4' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    const validTypes = ['mp3', 'mp4', 'm4a', 'wav'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Tipo de formato inválido' });
    }

    const result = await executePythonScript('facebook', url, type);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro no download: ' + error.message });
  }
});

// Download TikTok
app.post('/api/download/tiktok', verifyApiKey, async (req, res) => {
  try {
    const { url, type = 'mp4' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    const validTypes = ['mp3', 'mp4', 'm4a', 'wav'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Tipo de formato inválido' });
    }

    const result = await executePythonScript('tiktok', url, type);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro no download: ' + error.message });
  }
});

// Download Instagram
app.post('/api/download/instagram', verifyApiKey, async (req, res) => {
  try {
    const { url, type = 'mp4' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    const validTypes = ['mp3', 'mp4', 'm4a', 'wav'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Tipo de formato inválido' });
    }

    const result = await executePythonScript('instagram', url, type);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro no download: ' + error.message });
  }
});

// Download Spotify (placeholder)
app.post('/api/download/spotify', verifyApiKey, async (req, res) => {
  try {
    const { url, type = 'mp3' } = req.body;

    const result = await executePythonScript('spotify', url, type);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro no download: ' + error.message });
  }
});

// Rota para servir arquivos baixados
app.get('/downloads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'downloads', filename);
  
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});

// Estatísticas da API Key - simplificada para teste
app.get('/api/stats', verifyApiKey, async (req, res) => {
  try {
    res.json({
      totalDownloads: 0,
      successfulDownloads: 0,
      todayDownloads: 0,
      dailyLimit: 1000,
      remainingToday: 1000
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'))
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
