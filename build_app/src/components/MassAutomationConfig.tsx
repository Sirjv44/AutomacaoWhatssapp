import React from 'react';
import { Users, Settings, Clock, Hash, AlertTriangle, Crown, Target, Zap } from 'lucide-react';
import { GroupConfig, MassAutomationStats } from '../types';

interface MassAutomationConfigProps {
  config: GroupConfig;
  onConfigChange: (config: GroupConfig) => void;
  stats: MassAutomationStats;
}

export const MassAutomationConfig: React.FC<MassAutomationConfigProps> = ({
  config,
  onConfigChange,
  stats,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Settings className="h-5 w-5 text-purple-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Configuração da Automação em Massa</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Nome Base dos Grupos
          </label>
          <input
            type="text"
            value={config.baseName}
            onChange={(e) => onConfigChange({ ...config, baseName: e.target.value })}
            placeholder="Ex: Grupo VIP"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          />
          <p className="text-xs text-gray-500">
            Grupos serão numerados automaticamente: "Grupo VIP 1", "Grupo VIP 2", etc.
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          />
          <p className="text-xs text-gray-500">
            Tempo de espera entre ações para evitar bloqueios (recomendado: 2-3 segundos)
          </p>
        </div>
      </div>

      {stats.totalContacts > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
          <h3 className="font-semibold text-purple-900 flex items-center space-x-2 mb-6">
            <Zap className="h-5 w-5 text-purple-600" />
            <span>Estatísticas da Automação em Massa</span>
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center border border-purple-200 shadow-sm">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalContacts.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Total Contatos</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center border border-purple-200 shadow-sm">
              <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalLeads.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Leads</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center border border-purple-200 shadow-sm">
              <Crown className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalAdmins}</div>
              <div className="text-xs text-gray-600">Administradores</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center border border-purple-200 shadow-sm">
              <Hash className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.estimatedGroups}</div>
              <div className="text-xs text-gray-600">Grupos a Criar</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-gray-900">Tempo Estimado</span>
              </div>
              <div className="text-2xl font-bold text-amber-600 mb-1">{stats.estimatedTime}</div>
              <p className="text-sm text-gray-600">
                Baseado em {config.delay}s de delay por ação
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">Distribuição</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• {stats.estimatedGroups - 1} grupos com 999 membros</p>
                <p>• 1 grupo com {stats.totalLeads % 999 || 999} membros</p>
                <p>• Admins em todos os grupos</p>
              </div>
            </div>
          </div>

          {stats.batchGroups.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-purple-900 mb-3">Preview dos Primeiros Grupos:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {stats.batchGroups.slice(0, 6).map((group, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-purple-200 text-sm">
                    <div className="font-medium text-gray-900 mb-1">{group.groupName}</div>
                    <div className="text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Leads:</span>
                        <span className="font-medium">{group.leads.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Admins:</span>
                        <span className="font-medium">{group.admins.length}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span>Total:</span>
                        <span className="font-bold">{group.totalMembers}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {stats.batchGroups.length > 6 && (
                  <div className="bg-gray-100 rounded-lg p-3 border border-gray-200 text-sm flex items-center justify-center">
                    <span className="text-gray-600">
                      +{stats.batchGroups.length - 6} grupos adicionais
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {stats.totalContacts > 10000 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-2">⚠️ Automação de Grande Escala</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• <strong>Mais de 10.000 contatos detectados</strong> - Processo pode levar várias horas</li>
                <li>• <strong>Recomendação:</strong> Execute em horários de menor uso do WhatsApp</li>
                <li>• <strong>Monitoramento:</strong> Acompanhe os logs para detectar possíveis bloqueios</li>
                <li>• <strong>Backup:</strong> Mantenha backup dos contatos antes de iniciar</li>
                <li>• <strong>Teste:</strong> Considere testar com uma amostra menor primeiro</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};