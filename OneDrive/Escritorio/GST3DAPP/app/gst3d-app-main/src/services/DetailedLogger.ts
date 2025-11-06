import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  category: string;
  message: string;
  data?: any;
  stackTrace?: string;
}

export interface LogMetrics {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  lastLogTime: string;
  categories: Record<string, number>;
}

/**
 * Sistema de logging detallado para diagnóstico de problemas
 */
export class DetailedLogger {
  private static instance: DetailedLogger;
  private readonly LOGS_KEY = '@gst3d_detailed_logs';
  private readonly METRICS_KEY = '@gst3d_log_metrics';
  private readonly MAX_LOGS = 1000; // Máximo número de logs a mantener
  
  private logs: LogEntry[] = [];
  private metrics: LogMetrics = {
    totalLogs: 0,
    errorCount: 0,
    warningCount: 0,
    lastLogTime: '',
    categories: {}
  };

  private constructor() {
    this.loadLogs();
  }

  public static getInstance(): DetailedLogger {
    if (!DetailedLogger.instance) {
      DetailedLogger.instance = new DetailedLogger();
    }
    return DetailedLogger.instance;
  }

  /**
   * Log de información
   */
  public info(category: string, message: string, data?: any): void {
    this.log('INFO', category, message, data);
  }

  /**
   * Log de advertencia
   */
  public warn(category: string, message: string, data?: any): void {
    this.log('WARN', category, message, data);
  }

  /**
   * Log de error
   */
  public error(category: string, message: string, error?: Error | any, data?: any): void {
    const errorData = {
      ...data,
      errorMessage: error?.message,
      errorName: error?.name,
      errorCode: error?.code,
      errorStack: error?.stack
    };
    
    this.log('ERROR', category, message, errorData, error?.stack);
  }

  /**
   * Log de debug
   */
  public debug(category: string, message: string, data?: any): void {
    this.log('DEBUG', category, message, data);
  }

  /**
   * Log principal
   */
  private log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', category: string, message: string, data?: any, stackTrace?: string): void {
    const timestamp = new Date().toISOString();
    
    const logEntry: LogEntry = {
      timestamp,
      level,
      category,
      message,
      data,
      stackTrace
    };

    // Agregar a logs en memoria
    this.logs.push(logEntry);
    
    // Actualizar métricas
    this.updateMetrics(logEntry);
    
    // Log a consola con formato detallado
    const consoleMessage = this.formatConsoleMessage(logEntry);
    
    switch (level) {
      case 'ERROR':
        console.error(consoleMessage);
        break;
      case 'WARN':
        console.warn(consoleMessage);
        break;
      case 'DEBUG':
        console.debug(consoleMessage);
        break;
      default:
        console.log(consoleMessage);
    }

    // Guardar logs periódicamente
    if (this.logs.length % 10 === 0) {
      this.saveLogs();
    }

    // Mantener límite de logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }
  }

  /**
   * Formatear mensaje para consola
   */
  private formatConsoleMessage(logEntry: LogEntry): string {
    const { timestamp, level, category, message, data } = logEntry;
    const time = new Date(timestamp).toLocaleTimeString();
    
    let formatted = `[${time}] [${level}] [${category}] ${message}`;
    
    if (data) {
      formatted += `\n   Data: ${JSON.stringify(data, null, 2)}`;
    }
    
    if (logEntry.stackTrace) {
      formatted += `\n   Stack: ${logEntry.stackTrace}`;
    }
    
    return formatted;
  }

  /**
   * Actualizar métricas
   */
  private updateMetrics(logEntry: LogEntry): void {
    this.metrics.totalLogs++;
    this.metrics.lastLogTime = logEntry.timestamp;
    
    if (logEntry.level === 'ERROR') {
      this.metrics.errorCount++;
    } else if (logEntry.level === 'WARN') {
      this.metrics.warningCount++;
    }
    
    this.metrics.categories[logEntry.category] = (this.metrics.categories[logEntry.category] || 0) + 1;
  }

  /**
   * Guardar logs en AsyncStorage
   */
  private async saveLogs(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.LOGS_KEY, JSON.stringify(this.logs));
      await AsyncStorage.setItem(this.METRICS_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  }

  /**
   * Cargar logs desde AsyncStorage
   */
  private async loadLogs(): Promise<void> {
    try {
      const logsData = await AsyncStorage.getItem(this.LOGS_KEY);
      const metricsData = await AsyncStorage.getItem(this.METRICS_KEY);
      
      if (logsData) {
        this.logs = JSON.parse(logsData);
      }
      
      if (metricsData) {
        this.metrics = JSON.parse(metricsData);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }

  /**
   * Obtener logs por categoría
   */
  public getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Obtener logs por nivel
   */
  public getLogsByLevel(level: string): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Obtener logs recientes
   */
  public getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Obtener métricas
   */
  public getMetrics(): LogMetrics {
    return { ...this.metrics };
  }

  /**
   * Limpiar logs
   */
  public async clearLogs(): Promise<void> {
    this.logs = [];
    this.metrics = {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      lastLogTime: '',
      categories: {}
    };
    
    await AsyncStorage.removeItem(this.LOGS_KEY);
    await AsyncStorage.removeItem(this.METRICS_KEY);
  }

  /**
   * Obtener resumen de logs
   */
  public getLogSummary(): string {
    const recentLogs = this.getRecentLogs(20);
    const errors = this.getLogsByLevel('ERROR');
    const warnings = this.getLogsByLevel('WARN');
    
    return `
📊 LOG SUMMARY:
   Total logs: ${this.metrics.totalLogs}
   Errors: ${errors.length}
   Warnings: ${warnings.length}
   Last log: ${this.metrics.lastLogTime}
   
🔍 RECENT ACTIVITY:
${recentLogs.map(log => `   [${log.level}] ${log.category}: ${log.message}`).join('\n')}
   
❌ RECENT ERRORS:
${errors.slice(-5).map(log => `   ${log.category}: ${log.message}`).join('\n')}
    `;
  }

  /**
   * Forzar guardado de logs
   */
  public async flush(): Promise<void> {
    await this.saveLogs();
  }
}

















