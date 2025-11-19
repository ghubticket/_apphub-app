import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Ticket, Event } from '../models';

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
                    Author: 'EventHub',
                    Subject: `Ingressos do pedido #${data.orderNumber}`,
                },
            });

            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
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

            doc.moveDown(2);

            // Para cada ingresso
            for (let i = 0; i < data.tickets.length; i++) {
                const ticket = data.tickets[i];

                // Converter QR Code base64 para buffer
                const qrCodeBase64 = ticket.qrCode.replace(/^data:image\/png;base64,/, '');
                const qrCodeBuffer = Buffer.from(qrCodeBase64, 'base64');

                // Adicionar QR Code (centralizado)
                doc.image(qrCodeBuffer, {
                    fit: [250, 250],
                    align: 'center',
                });

                doc.moveDown(1);

                // Informações do ingresso
                doc.fontSize(14)
                    .fillColor('#000000')
                    .text(`Ingresso: ${ticket.ticketType}`, { align: 'center' });

                if (ticket.holderName) {
                    doc.fontSize(12)
                        .fillColor('#333333')
                        .text(`Nome: ${ticket.holderName}`, { align: 'center' });
                }

                doc.fontSize(10)
                    .fillColor('#666666')
                    .text(`Código: ${ticket.code}`, { align: 'center' });

                doc.moveDown(1);

                // Instruções
                doc.fontSize(9)
                    .fillColor('#999999')
                    .text('Apresente este QR Code na entrada do evento', { align: 'center' });
                doc.text('Pode ser no celular ou impresso', { align: 'center' });
                doc.text('⚠️ Não compartilhe este QR Code (uso único)', { align: 'center' });

                // Linha divisória (se não for o último)
                if (i < data.tickets.length - 1) {
                    doc.moveDown(2);
                    doc.moveTo(50, doc.y)
                        .lineTo(550, doc.y)
                        .strokeColor('#cccccc')
                        .lineWidth(1)
                        .stroke();
                    doc.moveDown(2);
                }
            }

            // Footer
            doc.moveDown(2);
            doc.fontSize(8)
                .fillColor('#999999')
                .text('EventHub - Sistema de Gestão de Eventos', { align: 'center' });
            doc.text(`Gerado em ${formatDate(new Date())}`, { align: 'center' });

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
