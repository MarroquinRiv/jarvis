'use client'

import { useState, useRef, useEffect } from 'react'
import { Project } from '@/lib/projects'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ProjectChatProps {
  project: Project
}

// Configuración según protocolo oficial de n8n Chat Trigger
const CHAT_CONFIG = {
  chatInputKey: 'chatInput',
  chatSessionKey: 'sessionId',
  loadPreviousSession: true,
  enableStreaming: true, // Soporta ambos modos
}

// Gestión de sesión persistente (localStorage)
const SESSION_STORAGE_KEY = 'n8n-chat-session'
const MESSAGES_STORAGE_KEY_PREFIX = 'n8n-chat-messages'

function getStoredSessionId(projectId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(`${SESSION_STORAGE_KEY}-${projectId}`)
    return stored
  } catch {
    return null
  }
}

function storeSessionId(projectId: string, sessionId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${SESSION_STORAGE_KEY}-${projectId}`, sessionId)
  } catch (error) {
    console.error('Failed to store session ID:', error)
  }
}

function getStoredMessages(projectId: string): Message[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(`${MESSAGES_STORAGE_KEY_PREFIX}-${projectId}`)
    if (!stored) return []
    return JSON.parse(stored).map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }))
  } catch {
    return []
  }
}

function storeMessages(projectId: string, messages: Message[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${MESSAGES_STORAGE_KEY_PREFIX}-${projectId}`, JSON.stringify(messages))
  } catch (error) {
    console.error('Failed to store messages:', error)
  }
}

export function ProjectChat({ project }: ProjectChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Inicializar sesión y cargar mensajes previos
  useEffect(() => {
    if (CHAT_CONFIG.loadPreviousSession) {
      const storedSessionId = getStoredSessionId(project.id)
      const storedMessages = getStoredMessages(project.id)
      
      if (storedSessionId && storedMessages.length > 0) {
        setSessionId(storedSessionId)
        setMessages(storedMessages)
      } else {
        const newSessionId = uuidv4().replace(/-/g, '')
        setSessionId(newSessionId)
        storeSessionId(project.id, newSessionId)
      }
    } else {
      const newSessionId = uuidv4().replace(/-/g, '')
      setSessionId(newSessionId)
    }
  }, [project.id])

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus en input después de enviar
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus()
    }
  }, [isLoading])

  // Persistir mensajes cuando cambian
  useEffect(() => {
    if (messages.length > 0 && CHAT_CONFIG.loadPreviousSession) {
      storeMessages(project.id, messages)
    }
  }, [messages, project.id])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !sessionId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    // Crear AbortController para cancelar request si es necesario
    abortControllerRef.current = new AbortController()

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_CHAT

      if (!webhookUrl) {
        throw new Error('Webhook URL no configurada')
      }

      // Payload según protocolo oficial de n8n Chat Trigger
      const payload: Record<string, any> = {
        [CHAT_CONFIG.chatInputKey]: currentInput,
        [CHAT_CONFIG.chatSessionKey]: sessionId,
      }

      // Añadir metadata opcional (útil para filtros en n8n)
      payload.metadata = {
        projectId: project.id,
        projectName: project.name,
        timestamp: new Date().toISOString(),
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`)
      }

      // Detectar si la respuesta es streaming
      const contentType = response.headers.get('content-type')
      const isStreamingResponse = contentType?.includes('text/event-stream') || 
                                   contentType?.includes('application/x-ndjson')

      if (CHAT_CONFIG.enableStreaming && isStreamingResponse) {
        // Modo streaming: procesar chunks progresivamente
        await handleStreamingResponse(response)
      } else {
        // Modo normal: respuesta completa
        await handleNormalResponse(response)
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request cancelled')
        return
      }

      console.error('Error sending message:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleNormalResponse = async (response: Response) => {
    const data = await response.json()
    
    // Parsear respuesta según diferentes formatos posibles de n8n
    let assistantText = ''
    
    if (typeof data === 'string') {
      assistantText = data
    } else if (data.output) {
      assistantText = data.output
    } else if (data.response) {
      assistantText = data.response
    } else if (data.text) {
      assistantText = data.text
    } else if (data.message) {
      assistantText = data.message
    } else {
      assistantText = 'Lo siento, no pude generar una respuesta.'
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: assistantText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])
  }

  const handleStreamingResponse = async (response: Response) => {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No se pudo leer la respuesta streaming')
    }

    let accumulatedText = ''
    const assistantMessageId = (Date.now() + 1).toString()

    // Crear mensaje inicial vacío que se irá llenando
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, initialAssistantMessage])

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulatedText += chunk

        // Actualizar el mensaje en tiempo real
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulatedText }
              : msg
          )
        )
      }
    } finally {
      reader.releaseLock()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleNewConversation = () => {
    const newSessionId = uuidv4().replace(/-/g, '')
    setSessionId(newSessionId)
    storeSessionId(project.id, newSessionId)
    setMessages([])
    storeMessages(project.id, [])
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="h-full border-0 rounded-none shadow-none flex flex-col">
        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Chat: {project.name}
            </CardTitle>
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewConversation}
                disabled={isLoading}
              >
                Nueva conversación
              </Button>
            )}
          </div>
          {sessionId && (
            <p className="text-xs text-muted-foreground">
              Sesión: {sessionId.slice(0, 8)}...
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Comienza una conversación
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Haz preguntas sobre tus documentos. El asistente utilizará inteligencia artificial
                para buscar información relevante y darte respuestas precisas.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user'
                          ? 'text-blue-100'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-in fade-in duration-300">
                  <div className="bg-muted rounded-lg p-3 flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Escribiendo...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        <div className="border-t p-4 flex-shrink-0">
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading || !sessionId}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim() || !sessionId}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
