import React from 'react';
import { Settings, Clock, MessageSquare, Calendar, Shuffle, Zap, AlertTriangle, Shield, Pause } from 'lucide-react';
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
      maxGroupsPerSession: enabled ? 10 : 50,
      groupDelay: enabled ? { min: 30, max: 90 } : { min: 5, max: 15 }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Settings className="h-5 w-5 text-purple-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Configuração Avançada com Prevenção de Banimento</h2>
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={config.delay.min}
                onChange={(e) => onConfigChange({ 
                  ...config, 
                  delay: { ...config.delay, min: parseFloat(e.target.value) || 2 }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-sm"
                placeholder="Mín"
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo</p>
            </div>
            <div>
              <input
                type="number"
                min="2"
                max="15"
                step="0.5"
                value={config.delay.max}
                onChange={(e) => onConfigChange({ 
                  ...config, 
                  delay: { ...config.delay, max: parseFloat(e.target.value) || 6 }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-sm"
                placeholder="Máx"
              />
              <p className="text-xs text-gray-500 mt-1">Máximo</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Delays aleatórios entre {config.delay.min}s e {config.delay.max}s para simular comportamento humano
          </p>
        </div>
      </div>

      {/* Configuração de Prevenção de Banimento */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6 border border-red-200">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enableBanPrevention}
            onChange={(e) => handleBanPreventionToggle(e.target.checked)}
            className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">
                Prevenção Avançada de Banimento
              </span>
            </div>
            <p className="text-xs text-red-700 mb-4">
              Ativa delays inteligentes e controle de sessão para evitar detecção e banimentos
            </p>
            
            {config.enableBanPrevention && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-red-800 mb-1">
                      Delay Entre Grupos (segundos)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="30"
                        max="300"
                        value={config.groupDelay?.min || 30}
                        onChange={(e) => onConfigChange({ 
                          ...config, 
                          groupDelay: { 
                            ...config.groupDelay, 
                            min: parseInt(e.target.value) || 30 
                          }
                        })}
                        className="w-full px-2 py-1 border border-red-300 rounded text-xs"
                        placeholder="Min"
                      />
                      <input
                        type="number"
                        min="60"
                        max="600"
                        value={config.groupDelay?.max || 90}
                        onChange={(e) => onConfigChange({ 
                          ...config, 
                          groupDelay: { 
                            ...config.groupDelay, 
                            max: parseInt(e.target.value) || 90 
                          }
                        })}
                        className="w-full px-2 py-1 border border-red-300 rounded text-xs"
                        placeholder="Max"
                      />
                    </div>
                    <p className="text-xs text-red-600 mt-1">
                      Pausa entre criação de grupos: {config.groupDelay?.min || 30}s - {config.groupDelay?.max || 90}s
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-red-800 mb-1">
                      Máximo de Grupos por Sessão
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={config.maxGroupsPerSession}
                      onChange={(e) => onConfigChange({ 
                        ...config, 
                        maxGroupsPerSession: parseInt(e.target.value) || 10 
                      })}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm"
                    />
                    <p className="text-xs text-red-600 mt-1">
                      Limite de grupos antes de pausar para nova sessão
                    </p>
                  </div>
                </div>
                
                <div className="bg-red-100 rounded-lg p-3 border border-red-300">
                  <h4 className="font-medium text-red-900 mb-2">Recursos de Proteção Ativados:</h4>
                  <ul className="text-xs text-red-800 space-y-1">
                    <li>• <strong>Delays inteligentes:</strong> Pausas de {config.groupDelay?.min || 30}-{config.groupDelay?.max || 90}s entre grupos</li>
                    <li>• <strong>Sessões limitadas:</strong> Máximo {config.maxGroupsPerSession} grupos por sessão</li>
                    <li>• <strong>Detecção de desconexão:</strong> Monitoramento automático da conexão</li>
                    <li>• <strong>Backup automático:</strong> Progresso salvo a cada operação</li>
                    <li>• <strong>Reconexão inteligente:</strong> Retomada automática após nova autenticação</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </label>
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

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableScheduling}
              onChange={(e) => handleScheduleToggle(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Agendar Execução Futura
                </span>
              </div>
              <p className="text-xs text-blue-700 mb-3">
                Permite agendar a automação para uma data e hora específica
              </p>
              
              {config.enableScheduling && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-1">Data</label>
                    <input
                      type="date"
                      value={config.scheduledDate || ''}
                      onChange={(e) => onConfigChange({ ...config, scheduledDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-1">Hora</label>
                    <input
                      type="time"
                      value={config.scheduledTime || ''}
                      onChange={(e) => onConfigChange({ ...config, scheduledTime: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {stats.totalContacts > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
          <h3 className="font-semibold text-purple-900 flex items-center space-x-2 mb-6">
            <Zap className="h-5 w-5 text-purple-600" />
            <span>Estatísticas da Automação com Proteção Anti-Ban</span>
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center border border-purple-200 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.totalContacts.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Total Contatos</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center border border-purple-200 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.totalLeads.toLocaleString()}</div>
              <div className="text-xs text-gray-600">Leads</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center border border-purple-200 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.totalAdmins}</div>
              <div className="text-xs text-gray-600">Administradores</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center border border-purple-200 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.estimatedGroups}</div>
              <div className="text-xs text-gray-600">Grupos a Criar</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center border border-purple-200 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">
                {config.enableBanPrevention ? Math.ceil(stats.estimatedGroups / config.maxGroupsPerSession) : 1}
              </div>
              <div className="text-xs text-gray-600">Sessões Estimadas</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-gray-900">Tempo Estimado</span>
              </div>
              <div className="text-xl font-bold text-amber-600 mb-1">{stats.estimatedTime}</div>
              <p className="text-sm text-gray-600">
                Com delays de {config.delay.min}s-{config.delay.max}s
                {config.enableBanPrevention && (
                  <><br />+ pausas anti-ban de {config.groupDelay?.min || 30}s-{config.groupDelay?.max || 90}s</>
                )}
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-3">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Mensagens</span>
              </div>
              <div className="text-xl font-bold text-green-600 mb-1">{stats.estimatedGroups}</div>
              <p className="text-sm text-gray-600">
                Boas-vindas automáticas
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-3">
                <Pause className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">Proteção</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {config.enableBanPrevention ? (
                  <>
                    <p>• Delays inteligentes ativos</p>
                    <p>• Máx {config.maxGroupsPerSession} grupos/sessão</p>
                    <p>• Backup automático</p>
                  </>
                ) : (
                  <>
                    <p>• Proteção básica</p>
                    <p>• Delays padrão</p>
                    <p>• Sessão contínua</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {config.enableScheduling && config.scheduledDate && config.scheduledTime && (
            <div className="mt-6 bg-blue-100 rounded-lg p-4 border border-blue-300">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Execução Agendada</span>
              </div>
              <p className="text-blue-800">
                A automação será executada em: <strong>
                  {new Date(`${config.scheduledDate}T${config.scheduledTime}`).toLocaleString('pt-BR')}
                </strong>
              </p>
            </div>
          )}
        </div>
      )}

      {config.enableBanPrevention && stats.totalContacts > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-2">🛡️ Proteção Anti-Banimento Ativada</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• <strong>Delays inteligentes:</strong> Pausas de {config.groupDelay?.min || 30}-{config.groupDelay?.max || 90} segundos entre grupos</li>
                <li>• <strong>Sessões limitadas:</strong> Máximo {config.maxGroupsPerSession} grupos por sessão</li>
                <li>• <strong>Detecção de desconexão:</strong> Monitoramento automático da conexão WhatsApp</li>
                <li>• <strong>Backup contínuo:</strong> Progresso salvo automaticamente a cada operação</li>
                <li>• <strong>Retomada inteligente:</strong> Continue de onde parou após reconexão</li>
                <li>• <strong>Estimativa de sessões:</strong> {Math.ceil(stats.estimatedGroups / config.maxGroupsPerSession)} sessões necessárias</li>
                <li>• <strong>Tempo entre sessões:</strong> Aguarde 15-30 minutos entre sessões para máxima segurança</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};