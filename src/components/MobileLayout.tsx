import { ReactNode, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileNavigation } from './MobileNavigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  showHeader?: boolean;
  onRefresh?: () => Promise<void>;
  stickyBottom?: ReactNode;
}

export function MobileLayout({
  children,
  title,
  showBack = true,
  showHeader = true,
  onRefresh,
  stickyBottom,
}: MobileLayoutProps) {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleBack = () => {
    navigate(-1);
  };

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0 && onRefresh) {
      startY.current = e.touches[0].clientY;
    }
  }, [onRefresh]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!onRefresh || scrollRef.current?.scrollTop !== 0) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && diff < 150) {
      setPullDistance(diff);
    }
  }, [onRefresh]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 80 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pullDistance, onRefresh, isRefreshing]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
          <div className="flex items-center h-14 px-4">
            {showBack && (
              <button
                onClick={handleBack}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 rounded-full active:bg-muted transition-colors"
                aria-label="Volver"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            {title && (
              <h1 className="text-lg font-semibold flex-1 truncate">
                {title}
              </h1>
            )}
          </div>
        </header>
      )}

      {/* Pull-to-refresh indicator */}
      {onRefresh && (
        <div 
          className={cn(
            "flex items-center justify-center transition-all overflow-hidden",
            pullDistance > 0 ? "opacity-100" : "opacity-0"
          )}
          style={{ height: pullDistance * 0.5 }}
        >
          <RefreshCw 
            className={cn(
              "w-6 h-6 text-primary transition-transform",
              isRefreshing && "animate-spin",
              pullDistance > 80 && "text-primary"
            )}
            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
          />
        </div>
      )}

      {/* Main Content */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto pb-20"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </main>

      {/* Sticky Bottom Action */}
      {stickyBottom && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent md:hidden">
          {stickyBottom}
        </div>
      )}

      {/* Bottom Navigation */}
      <MobileNavigation />
    </div>
  );
}
