-- Crear políticas RLS para el bucket nail-images

-- Permitir a cualquier usuario subir imágenes
CREATE POLICY "Anyone can upload nail images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'nail-images');

-- Permitir a cualquier usuario ver las imágenes que subieron
CREATE POLICY "Anyone can view nail images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'nail-images');

-- Permitir a usuarios autenticados actualizar sus imágenes
CREATE POLICY "Authenticated users can update nail images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'nail-images');

-- Permitir a usuarios autenticados eliminar imágenes
CREATE POLICY "Authenticated users can delete nail images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'nail-images');