import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import naiqoLogo from "@/assets/naiqo-logo.png";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogin = () => {
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const handleRegister = () => {
    navigate('/register');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    signOut();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="w-full bg-white/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        {/* Desktop and Mobile Header Row */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo - Always visible */}
          <div 
            className="flex items-center gap-2 cursor-pointer flex-shrink-0" 
            onClick={() => navigate('/')}
          >
            <img src={naiqoLogo} alt="NAIQO" className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              NAIQO
            </h1>
          </div>
          
          {/* Desktop Navigation - Only show on large screens */}
          <nav className="hidden lg:flex items-center gap-6">
            <button 
              onClick={() => scrollToSection('features')}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Funcionalidades
            </button>
            <button 
              onClick={() => scrollToSection('demo-video')}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Demo
            </button>
            <button
              onClick={() => navigate('/subscribe')}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Precios
            </button>
            <button 
              onClick={() => scrollToSection('contact')}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Contacto
            </button>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-primary">
                  Mi Panel
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-primary">
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleLogin} className="text-muted-foreground hover:text-primary">
                  Iniciar Sesión
                </Button>
                <Button size="sm" className="bg-gradient-primary text-white hover:shadow-brand" onClick={handleRegister}>
                  Prueba Gratuita
                </Button>
              </>
            )}
          </div>

          {/* Mobile/Tablet: Compact auth + menu button */}
          <div className="flex lg:hidden items-center gap-2">
            {user ? (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/dashboard')} 
                className="text-primary font-medium text-sm px-2"
              >
                Panel
              </Button>
            ) : (
              <Button 
                size="sm"
                className="bg-gradient-primary text-white text-sm px-3"
                onClick={handleRegister}
              >
                Empezar
              </Button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-foreground" />
              ) : (
                <Menu className="h-5 w-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-border pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-3">
              <button 
                onClick={() => scrollToSection('features')}
                className="text-left text-muted-foreground hover:text-primary transition-colors py-2"
              >
                Funcionalidades
              </button>
              <button 
                onClick={() => scrollToSection('demo-video')}
                className="text-left text-muted-foreground hover:text-primary transition-colors py-2"
              >
                Demo
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/subscribe');
                }}
                className="text-left text-muted-foreground hover:text-primary transition-colors py-2"
              >
                Precios
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="text-left text-muted-foreground hover:text-primary transition-colors py-2"
              >
                Contacto
              </button>
            </nav>
            
            <div className="flex flex-col space-y-2 pt-2">
              {user ? (
                <Button variant="outline" onClick={handleLogout} className="w-full">
                  Cerrar Sesión
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleLogin} className="w-full">
                    Iniciar Sesión
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
