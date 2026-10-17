import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Search, Phone, Mail, Calendar, Euro,
  Scissors, Users, TrendingUp, Clock,
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

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
  );
}

// ── Client Detail Sheet ───────────────────────────────────────────────
function ClientDetail({ client, open, onClose }: {
  client: Client | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!client) return null;

  const sorted = [...client.appointments].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          {/* Avatar + nombre */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {getInitials(client.name)}
            </div>
            <div>
              <SheetTitle className="text-left text-lg">{client.name}</SheetTitle>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="text-sm text-primary flex items-center gap-1">
                    <Phone className="w-3 h-3" />{client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />{client.email}
                  </a>
                )}
              </div>
            </div>
          </div>
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

  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<Client | null>(null);

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
      const aptKeys = new Set(fromApts.map(c => c.name.toLowerCase().trim()));
      const merged: Client[] = [...fromApts];

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
          });
        }
      }

      merged.sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
      setClients(merged);
    } catch (err) {
      console.error('Clientes error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {search ? 'No hay clientes con esa búsqueda' : 'Aún no hay clientes registrados'}
          </p>
          {search && (
            <button
              className="text-xs text-primary mt-2 underline"
              onClick={() => setSearch('')}
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(client => (
            <div
              key={client.key}
              onClick={() => setSelected(client)}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all active:scale-[0.99]"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {getInitials(client.name)}
              </div>

              {/* Info */}
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

              {/* Badges */}
              <div className="flex flex-col gap-1 items-end shrink-0">
                {client.importedFrom === 'booksy' && (
                  <Badge className="text-[9px] bg-orange-50 text-orange-600 border-0">
                    Booksy
                  </Badge>
                )}
                {client.totalApts >= 5 && (
                  <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                    ⭐ Fiel
                  </Badge>
                )}
                {client.totalApts === 1 && !client.importedFrom && (
                  <Badge className="text-[10px] bg-blue-50 text-blue-600 border-0">
                    Nueva
                  </Badge>
                )}
              </div>
            </div>
          ))}

          <p className="text-center text-xs text-muted-foreground pt-2">
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
            {search ? ` encontrado${filtered.length !== 1 ? 's' : ''}` : ' en total'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {isMobile ? (
        <MobileLayout title="Clientes" showBack={false} onRefresh={fetchClients}>
          {content}
        </MobileLayout>
      ) : (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8 max-w-4xl">
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
      />
    </>
  );
}
