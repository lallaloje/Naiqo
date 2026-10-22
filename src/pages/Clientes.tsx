import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MobileLayout } from '@/components/MobileLayout';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Phone, Mail, Calendar, Euro,
  Scissors, Users, TrendingUp, Clock, Pencil, Check, X, ChevronLeft, Trash2, UserPlus,
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Types ─────────────────────────────────────────────────────────────
interface RawApt {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  start_time: string;
  status: string;
  services: { name: string; price: number | null } | null;
}

interface Client {
  key: string; // phone or name (dedup key)
  name: string;
  phone: string | null;
  email: string | null;
  totalApts: number;
  completedApts: number;
  cancelledApts: number;
  totalSpent: number;
  lastVisit: string;
  firstVisit: string;
  appointments: RawApt[];
  tags?: string | null;
  importedFrom?: string | null;
  importedId?: string | null;
}

interface ImportedClient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tags: string | null;
  total_visits: number;
  no_shows: number;
  first_visit: string | null;
  last_visit: string | null;
  total_spent: number;
  imported_from: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-orange-100 text-orange-700',
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', scheduled: 'Programada',
  confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada',
};

// ── Helpers ───────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function aggregateClients(apts: RawApt[]): Client[] {
  const map = new Map<string, Client>();

  for (const apt of apts) {
    const key = apt.client_phone?.trim() || apt.client_name.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        key,
        name:          apt.client_name,
        phone:         apt.client_phone || null,
        email:         apt.client_email || null,
        totalApts:     0,
        completedApts: 0,
        cancelledApts: 0,
        totalSpent:    0,
        lastVisit:     apt.start_time,
        firstVisit:    apt.start_time,
        appointments:  [],
      });
    }
    const c = map.get(key)!;
    c.totalApts++;
    if (['completed', 'confirmed'].includes(apt.status)) {
      c.completedApts++;
      c.totalSpent += apt.services?.price || 0;
    }
    if (apt.status === 'cancelled') c.cancelledApts++;
    if (apt.start_time > c.lastVisit)  c.lastVisit  = apt.start_time;
    if (apt.start_time < c.firstVisit) c.firstVisit = apt.start_time;
    c.appointments.push(apt);
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

