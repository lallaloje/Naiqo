import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ZoomIn, AlertTriangle } from 'lucide-react';
import NailImageViewer from './NailImageViewer';
import { logError } from '@/lib/logger';

interface NailImage {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  finger: string | null;
  age_range: string | null;
  skin_tone: string | null;
  has_dermatoscopy: boolean;
  source: string;
  attribution: string | null;
  quality_score: number | null;
}

interface NailImageGalleryProps {
  conditionId: string;
}

const NailImageGallery = ({ conditionId }: NailImageGalleryProps) => {
  const [images, setImages] = useState<NailImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<NailImage | null>(null);
  const [filterFinger, setFilterFinger] = useState<string>('all');
  const [filterSkinTone, setFilterSkinTone] = useState<string>('all');
  const [filterDermatoscopy, setFilterDermatoscopy] = useState<string>('all');

  useEffect(() => {
    fetchImages();
  }, [conditionId]);

  const fetchImages = async () => {
    try {
      let query = supabase
        .from('nail_images')
        .select('*')
        .eq('condition_id', conditionId)
        .is('deleted_at', null)
        .order('uploaded_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      logError('NailImageGallery:fetchImages', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from('nail-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const filteredImages = images.filter(image => {
    if (filterFinger !== 'all' && image.finger !== filterFinger) return false;
    if (filterSkinTone !== 'all' && image.skin_tone !== filterSkinTone) return false;
    if (filterDermatoscopy === 'yes' && !image.has_dermatoscopy) return false;
    if (filterDermatoscopy === 'no' && image.has_dermatoscopy) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Dedo</label>
              <Select value={filterFinger} onValueChange={setFilterFinger}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="thumb">Pulgar</SelectItem>
                  <SelectItem value="index">Índice</SelectItem>
                  <SelectItem value="middle">Medio</SelectItem>
                  <SelectItem value="ring">Anular</SelectItem>
                  <SelectItem value="pinky">Meñique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tono de piel</label>
              <Select value={filterSkinTone} onValueChange={setFilterSkinTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="I">Tipo I (Fitzpatrick)</SelectItem>
                  <SelectItem value="II">Tipo II</SelectItem>
                  <SelectItem value="III">Tipo III</SelectItem>
                  <SelectItem value="IV">Tipo IV</SelectItem>
                  <SelectItem value="V">Tipo V</SelectItem>
                  <SelectItem value="VI">Tipo VI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Dermatoscopia</label>
              <Select value={filterDermatoscopy} onValueChange={setFilterDermatoscopy}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="yes">Con dermatoscopia</SelectItem>
                  <SelectItem value="no">Sin dermatoscopia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay imágenes disponibles con los filtros seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map(image => (
                <div key={image.id} className="relative group cursor-pointer">
                  <div
                    className="aspect-square overflow-hidden rounded-lg bg-muted"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={getImageUrl(image.thumbnail_path || image.storage_path)}
                      alt="Imagen ungueal"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {image.has_dermatoscopy && (
                      <Badge variant="secondary" className="text-xs">Dermatoscopia</Badge>
                    )}
                    {image.quality_score && image.quality_score < 3 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Baja calidad
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Fuente: {image.source === 'user_upload' ? 'Subida por centro' : image.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Visor de Imagen</DialogTitle>
            </DialogHeader>
            <NailImageViewer
              imageId={selectedImage.id}
              onClose={() => setSelectedImage(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default NailImageGallery;
