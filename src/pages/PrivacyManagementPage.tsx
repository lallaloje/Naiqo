import React from 'react';
import PrivacyManagement from '@/components/PrivacyManagement';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyManagementPage = () => {
  const navigate = useNavigate();
  return (
    <div>
      <div className="container mx-auto px-4 pt-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 gap-1">
          <ChevronLeft className="w-4 h-4" /> Volver
        </Button>
      </div>
      <PrivacyManagement />
    </div>
  );
};

export default PrivacyManagementPage;