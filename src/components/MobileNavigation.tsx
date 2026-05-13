import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Camera, MessageCircle, Calendar, MoreHorizontal, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Inicio' },
  { path: '/gestion-citas', icon: Calendar, label: 'Citas' },
  { path: '/equipo', icon: Users, label: 'Equipo' },
  { path: '/asistente-chat', icon: MessageCircle, label: 'Chat' },
];

const moreItems = [
  { path: '/analisis-ungueal', label: 'Análisis' },
  { path: '/recomendador-tratamientos', label: 'Tratamientos' },
  { path: '/prediccion-demanda', label: 'Predicción' },
  { path: '/nail-conditions', label: 'Condiciones' },
  { path: '/gestion-privacidad', label: 'Privacidad' },
  { path: '/account', label: 'Mi Cuenta' },
  { path: '/planes', label: 'Planes' },
];

export function MobileNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isMoreActive = moreItems.some(item => location.pathname === item.path);

  const handleNavigate = (path: string) => {
    navigate(path);
    setMoreOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    setMoreOpen(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 px-3 rounded-xl transition-all active:scale-95",
              isActive(item.path)
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn(
              "w-6 h-6 mb-0.5",
              isActive(item.path) && "stroke-[2.5px]"
            )} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}

        {/* More Menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 px-3 rounded-xl transition-all active:scale-95",
                isMoreActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className={cn(
                "w-6 h-6 mb-0.5",
                isMoreActive && "stroke-[2.5px]"
              )} />
              <span className="text-[10px] font-medium">Más</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle>Más opciones</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 pb-6">
              {moreItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "outline"}
                  className="h-14 text-base"
                  onClick={() => handleNavigate(item.path)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <Button 
              variant="ghost" 
              className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              Cerrar Sesión
            </Button>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
