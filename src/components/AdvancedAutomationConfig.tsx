import React from 'react';
import { Settings, Clock, MessageSquare, Calendar, Shuffle, Zap, AlertTriangle, Shield, Pause, Users, Crown } from 'lucide-react';
import { GroupConfig, AdvancedAutomationStats } from '../types';

interface AdvancedAutomationConfigProps {
  config: GroupConfig;
  onConfigChange: (config: GroupConfig) => void;
  stats: AdvancedAutomationStats;
}

export const AdvancedAutomationConfig: React.FC<AdvancedAutomationConfigProps> = ({
  config,
  onConfigChange,
  stats,
}) => {
  const handleScheduleToggle = (enabled: boolean) => {
    onConfigChange({
      ...config,
      enableScheduling: enabled,
      scheduledDate: enabled ? new Date().toISOString().split('T')[0] : undefined,
      scheduledTime: enabled ? '09:00' : undefined
    });
  };

  const handleBanPreventionToggle = (enabled: boolean) => {
    onConfigChange({
      ...config,
      enableBanPrevention: enabled,
      maxGroupsPerSession: enabled ? 3 : 10, // Limite seguro de 3 grupos por sessão
      groupDelay: enabled ? { min: 120, max: 300 } : { min: 5, max: 15 }, // 2-5 minutos entre grupos
      delay: enabled ? { min: 8, max: 18 } : { min: 2, max: 6 } // 8-18s entre contatos
    });
  };

  // Força limites seguros
  const safeConfig = {
    ...config,
    maxMembers: Math.min(config.maxMembers, 50), // Máximo 50 contatos por grupo
    delay: {
      min: Math.max(config.delay.min, 8), // Mínimo 8s entre contatos
      max: Math.max(config.delay.max, 18) // Máximo 18s entre contatos
    },
    groupDelay: {
      min: Math.max(config.groupDelay?.min || 120, 120), // Mínimo 2 minutos entre grupos
      max: Math.max(config.groupDelay?.max || 300, 300) // Máximo 5 minutos entre grupos
    },
    maxGroupsPerSession: Math.min(config.maxGroupsPerSession, 3) // Máximo 3 grupos por sessão
  };

  // Calcula estatísticas com limites seguros
  const safeStats = {
    ...stats,
    estimatedGroups: Math.min(stats.estimatedGroups, 5), // Máximo 5 grupos total
    totalLeads: Math.min(stats.totalLeads, 250), // Máximo 250 leads (5 grupos x 50)
    estimatedSessions: Math.ceil(Math.min(stats.estimatedGroups, 5) / 3) // Sessões baseadas no limite
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-red-100 rounded-lg">
          <Shield className="h-5 w-5 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Configuração com Proteção Anti-Ban GARANTIDA</h2>
      </div>

      {/* Alerta de Proteção Anti-Ban */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6 border border-red-200">
        <div className="flex items-start space-x-3">
          <Shield className="h-6 w-6 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800 mb-2">🛡️ PROTEÇÃO ANTI-BAN ATIVADA</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-red-700">
              <div>
                <p className="font-medium mb-1">Limites Seguros Aplicados:</p>
                <ul className="space-y-1">
                  <li>• Máximo 5 grupos por execução</li>
                  <li>• Máximo 50 contatos por grupo</li>
                  <li>• Máximo 3 grupos por sessão</li>
                  <li>• Pausa de 30 min entre sessões</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Delays Anti-Ban:</p>
                <ul className="space-y-1">
                  <li>• 8-18s entre contatos (aleatório)</li>
                  <li>• 2-5 min entre grupos (aleatório)</li>
                  <li>• Comportamento humano simulado</li>
                  <li>• Anti-detecção ativada</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
          />
          <p className="text-xs text-gray-500">
            Grupos serão numerados: "Grupo VIP 1", "Grupo VIP 2", etc. (máx 5 grupos)
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Contatos por Grupo (LIMITE SEGURO)
          </label>
          <div className="relative">
            <input
              type="number"
              min="10"
              max="50"
              value={Math.min(config.maxMembers, 50)}
              onChange={(e) => onConfigChange({ 
                ...config, 
                maxMembers: Math.min(parseInt(e.target.value) || 50, 50)
              })}
              className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            />
            <div className="absolute right-3 top-3 text-red-600">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xs text-red-600 font-medium">
            🛡️ LIMITE SEGURO: Máximo 50 contatos por grupo (proteção anti-ban)
          </p>
        </div>
      </div>

      {/* Delays Anti-Ban */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200">
        <h3 className="font-semibold text-amber-800 mb-4 flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Delays Anti-Ban (OBRIGATÓRIOS)</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-amber-800">
              Delay Entre Contatos (segundos)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  min="8"
                  max="30"
                  value={Math.max(safeConfig.delay.min, 8)}
                  onChange={(e) => onConfigChange({ 
                    ...config, 
                    delay: { 
                      ...config.delay, 
                      min: Math.max(parseInt(e.target.value) || 8, 8)
                    }
                  })}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm"
                  placeholder="Min"
                />
                <p className="text-xs text-amber-600 mt-1">Mín: 8s</p>
              </div>
              <div>
                <input
                  type="number"
                  min="18"
                  max="60"
                  value={Math.max(safeConfig.delay.max, 18)}
                  onChange={(e) => onConfigChange({ 
                    ...config, 
                    delay: { 
                      ...config.delay, 
                      max: Math.max(parseInt(e.target.value) || 18, 18)
                    }
                  })}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm"
                  placeholder="Max"
                />
                <p className="text-xs text-amber-600 mt-1">Máx: 18s</p>
              </div>
            </div>
            <p className="text-xs text-amber-700">
              🛡️ Delays aleatórios entre {Math.max(safeConfig.delay.min, 8)}s e {Math.max(safeConfig.delay.max, 18)}s
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-amber-800">
              Delay Entre Grupos (minutos)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={Math.max((safeConfig.groupDelay?.min || 120) / 60, 2)}
                  onChange={(e) => onConfigChange({ 
                    ...config, 
                    groupDelay: { 
                      ...config.groupDelay, 
                      min: Math.max((parseInt(e.target.value) || 2) * 60, 120)
                    }
                  })}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm"
                  placeholder="Min"
                />
                <p className="text-xs text-amber-600 mt-1">Mín: 2min</p>
              </div>
              <div>
                <input
                  type="number"
                  min="5"
                  max="15"
                  value={Math.max((safeConfig.groupDelay?.max || 300) / 60, 5)}
                  onChange={(e) => onConfigChange({ 
                    ...config, 
                    groupDelay: { 
                      ...config.groupDelay, 
                      max: Math.max((parseInt(e.target.value) || 5) * 60, 300)
                    }
                  })}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm"
                  placeholder="Max"
                />
                <p className="text-xs text-amber-600 mt-1">Máx: 5min</p>
              </div>
            </div>
            <p className="text-xs text-amber-700">
              🛡️ Pausas de {Math.max((safeConfig.groupDelay?.min || 120) / 60, 2)}-{Math.max((safeConfig.groupDelay?.max || 300) / 60, 5)} minutos entre grupos
            </p>
          </div>
        </div>
      </div>

      {/* Controle de Sessão */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-4 flex items-center space-x-2">
          <Pause className="h-5 w-5" />
          <span>Controle de Sessão Anti-Ban</span>
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-blue-800">
              Máximo de Grupos por Sessão
            </label>
            <input
              type="number"
              min="1"
              max="3"
              value={Math.min(config.maxGroupsPerSession, 3)}
              onChange={(e) => onConfigChange({ 
                ...config, 
                maxGroupsPerSession: Math.min(parseInt(e.target.value) || 3, 3)
              })}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm"
            />
            <p className="text-xs text-blue-700">
              🛡️ LIMITE SEGURO: Máximo 3 grupos por sessão (pausa de 30 min entre sessões)
            </p>
          </div>
          
          <div className="bg-blue-100 rounded-lg p-4 border border-blue-300">
            <h4 className="font-medium text-blue-900 mb-2">Funcionamento das Sessões:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <strong>Sessão 1:</strong> Cria até 3 grupos → Pausa 30 minutos</li>
              <li>• <strong>Sessão 2:</strong> Cria mais 2 grupos (máx 5 total)</li>
              <li>• <strong>Proteção:</strong> Simula comportamento humano real</li>
              <li>• <strong>Segurança:</strong> Evita detecção de automação</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Mensagem de Boas-vindas
          </label>
          <textarea
            value={config.welcomeMessage}
            onChange={(e) => onConfigChange({ ...config, welcomeMessage: e.target.value })}
            placeholder="Digite a mensagem que será enviada automaticamente após a criação de cada grupo..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
          />
          <p className="text-xs text-gray-500">
            Esta mensagem será enviada automaticamente em cada grupo após sua criação
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableScheduling}
              onChange={(e) => handleScheduleToggle(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  Agendar Execução Futura
                </span>
              </div>
              <p className="text-xs text-purple-700 mb-3">
                Permite agendar a automação para uma data e hora específica
              </p>
              
              {config.enableScheduling && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">Data</label>
                    <input
                      type="date"
                      value={config.scheduledDate || ''}
                      onChange={(e) => onConfigChange({ ...config, scheduledDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">Hora</label>
                    <input
                      type="time"
                      value={config.scheduledTime || ''}
                      onChange={(e) => onConfigChange({ ...config, scheduledTime: e.target.value })}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Estatísticas com Limites Seguros */}
      {safeStats.totalContacts > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <h3 className="font-semibold text-green-900 flex items-center space-x-2 mb-6">
            <Shield className="h-5 w-5 text-green-600" />
            <span>Estatísticas com Proteção Anti-Ban</span>
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center border border-green-200 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{safeStats.totalContacts.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Total Contatos</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center border border-green-200 shadow-sm">
              <div className="text-2xl font-bold text-blue-900">{Math.min(safeStats.totalLeads, 250)}</div>
              <div className="text-xs text-gray-600">Leads (máx 250)</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center border border-green-200 shadow-sm">
              <div className="text-2xl font-bold text-purple-900">{safeStats.totalAdmins}</div>
              <div className="text-xs text-gray-600">Administradores</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center border border-green-200 shadow-sm">
              <div className="text-2xl font-bold text-red-900">{Math.min(safeStats.estimatedGroups, 5)}</div>
              <div className="text-xs text-gray-600">Grupos (máx 5)</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center border border-green-200 shadow-sm">
              <div className="text-2xl font-bold text-amber-900">{safeStats.estimatedSessions}</div>
              <div className="text-xs text-gray-600">Sessões</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-gray-900">Tempo Estimado</span>
              </div>
              <div className="text-xl font-bold text-amber-600 mb-1">{safeStats.estimatedTime}</div>
              <p className="text-sm text-gray-600">
                Com delays seguros de {Math.max(safeConfig.delay.min, 8)}s-{Math.max(safeConfig.delay.max, 18)}s
                <br />+ pausas anti-ban de {Math.max((safeConfig.groupDelay?.min || 120) / 60, 2)}-{Math.max((safeConfig.groupDelay?.max || 300) / 60, 5)} min
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">Distribuição</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• {Math.min(config.maxMembers, 50)} contatos por grupo</p>
                <p>• {Math.min(config.maxGroupsPerSession, 3)} grupos por sessão</p>
                <p>• {safeStats.estimatedSessions} sessões necessárias</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Proteção</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Delays anti-ban ativos</p>
                <p>• Comportamento humano</p>
                <p>• Limites seguros aplicados</p>
                <p>• Anti-detecção ativada</p>
              </div>
            </div>
          </div>

          {config.enableScheduling && config.scheduledDate && config.scheduledTime && (
            <div className="mt-6 bg-purple-100 rounded-lg p-4 border border-purple-300">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-purple-900">Execução Agendada</span>
              </div>
              <p className="text-purple-800">
                A automação será executada em: <strong>
                  {new Date(`${config.scheduledDate}T${config.scheduledTime}`).toLocaleString('pt-BR')}
                </strong>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Aviso Final de Proteção */}
      <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Shield className="h-6 w-6 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800 mb-2">🛡️ PROTEÇÃO ANTI-BAN GARANTIDA</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-red-700">
              <div>
                <p className="font-medium mb-1">Limites Aplicados:</p>
                <ul className="space-y-1">
                  <li>• <strong>Máximo 5 grupos</strong> por execução</li>
                  <li>• <strong>Máximo 50 contatos</strong> por grupo</li>
                  <li>• <strong>Máximo 3 grupos</strong> por sessão</li>
                  <li>• <strong>Pausa de 30 minutos</strong> entre sessões</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Proteções Ativas:</p>
                <ul className="space-y-1">
                  <li>• <strong>Delays aleatórios</strong> 8-18s entre contatos</li>
                  <li>• <strong>Pausas longas</strong> 2-5 min entre grupos</li>
                  <li>• <strong>Comportamento humano</strong> simulado</li>
                  <li>• <strong>Anti-detecção</strong> completa</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-red-100 rounded border border-red-300">
              <p className="text-xs text-red-800 font-medium">
                ⚠️ <strong>IMPORTANTE:</strong> Estes limites são obrigatórios para evitar banimento. 
                Não tente contorná-los. Use a automação com responsabilidade e aguarde 24h entre execuções completas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};