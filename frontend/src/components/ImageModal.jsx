// ================================================================
// IMAGEMODAL.JSX – Modal para exibir imagens em tamanho grande
// ================================================================
// Este componente exibe uma imagem em tamanho ampliado sobre um fundo escuro.
// Pode ser fechado ao:
// - Clicar no fundo escuro (fora da imagem)
// - Pressionar a tecla ESC
// ================================================================

// Importação dos módulos necessários
import { useEffect } from 'react';

// ================================================================
// COMPONENTE: ImageModal
// ================================================================

// Parâmetros:
//   src - URL da imagem a exibir
//   alt - Texto alternativo (acessibilidade)
//   onClose - Função chamada ao fechar o modal
export default function ImageModal({ src, alt, onClose }) {
    // ----- EFEITO: Fechar o modal com a tecla ESC -----
    // Adiciona um listener para a tecla Escape e remove quando o componente desmontar
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();   // Chama onClose se a tecla for ESC
        };
        window.addEventListener('keydown', handleEsc);   // Adiciona o listener
        return () => window.removeEventListener('keydown', handleEsc); // Remove ao desmontar
    }, [onClose]);

    // ----- RENDERIZAÇÃO -----
    return (
        // Fundo escuro (overlay)
        // Clicar no fundo fecha o modal
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.9)',   // Fundo preto com 90% de opacidade
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,                         // Fica acima de todos os outros elementos
                cursor: 'pointer',                    // Cursor de mão (indica que é clicável)
            }}
        >
            {/* Imagem em tamanho grande */}
            {/* O clique na imagem não propaga (evita fechar ao clicar na imagem) */}
            <img
                src={src}
                alt={alt}
                onClick={(e) => e.stopPropagation()}  // Impede o fecho ao clicar na imagem
                style={{
                    maxWidth: '90%',
                    maxHeight: '90%',
                    objectFit: 'contain',              // Mantém a proporção sem cortar
                    borderRadius: 8,                   // Bordas arredondadas
                }}
            />
        </div>
    );
}