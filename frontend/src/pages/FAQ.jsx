// ================================================================
// FAQ.JSX – Página de Perguntas Frequentes
// ================================================================
// Este componente exibe uma lista de perguntas frequentes (FAQ)
// com um sistema de accordion (expansível/colapsável).
// Cada pergunta pode ser clicada para revelar a resposta.
// Inclui também um rodapé com contacto por email.
// ================================================================

// Importação do React (necessário para hooks)
import { useState } from 'react';

// ================================================================
// DADOS: Perguntas e respostas (ajustados para a StreetMarket)
// ================================================================

const faqData = [
  {
    question: 'Como faço uma encomenda?',
    answer: 'Navega pela loja, escolhe o produto, seleciona o tamanho (se aplicável) e clica em "Comprar". Segue os passos do checkout para finalizar o pagamento com cartão ou PayPal.',
  },
  {
    question: 'Quais são os métodos de pagamento?',
    answer: 'Aceitamos pagamentos com cartão de crédito/débito (via Stripe) e PayPal. Todos os pagamentos são processados de forma segura.',
  },
  {
    question: 'Como posso rastrear a minha encomenda?',
    answer: 'Após a compra, recebes um email de confirmação. Quando o estado da encomenda mudar para "Enviado", receberás um código de rastreio por email. Também podes ver o estado na tua área de encomendas.',
  },
  {
    question: 'Posso devolver um produto?',
    answer: 'Sim, tens 14 dias após a receção da encomenda para devolver o produto, desde que esteja nas mesmas condições e na embalagem original. Envia um email para streetmarketptt@gmail.com para iniciares o processo.',
  },
  {
    question: 'Como entro em contacto convosco?',
    answer: 'Podes enviar um email para streetmarketptt@gmail.com. Respondemos dentro de 24 horas úteis. (Não temos apoio ao cliente por telefone ou chat.)',
  },
  {
    question: 'Esqueci-me da password, como recupero?',
    answer: 'Na página de login, clica em "Esqueci-me da password". Receberás um email com um link para redefinir a tua password.',
  },
  {
    question: 'Como funcionam as reviews?',
    answer: 'Após receberes a encomenda e o estado for atualizado para "Recebido", receberás um email a convidar-te a avaliar o produto. Podes também ir à página do produto e escrever uma review a qualquer momento.',
  },
  {
    question: 'Os preços incluem IVA?',
    answer: 'Sim, todos os preços apresentados já incluem o IVA à taxa legal em vigor.',
  },
  {
    question: 'Como obtenho fatura da minha compra?',
    answer: 'A fatura é enviada automaticamente por email após a conclusão do pagamento. Se precisares de uma cópia adicional, pede-nos por email.',
  },
  {
    question: 'O produto que eu quero não aparece, como posso pedir para adicionarem-no?',
    answer: 'Envia-nos um email com foto do produto, nome e marca. Vamos tentar o nosso melhor para o adicionar. Caso não consigamos, responderemos em 24h.',
  },
  {
    question: 'A StreetMarket tem loja física?',
    answer: 'Não, a StreetMarket é uma loja online. Trabalhamos apenas através do nosso site.',
  },
];

// ================================================================
// COMPONENTE: FAQ
// ================================================================

export default function FAQ() {
  // Estado para controlar qual pergunta está aberta (null = nenhuma)
  const [openIndex, setOpenIndex] = useState(null);

  // Alterna a expansão de uma pergunta (fecha se já estiver aberta)
  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // ----- RENDERIZAÇÃO -----
  return (
    <div className="container" style={{ padding: '32px 0', maxWidth: '800px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>Perguntas Frequentes</h1>
      <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: '32px' }}>
        Encontra aqui as respostas às perguntas mais comuns.
      </p>

      {/* Lista de perguntas (accordion) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {faqData.map((item, index) => {
          const isOpen = openIndex === index; // Verifica se esta pergunta está aberta
          return (
            <div
              key={index}
              className="card"
              style={{
                padding: '16px 20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => toggle(index)} // Abre/fecha ao clicar
            >
              {/* Cabeçalho da pergunta */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                  {item.question}
                </h3>
                {/* Ícone: − quando aberto, + quando fechado */}
                <span style={{ fontSize: '24px', color: '#007bff' }}>
                  {isOpen ? '−' : '+'}
                </span>
              </div>

              {/* Resposta (expansível) */}
              <div
                style={{
                  maxHeight: isOpen ? '500px' : '0', // Altura máxima quando aberto
                  overflow: 'hidden',
                  transition: 'max-height 0.3s ease, margin-top 0.3s ease',
                  marginTop: isOpen ? '12px' : '0',
                }}
              >
                <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
                  {item.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé da página com contacto por email */}
      <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Não encontraste a resposta que procuravas? Envia-nos um email para{' '}
          <a href="mailto:streetmarketptt@gmail.com" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 600 }}>
            streetmarketptt@gmail.com
          </a>
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
          Respondemos dentro de 24 horas úteis.
        </p>
      </div>
    </div>
  );
}