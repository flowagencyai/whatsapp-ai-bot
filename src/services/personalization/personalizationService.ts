import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { UserPersonalizationConfig, DEFAULT_USER_CONFIG, DEFAULT_ADMIN_CONFIG } from '../../types/admin.js';
import { logger } from '../../utils/logger.js';

class PersonalizationService {
  private static instance: PersonalizationService;
  private configPath: string;
  private userConfigs: Map<string, UserPersonalizationConfig>;

  private constructor() {
    this.configPath = join(process.cwd(), 'config', 'user-personalizations.json');
    this.userConfigs = new Map();
    this.loadConfigurations();
  }

  public static getInstance(): PersonalizationService {
    if (!PersonalizationService.instance) {
      PersonalizationService.instance = new PersonalizationService();
    }
    return PersonalizationService.instance;
  }

  /**
   * Load user configurations from file
   */
  private loadConfigurations(): void {
    try {
      if (existsSync(this.configPath)) {
        const configData = readFileSync(this.configPath, 'utf-8');
        const configs = JSON.parse(configData) as { userConfigs: UserPersonalizationConfig[] };
        
        // Load into memory map for fast access
        for (const config of configs.userConfigs || []) {
          this.userConfigs.set(config.userId, config);
        }
        
        logger.info(`Loaded ${this.userConfigs.size} user personalization configs`);
      } else {
        // Create empty config file
        this.saveConfigurations();
        logger.info('Created new user personalizations config file');
      }
    } catch (error) {
      logger.error('Failed to load user personalizations', { error: error as Error });
      this.userConfigs.clear();
    }
  }

  /**
   * Save configurations to file
   */
  private saveConfigurations(): void {
    try {
      const configData = {
        userConfigs: Array.from(this.userConfigs.values()),
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };
      
      writeFileSync(this.configPath, JSON.stringify(configData, null, 2));
      logger.info('User personalizations saved successfully');
    } catch (error) {
      logger.error('Failed to save user personalizations', { error: error as Error });
      throw error;
    }
  }

  /**
   * Get user personalization config or create default
   */
  public getUserConfig(userId: string, userPhone: string): UserPersonalizationConfig {
    let config = this.userConfigs.get(userId);
    
    if (!config) {
      // Create new config with defaults
      config = {
        ...DEFAULT_USER_CONFIG,
        userId,
        phone: userPhone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
      };
      
      this.userConfigs.set(userId, config);
      this.saveConfigurations();
      
      logger.info('Created new user personalization config', { userId, userPhone });
    }
    
    return config;
  }

  /**
   * Update user personalization config
   */
  public updateUserConfig(
    userId: string,
    updates: Partial<Omit<UserPersonalizationConfig, 'userId' | 'phone' | 'createdAt'>>,
    updatedBy: string = 'user'
  ): UserPersonalizationConfig {
    const existingConfig = this.userConfigs.get(userId);
    
    if (!existingConfig) {
      throw new Error(`User config not found: ${userId}`);
    }

    // Merge updates with existing config
    const updatedConfig: UserPersonalizationConfig = {
      ...existingConfig,
      ...updates,
      userId: existingConfig.userId, // Never change these
      phone: existingConfig.phone,
      createdAt: existingConfig.createdAt,
      updatedAt: new Date().toISOString(),
      updatedBy
    };

    this.userConfigs.set(userId, updatedConfig);
    this.saveConfigurations();
    
    logger.info('Updated user personalization config', { 
      userId, 
      updatedBy,
      changes: Object.keys(updates) 
    });
    
    return updatedConfig;
  }

  /**
   * Delete user personalization config
   */
  public deleteUserConfig(userId: string): boolean {
    const deleted = this.userConfigs.delete(userId);
    if (deleted) {
      this.saveConfigurations();
      logger.info('Deleted user personalization config', { userId });
    }
    return deleted;
  }

