import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sessionId) { setStatus('error'); setErrorMsg('Sesión no encontrada.'); return; }

    const confirm = async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke('confirm-setup-booking', {
          body: { sessionId },
        });
        if (error || !result?.success) throw new Error(result?.error || error?.message || 'No se pudo confirmar la reserva');
        setData(result);
        setStatus('ok');
      } catch (err: any) {
        setErrorMsg(err.message || 'No se pudo confirmar la reserva.');
        setStatus('error');
      }
    };
    confirm();
  }, [sessionId]);

  // ── Cargando ──
  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="text-center space-y-3">
        <Clock className="w-10 h-10 mx-auto text-primary animate-spin" />
        <p className="text-muted-foreground">Confirmando tu reserva...</p>
      </div>
    </div>
  );

  // ── Error ──
  if (status === 'error') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-pink-50 to-purple-50">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
          <h2 className="text-lg font-bold">Algo salió mal</h2>
          <p className="text-muted-foreground text-sm">{errorMsg}</p>
          <p className="text-sm">Si crees que es un error, contacta con el salón directamente.</p>
          <Button variant="outline" onClick={() => window.history.back()}>Volver</Button>
        </CardContent>
      </Card>
    </div>
  );

  // ── Éxito ──
  const startDate = data?.start_time ? new Date(data.start_time) : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-pink-50 to-purple-50">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-5">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-1">¡Cita solicitada! 🎉</h2>
            <p className="text-muted-foreground text-sm">
              Tu tarjeta ha sido guardada correctamente. El salón confirmará tu cita en breve.
            </p>
          </div>

          <div className="bg-muted rounded-xl p-4 text-left space-y-2 text-sm">
            <p>💅 <strong>{data?.service_name}</strong></p>
            {startDate && (
              <>
                <p>📅 {startDate.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
                <p>🕐 {startDate.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })}</p>
              </>
            )}
            <p>👤 {data?.client_name}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-1 text-left">
            <p className="font-semibold text-amber-900">💳 Tarjeta guardada — sin cargo por ahora</p>
            <p className="text-amber-800 text-xs">
              Recuerda que si cancelas con menos de 24 h o no acudes, se aplicará una penalización del 50% del servicio.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Recibirás un recordatorio antes de tu cita. Para cambios o cancelaciones, contacta con el salón.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingSuccess;
