import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Gift } from 'lucide-react';

const ClienteRegaloExito = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col items-center justify-center px-6 max-w-lg mx-auto text-center">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-9 h-9 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Tarjeta enviada! 🎁</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          El pago se ha procesado correctamente. Hemos enviado la tarjeta regalo al email del destinatario con el código QR para canjearla.
        </p>

        <div className="bg-purple-50 rounded-2xl p-4 mb-6">
          <Gift className="w-6 h-6 text-purple-500 mx-auto mb-2" />
          <p className="text-sm text-purple-700 font-medium">La tarjeta tiene validez de 1 año</p>
          <p className="text-xs text-purple-500 mt-1">El destinatario puede presentar el código QR en el salón</p>
        </div>

        <Button
          onClick={() => navigate('/cliente')}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl py-3 font-semibold"
        >
          Volver al inicio
        </Button>
      </div>
    </div>
  );
};

export default ClienteRegaloExito;