// ── Client Detail Sheet ───────────────────────────────────────────────
function ClientDetail({ client, open, onClose, onUpdate }: {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const prevClientRef = useRef<Client | null>(null);
  useEffect(() => {
    if (client && client !== prevClientRef.current) {
      prevClientRef.current = client;
      setEditing(false);
      setEditName(client.name || '');
      setEditPhone(client.phone || '');
      setEditEmail(client.email || '');
    }
  }, [client]);

  if (!client) return null;

  const sorted = [...client.appointments].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a "${client.name}" de tu lista de clientes? Sus citas históricas se mantendrán.`)) return;
    setSaving(true);
    try {
      if (client.importedId) {
        const { error } = await (supabase as any).from('salon_clients').delete().eq('id', client.importedId);
        if (error) throw error;
      }
      toast({ title: '🗑️ Cliente eliminado' });
      onClose();
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user!.id;
      if (client.importedId) {
        const { error } = await (supabase as any).from('salon_clients').update({
          name: editName.trim() || client.name,
          phone: editPhone.trim() || null,
          email: editEmail.trim() || null,
        }).eq('id', client.importedId);
        if (error) throw error;
      }
      if (client.appointments.length > 0) {
        const { error } = await supabase.from('appointments').update({
          client_name: (editName.trim() || client.name) as any,
          client_phone: (editPhone.trim() || null) as any,
          client_email: (editEmail.trim() || null) as any,
        } as any).eq('client_name', client.name).eq('user_id', userId);
        if (error) throw error;
      }
      toast({ title: '✅ Datos guardados' });
      setEditing(false);
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          {/* Avatar + nombre */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {getInitials(client.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-left text-lg">{client.name}</SheetTitle>
                <button
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setEditing(v => !v)}
                  title="Editar contacto"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  onClick={handleDelete}
                  title="Eliminar cliente"
                  disabled={saving}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {!editing && (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {client.phone ? (
                    <a href={`tel:${client.phone}`} className="text-sm text-primary flex items-center gap-1">
                      <Phone className="w-3 h-3" />{client.phone}
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin teléfono</p>
                  )}
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />{client.email}
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin email</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Edit form */}
          {editing && (
            <div className="mt-3 space-y-2 bg-muted/40 rounded-xl p-3">
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Nombre completo"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleSave} disabled={saving}>
                  <Check className="w-3.5 h-3.5 mr-1" />{saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditing(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{client.totalApts}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Citas totales</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">€{client.totalSpent}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total gastado</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{client.cancelledApts}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Canceladas</p>
          </div>
        </div>

        {/* Tags (Booksy groups) */}
        {client.tags && (
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full text-[10px]">
              {client.tags.split(',')[0].trim()}
            </span>
          </p>
        )}

        {/* Historial */}
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Historial de citas
        </p>
        <div className="space-y-2 pb-6">
          {sorted.length > 0 ? sorted.map(apt => (
            <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
              <div className="text-center shrink-0 w-14">
                <p className="text-xs font-bold">
                  {format(new Date(apt.start_time), 'd MMM', { locale: es })}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(apt.start_time), 'HH:mm')}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                {apt.services && (
                  <p className="text-sm font-medium flex items-center gap-1 truncate">
                    <Scissors className="w-3 h-3 shrink-0 text-primary" />
                    {(apt.services as any).name}
                  </p>
                )}
                {(apt.services as any)?.price && (
                  <p className="text-xs text-muted-foreground">€{(apt.services as any).price}</p>
                )}
              </div>
              <Badge className={`text-[10px] shrink-0 ${STATUS_COLOR[apt.status] || ''}`}>
                {STATUS_LABEL[apt.status] || apt.status}
              </Badge>
            </div>
          )) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              {client.importedFrom === 'booksy' ? (
                <p>Historial importado de Booksy — {client.totalApts} visita{client.totalApts !== 1 ? 's' : ''}</p>
              ) : (
                <p>Sin citas registradas</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function Clientes() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<Client | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [showDifusion, setShowDifusion] = useState(false);
  const [difusionMsg, setDifusionMsg] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: '', phone: '', email: '' });
  const [savingNew, setSavingNew] = useState(false);
  const [salonId, setSalonId] = useState<string | null>(null);
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  const handleCreateClient = async () => {
    if (!newClientForm.name.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return; }
    if (!user) return;
    setSavingNew(true);
    try {
      const { error } = await (supabase as any).from('salon_clients').insert({
        user_id: user.id,
        salon_id: salonId,
        name: newClientForm.name.trim(),
        phone: newClientForm.phone.trim() || null,
        email: newClientForm.email.trim() || null,
        imported_from: 'manual',
      });
      if (error) throw error;
      toast({ title: '✅ Cliente añadido' });
      setShowNewClient(false);
      setNewClientForm({ name: '', phone: '', email: '' });
      fetchClients();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSavingNew(false);
    }
  };

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch appointments and imported clients in parallel
      const [aptsResult, importedResult] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, client_name, client_phone, client_email, start_time, status, services(name, price)')
          .eq('user_id', user.id)
          .order('start_time', { ascending: false }),
        (supabase as any)
          .from('salon_clients')
          .select('id, name, phone, email, tags, total_visits, no_shows, first_visit, last_visit, total_spent, imported_from')
          .eq('user_id', user.id),
      ]);

      if (aptsResult.error) throw aptsResult.error;

      const fromApts = aggregateClients((aptsResult.data as any[]) || []);
      const imported: ImportedClient[] = importedResult.data || [];

      // Merge: imported clients not already in appointments list
      const aptKeys = new Map(fromApts.map(c => [c.name.toLowerCase().trim(), c]));
      const merged: Client[] = fromApts.map(c => {
        const ic = imported.find(i => i.name.toLowerCase().trim() === c.name.toLowerCase().trim());
        return ic ? { ...c, importedId: ic.id } : c;
      });

      for (const ic of imported) {
        const nameKey = ic.name.toLowerCase().trim();
        if (!aptKeys.has(nameKey)) {
          merged.push({
            key: ic.id,
            name: ic.name,
            phone: ic.phone,
            email: ic.email,
            totalApts: ic.total_visits,
            completedApts: ic.total_visits,
            cancelledApts: ic.no_shows,
            totalSpent: ic.total_spent || 0,
            lastVisit: ic.last_visit || ic.first_visit || new Date().toISOString(),
            firstVisit: ic.first_visit || new Date().toISOString(),
            appointments: [],
            tags: ic.tags,
            importedFrom: ic.imported_from,
            importedId: ic.id,
          });
        }
      }

      merged.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      setClients(merged);
    } catch (err) {
      console.error('Clientes error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClients();
    if (user) {
      supabase.from('salons').select('id').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setSalonId(data.id);
            const url = `https://app.naiqo.es`;
            setDifusionMsg(`¡Hola! 👋\n\nTe presento NAIQO, la app para reservar citas en salones de belleza de forma fácil y rápida 💅\n\nAquí tienes el enlace:\n\n${url}\n\nBusca tu salón favorito y reserva en segundos. Para tenerla siempre a mano, puedes añadirla a la pantalla de inicio de tu móvil:\n\n📱 *iPhone:* Abre el enlace en Safari → toca el botón compartir (cuadrado con flecha) → "Añadir a pantalla de inicio"\n\n🤖 *Android:* Abre el enlace en Chrome → toca los tres puntos del menú → "Añadir a pantalla de inicio"\n\nAsí la tendrás como una app sin necesidad de descargar nada. ¡Cualquier duda me dices! 😊`);
          }
        });
    }
  }, [fetchClients, user]);

  // ── Filtered list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  // ── Grouped by letter ────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, Client[]>();
    for (const c of filtered) {
      const letter = c.name[0]?.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '') || '#';
      const key = /[A-Z]/.test(letter) ? letter : '#';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'es'));
  }, [filtered]);

  const availableLetters = useMemo(() => grouped.map(([l]) => l), [grouped]);

  const scrollToLetter = useCallback((letter: string) => {
    const el = letterRefs.current[letter];
    if (el && listRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setActiveLetter(letter);
    setTimeout(() => setActiveLetter(null), 800);
  }, []);

  // ── Global stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const newThisMonth = clients.filter(
      c => new Date(c.firstVisit) >= monthStart
    ).length;
    const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0);
    return { total: clients.length, newThisMonth, totalRevenue };
  }, [clients]);

  // ── Loading skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  const content = (
    <div className="space-y-4 p-4">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Users className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{stats.newThisMonth}</p>
            <p className="text-[10px] text-muted-foreground">Nuevas este mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Euro className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">€{stats.totalRevenue}</p>
            <p className="text-[10px] text-muted-foreground">Total facturado</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + New client */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button size="icon" onClick={() => setShowNewClient(true)} title="Añadir cliente">
          <UserPlus className="w-4 h-4" />
        </Button>
      </div>

      {/* Difusión */}
      <div>
        <button
          onClick={() => setShowDifusion(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📣</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-primary">Mensaje de difusión</p>
              <p className="text-xs text-muted-foreground">{clients.filter(c => c.phone).length} clientes con teléfono</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{showDifusion ? '▲' : '▼'}</span>
        </button>

        {showDifusion && (
          <div className="mt-2 p-4 bg-card border rounded-xl space-y-3">
            {/* Message editor */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Mensaje (editable)</label>
              <textarea
                value={difusionMsg}
                onChange={e => setDifusionMsg(e.target.value)}
                rows={10}
                className="w-full text-xs border rounded-lg p-3 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Copy all numbers */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                const nums = clients.filter(c => c.phone).map(c => c.phone).join('\n');
                navigator.clipboard.writeText(nums);
                toast({ title: '✅ Números copiados', description: `${clients.filter(c => c.phone).length} números en el portapapeles` });
              }}
            >
              📋 Copiar todos los números
            </Button>

            {/* Copy message */}
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                navigator.clipboard.writeText(difusionMsg);
                toast({ title: '✅ Mensaje copiado', description: 'Pégalo en WhatsApp como difusión' });
              }}
            >
              💬 Copiar mensaje
            </Button>

            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Para enviarlo a todas a la vez: copia los números → abre WhatsApp → Nueva difusión → añade los números → pega el mensaje.
            </p>

            {/* Individual send buttons */}
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">O envía una a una:</p>
              {clients.filter(c => c.phone).map(c => (
                <div key={c.key} className="flex items-center justify-between gap-2">
                  <span className="text-sm truncate flex-1">{c.name}</span>
                  <a
                    href={`https://wa.me/${c.phone!.replace(/[\s\-()]/g, '')}?text=${encodeURIComponent(difusionMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Client list + alpha index */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {search ? 'No hay clientes con esa búsqueda' : 'Aún no hay clientes registrados'}
          </p>
          {search && (
            <button className="text-xs text-primary mt-2 underline" onClick={() => setSearch('')}>
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="relative flex gap-0">
          {/* List */}
          <div ref={listRef} className="flex-1 min-w-0 space-y-0 pr-6">
            {grouped.map(([letter, clients]) => (
              <div key={letter}>
                {/* Letter header */}
                <div
                  ref={el => { letterRefs.current[letter] = el; }}
                  className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm px-2 py-1 mb-1 mt-2 rounded-lg"
                >
                  <span className="text-xs font-bold text-primary">{letter}</span>
                </div>
                {/* Clients in this letter */}
                <div className="space-y-2 mb-1">
                  {clients.map(client => (
                    <div
                      key={client.key}
                      onClick={() => setSelected(client)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {getInitials(client.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {client.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Phone className="w-3 h-3" />{client.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {client.totalApts} cita{client.totalApts !== 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {format(new Date(client.lastVisit), "d MMM yy", { locale: es })}
                          </span>
                          {client.totalSpent > 0 && (
                            <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                              <Euro className="w-3 h-3" />{client.totalSpent}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        {client.importedFrom === 'booksy' && (
                          <Badge className="text-[9px] bg-orange-50 text-orange-600 border-0">Booksy</Badge>
                        )}
                        {client.totalApts >= 5 && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-0">⭐ Fiel</Badge>
                        )}
                        {client.totalApts === 1 && !client.importedFrom && (
                          <Badge className="text-[10px] bg-blue-50 text-blue-600 border-0">Nueva</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-center text-xs text-muted-foreground pt-2 pb-4">
              {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
              {search ? ` encontrado${filtered.length !== 1 ? 's' : ''}` : ' en total'}
            </p>
          </div>

          {/* Alpha sidebar */}
          {!search && (
            <div className="sticky top-4 self-start z-20 flex flex-col items-center gap-0.5 select-none max-h-[80vh] overflow-y-auto scrollbar-none">
              {availableLetters.map(letter => (
                <button
                  key={letter}
                  onPointerDown={() => scrollToLetter(letter)}
                  className={`w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center transition-colors leading-none
                    ${activeLetter === letter ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10'}`}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {isMobile ? (
        <MobileLayout title="Clientes" showBack={true} onRefresh={fetchClients}>
          {content}
        </MobileLayout>
      ) : (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8 max-w-4xl">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 gap-1 mb-2">
              <ChevronLeft className="w-4 h-4" /> Volver
            </Button>
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Clientes
            </h1>
            {content}
          </main>
          <Footer />
        </div>
      )}

      <ClientDetail
        client={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onUpdate={fetchClients}
      />

      {/* New client sheet */}
      <Sheet open={showNewClient} onOpenChange={setShowNewClient}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Nuevo cliente
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                placeholder="Nombre completo"
                value={newClientForm.name}
                onChange={e => setNewClientForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                placeholder="Ej. 600 000 000"
                type="tel"
                value={newClientForm.phone}
                onChange={e => setNewClientForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                placeholder="correo@ejemplo.com"
                type="email"
                value={newClientForm.email}
                onChange={e => setNewClientForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter className="mt-6 flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowNewClient(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleCreateClient} disabled={savingNew}>
              {savingNew ? 'Guardando...' : 'Añadir cliente'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
