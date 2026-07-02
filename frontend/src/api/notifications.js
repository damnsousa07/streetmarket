// ================================================================
// NOTIFICATIONS.JS – Servico de API para notificacoes
// ================================================================
// Contem funcoes para interagir com as rotas de notificacoes da API publica.
// Utiliza o cliente HTTP (Axios) configurado em client.js.
// ================================================================

import { api } from './client';

// ================================================================
// FUNCAO: Obter notificacoes de um utilizador
// ================================================================

// GET /notifications/:user_id – Retorna todas as notificacoes de um utilizador
// As notificacoes sao ordenadas da mais recente para a mais antiga.
// Limite maximo: 200 notificacoes (definido no backend).
export async function getNotificationsByUser(user_id) {
  // Faz a requisicao GET para o endpoint /notifications/{user_id}
  // Exemplo: /notifications/1 retorna as notificacoes do utilizador com ID 1
  const res = await api.get(`/notifications/${user_id}`);
  
  return res.data;
}