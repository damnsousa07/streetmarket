// ================================================================
// FOOTER.JSX – Componente de rodape (Footer)
// ================================================================
// Componente de rodape exibido em todas as paginas.
// Contem informacao de copyright e e estilizado com cores consistentes.
// ================================================================

import React from 'react';

// ================================================================
// COMPONENTE: Footer
// ================================================================

export default function Footer() {
    return (
        <footer style={{
            textAlign: 'center',
            padding: '20px',
            backgroundColor: '#0b1220',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '14px',
            marginTop: 'auto',
        }}>
            <p>© {new Date().getFullYear()} StreetMarket. Todos os direitos reservados.</p>
        </footer>
    );
}