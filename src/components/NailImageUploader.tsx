import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, AlertCircle } from 'lucide-react';
import { logError } from '@/lib/logger';

interface NailImageUploaderProps {
  onUploadComplete?: () => void;
}

const NailImageUploader = ({ onUploadComplete }: NailImageUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    conditionId: '',
    finger: '',
    ageRange: '',
    skinTone: '',
    hasDermatoscopy: false,
    labResult: '',
    clinicalConsent: false,
    mlConsent: false,
    gdprConsent: false,
    anonymize: false
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 10MB');
      return;
    }

    // Check resolution
    const img = new Image();
    img.onload = () => {
      if (img.width < 800 || img.height < 800) {
        toast.warning('La imagen tiene baja resolución. Se recomienda mínimo 800x800 px');
      }
    };
    img.src = URL.createObjectURL(file);

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Por favor selecciona una imagen');
      return;
    }

    if (!formData.conditionId) {
      toast.error('Por favor selecciona una afección');
      return;
    }

    if (!formData.clinicalConsent || !formData.gdprConsent) {
      toast.error('Debes aceptar los consentimientos obligatorios');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Upload image to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('nail-images')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get image metadata
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = URL.createObjectURL(selectedFile);
      });

      const resolution = `${img.width}x${img.height}`;
      const usageRights = formData.mlConsent ? 'clinical_and_ml' : 'clinical_only';

      // Insert image record
      const { error: insertError } = await supabase.from('nail_images').insert({
        condition_id: formData.conditionId,
        storage_path: fileName,
        finger: formData.finger || null,
        age_range: formData.ageRange || null,
        skin_tone: formData.skinTone || null,
        has_dermatoscopy: formData.hasDermatoscopy,
        lab_result: formData.labResult || null,
        usage_rights: usageRights,
        consent_version: 'v1.0',
        clinical_consent: formData.clinicalConsent,
        ml_consent: formData.mlConsent,
        gdpr_consent: formData.gdprConsent,
        consent_timestamp: new Date().toISOString(),
        resolution,
        is_anonymized: formData.anonymize,
        uploaded_by: user.id
      });

      if (insertError) throw insertError;

      toast.success('Imagen subida correctamente');
      
      // Reset form
      setSelectedFile(null);
      setFormData({
        conditionId: '',
        finger: '',
        ageRange: '',
        skinTone: '',
        hasDermatoscopy: false,
        labResult: '',
        clinicalConsent: false,
        mlConsent: false,
        gdprConsent: false,
        anonymize: false
      });

      onUploadComplete?.();
    } catch (error) {
      logError('NailImageUploader:handleSubmit', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Subir Imagen Ungueal
        </CardTitle>
        <CardDescription>
          Contribuye a la base de conocimientos subiendo imágenes de casos clínicos con consentimiento del paciente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="image">Imagen *</Label>
          <Input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFileSelect}
          />
          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="condition">Afección *</Label>
          <Select value={formData.conditionId} onValueChange={(value) => setFormData({ ...formData, conditionId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona la afección" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="onicomicosis">Onicomicosis</SelectItem>
              <SelectItem value="onicolisis">Onicolisis</SelectItem>
              <SelectItem value="psoriasis">Psoriasis ungueal</SelectItem>
              <SelectItem value="paroniquia">Paroniquia</SelectItem>
              <SelectItem value="melanoniquia">Melanoniquia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="finger">Dedo</Label>
            <Input
              id="finger"
              placeholder="ej: pulgar_derecha"
              value={formData.finger}
              onChange={(e) => setFormData({ ...formData, finger: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Rango de edad</Label>
            <Input
              id="age"
              placeholder="ej: 30-40"
              value={formData.ageRange}
              onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="skinTone">Tono de piel (Fitzpatrick)</Label>
            <Select value={formData.skinTone} onValueChange={(value) => setFormData({ ...formData, skinTone: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {['I', 'II', 'III', 'IV', 'V', 'VI'].map(type => (
                  <SelectItem key={type} value={type}>Tipo {type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-8">
            <Checkbox
              id="dermatoscopy"
              checked={formData.hasDermatoscopy}
              onCheckedChange={(checked) => setFormData({ ...formData, hasDermatoscopy: checked as boolean })}
            />
            <Label htmlFor="dermatoscopy" className="font-normal">Con dermatoscopia</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="labResult">Resultado de laboratorio (opcional)</Label>
          <Textarea
            id="labResult"
            placeholder="ej: Cultivo positivo para Trichophyton rubrum"
            value={formData.labResult}
            onChange={(e) => setFormData({ ...formData, labResult: e.target.value })}
            rows={2}
          />
        </div>

        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-sm">Consentimientos y Permisos</h3>
          
          <div className="flex items-start space-x-2">
            <Checkbox
              id="clinical"
              checked={formData.clinicalConsent}
              onCheckedChange={(checked) => setFormData({ ...formData, clinicalConsent: checked as boolean })}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="clinical" className="text-sm font-normal">
                Autorizo el uso de esta imagen para fines clínicos dentro de NAIQO *
              </Label>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="ml"
              checked={formData.mlConsent}
              onCheckedChange={(checked) => setFormData({ ...formData, mlConsent: checked as boolean })}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="ml" className="text-sm font-normal">
                Autorizo el uso para entrenamiento de modelos de inteligencia artificial
              </Label>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="gdpr"
              checked={formData.gdprConsent}
              onCheckedChange={(checked) => setFormData({ ...formData, gdprConsent: checked as boolean })}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="gdpr" className="text-sm font-normal">
                Entiendo que la imagen será desidentificada y procesada según RGPD *
              </Label>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="anonymize"
              checked={formData.anonymize}
              onCheckedChange={(checked) => setFormData({ ...formData, anonymize: checked as boolean })}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="anonymize" className="text-sm font-normal">
                Solicitar anonimización adicional (difuminar fondo/rostros)
              </Label>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-xs">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              <strong>Información legal:</strong> Al subir esta imagen, confirmo que cuento con el consentimiento informado del paciente. 
              La imagen será desidentificada y almacenada de forma segura. Para solicitudes de borrado o más información: 
              <a href="mailto:hola@naiqo.es" className="text-primary hover:underline ml-1">hola@naiqo.es</a>
            </p>
          </div>
        </div>

        <Button
          onClick={handleUpload}
          disabled={uploading || !selectedFile || !formData.clinicalConsent || !formData.gdprConsent}
          className="w-full"
        >
          {uploading ? 'Subiendo...' : 'Subir Imagen'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default NailImageUploader;
