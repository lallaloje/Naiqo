import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Copy, Share2, ExternalLink } from "lucide-react";
import QRCode from 'qrcode';
import { logError, logInfo } from "@/lib/logger";
import { useAuth } from "@/hooks/useAuth";

const BookingLinkCard = () => {
  const [salonId, setSalonId] = useState<string>('');
  const [salonName, setSalonName] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadSalonInfo = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('salons')
          .select('id, salon_name')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setSalonId(data.id);
          setSalonName(data.salon_name || '');
        }
      } catch (error) {
        logError('BookingLinkCard:loadSalonInfo', error);
      }
    };

    loadSalonInfo();
  }, [user]);

  const bookingUrl = `${window.location.origin}/reservar/${salonId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast({
      title: "Enlace copiado",
      description: "El enlace de reservas se ha copiado al portapapeles",
    });
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reserva tu cita en ${salonName}`,
          text: 'Reserva tu cita de manera fácil y rápida',
          url: bookingUrl,
        });
      } catch (error) {
        logInfo('BookingLinkCard:shareLink', 'Share cancelled or not supported');
      }
    } else {
      copyToClipboard();
    }
  };

  const downloadQR = async () => {
    try {
      const qrDataUrl = await QRCode.toDataURL(bookingUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `reservas-${salonId}.png`;
      link.click();
    } catch (error) {
      logError('BookingLinkCard:downloadQR', error);
      toast({
        title: "Error",
        description: "No se pudo generar el código QR",
        variant: "destructive",
      });
    }
  };

  if (!salonId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Tu Enlace de Reservas
        </CardTitle>
        <CardDescription>
          Comparte este enlace con tus clientes para que puedan ver tu disponibilidad
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={bookingUrl}
            readOnly
            className="font-mono text-sm"
          />
          <Button onClick={copyToClipboard} variant="outline" size="icon" title="Copiar enlace">
            <Copy className="w-4 h-4" />
          </Button>
          <Button onClick={shareLink} variant="outline" size="icon" title="Compartir">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={downloadQR} variant="outline" className="flex-1">
            <QrCode className="w-4 h-4 mr-2" />
            Descargar QR
          </Button>
          <Button
            onClick={() => window.open(bookingUrl, '_blank')}
            variant="outline"
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Vista Previa
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-2">💡 Cómo usar tu enlace:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Imprime el código QR y colócalo en tu salón</li>
            <li>Compártelo en Instagram, WhatsApp o email</li>
            <li>Tus clientes podrán ver tu disponibilidad y solicitar cita</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingLinkCard;
