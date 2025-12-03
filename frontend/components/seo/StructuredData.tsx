'use client';

import { useEffect } from 'react';

interface StructuredDataProps {
	data: object | object[];
}

/**
 * Componente para injetar structured data (JSON-LD) no head da página
 * Melhora SEO e permite rich snippets nos resultados de busca
 */
export default function StructuredData({ data }: StructuredDataProps) {
	useEffect(() => {
		const script = document.createElement('script');
		script.type = 'application/ld+json';
		script.text = JSON.stringify(data);
		script.id = 'structured-data';

		// Remover script anterior se existir
		const existingScript = document.getElementById('structured-data');
		if (existingScript) {
			existingScript.remove();
		}

		document.head.appendChild(script);

		return () => {
			const scriptToRemove = document.getElementById('structured-data');
			if (scriptToRemove) {
				scriptToRemove.remove();
			}
		};
	}, [data]);

	return null;
}

