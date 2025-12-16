### Plano de Regra de Negócio – Venda Parcelada no Pix/Boleto (`FEAT/venda-parcelada-no-boleto-e-no-pix`)

#### 1. Conceito Geral

- **Objetivo**: permitir que o cliente parcele um pacote (ex.: R$ 1.200 em 12× R$ 100) via Pix ou boleto, com:
  - **Entrada = 1ª parcela** (sempre o mesmo valor da parcela).
  - Geração automática dos Pix/boletos das próximas parcelas.
  - **QR Code final do pacote / ingressos só é liberado após quitação total**.
- **Controle 100% manual no backend**:
  - Mercado Pago apenas emite pagamentos individuais (Pix/boleto).
  - Juros/multa/regras de cancelamento são nossas (regra de negócio própria).
  - As regras podem ser **ajustadas por evento/pacote** via admin (ex.: quantas parcelas em atraso cancelam o pedido).

---

#### 2. Entidades de Domínio

##### 2.1 `ParcelledOrder` (VendaParcelada)

- **Campos principais**
  - `id`
  - `customerId`
  - `eventId` / `packageTypeId` (referência ao evento/pacote)
  - `paymentType`: `'pix' | 'boleto'`
  - `totalAmount` (valor cobrado do cliente, já com taxas)
  - `platformFeeAmount` (taxa da plataforma associada à venda)
  - `entryAmount` (valor da parcela/entrada – 1ª parcela)
  - `installmentsCount` (ex.: 12 → entrada + 11 futuras)
  - `createdAt`, `updatedAt`
  - `status`:
    - `pending_entry` – criada, aguardando pagamento da entrada.
    - `active` – entrada paga, esteira de parcelas em andamento.
    - `completed` – todas as parcelas pagas, pacote liberado.
    - `cancelled` – venda encerrada (entrada não paga, atraso, cancelamento manual).
  - `cancellationReason?`:  
    - `'entry_not_paid'`  
    - `'overdue_installments'`  
    - `'manual'`
  - `overdueToleranceCount` (ex.: `2` parcelas em atraso para cancelar)
  - `autoCancelEnabled` (bool – se `true`, aplica cancelamento automático por atraso)
  - `autoCancelEmailEnabled` (bool – se `true`, envia e-mail ao cliente ao cancelar automaticamente)
  - `metadata`:
    - snapshot do carrinho no momento da venda (itens, quantidades, etc.).

##### 2.2 `Parcel` (Parcela)

- **Campos principais**
  - `id`
  - `parcelledOrderId`
  - `sequence` (0 = entrada, 1..N = demais parcelas)
  - `amount`
  - `dueDate`
  - `status`:
    - `pending` – parcela futura, sem pagamento gerado.
    - `payment_generated` – Pix/boleto emitido, aguardando pagamento.
    - `paid` – confirmada pelo MP.
    - `overdue` – vencida sem pagamento.
    - `cancelled`
  - `paymentProvider`: `'mercadopago'`
  - `paymentMethod`: `'pix' | 'boleto'`
  - `paymentId?` (ID da transação no MP)
  - `qrCode?`, `qrCodeBase64?`, `ticketUrl?` (dados de exibição)
  - `generatedAt?`, `paidAt?`, `cancelledAt?`

---

#### 3. Fluxo de Criação da Venda Parcelada

##### 3.1 Configuração no Admin

- Evento e tipos de pacotes cadastrados normalmente.
- Flag no pacote: **`permiteParcelamento = true`**.
- Parâmetros de parcelamento por pacote/evento:
  - `maxInstallments` (ex.: 12),
  - `minInstallments` (opcional),
  - `overdueToleranceCount` (ex.: 2 – “quantas parcelas em atraso cancelam o pedido?”),
  - `autoCancelEnabled` (default `true`),
  - `autoCancelEmailEnabled` (default `true`),
  - modelo de juros (se for adotado futuramente).

##### 3.2 Escolha no Front (Página do Evento)

- Cliente escolhe ingressos normalmente.
- No “novo carrinho” existirão duas abas:
  - **Pagamento à vista** (Pix/cartão – fluxo atual).
  - **Compra parcelada**:
    - mostra `totalAmount`,
    - mostra simulação de parcelas (`N× valor`),
    - deixa claro:
      - “Entrada hoje: 1/N”,
      - regra de atraso/cancelamento.

##### 3.3 Criação da `ParcelledOrder`

- Endpoint sugerido: `POST /parcelled-orders`.
- Request inclui:
  - `customerId`, `eventId`, `packageTypeId`,
  - `paymentType` (pix/boleto),
  - `installmentsCount` escolhido (ex.: 12),
  - dados do carrinho.
