// ================================================================
// EMAILSERVICE.JS – Serviço de envio de emails
// ================================================================
// Este ficheiro contém todas as funções para enviar emails
// utilizando Nodemailer com Gmail.
// Tipos de emails suportados:
// - Confirmação de encomenda (com imagem do produto e convite para review)
// - Pedido de review (follow-up após receção do produto)
// - Verificação de email (código de 6 dígitos)
// - Redefinição de password (link com token)
// ================================================================

// Importação dos módulos necessários
const nodemailer = require('nodemailer');    // Biblioteca para envio de emails
const path = require('path');                // Manipulação de caminhos de ficheiros
const fs = require('fs');                    // Manipulação do sistema de ficheiros

// ================================================================
// CONFIGURAÇÃO DO TRANSPORTADOR (Gmail)
// ================================================================

// Cria o transportador com as credenciais do .env
// EMAIL_USER = endereço de email (ex: streetmarketptt@gmail.com)
// EMAIL_PASS = senha de aplicação do Gmail (não é a senha normal)
const transporter = nodemailer.createTransport({
    service: 'gmail',                       // Serviço de email (Gmail)
    auth: {
        user: process.env.EMAIL_USER,       // Email que envia as mensagens
        pass: process.env.EMAIL_PASS        // Senha de aplicação
    }
});

// ================================================================
// FUNÇÃO: Enviar email de confirmação de encomenda
// ================================================================

