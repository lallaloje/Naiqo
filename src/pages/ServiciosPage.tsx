import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileLayout } from '@/components/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Clock, Euro, Scissors, Tag } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  category: string | null;
  active: boolean;
}

const CATEGORIES = ['Uñas', 'Cejas y Depilación', 'Láser por Zonas', 'Packs Láser', 'Otros'];

const DEFAULTS = [
  { name: 'Manicura clásica',        duration_minutes: 45,  price: 20, category: 'Manicura' },
  { name: 'Manicura semipermanente', duration_minutes: 60,  price: 30, category: 'Manicura' },
  { name: 'Uñas de gel',             duration_minutes: 90,  price: 45, category: 'Manicura' },
  { name: 'Uñas acrílicas',          duration_minutes: 120, price: 55, category: 'Manicura' },
  { name: 'Pedicura clásica',        duration_minutes: 60,  price: 35, category: 'Pedicura' },
  { name: 'Nail art',                duration_minutes: 30,  price: 15, category: 'Nail Art' },
  { name: 'Tratamiento hidratación', duration_minutes: 30,  price: 20, category: 'Tratamientos' },
  { name: 'Extensiones de uñas',     duration_minutes: 120, price: 60, category: 'Manicura' },
];

const empty = () => ({ name: '', description: '', duration_minutes: 60, price: '', category: '', active: true });

export default function ServiciosPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salonId, setSalonId] = useState<string | null>(null);

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: salon } = await supabase.from('salons').select('id').eq('user_id', user!.id).maybeSingle();
    setSalonId(salon?.id ?? null);
    const { data } = await supabase.from('services').select('*').eq('user_id', user!.id).order('name');
    setServices(data || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(empty());
    setShowDialog(true);
  };

  const openEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({ name: s.name, description: s.description ?? '', duration_minutes: s.duration_minutes, price: s.price?.toString() ?? '', category: s.category ?? '', active: s.active });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        duration_minutes: Number(form.duration_minutes),
        price: form.price ? Number(form.price) : null,
        category: form.category || null,
        active: form.active,
        user_id: user!.id,
        salon_id: salonId,
      };
      if (editingId) {
        const { error } = await supabase.from('services').update(payload as any).eq('id', editingId);
        if (error) throw error;
        toast.success('Servicio actualizado');
      } else {
        const { error } = await supabase.from('services').insert(payload as any);
        if (error) throw error;
        toast.success('Servicio creado');
      }
      setShowDialog(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el servicio "${name}"?`)) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        toast.error('No se puede eliminar: tiene citas asociadas. Desactívalo en su lugar.');
      } else {
        toast.error(error.message || 'Error al eliminar');
      }
      return;
    }
    toast.success('Servicio eliminado');
    loadData();
  };

  const handleToggleActive = async (s: Service) => {
    await supabase.from('services').update({ active: !s.active } as any).eq('id', s.id);
    setServices(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x));
  };

  const importDefaults = async () => {
    if (!confirm('¿Importar los servicios predeterminados? Se añadirán a los que ya tienes.')) return;
    setSaving(true);
    try {
      const inserts = DEFAULTS.map(d => ({ ...d, user_id: user!.id, salon_id: salonId, active: true }));
      const { error } = await supabase.from('services').insert(inserts as any);
      if (error) throw error;
      toast.success('Servicios importados');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Error al importar');
    } finally { setSaving(false); }
  };

  const allCategories = [
    ...CATEGORIES,
    ...Array.from(new Set(services.map(s => s.category).filter(Boolean) as string[]))
      .filter(c => !CATEGORIES.includes(c)),
  ];
  const byCategory = allCategories.reduce<Record<string, Service[]>>((acc, cat) => {
    acc[cat] = services.filter(s => s.category === cat);
    return acc;
  }, {});
  const uncategorized = services.filter(s => !s.category);

  const content = (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Servicios</h1>
          <p className="text-sm text-muted-foreground">{services.length} servicios configurados</p>
        </div>
        <div className="flex gap-2">
          {services.length === 0 && (
            <Button variant="outline" size="sm" onClick={importDefaults} disabled={saving}>
              Importar predeterminados
            </Button>
          )}
          <Button size="sm" onClick={openNew} className="gap-1">
            <Plus className="w-4 h-4" /> Nuevo servicio
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Scissors className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Todavía no hay servicios</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button onClick={importDefaults} variant="outline" disabled={saving}>
                Importar servicios predeterminados
              </Button>
              <Button onClick={openNew}>Crear el primero</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...allCategories, 'Sin categoría'].map(cat => {
            const list = cat === 'Sin categoría' ? uncategorized : (byCategory[cat] || []);
            if (list.length === 0) return null;
            return (
              <div key={cat} className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> {cat}
                </h2>
                {list.map(s => (
                  <Card key={s.id} className={`transition-opacity ${s.active ? '' : 'opacity-50'}`}>
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{s.name}</span>
                          {!s.active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                        </div>
                        {s.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes} min</span>
                          {s.price != null && <span className="flex items-center gap-1 text-green-600 font-medium"><Euro className="w-3 h-3" />{s.price}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={s.active} onCheckedChange={() => handleToggleActive(s)} />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id, s.name)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Manicura semipermanente" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duración (min) *</Label>
                <Input type="number" min={5} step={5} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Precio (€)</Label>
                <Input type="number" min={0} step={0.5} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Descripción opcional..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>Servicio activo (visible en reservas)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isMobile) {
    return <MobileLayout title="Servicios" showBack>{content}</MobileLayout>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">{content}</main>
      <Footer />
    </div>
  );
}
