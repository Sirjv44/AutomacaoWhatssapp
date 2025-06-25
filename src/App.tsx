import React, { useState, useCallback, useMemo } from 'react';
import { MessageSquare, FileSpreadsheet, Users, Crown, Target, Zap, Shield, Calendar, Search } from 'lucide-react';
import { Contact, GroupConfig, AdvancedAutomationStats } from './types';
import { LGPDConsent } from './components/LGPDConsent';
import { IntegratedFileUpload } from './components/IntegratedFileUpload';
import { AdvancedAutomationConfig } from './components/AdvancedAutomationConfig';
import { IntegratedAutomationProgress } from './components/IntegratedAutomationProgress';
import { AdvancedPythonGenerator } from './components/AdvancedPythonGenerator';
import { ContactExtractor } from './components/ContactExtractor';
import { ApiStatus } from './components/ApiStatus';
import { useApiHealth } from './hooks/useApi';
import { AdminConfigurator } from './components/AdminConfigurator';



function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string>('');
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [showLgpdModal, setShowLgpdModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'automation' | 'extractor'>('automation');
  const [uploadStats, setUploadStats] = useState<any>(null);
  const { isConnected } = useApiHealth();
  const [manualAdmins, setManualAdmins] = useState<string[]>([]);
  
  
  const [config, setConfig] = useState<GroupConfig>({
    baseName: 'Grupo VIP',
    maxMembers: 999,
    delay: { min: 2, max: 6 },
    groupDelay: { min: 30, max: 90 },
    createMultiple: true,
    welcomeMessage: 'Bem-vindos ao nosso grupo! 🎉\n\nEste é um espaço para compartilharmos informações importantes e mantermos contato.\n\nObrigado por fazer parte da nossa comunidade! 👥',
    enableScheduling: false,
    enableBanPrevention: true,
    maxGroupsPerSession: 10,
  });

  // Calcula estatísticas da automação avançada com proteção anti-ban
  const advancedAutomationStats = useMemo((): AdvancedAutomationStats => {
    const totalContacts = contacts.length;
    const totalLeads = contacts.filter(c => c.tipo === 'lead').length;
    const totalAdmins = contacts.filter(c => c.tipo === 'administrador').length;
    const estimatedGroups = Math.ceil(totalLeads / 999);
    
    // Calcula tempo estimado com proteção anti-ban
    const avgDelay = (config.delay.min + config.delay.max) / 2;
    const avgGroupDelay = config.enableBanPrevention ? (config.groupDelay.min + config.groupDelay.max) / 2 : 10;
    
    const contactTime = totalContacts * avgDelay;
    const groupOverhead = estimatedGroups * 45;
    const welcomeTime = config.welcomeMessage.trim() ? estimatedGroups * 10 : 0;
    const antiBanTime = config.enableBanPrevention ? (estimatedGroups - 1) * avgGroupDelay : 0;
    
    const estimatedSessions = config.enableBanPrevention ? Math.ceil(estimatedGroups / config.maxGroupsPerSession) : 1;
    const sessionPauseTime = config.enableBanPrevention ? (estimatedSessions - 1) * 1200 : 0;
    
    const totalSeconds = contactTime + groupOverhead + welcomeTime + antiBanTime + sessionPauseTime;
    const totalMinutes = Math.ceil(totalSeconds / 60);
    
    let estimatedTime = '';
    if (totalMinutes < 60) {
      estimatedTime = `${totalMinutes} min`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      estimatedTime = `${hours}h ${minutes}min`;
    }

    // Gera preview dos grupos
    const batchGroups = [];
    const leads = contacts.filter(c => c.tipo === 'lead');
    const admins = contacts.filter(c => c.tipo === 'administrador');
    
    for (let i = 0; i < estimatedGroups; i++) {
      const startIdx = i * 999;
      const endIdx = Math.min(startIdx + 999, leads.length);
      const groupLeads = leads.slice(startIdx, endIdx);
      
      batchGroups.push({
        groupName: `${config.baseName} ${i + 1}`,
        leads: groupLeads,
        admins: admins,
        totalMembers: groupLeads.length + admins.length,
        status: 'pending' as const,
        welcomeMessageSent: false,
      });
    }

    return {
      totalContacts,
      totalLeads,
      totalAdmins,
      estimatedGroups,
      estimatedTime,
      batchGroups,
      lgpdConsent,
      estimatedSessions,
      avgGroupsPerSession: config.enableBanPrevention ? config.maxGroupsPerSession : estimatedGroups,
    };
  }, [contacts, config]);

  const handleLgpdConsent = useCallback((accepted: boolean) => {
    setLgpdConsent(accepted);
    setShowLgpdModal(false);
    
    if (!accepted) {
      setError('Consentimento LGPD é necessário para processar dados pessoais');
      // Limpa contatos se não aceitar
      setContacts([]);
      setUploadStats(null);
    } else {
      setError(''); // Limpa erro quando aceita
    }
  }, []);

  

  const handleFileUpload = useCallback((stats: any) => {
  console.log('📁 Arquivo processado com sucesso:', stats);
  setUploadStats(stats);

  const simulatedContacts: Contact[] = [];

  // Adiciona leads simulados
  for (let i = 0; i < stats.totalLeads; i++) {
    simulatedContacts.push({
      nome: `Lead ${i + 1}`,
      numero: `5562${String(999999999 - i).padStart(9, '0')}`,
      tipo: 'lead'
    });
  }

  // Admins manuais (esses vêm do configurador)
  const adminContacts: Contact[] = manualAdmins.map((numero, i) => ({
    nome: `Admin Manual ${i + 1}`,
    numero,
    tipo: 'administrador'
  }));

  const allContacts = [...adminContacts, ...simulatedContacts];

console.log('👥 Contatos simulados com admins:', allContacts.length);
setContacts(allContacts);
setError('');


}, [manualAdmins]);

  const handleError = useCallback((errorMessage: string) => {
    console.error('❌ Erro no upload:', errorMessage);
    setError(errorMessage);
    // Se houver erro, limpa os contatos e stats
    if (errorMessage) {
      setContacts([]);
      setUploadStats(null);
    }
  }, []);

  // Condições para habilitar o botão de iniciar
  const canStart = useMemo(() => {
    const hasContacts = contacts.length > 0;
    const hasGroupName = config.baseName.trim() !== '';
    const hasLgpdConsent = lgpdConsent;
    const hasApiConnection = isConnected;
    
    console.log('🔍 Verificando condições para iniciar:', {
      hasContacts,
      contactsCount: contacts.length,
      hasGroupName,
      groupName: config.baseName,
      hasLgpdConsent,
      hasApiConnection
    });
    
    return hasContacts && hasGroupName && hasLgpdConsent && hasApiConnection;
  }, [contacts.length, config.baseName, lgpdConsent, isConnected]);

  const isScheduled = config.enableScheduling && config.scheduledDate && config.scheduledTime;
  const scheduledDateTime = isScheduled ? `${config.scheduledDate}T${config.scheduledTime}` : undefined;

  // Mostra modal LGPD quando necessário
  const handleShowLgpdModal = useCallback(() => {
    if (!lgpdConsent) {
      setShowLgpdModal(true);
    }
  }, [lgpdConsent]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <LGPDConsent 
        isVisible={showLgpdModal} 
        onConsent={handleLgpdConsent} 
      />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="bg-gradient-to-r from-purple-600 to-blue-700 p-4 rounded-2xl shadow-lg">
              <Zap className="h-12 w-12 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                WhatsApp Advanced Automation Suite
              </h1>
              <p className="text-lg text-gray-600">
                Ferramenta empresarial completa: Automação + Extração de Contatos
              </p>
            </div>
          </div>
          <p className="text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Suite completa para WhatsApp: Crie grupos automaticamente com proteção anti-banimento 
            e extraia contatos de grupos existentes. Solução empresarial para automação em larga escala 
            com máxima segurança e conformidade LGPD. <strong>Agora com integração completa Frontend + Backend!</strong>
          </p>
        </div>

        {/* API Status */}
        <ApiStatus />

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('automation')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === 'automation'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-700 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>Automação de Grupos</span>
              </button>
              
              <button
                onClick={() => setActiveTab('extractor')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === 'extractor'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Search className="h-4 w-4" />
                <span>Extrator de Contatos</span>
              </button>
            </div>
          </div>
        </div>

        {/* LGPD Status */}
        {lgpdConsent && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">Consentimento LGPD Aceito</h3>
                <p className="text-green-700 mt-1">
                  Dados pessoais serão processados conforme termos aceitos. Processamento autorizado e seguro.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <MessageSquare className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-red-800">Erro encontrado</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm">
            <h4 className="font-medium text-yellow-800 mb-2">🔍 Debug Info:</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>• Contatos carregados: {contacts.length}</p>
              <p>• LGPD aceito: {lgpdConsent ? 'Sim' : 'Não'}</p>
              <p>• API conectada: {isConnected ? 'Sim' : 'Não'}</p>
              <p>• Nome do grupo: "{config.baseName}"</p>
              <p>• Pode iniciar: {canStart ? 'Sim' : 'Não'}</p>
              <p>• Upload stats: {uploadStats ? 'Sim' : 'Não'}</p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'automation' ? (
          <>
            {/* Ban Prevention Status */}
            {config.enableBanPrevention && contacts.length > 0 && lgpdConsent && (
              <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <Shield className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-red-800">🛡️ Proteção Anti-Banimento Ativada</h3>
                    <p className="text-red-700 mt-1">
                      Delays inteligentes de {config.groupDelay.min}s-{config.groupDelay.max}s entre grupos, 
                      máximo {config.maxGroupsPerSession} grupos por sessão, 
                      {Math.ceil(advancedAutomationStats.estimatedGroups / config.maxGroupsPerSession)} sessões estimadas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scheduled Automation Notice */}
            {isScheduled && (
              <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-800">Automação Agendada com Proteção Anti-Ban</h3>
                    <p className="text-blue-700 mt-1">
                      A automação será executada automaticamente em: <strong>
                        {new Date(scheduledDateTime!).toLocaleString('pt-BR')}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            {contacts.length > 0 && lgpdConsent && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-blue-100 p-3 rounded-lg w-fit mx-auto mb-3">
                    <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{contacts.length.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total de Contatos</div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-green-100 p-3 rounded-lg w-fit mx-auto mb-3">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{advancedAutomationStats.totalLeads.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Leads</div>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-purple-100 p-3 rounded-lg w-fit mx-auto mb-3">
                    <Crown className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{advancedAutomationStats.totalAdmins}</div>
                  <div className="text-sm text-gray-600">Administradores</div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-amber-100 p-3 rounded-lg w-fit mx-auto mb-3">
                    <Users className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {advancedAutomationStats.estimatedGroups}
                  </div>
                  <div className="text-sm text-gray-600">Grupos Estimados</div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-red-100 p-3 rounded-lg w-fit mx-auto mb-3">
                    <Shield className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {advancedAutomationStats.estimatedSessions}
                  </div>
                  <div className="text-sm text-gray-600">Sessões Anti-Ban</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-8">
                {/* Integrated File Upload */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Upload Integrado com Backend</h2>
                  </div>
                  <IntegratedFileUpload 
                    onFileUpload={handleFileUpload} 
                    onError={handleError} 
                    lgpdConsent={lgpdConsent}
                  />
                  {!lgpdConsent && (
                    <div className="mt-4">
                      <button
                        onClick={handleShowLgpdModal}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                      >
                        Aceitar Termos LGPD para Continuar
                      </button>
                    </div>
                  )}
                </div>

                {/* Admin Configurator */}
                  <AdminConfigurator
                    admins={manualAdmins}
                    onChange={setManualAdmins}
                  />

                {/* Advanced Automation Configuration */}
                {contacts.length > 0 && lgpdConsent && (
                  <AdvancedAutomationConfig
                    config={config}
                    onConfigChange={setConfig}
                    stats={advancedAutomationStats}
                  />
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Integrated Automation Progress */}
                <IntegratedAutomationProgress
                  canStart={canStart}
                  isScheduled={isScheduled}
                  scheduledTime={scheduledDateTime}
                  config={config}
                />

                {/* Advanced Python Generator */}
                {contacts.length > 0 && lgpdConsent && (
                  <AdvancedPythonGenerator 
                    contacts={contacts} 
                    config={config} 
                    stats={advancedAutomationStats}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          /* Contact Extractor Tab */
          <div className="max-w-5xl mx-auto">
            <ContactExtractor lgpdConsent={lgpdConsent} />
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-2 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                WhatsApp Advanced Automation Suite
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Suite completa: Automação + Extração | React + TypeScript + Python + Flask + Playwright
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>🔗 <strong>Integração completa:</strong> Frontend React + Backend Python via API REST</p>
              <p>🛡️ Recursos de proteção: Delays inteligentes, controle de sessão, detecção de desconexão</p>
              <p>🔍 Extração avançada: Contatos de grupos com filtros e remoção de duplicatas</p>
              <p>📊 Conformidade LGPD: Processamento seguro de dados pessoais com consentimento</p>
              <p>⚡ Performance: Otimizado para processar milhares de contatos com segurança</p>
              <p>🔄 Resiliência: Backup contínuo e retomada automática após reconexão</p>
              <p>Use com responsabilidade e respeite os termos de uso do WhatsApp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;