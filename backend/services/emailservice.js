// ================================================================
// EMAILSERVICE.JS – Servico de envio de emails
// ================================================================
// Contem todas as funcoes para enviar emails utilizando Nodemailer com Gmail.
// Tipos de emails: Confirmacao de encomenda, Pedido de review,
// Verificacao de email (codigo de 6 digitos) e Redefinicao de password.
// ================================================================

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// ================================================================
// CONFIGURACAO DO TRANSPORTADOR (Gmail)
// ================================================================

// Cria o transportador com as credenciais do .env
// EMAIL_USER = endereco de email (ex: streetmarketptt@gmail.com)
// EMAIL_PASS = senha de aplicacao do Gmail (nao e a senha normal)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ================================================================
// FUNCAO: Enviar email de confirmacao de encomenda
// ================================================================

// sendOrderEmail – Envia email com detalhes da encomenda
// Inclui logo, imagem do produto, numero de encomenda, items, total e bloco de review
async function sendOrderEmail({
    to,
    nomeCliente,
    logoUrl,
    corPrimaria = '#007bff',
    orderNumber,
    orderDate,
    items,
    total,
    produtoImagem = null,
    marca = "StreetMarket",
    reviewProductId = null,
    reviewProductName = null
}) {
    // Valida dados obrigatorios
    if (!to || !nomeCliente || !orderNumber || !items || !total) {
        throw new Error('Faltam dados essenciais para enviar o email de confirmacao');
    }

    // Funcao auxiliar para formatar precos em euros
    const formatPrice = (price) => `€${parseFloat(price).toFixed(2)}`;

    // Constroi tabela de itens em HTML
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

    // Configura anexos e imagens inline
    let attachments = [];
    let logoHtml = '';
    let productImageHtml = '';
    let reviewImageHtml = '';

    // Logo da marca (inline)
    const logoPath = path.join(__dirname, '../../frontend/public/LogoStreetmarket.png');
    if (fs.existsSync(logoPath)) {
        attachments.push({
            filename: 'logo.png',
            path: logoPath,
            cid: 'logo-cid'
        });
        logoHtml = `<img src="cid:logo-cid" alt="${marca}" style="max-width: 180px; height: auto; display: block;">`;
    } else {
        console.warn('Logo nao encontrada em:', logoPath);
        logoHtml = `<img src="${process.env.LOGO_URL || 'http://localhost:5173/LogoStreetmarket.png'}" alt="${marca}" style="max-width: 180px; height: auto; display: block;">`;
    }

    // Imagem do produto (inline) se fornecida
    if (produtoImagem) {
        let relativePath = produtoImagem.replace(/^https?:\/\/localhost:3000/, '');
        const absolutePath = path.join(__dirname, '..', relativePath);
        if (fs.existsSync(absolutePath)) {
            attachments.push({
                filename: 'produto.jpg',
                path: absolutePath,
                cid: 'produto-img'
            });
            const imgTag = `<img src="cid:produto-img" alt="Produto" style="max-width: 280px; width: 100%; border-radius: 12px; border: 1px solid #eee;">`;
            productImageHtml = `
                <div style="text-align: center; margin: 20px 0;">
                    ${imgTag}
                </div>
            `;
            reviewImageHtml = `
                <div style="text-align: center; margin: 15px 0;">
                    <img src="cid:produto-img" alt="${reviewProductName || 'Produto'}" style="max-width: 180px; width: 100%; border-radius: 8px; border: 1px solid #eee;">
                </div>
            `;
        } else {
            console.warn('Imagem do produto nao encontrada:', absolutePath);
        }
    }

    // Bloco de review (opcional)
    let reviewBlockHtml = '';
    if (reviewProductId && reviewProductName) {
        const reviewLink = `http://localhost:5173/products/${reviewProductId}`;
        reviewBlockHtml = `
            <tr>
                <td align="center" style="padding: 20px 40px 10px 40px; border-top: 1px solid #eee;">
                    <h3 style="font-size: 18px; color: #333; margin: 0 0 8px 0;">Gostaste do teu produto?</h3>
                    <p style="font-size: 15px; color: #666; margin: 0 0 12px 0;">
                        A tua opiniao e muito importante para nos! 
                        <strong>${reviewProductName}</strong> merece a tua avaliacao.
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

    // Constroi HTML completo do email
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmacao de Encomenda</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                            <tr>
                                <td align="center" style="padding: 40px 40px 20px 40px;">
                                    ${logoHtml}
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 0 40px;">
                                    <h1 style="font-size: 32px; letter-spacing: 4px; color: ${corPrimaria}; margin: 0; font-weight: 300;">OBRIGADO PELA SUA COMPRA</h1>
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 30px 40px 10px 40px;">
                                    <p style="font-size: 18px; color: #333; margin: 0;">Ola <strong>${nomeCliente}</strong>,</p>
                                    <p style="font-size: 16px; color: #666; margin: 15px 0 0 0;">Obrigado por escolher a <strong style="color: ${corPrimaria};">${marca}</strong>!</p>
                                    <p style="font-size: 16px; color: #666;">A sua encomenda foi recebida com sucesso.</p>
                                </td>
                            </tr>
                            ${productImageHtml}
                            <tr>
                                <td align="center" style="padding: 0 40px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border-radius: 6px; margin: 15px 0;">
                                        <tr>
                                            <td align="center" style="padding: 20px;">
                                                <p style="margin: 0; font-size: 14px; color: #999;">NUMERO DA ENCOMENDA</p>
                                                <p style="margin: 5px 0 0; font-size: 22px; font-weight: bold; color: #333;">${orderNumber}</p>
                                                <p style="margin: 15px 0 0; font-size: 13px; color: #999;">Data: ${orderDate}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
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
                            ${reviewBlockHtml}
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

    // Envia o email
    await transporter.sendMail({
        from: `"${marca}" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Confirmacao de Encomenda #${orderNumber}`,
        html,
        attachments
    });
}

