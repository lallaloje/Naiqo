import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { MobileLayout } from '@/components/MobileLayout';
import { TouchButton } from '@/components/ui/touch-button';
import { useIsMobile } from '@/hooks/use-mobile';
import { startRegistration } from '@simplewebauthn/browser';
import {
  Save, LogOut, CreditCard, Calendar, RefreshCw, ExternalLink,
  CheckCircle, Loader2, FileText, Download, BarChart3, AlertTriangle,
  Fingerprint, Hash, Trash2, Link, Copy, Instagram
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { format, differenceInDays, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { logError } from '@/lib/logger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SalonData {
  id: string;
  salon_name: string;
  email: string;
  contact_name: string;
  phone: string | null;
  subscription_status: string;
  subscription_plan: string | null;
  stripe_customer_id: string | null;
  trial_ends_at: string;
  created_at: string;
  booking_slug: string | null;
}

interface SubscriptionInfo {
  subscribed: boolean;
  plan: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
  payment_method_last4?: string;
  payment_method_brand?: string;
}

interface UsageStats {
  analyses_count: number;
  month: string;
}

const planNames: Record<string, string> = {
  basico: 'Básico',
  profesional: 'Profesional',
  premium: 'Premium',
};

const planPrices: Record<string, number> = {
  basico: 39,
  profesional: 79,
  premium: 149,
};

const planLimits: Record<string, number> = {
  basico: 100,
  profesional: 500,
  premium: -1,
};

const Account = () => {
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [salonData, setSalonData] = useState<SalonData | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  // Quick access state
  const [newPin, setNewPin]               = useState('');
  const [confirmPin, setConfirmPin]       = useState('');
  const [savingPin, setSavingPin]         = useState(false);
  const [hasBiometric, setHasBiometric]   = useState(false);
  const [registeringBio, setRegisteringBio] = useState(false);
  const [deletingBio, setDeletingBio]     = useState(false);

  // Booking slug state
  const [slugInput, setSlugInput]         = useState('');
  const [savingSlug, setSavingSlug]       = useState(false);
  const [slugError, setSlugError]         = useState('');

  const [formData, setFormData] = useState({
    salon_name: '',
    contact_name: '',
    phone: '',
  });

  useEffect(() => {
    const success = searchParams.get('success');
    const plan = searchParams.get('plan');
    
    if (success === 'true') {
      toast({
        title: "¡Suscripción activada!",
        description: `Tu plan ${planNames[plan || ''] || plan} ha sido activado correctamente.`,
      });
      navigate('/account', { replace: true });
      checkSubscription();
    }
  }, [searchParams]);

  useEffect(() => {
    fetchSalonData();
    checkSubscription();
    fetchUsageStats();
    checkBiometricCredentials();
  }, [user]);

  const fetchSalonData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('salons')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setSalonData(data);
      setFormData({
        salon_name: data.salon_name,
        contact_name: data.contact_name,
        phone: data.phone || '',
      });
      setSlugInput(data.booking_slug || '');
    }
    setLoading(false);
  };

  const fetchUsageStats = async () => {
    if (!user) return;

    const currentMonth = format(new Date(), 'yyyy-MM-01');

    const { data: salonResult } = await supabase
      .from('salons')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (salonResult?.id) {
      const { data: usageResult } = await supabase
        .from('usage_stats')
        .select('analyses_count, month')
        .eq('salon_id', salonResult.id)
        .eq('month', currentMonth)
        .maybeSingle();

      if (usageResult) {
        setUsageStats(usageResult);
      } else {
        setUsageStats({ analyses_count: 0, month: currentMonth });
      }
    }
  };

  const checkSubscription = async () => {
    if (!user) return;

    setCheckingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setSubscriptionInfo(data);
      fetchSalonData();
    } catch (err) {
      logError('Check subscription error', err);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('salons')
      .update({
        salon_name: formData.salon_name,
        contact_name: formData.contact_name,
        phone: formData.phone || null,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Guardado",
        description: "Los cambios se han guardado correctamente",
      });
      fetchSalonData();
    }
    setSaving(false);
  };

  const handleOpenPortal = async (intent: 'payment_method' | 'billing' | 'cancel' = 'billing') => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No se pudo abrir el portal de cliente');
      }
    } catch (err) {
      logError('Customer portal error', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo abrir el portal de gestión",
        variant: "destructive",
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSaveSlug = async () => {
    if (!user) return;
    const slug = slugInput.trim().toLowerCase();
    if (slug && (slug.length < 3 || !/^[a-z0-9-]+$/.test(slug))) {
      setSlugError('Usa solo letras minúsculas, números y guiones (mínimo 3 caracteres).');
      return;
    }
    setSlugError('');
    setSavingSlug(true);
    const { error } = await supabase
      .from('salons')
      .update({ booking_slug: slug || null })
      .eq('user_id', user.id);
    if (error) {
      if (error.code === '23505') {
        setSlugError('Este enlace ya está en uso, elige otro.');
      } else {
        toast({ title: 'Error', description: 'No se pudo guardar el enlace.', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Enlace guardado', description: slug ? `naiqo.es/reservar/${slug}` : 'Enlace personalizado eliminado.' });
      fetchSalonData();
    }
    setSavingSlug(false);
  };

  const bookingUrl = salonData
    ? `https://naiqo.es/reservar/${salonData.booking_slug || salonData.id}`
    : '';

  const handleCopyBookingUrl = () => {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl).then(() => {
      toast({ title: 'Enlace copiado', description: bookingUrl });
    });
  };

  // ── Quick access helpers ──────────────────────────────────────────────────
  const checkBiometricCredentials = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('webauthn_credentials')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    setHasBiometric((data || []).length > 0);
  };

  const handleSavePin = async () => {
    if (!/^\d{6}$/.test(newPin)) {
      toast({ title: 'PIN inválido', description: 'El PIN debe tener exactamente 6 dígitos.', variant: 'destructive' });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: 'Los PINs no coinciden', description: 'Verifica que los dos campos sean iguales.', variant: 'destructive' });
      return;
    }
    setSavingPin(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-pin-setup', { body: { pin: newPin } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: 'PIN guardado', description: 'Ya puedes entrar con tu PIN desde el escritorio.' });
      setNewPin(''); setConfirmPin('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSavingPin(false);
  };

  const handleRegisterBiometric = async () => {
    if (!user) return;
    setRegisteringBio(true);
    try {
      const { data: startData, error: startErr } = await supabase.functions.invoke('auth-webauthn-register-start', {
        body: { device_name: navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Dispositivo móvil' },
      });
      if (startErr || startData?.error) throw new Error(startData?.error || startErr?.message);

      const attestation = await startRegistration({ optionsJSON: startData.options });

      const { data: finishData, error: finishErr } = await supabase.functions.invoke('auth-webauthn-register-finish', {
        body: { attestation, challenge_id: startData.challenge_id, device_name: startData.device_name },
      });
      if (finishErr || finishData?.error) throw new Error(finishData?.error || finishErr?.message);

      toast({ title: '¡Biométrico activado!', description: 'Ya puedes entrar con Face ID o huella dactilar.' });
      setHasBiometric(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast({ title: 'Cancelado', description: 'La verificación biométrica fue cancelada.' });
      } else {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    }
    setRegisteringBio(false);
  };

  const handleDeleteBiometric = async () => {
    if (!user) return;
    setDeletingBio(true);
    await supabase.from('webauthn_credentials').delete().eq('user_id', user.id);
    setHasBiometric(false);
    toast({ title: 'Biométrico eliminado', description: 'Las credenciales biométricas han sido borradas.' });
    setDeletingBio(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-500">✅ Activa</Badge>;
      case 'trial':
        return <Badge className="bg-blue-500 hover:bg-blue-500">🎁 Prueba</Badge>;
      case 'expired':
        return <Badge variant="destructive">⚠️ Expirado</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDaysUntilReset = () => {
    const today = new Date();
    const endOfThisMonth = endOfMonth(today);
    return differenceInDays(endOfThisMonth, today) + 1;
  };

  const currentPlan = subscriptionInfo?.plan || salonData?.subscription_plan;

  const getUsagePercentage = () => {
    if (!usageStats || !currentPlan) return 0;
    const limit = planLimits[currentPlan];
    if (limit === -1) return 0;
    return Math.min((usageStats.analyses_count / limit) * 100, 100);
  };

  const getUsageLimit = () => {
    if (!currentPlan) return 0;
    const limit = planLimits[currentPlan];
    return limit === -1 ? '∞' : limit;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isSubscribed = subscriptionInfo?.subscribed || salonData?.subscription_status === 'active';

  const accountContent = (
    <div className="space-y-4 p-4">
      {searchParams.get('success') === 'true' && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/30">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700 dark:text-green-300 font-medium text-sm">
              ¡Tu suscripción ha sido activada!
            </span>
          </CardContent>
        </Card>
      )}

      {/* Salon Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Información del Salón</CardTitle>
          <CardDescription className="text-xs">Datos de tu negocio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="salon_name" className="text-sm">Nombre del salón</Label>
            <Input
              id="salon_name"
              value={formData.salon_name}
              onChange={(e) => setFormData(prev => ({ ...prev, salon_name: e.target.value }))}
              className="h-12"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              value={salonData?.email || ''}
              disabled
              className="bg-muted h-12"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="contact_name" className="text-sm">Nombre de contacto</Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
              className="h-12"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="h-12"
            />
          </div>

          <TouchButton onClick={handleSave} disabled={saving} fullWidth>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </TouchButton>
        </CardContent>
      </Card>

      {/* ── Booking Link Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link className="h-4 w-4" />
            Tu enlace de reservas
          </CardTitle>
          <CardDescription className="text-xs">Comparte este enlace para que tus clientes reserven online</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {salonData && (
            <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between gap-2">
              <span className="text-sm font-mono text-primary truncate">{bookingUrl}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopyBookingUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="booking-slug" className="text-sm">Enlace personalizado (opcional)</Label>
            <div className="flex gap-2">
              <div className="flex items-center flex-1 border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring h-12">
                <span className="px-3 text-muted-foreground text-sm bg-muted h-full flex items-center border-r whitespace-nowrap">naiqo.es/reservar/</span>
                <Input
                  id="booking-slug"
                  value={slugInput}
                  onChange={e => { setSlugInput(e.target.value.toLowerCase()); setSlugError(''); }}
                  placeholder="mi-salon"
                  className="border-0 focus-visible:ring-0 h-12 rounded-none"
                />
              </div>
              <TouchButton onClick={handleSaveSlug} disabled={savingSlug}>
                {savingSlug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </TouchButton>
            </div>
            {slugError && <p className="text-xs text-destructive">{slugError}</p>}
            <p className="text-xs text-muted-foreground">Solo letras minúsculas, números y guiones. Mínimo 3 caracteres.</p>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800">
            <Instagram className="h-4 w-4 text-pink-500 shrink-0" />
            <p className="text-xs text-pink-700 dark:text-pink-300">
              Pega este enlace en tu bio de Instagram para que tus clientes reserven directamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Access Card ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {isMobile ? <Fingerprint className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
            Acceso rápido
          </CardTitle>
          <CardDescription className="text-xs">
            {isMobile ? 'Inicia sesión con Face ID o huella dactilar' : 'Inicia sesión con un código PIN de 6 dígitos'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Desktop: PIN setup */}
          {!isMobile && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-pin" className="text-sm">Nuevo PIN (6 dígitos)</Label>
                <Input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-center tracking-widest text-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-pin" className="text-sm">Confirmar PIN</Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-center tracking-widest text-lg"
                />
              </div>
              <TouchButton
                onClick={handleSavePin}
                disabled={savingPin || newPin.length !== 6 || confirmPin.length !== 6}
                fullWidth
              >
                {savingPin ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : 'Guardar PIN'}
              </TouchButton>
            </div>
          )}

          {/* Mobile: WebAuthn / biometric */}
          {isMobile && (
            <div className="space-y-2">
              {hasBiometric ? (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    <span className="text-sm text-green-700 dark:text-green-300 font-medium">Biométrico activado</span>
                  </div>
                  <TouchButton
                    variant="outline"
                    className="text-destructive hover:text-destructive border-destructive/30"
                    onClick={handleDeleteBiometric}
                    disabled={deletingBio}
                    fullWidth
                  >
                    {deletingBio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Eliminar credencial biométrica
                  </TouchButton>
                </>
              ) : (
                <TouchButton
                  onClick={handleRegisterBiometric}
                  disabled={registeringBio}
                  fullWidth
                  className="gap-2"
                >
                  {registeringBio
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando…</>
                    : <><Fingerprint className="h-5 w-5" />Activar Face ID / Huella</>}
                </TouchButton>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Suscripción</CardTitle>
            <CardDescription className="text-xs">Tu plan actual</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkSubscription}
            disabled={checkingSubscription}
            className="h-10 w-10 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${checkingSubscription ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Plan</span>
              <span className="font-semibold text-sm">
                {currentPlan ? `${planNames[currentPlan]} €${planPrices[currentPlan]}/mes` : 'Sin plan'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estado</span>
              {salonData && getStatusBadge(salonData.subscription_status)}
            </div>

            {subscriptionInfo?.subscription_end && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Próximo pago
                </span>
                <span className="font-medium text-sm">
                  {format(new Date(subscriptionInfo.subscription_end), "d MMM yyyy", { locale: es })}
                </span>
              </div>
            )}

            {subscriptionInfo?.payment_method_last4 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Pago
                </span>
                <span className="font-medium text-sm font-mono">
                  •••• {subscriptionInfo.payment_method_last4}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TouchButton 
              variant="outline"
              onClick={() => navigate('/subscribe')}
              fullWidth
            >
              Cambiar plan
            </TouchButton>
            <TouchButton 
              variant="outline"
              onClick={() => handleOpenPortal('payment_method')}
              disabled={openingPortal || !isSubscribed}
              fullWidth
            >
              {openingPortal ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Pago
            </TouchButton>
          </div>

          {isSubscribed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-12"
                >
                  Cancelar suscripción
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    ¿Cancelar suscripción?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Si cancelas tu suscripción:
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Mantendrás acceso hasta el final del período</li>
                      <li>Perderás acceso a funciones premium</li>
                      <li>Tus datos se conservarán 30 días</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mantener</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleOpenPortal('cancel')}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Sí, cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {!isSubscribed && (
            <TouchButton 
              className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
              onClick={() => navigate('/subscribe')}
              fullWidth
            >
              {salonData?.subscription_status === 'expired' ? 'Reactivar' : 'Ver planes'}
            </TouchButton>
          )}
        </CardContent>
      </Card>

      {/* Usage Stats Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Uso Actual
          </CardTitle>
          <CardDescription className="text-xs">Análisis este mes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Análisis</span>
              <span className="font-semibold">
                {usageStats?.analyses_count || 0} / {getUsageLimit()}
              </span>
            </div>
            {currentPlan && planLimits[currentPlan] !== -1 && (
              <Progress value={getUsagePercentage()} className="h-2" />
            )}
            {currentPlan === 'premium' && (
              <p className="text-xs text-green-600">
                ✨ Análisis ilimitados
              </p>
            )}
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Resetea en</span>
            <span className="font-medium">{getDaysUntilReset()} días</span>
          </div>
        </CardContent>
      </Card>

      {/* Billing Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Facturación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <TouchButton 
            variant="outline"
            onClick={() => handleOpenPortal('billing')}
            disabled={openingPortal || !subscriptionInfo?.stripe_customer_id}
            fullWidth
            className="justify-start"
          >
            <Download className="mr-2 h-4 w-4" />
            Descargar facturas
            <ExternalLink className="ml-auto h-3 w-3" />
          </TouchButton>

          {!subscriptionInfo?.stripe_customer_id && (
            <p className="text-xs text-muted-foreground text-center">
              Disponible tras el primer pago
            </p>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardContent className="pt-4">
          <TouchButton 
            variant="outline" 
            className="text-destructive hover:text-destructive"
            onClick={handleLogout}
            fullWidth
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </TouchButton>
        </CardContent>
      </Card>

      {/* Member since */}
      <p className="text-xs text-center text-muted-foreground pb-4">
        Miembro desde {salonData && format(new Date(salonData.created_at), "d 'de' MMMM, yyyy", { locale: es })}
      </p>
    </div>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <MobileLayout title="Mi Cuenta" showBack={true}>
        {accountContent}
      </MobileLayout>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-6">Mi Cuenta</h1>
        {accountContent}
      </main>
      <Footer />
    </div>
  );
};

export default Account;
