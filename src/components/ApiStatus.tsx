import React from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { useApiHealth } from '../hooks/useApi';

export const ApiStatus: React.FC = () => {
  const { isConnected, isChecking } = useApiHealth();

  if (isChecking) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
          <div>
            <h3 className="font-medium text-yellow-800">Verificando Conexão</h3>
            <p className="text-yellow-700 text-sm">Conectando com o backend...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <WifiOff className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="font-medium text-red-800">Backend Desconectado</h3>
            <p className="text-red-700 text-sm mb-2">
              Não foi possível conectar com o servidor Python.
            </p>
            <div className="bg-red-100 rounded p-3 text-sm text-red-800">
              <p className="font-medium mb-1">Para resolver:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Navegue até a pasta <code className="bg-red-200 px-1 rounded">backend/</code></li>
                <li>Execute: <code className="bg-red-200 px-1 rounded">pip install -r requirements.txt</code></li>
                <li>Execute: <code className="bg-red-200 px-1 rounded">python app.py</code></li>
                <li>Aguarde a mensagem "Running on http://localhost:5000"</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3">
        <CheckCircle className="h-6 w-6 text-green-600" />
        <div>
          <h3 className="font-medium text-green-800">Backend Conectado</h3>
          <p className="text-green-700 text-sm">
            Servidor Python funcionando corretamente. Pronto para automação!
          </p>
        </div>
      </div>
    </div>
  );
};