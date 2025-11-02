-- Script de verificación para Supabase
-- Ejecuta esto en el SQL Editor de tu dashboard de Supabase

-- 1. Verificar que la extensión pgvector está habilitada
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 2. Verificar la estructura de la tabla documents
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;

-- 3. Verificar que la función match_documents existe
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'match_documents';

-- 4. Contar documentos existentes
SELECT COUNT(*) as total_documents FROM documents;

-- 5. Ver un ejemplo de documento (si existe)
SELECT 
  id,
  left(content, 100) as content_preview,
  metadata,
  array_length(embedding::float[], 1) as embedding_dimensions
FROM documents
LIMIT 1;
