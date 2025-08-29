import { promises as fs } from 'fs';
import { join } from 'path';
import { AdminConfig, DEFAULT_ADMIN_CONFIG, AdminConfigUpdate } from '@/types/admin';
import { logger } from '@/utils/logger';

/**
 * Admin Configuration Manager
 * Handles persistent storage and management of admin configurations
 * Completely isolated from main bot functionality
 */
export class AdminConfigManager {
  private static instance: AdminConfigManager;
  private configPath: string;
  private config: AdminConfig;
  private isInitialized = false;

  private constructor() {
    this.configPath = join(process.cwd(), 'config', 'admin-settings.json');
    this.config = { ...DEFAULT_ADMIN_CONFIG };
  }

  public static getInstance(): AdminConfigManager {
    if (!AdminConfigManager.instance) {
      AdminConfigManager.instance = new AdminConfigManager();
    }
    return AdminConfigManager.instance;
  }

  /**
   * Initialize configuration manager
   */
  public async initialize(): Promise<void> {
    try {
      await this.ensureConfigDirectory();
      await this.loadConfig();
      this.isInitialized = true;
      logger.info('Admin configuration manager initialized', {
        configPath: this.configPath
      });
    } catch (error) {
      logger.error('Failed to initialize admin configuration manager', {
        error: error as Error
      });
      // Use default config if file operations fail
      this.config = { ...DEFAULT_ADMIN_CONFIG };
      this.isInitialized = true;
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): AdminConfig {
    if (!this.isInitialized) {
      throw new Error('AdminConfigManager not initialized');
    }
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public async updateConfig(update: AdminConfigUpdate): Promise<AdminConfig> {
    if (!this.isInitialized) {
      throw new Error('AdminConfigManager not initialized');
    }

    try {
      // Create a deep copy to avoid mutations
      const newConfig = JSON.parse(JSON.stringify(this.config)) as AdminConfig;
      
      // Apply the update
      if (update.section && update.field) {
        const section = newConfig[update.section] as any;
        if (section && typeof section === 'object') {
          section[update.field] = update.value;
        }
      }

      // Update metadata
      newConfig.updatedAt = new Date().toISOString();
      newConfig.updatedBy = update.admin;

      // Validate the configuration
      await this.validateConfig(newConfig);

      // Save to file
      await this.saveConfig(newConfig);

      // Update in-memory config
      this.config = newConfig;

      logger.info('Admin configuration updated', {
        section: update.section,
        field: update.field,
        admin: update.admin
      });

      return { ...this.config };
    } catch (error) {
      logger.error('Failed to update admin configuration', {
        error: error as Error,
        update
      });
      throw error;
    }
  }

  /**
   * Update entire configuration section
   */
  public async updateSection<K extends keyof AdminConfig>(
    section: K,
    data: AdminConfig[K],
    admin: string
  ): Promise<AdminConfig> {
    if (!this.isInitialized) {
      throw new Error('AdminConfigManager not initialized');
    }

    try {
      const newConfig = { ...this.config };
      newConfig[section] = data;
      newConfig.updatedAt = new Date().toISOString();
      newConfig.updatedBy = admin;

      await this.validateConfig(newConfig);
      await this.saveConfig(newConfig);
      
      this.config = newConfig;

      logger.info('Admin configuration section updated', {
        section,
        admin
      });

      return { ...this.config };
    } catch (error) {
      logger.error('Failed to update admin configuration section', {
        error: error as Error,
        section
      });
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  public async resetToDefaults(admin: string): Promise<AdminConfig> {
    if (!this.isInitialized) {
      throw new Error('AdminConfigManager not initialized');
    }

    try {
      const newConfig = { 
        ...DEFAULT_ADMIN_CONFIG,
        updatedAt: new Date().toISOString(),
        updatedBy: admin
      };

      await this.saveConfig(newConfig);
      this.config = newConfig;

      logger.info('Admin configuration reset to defaults', { admin });
      return { ...this.config };
    } catch (error) {
      logger.error('Failed to reset admin configuration', {
        error: error as Error,
        admin
      });
      throw error;
    }
  }

  /**
   * Get configuration backup
   */
  public async createBackup(): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('AdminConfigManager not initialized');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(process.cwd(), 'config', `admin-settings-backup-${timestamp}.json`);
    
    try {
      await fs.writeFile(backupPath, JSON.stringify(this.config, null, 2));
      logger.info('Admin configuration backup created', { backupPath });
      return backupPath;
    } catch (error) {
      logger.error('Failed to create admin configuration backup', {
        error: error as Error
      });
      throw error;
    }
  }

  /**
   * Load configuration from file
   */
  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(data) as AdminConfig;
      
      // Validate loaded configuration
      await this.validateConfig(loadedConfig);
      
      this.config = loadedConfig;
      logger.info('Admin configuration loaded from file');
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, create with defaults
        await this.saveConfig(DEFAULT_ADMIN_CONFIG);
        this.config = { ...DEFAULT_ADMIN_CONFIG };
        logger.info('Created new admin configuration file with defaults');
      } else {
        logger.warn('Failed to load admin configuration, using defaults', {
          error: error as Error
        });
        this.config = { ...DEFAULT_ADMIN_CONFIG };
      }
    }
  }

  /**
   * Save configuration to file
   */
  private async saveConfig(config: AdminConfig): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      logger.debug('Admin configuration saved to file');
    } catch (error) {
      logger.error('Failed to save admin configuration', {
        error: error as Error
      });
      throw error;
    }
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDirectory(): Promise<void> {
    const configDir = join(process.cwd(), 'config');
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
      logger.debug('Config directory check', { configDir });
    }
  }

  /**
   * Validate configuration structure
   */
  private async validateConfig(config: AdminConfig): Promise<void> {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration: must be an object');
    }

    // Validate AI section
    if (!config.ai || typeof config.ai !== 'object') {
      throw new Error('Invalid configuration: ai section missing or invalid');
    }

    if (!config.ai.systemPrompt || typeof config.ai.systemPrompt !== 'string') {
      throw new Error('Invalid configuration: ai.systemPrompt must be a string');
    }

    if (typeof config.ai.temperature !== 'number' || config.ai.temperature < 0 || config.ai.temperature > 2) {
      throw new Error('Invalid configuration: ai.temperature must be between 0 and 2');
    }

    if (typeof config.ai.maxTokens !== 'number' || config.ai.maxTokens < 1 || config.ai.maxTokens > 8000) {
      throw new Error('Invalid configuration: ai.maxTokens must be between 1 and 8000');
    }

    if (typeof config.ai.memorySize !== 'number' || config.ai.memorySize < 1 || config.ai.memorySize > 50) {
      throw new Error('Invalid configuration: ai.memorySize must be between 1 and 50');
    }

    // Validate bot section
    if (!config.bot || typeof config.bot !== 'object') {
      throw new Error('Invalid configuration: bot section missing or invalid');
    }

    if (!config.bot.name || typeof config.bot.name !== 'string') {
      throw new Error('Invalid configuration: bot.name must be a string');
    }

    // Validate features section
    if (!config.features || typeof config.features !== 'object') {
      throw new Error('Invalid configuration: features section missing or invalid');
    }

    logger.debug('Admin configuration validation passed');
  }
}

// Export singleton instance
export const adminConfigManager = AdminConfigManager.getInstance();