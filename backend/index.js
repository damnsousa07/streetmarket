const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ========== CONFIGURAÇÃO DO UPLOAD (passo 2.3) ==========
// Garantir que a pasta uploads existe
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuração do armazenamento multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `prod-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // limite de 5MB por imagem
});

// Servir ficheiros estáticos da pasta uploads (para aceder às imagens via URL)
app.use('/uploads', express.static(uploadDir));
// =========================================================

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== ROTAS DE LOCALIZAÇÃO (NOVO) ==========
const locationsRoutes = require('./routes/locations');
app.use('/locations', locationsRoutes);
// =================================================

// Rotas
const usersRoutes = require('./routes/users');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const reviewsRoutes = require('./routes/reviews');
const notificationsRoutes = require('./routes/notifications');
const categoriesRoutes = require('./routes/categories');
const paymentsRoutes = require('./routes/payments');

app.use('/payments', paymentsRoutes);
app.use('/users', usersRoutes);
app.use('/products', productsRoutes);
app.use('/orders', ordersRoutes);
app.use('/admin', adminRoutes);
app.use('/reviews', reviewsRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/categories', categoriesRoutes);

// Rota teste
app.get('/', (req, res) => {
  res.send('Servidor StreetMarket a funcionar!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

// Exportar o upload (para ser usado noutros ficheiros, ex: routes/products.js)
module.exports = { upload };