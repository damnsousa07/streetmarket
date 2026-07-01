// ================================================================
// FOOTER.JSX – Componente de rodapé (Footer)
// ================================================================
// Este componente é o rodapé da aplicação, exibido em todas as páginas.
// Contém informação de copyright e é estilizado com cores consistentes.
// ================================================================

// Importação do React (necessário para componentes)
import React from 'react';

// ================================================================
// COMPONENTE: Footer
// ================================================================

export default function Footer() {
    return (
        <footer style={{
            textAlign: 'center',                    // Texto centrado
            padding: '20px',                        // Espaçamento interno
            backgroundColor: '#0b1220',             // Cor de fundo escura (igual ao body)
            borderTop: '1px solid rgba(255,255,255,0.1)', // Linha fina no topo
            color: 'rgba(255,255,255,0.6)',         // Texto branco com 60% de opacidade
            fontSize: '14px',                       // Tamanho da fonte
            marginTop: 'auto',                      // Garante que o footer fica no final do flex container
        }}>
            {/* Texto de copyright com ano atual dinâmico */}
            <p>© {new Date().getFullYear()} StreetMarket. Todos os direitos reservados.</p>
        </footer>
    );
}