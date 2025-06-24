import React from 'react';
import { Play, Square, CheckCircle, AlertTriangle, Clock, Users, Activity, Download, BarChart3, Zap, Pause, RotateCcw, Calendar, Wifi, WifiOff, Shield } from 'lucide-react';
import { useAutomationStatus } from '../hooks/useApi';
import { apiService } from '../services/api';

interface IntegratedAutomationProgressProps {
  canStart: boolean;
  isScheduled: boolean;
  scheduledTime?: string;
  config: any;
}

export const IntegratedAutomationProgress: React.FC<IntegratedAutomationProgressProps> = ({
  canStart,
  isScheduled,
  scheduledTime,
  config
}) => {
  const { status, isLoading } = useAutomationStatus();

  const handleStart = async () => {
    try {
      await apiService.startAutomation(config);
    } catch (error) {
      console.error('Failed to start automation:', error);
    }
  };

  const handleStop = async () => {
    try {
      await apiService.stopAutomation();
    } catch (error) {
      console.error('Failed to stop automation:', error);
    }
  };

  const handlePause = async () => {
    try {
      await apiService.pauseAutomation();
    } catch (error) {
      console.error('Failed to pause automation:', error);
    }
  };

  const handleResume = async () => {
    try {
      await apiService.resumeAutomation();
    } catch (error) {
      console.error('Failed to resume automation:', error);
    }
  };

  const handleDownloadReport = async () => {
    try {
      await apiService.downloadReport();
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const progressPercentage = status.totalContacts > 0 
    ? Math.round((status.processedContacts / status.totalContacts) * 100)
    : 0;

  const getConnectionStatusIcon = () => {
    switch (status.connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'reconnecting':
      case 'connecting':
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
      case 'connecting':
        return 'Conectando...';
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
      case 'connecting':
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
          <span>Automação Integrada com Backend</span>
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
                  onClick={status.canResume ? handleResume : handleStart}
                  disabled={!canStart || isLoading}
                  className={`px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200 flex items-center space-x-2 ${
                    canStart && !isLoading
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 hover:shadow-xl'
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {status.canResume ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span>{status.canResume ? 'Retomar' : 'Iniciar'} Automação</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handlePause}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-4 py-3 rounded-lg hover:from-yellow-700 hover:to-yellow-800 flex items-center space-x-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pausar</span>
                  </button>
                  
                  <button
                    onClick={handleStop}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-lg hover:from-red-700 hover:to-red-800 flex items-center space-x-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    <Square className="h-4 w-4" />
                    <span>Parar</span>
                  </button>
                </div>
              )}
            </>
          )}
          
          <button
            onClick={handleDownloadReport}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center space-x-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            <Download className="h-4 w-4" />
            <span>Baixar Relatório</span>
          </button>
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

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <span className="font-medium text-purple-800">Backend Integrado</span>
          </div>
          <p className="text-purple-700 text-sm mt-1">
            Processamento via API Python com proteção anti-ban ativada.
          </p>
        </div>
      </div>

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
                <span className="font-medium text-blue-900">Status da Automação Backend</span>
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
                <span>Log de Atividades Backend</span>
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

      {!status.isRunning && !isScheduled && (
        <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
          <div className="text-gray-400 mb-4">
            <Zap className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Pronto para Automação Integrada
          </h3>
          <p className="text-gray-600 mb-6">
            Backend Python conectado e pronto para processar milhares de contatos com segurança
          </p>
          
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-left">
                <h4 className="font-medium text-amber-800 mb-1">🚀 Integração Completa Ativa</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• <strong>Backend Python:</strong> Processamento via API Flask</li>
                  <li>• <strong>Frontend React:</strong> Interface responsiva em tempo real</li>
                  <li>• <strong>Proteção anti-ban:</strong> Delays inteligentes e controle de sessão</li>
                  <li>• <strong>Monitoramento:</strong> Status e logs atualizados automaticamente</li>
                  <li>• <strong>Relatórios:</strong> Download direto via API</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};