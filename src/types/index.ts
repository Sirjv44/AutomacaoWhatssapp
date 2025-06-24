export interface Contact {
  nome?: string;
  numero: string;
  tipo: 'lead' | 'administrador';
}

export interface ExtractedContact {
  nome?: string;
  numero: string;
  grupo: string;
  isAdmin?: boolean;
  extractedAt: string;
}

export interface GroupConfig {
  baseName: string;
  maxMembers: number;
  delay: { min: number; max: number };
  groupDelay: { min: number; max: number }; // Novo: delay entre grupos
  createMultiple: boolean;
  welcomeMessage: string;
  enableScheduling: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  enableBanPrevention: boolean; // Novo: prevenção de banimento
  maxGroupsPerSession: number; // Novo: limite de grupos por sessão
}

export interface BatchGroup {
  groupName: string;
  leads: Contact[];
  admins: Contact[];
  totalMembers: number;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'paused';
  welcomeMessageSent: boolean;
  createdAt?: string;
  lastActivity?: string;
}

export interface AutomationReport {
  groupName: string;
  membersAdded: Contact[];
  adminsPromoted: Contact[];
  errors: Array<{
    contact: Contact;
    error: string;
  }>;
  timestamp: string;
  totalMembers: number;
  welcomeMessageSent: boolean;
  sessionId: string; // Novo: identificador da sessão
}

export interface AutomationStatus {
  isRunning: boolean;
  isPaused: boolean; // Novo: estado de pausa
  currentStep: string;
  progress: number;
  totalContacts: number;
  processedContacts: number;
  currentGroup: string;
  currentGroupIndex: number;
  totalGroups: number;
  logs: string[];
  estimatedTimeRemaining: string;
  canResume: boolean;
  sessionPersisted: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'; // Novo: status da conexão
  lastBackup?: string; // Novo: timestamp do último backup
  currentSessionId: string; // Novo: ID da sessão atual
  groupsInCurrentSession: number; // Novo: grupos criados na sessão atual
}

export interface ExtractionStatus {
  isRunning: boolean;
  currentStep: string;
  progress: number;
  totalGroups: number;
  processedGroups: number;
  currentGroup: string;
  logs: string[];
  estimatedTimeRemaining: string;
  extractedContacts: ExtractedContact[];
  uniqueContacts: number;
  duplicatesFound: number;
}

export interface ValidationResult {
  valid: number;
  invalid: number;
  errors: string[];
  warnings: string[];
}

export interface AdvancedAutomationStats {
  totalContacts: number;
  totalLeads: number;
  totalAdmins: number;
  estimatedGroups: number;
  estimatedTime: string;
  batchGroups: BatchGroup[];
  lgpdConsent: boolean;
  estimatedSessions: number; // Novo: sessões estimadas
  avgGroupsPerSession: number; // Novo: média de grupos por sessão
}

export interface ProgressState {
  currentGroupIndex: number;
  processedContacts: Contact[];
  completedGroups: string[];
  errors: Array<{ contact: Contact; error: string; groupName: string }>;
  timestamp: string;
  sessionId: string; // Novo: ID da sessão
  connectionLost: boolean; // Novo: flag de conexão perdida
  lastSuccessfulOperation: string; // Novo: última operação bem-sucedida
}

export interface SessionBackup {
  sessionId: string;
  timestamp: string;
  config: GroupConfig;
  progress: ProgressState;
  reports: AutomationReport[];
  connectionStatus: string;
  groupsCompleted: number;
  totalGroups: number;
}

export interface BanPreventionConfig {
  enabled: boolean;
  maxGroupsPerHour: number;
  cooldownBetweenSessions: number; // em minutos
  detectDisconnection: boolean;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
}

export interface ExtractionConfig {
  groupNameFilter?: string;
  includeAdmins: boolean;
  removeDuplicates: boolean;
  delay: { min: number; max: number };
}

export interface ExtractionReport {
  totalGroupsScanned: number;
  totalContactsExtracted: number;
  uniqueContacts: number;
  duplicatesRemoved: number;
  groupsWithErrors: string[];
  extractionTime: string;
  timestamp: string;
}