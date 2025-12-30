import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Ticket, Event } from '../models';
import { APP_NAME } from '../config/appConfig';

interface TicketPDFData {
    event: {
        name: string;
        date: Date | string;
        location: string;
        address?: string;
    };
    orderNumber: string;
    customerName: string;
    tickets: Array<{
        code: string;
        qrCode: string; // Base64 data URL
        ticketType: string;
        holderName?: string;
        isTransport?: boolean; // Indica se este ticket é de transporte
        transportInfo?: { // Informações de transporte específicas deste ticket
            date: string;
            attraction: string;
            departureLocation: string;
        };
    }>;
    transportInfo?: Array<{ // DEPRECATED: manter para compatibilidade, mas usar transportInfo do ticket
        date: string;
        attraction: string;
        departureLocation: string;
    }>;
}

/**
 * Gera um PDF com os QR codes dos ingressos
 */
export async function generateTicketPDF(data: TicketPDFData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Ingressos - ${data.event.name}`,
                    Author: APP_NAME,
                    Subject: `Ingressos do pedido #${data.orderNumber}`,
                },
            });

            const chunks: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Função auxiliar para desenhar header em cada página
            const drawHeader = () => {
            doc.fontSize(24).fillColor('#000000').text(data.event.name, { align: 'center' });

            doc.moveDown(0.5);

            doc.fontSize(12)
                .fillColor('#666666')
                .text(`Data: ${formatDate(data.event.date)}`, { align: 'center' });

            doc.text(`Local: ${data.event.location}`, { align: 'center' });

            if (data.event.address) {
                doc.text(`Endereço: ${data.event.address}`, { align: 'center' });
            }

            doc.moveDown(1);

            doc.fontSize(10)
                .fillColor('#999999')
                .text(`Pedido #${data.orderNumber}`, { align: 'center' });

            doc.text(`Cliente: ${data.customerName}`, { align: 'center' });

                doc.moveDown(1.5);
            };

            // Para cada ingresso
            for (let i = 0; i < data.tickets.length; i++) {
                const ticket = data.tickets[i];

                // Se não for o primeiro ingresso, adicionar nova página
                if (i > 0) {
                    doc.addPage();
                }

                // Desenhar header em cada página
                drawHeader();

                // Converter QR Code base64 para buffer
                const qrCodeBase64 = ticket.qrCode.replace(/^data:image\/png;base64,/, '');
                const qrCodeBuffer = Buffer.from(qrCodeBase64, 'base64');

                // Dimensão desejada do QR
                const qrSize = 300;

                // Calcular posição central horizontalmente, mas começar do topo
                const pageWidth = doc.page.width;
                const x = (pageWidth - qrSize) / 2;
                
                // Posição Y inicial (após o header)
                let y = doc.y;

                // Se estiver muito baixo na página, adicionar espaço
                if (y < 200) {
                    y = 200;
                }

                // Desenhar QR code centralizado horizontalmente
                doc.image(qrCodeBuffer, x, y, {
                    width: qrSize,
                    height: qrSize,
                });

                // Posicionar cursor logo abaixo do QR para o texto
                doc.y = y + qrSize + 30;

                // Informações do ingresso
                doc.fontSize(14)
                    .fillColor('#000000')
                    .text(`Ingresso: ${ticket.ticketType}`, { align: 'center' });

                doc.moveDown(0.5);

                if (ticket.holderName) {
                    doc.fontSize(12)
                        .fillColor('#333333')
                        .text(`Nome: ${ticket.holderName}`, { align: 'center' });
                    doc.moveDown(0.5);
                }

                doc.fontSize(10)
                    .fillColor('#666666')
                    .text(`Código: ${ticket.code}`, { align: 'center' });

                doc.moveDown(1);

                // Informações de transporte (apenas se este ticket for de transporte)
                // Prioridade: transportInfo do ticket > transportInfo global (deprecated)
                const ticketTransportInfo = ticket.transportInfo || 
                    (ticket.isTransport && data.transportInfo && data.transportInfo.length > 0 
                        ? data.transportInfo[0] 
                        : null);
                
                if (ticket.isTransport && ticketTransportInfo) {
                    doc.fontSize(11)
                        .fillColor('#000000')
                        .text('Informações de Transporte:', { align: 'center' });
                    doc.moveDown(0.3);
                    
                    if (ticketTransportInfo.attraction) {
                        doc.fontSize(10)
                            .fillColor('#333333')
                            .text(`Atração: ${ticketTransportInfo.attraction}`, { align: 'center' });
                        doc.moveDown(0.3);
                    }
                    
                    if (ticketTransportInfo.date) {
                        doc.fontSize(10)
                            .fillColor('#333333')
                            .text(`Data: ${ticketTransportInfo.date}`, { align: 'center' });
                        doc.moveDown(0.3);
                    }
                    
                    if (ticketTransportInfo.departureLocation) {
                        doc.fontSize(10)
                            .fillColor('#333333')
                            .text(`Local de saída: ${ticketTransportInfo.departureLocation}`, { align: 'center' });
                        doc.moveDown(0.3);
                    }
                    
                    doc.moveDown(1);
                }

                doc.moveDown(0.5);

                // Instruções
                doc.fontSize(9)
                    .fillColor('#999999')
                    .text('Apresente este QR Code na entrada do evento.', { align: 'center' });
                doc.moveDown(0.3);
                doc.text('Pode ser no celular ou impresso.', { align: 'center' });
                doc.moveDown(0.3);
                doc.text('Não compartilhe este QR Code (uso único).', { align: 'center' });

                // Footer em cada página
            doc.moveDown(2);
            doc.fontSize(8)
                .fillColor('#999999')
                .text(`${APP_NAME} - Sistema de Gestão de Eventos`, { align: 'center' });
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Formata data para exibição
 */
function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