// sendOrderEmail – Envia um email com os detalhes da encomenda
// Inclui:
// - Logo da marca (inline)
// - Imagem do produto (inline, se disponível)
// - Número da encomenda e data
// - Tabela com os itens comprados
// - Total da encomenda
// - Bloco de review (opcional, se reviewProductId for fornecido)
async function sendOrderEmail({
    to,                             // Email do destinatário
    nomeCliente,                    // Nome do cliente
    logoUrl,                        // (não utilizado, mantido para compatibilidade)
    corPrimaria = '#007bff',        // Cor principal da marca (azul por padrão)
    orderNumber,                    // Número da encomenda
    orderDate,                      // Data da encomenda (formatada)
    items,                          // Lista de itens { nome, preco, quantidade? }
    total,                          // Total da encomenda
    produtoImagem = null,           // Caminho da imagem do produto (opcional)
    marca = "StreetMarket",          // Nome da marca
    reviewProductId = null,         // ID do produto para o link de review (opcional)
    reviewProductName = null        // Nome do produto para a review (opcional)
}) {
    // ----- 1. VALIDAÇÃO DOS DADOS OBRIGATÓRIOS -----
    if (!to || !nomeCliente || !orderNumber || !items || !total) {
        throw new Error('Faltam dados essenciais para enviar o email de confirmação');
    }

    // Função auxiliar para formatar preços em euros (ex: 10.50 -> €10.50)
    const formatPrice = (price) => `€${parseFloat(price).toFixed(2)}`;

    // ----- 2. CONSTRUÇÃO DA TABELA DE ITENS (HTML) -----
    let itemsHtml = '';
    items.forEach(item => {
        const nome = item.nome;
        const preco = formatPrice(item.preco);
        const qtd = item.quantidade ? ` × ${item.quantidade}` : '';
        itemsHtml += `
            <tr style="border-bottom: 1px solid #eaeaea;">
                <td style="padding: 16px 0; font-size: 16px; color: #333;">${nome}${qtd}</td>
                <td style="padding: 16px 0; text-align: right; font-size: 16px; font-weight: bold; color: #333;">${preco}</td>
            </tr>
        `;
    });

    // ----- 3. CONFIGURAÇÃO DAS IMAGENS INLINE -----
    let attachments = [];               // Array para anexos (logo + imagem do produto)
    let logoHtml = '';                 // HTML para a logo
    let productImageHtml = '';         // HTML para a imagem do produto (secção principal)
    let reviewImageHtml = '';          // HTML para a imagem do produto (secção de review)

    // ----- 3a. LOGO DA MARCA (inline) -----
    const logoPath = path.join(__dirname, '../../frontend/public/LogoStreetmarket.png');
    if (fs.existsSync(logoPath)) {
        attachments.push({
            filename: 'logo.png',
            path: logoPath,
            cid: 'logo-cid'              // Referência no HTML: src="cid:logo-cid"
        });
        logoHtml = `<img src="cid:logo-cid" alt="${marca}" style="max-width: 180px; height: auto; display: block;">`;
    } else {
        console.warn('⚠️ Logo não encontrada em:', logoPath);
        // Fallback: URL externa (se definida no .env)
        logoHtml = `<img src="${process.env.LOGO_URL || 'http://localhost:5173/LogoStreetmarket.png'}" alt="${marca}" style="max-width: 180px; height: auto; display: block;">`;
    }

    // ----- 3b. IMAGEM DO PRODUTO (inline) -----
    if (produtoImagem) {
        // Converte o caminho relativo (ex: /uploads/prod-123.jpg) para absoluto
        let relativePath = produtoImagem.replace(/^https?:\/\/localhost:3000/, '');
        const absolutePath = path.join(__dirname, '..', relativePath);
        if (fs.existsSync(absolutePath)) {
            attachments.push({
                filename: 'produto.jpg',
                path: absolutePath,
                cid: 'produto-img'           // Referência: src="cid:produto-img"
            });
            // Imagem para a secção principal (maior)
            const imgTag = `<img src="cid:produto-img" alt="Produto" style="max-width: 280px; width: 100%; border-radius: 12px; border: 1px solid #eee;">`;
            productImageHtml = `
                <div style="text-align: center; margin: 20px 0;">
                    ${imgTag}
                </div>
            `;
            // Imagem para o bloco de review (mais pequena)
            reviewImageHtml = `
                <div style="text-align: center; margin: 15px 0;">
                    <img src="cid:produto-img" alt="${reviewProductName || 'Produto'}" style="max-width: 180px; width: 100%; border-radius: 8px; border: 1px solid #eee;">
                </div>
            `;
        } else {
            console.warn('⚠️ Imagem do produto não encontrada:', absolutePath);
        }
    }

    // ----- 4. BLOCO DE REVIEW (opcional) -----
    // Só é gerado se forem fornecidos o ID e o nome do produto
    let reviewBlockHtml = '';
    if (reviewProductId && reviewProductName) {
        const reviewLink = `http://localhost:5173/products/${reviewProductId}`; // URL para a página do produto
        reviewBlockHtml = `
            <tr>
                <td align="center" style="padding: 20px 40px 10px 40px; border-top: 1px solid #eee;">
                    <h3 style="font-size: 18px; color: #333; margin: 0 0 8px 0;">Gostaste do teu produto?</h3>
                    <p style="font-size: 15px; color: #666; margin: 0 0 12px 0;">
                        A tua opinião é muito importante para nós! 
                        <strong>${reviewProductName}</strong> merece a tua avaliação.
                    </p>
                    ${reviewImageHtml}
                    <a href="${reviewLink}" 
                       style="display: inline-block; padding: 12px 30px; background-color: ${corPrimaria}; 
                              color: #fff; text-decoration: none; border-radius: 30px; font-weight: bold; 
                              font-size: 16px; margin: 8px 0 4px;">
                        Deixar uma Review
                    </a>
                    <p style="font-size: 13px; color: #aaa; margin: 12px 0 0;">Obrigado por comprares na ${marca}!</p>
                </td>
            </tr>
        `;
    }

    // ----- 5. CONSTRUÇÃO DO HTML COMPLETO -----
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmação de Encomenda</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                            <!-- LOGO -->
                            <tr>
                                <td align="center" style="padding: 40px 40px 20px 40px;">
                                    ${logoHtml}
                                </td>
                            </tr>
                            <!-- TÍTULO -->
                            <tr>
                                <td align="center" style="padding: 0 40px;">
                                    <h1 style="font-size: 32px; letter-spacing: 4px; color: ${corPrimaria}; margin: 0; font-weight: 300;">OBRIGADO PELA SUA COMPRA</h1>
                                </td>
                            </tr>
                            <!-- MENSAGEM PESSOAL -->
                            <tr>
                                <td align="center" style="padding: 30px 40px 10px 40px;">
                                    <p style="font-size: 18px; color: #333; margin: 0;">Olá <strong>${nomeCliente}</strong>,</p>
                                    <p style="font-size: 16px; color: #666; margin: 15px 0 0 0;">Obrigado por escolher a <strong style="color: ${corPrimaria};">${marca}</strong>!</p>
                                    <p style="font-size: 16px; color: #666;">A sua encomenda foi recebida com sucesso.</p>
                                </td>
                            </tr>
                            <!-- IMAGEM DO PRODUTO -->
                            ${productImageHtml}
                            <!-- NÚMERO DA ENCOMENDA E DATA -->
                            <tr>
                                <td align="center" style="padding: 0 40px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border-radius: 6px; margin: 15px 0;">
                                        <tr>
                                            <td align="center" style="padding: 20px;">
                                                <p style="margin: 0; font-size: 14px; color: #999;">NÚMERO DA ENCOMENDA</p>
                                                <p style="margin: 5px 0 0; font-size: 22px; font-weight: bold; color: #333;">${orderNumber}</p>
                                                <p style="margin: 15px 0 0; font-size: 13px; color: #999;">Data: ${orderDate}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- TABELA DE ITENS -->
                            <tr>
                                <td style="padding: 20px 40px;">
                                    <h2 style="font-size: 20px; color: #333; margin: 0 0 10px 0; font-weight: normal;">OS SEUS ITENS</h2>
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                        ${itemsHtml}
                                        <tr style="border-top: 2px solid #eaeaea;">
                                            <td style="padding: 20px 0 0 0; font-size: 18px; font-weight: bold; color: #333;">Total</td>
                                            <td style="padding: 20px 0 0 0; text-align: right; font-size: 18px; font-weight: bold; color: ${corPrimaria};">${formatPrice(total)}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- BLOCO DE REVIEW -->
                            ${reviewBlockHtml}
                            <!-- RODAPÉ -->
                            <tr>
                                <td align="center" style="padding: 30px 40px 40px 40px; border-top: 1px solid #eee;">
                                    <p style="font-size: 12px; color: #aaa; margin: 0;">&copy; ${new Date().getFullYear()} ${marca}. Todos os direitos reservados.</p>
                                    <p style="font-size: 12px; color: #aaa; margin: 5px 0 0;">Precisa de ajuda? <a href="#" style="color: ${corPrimaria}; text-decoration: none;">Contacte-nos</a></p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;

    // ----- 6. ENVIO DO EMAIL -----
    await transporter.sendMail({
        from: `"${marca}" <${process.env.EMAIL_USER}>`,    // Remetente
        to,                                               // Destinatário
        subject: `Confirmação de Encomenda #${orderNumber}`, // Assunto
        html,                                             // Corpo do email (HTML)
        attachments                                       // Anexos (logo + imagem do produto)
    });
}

