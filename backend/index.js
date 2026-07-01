// ================================================================
// INDEX.JS – Servidor principal da StreetMarket
// ================================================================
// Este ficheiro é o ponto de entrada do backend.
// Configura o servidor Express, middlewares, rotas e serve ficheiros estáticos.
// ================================================================

// Importação dos módulos necessários
const express = require('express');        // Framework para construir o servidor
const cors = require('cors');              // Middleware para permitir CORS (Cross-Origin Resource Sharing)
const multer = require('multer');          // Middleware para upload de ficheiros
const path = require('path');              // Manipulação de caminhos de ficheiros
const fs = require('fs');                  // Manipulação do sistema de ficheiros
require('dotenv').config();                // Carrega as variáveis de ambiente do ficheiro .env

// Criação da aplicação Express
const app = express();

// ================================================================
// SERVIÇO DE FICHEIROS ESTÁTICOS (IMAGENS)
// ================================================================

// Serve a pasta uploads para acesso público via URL
// Exemplo: http://localhost:3000/uploads/prod-123.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================================================================
// CONFIGURAÇÃO DO UPLOAD DE IMAGENS (MULTER)
// ================================================================

// Define o diretório onde as imagens serão guardadas
const uploadDir = path.join(__dirname, 'uploads');

// Cria a pasta se não existir (para evitar erros)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuração do armazenamento do multer (destino e nome do ficheiro)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),  // Guarda na pasta uploads
  filename: (req, file, cb) => {
    // Gera um nome único: timestamp + número aleatório + extensão original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `prod-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Cria o middleware multer com limite de 5 MB por imagem
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ================================================================
// MIDDLEWARES GLOBAIS
// ================================================================

app.use(cors());                          // Permite pedidos de outras origens (frontend)
app.use(express.json());                  // Faz parse de JSON no corpo da requisição
app.use(express.urlencoded({ extended: true })); // Faz parse de URL-encoded data

// ================================================================
// ROTAS DA API
// ================================================================

// Rotas de localização (distritos, concelhos, códigos postais)
const locationsRoutes = require('./routes/locations');
app.use('/locations', locationsRoutes);

// Rotas principais
const usersRoutes = require('./routes/users');           // Autenticação e utilizadores
const productsRoutes = require('./routes/products');     // Produtos públicos
const ordersRoutes = require('./routes/orders');         // Encomendas
const adminRoutes = require('./routes/admin');           // Painel administrativo
const reviewsRoutes = require('./routes/reviews');       // Avaliações (reviews)
const notificationsRoutes = require('./routes/notifications'); // Notificações
const categoriesRoutes = require('./routes/categories'); // Categorias públicas
const paymentsRoutes = require('./routes/payments');     // Pagamentos (Stripe/PayPal)

// Monta as rotas com os prefixos correspondentes
app.use('/payments', paymentsRoutes);
app.use('/users', usersRoutes);
app.use('/products', productsRoutes);
app.use('/orders', ordersRoutes);
app.use('/admin', adminRoutes);
app.use('/reviews', reviewsRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/categories', categoriesRoutes);

// ================================================================
// ROTA DE TESTE
// ================================================================

app.get('/', (req, res) => {
  res.send('Servidor StreetMarket a funcionar!');
});

// ================================================================
// INICIALIZAÇÃO DO SERVIDOR
// ================================================================

// Define a porta (usa a variável de ambiente PORT ou 3000 por defeito)
const PORT = process.env.PORT || 3000;

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

// ================================================================
// EXPORTAÇÃO DO UPLOAD (para uso noutros ficheiros)
// ================================================================
// O objeto upload é exportado para ser usado nos routers de produtos,
// permitindo a reutilização da configuração do multer.
module.exports = { upload };