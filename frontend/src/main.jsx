// ================================================================
// MAIN.JSX – Ponto de entrada da aplicação React
// ================================================================
// Este ficheiro é o ponto de entrada da aplicação frontend.
// Carrega os estilos globais e renderiza o componente principal (App).
// ================================================================

// Importação dos estilos globais (ordem importa: variáveis primeiro)
import './styles/variables.css';   // Variáveis CSS (cores, fontes, espaçamentos)
import './styles/global.css';      // Estilos globais (reset, body, container)
import './styles/components.css';  // Estilos para componentes (navbar, cards, inputs, etc.)

// Importação do React e do ReactDOM
import { StrictMode } from 'react';       // StrictMode: detecta problemas em desenvolvimento
import { createRoot } from 'react-dom/client'; // createRoot: nova API do React 18+
import App from './App.jsx';              // Componente principal da aplicação

// ----- RENDERIZAÇÃO DA APLICAÇÃO -----
// Obtém o elemento root do DOM (definido em index.html)
// Cria a raiz React e renderiza o componente App dentro de StrictMode
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ================================================================
// NOTAS:
// ================================================================
//  A ordem dos imports de CSS é importante:
//    - variables.css primeiro (define as variáveis CSS)
//    - global.css depois (usa as variáveis)
//    - components.css por último (usa as variáveis e estilos globais)
//
// StrictMode é um wrapper que ajuda a identificar problemas
//    em desenvolvimento (não afeta a produção).
//
// createRoot é a nova API do React 18 para renderização,
//    substituindo o antigo ReactDOM.render.
// ================================================================