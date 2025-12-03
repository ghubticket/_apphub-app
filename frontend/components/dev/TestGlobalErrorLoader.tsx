'use client';

/**
 * Componente que carrega funções de teste apenas em desenvolvimento
 * Disponibiliza window.testGlobalError() no console
 */
export default function TestGlobalErrorLoader() {
    // Apenas em desenvolvimento
    if (process.env.NODE_ENV === 'production') {
        return null;
    }

    // Importar dinamicamente apenas no client-side
    if (typeof window !== 'undefined') {
        import('@/lib/testGlobalError').catch(() => {
            // Ignorar erro se falhar
        });
    }

    return null;
}

