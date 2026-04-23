import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DemoSalon {
  id: string;
  salon_name: string;
  contact_name: string;
  email: string;
  subscription_status: string;
  subscription_plan: string;
  trial_ends_at: string;
  onboarding_completed: boolean;
}

interface DemoAnalysis {
  id: string;
  client_name: string;
  created_at: string;
  image_url: string;
  diagnosis: {
    condition: string;
    severity: string;
    confidence: number;
  };
  recommendations: string[];
}

interface DemoAppointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string;
  end_time: string;
  service_name: string;
  status: string;
}

interface DemoClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
  lastVisit: string;
}

interface DemoContextType {
  isDemoMode: boolean;
  activateDemo: (key: string) => boolean;
  deactivateDemo: () => void;
  resetDemo: () => void;
  demoSalon: DemoSalon;
  demoAnalyses: DemoAnalysis[];
  demoAppointments: DemoAppointment[];
  demoClients: DemoClient[];
  addDemoAnalysis: (analysis: Partial<DemoAnalysis>) => DemoAnalysis;
  getDemoAnalysisResult: () => {
    condition: string;
    severity: string;
    confidence: number;
    recommendations: string[];
    healthScore: number;
  };
}

const DEMO_SECRET_KEY = 'naiqo-demo-2024';
const DEMO_DURATION_HOURS = 24;

