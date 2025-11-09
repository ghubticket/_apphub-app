import Button from '@/components/shared/Button';
import Container from '@/components/shared/Container';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary to-primary-dark">
      <Container className="py-16">
        <div className="text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            EventHub
          </h1>
          <p className="text-xl md:text-2xl mb-8">
            Sistema de Ingressos para Eventos
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="lg" className="bg-white text-primary hover:bg-gray-100">
              Ver Eventos
            </Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary">
              Entrar
            </Button>
          </div>
        </div>
      </Container>
    </main>
  );
}
