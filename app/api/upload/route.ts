import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { parse } from "csv-parse/sync";

// Inicializar Supabase con Service Role Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase configuration");
}

const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Inicializar OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Función para dividir texto en chunks
function splitTextIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = startIndex + chunkSize;
    const chunk = text.slice(startIndex, endIndex);
    chunks.push(chunk);

    // Move forward, accounting for overlap
    startIndex += chunkSize - overlap;
  }

  return chunks;
}

// Funciones de extracción de texto por tipo de archivo
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Validar que el buffer no esté vacío
    if (!buffer || buffer.length === 0) {
      throw new Error("Buffer del PDF está vacío");
    }

    console.log(`📊 Tamaño del buffer PDF: ${buffer.length} bytes`);

    // Usar pdfjs-dist (Mozilla) en lugar de pdf-parse
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    
    // Cargar el PDF desde el buffer
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    console.log(`📄 PDF tiene ${numPages} páginas`);

    let fullText = "";

    // Extraer texto de cada página
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    if (!fullText || fullText.trim().length === 0) {
      throw new Error("No se pudo extraer texto del PDF");
    }

    console.log(`✅ PDF procesado: ${numPages} páginas, ${fullText.length} caracteres`);
    return fullText;
  } catch (error: any) {
    console.error("❌ Error en extractTextFromPDF:", error);
    throw new Error(`Error extrayendo texto del PDF: ${error.message}`);
  }
}

async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let text = "";
  
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    text += `\n--- ${sheetName} ---\n${csv}\n`;
  });
  
  return text;
}

async function extractTextFromCSV(buffer: Buffer): Promise<string> {
  const content = buffer.toString("utf-8");
  const records = parse(content, {
    skip_empty_lines: true,
    trim: true,
  });
  
  return records.map((row: any) => row.join(", ")).join("\n");
}

async function extractTextFromText(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8");
}

// Función principal de extracción
async function extractText(file: File): Promise<string> {
  try {
    console.log(`📁 Archivo recibido: ${file.name} (${file.size} bytes, tipo: ${file.type})`);

    // Validar que el archivo tenga contenido
    if (file.size === 0) {
      throw new Error("El archivo está vacío");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`🔄 Buffer creado: ${buffer.length} bytes`);

    const extension = file.name.split(".").pop()?.toLowerCase();
    console.log(`📎 Extensión detectada: ${extension}`);

    switch (extension) {
      case "pdf":
        return await extractTextFromPDF(buffer);
      case "docx":
        return await extractTextFromWord(buffer);
      case "xlsx":
        return await extractTextFromExcel(buffer);
      case "csv":
        return await extractTextFromCSV(buffer);
      case "txt":
      case "md":
        return await extractTextFromText(buffer);
      case "pptx":
        throw new Error("PowerPoint (.pptx) aún no soportado completamente");
      default:
        throw new Error(`Formato no soportado: ${extension}`);
    }
  } catch (error: any) {
    console.error("❌ Error en extractText:", error);
    throw error; // Re-lanzar para que sea capturado por el handler principal
  }
}

export async function POST(request: NextRequest) {
  try {
    // Obtener el archivo del FormData
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    console.log(`📄 Procesando archivo: ${file.name}`);

    // 1. Extraer texto del documento
    console.log("🔍 Extrayendo texto...");
    const text = await extractText(file);
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No se pudo extraer texto del documento" },
        { status: 400 }
      );
    }

    console.log(`📝 Texto extraído: ${text.length} caracteres`);

    // 2. Dividir en chunks
    console.log("✂️  Dividiendo en chunks...");
    const chunks = splitTextIntoChunks(text);
    console.log(`📦 Creados ${chunks.length} chunks`);

    // 3. Crear metadata base
    const baseMetadata = {
      source: file.name,
      blobType: file.type,
      uploadedAt: new Date().toISOString(),
    };

    // 4. Procesar cada chunk: generar embedding e insertar
    console.log("🧠 Generando embeddings y guardando en Supabase...");
    let insertedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Crear metadata específico del chunk
      const chunkMetadata = {
        ...baseMetadata,
        loc: { pageNumber: i + 1 },
        chunkIndex: i,
        totalChunks: chunks.length,
      };

      // Generar embedding para este chunk usando OpenAI API directamente
      let embeddingVector: number[];
      
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk,
        });
        embeddingVector = embeddingResponse.data[0].embedding;
      } catch (openaiError: any) {
        console.error(`❌ Error de OpenAI:`, openaiError);
        
        // Si es error 429 (quota), devolver error específico
        if (openaiError.status === 429 || openaiError.code === 'insufficient_quota') {
          return NextResponse.json(
            { 
              error: "El servicio de embeddings está temporalmente no disponible. Por favor, contacta al administrador.",
              details: "OpenAI quota exceeded"
            },
            { status: 503 }
          );
        }
        
        throw new Error(`Error generando embedding: ${openaiError.message}`);
      }

      // Insertar en Supabase
      const { error } = await supabaseClient
        .from("documents")
        .insert({
          content: chunk,
          metadata: chunkMetadata,
          embedding: embeddingVector,
        });

      if (error) {
        console.error(`❌ Error insertando chunk ${i}:`, error);
        throw new Error(`Error al guardar chunk ${i}: ${error.message}`);
      }

      insertedChunks++;
      console.log(`✅ Chunk ${i + 1}/${chunks.length} guardado`);
    }

    console.log(`✅ Documento procesado exitosamente: ${insertedChunks} chunks guardados`);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      chunks: insertedChunks,
      message: "Documento procesado y guardado exitosamente",
    });

  } catch (error: any) {
    console.error("❌ Error procesando documento:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar el documento" },
      { status: 500 }
    );
  }
}
