import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Key, BarChart2, RefreshCw, CheckCircle, Clock, XCircle, Search, Shield } from "lucide-react";

interface Salon {
  id: string;
  name: string;
  email: string | null;
  subscription_status: string;
  trial_ends_at: string;
  created_at: string;
  user_id: string;
}

interface BetaCode {
  id: string;
  code: string;
  salon_name: string | null;
  used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:  'bg-green-100 text-green-800 border-green-300',
  beta:    'bg-indigo-100 text-indigo-800 border-indigo-300',
  trial:   'bg-yellow-100 text-yellow-800 border-yellow-300',
  expired: 'bg-red-100 text-red-800 border-red-300',
  pending: 'bg-gray-100 text-gray-800 border-gray-300',
};

const STATUS_OPTIONS = ['active', 'beta', 'trial', 'expired', 'pending'];

export default function AdminPanel() {
  const [salons,    setSalons]    = useState<Salon[]>([]);
  const [codes,     setCodes]     = useState<BetaCode[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [newCode,   setNewCode]   = useState('');
  const [newCodeSalon, setNewCodeSalon] = useState('');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from('salons').select('*').order('created_at', { ascending: false }),
      supabase.from('beta_codes').select('*').order('created_at', { ascending: false }),
    ]);
    setSalons((s as Salon[]) || []);
    setCodes((c as BetaCode[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (salonId: string, status: string) => {
    const extra = status === 'active'
      ? { trial_ends_at: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString() }
      : status === 'beta'
        ? { trial_ends_at: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString() }
        : {};
    const { error } = await supabase.from('salons').update({ subscription_status: status, ...extra }).eq('id', salonId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Estado actualizado' });
    load();
  };

  const addCode = async () => {
    if (!newCode.trim()) return;
    const { error } = await supabase.from('beta_codes').insert({ code: newCode.trim().toUpperCase(), salon_name: newCodeSalon || null });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `✅ Código ${newCode.toUpperCase()} creado` });
    setNewCode(''); setNewCodeSalon(''); load();
  };

  const deleteCode = async (id: string, used: boolean) => {
    if (used && !confirm('Este código ya fue usado. ¿Eliminar igualmente?')) return;
    await supabase.from('beta_codes').delete().eq('id', id);
    toast({ title: 'Código eliminado' });
    load();
  };

  const resetCode = async (id: string) => {
    await supabase.from('beta_codes').update({ used: false, used_by: null, used_at: null }).eq('id', id);
    toast({ title: 'Código restablecido' });
    load();
  };

  // Stats
  const stats = {
    total:   salons.length,
    active:  salons.filter(s => s.subscription_status === 'active').length,
    beta:    salons.filter(s => s.subscription_status === 'beta').length,
    expired: salons.filter(s => s.subscription_status === 'expired').length,
    codesLeft: codes.filter(c => !c.used).length,
  };

  const filtered = salons.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Panel de Administración</h1>
          <p className="text-xs text-muted-foreground">Control total de Naiqo</p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Salones totales', value: stats.total,    icon: Users,        color: 'text-blue-600'   },
          { label: 'Activos',         value: stats.active,   icon: CheckCircle,  color: 'text-green-600'  },
          { label: 'Beta',            value: stats.beta,     icon: Clock,        color: 'text-indigo-600' },
          { label: 'Expirados',       value: stats.expired,  icon: XCircle,      color: 'text-red-500'    },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex flex-col gap-1">
              <Icon className={`w-5 h-5 ${color}`} />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Salones */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" /> Salones registrados
            </CardTitle>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-8 h-8 text-sm w-48"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay salones</p>
          ) : (
            <div className="divide-y">
              {filtered.map(salon => {
                const daysLeft = Math.ceil((new Date(salon.trial_ends_at).getTime() - Date.now()) / 86400000);
                return (
                  <div key={salon.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{salon.name || '(sin nombre)'}</p>
                      <p className="text-xs text-muted-foreground truncate">{salon.email || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        Registrado {formatDate(salon.created_at)}
                        {salon.subscription_status !== 'active' && daysLeft > 0 && (
                          <span className="ml-2 text-amber-600">· {daysLeft}d restantes</span>
                        )}
                        {salon.subscription_status !== 'active' && daysLeft <= 0 && (
                          <span className="ml-2 text-red-500">· expirado</span>
                        )}
                      </p>
                    </div>
                    <Badge className={`border text-xs shrink-0 ${STATUS_COLORS[salon.subscription_status] || 'bg-gray-100 text-gray-700'}`}>
                      {salon.subscription_status}
                    </Badge>
                    <Select value={salon.subscription_status} onValueChange={v => updateStatus(salon.id, v)}>
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Beta codes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            Códigos beta
            <Badge variant="outline" className="ml-auto text-xs">{stats.codesLeft} disponibles</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Crear nuevo código */}
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="NAIQO-BETA-XXXX" className="h-8 text-sm flex-1 min-w-32"
              value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} />
            <Input placeholder="Nombre del salón (opcional)" className="h-8 text-sm flex-1 min-w-40"
              value={newCodeSalon} onChange={e => setNewCodeSalon(e.target.value)} />
            <Button size="sm" className="h-8" onClick={addCode}>Crear código</Button>
          </div>

          {/* Lista de códigos */}
          <div className="divide-y rounded-lg border overflow-hidden">
            {codes.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2 flex-wrap text-sm">
                <code className={`font-mono text-xs font-semibold flex-1 min-w-0 truncate ${c.used ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {c.code}
                </code>
                {c.salon_name && (
                  <span className="text-xs text-muted-foreground truncate hidden sm:block">{c.salon_name}</span>
                )}
                {c.used ? (
                  <>
                    <Badge className="text-xs bg-gray-100 text-gray-600 border-gray-300 border shrink-0">Usado</Badge>
                    {c.used_at && <span className="text-xs text-muted-foreground shrink-0">{formatDate(c.used_at)}</span>}
                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2 shrink-0 text-amber-600 hover:text-amber-700"
                      onClick={() => resetCode(c.id)}>Restablecer</Button>
                  </>
                ) : (
                  <Badge className="text-xs bg-green-100 text-green-700 border-green-300 border shrink-0">Disponible</Badge>
                )}
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-red-500"
                  onClick={() => deleteCode(c.id, c.used)}>✕</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
