// Footer.jsx
// Componente de rodapé da aplicação com informação de copyright.

export default function Footer() {
    return (
        <footer style={{
            textAlign: 'center',
            padding: '20px',
            backgroundColor: '#0b1220',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '14px',
            marginTop: 'auto', // garante que o footer fica no final do flex container
        }}>
            {/* Mostra o ano atual dinamicamente e o nome da marca */}
            <p>© {new Date().getFullYear()} StreetMarket. Todos os direitos reservados.</p>
        </footer>
    );
}