// ================================================================
// FUNCAO: Enviar email de pedido de review (follow-up)
// ================================================================

// sendReviewRequestEmail – Envia email a pedir uma review
// Chamada quando uma encomenda muda para estado "Recebido"
async function sendReviewRequestEmail(to, nomeUser, nomeProduto, product_id, imagem) {
    const attachments = [];

    // Logo (inline)
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
        console.warn('Logo nao encontrada em:', logoPath);
        logoHtml = `<img src="${process.env.LOGO_URL || 'http://localhost:5173/LogoStreetmarket.png'}" alt="StreetMarket" style="max-width: 180px; height: auto; display: block;">`;
    }

    // Constroi HTML
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
                            <tr>
                                <td align="center" style="padding: 40px 40px 20px 40px;">
                                    ${logoHtml}
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 0 40px;">
                                    <h1 style="font-size: 28px; letter-spacing: 2px; color: #007bff; margin: 0; font-weight: 300;">AVALIA O TEU PRODUTO</h1>
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 30px 40px 20px 40px;">
                                    <p style="font-size: 18px; color: #333; margin: 0;">Ola <strong>${nomeUser}</strong>,</p>
                                    <p style="font-size: 16px; color: #666; margin: 15px 0 0 0;">Esperamos que estejas a gostar do teu produto <strong style="color: #007bff;">${nomeProduto}</strong>.</p>
                                    <p style="font-size: 16px; color: #666; margin: 10px 0 0;">A tua opiniao e muito importante para nos!</p>
                                </td>
                            </tr>
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
                            <tr>
                                <td align="center" style="padding: 0 40px 20px;">
                                    <p style="font-size: 14px; color: #888; margin: 0;">Obrigado por comprares na <strong>StreetMarket</strong>!</p>
                                </td>
                            </tr>
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

    await transporter.sendMail({
        from: `"StreetMarket" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Avalia o produto "${nomeProduto}"!`,
        html,
        attachments
    });
}

// ================================================================
// FUNCAO: Enviar email de verificacao de registo (codigo de 6 digitos)
// ================================================================

