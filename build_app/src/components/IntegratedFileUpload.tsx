import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, AlertTriangle, Users, Crown, Shield, X, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService, UploadResponse } from '../services/api';
import Papa from 'papaparse';

interface IntegratedFileUploadProps {
  onFileUpload: (stats: UploadResponse['stats'], contacts: any[]) => void;
  onError: (error: string) => void;
  lgpdConsent: boolean;
  manualAdmins: Contact[]; 
}

export interface Contact {
  nome?: string;
  numero: string;
  tipo: 'lead' | 'administrador';
}

export const IntegratedFileUpload: React.FC<IntegratedFileUploadProps> = ({
  onFileUpload,
  onError,
  lgpdConsent,
  manualAdmins
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [totalBatches, setTotalBatches] = useState(1);
  const [showBatchSelector, setShowBatchSelector] = useState(false);

  const BATCH_SIZE = 250; // Tamanho máximo de cada lote (limite seguro)

  const isValidFileType = (filename: string) => {
    const lowerName = filename.toLowerCase();
    return lowerName.endsWith('.csv') || lowerName.endsWith('.txt');
  };

  const processFile = useCallback(async (file: File) => {
    console.log('📁 Processando arquivo:', file.name);

    if (!lgpdConsent) {
      onError('É necessário aceitar os termos LGPD antes de fazer upload de contatos');
      return;
    }

    if (!isValidFileType(file.name)) {
      onError('Por favor, selecione um arquivo CSV ou TXT válido');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);
    setUploadResult(null);

    try {
      console.log('🔄 Lendo arquivo local...');
      const fileText = await file.text();

      // Detecta o formato do arquivo
      let csvText = fileText;
      
      // Se for TXT, tenta converter para CSV
      if (file.name.toLowerCase().endsWith('.txt')) {
        console.log('📄 Arquivo TXT detectado, convertendo para CSV...');
        
        // Detecta o separador (vírgula, ponto e vírgula, tab, pipe)
        const separators = [',', ';', '\t', '|'];
        let bestSeparator = ',';
        let maxColumns = 0;
        
        for (const sep of separators) {
          const lines = fileText.trim().split('\n');
          if (lines.length > 0) {
            const columns = lines[0].split(sep).length;
            if (columns > maxColumns) {
              maxColumns = columns;
              bestSeparator = sep;
            }
          }
        }
        
        console.log(`🔍 Separador detectado: "${bestSeparator}" (${maxColumns} colunas)`);
        
        // Converte TXT para CSV usando o separador detectado
        const lines = fileText.trim().split('\n');
        
        // Se não há cabeçalho, adiciona um baseado no número de colunas
        let csvLines = [];
        const firstLine = lines[0];
        const firstLineParts = firstLine.split(bestSeparator);
        
        // Detecta se a primeira linha é cabeçalho ou dados
        const hasHeader = firstLineParts.some(part => 
          part.toLowerCase().includes('nome') || 
          part.toLowerCase().includes('numero') || 
          part.toLowerCase().includes('tipo')
        );
        
        if (!hasHeader) {
          // Adiciona cabeçalho baseado no número de colunas
          if (firstLineParts.length === 2) {
            csvLines.push('nome,numero');
          } else if (firstLineParts.length === 3) {
            csvLines.push('nome,numero,tipo');
          } else {
            csvLines.push('nome,numero');
          }
        }
        
        // Processa as linhas de dados
        const dataLines = hasHeader ? lines.slice(1) : lines;
        
        for (const line of dataLines) {
          const parts = line.split(bestSeparator);
          
          if (parts.length >= 2) {
            // Limpa os dados
            const nome = parts[0] ? parts[0].trim() : '';
            const numero = parts[1] ? parts[1].trim() : '';
            const tipo = parts[2] ? parts[2].trim().toLowerCase() : 'lead';
            
            // Valida se tem número
            if (numero) {
              // Garante que cada parte esteja entre aspas se contiver vírgulas
              const csvParts = [
                nome.includes(',') ? `"${nome}"` : nome,
                numero.includes(',') ? `"${numero}"` : numero,
                tipo.includes(',') ? `"${tipo}"` : tipo
              ];
              csvLines.push(csvParts.join(','));
            }
          }
        }
        
        csvText = csvLines.join('\n');
        console.log('✅ Conversão TXT → CSV concluída');
        console.log('📋 CSV gerado:', csvText.split('\n').slice(0, 3).join('\n') + '...');
      }

      // Parse o CSV
      const parsed = Papa.parse<any>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim()
      });

      if (parsed.errors.length > 0) {
        console.warn('⚠️ Avisos no parse do CSV:', parsed.errors);
      }

      console.log('📊 Dados parseados:', parsed.data.slice(0, 3));

      // Processa os dados e adiciona tipo padrão se não existir
      const processedContacts: Contact[] = parsed.data
        .filter((row) => {
          // Verifica se tem número em qualquer uma das possíveis colunas
          return row.numero || row.number || Object.values(row).some(val => 
            typeof val === 'string' && val.match(/^\d{10,15}$/)
          );
        })
        .map((row) => {
          // Tenta encontrar o número em diferentes colunas
          let numero = row.numero || row.number;
          
          // Se não encontrou, procura por um valor que pareça um número
          if (!numero) {
            const values = Object.values(row);
            numero = values.find(val => 
              typeof val === 'string' && val.match(/^\d{10,15}$/)
            ) as string;
          }
          
          // Tenta encontrar o nome
          let nome = row.nome || row.name || '';
          
          // Se não encontrou nome, pega o primeiro valor que não é número
          if (!nome) {
            const values = Object.values(row);
            nome = values.find(val => 
              typeof val === 'string' && !val.match(/^\d{10,15}$/)
            ) as string || '';
          }
          
          return {
            nome: nome.trim(),
            numero: numero.trim(),
            tipo: (row.tipo ? row.tipo.toLowerCase() : 'lead') as 'lead' | 'administrador'
          };
        })
        .filter((contact) => {
          // Valida se o tipo é válido e se tem número
          return contact.numero && (contact.tipo === 'lead' || contact.tipo === 'administrador');
        });

      console.log(`📊 Arquivo processado: ${processedContacts.length} contatos válidos`);
      console.log('👥 Primeiros contatos:', processedContacts.slice(0, 3));
      console.log('➕ Adicionando administradores manuais:', manualAdmins);

      // Junta os contatos do arquivo com os admins da tela
      const allProcessedContacts: Contact[] = [...processedContacts, ...manualAdmins];

      // ORDENA: Administradores primeiro, depois leads
      allProcessedContacts.sort((a, b) => {
        if (a.tipo === b.tipo) return 0;
        if (a.tipo === 'administrador') return -1; // Administradores primeiro
        return 1; // Leads depois
      });

      // Calcula o número de lotes necessários
      const totalBatches = Math.ceil(allProcessedContacts.length / BATCH_SIZE);
      setTotalBatches(totalBatches);
      setCurrentBatch(1);
      setAllContacts(allProcessedContacts);
      
      console.log(`📦 Total de contatos: ${allProcessedContacts.length}`);
      console.log(`📦 Dividido em ${totalBatches} lotes de ${BATCH_SIZE} contatos`);

      // Seleciona o primeiro lote
      const firstBatch = allProcessedContacts.slice(0, BATCH_SIZE);
      
      // Converte o primeiro lote para CSV
      const batchCSV = Papa.unparse(firstBatch, {
        columns: ['nome', 'numero', 'tipo'],
      });

      // Cria um novo arquivo para enviar
      const batchFile = new File([batchCSV], `batch1_${file.name}`, {
        type: 'text/csv',
      });

      console.log('📤 Enviando lote 1 para o backend...');
      const result = await apiService.uploadCSV(batchFile);
      console.log('✅ Resultado do backend:', result);

      setUploadResult(result);
      
      // Atualiza estatísticas para mostrar o total e o lote atual
      const totalStats = {
        ...result.stats,
        totalOriginalContacts: allProcessedContacts.length,
        currentBatch: 1,
        totalBatches: totalBatches
      };
      
      // Mostra o seletor de lotes se houver mais de um lote
      if (totalBatches > 1) {
        setShowBatchSelector(true);
      }
      
      // Passa os contatos do primeiro lote
      onFileUpload(totalStats, firstBatch);
      
      if (allProcessedContacts.length > BATCH_SIZE) {
        onError(`⚠️ Arquivo grande detectado: ${allProcessedContacts.length} contatos divididos em ${totalBatches} lotes de ${BATCH_SIZE} contatos (proteção anti-ban)`);
      } else {
        onError('');
      }

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar arquivo';
      onError(errorMessage);
      setSelectedFile(null);
      setUploadResult(null);
    } finally {
      setIsUploading(false);
    }
  }, [onFileUpload, onError, lgpdConsent, manualAdmins]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!lgpdConsent || isUploading) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile, lgpdConsent, isUploading]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (lgpdConsent && !isUploading) {
      setIsDragOver(true);
    }
  }, [lgpdConsent, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (lgpdConsent && !isUploading) {
      document.getElementById('csv-file-input')?.click();
    }
  }, [lgpdConsent, isUploading]);

  const removeFile = useCallback(() => {
    console.log('🗑️ Removendo arquivo e limpando estado');
    setSelectedFile(null);
    setUploadResult(null);
    setAllContacts([]);
    setCurrentBatch(1);
    setTotalBatches(1);
    setShowBatchSelector(false);
    
    // Reset the input
    const input = document.getElementById('csv-file-input') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
    
    // Limpa o estado da aplicação principal
    onError('');
  }, [onError]);

  // Função para mudar o lote atual
  const changeBatch = useCallback((batchNumber: number) => {
    if (batchNumber < 1 || batchNumber > totalBatches || !allContacts.length) return;
    
    setCurrentBatch(batchNumber);
    
    // Seleciona o lote correspondente
    const startIndex = (batchNumber - 1) * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, allContacts.length);
    const batchContacts = allContacts.slice(startIndex, endIndex);
    
    // Atualiza as estatísticas
    if (uploadResult) {
      const batchStats = {
        ...uploadResult.stats,
        totalContacts: batchContacts.length,
        totalLeads: batchContacts.filter(c => c.tipo === 'lead').length,
        totalAdmins: batchContacts.filter(c => c.tipo === 'administrador').length,
        estimatedGroups: Math.min(Math.ceil(batchContacts.filter(c => c.tipo === 'lead').length / 50), 5),
        totalOriginalContacts: allContacts.length,
        currentBatch: batchNumber,
        totalBatches: totalBatches
      };
      
      // Passa os contatos do lote selecionado
      onFileUpload(batchStats, batchContacts);
      onError(`⚠️ Processando lote ${batchNumber}/${totalBatches}: ${batchContacts.length} contatos (de um total de ${allContacts.length})`);
    }
  }, [allContacts, totalBatches, uploadResult, onFileUpload, onError]);

  return (
    <div className="space-y-6">
      {!lgpdConsent && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-medium text-red-800">Consentimento LGPD Necessário</h3>
              <p className="text-red-700 mt-1">
                É necessário aceitar os termos de proteção de dados antes de fazer upload de contatos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Limites Seguros */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-6 w-6 text-red-600" />
          <h3 className="font-medium text-red-800">🛡️ Processamento em Lotes com Proteção Anti-Ban</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-red-700">
          <div>
            <p className="font-medium mb-2">Processamento em Lotes:</p>
            <ul className="space-y-1">
              <li>• <strong>Máximo 250 contatos por lote</strong></li>
              <li>• <strong>Máximo 5 grupos por lote</strong></li>
              <li>• <strong>50 contatos por grupo</strong> (limite seguro)</li>
              <li>• <strong>Arquivos grandes</strong> são divididos automaticamente</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Proteção Anti-Ban:</p>
            <ul className="space-y-1">
              <li>• <strong>8-18 segundos</strong> entre contatos</li>
              <li>• <strong>2-5 minutos</strong> entre grupos</li>
              <li>• <strong>Máximo 3 grupos</strong> por sessão</li>
              <li>• <strong>Pausa de 30 min</strong> entre sessões</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 bg-red-100 rounded border border-red-300">
          <p className="text-sm text-red-800">
            <strong>⚠️ IMPORTANTE:</strong> Para arquivos grandes (como seus 4756 contatos), o sistema dividirá automaticamente em lotes de 250 contatos. 
            Processe um lote por vez e aguarde pelo menos 24 horas entre lotes para máxima segurança.
          </p>
        </div>
      </div>

      {/* Seletor de Lotes */}
      {showBatchSelector && allContacts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-medium text-blue-800">Seletor de Lotes</h3>
            </div>
            <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              {currentBatch}/{totalBatches} lotes
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-blue-700">
              Seu arquivo tem <strong>{allContacts.length} contatos</strong> e foi dividido em <strong>{totalBatches} lotes</strong> de {BATCH_SIZE} contatos.
              Selecione qual lote deseja processar:
            </p>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => changeBatch(currentBatch - 1)}
                disabled={currentBatch === 1}
                className="p-2 bg-blue-100 rounded-full disabled:opacity-50"
              >
                <ChevronDown className="h-5 w-5 text-blue-700" />
              </button>
              
              <select 
                value={currentBatch}
                onChange={(e) => changeBatch(parseInt(e.target.value))}
                className="flex-1 px-4 py-2 border border-blue-300 rounded-lg"
              >
                {Array.from({length: totalBatches}, (_, i) => i + 1).map(batch => (
                  <option key={batch} value={batch}>
                    Lote {batch}: contatos {(batch-1)*BATCH_SIZE+1}-{Math.min(batch*BATCH_SIZE, allContacts.length)}
                  </option>
                ))}
              </select>
              
              <button 
                onClick={() => changeBatch(currentBatch + 1)}
                disabled={currentBatch === totalBatches}
                className="p-2 bg-blue-100 rounded-full disabled:opacity-50"
              >
                <ChevronUp className="h-5 w-5 text-blue-700" />
              </button>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                <p className="text-sm text-yellow-800">
                  <strong>Recomendação de segurança:</strong> Processe um lote por dia para evitar banimento.
                  Após processar um lote, aguarde pelo menos 24 horas antes de processar o próximo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Result Success */}
      {uploadResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">✅ Arquivo processado com proteção anti-ban!</p>
                <p className="text-sm text-green-700">
                  {showBatchSelector 
                    ? `Lote ${currentBatch}/${totalBatches}: ${Math.min(uploadResult.stats.totalContacts, 250)} contatos`
                    : `${Math.min(uploadResult.stats.totalContacts, 250)} contatos carregados • ${Math.min(uploadResult.stats.estimatedGroups, 5)} grupos estimados`
                  }
                </p>
                {showBatchSelector && (
                  <p className="text-sm text-orange-700 font-medium">
                    ⚠️ Processando {Math.min(uploadResult.stats.totalContacts, 250)} contatos de um total de {allContacts.length}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-1 hover:bg-green-100 rounded-full transition-colors"
              title="Carregar outro arquivo"
            >
              <X className="h-4 w-4 text-green-600" />
            </button>
          </div>
        </div>
      )}

      {/* Arquivo Selecionado (mas não processado ainda) */}
      {selectedFile && !uploadResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">{selectedFile.name}</p>
                <p className="text-sm text-blue-700">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.name.toLowerCase().endsWith('.txt') ? 'TXT' : 'CSV'}
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-1 hover:bg-blue-100 rounded-full transition-colors"
              title="Remover arquivo"
            >
              <X className="h-4 w-4 text-blue-600" />
            </button>
          </div>
          {isUploading && (
            <div className="mt-3 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-700">
                {selectedFile.name.toLowerCase().endsWith('.txt') 
                  ? 'Convertendo TXT para CSV e aplicando limites seguros...' 
                  : 'Processando arquivo CSV e aplicando proteção anti-ban...'}
              </span>
            </div>
          )}
        </div>
      )}

      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
          isDragOver
            ? 'border-blue-400 bg-blue-50 scale-105'
            : lgpdConsent && !isUploading
              ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isUploading ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600 font-medium">
              {selectedFile?.name.toLowerCase().endsWith('.txt') 
                ? 'Convertendo TXT e aplicando limites seguros...' 
                : 'Processando arquivo CSV e aplicando proteção anti-ban...'}
            </p>
            <p className="text-xs text-gray-500">Aplicando limites seguros: máx 250 contatos por lote, 5 grupos</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Upload className={`mx-auto h-16 w-16 ${lgpdConsent ? 'text-gray-400' : 'text-gray-300'}`} />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${lgpdConsent ? 'text-gray-900' : 'text-gray-500'}`}>
              {uploadResult ? '✅ Arquivo processado com proteção anti-ban!' : selectedFile ? '📁 Arquivo selecionado' : 'Arraste o arquivo CSV ou TXT aqui'}
            </h3>
            <p className={`mb-2 ${lgpdConsent ? 'text-gray-500' : 'text-gray-400'}`}>
              {uploadResult ? 'Clique para carregar outro arquivo' : selectedFile ? 'Clique para selecionar outro arquivo' : 'ou clique para selecionar do seu computador'}
            </p>
            <p className={`text-sm font-medium mb-6 ${lgpdConsent ? 'text-blue-600' : 'text-gray-400'}`}>
              ⚡ Suporte para CSV e TXT • Detecção automática • Processamento em lotes
            </p>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileInput}
              disabled={!lgpdConsent || isUploading}
              className="hidden"
            />
            <button 
              disabled={!lgpdConsent || isUploading}
              className={`px-8 py-4 rounded-lg font-medium shadow-lg transition-all duration-200 ${
                lgpdConsent && !isUploading
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (lgpdConsent && !isUploading) {
                  document.getElementById('csv-file-input')?.click();
                }
              }}
            >
              {uploadResult ? '📁 Carregar Outro Arquivo' : selectedFile ? '📁 Selecionar Outro Arquivo' : '📁 Selecionar Arquivo CSV/TXT'}
            </button>
          </>
        )}
      </div>

      {uploadResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <FileText className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Resultado do Processamento com Proteção Anti-Ban</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-bold text-xl text-green-900">
                  {showBatchSelector 
                    ? `${Math.min(uploadResult.stats.totalContacts, 250)}/${allContacts.length}`
                    : Math.min(uploadResult.stats.totalContacts, 250).toLocaleString()
                  }
                </p>
                <p className="text-sm text-green-700">Contatos (máx 250)</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Users className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-bold text-xl text-blue-900">{Math.min(uploadResult.stats.totalLeads, 250).toLocaleString()}</p>
                <p className="text-sm text-blue-700">Leads</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Crown className="h-6 w-6 text-purple-600" />
              <div>
                <p className="font-bold text-xl text-purple-900">{uploadResult.stats.totalAdmins}</p>
                <p className="text-sm text-purple-700">Administradores</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <Shield className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-bold text-xl text-red-900">{Math.min(uploadResult.stats.estimatedGroups, 5)}</p>
                <p className="text-sm text-red-700">Grupos (máx 5)</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-green-900">Arquivo processado com proteção anti-ban!</h4>
            </div>
            <p className="text-sm text-green-800">{uploadResult.stats.validationMessage}</p>
            <p className="text-xs text-green-700 mt-1">
              Arquivo salvo no backend: {uploadResult.filename}
            </p>
            {showBatchSelector && (
              <p className="text-sm text-orange-700 font-medium mt-2">
                ⚠️ Processando lote {currentBatch}/{totalBatches} ({Math.min(uploadResult.stats.totalContacts, 250)} contatos de {allContacts.length})
              </p>
            )}
            {!showBatchSelector && uploadResult.stats.totalContacts > 250 && (
              <p className="text-sm text-orange-700 font-medium mt-2">
                ⚠️ Limitado a 250 contatos para proteção anti-ban (original: {uploadResult.stats.totalContacts})
              </p>
            )}
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-blue-900">Ordenação e Limites Aplicados</h4>
            </div>
            <p className="text-sm text-blue-800">
              Contatos ordenados automaticamente: <strong>Administradores primeiro</strong>, depois leads.
              {uploadResult.stats.totalAdmins > 0 && (
                <span className="block mt-1">
                  👑 {uploadResult.stats.totalAdmins} administradores serão promovidos em todos os grupos.
                </span>
              )}
              <span className="block mt-1 font-medium text-red-700">
                🛡️ Limites seguros: máx 5 grupos, 50 contatos/grupo, delays anti-ban aplicados.
              </span>
            </p>
          </div>

          {uploadResult.contacts && uploadResult.contacts.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-3">Preview dos Contatos (primeiros 10 - com limites seguros)</h4>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 border-b">Nome</th>
                      <th className="text-left p-2 border-b">Número</th>
                      <th className="text-left p-2 border-b">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.contacts.slice(0, 10).map((contact, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{contact.nome || '(sem nome)'}</td>
                        <td className="p-2 font-mono">{contact.numero}</td>
                        <td className="p-2">
                          {contact.tipo === 'administrador' ? (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">Admin</span>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Lead</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Formatos Suportados com Proteção Anti-Ban</span>
        </h3>
        <div className="space-y-4">
          <p className="text-sm text-blue-800">
            O sistema aceita qualquer formato de arquivo TXT ou CSV com <strong>limites seguros aplicados automaticamente</strong>!
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">📄 Seu Formato (Suportado!)</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Exemplo do seu arquivo:</strong></p>
                <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                  Allan Kardec,118949488419008<br/>
                  Allan Kardec,556295530160<br/>
                  Allan Maciel,111531794690141<br/>
                  Allan Maciel,556296653224<br/>
                  Allana Christina,556293075183
                </div>
                <p className="text-green-600 text-xs mt-1">
                  ✅ Detecta automaticamente: nome,numero<br/>
                  ✅ Todos viram "lead" por padrão<br/>
                  ✅ Ordenação automática aplicada<br/>
                  🛡️ <strong>Processamento em lotes aplicado</strong>
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">📝 Outros Formatos</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Com separadores diferentes:</strong></p>
                <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                  Nome;Numero;Tipo<br/>
                  João Silva;5562999999999;lead<br/>
                  Maria Admin;5562888888888;administrador
                </div>
                <div className="bg-gray-100 p-2 rounded font-mono text-xs mt-1">
                  Nome|Numero<br/>
                  João Silva|5562999999999<br/>
                  Maria Santos|5562888888888
                </div>
                <p className="text-green-600 text-xs mt-1">
                  ✅ Detecta: vírgula, ponto e vírgula, pipe, tab<br/>
                  🛡️ <strong>Processamento em lotes aplicado</strong>
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h4 className="font-medium text-red-800 mb-2">🛡️ Processamento em Lotes</h4>
            <div className="text-xs text-red-700 space-y-1">
              <p>• <strong>Arquivos grandes:</strong> Divididos em lotes de 250 contatos</p>
              <p>• <strong>Seletor de lotes:</strong> Permite escolher qual lote processar</p>
              <p>• <strong>Segurança máxima:</strong> Processe um lote por dia</p>
              <p>• <strong>Limites por lote:</strong> Máximo 5 grupos, 50 contatos por grupo</p>
              <p>• <strong>Delays obrigatórios:</strong> 8-18s entre contatos, 2-5min entre grupos</p>
              <p>• <strong>Sessões limitadas:</strong> Máximo 3 grupos por sessão, pausa de 30min entre sessões</p>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">✅ Seu Arquivo Será Processado Como:</h4>
            <div className="text-xs text-green-700 space-y-1">
              <p>• <strong>Allan Kardec,118949488419008</strong> → Nome: "Allan Kardec", Número: "118949488419008", Tipo: "lead"</p>
              <p>• <strong>Allan Kardec,556295530160</strong> → Nome: "Allan Kardec", Número: "556295530160", Tipo: "lead"</p>
              <p>• <strong>Allana Christina,556293075183</strong> → Nome: "Allana Christina", Número: "556293075183", Tipo: "lead"</p>
              <p className="text-green-600 font-medium mt-2">🎯 Todos os contatos serão aceitos e processados em lotes seguros!</p>
              <p className="text-red-600 font-medium mt-1">🛡️ Seus 4756 contatos serão divididos em 20 lotes de 250 contatos cada!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};