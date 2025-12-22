import mongoose, { Document, Schema } from 'mongoose';

// Interface para informações de transporte
export interface ITransportInfo {
    departureLocations: Array<{
        name: string; // Ex: "São Paulo - Metrô Barra Funda"
        address: string; // Ex: "Rua Tagipuru, 641"
        meetingTime: string; // Ex: "06:00"
        departureTime: string; // Ex: "06:30"
        price?: number; // Preço específico para este local (opcional)
    }>;
    returnTime?: string; // Ex: "1 hora após o término do evento"
    transportType?: string; // Ex: "Ônibus de turismo luxo"
    includes?: string[]; // Ex: ["Ar-condicionado", "Banheiro", "Guia"]
}

// Interface para atração/artista
export interface IAttraction {
    name: string;
    date?: string; // Data específica da apresentação
    stage?: string; // Ex: "Palco Mundo"
    order?: number; // Ordem de apresentação
}

// Interface para preço por local de saída
export interface IPriceByLocation {
    locationName: string; // Ex: "São Paulo - Metrô Barra Funda"
    pixPrice?: number; // Preço no PIX
    creditCardPrice?: number; // Preço no cartão
    installments?: number; // Número de parcelas sem juros
    description?: string; // Descrição adicional
}

// Interface para FAQ
export interface IFAQ {
    question: string;
    answer: string;
    order?: number; // Ordem de exibição
}

// Interface principal do documento EventDetails
export interface IEventDetails extends Document {
    event: mongoose.Types.ObjectId; // Referência ao Event (1:1)
    
    // Aba: Sobre o Evento (descrição principal)
    about?: {
        richText?: string; // Conteúdo HTML do editor de texto rico
    };
    
    // Aba: Incluso no Pacote
    packageIncludes?: {
        title?: string; // Título personalizado (opcional)
        items?: string[]; // Lista de itens inclusos (opcional)
        richText?: string; // Conteúdo HTML do editor de texto rico
    };
    
    // Aba: Transporte
    transport?: ITransportInfo & {
        richText?: string; // Conteúdo HTML do editor de texto rico
    };
    
    // Aba: Atrações
    attractions?: {
        title?: string; // Título personalizado (opcional)
        items?: IAttraction[]; // Lista de atrações/artistas (opcional)
        groupedByDate?: boolean; // Se true, agrupa por data
        richText?: string; // Conteúdo HTML do editor de texto rico
    };
    
    // Aba: Tabela de Preços
    pricing?: {
        title?: string; // Título personalizado (opcional)
        pricesByLocation?: IPriceByLocation[]; // Preços por local de saída (opcional)
        generalInfo?: string; // Informações gerais sobre pagamento
        pixDiscount?: number; // Desconto percentual no PIX
        richText?: string; // Conteúdo HTML do editor de texto rico
    };
    
    // Aba: Vídeo do Evento
    video?: {
        url: string; // URL do vídeo (YouTube, Vimeo, etc.)
        thumbnail?: string; // Thumbnail do vídeo
        title?: string; // Título do vídeo
        description?: string; // Descrição do vídeo
    };
    
    // Aba: Dúvidas Frequentes
    faq?: {
        title?: string; // Título personalizado (opcional)
        items: IFAQ[]; // Lista de perguntas e respostas
    };
    
    // Metadados
    isActive: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Schema do EventDetails
const transportInfoSchema = new Schema<ITransportInfo>(
    {
        departureLocations: [
            {
                name: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: [200, 'Nome do local deve ter no máximo 200 caracteres'],
                },
                address: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: [500, 'Endereço deve ter no máximo 500 caracteres'],
                },
                meetingTime: {
                    type: String,
                    required: true,
                    trim: true,
                    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve estar no formato HH:MM'],
                },
                departureTime: {
                    type: String,
                    required: true,
                    trim: true,
                    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve estar no formato HH:MM'],
                },
                price: {
                    type: Number,
                    min: [0, 'Preço não pode ser negativo'],
                },
            },
        ],
        returnTime: {
            type: String,
            trim: true,
            maxlength: [200, 'Horário de retorno deve ter no máximo 200 caracteres'],
        },
        transportType: {
            type: String,
            trim: true,
            maxlength: [200, 'Tipo de transporte deve ter no máximo 200 caracteres'],
        },
        includes: [
            {
                type: String,
                trim: true,
                maxlength: [200, 'Item incluso deve ter no máximo 200 caracteres'],
            },
        ],
    },
    { _id: false }
);

const attractionSchema = new Schema<IAttraction>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: [200, 'Nome da atração deve ter no máximo 200 caracteres'],
        },
        date: {
            type: String,
            trim: true,
        },
        stage: {
            type: String,
            trim: true,
            maxlength: [100, 'Palco deve ter no máximo 100 caracteres'],
        },
        order: {
            type: Number,
            min: [0, 'Ordem não pode ser negativa'],
        },
    },
    { _id: false }
);