// sendVerificationEmail – Envia email com codigo de verificacao
// Codigo usado para confirmar a conta do utilizador, expira em 15 minutos
async function sendVerificationEmail(to, nome, codigo) {
    const attachments = [];

    // Logo (inline)
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
        console.warn('Logo nao encontrada em:', logoPath);
        logoHtml = `<img src="${process.env.LOGO_URL || 'http://localhost:5173/LogoStreetmarket.png'}" alt="StreetMarket" style="max-width: 180px; height: auto; display: block;">`;
    }

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
                            <tr>
                                <td align="center" style="padding: 40px 40px 20px 40px;">
                                    ${logoHtml}
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 0 40px;">
                                    <h1 style="font-size: 28px; letter-spacing: 2px; color: #007bff; margin: 0; font-weight: 300;">VERIFICA O TEU EMAIL</h1>
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 30px 40px 20px 40px;">
                                    <p style="font-size: 18px; color: #333; margin: 0;">Ola <strong>${nome}</strong>,</p>
                                    <p style="font-size: 16px; color: #666; margin: 15px 0 0 0;">Obrigado por te registares na StreetMarket!</p>
                                    <p style="font-size: 16px; color: #666; margin: 10px 0 20px;">Para ativares a tua conta, utiliza o seguinte codigo de verificacao:</p>
                                </td>
                            </tr>
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
                            <tr>
                                <td align="center" style="padding: 0 40px 20px;">
                                    <p style="font-size: 14px; color: #888; margin: 0;">Este codigo expira em <strong>15 minutos</strong>.</p>
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 30px 40px 40px 40px; border-top: 1px solid #eee;">
                                    <p style="font-size: 12px; color: #aaa; margin: 0;">Se nao fizeste este pedido, ignora este email.</p>
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

    await transporter.sendMail({
        from: `"StreetMarket" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Verifica o teu email - StreetMarket',
        html,
        attachments
    });
}

// ================================================================
// FUNCAO: Enviar email para redefinicao de password
// ================================================================

// sendResetPasswordEmail – Envia email com link para redefinir password
// Link contem token que expira em 15 minutos
async function sendResetPasswordEmail(to, nome, resetLink) {
    const attachments = [];

    // Logo (inline)
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
        console.warn('Logo nao encontrada em:', logoPath);
        logoHtml = `<img src="${process.env.LOGO_URL || 'http://localhost:5173/LogoStreetmarket.png'}" alt="StreetMarket" style="max-width: 180px; height: auto; display: block;">`;
    }

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
                            <tr>
                                <td align="center" style="padding: 40px 40px 20px 40px;">
                                    ${logoHtml}
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 0 40px;">
                                    <h1 style="font-size: 28px; letter-spacing: 2px; color: #007bff; margin: 0; font-weight: 300;">REDEFINIR PASSWORD</h1>
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 30px 40px 20px 40px;">
                                    <p style="font-size: 18px; color: #333; margin: 0;">Ola <strong>${nome}</strong>,</p>
                                    <p style="font-size: 16px; color: #666; margin: 15px 0 0 0;">Recebemos um pedido para redefinir a tua password.</p>
                                    <p style="font-size: 16px; color: #666; margin: 10px 0 20px;">Clica no botao abaixo para definir uma nova password:</p>
                                </td>
                            </tr>
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
                            <tr>
                                <td align="center" style="padding: 0 40px 20px;">
                                    <p style="font-size: 14px; color: #888; margin: 0;">Se nao pediste a redefinicao, ignora este email.</p>
                                    <p style="font-size: 12px; color: #aaa; margin-top: 6px;">Este link expira em <strong>15 minutos</strong>.</p>
                                </td>
                            </tr>
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

    await transporter.sendMail({
        from: `"StreetMarket" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Redefinir password - StreetMarket',
        html,
        attachments
    });
}

// ================================================================
// EXPORTACAO DAS FUNCOES
// ================================================================
module.exports = {
    sendOrderEmail,
    sendReviewRequestEmail,
    sendVerificationEmail,
    sendResetPasswordEmail
};