// ================================================================
// FUNÇÃO: Enviar email de pedido de review (follow-up)
// ================================================================

// sendReviewRequestEmail – Envia um email a pedir uma review
// Esta função é chamada quando uma encomenda muda para estado "Recebido".
async function sendReviewRequestEmail(to, nomeUser, nomeProduto, product_id, imagem) {
    // Array para anexos (apenas a logo)
    const attachments = [];

    // ----- LOGO (inline) -----
    const logoPath = path.join(__dirname, '../../frontend/public/LogoStreetmarket.png');
    let logoHtml = '';
    if (fs.existsSync(logoPath)) {
        attachments.push({
            filename: 'logo.png',
            path: logoPath,
            cid: 'logo-cid'
        });
        logoHtml = `<img src="cid:logo-cid" alt="StreetMarket" style="max-width: 180px; height: auto; display: block;">`;
    } else {
        console.warn('⚠️ Logo não encontrada em:', logoPath);
        logoHtml = `<img src="${process.env.LOGO_URL || 'http://localhost:5173/LogoStreetmarket.png'}" alt="StreetMarket" style="max-width: 180px; height: auto; display: block;">`;
    }

    // ----- CONSTRUÇÃO DO HTML -----
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Avalia o teu produto</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                            <!-- LOGO -->
                            <tr>
                                <td align="center" style="padding: 40px 40px 20px 40px;">
                                    ${logoHtml}
                                </td>
                            </tr>
                            <!-- TÍTULO -->
                            <tr>
                                <td align="center" style="padding: 0 40px;">
                                    <h1 style="font-size: 28px; letter-spacing: 2px; color: #007bff; margin: 0; font-weight: 300;">AVALIA O TEU PRODUTO</h1>
                                </td>
                            </tr>
                            <!-- MENSAGEM PESSOAL -->
                            <tr>
                                <td align="center" style="padding: 30px 40px 20px 40px;">
                                    <p style="font-size: 18px; color: #333; margin: 0;">Olá <strong>${nomeUser}</strong>,</p>
                                    <p style="font-size: 16px; color: #666; margin: 15px 0 0 0;">Esperamos que estejas a gostar do teu produto <strong style="color: #007bff;">${nomeProduto}</strong>.</p>
                                    <p style="font-size: 16px; color: #666; margin: 10px 0 0;">A tua opinião é muito importante para nós!</p>
                                </td>
                            </tr>
                            <!-- BOTÃO DE REVIEW -->
                            <tr>
                                <td align="center" style="padding: 10px 40px 30px;">
                                    <a href="http://localhost:5173/products/${product_id}" 
                                       style="display: inline-block; padding: 14px 40px; background-color: #007bff; 
                                              color: #fff; text-decoration: none; border-radius: 30px; font-weight: bold; 
                                              font-size: 16px; margin: 8px 0 4px;">
                                        Escrever Review
                                    </a>
                                </td>
                            </tr>
                            <!-- AGRADECIMENTO -->
                            <tr>
                                <td align="center" style="padding: 0 40px 20px;">
                                    <p style="font-size: 14px; color: #888; margin: 0;">Obrigado por comprares na <strong>StreetMarket</strong>!</p>
                                </td>
                            </tr>
                            <!-- RODAPÉ -->
                            <tr>
                                <td align="center" style="padding: 30px 40px 40px 40px; border-top: 1px solid #eee;">
                                    <p style="font-size: 12px; color: #aaa; margin: 0;">&copy; ${new Date().getFullYear()} StreetMarket. Todos os direitos reservados.</p>
                                    <p style="font-size: 12px; color: #aaa; margin: 5px 0 0;">Precisa de ajuda? <a href="#" style="color: #007bff; text-decoration: none;">Contacte-nos</a></p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;

    // ----- ENVIO DO EMAIL -----
    await transporter.sendMail({
        from: `"StreetMarket" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Avalia o produto "${nomeProduto}"!`,
        html,
        attachments
    });
}

