const nodemailer = require('nodemailer');
import { logger } from '../../utils/logger.js';
import { BotError } from '../../types/index.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailVerificationData {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
}

class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;
  private verificationTokens: Map<string, EmailVerificationData> = new Map();
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    this.initializeTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initializeTransporter(): void {
    try {
      // Verificar se as configurações de email estão disponíveis
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn('Email service not configured. Email functionality disabled.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Verificar a conexão
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email service connection failed', { error });
          this.transporter = null;
        } else {
          logger.info('Email service ready');
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email service', { error });
      this.transporter = null;
    }
  }

  public async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not available, skipping email send');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        text: options.text || this.htmlToText(options.html),
        html: options.html
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { 
        messageId: info.messageId,
        to: options.to,
        subject: options.subject 
      });
      return true;
    } catch (error) {
      logger.error('Failed to send email', { error, to: options.to });
      return false;
    }
  }

  public async sendVerificationEmail(email: string, userId: string, username: string): Promise<boolean> {
    try {
      // Gerar token de verificação
      const token = this.generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      // Armazenar token
      this.verificationTokens.set(token, {
        userId,
        email,
        token,
        expiresAt
      });

      // Limpar tokens expirados
      this.cleanupExpiredTokens();

      const verificationUrl = `${this.baseUrl}/api/auth/verify-email?token=${token}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #25D366; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background: #25D366; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Confirme seu Email</h1>
            </div>
            <div class="content">
              <h2>Olá ${username}!</h2>
              <p>Obrigado por se cadastrar no ${process.env.BOT_NAME || 'WhatsApp Bot'}.</p>
              <p>Para ativar sua conta, por favor confirme seu endereço de email clicando no botão abaixo:</p>
              <center>
                <a href="${verificationUrl}" class="button">Confirmar Email</a>
              </center>
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;">
                ${verificationUrl}
              </p>
              <p><strong>Este link expira em 24 horas.</strong></p>
              <p>Se você não criou esta conta, pode ignorar este email.</p>
            </div>
            <div class="footer">
              <p>© 2025 ${process.env.BOT_NAME || 'WhatsApp Bot'}. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail({
        to: email,
        subject: `Confirme seu email - ${process.env.BOT_NAME || 'WhatsApp Bot'}`,
        html
      });
    } catch (error) {
      logger.error('Failed to send verification email', { error, email });
      return false;
    }
  }

  public async sendPasswordResetEmail(email: string, username: string, resetToken: string): Promise<boolean> {
    try {
      const resetUrl = `${this.baseUrl}/auth/reset-password?token=${resetToken}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Redefinir Senha</h1>
            </div>
            <div class="content">
              <h2>Olá ${username}!</h2>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
              <p>Clique no botão abaixo para criar uma nova senha:</p>
              <center>
                <a href="${resetUrl}" class="button">Redefinir Senha</a>
              </center>
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;">
                ${resetUrl}
              </p>
              <p><strong>Este link expira em 1 hora.</strong></p>
              <p>Se você não solicitou a redefinição de senha, pode ignorar este email.</p>
            </div>
            <div class="footer">
              <p>© 2025 ${process.env.BOT_NAME || 'WhatsApp Bot'}. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail({
        to: email,
        subject: `Redefinir Senha - ${process.env.BOT_NAME || 'WhatsApp Bot'}`,
        html
      });
    } catch (error) {
      logger.error('Failed to send password reset email', { error, email });
      return false;
    }
  }

  public async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    try {
      const loginUrl = `${this.baseUrl}/auth/login`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #25D366; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background: #25D366; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .feature { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #25D366; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bem-vindo ao ${process.env.BOT_NAME || 'WhatsApp Bot'}!</h1>
            </div>
            <div class="content">
              <h2>Olá ${username}!</h2>
              <p>Sua conta foi criada com sucesso e está pronta para uso.</p>
              
              <h3>O que você pode fazer:</h3>
              <div class="feature">
                <strong>📊 Dashboard</strong> - Visualize estatísticas e métricas em tempo real
              </div>
              <div class="feature">
                <strong>💬 Conversas</strong> - Gerencie e monitore conversas do WhatsApp
              </div>
              <div class="feature">
                <strong>🤖 Configurações do Bot</strong> - Personalize respostas e comportamentos
              </div>
              <div class="feature">
                <strong>👥 Gerenciamento de Usuários</strong> - Controle permissões e acessos
              </div>
              
              <center>
                <a href="${loginUrl}" class="button">Acessar Painel</a>
              </center>
              
              <p>Se precisar de ajuda, não hesite em nos contatar.</p>
            </div>
            <div class="footer">
              <p>© 2025 ${process.env.BOT_NAME || 'WhatsApp Bot'}. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail({
        to: email,
        subject: `Bem-vindo ao ${process.env.BOT_NAME || 'WhatsApp Bot'}!`,
        html
      });
    } catch (error) {
      logger.error('Failed to send welcome email', { error, email });
      return false;
    }
  }

  public verifyEmailToken(token: string): EmailVerificationData | null {
    const data = this.verificationTokens.get(token);
    
    if (!data) {
      return null;
    }

    if (new Date() > data.expiresAt) {
      this.verificationTokens.delete(token);
      return null;
    }

    // Remove token após verificação bem-sucedida
    this.verificationTokens.delete(token);
    return data;
  }

  private generateVerificationToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.verificationTokens.entries()) {
      if (now > data.expiresAt) {
        this.verificationTokens.delete(token);
      }
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public isConfigured(): boolean {
    return this.transporter !== null;
  }
}

export const emailService = EmailService.getInstance();
export default emailService;