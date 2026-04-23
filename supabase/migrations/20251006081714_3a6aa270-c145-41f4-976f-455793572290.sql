-- Create enum for image usage rights
CREATE TYPE image_usage_rights AS ENUM ('clinical_only', 'clinical_and_ml', 'public_dataset');

-- Create nail_conditions table
CREATE TABLE nail_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  synonyms TEXT[],
  category TEXT NOT NULL,
  short_definition TEXT NOT NULL,
  clinical_signs TEXT,
  differential_diagnosis TEXT[],
  recommended_tests TEXT[],
  treatment_summary TEXT,
  dermnet_url TEXT,
  aad_url TEXT,
  pubmed_refs TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create nail_images table
CREATE TABLE nail_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID REFERENCES nail_conditions(id),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  finger TEXT,
  age_range TEXT,
  skin_tone TEXT,
  has_dermatoscopy BOOLEAN DEFAULT false,
  lab_result TEXT,
  resolution TEXT,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
  source TEXT NOT NULL DEFAULT 'user_upload',
  attribution TEXT,
  usage_rights image_usage_rights NOT NULL DEFAULT 'clinical_only',
  consent_version TEXT,
  clinical_consent BOOLEAN NOT NULL DEFAULT false,
  ml_consent BOOLEAN DEFAULT false,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  is_anonymized BOOLEAN DEFAULT false,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  reported_issues INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ
);

-- Create image_annotations table
CREATE TABLE image_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES nail_images(id) ON DELETE CASCADE,
  annotator_id UUID,
  annotation_type TEXT NOT NULL,
  annotation_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create consent_logs table
CREATE TABLE consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES nail_images(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  consent_type TEXT,
  previous_value BOOLEAN,
  new_value BOOLEAN,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE nail_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nail_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nail_conditions (public read)
CREATE POLICY "Nail conditions are viewable by everyone"
  ON nail_conditions FOR SELECT
  USING (true);

-- RLS Policies for nail_images
CREATE POLICY "Nail images are viewable by authenticated users"
  ON nail_images FOR SELECT
  USING (auth.role() = 'authenticated' AND deleted_at IS NULL);

CREATE POLICY "Authenticated users can upload images"
  ON nail_images FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own images"
  ON nail_images FOR UPDATE
  USING (uploaded_by = auth.uid());

-- RLS Policies for image_annotations
CREATE POLICY "Annotations are viewable by authenticated users"
  ON image_annotations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create annotations"
  ON image_annotations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for consent_logs
CREATE POLICY "Consent logs are viewable by admin only"
  ON consent_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert consent logs"
  ON consent_logs FOR INSERT
  WITH CHECK (true);

-- Create updated_at triggers
CREATE TRIGGER update_nail_conditions_updated_at
  BEFORE UPDATE ON nail_conditions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial nail conditions data
INSERT INTO nail_conditions (name, category, short_definition, synonyms, clinical_signs, differential_diagnosis, recommended_tests, treatment_summary, dermnet_url, pubmed_refs) VALUES
('Onicomicosis', 'infeccion', 'Infección fúngica de la uña causada por dermatofitos, levaduras o mohos no dermatofitos.', ARRAY['Tinea unguium', 'Infección fúngica ungueal'], 
 'Decoloración amarillenta, engrosamiento de la uña, hiperqueratosis subungueal, onicolisis distal, fragilidad ungueal.', 
 ARRAY['Psoriasis ungueal', 'Onicodistrofia traumática', 'Liquen plano ungueal'],
 ARRAY['Cultivo fúngico', 'Examen directo con KOH', 'PCR para hongos', 'Biopsia ungueal'],
 'Tratamiento tópico (lacas antifúngicas), sistémico (terbinafina, itraconazol), terapia láser, eliminación quirúrgica en casos severos.',
 'https://dermnetnz.org/topics/onychomycosis',
 ARRAY['PMID: 31425726', 'PMID: 30903937']),

('Onicolisis', 'distrofia', 'Separación de la lámina ungueal del lecho ungueal, generalmente comenzando en el borde libre.', 
 ARRAY['Despegamiento ungueal'],
 'Separación ungueal blanco-amarillenta, puede ser parcial o total, sin dolor generalmente.',
 ARRAY['Psoriasis', 'Onicomicosis', 'Traumatismo', 'Hipertiroidismo', 'Fotoonicólisis'],
 ARRAY['Cultivo para descartar infección', 'Pruebas de función tiroidea', 'Dermatoscopia'],
 'Tratar causa subyacente, evitar traumatismos, mantener uñas cortas, evitar humedad prolongada.',
 'https://dermnetnz.org/topics/onycholysis',
 ARRAY['PMID: 29908814']),

('Psoriasis ungueal', 'inflamatoria', 'Manifestación ungueal de la psoriasis, puede afectar matriz, lecho o pliegue ungueal.',
 ARRAY['Nail psoriasis', 'Psoriasis de las uñas'],
 'Pitting (depresiones puntiformes), manchas oleosas, onicolisis, hiperqueratosis subungueal, hemorragias en astilla.',
 ARRAY['Onicomicosis', 'Liquen plano ungueal', 'Alopecia areata'],
 ARRAY['Biopsia de lecho ungueal', 'Dermatoscopia', 'Cultivo fúngico para exclusión'],
 'Corticoides tópicos potentes, calcipotriol tópico, inyecciones intralesionales de corticoides, fototerapia, tratamientos sistémicos (metotrexato, biológicos).',
 'https://dermnetnz.org/topics/nail-psoriasis',
 ARRAY['PMID: 31654408', 'PMID: 30484991']),

('Paroniquia', 'infeccion', 'Inflamación e infección del pliegue ungueal proximal o lateral.',
 ARRAY['Perionixis', 'Whitlow'],
 'Enrojecimiento, hinchazón, dolor en pliegue ungueal, puede haber pus, pérdida de cutícula.',
 ARRAY['Onicomicosis', 'Herpetic whitlow', 'Carcinoma escamoso'],
 ARRAY['Cultivo bacteriano', 'Cultivo fúngico', 'Gram y cultivo de secreción'],
 'Antibióticos tópicos o sistémicos (aguda), antifúngicos (crónica por Candida), evitar irritantes, cirugía menor si absceso.',
 'https://dermnetnz.org/topics/paronychia',
 ARRAY['PMID: 29494048']),

('Melanoniquia', 'pigmentaria', 'Pigmentación longitudinal marrón o negra de la uña por depósito de melanina.',
 ARRAY['Longitudinal melanonychia', 'Pigmentación ungueal'],
 'Banda longitudinal marrón a negra, puede ser homogénea o heterogénea, uni o multidigital.',
 ARRAY['Melanoma subungueal', 'Nevus de matriz', 'Hemorragia subungueal', 'Medicamentos', 'Síndrome de Laugier-Hunziker'],
 ARRAY['Dermatoscopia ungueal', 'Biopsia de matriz ungueal', 'Histopatología'],
 'Observación si benigno, biopsia si sospecha de melanoma, excisión quirúrgica si melanoma confirmado.',
 'https://dermnetnz.org/topics/melanonychia',
 ARRAY['PMID: 31364212', 'PMID: 29908817']);

-- Create storage bucket for nail images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nail-images',
  'nail-images',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
);

-- Storage policies for nail-images bucket
CREATE POLICY "Authenticated users can view nail images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nail-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload nail images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'nail-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own uploads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'nail-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'nail-images' AND auth.uid()::text = (storage.foldername(name))[1]);