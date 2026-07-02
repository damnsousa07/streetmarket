// ================================================================
// IMAGEMODAL.JSX – Modal para exibir imagens em tamanho grande
// ================================================================
// Exibe uma imagem ampliada sobre um fundo escuro.
// Pode ser fechado ao clicar no fundo ou pressionar a tecla ESC.
// ================================================================

import { useEffect } from 'react';

// ================================================================
// COMPONENTE: ImageModal
// ================================================================

// Parametros:
//   src - URL da imagem a exibir
//   alt - Texto alternativo para acessibilidade
//   onClose - Funcao chamada ao fechar o modal
export default function ImageModal({ src, alt, onClose }) {
    // Efeito para fechar o modal com a tecla ESC
    // Adiciona e remove o listener automaticamente
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        // Overlay com fundo escuro
        // Clicar no fundo chama a funcao onClose
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                cursor: 'pointer',
            }}
        >
            {/* Imagem ampliada com proporcao mantida */}
            {/* stopPropagation impede o fecho ao clicar na imagem */}
            <img
                src={src}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '90%',
                    maxHeight: '90%',
                    objectFit: 'contain',
                    borderRadius: 8,
                }}
            />
        </div>
    );
}