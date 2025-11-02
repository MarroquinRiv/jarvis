// Script de prueba para verificar que todo funciona
// Ejecuta esto en tu dashboard de Supabase después de subir un documento

-- 1. Ver todos los documentos subidos
SELECT 
  id,
  left(content, 100) as content_preview,
  metadata->>'source' as filename,
  metadata->>'chunkIndex' as chunk,
  metadata->>'totalChunks' as total,
  metadata->>'uploadedAt' as uploaded_at,
  array_length(embedding::float[], 1) as embedding_dims
FROM documents
ORDER BY id DESC;

-- 2. Contar chunks por archivo
SELECT 
  metadata->>'source' as filename,
  COUNT(*) as total_chunks,
  MIN(id) as first_chunk_id,
  MAX(id) as last_chunk_id
FROM documents
GROUP BY metadata->>'source'
ORDER BY MAX(id) DESC;

-- 3. Verificar que los embeddings tienen 1536 dimensiones
SELECT 
  id,
  metadata->>'source' as filename,
  array_length(embedding::float[], 1) = 1536 as is_valid_embedding
FROM documents
ORDER BY id DESC
LIMIT 10;

-- 4. Probar búsqueda semántica (reemplaza el vector con uno real de tu primera prueba)
-- Primero obtén un embedding de ejemplo:
SELECT embedding FROM documents LIMIT 1;

-- Luego usa la función match_documents:
-- SELECT * FROM match_documents('[0.1, 0.2, ...]'::vector, 5);
