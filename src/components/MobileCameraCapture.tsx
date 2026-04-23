import { useRef, useState, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw, Check } from 'lucide-react';
import { TouchButton } from '@/components/ui/touch-button';
import { cn } from '@/lib/utils';
import { validateImage, compressImage } from '@/lib/imageCompression';
import { toast } from '@/hooks/use-toast';

interface MobileCameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel?: () => void;
  className?: string;
}

export function MobileCameraCapture({ onCapture, onCancel, className }: MobileCameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Validate
      const validation = validateImage(file);
      if (!validation.isValid) {
        toast({
          title: "Imagen no válida",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }

      // Compress
      const compressionResult = await compressImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setSelectedFile(compressionResult.file);
      };
      reader.readAsDataURL(compressionResult.file);
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la imagen",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleConfirm = useCallback(() => {
    if (selectedFile) {
      onCapture(selectedFile);
      setPreview(null);
      setSelectedFile(null);
    }
  }, [selectedFile, onCapture]);

  const handleRetake = useCallback(() => {
    setPreview(null);
    setSelectedFile(null);
  }, []);

  const handleCancel = useCallback(() => {
    setPreview(null);
    setSelectedFile(null);
    onCancel?.();
  }, [onCancel]);

  // Preview mode
  if (preview) {
    return (
      <div className={cn("relative w-full aspect-square bg-black rounded-2xl overflow-hidden", className)}>
        <img 
          src={preview} 
          alt="Preview" 
          className="w-full h-full object-contain"
        />
        
        {/* Action buttons overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center gap-4">
            <TouchButton
              variant="outline"
              size="icon"
              onClick={handleRetake}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              <RotateCcw className="w-6 h-6" />
            </TouchButton>
            
            <TouchButton
              size="lg"
              onClick={handleConfirm}
              className="px-8"
              disabled={isProcessing}
            >
              <Check className="w-6 h-6 mr-2" />
              Usar foto
            </TouchButton>
            
            <TouchButton
              variant="outline"
              size="icon"
              onClick={handleCancel}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              <X className="w-6 h-6" />
            </TouchButton>
          </div>
        </div>
      </div>
    );
  }

  // Capture mode
  return (
    <div className={cn("space-y-4", className)}>
      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Camera button - Large and prominent */}
      <TouchButton
        fullWidth
        size="lg"
        onClick={() => cameraInputRef.current?.click()}
        disabled={isProcessing}
        className="h-20 text-lg"
      >
        <Camera className="w-8 h-8 mr-3" />
        Tomar Foto
      </TouchButton>

      {/* Gallery button */}
      <TouchButton
        fullWidth
        variant="outline"
        size="lg"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
      >
        <Upload className="w-6 h-6 mr-2" />
        Subir desde galería
      </TouchButton>

      {/* Photo tips */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">Consejos para mejor foto:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Buena iluminación natural
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Enfoca solo la uña
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Fondo neutro (blanco/gris)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-500">✗</span> Evita sombras
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-500">✗</span> No uses flash directo
          </li>
        </ul>
      </div>
    </div>
  );
}
