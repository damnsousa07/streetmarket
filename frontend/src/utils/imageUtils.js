export function getFullImageUrl(imagePath) {
  if (!imagePath) return '';
  // Se já for URL absoluto (http:// ou https://), retorna como está
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Caso contrário, assume caminho relativo e prefixa com a base do backend
  return `${import.meta.env.VITE_API_URL}${imagePath}`;
}