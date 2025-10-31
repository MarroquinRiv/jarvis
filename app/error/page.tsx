import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Error de autenticación</CardTitle>
          <CardDescription>
            Lo sentimos, algo salió mal durante el proceso de autenticación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Por favor, intenta iniciar sesión nuevamente. Si el problema persiste,
            contacta con el soporte.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/login">
              <Button className="w-full">Volver a iniciar sesión</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Ir al inicio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}