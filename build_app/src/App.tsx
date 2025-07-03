import React, { useState, useCallback, useMemo } from 'react';
import { MessageSquare, FileSpreadsheet, Users, Crown, Target, Zap, Shield, Calendar, Search, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { Contact, GroupConfig, AdvancedAutomationStats } from './types';
import { LGPDConsent } from './components/LGPDConsent';
import { IntegratedFileUpload } from './components/IntegratedFileUpload';
import { AdvancedAutomationConfig } from './components/AdvancedAutomationConfig';
import { IntegratedAutomationProgress } from './components/IntegratedAutomationProgress';
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
  const [manualAdmins, setManualAdmins] = useState<Contact[]>([]);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [totalBatches, setTotalBatches] = useState(1);
  
  const [config, setConfig] = useState<GroupConfig>({
    baseName: 'Grupo VIP',
    maxMembers: 50, // Limite seguro padrão
    delay: { min: 8, max: 18 }, // Delays seguros padrão
    groupDelay: { min: 120, max: 300 }, // 2-5 minutos entre grupos
    createMultiple: true,
    welcomeMessage: 'Bem-vindos ao nosso grupo! 🎉\n\nEste é um espaço para compartilharmos informações importantes e mantermos contato.\n\nObrigado por fazer parte da nossa comunidade! 👥',
    enableScheduling: false,
    enableBanPrevention: true, // Sempre ativado
    maxGroupsPerSession: 3, // Limite seguro padrão
  });

  // Calcula estatísticas com limites seguros aplicados
  const advancedAutomationStats = useMemo((): AdvancedAutomationStats => {
    const totalContacts = Math.min(contacts.length, 250); // Limite seguro
    const totalLeads = Math.min(contacts.filter(c => c.tipo === 'lead').length, 250);
    const totalAdmins = contacts.filter(c => c.tipo === 'administrador').length;
    const estimatedGroups = Math.min(Math.ceil(totalLeads / Math.min(config.maxMembers, 50)), 5); // Máximo 5 grupos
    
    // Calcula tempo estimado com proteção anti-ban obrigatória
    const avgDelay = (Math.max(config.delay.min, 8) + Math.max(config.delay.max, 18)) / 2;
    const avgGroupDelay = (Math.max(config.groupDelay?.min || 120, 120) + Math.max(config.groupDelay?.max || 300, 300)) / 2;
    
    const contactTime = totalContacts * avgDelay;
    const groupOverhead = estimatedGroups * 45;
    const welcomeTime = config.welcomeMessage.trim() ? estimatedGroups * 10 : 0;
    const antiBanTime = (estimatedGroups - 1) * avgGroupDelay; // Sempre aplicado
    
    const estimatedSessions = Math.ceil(estimatedGroups / Math.min(config.maxGroupsPerSession, 3));
    const sessionPauseTime = (estimatedSessions - 1) * 1800; // 30 min entre sessões
    
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

    // Gera preview dos grupos com limites seguros
    const batchGroups = [];
    const leads = contacts.filter(c => c.tipo === 'lead').slice(0, 250); // Limite seguro
    const admins = contacts.filter(c => c.tipo === 'administrador');
    
    const maxMembersPerGroup = Math.min(config.maxMembers, 50); // Limite seguro
    
    for (let i = 0; i < estimatedGroups; i++) {
      const startIdx = i * maxMembersPerGroup;
      const endIdx = Math.min(startIdx + maxMembersPerGroup, leads.length);
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
      avgGroupsPerSession: Math.min(config.maxGroupsPerSession, 3),
      currentBatch,
      totalBatches
    };
  }, [contacts, config, currentBatch, totalBatches]);

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

  // Função que recebe o array de números do AdminConfigurator e converte para Contact[]
  const handleManualAdminsChange = useCallback((newAdminNumbers: string[]) => {
    const newAdminContacts: Contact[] = newAdminNumbers.map((num, i) => ({
      nome: `Admin Manual ${i + 1}`,
      numero: num,
      tipo: 'administrador'
    }));

    setManualAdmins(newAdminContacts);
  }, []);

  const handleFileUpload = useCallback((stats: any, realContacts: any[]) => {
    console.log('📁 Arquivo processado com sucesso:', stats);
    console.log('👥 Contatos reais recebidos:', realContacts);
    
    setUploadStats(stats);

    // Atualiza informações de lotes se disponíveis
    if (stats.currentBatch && stats.totalBatches) {
      setCurrentBatch(stats.currentBatch);
      setTotalBatches(stats.totalBatches);
    }

    // Usa os contatos reais do backend em vez de dados simulados
    const csvContacts: Contact[] = realContacts.map(contact => ({
      nome: contact.nome || 'Sem nome',
      numero: contact.numero,
      tipo: contact.tipo
    }));

    // Combina com administradores manuais
    const allContacts = [...manualAdmins, ...csvContacts];
    
    // Aplica limite seguro de 250 contatos
    const safeContacts = allContacts.slice(0, 250);
    
    // Ordena para que administradores fiquem primeiro
    safeContacts.sort((a, b) => {
      if (a.tipo === b.tipo) return 0;
      if (a.tipo === 'administrador') return -1;
      return 1;
    });

    console.log('👥 Contatos finais (CSV + Manuais) com limite seguro:', safeContacts.length);
    console.log('👑 Total de administradores:', safeContacts.filter(c => c.tipo === 'administrador').length);
    console.log('👤 Total de leads:', safeContacts.filter(c => c.tipo === 'lead').length);
    
    if (stats.totalOriginalContacts && stats.totalOriginalContacts > 250) {
      console.log(`⚠️ Processando em lotes: ${stats.currentBatch}/${stats.totalBatches} (${safeContacts.length} de ${stats.totalOriginalContacts} contatos)`);
    }
    
    setContacts(safeContacts);
  }, [manualAdmins]);

  const handleError = useCallback((errorMessage: string) => {
    console.error('❌ Erro no upload:', errorMessage);
    setError(errorMessage);
    // Se houver erro, limpa os contatos e stats
    if (errorMessage && !errorMessage.includes('Limite seguro aplicado') && !errorMessage.includes('Processando lote')) {
      setContacts([]);
      setUploadStats(null);
    }
  }, []);

  // Condições para habilitar o botão de iniciar com limites seguros
  const canStart = useMemo(() => {
    const hasContacts = contacts.length > 0;
    const hasGroupName = config.baseName.trim() !== '';
    const hasLgpdConsent = lgpdConsent;
    const hasApiConnection = isConnected;
    const withinSafeLimits = contacts.length <= 250 && advancedAutomationStats.estimatedGroups <= 5;
    
    return hasContacts && hasGroupName && hasLgpdConsent && hasApiConnection && withinSafeLimits;
  }, [contacts.length, config.baseName, lgpdConsent, isConnected, advancedAutomationStats.estimatedGroups]);

  const isScheduled = config.enableScheduling && config.scheduledDate && config.scheduledTime;
  const scheduledDateTime = isScheduled ? `${config.scheduledDate}T${config.scheduledTime}` : undefined;

  // Mostra modal LGPD quando necessário
  const handleShowLgpdModal = useCallback(() => {
    if (!lgpdConsent) {
      setShowLgpdModal(true);
    }
  }, [lgpdConsent]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      <LGPDConsent 
        isVisible={showLgpdModal} 
        onConsent={handleLgpdConsent} 
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="bg-gradient-to-r from-red-600 to-orange-700 p-4 rounded-2xl shadow-lg">
              <Shield className="h-12 w-12 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                WhatsApp Automation Suite
              </h1>
              <p className="text-lg text-gray-600">
                🛡️ <strong>Proteção Anti-Ban GARANTIDA</strong> • Processamento em Lotes
              </p>
            </div>
          </div>
        </div>

        {/* Alerta de Proteção Anti-Ban */}
        <div className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-medium text-red-800">🛡️ PROCESSAMENTO EM LOTES ATIVADO</h3>
              <p className="text-red-700 mt-1">
                Seus <strong>4756 contatos</strong> serão processados em <strong>20 lotes de 250 contatos</strong> cada
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm text-red-600">
                <div>
                  <p>• <strong>Lote {currentBatch}/{totalBatches}</strong> selecionado</p>
                  <p>• <strong>Máximo 5 grupos</strong> por lote</p>
                </div>
                <div>
                  <p>• <strong>Processe 1 lote por dia</strong> para segurança</p>
                  <p>• <strong>Aguarde 24h</strong> entre lotes</p>
                </div>
              </div>
            </div>
          </div>
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
                    ? 'bg-gradient-to-r from-red-600 to-orange-700 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Automação Protegida</span>
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
          <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">Consentimento LGPD Aceito</h3>
                <p className="text-green-700 mt-1">
                  Dados pessoais serão processados conforme termos aceitos com proteção anti-ban.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className={`mb-8 border rounded-xl p-4 shadow-sm ${
            error.includes('Limite seguro aplicado') || error.includes('Processando lote')
              ? 'bg-orange-50 border-orange-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                error.includes('Limite seguro aplicado') || error.includes('Processando lote')
                  ? 'bg-orange-100' 
                  : 'bg-red-100'
              }`}>
                {error.includes('Limite seguro aplicado') || error.includes('Processando lote') ? (
                  <Shield className={`h-5 w-5 ${
                    error.includes('Limite seguro aplicado') || error.includes('Processando lote')
                      ? 'text-orange-600' 
                      : 'text-red-600'
                  }`} />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <h3 className={`font-medium ${
                  error.includes('Limite seguro aplicado') || error.includes('Processando lote')
                    ? 'text-orange-800' 
                    : 'text-red-800'
                }`}>
                  {error.includes('Limite seguro aplicado') || error.includes('Processando lote') ? 'Processamento em Lotes Ativo' : 'Erro encontrado'}
                </h3>
                <p className={`mt-1 ${
                  error.includes('Limite seguro aplicado') || error.includes('Processando lote')
                    ? 'text-orange-700' 
                    : 'text-red-700'
                }`}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'automation' ? (
          <>
            {/* Fluxo de Uso Guiado */}
            <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Como Usar a Automação em Lotes</h2>
              
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className={`flex-1 p-4 rounded-lg border ${!lgpdConsent ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${!lgpdConsent ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>1</div>
                    <h3 className="font-medium text-gray-900">Aceitar Termos LGPD</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">Necessário para processar dados pessoais</p>
                  {!lgpdConsent && (
                    <button
                      onClick={handleShowLgpdModal}
                      className="ml-11 mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Aceitar Termos LGPD
                    </button>
                  )}
                  {lgpdConsent && (
                    <div className="ml-11 mt-2 flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">Concluído</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-none text-gray-400 self-center">
                  <ArrowRight className="h-6 w-6" />
                </div>
                
                <div className={`flex-1 p-4 rounded-lg border ${lgpdConsent && !uploadStats ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${lgpdConsent && !uploadStats ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>2</div>
                    <h3 className="font-medium text-gray-900">Carregar CSV/TXT</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">Processamento em lotes de 250 contatos</p>
                  {lgpdConsent && !uploadStats && (
                    <p className="ml-11 mt-2 text-blue-600 text-sm font-medium">
                      ⬇️ Use o painel de upload abaixo
                    </p>
                  )}
                  {uploadStats && (
                    <div className="ml-11 mt-2 flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">Lote {currentBatch}/{totalBatches} carregado</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-none text-gray-400 self-center">
                  <ArrowRight className="h-6 w-6" />
                </div>
                
                <div className={`flex-1 p-4 rounded-lg border ${uploadStats && !canStart ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${uploadStats && !canStart ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>3</div>
                    <h3 className="font-medium text-gray-900">Configurar Proteção</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">Limites seguros aplicados automaticamente</p>
                  {uploadStats && !canStart && (
                    <p className="ml-11 mt-2 text-blue-600 text-sm font-medium">
                      ⬇️ Configure as opções abaixo
                    </p>
                  )}
                  {canStart && (
                    <div className="ml-11 mt-2 flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">Concluído</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-none text-gray-400 self-center">
                  <ArrowRight className="h-6 w-6" />
                </div>
                
                <div className={`flex-1 p-4 rounded-lg border ${canStart ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${canStart ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>4</div>
                    <h3 className="font-medium text-gray-900">Iniciar Lote {currentBatch}</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">Máx 5 grupos com proteção anti-ban</p>
                  {canStart && (
                    <p className="ml-11 mt-2 text-blue-600 text-sm font-medium">
                      ⬇️ Use o botão "Iniciar Automação"
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Formato do CSV */}
            <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Formato do CSV com Processamento em Lotes</h2>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Estrutura do Arquivo CSV/TXT:</h3>
                <div className="grid grid-cols-3 gap-2 mb-3 font-medium text-gray-700 border-b pb-2">
                  <div>nome</div>
                  <div>numero</div>
                  <div>tipo</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                  <div>João Silva</div>
                  <div>5562999999999</div>
                  <div>lead</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                  <div>Maria Santos</div>
                  <div>5562888888888</div>
                  <div>administrador</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                  <div>Pedro Costa</div>
                  <div>5562777777777</div>
                  <div>lead</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-1">Coluna "nome"</h4>
                  <p className="text-blue-700">Nome do contato (opcional)</p>
                </div>
                
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-1">Coluna "numero"</h4>
                  <p className="text-red-700">Número com DDI (55 para Brasil)</p>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-800 mb-1">Coluna "tipo"</h4>
                  <p className="text-purple-700">Valores: "lead" ou "administrador"</p>
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-start">
                  <div className="bg-red-100 p-1 rounded mr-2 mt-0.5">
                    <Shield className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-red-800 mb-1">🛡️ Processamento em Lotes:</h4>
                    <p className="text-red-700 text-sm">
                      <strong>Seus 4756 contatos serão processados em 20 lotes de 250 contatos cada.</strong> Cada lote 
                      criará no máximo 5 grupos com 50 contatos por grupo. Processe um lote por dia para máxima segurança.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-8">
                {/* Integrated File Upload */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Upload CSV/TXT com Processamento em Lotes</h2>
                  </div>
                  <IntegratedFileUpload
                    onFileUpload={handleFileUpload}
                    onError={handleError}
                    lgpdConsent={lgpdConsent}
                    manualAdmins={manualAdmins}
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
                  admins={manualAdmins.map(a => a.numero)}
                  onChange={handleManualAdminsChange}
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
                {/* Stats Cards */}
                {contacts.length > 0 && lgpdConsent && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Estatísticas do Lote {currentBatch}/{totalBatches}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                        <div className="text-2xl font-bold text-gray-900 mb-1">{Math.min(contacts.length, 250)}</div>
                        <div className="text-sm text-gray-600">Contatos (lote atual)</div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                        <div className="text-2xl font-bold text-green-600 mb-1">{Math.min(advancedAutomationStats.totalLeads, 250)}</div>
                        <div className="text-sm text-gray-600">Leads</div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                        <div className="text-2xl font-bold text-purple-600 mb-1">{advancedAutomationStats.totalAdmins}</div>
                        <div className="text-sm text-gray-600">Administradores</div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                        <div className="text-2xl font-bold text-red-600 mb-1">{Math.min(advancedAutomationStats.estimatedGroups, 5)}</div>
                        <div className="text-sm text-gray-600">Grupos (máx 5)</div>
                      </div>
                    </div>
                    
                    {advancedAutomationStats.totalAdmins > 0 && (
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-4">
                        <div className="flex items-start">
                          <Crown className="h-5 w-5 text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                          <div>
                            <h3 className="font-medium text-purple-800 mb-1">Promoção de Administradores</h3>
                            <p className="text-purple-700 text-sm">
                              {advancedAutomationStats.totalAdmins} contatos serão promovidos a administradores ANTES do envio da mensagem de boas-vindas.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="flex items-start">
                        <Shield className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-red-800 mb-1">🛡️ Processamento em Lotes</h3>
                          <p className="text-red-700 text-sm">
                            Processando lote <strong>{currentBatch} de {totalBatches}</strong>. 
                            Cada lote cria no máximo 5 grupos com 50 contatos por grupo.
                          </p>
                          <p className="text-red-700 text-sm mt-2 font-medium">
                            ⚠️ Importante: Processe apenas um lote por dia para evitar banimento!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Integrated Automation Progress */}
                <IntegratedAutomationProgress
                  canStart={canStart}
                  isScheduled={isScheduled}
                  scheduledTime={scheduledDateTime}
                  config={config}
                />
                
                {/* Instruções para Processamento em Lotes */}
                {totalBatches > 1 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 shadow-sm">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="bg-amber-100 p-2 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      </div>
                      <h2 className="text-xl font-semibold text-amber-900">Guia de Processamento em Lotes</h2>
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-amber-800">
                        Seus <strong>4756 contatos</strong> foram divididos em <strong>{totalBatches} lotes</strong> de 250 contatos cada.
                        Siga estas instruções para processar com segurança:
                      </p>
                      
                      <ol className="space-y-3 text-amber-800 list-decimal list-inside">
                        <li className="p-3 bg-amber-100 rounded-lg">
                          <strong>Processe um lote por dia</strong>
                          <p className="text-sm ml-6 mt-1">Aguarde pelo menos 24 horas entre cada lote para evitar banimento.</p>
                        </li>
                        <li className="p-3 bg-amber-100 rounded-lg">
                          <strong>Use o seletor de lotes</strong>
                          <p className="text-sm ml-6 mt-1">Após processar um lote, volte no dia seguinte e selecione o próximo lote.</p>
                        </li>
                        <li className="p-3 bg-amber-100 rounded-lg">
                          <strong>Respeite os limites seguros</strong>
                          <p className="text-sm ml-6 mt-1">Cada lote cria no máximo 5 grupos com 50 contatos por grupo.</p>
                        </li>
                        <li className="p-3 bg-amber-100 rounded-lg">
                          <strong>Mantenha o registro</strong>
                          <p className="text-sm ml-6 mt-1">Anote quais lotes já foram processados para não repetir ou pular.</p>
                        </li>
                      </ol>
                      
                      <div className="p-4 bg-white rounded-lg border border-amber-300">
                        <h3 className="font-medium text-amber-900 mb-2">Cronograma Recomendado:</h3>
                        <div className="text-sm text-amber-800">
                          <p>• <strong>Dia 1:</strong> Lote 1 (contatos 1-250)</p>
                          <p>• <strong>Dia 2:</strong> Lote 2 (contatos 251-500)</p>
                          <p>• <strong>Dia 3:</strong> Lote 3 (contatos 501-750)</p>
                          <p>• <strong>...</strong></p>
                          <p>• <strong>Dia {totalBatches}:</strong> Lote {totalBatches} (últimos contatos)</p>
                        </div>
                      </div>
                    </div>
                  </div>
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-gradient-to-r from-red-100 to-orange-100 p-2 rounded-lg">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                WhatsApp Automation Suite com Processamento em Lotes
              </h3>
            </div>
            <p className="text-gray-600 mb-2">
              🛡️ Automação segura com processamento em lotes: {totalBatches} lotes de 250 contatos, 5 grupos por lote
            </p>
            <p className="text-sm text-gray-500">
              Use com responsabilidade e respeite os termos de uso do WhatsApp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;