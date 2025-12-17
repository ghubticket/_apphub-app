"use client";

import { useCallback } from "react";
import { createCardPayment as createCardPaymentAction } from "@/app/api/payments/actions";
import { useAuth } from "@/context/AuthContext";
import {
  getMercadoPagoDeviceId,
  waitForMercadoPagoDeviceId,
} from "../utils/deviceIdHelper";
import { useCheckoutNavigation } from "./useCheckoutNavigation";
import { useCheckoutStorage } from "./useCheckoutStorage";
import { clearCartItems, loadCartItems } from "@/lib/cart";
import { storageHelpers } from "../utils/storageHelpers";

export interface CardPaymentData {
  token: string;
  installments: number;
  paymentMethodId: string;
  issuerId?: string;
  cardholder?: {
    name: string;
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
}

interface UsePaymentProcessingOptions {
  setStatus: (status: "idle" | "processing" | "success" | "error") => void;
  setStatusMessage: (message: string) => void;
  setStatusDetails: (details: string[]) => void;
  setRedirectCountdown: (countdown: number | null) => void;
  setMaxAttemptsReached: (reached: boolean) => void;
  processingRef: React.MutableRefObject<boolean>;
  onCountdownUpdate?: (countdown: number) => void;
}

interface UsePaymentProcessingReturn {
  processPayment: (
    orderId: string,
    paymentData: CardPaymentData
  ) => Promise<void>;
}

/**
 * Hook para extrair lógica de processamento de pagamento
 * Inclui chamada ao backend, tratamento de status, erros e redirecionamento
 */
export function usePaymentProcessing({
  setStatus,
  setStatusMessage,
  setStatusDetails,
  setRedirectCountdown,
  setMaxAttemptsReached,
  processingRef,
  onCountdownUpdate,
}: UsePaymentProcessingOptions): UsePaymentProcessingReturn {
  const { user } = useAuth();
  const userId = user?._id || user?.id || null;
  const navigation = useCheckoutNavigation();
  const storage = useCheckoutStorage();

  // O backend já retorna mensagens traduzidas via paymentStatusMapper
  // Esta função foi mantida apenas como fallback, mas o backend deve sempre retornar statusInfo.userMessage

  // Filtrar mensagens de erro em inglês
  const filterEnglishErrorMessages = useCallback(
    (errorDetails: string[]): string[] => {
      return errorDetails.filter((msg) => {
        const lowerMsg = msg.toLowerCase().trim();
        const englishPatterns = [
          "the following transactions failed",
          "^failed$",
          "^transaction failed$",
          "^payment failed$",
        ];
        const isOnlyEnglishPattern = englishPatterns.some((pattern) => {
          const regex = new RegExp(pattern, "i");
          return regex.test(lowerMsg);
        });
        return !isOnlyEnglishPattern;
      });
    },
    []
  );

  const processPayment = useCallback(
    async (orderId: string, paymentData: CardPaymentData) => {
      // Prevenir múltiplas execuções simultâneas
      if (processingRef.current) {
        return;
      }

      if (!orderId) {
        setStatus("error");
        setStatusMessage("Pedido não encontrado");
        setStatusDetails(["Por favor, recarregue a página e tente novamente."]);
        return;
      }

      processingRef.current = true;
      setStatus("processing");
      setStatusMessage("Processando pagamento...");
      setStatusDetails([]);

      // Declarar variáveis no escopo externo para uso no catch
      let payload: any = null;
      let isFakeOrder = false;
      let deviceId: string = '';

      try {
        // Obter Device ID do Mercado Pago (obrigatório para processar pagamento)
        try {
          deviceId = await waitForMercadoPagoDeviceId(1000); // Aguardar até 1s pelo deviceId do SDK
        } catch (error) {
          // Se falhar, usar fallback imediatamente
          deviceId = getMercadoPagoDeviceId();
        }

        const isRealDeviceId =
          deviceId &&
          !deviceId.startsWith("mp-") &&
          deviceId !== "ssr-device-id";

        // Preparar payload da requisição
        const cardholderData =
          paymentData.cardholder &&
          (paymentData.cardholder.name || paymentData.cardholder.email)
            ? paymentData.cardholder
            : undefined;

        payload = {
          token: paymentData.token,
          installments: paymentData.installments || 1,
          paymentMethodId: paymentData.paymentMethodId,
          issuerId: paymentData.issuerId,
          deviceId,
        };

        if (cardholderData) {
          payload.cardholder = cardholderData;
        }

        // NOVO: Se orderId é fake, enviar dados do carrinho e cliente para criar pedido real
        isFakeOrder = orderId.startsWith("fake-");
        if (isFakeOrder) {
          // Obter dados do carrinho e cliente - tentar múltiplas fontes
          let currentCartItems = (paymentData as any).cartItems;
          let currentCustomerData = (paymentData as any).customerData;
          let currentPromoterCode = (paymentData as any).promoterCode;

          // Se não temos dados do paymentData, tentar obter do storage/cart diretamente
          if (!currentCartItems || currentCartItems.length === 0) {
            try {
              const rawCartItems = loadCartItems().filter(
                (item) => item.quantity > 0
              );
              if (rawCartItems.length > 0) {
                // Calcular valores como no useCheckoutCart
                currentCartItems = rawCartItems.map((item: any) => {
                  const subtotal = item.price * item.quantity;
                  const platformFeeValue = item.platformFeePercentage
                    ? (subtotal * item.platformFeePercentage) / 100
                    : 0;
                  const fixedFeeValue = item.ticketFee
                    ? item.ticketFee * item.quantity
                    : 0;
                  return {
                    ...item,
                    subtotal,
                    platformFeeValue,
                    fixedFeeValue,
                    total: subtotal + platformFeeValue + fixedFeeValue,
                  };
                });
              }
            } catch (err) {}
          }

          if (
            !currentCustomerData ||
            !currentCustomerData.name ||
            !currentCustomerData.email
          ) {
            try {
              // CRÍTICO: Passar userId para validar que os dados pertencem ao usuário atual
              const storedCustomerData =
                storageHelpers.loadCustomerData(userId);
              if (
                storedCustomerData &&
                storedCustomerData.name &&
                storedCustomerData.email
              ) {
                currentCustomerData = storedCustomerData;
              }
            } catch (err) {}
          }

          if (!currentCartItems || currentCartItems.length === 0) {
            setStatus("error");
            setStatusMessage(
              "Carrinho vazio. Por favor, adicione itens ao carrinho antes de pagar."
            );
            setStatusDetails(["Carrinho vazio"]);
            processingRef.current = false;
            return;
          }

          if (
            !currentCustomerData ||
            !currentCustomerData.name ||
            !currentCustomerData.email
          ) {
            setStatus("error");
            setStatusMessage(
              "Dados do cliente incompletos. Por favor, preencha nome e email."
            );
            setStatusDetails(["Dados do cliente incompletos"]);
            processingRef.current = false;
            return;
          }

          // Garantir que os dados estão no formato correto
          payload.cartItems = currentCartItems.map((item: any) => ({
            eventId: item.eventId,
            id: item.id, // ticketTypeId
            quantity: item.quantity,
            price: item.price,
            name: item.name,
          }));

          payload.customerData = {
            name: currentCustomerData.name,
            email: currentCustomerData.email,
            cpf: currentCustomerData.cpf || undefined,
            phone: currentCustomerData.phone || undefined,
          };

          if (currentPromoterCode) {
            payload.promoterCode = currentPromoterCode;
          }
        }

        // Log do payload antes de enviar
        console.log('[usePaymentProcessing] Processando pagamento com cartão:', {
          orderId,
          isFakeOrder,
          hasDeviceId: !!deviceId,
          deviceIdPrefix: deviceId?.substring(0, 20) + '...', // Log parcial por segurança
          paymentMethodId: paymentData.paymentMethodId,
          installments: paymentData.installments,
          hasCardholder: !!cardholderData,
          cartItemsCount: isFakeOrder ? payload.cartItems?.length : 0,
        });

        // Obter token de autenticação
        const token = localStorage.getItem('accessToken') || 
                    sessionStorage.getItem('accessToken') || 
                    localStorage.getItem('token') || 
                    null;
        
        // Usar Server Action para processar pagamento com cartão (nunca expõe URL da API)
        const response = await createCardPaymentAction(
          orderId,
          payload,
          {
            'X-meli-session-id': deviceId,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          }
        );

        // Verificar se houve erro na Server Action
        if (response?.error || !response?.success) {
          const errorMessage = response?.message || 'Erro ao processar pagamento com cartão';
          throw new Error(errorMessage);
        }

        // Log da resposta
        console.log('[usePaymentProcessing] Resposta do backend:', {
          success: response?.success,
          hasData: !!response?.data,
          status: response?.data?.status,
          statusDetail: response?.data?.statusDetail,
          hasCreatedOrderId: !!response?.data?.createdOrderId,
        });

        const paymentResult = response?.data || response;
        const statusInfo = paymentResult?.statusInfo;

        // NOVO: Se pedido real foi criado, atualizar orderId
        const realOrderId = paymentResult.createdOrderId || orderId;
        if (realOrderId !== orderId && realOrderId) {
          // Atualizar storage com orderId real
          storage.saveOrderId(realOrderId);
        }

        // Verificar status do pagamento
        const paymentStatus =
          paymentResult?.paymentStatus || paymentResult?.status;
        // Usar mensagem traduzida do backend (statusInfo.userMessage) que já vem do paymentStatusMapper
        const paymentMessage =
          statusInfo?.userMessage ||
          paymentResult?.paymentMessage ||
          paymentResult?.message;
        const paymentStatusDetail =
          paymentResult?.paymentStatusDetail || paymentResult?.statusDetail;

        // Mapear status do MP para nosso status interno
        const isSuccess =
          paymentStatus === "approved" ||
          paymentStatus === "paid" ||
          paymentStatus === "processed" ||
          statusInfo?.internalStatus === "paid" ||
          (response?.success &&
            paymentStatus !== "rejected" &&
            paymentStatus !== "cancelled" &&
            paymentStatus !== "failed");

        if (isSuccess) {
          setStatus("success");
          setStatusMessage(paymentMessage || "Pagamento aprovado com sucesso!");
          setStatusDetails([
            "Seus ingressos estão disponíveis.",
            "Você receberá um e-mail com os detalhes do pedido.",
          ]);

          // Limpar storage e permitir navegação
          storage.clearOrderRelated();
          navigation.allowNavigation();

          // Iniciar countdown para redirecionamento
          setRedirectCountdown(5);
          navigation.startRedirectCountdown(
            "/dashboard",
            5,
            (countdown) => {
              if (onCountdownUpdate) {
                onCountdownUpdate(countdown);
              }
              setRedirectCountdown(countdown > 0 ? countdown : null);
            },
            { clearStorage: true, useReplace: true }
          );
        } else if (
          paymentStatus === "pending" ||
          paymentStatus === "in_process"
        ) {
          // Pagamento pendente (pode ser 3D Secure ou análise)
          setStatus("processing");
          setStatusMessage(paymentMessage || "Pagamento em análise...");
          setStatusDetails([
            "Seu pagamento está sendo processado.",
            "Você será notificado quando o pagamento for confirmado.",
          ]);
        } else {
          // Pagamento recusado ou erro
          const cardAttempts =
            paymentResult?.cardAttempts ?? response.data?.cardAttempts;
          const maxCardAttempts =
            paymentResult?.maxCardAttempts ??
            response.data?.maxCardAttempts ??
            3;
          const responseStatusCode =
            response?.status || response.data?.statusCode;

          // CRÍTICO: Detectar tentativas esgotadas de múltiplas formas:
          // 1. Status 429 (Too Many Requests)
          // 2. cardAttempts >= maxCardAttempts
          // 3. Mensagem contém "excedeu" ou "máximo de tentativas"
          const isStatus429 = responseStatusCode === 429;
          const attemptsExhausted =
            isStatus429 ||
            (cardAttempts !== undefined &&
              maxCardAttempts !== undefined &&
              cardAttempts >= maxCardAttempts) ||
            paymentMessage?.toLowerCase().includes("excedeu") ||
            paymentMessage?.toLowerCase().includes("máximo de tentativas");

          setMaxAttemptsReached(attemptsExhausted);
          setStatus("error");

          if (attemptsExhausted) {
            setStatusMessage("Tentativas esgotadas");
            setStatusDetails([
              "Infelizmente você esgotou suas tentativas nesse pedido.",
              "Você vai precisar criar um novo pedido para tentar novamente.",
            ]);
          } else {
            // Usar mensagem traduzida do backend que já vem do paymentStatusMapper
            setStatusMessage(paymentMessage || "Pagamento não aprovado");
            const remainingAttempts = maxCardAttempts - (cardAttempts || 0);
            const errorDetails: string[] = [];

            // O backend já retorna a mensagem traduzida em statusInfo.userMessage
            // Se não tiver, usar fallback genérico
            if (paymentMessage) {
              errorDetails.push(paymentMessage);
            } else if (paymentStatusDetail) {
              // Fallback: se não tiver mensagem do backend, usar mensagem genérica
              errorDetails.push("Tente novamente ou use outro cartão.");
            } else {
              errorDetails.push("Tente novamente ou use outro cartão.");
            }

            if (remainingAttempts > 0) {
              errorDetails.push(
                `Você ainda tem ${remainingAttempts} tentativa${
                  remainingAttempts > 1 ? "s" : ""
                } restante${remainingAttempts > 1 ? "s" : ""}.`
              );
            }

            setStatusDetails(errorDetails);
          }
        }
      } catch (error: any) {
        // Log detalhado do erro
        console.error('[usePaymentProcessing] Erro ao processar pagamento com cartão:', {
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          responseStatus: error?.response?.status || error?.statusCode,
          responseData: error?.response?.data || error?.data,
          responseErrors: error?.response?.data?.errors || error?.errors,
          requestUrl: `/payments/${orderId}/card`,
          requestPayload: {
            hasDeviceId: !!payload?.deviceId,
            paymentMethodId: payload?.paymentMethodId,
            installments: payload?.installments,
            isFakeOrder,
          },
        });

        setStatus("error");

        // Tratar diferentes tipos de erro (Server Action ou axios)
        const errorResponse = error?.response?.data || error?.data;
        const statusCode = error?.response?.status || error?.statusCode;
        const errorMessage =
          errorResponse?.message ||
          error?.message ||
          "Erro ao processar pagamento";
        const errorDetails = errorResponse?.errors || error?.errors || [];
        const errorDetailsFull = errorResponse?.errorDetails || null;

        // Verificar se esgotou tentativas no erro
        const cardAttempts = errorResponse?.cardAttempts;
        const maxCardAttempts = errorResponse?.maxCardAttempts ?? 3;

        // CRÍTICO: Detectar tentativas esgotadas de múltiplas formas:
        // 1. Status 429 (Too Many Requests) - retornado quando limite é excedido
        // 2. cardAttempts >= maxCardAttempts
        // 3. Mensagem de erro contém "excedeu" ou "máximo de tentativas"
        const isStatus429 = statusCode === 429;
        const attemptsExhausted =
          isStatus429 ||
          (cardAttempts !== undefined &&
            maxCardAttempts !== undefined &&
            cardAttempts >= maxCardAttempts) ||
          errorMessage?.toLowerCase().includes("excedeu") ||
          errorMessage?.toLowerCase().includes("máximo de tentativas");

        setMaxAttemptsReached(attemptsExhausted);

        // Log detalhado do erro do backend
        if (errorResponse) {
        }

        // CRÍTICO: Se esgotou tentativas, definir mensagem especial ANTES de qualquer outra coisa
        if (attemptsExhausted) {
          setStatusMessage("Tentativas esgotadas");
          setStatusDetails([
            "Infelizmente você esgotou suas tentativas nesse pedido.",
            "Você vai precisar criar um novo pedido para tentar novamente.",
          ]);
          return;
        }

        setStatusMessage(errorMessage);

        // CRÍTICO: Garantir que sempre há mensagens de erro para exibir no modal
        let finalErrorDetails: string[] = [];

        if (errorDetails.length > 0) {
          finalErrorDetails = errorDetails.map((err: any) =>
            typeof err === "string" ? err : err.message || String(err)
          );
        } else if (errorDetailsFull) {
          const fullMessage =
            typeof errorDetailsFull === "string"
              ? errorDetailsFull
              : errorDetailsFull.message || errorMessage;
          finalErrorDetails = [fullMessage];
        } else {
          finalErrorDetails = [
            errorMessage || "Não foi possível processar o pagamento.",
            statusCode === 400
              ? "Verifique os dados do cartão e tente novamente."
              : statusCode === 404
              ? "Pedido não encontrado. Por favor, recarregue a página."
              : "Verifique seus dados e tente novamente.",
          ];
        }

        // Garantir que há pelo menos uma mensagem
        if (finalErrorDetails.length === 0) {
          finalErrorDetails = [
            errorMessage || "Erro ao processar pagamento. Tente novamente.",
          ];
        }

        // Filtrar mensagens em inglês
        const filteredErrorDetails =
          filterEnglishErrorMessages(finalErrorDetails);
        const finalFilteredDetails =
          filteredErrorDetails.length > 0
            ? filteredErrorDetails
            : [
                "Não foi possível processar o pagamento. Verifique os dados do cartão e tente novamente.",
              ];

        setStatusDetails(finalFilteredDetails);

        // Log para debug
      } finally {
        processingRef.current = false;
      }
    },
    [
      setStatus,
      setStatusMessage,
      setStatusDetails,
      setRedirectCountdown,
      setMaxAttemptsReached,
      processingRef,
      onCountdownUpdate,
      navigation,
      storage,
      filterEnglishErrorMessages,
    ]
  );

  return {
    processPayment,
  };
}