- Backend:
  - calcula `totalAmount` e `platformFeeAmount`.
  - define `entryAmount = totalAmount / installmentsCount` (ou regra equivalente).
  - cria `ParcelledOrder` com `status = 'pending_entry'`.
  - cria:
    - `Parcel` de sequência 0 (entrada), `dueDate = agora` (+ tolerância pequena).
    - `Parcel` sequência 1..N apenas no banco (`status = 'pending'`).
  - cria pagamento no Mercado Pago para a **entrada**:
    - Pix/boleto com valor da 1ª parcela,
    - expiração de até 24h (configurável),
    - grava `paymentId`, `qrCode...` na parcela 0.
  - retorna para o front:
    - dados da `ParcelledOrder`,
    - QR code / link da entrada.

---

#### 4. Regras da Entrada

- **Entrada aprovada (webhook MP)**:
  - parcela 0 → `status = 'paid'`, `paidAt = agora`.
  - `ParcelledOrder.status = 'active'`.
  - libera:
    - reserva / associação inicial dos ingressos ao cliente (sem QR final).

- **Entrada não paga**:
  - job diário verifica:
    - se `status = 'pending_entry'` e `entrada.dueDate + gracePeriodEntrada < agora`:
      - `ParcelledOrder.status = 'cancelled'`,
      - `cancellationReason = 'entry_not_paid'`.
      - todas as parcelas pendentes → `cancelled`.
      - ingressos reservados → voltam ao estoque ou são liberados.

---

#### 5. Geração Automática das Parcelas Futuras (Robô Pix/Boleto)

- **Job diário** (cron worker):
  - seleciona parcelas onde:
    - `status = 'pending'`,
    - `ParcelledOrder.status = 'active'`,
    - `daysUntil(dueDate) <= 30` (limite técnico de expiração do Pix; para boleto podemos manter a mesma regra).
  - para cada parcela selecionada:
    - cria pagamento via API Mercado Pago:
      - `payment_method_id = 'pix'` ou boleto,
      - `transaction_amount = amount`,
      - `date_of_expiration` / `expiration_time = dueDate`.
    - atualiza a parcela:
      - `status = 'payment_generated'`,
      - `paymentId`, `qrCode...`, `generatedAt`.
    - (Opcional) dispara notificação (e-mail/WhatsApp) com link/QR da parcela.

##### 5.1 Antecipação de parcela pelo usuário

- Para cada parcela futura, o usuário verá:
  - se **já existe Pix/boleto gerado** e ainda não foi pago:
    - exibir QR/link + vencimento normalmente;
  - se **ainda não existe Pix/boleto**:
    - se `daysUntil(dueDate) <= 30`:
      - exibir botão **“Gerar Pix desta parcela agora”**;
      - esse botão chama um endpoint específico que:
        - cria o pagamento via API do Mercado Pago (como o robô faria),
        - grava `paymentId`, `qrCode...` na parcela,
        - retorna os dados para o front exibir;
    - se `daysUntil(dueDate) > 30`:
      - exibir apenas a mensagem  
        **“Pix disponível a partir de DD/MM/AAAA”** (quando a parcela entrar na janela técnica de 30 dias).

##### 5.2 Override manual via admin (fora das regras automáticas)

- Em cenários excepcionais (por exemplo, gerar um Pix com regras diferentes diretamente no painel do Mercado Pago), o admin poderá:
  - criar manualmente um pagamento no painel do MP (com o valor e vencimento combinados com o cliente);
  - copiar o identificador/URL ou código Pix;
  - registrar na parcela via tela de admin:
    - `paymentId` manual,
    - eventualmente um campo `externalTicketUrl` ou `manualQrCode`,
    - marcar `status = 'payment_generated'`.
- A partir daí, o fluxo volta a ser o mesmo:
  - o webhook do MP (ou uma conciliação manual) atualizará essa parcela para `paid` quando o cliente efetuar o pagamento.
- Esse caminho funciona como um **“túnel manual”** para casos especiais, sem quebrar a lógica principal da esteira automática.

---

#### 6. Atualização de Pagamentos das Parcelas

- **Webhook do Mercado Pago**:
  - para pagamentos associados a uma `Parcel`:
    - se `status = approved`:
      - parcela → `status = 'paid'`, `paidAt = agora`.
      - se **todas as parcelas** da `ParcelledOrder` estiverem `paid`:
        - `ParcelledOrder.status = 'completed'`,
        - dispara geração do **QR Code final do pacote / ingressos**.
    - se `status = cancelled/expired` e ainda não `paid`:
      - mantemos como está ou tratamos via job de atraso (abaixo).

- **Job diário de atraso**:
  - para cada `Parcel` com:
    - `status in ('pending','payment_generated')` e `dueDate < hoje`:
      - marcar como `status = 'overdue'`.

---

#### 7. Regra de Cancelamento por Atraso