  /**
   * Get personalized system prompt for user
   * Combines global admin config with user personalization
   */
  public getPersonalizedSystemPrompt(userId: string, userPhone: string): string {
    const userConfig = this.getUserConfig(userId, userPhone);
    
    // Start with global default
    let systemPrompt = DEFAULT_ADMIN_CONFIG.ai.systemPrompt;
    
    // Add user's custom personality if set
    if (userConfig.ai.personality) {
      systemPrompt += `\n\nPERSONALIDADE PERSONALIZADA:\n${userConfig.ai.personality}`;
    }
    
    // Add user's important information if set
    if (userConfig.ai.importantInfo) {
      systemPrompt += `\n\nINFORMAÇÕES IMPORTANTES SOBRE ESTE USUÁRIO:\n${userConfig.ai.importantInfo}`;
    }
    
    // Add custom system prompt if set (overrides default)
    if (userConfig.ai.systemPrompt) {
      systemPrompt = userConfig.ai.systemPrompt;
      
      // Still add personality and info if they exist
      if (userConfig.ai.personality) {
        systemPrompt += `\n\nPERSONALIDADE:\n${userConfig.ai.personality}`;
      }
      if (userConfig.ai.importantInfo) {
        systemPrompt += `\n\nINFORMAÇÕES IMPORTANTES:\n${userConfig.ai.importantInfo}`;
      }
    }
    
    // Adjust response style based on preference
    const responseStyle = userConfig.preferences.responseStyle || 'friendly';
    const styleInstructions = {
      formal: '\nResponda sempre de forma formal e respeitosa.',
      casual: '\nResponda de forma descontraída e casual.',
      friendly: '\nResponda de forma amigável e acolhedora.',
      professional: '\nResponda de forma profissional e técnica.'
    };
    
    systemPrompt += styleInstructions[responseStyle];
    
    return systemPrompt;
  }

  /**
   * Get personalized AI settings for user
   */
  public getPersonalizedAISettings(userId: string, userPhone: string) {
    const userConfig = this.getUserConfig(userId, userPhone);
    const globalConfig = DEFAULT_ADMIN_CONFIG.ai;
    
    return {
      systemPrompt: this.getPersonalizedSystemPrompt(userId, userPhone),
      temperature: userConfig.ai.temperature ?? globalConfig.temperature,
      maxTokens: userConfig.ai.maxTokens ?? globalConfig.maxTokens,
      model: userConfig.ai.model ?? globalConfig.model,
      memorySize: globalConfig.memorySize // Keep global for now
    };
  }

  /**
   * Get personalized bot name for user
   */
  public getPersonalizedBotName(userId: string, userPhone: string): string {
    const userConfig = this.getUserConfig(userId, userPhone);
    return userConfig.bot.customName || DEFAULT_ADMIN_CONFIG.bot.name;
  }

  /**
   * Get personalized greeting for user
   */
  public getPersonalizedGreeting(userId: string, userPhone: string): string {
    const userConfig = this.getUserConfig(userId, userPhone);
    return userConfig.bot.customGreeting || '🔄 Conversa reiniciada! Olá, como posso ajudá-lo hoje?';
  }

  /**
   * Get all user configs (for admin interface)
   */
  public getAllUserConfigs(): UserPersonalizationConfig[] {
    return Array.from(this.userConfigs.values());
  }

  /**
   * Check if user has any personalizations
   */
  public hasPersonalizations(userId: string): boolean {
    const config = this.userConfigs.get(userId);
    if (!config) return false;
    
    // Check if any AI settings are customized
    const hasAICustomizations = !!(
      config.ai.systemPrompt ||
      config.ai.personality ||
      config.ai.importantInfo ||
      config.ai.temperature !== undefined ||
      config.ai.maxTokens !== undefined ||
      config.ai.model
    );
    
    // Check if any bot settings are customized
    const hasBotCustomizations = !!(
      config.bot.customName ||
      config.bot.customGreeting ||
      config.bot.customCommands
    );
    
    // Check if preferences are different from defaults
    const hasPreferenceCustomizations = !!(
      config.preferences.language !== 'pt' ||
      config.preferences.responseStyle !== 'friendly' ||
      config.preferences.timezone
    );
    
    return hasAICustomizations || hasBotCustomizations || hasPreferenceCustomizations;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      const configExists = existsSync(this.configPath);
      const userCount = this.userConfigs.size;
      
      return {
        status: 'healthy',
        details: {
          configFileExists: configExists,
          userConfigsLoaded: userCount,
          configPath: this.configPath
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message
        }
      };
    }
  }
}

// Export singleton instance
export const personalizationService = PersonalizationService.getInstance();

// Export type for dependency injection
export type { PersonalizationService };