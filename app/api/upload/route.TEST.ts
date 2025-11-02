import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
    startIndex += chunkSize - overlap;
  }

  return chunks;
}

// Funciones de extracción de texto por tipo de archivo
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text;
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
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const extension = file.name.split(".").pop()?.toLowerCase();
  
  switch (extension) {
    case "pdf":
      return extractTextFromPDF(buffer);
    case "docx":
      return extractTextFromWord(buffer);
    case "xlsx":
      return extractTextFromExcel(buffer);
    case "csv":
      return extractTextFromCSV(buffer);
    case "txt":
    case "md":
      return extractTextFromText(buffer);
    case "pptx":
      throw new Error("PowerPoint (.pptx) aún no soportado completamente");
    default:
      throw new Error(`Formato no soportado: ${extension}`);
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

    // 3. MODO TEST: Guardar solo los primeros 100 caracteres de cada chunk SIN embeddings
    console.log("⚠️  MODO TEST: Guardando texto sin embeddings (OpenAI quota excedida)");
    
    const baseMetadata = {
      source: file.name,
      blobType: file.type,
      uploadedAt: new Date().toISOString(),
      testMode: true, // Marcador para identificar docs de prueba
    };

    let insertedChunks = 0;

    for (let i = 0; i < Math.min(chunks.length, 3); i++) { // Solo primeros 3 chunks en test
      const chunk = chunks[i];
      
      const chunkMetadata = {
        ...baseMetadata,
        loc: { pageNumber: i + 1 },
        chunkIndex: i,
        totalChunks: chunks.length,
      };

      // Crear un embedding fake de 1536 dimensiones (todos ceros)
      const fakeEmbedding = new Array(1536).fill(0);

      const { error } = await supabaseClient
        .from("documents")
        .insert({
          content: chunk.substring(0, 500), // Solo primeros 500 chars en test
          metadata: chunkMetadata,
          embedding: fakeEmbedding,
        });

      if (error) {
        console.error(`❌ Error insertando chunk ${i}:`, error);
        throw new Error(`Error al guardar chunk ${i}: ${error.message}`);
      }

      insertedChunks++;
      console.log(`✅ Chunk ${i + 1}/3 guardado (MODO TEST)`);
    }

    console.log(`✅ Documento procesado exitosamente: ${insertedChunks} chunks guardados`);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      chunks: insertedChunks,
      testMode: true,
      message: "Documento procesado en MODO TEST (sin embeddings reales). Agrega créditos a OpenAI para modo producción.",
    });

  } catch (error: any) {
    console.error("❌ Error procesando documento:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar el documento" },
      { status: 500 }
    );
  }
}
