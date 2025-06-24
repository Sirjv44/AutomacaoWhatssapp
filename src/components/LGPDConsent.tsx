import React, { useState } from 'react';
import { Shield, AlertTriangle, Check, X } from 'lucide-react';

interface LGPDConsentProps {
  onConsent: (accepted: boolean) => void;
  isVisible: boolean;
}

export const LGPDConsent: React.FC<LGPDConsentProps> = ({ onConsent, isVisible }) => {
  const [accepted, setAccepted] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col">
        {/* Header fixo */}
        <div className="flex items-center space-x-3 p-8 pb-6 border-b border-gray-200">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Consentimento LGPD</h2>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-8 pt-6">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 mb-2">⚠️ Importante - Proteção de Dados</h3>
                  <p className="text-sm text-amber-700">
                    Esta ferramenta processará dados pessoais (nomes e números de telefone) para automação no WhatsApp. 
                    É sua responsabilidade garantir que possui consentimento adequado dos titulares dos dados.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Termos de Uso e Proteção de Dados:</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm text-gray-700">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <p><strong>Finalidade:</strong> Os dados serão utilizados exclusivamente para criação de grupos no WhatsApp conforme sua configuração.</p>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <p><strong>Armazenamento:</strong> Os dados são processados localmente em seu navegador e não são enviados para servidores externos.</p>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <p><strong>Consentimento:</strong> Você declara possuir consentimento válido dos titulares dos dados para o processamento.</p>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <p><strong>Responsabilidade:</strong> O uso desta ferramenta é de sua inteira responsabilidade, devendo respeitar a LGPD e termos do WhatsApp.</p>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <p><strong>Segurança:</strong> Mantenha os dados seguros e delete arquivos temporários após o uso.</p>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <p><strong>Direitos dos Titulares:</strong> Os titulares dos dados têm direito ao acesso, correção, exclusão e portabilidade de seus dados pessoais.</p>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <p><strong>Base Legal:</strong> O processamento é baseado no consentimento dos titulares e no legítimo interesse para comunicação empresarial.</p>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <p><strong>Retenção:</strong> Os dados serão mantidos apenas pelo tempo necessário para a finalidade declarada.</p>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <p><strong>Transferência:</strong> Os dados não serão transferidos para terceiros sem consentimento expresso.</p>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <p><strong>Incidentes:</strong> Qualquer incidente de segurança será comunicado conforme previsto na LGPD.</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">
                    Eu li, compreendi e aceito os termos acima
                  </p>
                  <p className="text-blue-700">
                    Declaro possuir consentimento adequado dos titulares dos dados e assumo total responsabilidade 
                    pelo uso desta ferramenta em conformidade com a LGPD e demais legislações aplicáveis.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer fixo */}
        <div className="p-8 pt-6 border-t border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => onConsent(false)}
              className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-2 transition-all duration-200 font-medium"
            >
              <X className="h-4 w-4" />
              <span>Não Aceito</span>
            </button>
            
            <button
              onClick={() => onConsent(true)}
              disabled={!accepted}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all duration-200 font-medium"
            >
              <Check className="h-4 w-4" />
              <span>Aceito e Prosseguir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};