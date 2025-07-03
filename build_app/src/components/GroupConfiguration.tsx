import React from 'react';
import { Users, Settings, Clock, Hash, AlertTriangle } from 'lucide-react';
import { GroupConfig } from '../types';

interface GroupConfigurationProps {
  config: GroupConfig;
  onConfigChange: (config: GroupConfig) => void;
  contactCount: number;
  leadCount: number;
  adminCount: number;
}

export const GroupConfiguration: React.FC<GroupConfigurationProps> = ({
  config,
  onConfigChange,
  contactCount,
  leadCount,
  adminCount,
}) => {
  const estimatedGroups = Math.ceil(contactCount / config.maxMembers);
  const estimatedTime = Math.ceil((contactCount * config.delay) / 60);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Settings className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Configuração dos Grupos</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Nome Base do Grupo
          </label>
          <input
            type="text"
            value={config.baseName}
            onChange={(e) => onConfigChange({ ...config, baseName: e.target.value })}
            placeholder="Ex: Grupo de Leads"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          <p className="text-xs text-gray-500">
            Grupos múltiplos serão numerados automaticamente (ex: "Grupo de Leads 1", "Grupo de Leads 2")
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Máximo de Membros por Grupo
          </label>
          <input
            type="number"
            min="5"
            max="256"
            value={config.maxMembers}
            onChange={(e) => onConfigChange({ ...config, maxMembers: parseInt(e.target.value) || 50 })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          <p className="text-xs text-gray-500">
            WhatsApp permite até 256 membros por grupo (recomendado: 50-100)
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Delay Entre Ações (segundos)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            step="0.5"
            value={config.delay}
            onChange={(e) => onConfigChange({ ...config, delay: parseFloat(e.target.value) || 2 })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          <p className="text-xs text-gray-500">
            Tempo de espera entre ações para simular comportamento humano
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={config.createMultiple}
              onChange={(e) => onConfigChange({ ...config, createMultiple: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Criar múltiplos grupos se necessário
              </span>
              <p className="text-xs text-gray-500">
                Dividir contatos em grupos separados quando exceder o limite
              </p>
            </div>
          </label>
        </div>
      </div>

      {contactCount > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center space-x-2 mb-4">
            <Hash className="h-5 w-5 text-blue-600" />
            <span>Resumo da Configuração</span>
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
              <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900">{contactCount}</div>
              <div className="text-xs text-gray-600">Total Contatos</div>
            </div>
            
            <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
              <Hash className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900">{estimatedGroups}</div>
              <div className="text-xs text-gray-600">Grupo(s) Estimado(s)</div>
            </div>
            
            <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
              <Clock className="h-6 w-6 text-amber-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900">{estimatedTime}</div>
              <div className="text-xs text-gray-600">Min. Estimados</div>
            </div>
            
            <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
              <Settings className="h-6 w-6 text-purple-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900">{adminCount}</div>
              <div className="text-xs text-gray-600">Administradores</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="font-medium text-gray-900 mb-1">Distribuição por Grupo:</div>
              <div className="text-gray-600">
                {estimatedGroups > 1 ? (
                  <>
                    {estimatedGroups - 1} grupo(s) com {config.maxMembers} membros<br />
                    1 grupo com {contactCount % config.maxMembers || config.maxMembers} membros
                  </>
                ) : (
                  `1 grupo com ${contactCount} membros`
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="font-medium text-gray-900 mb-1">Tipos de Contato:</div>
              <div className="text-gray-600">
                {leadCount} leads<br />
                {adminCount} administradores
              </div>
            </div>
          </div>

          {contactCount > config.maxMembers && !config.createMultiple && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Atenção: Limite de membros excedido
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Você tem {contactCount} contatos, mas o limite por grupo é {config.maxMembers}. 
                    Habilite "Criar múltiplos grupos" para processar todos os contatos, ou apenas os primeiros {config.maxMembers} serão adicionados.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};