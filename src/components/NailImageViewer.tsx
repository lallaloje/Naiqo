import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertTriangle, X } from 'lucide-react';
import { logError } from '@/lib/logger';

interface NailImageViewerProps {
  imageId: string;
  onClose: () => void;
}

interface ImageDetails {
  id: string;
  storage_path: string;
  finger: string | null;
  age_range: string | null;
  skin_tone: string | null;
  has_dermatoscopy: boolean;
  lab_result: string | null;
  resolution: string | null;
  quality_score: number | null;
  source: string;
  attribution: string | null;
  uploaded_at: string;
  reported_issues: number;
}

const NailImageViewer = ({ imageId, onClose }: NailImageViewerProps) => {
  const [image, setImage] = useState<ImageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    fetchImageDetails();
  }, [imageId]);

  const fetchImageDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('nail_images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (error) throw error;
      setImage(data);
    } catch (error) {
      console.error('Error fetching image details:', error);
      toast.error('Error al cargar los detalles de la imagen');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from('nail-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleReportIssue = async () => {
    if (!reportReason.trim()) {
      toast.error('Por favor describe el problema encontrado');
      return;
    }

    setIsReporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('image_annotations').insert({
        image_id: imageId,
        annotator_id: user?.id,
        annotation_type: 'quality_issue',
        annotation_data: {
          reason: reportReason,
          timestamp: new Date().toISOString()
        }
      });

      const { error: updateError } = await supabase
        .from('nail_images')
        .update({ reported_issues: (image?.reported_issues || 0) + 1 })
        .eq('id', imageId);

      if (updateError) throw updateError;

      toast.success('Reporte enviado correctamente. Gracias por tu colaboración.');
      setReportReason('');
      fetchImageDetails();
    } catch (error) {
      logError('NailImageViewer:handleReport', error);
      toast.error('Error al enviar el reporte');
    } finally {
      setIsReporting(false);
    }
  };

  if (loading || !image) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-muted rounded-lg overflow-hidden">
        <img
          src={getImageUrl(image.storage_path)}
          alt="Imagen ungueal"
          className="w-full max-h-[500px] object-contain"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {image.finger && (
          <div>
            <span className="font-semibold">Dedo:</span> {image.finger}
          </div>
        )}
        {image.age_range && (
          <div>
            <span className="font-semibold">Edad:</span> {image.age_range} años
          </div>
        )}
        {image.skin_tone && (
          <div>
            <span className="font-semibold">Tono de piel:</span> Tipo {image.skin_tone} (Fitzpatrick)
          </div>
        )}
        <div>
          <span className="font-semibold">Dermatoscopia:</span> {image.has_dermatoscopy ? 'Sí' : 'No'}
        </div>
        {image.resolution && (
          <div>
            <span className="font-semibold">Resolución:</span> {image.resolution}
          </div>
        )}
        {image.quality_score && (
          <div>
            <span className="font-semibold">Calidad:</span> {image.quality_score}/5
          </div>
        )}
        {image.lab_result && (
          <div className="col-span-2">
            <span className="font-semibold">Resultado de laboratorio:</span> {image.lab_result}
          </div>
        )}
        <div className="col-span-2">
          <span className="font-semibold">Fuente:</span> {image.source === 'user_upload' ? 'Subida por centro' : image.source}
          {image.attribution && ` - ${image.attribution}`}
        </div>
      </div>

      {image.reported_issues > 0 && (
        <Badge variant="destructive" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {image.reported_issues} reporte(s) de problemas
        </Badge>
      )}

      <div className="border-t pt-4 space-y-3">
        <h3 className="font-semibold">Reportar problema o diagnóstico incorrecto</h3>
        <Textarea
          placeholder="Describe el problema que encontraste con esta imagen..."
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          rows={3}
        />
        <Button
          onClick={handleReportIssue}
          disabled={isReporting || !reportReason.trim()}
          variant="outline"
          className="w-full"
        >
          {isReporting ? 'Enviando...' : 'Enviar Reporte'}
        </Button>
      </div>
    </div>
  );
};

export default NailImageViewer;
