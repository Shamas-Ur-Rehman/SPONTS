import { Resend } from "resend";

/**
 * Interface pour les données d'email
 */
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * @param Service d'envoi d'emails via Resend
 *
 * Utilise Resend pour l'envoi d'emails de notification
 */
export class EmailService {
  private static resend = new Resend(process.env.RESEND_API_KEY);

  /**
   * @param Envoi d'un email via Resend
   *
   * Utilise l'API Resend pour envoyer des emails de notification
   */
  static async sendEmail(emailData: EmailData): Promise<void> {
    try {
      console.log(`📧 Envoi email vers ${emailData.to}: ${emailData.subject}`);

      if (!process.env.RESEND_API_KEY) {
        console.warn("⚠️ RESEND_API_KEY non configuré, simulation d'envoi");
        console.log("Email content:", { ...emailData, html: "[HTML Content]" });
        return;
      }

      const result = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@spontis.ch",
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });

      if (result.error) {
        throw new Error(`Resend error: ${result.error.message}`);
      }

      console.log(
        `✅ Email envoyé avec succès vers ${emailData.to} (ID: ${result.data?.id})`
      );
    } catch (error) {
      console.error("❌ Erreur envoi email:", error);
      throw new Error(
        `Erreur envoi email: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    }
  }

  /**
   * @param Génération d'email de notification d'approbation d'entreprise
   */
  static generateCompanyApprovalEmail(
    companyName: string,
    recipientEmail: string,
    recipientName: string
  ): EmailData {
    return {
      to: recipientEmail,
      subject: "✅ Votre entreprise Spontis a été approuvée !",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; }
            .button { 
              display: inline-block; 
              background-color: #4CAF50; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .company-info {
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Félicitations ${recipientName} !</h1>
          </div>
          <div class="content">
            <p>Nous avons le plaisir de vous informer que votre entreprise a été approuvée par notre équipe.</p>
            
            <div class="company-info">
              <h3>Entreprise approuvée :</h3>
              <p><strong>${companyName}</strong></p>
            </div>

            <p>Vous pouvez maintenant utiliser pleinement la plateforme Spontis :</p>
            <ul>
              <li>Créer et publier des mandats</li>
              <li>Consulter les offres disponibles</li>
              <li>Gérer votre équipe et vos invitations</li>
            </ul>

            <div style="text-align: center;">
              <a href="${
                process.env.NEXT_PUBLIC_BASE_URL || "https://spontis.ch"
              }/expediteur" class="button">
                Accéder au dashboard
              </a>
            </div>

            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            
            <p>Bienvenue dans la communauté Spontis !</p>
          </div>
          <div class="footer">
            <p>Cordialement,<br><strong>L'équipe Spontis</strong></p>
            <p><small>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</small></p>
          </div>
        </body>
        </html>
      `,
      text: `
Félicitations ${recipientName} !

Votre entreprise "${companyName}" a été approuvée par notre équipe.

Vous pouvez maintenant accéder à votre dashboard : ${
        process.env.NEXT_PUBLIC_BASE_URL || "https://spontis.ch"
      }/expediteur

Cordialement,
L'équipe Spontis
      `.trim(),
    };
  }

  /**
   * @param Génération d'email de rejet d'entreprise
   */
  static generateCompanyRejectionEmail(
    companyName: string,
    recipientEmail: string,
    recipientName: string,
    reason: string
  ): EmailData {
    return {
      to: recipientEmail,
      subject: "❌ Votre demande d'inscription Spontis",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; }
            .button { 
              display: inline-block; 
              background-color: #007bff; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .reason-box {
              background-color: #f8f9fa;
              border-left: 4px solid #dc3545;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Demande d'inscription</h1>
          </div>
          <div class="content">
            <p>Bonjour ${recipientName},</p>
            
            <p>Nous avons examiné votre demande d'inscription pour l'entreprise <strong>${companyName}</strong>.</p>
            
            <p>Malheureusement, nous ne pouvons pas l'approuver pour la raison suivante :</p>
            
            <div class="reason-box">
              <strong>Motif :</strong> ${reason}
            </div>

            <p>Si vous souhaitez corriger ces points et resoummettre votre demande, n'hésitez pas à nous contacter.</p>

            <div style="text-align: center;">
              <a href="mailto:contact@spontis.ch" class="button">
                Nous contacter
              </a>
            </div>

            <p>Nous restons à votre disposition pour tout renseignement complémentaire.</p>
          </div>
          <div class="footer">
            <p>Cordialement,<br><strong>L'équipe Spontis</strong></p>
            <p><small>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</small></p>
          </div>
        </body>
        </html>
      `,
      text: `
Bonjour ${recipientName},

Nous avons examiné votre demande d'inscription pour l'entreprise "${companyName}".

Malheureusement, nous ne pouvons pas l'approuver pour la raison suivante : ${reason}

Pour plus d'informations, contactez-nous : contact@spontis.ch

Cordialement,
L'équipe Spontis
      `.trim(),
    };
  }

  /**
   * @param Génération d'email d'approbation de mandat
   */
  static generateMandatApprovalEmail(
    mandatName: string,
    recipientEmail: string,
    recipientName: string,
    mandatDetails: {
      description: string;
      depart: string;
      arrivee: string;
      heure: string;
    }
  ): EmailData {
    return {
      to: recipientEmail,
      subject: "✅ Votre mandat Spontis a été approuvé !",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; }
            .button { 
              display: inline-block; 
              background-color: #4CAF50; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .mandat-details {
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Mandat approuvé !</h1>
          </div>
          <div class="content">
            <p>Félicitations ${recipientName} !</p>
            
            <p>Votre mandat <strong>"${mandatName}"</strong> a été approuvé par notre équipe.</p>
            
            <p>Il est maintenant visible par les transporteurs sur la plateforme.</p>

            <div class="mandat-details">
              <h3>Détails du mandat :</h3>
              <p><strong>Nom :</strong> ${mandatName}</p>
              <p><strong>Description :</strong> ${mandatDetails.description}</p>
              <p><strong>Départ :</strong> ${mandatDetails.depart}</p>
              <p><strong>Arrivée :</strong> ${mandatDetails.arrivee}</p>
              <p><strong>Heure souhaitée :</strong> ${mandatDetails.heure}</p>
            </div>

            <div style="text-align: center;">
              <a href="${
                process.env.NEXT_PUBLIC_BASE_URL || "https://spontis.ch"
              }/expediteur/mandats" class="button">
                Voir mes mandats
              </a>
            </div>

            <p>Les transporteurs peuvent maintenant consulter et répondre à votre demande.</p>
          </div>
          <div class="footer">
            <p>Cordialement,<br><strong>L'équipe Spontis</strong></p>
            <p><small>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</small></p>
          </div>
        </body>
        </html>
      `,
      text: `
Félicitations ${recipientName} !

Votre mandat "${mandatName}" a été approuvé par notre équipe.

Détails :
- Description : ${mandatDetails.description}
- Départ : ${mandatDetails.depart}
- Arrivée : ${mandatDetails.arrivee}
- Heure : ${mandatDetails.heure}

Consultez vos mandats : ${
        process.env.NEXT_PUBLIC_BASE_URL || "https://spontis.ch"
      }/expediteur/mandats

Cordialement,
L'équipe Spontis
      `.trim(),
    };
  }

  /**
   * @param Génération d'email de rejet de mandat
   */
  static generateMandatRejectionEmail(
    mandatName: string,
    recipientEmail: string,
    recipientName: string,
    reason: string,
    mandatDetails: {
      description: string;
      depart: string;
      arrivee: string;
      heure: string;
    }
  ): EmailData {
    return {
      to: recipientEmail,
      subject: "❌ Votre mandat Spontis n'a pas été approuvé",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; }
            .button { 
              display: inline-block; 
              background-color: #007bff; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .reason-box {
              background-color: #f8f9fa;
              border-left: 4px solid #dc3545;
              padding: 15px;
              margin: 20px 0;
            }
            .mandat-details {
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Mandat non approuvé</h1>
          </div>
          <div class="content">
            <p>Bonjour ${recipientName},</p>
            
            <p>Nous avons examiné votre mandat <strong>"${mandatName}"</strong>.</p>
            
            <p>Malheureusement, nous ne pouvons pas l'approuver pour la raison suivante :</p>
            
            <div class="reason-box">
              <strong>Motif :</strong> ${reason}
            </div>

            <div class="mandat-details">
              <h3>Détails du mandat rejeté :</h3>
              <p><strong>Nom :</strong> ${mandatName}</p>
              <p><strong>Description :</strong> ${mandatDetails.description}</p>
              <p><strong>Départ :</strong> ${mandatDetails.depart}</p>
              <p><strong>Arrivée :</strong> ${mandatDetails.arrivee}</p>
              <p><strong>Heure souhaitée :</strong> ${mandatDetails.heure}</p>
            </div>

            <p>Si vous souhaitez corriger ces points et resoummettre un mandat, n'hésitez pas à créer un nouveau mandat.</p>

            <div style="text-align: center;">
              <a href="${
                process.env.NEXT_PUBLIC_BASE_URL || "https://spontis.ch"
              }/expediteur/mandats/create" class="button">
                Créer un nouveau mandat
              </a>
            </div>

            <p>Pour toute question, n'hésitez pas à nous contacter.</p>
          </div>
          <div class="footer">
            <p>Cordialement,<br><strong>L'équipe Spontis</strong></p>
            <p><small>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</small></p>
          </div>
        </body>
        </html>
      `,
      text: `
Bonjour ${recipientName},

Nous avons examiné votre mandat "${mandatName}".

Malheureusement, nous ne pouvons pas l'approuver pour la raison suivante : ${reason}

Détails du mandat :
- Description : ${mandatDetails.description}
- Départ : ${mandatDetails.depart}
- Arrivée : ${mandatDetails.arrivee}
- Heure : ${mandatDetails.heure}

Créez un nouveau mandat : ${
        process.env.NEXT_PUBLIC_BASE_URL || "https://spontis.ch"
      }/expediteur/mandats/create

Cordialement,
L'équipe Spontis
      `.trim(),
    };
  }
}