- **Job diário de sanidade**:
  - para cada `ParcelledOrder` com `status = 'active'`:
    - se `autoCancelEnabled` for `false`, ignora essa venda (apenas cancelamento manual via admin).
    - conta quantas parcelas (exceto entrada) têm `status = 'overdue'`.
    - se `count >= overdueToleranceCount` (ex.: 2):
      - `ParcelledOrder.status = 'cancelled'`,
      - `cancellationReason = 'overdue_installments'`.
      - futuras parcelas com `status in ('pending','payment_generated')` → `cancelled`.
      - revoga/impede geração de qualquer QR final → cliente perde o pacote.
      - se `autoCancelEmailEnabled` for `true`, dispara e-mail/notificação de cancelamento automático com:
        - resumo da venda,
        - parcelas pagas x em atraso,
        - motivo: “pedido cancelado por X parcelas em atraso”.
      - regra de **não devolução** precisa estar clara nos termos/contrato.

- **Cancelamento manual via admin**:
  - Admin pode, a qualquer momento, marcar uma `ParcelledOrder` como:
    - `status = 'cancelled'`,
    - `cancellationReason = 'manual'`.
  - Futuras parcelas ficam `cancelled` e o QR final não é gerado.
  - O texto de e-mail/comunicação pode ser diferente do cancelamento automático.

---

#### 8. Notificações e E-mails Automáticos

Podemos automatizar envios de e-mail/WhatsApp em pontos‑chave da jornada. Esses envios devem respeitar flags de configuração globais e/ou por evento/pacote:

- Configurações sugeridas:
  - `notifyOnEntryCreated` (bool) – enviar e-mail com o Pix da entrada.
  - `notifyBeforeDueDays` (ex.: `3`) – quantos dias antes do vencimento avisar.
  - `notifyOnDueDate` (bool) – enviar lembrete no dia do vencimento.
  - `notifyOnOverdue` (bool) – avisar quando a parcela entrar em atraso.
  - `notifyOnAutoCancel` (bool) – já coberto por `autoCancelEmailEnabled`.

- **Gatilhos de notificação**
  1. **Criação da venda + entrada gerada**  
     - Quando a `ParcelledOrder` é criada e o Pix/boleto da entrada é gerado:
       - se `notifyOnEntryCreated = true`:
         - enviar e-mail: “Seu plano foi criado, pague a 1ª parcela até DD/MM”.
  2. **Confirmação da entrada**  
     - Webhook marca parcela 0 como `paid`:
       - enviar e-mail: “Entrada confirmada, seu plano está ativo. Veja suas próximas parcelas”.
  3. **Lembrete pré‑vencimento** (job diário)  
     - Para cada `Parcela` com `status in ('pending','payment_generated')` e  
       `daysUntil(dueDate) == notifyBeforeDueDays`:
       - enviar e-mail: “Sua parcela X vence em DD/MM, pague para manter seu plano ativo”.
  4. **Dia do vencimento** (opcional)  
     - Para cada `Parcela` com `status in ('pending','payment_generated')` e  
       `dueDate == hoje`:
       - se `notifyOnDueDate = true`, enviar e-mail: “Sua parcela vence hoje”.
  5. **Parcela em atraso** (job diário)  
     - Quando o job marca `status = 'overdue'`:
       - se `notifyOnOverdue = true`, enviar e-mail: “Sua parcela X está em atraso”.
  6. **Cancelamento automático por atraso**  
     - Quando a `ParcelledOrder` passa para `status = 'cancelled'` com  
       `cancellationReason = 'overdue_installments'`:
       - se `autoCancelEmailEnabled = true`, enviar e-mail informando:
         - motivo do cancelamento (parcelas em atraso),
         - status de cada parcela (pagas x em atraso),
         - política de não devolução.

- As integrações de e-mail/WhatsApp podem usar a infraestrutura já existente (ex.: serviço de e-mail do projeto), apenas adicionando novos templates e eventos de disparo.

---

#### 8. Liberação do QR Code Final / Ingressos

- **Condição**:
  - `ParcelledOrder.status = 'completed'`
  - todas as parcelas (incluindo entrada) com `status = 'paid'`.

- **Ação**:
  - gerar o(s) **ingresso(s) definitivo(s)** / pacote de ingressos:
    - QR Code final único ou múltiplos bilhetes.
  - associar ao pedido/conta do cliente.
  - exibir em **“Meus Ingressos”** com destaque: plano parcelado quitado.

---

#### 9. Pontos em Aberto para Detalhar Depois

- **Cálculo exato da taxa da plataforma**:
  - se será embutida no valor total ou mostrada em destaque.
  - se há diferença de taxa entre à vista vs parcelado.

- **Juros/multa**:
  - versão 1 pode começar **sem juros**, apenas com cancelamento por atraso.
  - se adotarmos juros:
    - definir fórmula (simples/composto),
    - decidir se recalcula parcelas futuras ou gera cobrança adicional.

- **Política de reativação**:
  - se o cliente teve a venda cancelada por atraso, mas quer regularizar:
    - criar nova `ParcelledOrder`?
    - permitir “quitar tudo à vista” e liberar ingresso?

- **Integração com telas do frontend**:
  - nova aba de “Compra parcelada” no carrinho.
  - tela no dashboard mostrando cronograma de parcelas, status, links Pix/boleto.