const priceByLocationSchema = new Schema<IPriceByLocation>(
    {
        locationName: {
            type: String,
            required: true,
            trim: true,
            maxlength: [200, 'Nome do local deve ter no máximo 200 caracteres'],
        },
        pixPrice: {
            type: Number,
            min: [0, 'Preço PIX não pode ser negativo'],
        },
        creditCardPrice: {
            type: Number,
            min: [0, 'Preço cartão não pode ser negativo'],
        },
        installments: {
            type: Number,
            min: [1, 'Número de parcelas deve ser pelo menos 1'],
            max: [24, 'Número de parcelas não pode ser maior que 24'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Descrição deve ter no máximo 500 caracteres'],
        },
    },
    { _id: false }
);

const faqSchema = new Schema<IFAQ>(
    {
        question: {
            type: String,
            required: true,
            trim: true,
            maxlength: [500, 'Pergunta deve ter no máximo 500 caracteres'],
        },
        answer: {
            type: String,
            required: true,
            trim: true,
            maxlength: [5000, 'Resposta deve ter no máximo 5000 caracteres'],
        },
        order: {
            type: Number,
            min: [0, 'Ordem não pode ser negativa'],
        },
    },
    { _id: false }
);

const eventDetailsSchema = new Schema<IEventDetails>(
    {
        event: {
            type: Schema.Types.ObjectId,
            ref: 'Event',
            required: [true, 'Evento é obrigatório'],
            unique: true, // Um evento só pode ter um EventDetails
            index: true,
        },
        about: {
            richText: {
                type: String,
                trim: false, // Não trimar HTML
            },
        },
        packageIncludes: {
            title: {
                type: String,
                trim: true,
                maxlength: [200, 'Título deve ter no máximo 200 caracteres'],
            },
            items: [
                {
                    type: String,
                    trim: true,
                    maxlength: [500, 'Item deve ter no máximo 500 caracteres'],
                },
            ],
            richText: {
                type: String,
                trim: false, // Não trimar HTML
            },
        },
        transport: {
            departureLocations: [
                {
                    name: {
                        type: String,
                        required: true,
                        trim: true,
                        maxlength: [200, 'Nome do local deve ter no máximo 200 caracteres'],
                    },
                    address: {
                        type: String,
                        required: true,
                        trim: true,
                        maxlength: [500, 'Endereço deve ter no máximo 500 caracteres'],
                    },
                    meetingTime: {
                        type: String,
                        required: true,
                        trim: true,
                        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve estar no formato HH:MM'],
                    },
                    departureTime: {
                        type: String,
                        required: true,
                        trim: true,
                        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve estar no formato HH:MM'],
                    },
                    price: {
                        type: Number,
                        min: [0, 'Preço não pode ser negativo'],
                    },
                },
            ],
            returnTime: {
                type: String,
                trim: true,
                maxlength: [200, 'Horário de retorno deve ter no máximo 200 caracteres'],
            },
            transportType: {
                type: String,
                trim: true,
                maxlength: [200, 'Tipo de transporte deve ter no máximo 200 caracteres'],
            },
            includes: [
                {
                    type: String,
                    trim: true,
                    maxlength: [200, 'Item incluso deve ter no máximo 200 caracteres'],
                },
            ],
            richText: {
                type: String,
                trim: false, // Não trimar HTML
            },
        },
        attractions: {
            title: {
                type: String,
                trim: true,
                maxlength: [200, 'Título deve ter no máximo 200 caracteres'],
            },
            items: [attractionSchema],
            groupedByDate: {
                type: Boolean,
                default: false,
            },
            richText: {
                type: String,
                trim: false, // Não trimar HTML
            },
        },
        pricing: {
            title: {
                type: String,
                trim: true,
                maxlength: [200, 'Título deve ter no máximo 200 caracteres'],
            },
            pricesByLocation: [priceByLocationSchema],
            generalInfo: {
                type: String,
                trim: true,
                maxlength: [1000, 'Informação geral deve ter no máximo 1000 caracteres'],
            },
            pixDiscount: {
                type: Number,
                min: [0, 'Desconto PIX não pode ser negativo'],
                max: [100, 'Desconto PIX não pode ser maior que 100%'],
            },
            richText: {
                type: String,
                trim: false, // Não trimar HTML
            },
        },
        video: {
            url: {
                type: String,
                required: true,
                trim: true,
                match: [
                    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|facebook\.com\/watch)/,
                    'URL do vídeo deve ser do YouTube, Vimeo, Dailymotion ou Facebook',
                ],
            },
            thumbnail: {
                type: String,
                trim: true,
                match: [/^https?:\/\/.+/, 'URL da thumbnail deve ser válida'],
            },
            title: {
                type: String,
                trim: true,
                maxlength: [200, 'Título do vídeo deve ter no máximo 200 caracteres'],
            },
            description: {
                type: String,
                trim: true,
                maxlength: [1000, 'Descrição do vídeo deve ter no máximo 1000 caracteres'],
            },
        },
        faq: {
            title: {
                type: String,
                trim: true,
                maxlength: [200, 'Título deve ter no máximo 200 caracteres'],
            },
            items: [faqSchema],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        deletedAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Índices para performance
eventDetailsSchema.index({ event: 1 }, { unique: true });
eventDetailsSchema.index({ isActive: 1 });
eventDetailsSchema.index({ deletedAt: 1 });

// Middleware para validar que o evento existe
eventDetailsSchema.pre('save', async function (next) {
    try {
        const Event = mongoose.model('Event');
        const event = await Event.findById(this.event);
        if (!event) {
            return next(new Error('Evento não encontrado'));
        }
        next();
    } catch (error: any) {
        next(error);
    }
});

// Static method para buscar detalhes por evento (opcional - pode ser usado no futuro)
// eventDetailsSchema.statics.findByEvent = function (eventId: string) {
//     return this.findOne({
//         event: eventId,
//         isActive: true,
//         deletedAt: null,
//     });
// };

export default mongoose.model<IEventDetails>('EventDetails', eventDetailsSchema);

