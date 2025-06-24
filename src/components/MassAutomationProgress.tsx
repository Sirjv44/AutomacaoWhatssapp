import React from 'react';
import { Play, Square, CheckCircle, AlertTriangle, Clock, Users, Activity, Download, BarChart3, Zap } from 'lucide-react';
import { AutomationStatus, AutomationReport } from '../types';

interface MassAutomationProgressProps {
  status: AutomationStatus;
  reports: AutomationReport[];
  onStart: () => void;
  onStop: () => void;
  onDownloadReport: () => void;
  canStart: boolean;
}

export const MassAutomationProgress: React.FC<MassAutomationProgressProps> = ({
  status,
  reports,
  onStart,
  onStop,
  onDownloadReport,
  canStart,
}) => {
  const progressPercentage = status.totalContacts > 0 
    ? Math.round((status.processedContacts / status.totalContacts) * 100)
    : 0;

  const totalMembersAdded = reports.reduce((sum, report) => sum + report.membersAdded.length, 0);
  const totalAdminsPromoted = reports.reduce((sum, report) => sum + report.adminsPromoted.length, 0);
  const totalErrors = reports.reduce((sum, report) => sum + report.errors.length, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Zap className="h-5 w-5 text-green-600" />
          </div>
          <span>Automação em Massa - WhatsApp</span>
        </h2>
        
        <div className="flex space-x-3">
          {!status.isRunning ? (
            <button
              onClick={onStart}
              disabled={!canStart}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <Play className="h-4 w-4" />
              <span>Iniciar Automação</span>
            </button>
          ) : (
            <button
              onClick={onStop}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 flex items-center space-x-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <Square className="h-4 w-4" />
              <span>Parar Automação</span>
            </button>
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

      {status.isRunning && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Status da Automação</span>
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
                <span>Log de Atividades</span>
              </h3>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {status.logs.slice(-15).map((log, index) => (
                  <div key={index} className="text-sm text-gray-700 font-mono bg-white px-3 py-2 rounded border">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!status.isRunning && reports.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
          <div className="text-gray-400 mb-4">
            <Zap className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Pronto para Automação em Massa
          </h3>
          <p className="text-gray-600 mb-6">
            Configure os parâmetros e clique em "Iniciar Automação" para processar milhares de contatos
          </p>
          
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-left">
                <h4 className="font-medium text-amber-800 mb-1">🚀 Automação de Alta Performance</h4>
                <p className="text-sm text-amber-700">
                  Esta ferramenta foi otimizada para processar milhares de contatos de forma eficiente.
                  O navegador será aberto automaticamente e você precisará escanear o QR Code do WhatsApp Web.
                  Certifique-se de ter uma conexão estável para automações de grande escala.
                </p>
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
              <span>Relatório da Automação em Massa</span>
            </h3>
            <div className="text-sm text-gray-500">
              {reports.length} grupos processados
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                    {report.timestamp}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                    <div className="text-lg font-bold text-gray-900">{report.totalMembers}</div>
                    <div className="text-xs text-gray-600">Total Membros</div>
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