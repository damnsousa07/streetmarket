// ImageModal.jsx
// Modal para exibir imagens em tamanho grande, com fundo escuro e fecho ao clicar fora ou ESC.

import { useEffect } from 'react';

export default function ImageModal({ src, alt, onClose }) {
    // Efeito para fechar o modal quando a tecla ESC for pressionada
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        // Remove o listener quando o componente for desmontado
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        // Fundo escuro: clicar nele fecha o modal (onClose)
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
            {/* A imagem: o clique não propaga para o fundo (evita fechar ao clicar na imagem) */}
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