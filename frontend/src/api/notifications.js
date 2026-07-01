// ================================================================
// NOTIFICATIONS.JS – Serviço de API para notificações
// ================================================================
// Este ficheiro contém funções para interagir com as rotas de
// notificações da API pública.
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// ================================================================

// Importação do cliente HTTP (Axios) configurado
import { api } from './client';

// ================================================================
// FUNÇÃO: Obter notificações de um utilizador
// ================================================================

// GET /notifications/:user_id – Retorna todas as notificações de um utilizador
// As notificações são ordenadas da mais recente para a mais antiga.
// Limite máximo: 200 notificações (definido no backend).
export async function getNotificationsByUser(user_id) {
  // Faz a requisição GET para o endpoint /notifications/{user_id}
  // Exemplo: /notifications/1
  const res = await api.get(`/notifications/${user_id}`);
  
  // Retorna os dados da resposta (array de notificações)
  return res.data;
}