const generateDemoData = () => {
  const now = new Date();
  const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  
  const demoSalon: DemoSalon = {
    id: 'demo-salon-001',
    salon_name: 'Salón Bella Nails (DEMO)',
    contact_name: 'María García',
    email: 'demo@naiqo.es',
    subscription_status: 'active',
    subscription_plan: 'premium',
    trial_ends_at: fiveDaysLater.toISOString(),
    onboarding_completed: true,
  };

  const conditions = [
    'Uñas saludables',
    'Deshidratación leve',
    'Onicomicosis temprana',
    'Líneas de Beau',
    'Leuconiquia puntata',
    'Onicorrexis',
  ];

  const severities = ['bajo', 'medio', 'alto'];
  
  const recommendations = [
    ['Mantener hidratación', 'Usar aceite de cutícula diario', 'Evitar productos químicos agresivos'],
    ['Aplicar tratamiento fortalecedor', 'Dieta rica en biotina', 'Evitar uñas artificiales temporalmente'],
    ['Consultar dermatólogo', 'Tratamiento antifúngico tópico', 'Mantener uñas cortas y limpias'],
    ['Hidratación intensiva', 'Suplemento de queratina', 'Masaje de cutícula semanal'],
  ];

  const clientNames = [
    'Ana López', 'Carmen Ruiz', 'Laura Martínez', 'Isabel Fernández', 
    'Patricia Sánchez', 'Elena García', 'Marta Rodríguez', 'Lucía Díaz',
    'Rosa Jiménez', 'Cristina Moreno'
  ];

  const demoAnalyses: DemoAnalysis[] = Array.from({ length: 20 }, (_, i) => {
    const daysAgo = Math.floor(i / 3);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const conditionIndex = Math.floor(Math.random() * conditions.length);
    
    return {
      id: `demo-analysis-${i + 1}`,
      client_name: clientNames[i % clientNames.length],
      created_at: date.toISOString(),
      image_url: `https://images.unsplash.com/photo-${1600000000000 + i}?w=200&h=200&fit=crop`,
      diagnosis: {
        condition: conditions[conditionIndex],
        severity: severities[Math.floor(Math.random() * severities.length)],
        confidence: 75 + Math.floor(Math.random() * 20),
      },
      recommendations: recommendations[conditionIndex % recommendations.length],
    };
  });

  const services = ['Manicura clásica', 'Pedicura spa', 'Uñas de gel', 'Nail art', 'Tratamiento fortalecedor'];
  
  const demoAppointments: DemoAppointment[] = [
    ...Array.from({ length: 5 }, (_, i) => {
      const today = new Date();
      today.setHours(9 + i * 2, 0, 0, 0);
      const endTime = new Date(today.getTime() + 60 * 60 * 1000);
      
      return {
        id: `demo-apt-today-${i + 1}`,
        client_name: clientNames[i],
        client_email: `${clientNames[i].toLowerCase().replace(' ', '.')}@email.com`,
        client_phone: `+34 6${Math.floor(10000000 + Math.random() * 90000000)}`,
        start_time: today.toISOString(),
        end_time: endTime.toISOString(),
        service_name: services[i % services.length],
        status: i < 2 ? 'completed' : 'scheduled',
      };
    }),
    ...Array.from({ length: 3 }, (_, i) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10 + i * 2, 0, 0, 0);
      const endTime = new Date(tomorrow.getTime() + 60 * 60 * 1000);
      
      return {
        id: `demo-apt-tomorrow-${i + 1}`,
        client_name: clientNames[5 + i],
        client_email: `${clientNames[5 + i].toLowerCase().replace(' ', '.')}@email.com`,
        client_phone: `+34 6${Math.floor(10000000 + Math.random() * 90000000)}`,
        start_time: tomorrow.toISOString(),
        end_time: endTime.toISOString(),
        service_name: services[(i + 2) % services.length],
        status: 'scheduled',
      };
    }),
  ];

  const demoClients: DemoClient[] = clientNames.map((name, i) => ({
    id: `demo-client-${i + 1}`,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
    phone: `+34 6${Math.floor(10000000 + Math.random() * 90000000)}`,
    visits: 3 + Math.floor(Math.random() * 15),
    lastVisit: new Date(now.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
  }));

  return { demoSalon, demoAnalyses, demoAppointments, demoClients };
};

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoData, setDemoData] = useState(generateDemoData());

  useEffect(() => {
    // Check for demo mode in URL
    const urlParams = new URLSearchParams(window.location.search);
    const demoKey = urlParams.get('demo');
    
    if (demoKey) {
      activateDemo(demoKey);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // Check sessionStorage for existing demo session
      const demoSession = sessionStorage.getItem('naiqo_demo_session');
      if (demoSession) {
        const session = JSON.parse(demoSession);
        const expiresAt = new Date(session.expiresAt);
        if (expiresAt > new Date()) {
          setIsDemoMode(true);
          if (session.data) {
            setDemoData(session.data);
          }
        } else {
          sessionStorage.removeItem('naiqo_demo_session');
        }
      }
    }
  }, []);

  const activateDemo = (key: string): boolean => {
    if (key === DEMO_SECRET_KEY) {
      const expiresAt = new Date(Date.now() + DEMO_DURATION_HOURS * 60 * 60 * 1000);
      const newData = generateDemoData();
      
      sessionStorage.setItem('naiqo_demo_session', JSON.stringify({
        active: true,
        expiresAt: expiresAt.toISOString(),
        data: newData,
      }));
      
      setDemoData(newData);
      setIsDemoMode(true);
      return true;
    }
    return false;
  };

  const deactivateDemo = () => {
    sessionStorage.removeItem('naiqo_demo_session');
    setIsDemoMode(false);
  };

  const resetDemo = () => {
    const newData = generateDemoData();
    setDemoData(newData);
    
    const session = sessionStorage.getItem('naiqo_demo_session');
    if (session) {
      const parsed = JSON.parse(session);
      sessionStorage.setItem('naiqo_demo_session', JSON.stringify({
        ...parsed,
        data: newData,
      }));
    }
  };

  const addDemoAnalysis = (analysis: Partial<DemoAnalysis>): DemoAnalysis => {
    const newAnalysis: DemoAnalysis = {
      id: `demo-analysis-${Date.now()}`,
      client_name: analysis.client_name || 'Cliente Demo',
      created_at: new Date().toISOString(),
      image_url: analysis.image_url || '',
      diagnosis: analysis.diagnosis || {
        condition: 'Uñas saludables',
        severity: 'bajo',
        confidence: 85,
      },
      recommendations: analysis.recommendations || ['Mantener hidratación'],
    };

    setDemoData(prev => ({
      ...prev,
      demoAnalyses: [newAnalysis, ...prev.demoAnalyses],
    }));

    return newAnalysis;
  };

  const getDemoAnalysisResult = () => {
    const conditions = [
      { condition: 'Uñas saludables', severity: 'bajo', healthScore: 92 },
      { condition: 'Deshidratación leve', severity: 'bajo', healthScore: 78 },
      { condition: 'Onicomicosis temprana', severity: 'medio', healthScore: 65 },
      { condition: 'Líneas de Beau', severity: 'bajo', healthScore: 82 },
      { condition: 'Leuconiquia puntata', severity: 'bajo', healthScore: 88 },
    ];
    
    const recommendations = [
      'Aplicar aceite de cutícula diariamente',
      'Mantener las uñas hidratadas',
      'Usar guantes para tareas domésticas',
      'Dieta rica en biotina y zinc',
      'Evitar productos químicos agresivos',
    ];
    
    const selected = conditions[Math.floor(Math.random() * conditions.length)];
    const shuffledRecs = [...recommendations].sort(() => Math.random() - 0.5).slice(0, 3);
    
    return {
      ...selected,
      confidence: 80 + Math.floor(Math.random() * 15),
      recommendations: shuffledRecs,
    };
  };

  return (
    <DemoContext.Provider value={{
      isDemoMode,
      activateDemo,
      deactivateDemo,
      resetDemo,
      demoSalon: demoData.demoSalon,
      demoAnalyses: demoData.demoAnalyses,
      demoAppointments: demoData.demoAppointments,
      demoClients: demoData.demoClients,
      addDemoAnalysis,
      getDemoAnalysisResult,
    }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemoMode = (): DemoContextType => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoProvider');
  }
  return context;
};
