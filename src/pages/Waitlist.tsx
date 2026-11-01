import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MobileLayout } from '@/components/MobileLayout';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Clock, Phone, Mail, Scissors, Bell, BellOff, Plus, Trash2, Calendar,
  UserPlus, CheckCircle2, X,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Service {
  id: string;
  name: string;
}

interface WaitlistEntry {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  service_id: string | null;
  preferred_date: string | null;
  notes: string | null;
  status: 'waiting' | 'notified' | 'booked' | 'cancelled';
  notified_at: string | null;
  created_at: string;
  services?: { name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  waiting: 'En espera',
  notified: 'Avisada',
  booked: 'Reservó',
  cancelled: 'Cancelada',
};
const STATUS_COLOR: Record<string, string> = {
  waiting: 'bg-amber-100 text-amber-700',
  notified: 'bg-blue-100 text-blue-700',
  booked: 'bg-green-100 text-green-700',
  cancelled: 'bg-muted text-muted-foreground',
};

const EMPTY_FORM = {
  client_name: '',
  client_phone: '',
  client_email: '',
  service_id: '',
  preferred_date: '',
  notes: '',
};

function WaitlistContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [notifying, setNotifying] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: w }, { data: s }] = await Promise.all([
      (supabase as any)
        .from('waitlist')
        .select('*, services(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false }),
      supabase.from('services').select('id, name').eq('user_id' as any, user!.id).eq('active' as any, true).order('name'),
    ]);
    setEntries(w || []);
    setServices((s as any) || []);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim()) return;
    setSaving(true);
    const { error } = await (supabase as any).from('waitlist').insert({
      user_id: user!.id,
      client_name: form.client_name.trim(),
      client_phone: form.client_phone.trim() || null,
      client_email: form.client_email.trim() || null,
      service_id: form.service_id || null,
      preferred_date: form.preferred_date || null,
      notes: form.notes.trim() || null,
      status: 'waiting',
    });
    setSaving(false);
    if (error) { toast({ title: 'Error al guardar', variant: 'destructive' }); return; }
    toast({ title: '✅ Añadida a la lista de espera' });
    setForm(EMPTY_FORM);
    setShowForm(false);
    loadData();
  };

  const handleNotify = async (entry: WaitlistEntry) => {
    if (!entry.client_phone && !entry.client_email) {
      toast({ title: 'Sin datos de contacto', description: 'Esta clienta no tiene teléfono ni email.', variant: 'destructive' });
      return;
    }
    setNotifying(entry.id);
    try {
      if (entry.client_phone) {
        const msg = `Hola ${entry.client_name} 😊\n\nTe escribimos desde el salón porque se ha liberado un hueco${entry.services?.name ? ` para ${entry.services.name}` : ''}.\n\n¡Escríbenos para reservar! 💅`;
        window.open(`https://wa.me/${entry.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      }
      if (entry.client_email) {
        await (supabase as any).functions.invoke('send-email', {
          body: {
            type: 'waitlist_notify',
            to: entry.client_email,
            data: {
              clientName: entry.client_name,
              serviceName: entry.services?.name || '',
            },
          },
        });
      }
      await (supabase as any).from('waitlist').update({ status: 'notified', notified_at: new Date().toISOString() }).eq('id', entry.id);
      toast({ title: `📲 ${entry.client_name} avisada` });
      loadData();
    } finally {
      setNotifying(null);
    }
  };

  const handleStatus = async (id: string, status: WaitlistEntry['status']) => {
    await (supabase as any).from('waitlist').update({ status }).eq('id', id);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta entrada?')) return;
    await (supabase as any).from('waitlist').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const visible = filter === 'active'
    ? entries.filter(e => e.status === 'waiting' || e.status === 'notified')
    : entries;

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Lista de espera</h1>
          <p className="text-sm text-muted-foreground">
            {entries.filter(e => e.status === 'waiting').length} esperando
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <UserPlus className="w-4 h-4" /> Añadir
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['active', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
              filter === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f === 'active' ? 'Activas' : 'Todas'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Cargando...</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-14 space-y-2">
          <Clock className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {filter === 'active' ? 'Nadie en lista de espera ahora mismo.' : 'Sin entradas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(entry => (
            <div key={entry.id} className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{entry.client_name}</p>
                  {entry.services && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Scissors className="w-3 h-3" />{entry.services.name}
                    </p>
                  )}
                  {entry.preferred_date && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Prefiere: {format(new Date(entry.preferred_date + 'T12:00'), "d MMM yyyy", { locale: es })}
                    </p>
                  )}
                  <div className="flex gap-3 mt-1">
                    {entry.client_phone && (
                      <a href={`tel:${entry.client_phone}`} className="text-xs text-primary flex items-center gap-1">
                        <Phone className="w-3 h-3" />{entry.client_phone}
                      </a>
                    )}
                    {entry.client_email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />{entry.client_email}
                      </span>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground italic mt-1">"{entry.notes}"</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Añadida {format(new Date(entry.created_at), "d MMM · HH:mm", { locale: es })}
                    {entry.notified_at && ` · Avisada ${format(new Date(entry.notified_at), "d MMM", { locale: es })}`}
                  </p>
                </div>
                <Badge className={`text-[10px] shrink-0 ${STATUS_COLOR[entry.status]}`}>
                  {STATUS_LABEL[entry.status]}
                </Badge>
              </div>

              {/* Actions */}
              {(entry.status === 'waiting' || entry.status === 'notified') && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={() => handleNotify(entry)}
                    disabled={notifying === entry.id}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {notifying === entry.id ? 'Avisando...' : 'Avisar hueco'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => handleStatus(entry.id, 'booked')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Reservó
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form sheet */}
      <Sheet open={showForm} onOpenChange={v => !v && setShowForm(false)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Añadir a lista de espera</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <Label className="text-xs">Nombre *</Label>
              <Input
                value={form.client_name}
                onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                placeholder="Nombre de la clienta"
                className="h-9 text-sm"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Teléfono</Label>
              <Input
                type="tel"
                value={form.client_phone}
                onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))}
                placeholder="+34 600 000 000"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={form.client_email}
                onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))}
                placeholder="cliente@email.com"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Servicio</Label>
              <select
                value={form.service_id}
                onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}
                className="w-full h-9 text-sm border rounded-md px-3 bg-background"
              >
                <option value="">Cualquier servicio</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Fecha preferida</Label>
              <Input
                type="date"
                value={form.preferred_date}
                onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ej: Prefiere tarde, urgente..."
                className="h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2 pb-4">
              <Button type="submit" className="flex-1" disabled={saving}>
                <Plus className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Añadir'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function WaitlistPage() {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <MobileLayout title="Lista de espera" showBack={true}>
        <WaitlistContent />
      </MobileLayout>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="pt-20">
        <WaitlistContent />
      </main>
      <Footer />
    </div>
  );
}
