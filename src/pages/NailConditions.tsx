import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { logError } from '@/lib/logger';

interface NailCondition {
  id: string;
  name: string;
  synonyms: string[];
  category: string;
  short_definition: string;
}

const NailConditions = () => {
  const [conditions, setConditions] = useState<NailCondition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConditions();
  }, []);

  const fetchConditions = async () => {
    try {
      const { data, error } = await supabase
        .from('nail_conditions')
        .select('id, name, synonyms, category, short_definition')
        .order('name');

      if (error) throw error;
      setConditions(data || []);
    } catch (error) {
      logError('NailConditions:fetchConditions', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: 'Todas' },
    { value: 'infectious', label: 'Infecciosas' },
    { value: 'inflammatory', label: 'Inflamatorias' },
    { value: 'traumatic', label: 'Traumáticas' },
    { value: 'neoplastic', label: 'Neoplásicas' },
    { value: 'systemic', label: 'Sistémicas' },
    { value: 'genetic', label: 'Genéticas' },
    { value: 'other', label: 'Otras' }
  ];

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      infectious: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      inflammatory: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      traumatic: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      neoplastic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      systemic: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      genetic: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[category] || colors.other;
  };

  const filteredConditions = conditions.filter(condition => {
    const matchesSearch = condition.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      condition.synonyms?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || condition.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Base de Conocimientos: Afecciones Ungueales</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Información clínica completa sobre las principales afecciones ungueales con galerías de imágenes y referencias científicas.
            </p>
          </div>

          <div className="mb-6 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre o sinónimo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
              {categories.map(cat => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-32 bg-muted" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredConditions.map(condition => (
                <Link key={condition.id} to={`/nail-conditions/${condition.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-xl">{condition.name}</CardTitle>
                        <Badge className={getCategoryBadgeColor(condition.category)}>
                          {categories.find(c => c.value === condition.category)?.label}
                        </Badge>
                      </div>
                      {condition.synonyms && condition.synonyms.length > 0 && (
                        <CardDescription className="text-xs italic">
                          {condition.synonyms.join(', ')}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {condition.short_definition}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {!loading && filteredConditions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No se encontraron afecciones que coincidan con tu búsqueda.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NailConditions;
