// server.js
const express = require('express');
const mongoose = require('mongoose');
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

// Conexão MongoDB
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

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// Middleware de verificação da API Key
const verifyApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API Key requerida' });
  }

  try {
    const keyRecord = await ApiKey.findOne({ apiKey, isActive: true });
    if (!keyRecord) {
      return res.status(401).json({ error: 'API Key inválida' });
    }

    // Verificar limite diário
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRequests = await Download.countDocuments({
      apiKey: apiKey,
      createdAt: { $gte: today }
    });

    if (todayRequests >= keyRecord.dailyLimit) {
      return res.status(429).json({ error: 'Limite diário de requisições excedido' });
    }

    // Incrementar contador
    keyRecord.requestCount += 1;
    await keyRecord.save();

    req.apiKey = apiKey;
    req.keyRecord = keyRecord;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar API Key' });
  }
};

// Função para executar o script Python
const executePythonScript = (platform, url, format) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'download_service.py');
    const command = `python "${scriptPath}" "${platform}" "${url}" "${format}"`;
    
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

// ROTAS DE AUTENTICAÇÃO

// Registro
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Verificar se usuário já existe
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário ou email já existe' });
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ message: 'Usuário criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Encontrar usuário
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    // Gerar JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTAS DE API KEYS

// Gerar nova API Key
app.post('/api/keys/generate', authenticateToken, async (req, res) => {
  try {
    const { keyName } = req.body;

    // Gerar API Key única
    const apiKey = 'api_' + crypto.randomBytes(32).toString('hex');

    const newApiKey = new ApiKey({
      userId: req.user.userId,
      keyName,
      apiKey
    });

    await newApiKey.save();
    res.json({ apiKey, keyName });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar API Key' });
  }
});

// Listar API Keys do usuário
app.get('/api/keys', authenticateToken, async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user.userId })
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar API Keys' });
  }
});

// Desativar API Key
app.put('/api/keys/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    await ApiKey.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { isActive: false }
    );

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

    // Salvar no banco
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

    const download = new Download({
      apiKey: req.apiKey,
      platform: 'facebook',
      url,
      format: type,
      success: result.success,
      filePath: result.file_path,
      error: result.error
    });
    await download.save();

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

    const download = new Download({
      apiKey: req.apiKey,
      platform: 'tiktok',
      url,
      format: type,
      success: result.success,
      filePath: result.file_path,
      error: result.error
    });
    await download.save();

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

    const download = new Download({
      apiKey: req.apiKey,
      platform: 'instagram',
      url,
      format: type,
      success: result.success,
      filePath: result.file_path,
      error: result.error
    });
    await download.save();

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

    const download = new Download({
      apiKey: req.apiKey,
      platform: 'spotify',
      url,
      format: type,
      success: result.success,
      filePath: result.file_path,
      error: result.error
    });
    await download.save();

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

// Estatísticas da API Key
app.get('/api/stats', verifyApiKey, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Download.aggregate([
      { $match: { apiKey: req.apiKey } },
      {
        $group: {
          _id: null,
          totalDownloads: { $sum: 1 },
          successfulDownloads: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          todayDownloads: {
            $sum: { $cond: [{ $gte: ['$createdAt', today] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalDownloads: 0,
      successfulDownloads: 0,
      todayDownloads: 0
    };

    result.dailyLimit = req.keyRecord.dailyLimit;
    result.remainingToday = req.keyRecord.dailyLimit - result.todayDownloads;

    res.json(result);
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