// ================================================================
// FUNÇÃO: Enviar email de verificação de registo (código de 6 dígitos)
// ================================================================

// sendVerificationEmail – Envia um email com o código de verificação
// O código é usado para confirmar a conta do utilizador.
// Expira em 15 minutos.
async function sendVerificationEmail(to, nome, codigo) {
    // Array para anexos (apenas a logo)
    const attachments = [];

    // ----- LOGO (inline) -----
    const logoPath = path.join(__dirname, '../../frontend/public/LogoStreetmarket.png');
    let logoHtml = '';
    if (fs.existsSync(logoPath)) {
        attachments.push({
            filename: 'logo.png',
            path: logoPath,
            cid: 'logo-cid'
        });
        logoHtml = `<img src="cid:logo-cid" alt="StreetMarket" style="max-width: 180px; height: auto; display: block;">`;
    } else {
        console.warn('⚠️ Logo não encontrada em:', logoPath);
        logoHtml = `<img src="${process.env.LOGO_URL || 'http://localhost:5173/LogoStreetmarket.png'}" alt="StreetMarket" style="max-width: 180px; height: auto; display: block;">`;
    }

    // ----- CONSTRUÇÃO DO HTML -----
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verifica o teu email</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                            <!-- LOGO -->
                            <tr>
                                <td align="center" style="padding: 40px 40px 20px 40px;">
                                    ${logoHtml}
                                </td>
                            </tr>
                            <!-- TÍTULO -->
                            <tr>
                                <td align="center" style="padding: 0 40px;">
                                    <h1 style="font-size: 28px; letter-spacing: 2px; color: #007bff; margin: 0; font-weight: 300;">VERIFICA O TEU EMAIL</h1>
                                </td>
                            </tr>
                            <!-- MENSAGEM PESSOAL -->
                            <tr>
                                <td align="center" style="padding: 30px 40px 20px 40px;">
                                    <p style="font-size: 18px; color: #333; margin: 0;">Olá <strong>${nome}</strong>,</p>
                                    <p style="font-size: 16px; color: #666; margin: 15px 0 0 0;">Obrigado por te registares na StreetMarket!</p>
                                    <p style="font-size: 16px; color: #666; margin: 10px 0 20px;">Para ativares a tua conta, utiliza o seguinte código de verificação:</p>
                                </td>
                            </tr>
                            <!-- CÓDIGO DE VERIFICAÇÃO -->
                            <tr>
                                <td align="center" style="padding: 0 40px 20px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border-radius: 8px; border: 1px solid #eaeaea;">
                                        <tr>
                                            <td align="center" style="padding: 20px;">
                                                <span style="font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 8px;">${codigo}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- AVISO DE EXPIRAÇÃO -->
                            <tr>
                                <td align="center" style="padding: 0 40px 20px;">
                                    <p style="font-size: 14px; color: #888; margin: 0;">Este código expira em <strong>15 minutos</strong>.</p>
                                </td>
                            </tr>
                            <!-- RODAPÉ -->
                            <tr>
                                <td align="center" style="padding: 30px 40px 40px 40px; border-top: 1px solid #eee;">
                                    <p style="font-size: 12px; color: #aaa; margin: 0;">Se não fizeste este pedido, ignora este email.</p>
                                    <p style="font-size: 12px; color: #aaa; margin: 5px 0 0;">&copy; ${new Date().getFullYear()} StreetMarket. Todos os direitos reservados.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;

    // ----- ENVIO DO EMAIL -----
    await transporter.sendMail({
        from: `"StreetMarket" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Verifica o teu email - StreetMarket',
        html,
        attachments
    });
}

// ================================================================
// FUNÇÃO: Enviar email para redefinição de password
// ================================================================

// sendResetPasswordEmail – Envia um email com link para redefinir a password
// O link contém um token que expira em 15 minutos.
async function sendResetPasswordEmail(to, nome, resetLink) {
    // Array para anexos (apenas a logo)
    const attachments = [];

    // ----- LOGO (inline) -----
    const logoPath = path.join(__dirname, '../../frontend/public/LogoStreetmarket.png');
    let logoHtml = '';
    if (fs.existsSync(logoPath)) {
        attachments.push({
            filename: 'logo.png',
            path: logoPath,
            cid: 'logo-cid'
        });
        logoHtml = `<img src="cid:logo-cid" alt="StreetMarket" style="max-width: 180px; height: auto; display: block;">`;
    } else {
        console.warn('⚠️ Logo não encontrada em:', logoPath);
        logoHtml = `<img src="${process.env.LOGO_URL || 'http://localhost:5173/LogoStreetmarket.png'}" alt="StreetMarket" style="max-width: 180px; height: auto; display: block;">`;
    }

    // ----- CONSTRUÇÃO DO HTML -----
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redefinir password</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                            <!-- LOGO -->
                            <tr>
                                <td align="center" style="padding: 40px 40px 20px 40px;">
                                    ${logoHtml}
                                </td>
                            </tr>
                            <!-- TÍTULO -->
                            <tr>
                                <td align="center" style="padding: 0 40px;">
                                    <h1 style="font-size: 28px; letter-spacing: 2px; color: #007bff; margin: 0; font-weight: 300;">REDEFINIR PASSWORD</h1>
                                </td>
                            </tr>
                            <!-- MENSAGEM PESSOAL -->
                            <tr>
                                <td align="center" style="padding: 30px 40px 20px 40px;">
                                    <p style="font-size: 18px; color: #333; margin: 0;">Olá <strong>${nome}</strong>,</p>
                                    <p style="font-size: 16px; color: #666; margin: 15px 0 0 0;">Recebemos um pedido para redefinir a tua password.</p>
                                    <p style="font-size: 16px; color: #666; margin: 10px 0 20px;">Clica no botão abaixo para definir uma nova password:</p>
                                </td>
                            </tr>
                            <!-- BOTÃO DE REDEFINIÇÃO -->
                            <tr>
                                <td align="center" style="padding: 0 40px 30px;">
                                    <a href="${resetLink}" 
                                       style="display: inline-block; padding: 14px 40px; background-color: #007bff; 
                                              color: #fff; text-decoration: none; border-radius: 30px; font-weight: bold; 
                                              font-size: 16px; margin: 8px 0 4px;">
                                        Redefinir password
                                    </a>
                                </td>
                            </tr>
                            <!-- AVISO DE EXPIRAÇÃO -->
                            <tr>
                                <td align="center" style="padding: 0 40px 20px;">
                                    <p style="font-size: 14px; color: #888; margin: 0;">Se não pediste a redefinição, ignora este email.</p>
                                    <p style="font-size: 12px; color: #aaa; margin-top: 6px;">Este link expira em <strong>15 minutos</strong>.</p>
                                </td>
                            </tr>
                            <!-- RODAPÉ -->
                            <tr>
                                <td align="center" style="padding: 30px 40px 40px 40px; border-top: 1px solid #eee;">
                                    <p style="font-size: 12px; color: #aaa; margin: 0;">&copy; ${new Date().getFullYear()} StreetMarket. Todos os direitos reservados.</p>
                                    <p style="font-size: 12px; color: #aaa; margin: 5px 0 0;">Precisa de ajuda? <a href="#" style="color: #007bff; text-decoration: none;">Contacte-nos</a></p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;

    // ----- ENVIO DO EMAIL -----
    await transporter.sendMail({
        from: `"StreetMarket" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Redefinir password - StreetMarket',
        html,
        attachments
    });
}

// ================================================================
// EXPORTAÇÃO DAS FUNÇÕES
// ================================================================
module.exports = {
    sendOrderEmail,              // Confirmação de encomenda
    sendReviewRequestEmail,      // Pedido de review (follow-up)
    sendVerificationEmail,       // Verificação de email (código)
    sendResetPasswordEmail       // Redefinição de password
};