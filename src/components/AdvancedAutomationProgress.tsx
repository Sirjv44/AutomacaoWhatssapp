import React from 'react';
import { Play, Square, CheckCircle, AlertTriangle, Clock, Users, Activity, Download, BarChart3, Zap, Pause, RotateCcw, Calendar, Wifi, WifiOff, Shield } from 'lucide-react';
import { AutomationStatus, AutomationReport } from '../types';

interface AdvancedAutomationProgressProps {
  status: AutomationStatus;
  reports: AutomationReport[];
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onDownloadReport: () => void;
  canStart: boolean;
  isScheduled: boolean;
  scheduledTime?: string;
}

export const AdvancedAutomationProgress: React.FC<AdvancedAutomationProgressProps> = ({
  status,
  reports,
  onStart,
  onStop,
  onPause,
  onResume,
  onDownloadReport,
  canStart,
  isScheduled,
  scheduledTime,
}) => {
  const progressPercentage = status.totalContacts > 0 
    ? Math.round((status.processedContacts / status.totalContacts) * 100)
    : 0;

  const totalMembersAdded = reports.reduce((sum, report) => sum + report.membersAdded.length, 0);
  const totalAdminsPromoted = reports.reduce((sum, report) => sum + report.adminsPromoted.length, 0);
  const totalErrors = reports.reduce((sum, report) => sum + report.errors.length, 0);
  const totalWelcomeMessages = reports.filter(r => r.welcomeMessageSent).length;

  const getConnectionStatusIcon = () => {
    switch (status.connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'reconnecting':
        return <RotateCcw className="h-4 w-4 text-yellow-600 animate-spin" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (status.connectionStatus) {
      case 'connected':
        return 'Conectado';
      case 'disconnected':
        return 'Desconectado';
      case 'reconnecting':
        return 'Reconectando...';
      default:
        return 'Verificando...';
    }
  };

  const getConnectionStatusColor = () => {
    switch (status.connectionStatus) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'disconnected':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'reconnecting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Zap className="h-5 w-5 text-green-600" />
          </div>
          <span>Automação Avançada com Proteção Anti-Ban</span>
        </h2>
        
        <div className="flex items-center space-x-3">
          {/* Status da Conexão */}
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getConnectionStatusColor()}`}>
            {getConnectionStatusIcon()}
            <span className="text-sm font-medium">{getConnectionStatusText()}</span>
          </div>
          
          {isScheduled && scheduledTime ? (
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">
                Agendado: {new Date(scheduledTime).toLocaleString('pt-BR')}
              </span>
            </div>
          ) : (
            <>
              {!status.isRunning ? (
                <button
                  onClick={status.canResume ? onResume : onStart}
                  disabled={!canStart}
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  {status.canResume ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span>{status.canResume ? 'Retomar' : 'Iniciar'} Automação</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={onPause}
                    className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-4 py-3 rounded-lg hover:from-yellow-700 hover:to-yellow-800 flex items-center space-x-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pausar</span>
                  </button>
                  
                  <button
                    onClick={onStop}
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-lg hover:from-red-700 hover:to-red-800 flex items-center space-x-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    <Square className="h-4 w-4" />
                    <span>Parar</span>
                  </button>
                </div>
              )}
            </>
          )}
          
          {reports.length > 0 && (
            <button
              onClick={onDownloadReport}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center space-x-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <Download className="h-4 w-4" />
              <span>Baixar Relatório</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {status.sessionPersisted && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Sessão WhatsApp Persistida</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Login salvo com sucesso. Não será necessário escanear QR Code novamente.
            </p>
          </div>
        )}

        {status.canResume && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Retomada Disponível</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              A automação pode ser retomada de onde parou. Progresso anterior será mantido.
            </p>
          </div>
        )}

        {status.lastBackup && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-800">Backup Automático</span>
            </div>
            <p className="text-purple-700 text-sm mt-1">
              Último backup: {new Date(status.lastBackup).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* Alerta de Desconexão */}
      {status.connectionStatus === 'disconnected' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <WifiOff className="h-6 w-6 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 mb-2">⚠️ Conexão WhatsApp Perdida</h3>
              <p className="text-red-700 mb-3">
                A conexão com o WhatsApp Web foi perdida. O progresso foi salvo automaticamente.
              </p>
              <div className="bg-red-100 rounded-lg p-3 border border-red-300">
                <h4 className="font-medium text-red-900 mb-2">Para continuar:</h4>
                <ol className="text-sm text-red-800 space-y-1 list-decimal list-inside">
                  <li>Faça login no WhatsApp Web com outro número (se necessário)</li>
                  <li>Escaneie o QR Code com o novo dispositivo</li>
                  <li>Clique em "Retomar Automação" para continuar de onde parou</li>
                  <li>A automação continuará do grupo {status.currentGroupIndex}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informações da Sessão Atual */}
      {status.isRunning && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-purple-900">Sessão Atual: {status.currentSessionId}</h4>
            <span className="text-sm text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
              {status.groupsInCurrentSession} grupos criados nesta sessão
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="text-center">
              <div className="font-bold text-purple-900">{status.currentGroupIndex}</div>
              <div className="text-purple-700">Grupo Atual</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-900">{status.totalGroups}</div>
              <div className="text-purple-700">Total Grupos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-900">{progressPercentage}%</div>
              <div className="text-purple-700">Progresso</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-900">{status.estimatedTimeRemaining}</div>
              <div className="text-purple-700">Tempo Restante</div>
            </div>
          </div>
        </div>
      )}

      {status.isRunning && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Status da Automação Avançada</span>
              </div>
              <div className="text-sm text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                Grupo {status.currentGroupIndex} de {status.totalGroups}
              </div>
            </div>
            
            <p className="text-blue-800 mb-4 font-medium">{status.currentStep}</p>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Progresso Geral</span>
                <span>{status.processedContacts.toLocaleString()} de {status.totalContacts.toLocaleString()} contatos ({progressPercentage}%)</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-blue-600 to-blue-700 h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-center"
                  style={{ width: `${progressPercentage}%` }}
                >
                  {progressPercentage > 10 && (
                    <span className="text-xs text-white font-medium">{progressPercentage}%</span>
                  )}
                </div>
              </div>
              
              {status.estimatedTimeRemaining && (
                <div className="flex justify-between text-sm text-blue-700">
                  <span>Tempo Restante Estimado</span>
                  <span className="font-medium">{status.estimatedTimeRemaining}</span>
                </div>
              )}
            </div>
          </div>

          {status.currentGroup && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <p className="text-green-800 font-medium flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Processando: <strong>{status.currentGroup}</strong></span>
              </p>
            </div>
          )}

          {status.logs.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Log de Atividades com Proteção Anti-Ban</span>
              </h3>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {status.logs.slice(-20).map((log, index) => (
                  <div key={index} className="text-sm text-gray-700 font-mono bg-white px-3 py-2 rounded border">
                    <span className="text-gray-500 text-xs mr-2">
                      {new Date().toLocaleTimeString()}
                    </span>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!status.isRunning && reports.length === 0 && !isScheduled && (
        <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
          <div className="text-gray-400 mb-4">
            <Zap className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Pronto para Automação com Proteção Anti-Ban
          </h3>
          <p className="text-gray-600 mb-6">
            Configure os parâmetros avançados e clique em "Iniciar Automação" para processar milhares de contatos com segurança
          </p>
          
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-left">
                <h4 className="font-medium text-amber-800 mb-1">🛡️ Recursos de Proteção Incluídos</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• <strong>Delays inteligentes:</strong> Pausas de 30-90s entre grupos para evitar detecção</li>
                  <li>• <strong>Sessões limitadas:</strong> Máximo de grupos por sessão para segurança</li>
                  <li>• <strong>Detecção de desconexão:</strong> Monitoramento automático da conexão</li>
                  <li>• <strong>Backup contínuo:</strong> Progresso salvo automaticamente a cada operação</li>
                  <li>• <strong>Retomada inteligente:</strong> Continue de onde parou após reconexão</li>
                  <li>• <strong>Relatórios detalhados:</strong> CSV e JSON com estatísticas completas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Relatório da Automação com Proteção Anti-Ban</span>
            </h3>
            <div className="text-sm text-gray-500">
              {reports.length} grupos processados
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 text-center">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">{totalMembersAdded.toLocaleString()}</div>
              <div className="text-sm text-green-700">Membros Adicionados</div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200 text-center">
              <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">{totalAdminsPromoted}</div>
              <div className="text-sm text-purple-700">Admins Promovidos</div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200 text-center">
              <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">{reports.length}</div>
              <div className="text-sm text-blue-700">Grupos Criados</div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border border-green-200 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">{totalWelcomeMessages}</div>
              <div className="text-sm text-green-700">Mensagens Enviadas</div>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border border-red-200 text-center">
              <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-900">{totalErrors}</div>
              <div className="text-sm text-red-700">Erros Encontrados</div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-4">
            {reports.map((report, index) => (
              <div key={index} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{report.groupName}</h4>
                  <div className="flex items-center space-x-2">
                    {report.welcomeMessageSent && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        Mensagem Enviada
                      </span>
                    )}
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      Sessão: {report.sessionId}
                    </span>
                    <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                      {report.timestamp}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                    <div className="text-lg font-bold text-gray-900">{report.totalMembers}</div>
                    <div className="text-xs text-gray-600">Total Planejado</div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                    <div className="text-lg font-bold text-green-600">{report.membersAdded.length}</div>
                    <div className="text-xs text-gray-600">Adicionados</div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                    <div className="text-lg font-bold text-purple-600">{report.adminsPromoted.length}</div>
                    <div className="text-xs text-gray-600">Promovidos</div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                    <div className="text-lg font-bold text-blue-600">
                      {report.welcomeMessageSent ? '1' : '0'}
                    </div>
                    <div className="text-xs text-gray-600">Mensagem</div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                    <div className="text-lg font-bold text-red-600">{report.errors.length}</div>
                    <div className="text-xs text-gray-600">Erros</div>
                  </div>
                </div>

                {report.errors.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h5 className="font-medium text-red-800 mb-2 flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Erros Encontrados:</span>
                    </h5>
                    <ul className="text-sm text-red-700 space-y-1 max-h-24 overflow-y-auto">
                      {report.errors.slice(0, 3).map((error, errorIndex) => (
                        <li key={errorIndex} className="flex items-start space-x-1">
                          <span>•</span>
                          <span>
                            {error.contact.nome || 'Sem nome'} ({error.contact.numero}): {error.error}
                          </span>
                        </li>
                      ))}
                      {report.errors.length > 3 && (
                        <li className="text-red-600 font-medium">
                          ... e mais {report.errors.length - 3} erros
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};