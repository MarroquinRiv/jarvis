"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Send, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4().replace(/-/g, '')); // ID de sesión único
  const [leftPanelWidth, setLeftPanelWidth] = useState(30); // Ancho en porcentaje
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus en input después de enviar
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  // Manejar envío de mensaje
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Enviar al webhook de n8n
      const response = await fetch(
        "https://primary-production-a11a.up.railway.app/webhook/0d42dc52-fb60-479a-a07b-56b66689123a/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            {
              sessionId: sessionId,
              action: "sendMessage",
              chatInput: inputMessage,
            },
          ]),
        }
      );

      if (!response.ok) {
        throw new Error("Error al comunicarse con el asistente");
      }

      const data = await response.json();
      
      // Extraer el texto de la respuesta según la estructura proporcionada
      const assistantText = data[0]?.response?.generations?.[0]?.[0]?.text || "Lo siento, no pude generar una respuesta.";

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error enviando mensaje:", error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Lo siento, no pude conectar con el asistente. Por favor, intenta de nuevo.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Manejar drag del divisor
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth >= 20 && newWidth <= 50) {
        setLeftPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="h-screen flex bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Panel izquierdo - Documentos */}
      <div
        className={`transition-all duration-300 ${
          isLeftPanelCollapsed ? "w-0" : `w-[${leftPanelWidth}%]`
        } border-r bg-white relative`}
        style={{ width: isLeftPanelCollapsed ? "0" : `${leftPanelWidth}%` }}
      >
        {!isLeftPanelCollapsed && (
          <div className="h-full p-6 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Subir documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Próximamente: Sube documentos para chatear con ellos
                  </p>
                  <Button disabled variant="outline">
                    Seleccionar archivo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Botón de colapsar/expandir */}
        <button
          onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          className="absolute top-1/2 -right-3 transform -translate-y-1/2 bg-white border rounded-full p-1 shadow-md hover:bg-gray-100 z-10"
        >
          {isLeftPanelCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Divisor arrastrable */}
      {!isLeftPanelCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors"
        />
      )}

      {/* Panel derecho - Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4">
          <h1 className="text-2xl font-bold">Chat con Jarvis</h1>
          <p className="text-sm text-muted-foreground">
            Haz tus preguntas y obtén respuestas inteligentes
          </p>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground mt-20">
              <p className="text-lg mb-2">¡Hola! Soy Jarvis</p>
              <p>Escribe un mensaje para comenzar</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Indicador de escritura */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-[70%]">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm text-gray-600">Escribiendo...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input de mensaje */}
        <div className="bg-white border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje aquí..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
