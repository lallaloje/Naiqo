import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Download, 
  Trash2, 
  Eye, 
  Lock, 
  FileText, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Key,
  Database,
  UserCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

interface PrivacySettings {
  data_processing_consent: boolean;
  marketing_consent: boolean;
  analytics_consent: boolean;
  third_party_sharing: boolean;
  data_retention_period: string;
  encryption_enabled: boolean;
  local_processing_only: boolean;
  auto_delete_enabled: boolean;
  notification_preferences: {
    privacy_updates: boolean;
    security_alerts: boolean;
    data_usage_reports: boolean;
  };
}

interface PrivacyReport {
  privacy_summary: {
    total_data_records: number;
    analyses_count: number;
    appointments_count: number;
    conversations_count: number;
    encryption_status: string;
    last_export: string | null;
    last_settings_update: string | null;
  };
  privacy_settings: PrivacySettings;
  recent_activities: Array<{
    event_type: string;
    created_at: string;
    metadata: any;
  }>;
  compliance_status: {
    gdpr_compliant: boolean;
    data_encrypted: boolean;
    consent_documented: boolean;
    retention_policy_active: boolean;
  };
}

const PrivacyManagement = () => {
  const { user } = useAuth();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [privacyReport, setPrivacyReport] = useState<PrivacyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);

  useEffect(() => {
    if (user) {
      loadPrivacyData();
    }
  }, [user]);

  const loadPrivacyData = async () => {
    setIsLoading(true);
    try {
      // Load privacy settings
      const { data: settingsData, error: settingsError } = await supabase.functions.invoke('privacy-management', {
        body: { action: 'getPrivacySettings', userId: user?.id }
      });

      if (settingsError) throw settingsError;
      setPrivacySettings(settingsData);

      // Load privacy report
      const { data: reportData, error: reportError } = await supabase.functions.invoke('privacy-management', {
        body: { action: 'getPrivacyReport', userId: user?.id }
      });

      if (reportError) throw reportError;
      setPrivacyReport(reportData);

    } catch (error) {
      logError('PrivacyManagement:loadPrivacyData', error);
      toast.error('Error al cargar datos de privacidad');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrivacySetting = async (key: string, value: any) => {
    if (!privacySettings) return;

    const updatedSettings = {
      ...privacySettings,
      [key]: value
    };

    try {
      const { data, error } = await supabase.functions.invoke('privacy-management', {
        body: { 
          action: 'updatePrivacySettings', 
          userId: user?.id, 
          data: { [key]: value }
        }
      });

      if (error) throw error;

      setPrivacySettings(updatedSettings);
      toast.success('Configuración actualizada');
    } catch (error) {
      logError('PrivacyManagement:updatePrivacySetting', error);
      toast.error('Error al actualizar configuración');
    }
  };

  const exportData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('privacy-management', {
        body: { action: 'getDataExport', userId: user?.id }
      });

      if (error) throw error;

      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `naiqo-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Datos exportados exitosamente');
    } catch (error) {
      logError('PrivacyManagement:exportData', error);
      toast.error('Error al exportar datos');
    }
  };

  const deleteData = async (type: string) => {
    const confirmMessage = type === 'all' 
      ? '¿Estás seguro de que quieres eliminar TODOS tus datos? Esta acción no se puede deshacer.'
      : `¿Estás seguro de que quieres eliminar tus datos de ${type}?`;

    if (!confirm(confirmMessage)) return;

    setIsDeletingData(true);
    try {
      const { data, error } = await supabase.functions.invoke('privacy-management', {
        body: { action: 'deleteUserData', userId: user?.id, data: { type } }
      });

      if (error) throw error;

      toast.success(`Datos de ${type} eliminados exitosamente`);
      loadPrivacyData(); // Reload to update counts
    } catch (error) {
      logError('PrivacyManagement:deleteData', error);
      toast.error('Error al eliminar datos');
    } finally {
      setIsDeletingData(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Debes iniciar sesión para acceder a la gestión de privacidad.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando configuración de privacidad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Privacidad Garantizada</h1>
          <p className="text-muted-foreground">
            Control total sobre tus datos personales y configuración de privacidad
          </p>
        </div>
      </div>

      {/* Compliance Status */}
      {privacyReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Estado de Cumplimiento RGPD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={privacyReport.compliance_status.gdpr_compliant ? 'default' : 'destructive'}>
                  {privacyReport.compliance_status.gdpr_compliant ? 'Cumple' : 'No cumple'}
                </Badge>
                <span className="text-sm">RGPD</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={privacyReport.compliance_status.data_encrypted ? 'default' : 'destructive'}>
                  {privacyReport.compliance_status.data_encrypted ? 'Cifrado' : 'Sin cifrar'}
                </Badge>
                <span className="text-sm">Datos</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={privacyReport.compliance_status.consent_documented ? 'default' : 'destructive'}>
                  {privacyReport.compliance_status.consent_documented ? 'Documentado' : 'Pendiente'}
                </Badge>
                <span className="text-sm">Consentimiento</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={privacyReport.compliance_status.retention_policy_active ? 'default' : 'destructive'}>
                  {privacyReport.compliance_status.retention_policy_active ? 'Activa' : 'Inactiva'}
                </Badge>
                <span className="text-sm">Retención</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Configuración</TabsTrigger>
          <TabsTrigger value="data">Mis Datos</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
          <TabsTrigger value="delete">Eliminar</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {privacySettings && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Consentimientos</CardTitle>
                  <CardDescription>
                    Gestiona tus consentimientos para el procesamiento de datos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-base font-medium">Procesamiento de datos</label>
                      <p className="text-sm text-muted-foreground">
                        Permite el procesamiento básico para funcionalidades del servicio
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.data_processing_consent}
                      onCheckedChange={(checked) => updatePrivacySetting('data_processing_consent', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-base font-medium">Marketing</label>
                      <p className="text-sm text-muted-foreground">
                        Recibir comunicaciones promocionales y ofertas especiales
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.marketing_consent}
                      onCheckedChange={(checked) => updatePrivacySetting('marketing_consent', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-base font-medium">Analytics</label>
                      <p className="text-sm text-muted-foreground">
                        Ayúdanos a mejorar el servicio con datos de uso anónimos
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.analytics_consent}
                      onCheckedChange={(checked) => updatePrivacySetting('analytics_consent', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-base font-medium">Compartir con terceros</label>
                      <p className="text-sm text-muted-foreground">
                        Permitir compartir datos con socios de confianza
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.third_party_sharing}
                      onCheckedChange={(checked) => updatePrivacySetting('third_party_sharing', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Seguridad</CardTitle>
                  <CardDescription>
                    Opciones avanzadas de privacidad y seguridad
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-base font-medium">Cifrado habilitado</label>
                      <p className="text-sm text-muted-foreground">
                        Todos los datos se almacenan cifrados
                      </p>
                    </div>
                    <Badge variant="default">
                      <Lock className="h-3 w-3 mr-1" />
                      Activo
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-base font-medium">Procesamiento solo local</label>
                      <p className="text-sm text-muted-foreground">
                        Procesar imágenes únicamente en tu dispositivo
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.local_processing_only}
                      onCheckedChange={(checked) => updatePrivacySetting('local_processing_only', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-base font-medium">Auto-eliminación</label>
                      <p className="text-sm text-muted-foreground">
                        Eliminar automáticamente datos antiguos
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.auto_delete_enabled}
                      onCheckedChange={(checked) => updatePrivacySetting('auto_delete_enabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          {privacyReport && (
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Datos</CardTitle>
                <CardDescription>
                  Información sobre los datos almacenados en tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{privacyReport.privacy_summary.total_data_records}</div>
                    <div className="text-sm text-muted-foreground">Total registros</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Eye className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{privacyReport.privacy_summary.analyses_count}</div>
                    <div className="text-sm text-muted-foreground">Análisis ungueales</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{privacyReport.privacy_summary.appointments_count}</div>
                    <div className="text-sm text-muted-foreground">Citas programadas</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Último export:</span>
                    <span className="text-muted-foreground">
                      {privacyReport.privacy_summary.last_export 
                        ? new Date(privacyReport.privacy_summary.last_export).toLocaleDateString()
                        : 'Nunca'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Última actualización:</span>
                    <span className="text-muted-foreground">
                      {privacyReport.privacy_summary.last_settings_update
                        ? new Date(privacyReport.privacy_summary.last_settings_update).toLocaleDateString()
                        : 'Nunca'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Estado de cifrado:</span>
                    <Badge variant="default">
                      <Lock className="h-3 w-3 mr-1" />
                      {privacyReport.privacy_summary.encryption_status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Datos Personales</CardTitle>
              <CardDescription>
                Descarga una copia completa de todos tus datos (RGPD Art. 20)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  El export incluirá todos tus datos personales: perfil, análisis ungueales, 
                  citas, conversaciones y recomendaciones. Los datos se exportan en formato JSON.
                </AlertDescription>
              </Alert>
              
              <Button onClick={exportData} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Descargar Mis Datos
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delete" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Eliminar Datos</CardTitle>
              <CardDescription>
                Elimina categorías específicas de datos o todos tus datos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atención:</strong> La eliminación de datos es permanente y no se puede deshacer. 
                  Te recomendamos exportar tus datos antes de eliminarlos.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => deleteData('analyses')}
                  disabled={isDeletingData}
                  className="w-full justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Análisis Ungueales
                </Button>

                <Button
                  variant="outline"
                  onClick={() => deleteData('appointments')}
                  disabled={isDeletingData}
                  className="w-full justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Citas
                </Button>

                <Button
                  variant="outline"
                  onClick={() => deleteData('conversations')}
                  disabled={isDeletingData}
                  className="w-full justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Conversaciones
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => deleteData('all')}
                  disabled={isDeletingData}
                  className="w-full justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeletingData ? 'Eliminando...' : 'Eliminar TODOS los Datos'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrivacyManagement;