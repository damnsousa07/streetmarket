// FAQ.jsx
// Página de Perguntas Frequentes (FAQ) com accordion expansível.
// Contacto apenas por email (sem suporte ao cliente).

import { useState } from 'react';

// Dados das perguntas e respostas (ajustados para a StreetMarket)
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
    answer: 'Sim, tens 14 dias após a receção da encomenda para devolver o produto, desde que esteja nas mesmas condições e na embalagem original. Envia um email para streetmarket@email.com para iniciares o processo.',
  },
  {
    question: 'Como entro em contacto convosco?',
    answer: 'Podes enviar um email para streetmarket@email.com. Respondemos dentro de 24 horas úteis. (Não temos apoio ao cliente por telefone ou chat.)',
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

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="container" style={{ padding: '32px 0', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>Perguntas Frequentes</h1>
      <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: '32px' }}>
        Encontra aqui as respostas às perguntas mais comuns.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {faqData.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="card"
              style={{
                padding: '16px 20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => toggle(index)}
            >
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
                <span style={{ fontSize: '24px', color: '#007bff' }}>
                  {isOpen ? '−' : '+'}
                </span>
              </div>

              <div
                style={{
                  maxHeight: isOpen ? '500px' : '0',
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
          <a href="mailto:streetmarket@email.com" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 600 }}>
            streetmarket@email.com
          </a>
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
          Respondemos dentro de 24 horas úteis.
        </p>
      </div>
    </div>
  );
}