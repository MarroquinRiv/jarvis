import { AuthButton } from "@/components/ui/AuthButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Jarvis</h2>
          <AuthButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-6xl md:text-8xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Jarvis
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12">
              Tu asistente de estudio impulsado por IA
            </p>
          </div>
        </section>

        {/* Option 1: Genera materiales de estudio */}
        <section className="min-h-screen flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-3xl">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl font-bold">
                Genera materiales de estudio
              </CardTitle>
              <CardDescription className="text-lg mt-4">
                Crea cientos de tarjetas de estudio en segundos a partir de tu
                contenido. Los algoritmos de IA analizan tus materiales y
                generan recursos de estudio de alta calidad adaptados a tus
                necesidades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Pruébalo
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Option 2: Chatea con tus documentos */}
        <section className="min-h-screen flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-3xl">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl font-bold">
                Chatea con tus documentos
              </CardTitle>
              <CardDescription className="text-lg mt-4">
                Participa en conversaciones interactivas con tus materiales de
                estudio usando la función de chat de StudyPotion. Haz
                preguntas, pide aclaraciones y profundiza en tu comprensión de
                temas complejos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Iniciar chat
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Option 3: Notas instantáneas con IA */}
        <section className="min-h-screen flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-3xl">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl font-bold">
                Notas instantáneas con IA
              </CardTitle>
              <CardDescription className="text-lg mt-4">
                Obtén notas con formato profesional al instante desde cualquier
                documento que subas. Los algoritmos de IA de StudyPotion
                resumen los puntos clave, crean esquemas y te proporcionan
                notas concisas y fáciles de repasar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                Generar notas
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
