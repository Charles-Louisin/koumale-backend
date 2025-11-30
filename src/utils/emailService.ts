import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Configuration du transporteur email
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true pour 465, false pour autres ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Fonction pour envoyer un email
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'KOUMALE'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email envoyé:', info.messageId);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    throw new Error('Erreur lors de l\'envoi de l\'email');
  }
};

// Fonction pour envoyer l'email de vérification
export const sendVerificationEmail = async (email: string, verificationCode: string): Promise<void> => {
  const subject = 'Vérifiez votre email - KOUMALE';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">Bienvenue sur KOUMALE !</h2>
      <p>Merci de vous être inscrit. Pour finaliser votre inscription, veuillez vérifier votre adresse email en entrant le code suivant :</p>
      <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
      </div>
      <p>Ce code expirera dans 10 minutes.</p>
      <p>Si vous n'avez pas demandé cette vérification, ignorez cet email.</p>
      <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
      <p style="color: #6c757d; font-size: 12px; text-align: center;">
        Cet email a été envoyé automatiquement par KOUMALE. Ne pas répondre.
      </p>
    </div>
  `;

  const text = `
    Bienvenue sur KOUMALE !

    Merci de vous être inscrit. Pour finaliser votre inscription, veuillez vérifier votre adresse email en entrant le code suivant :

    ${verificationCode}

    Ce code expirera dans 10 minutes.

    Si vous n'avez pas demandé cette vérification, ignorez cet email.
  `;

  await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
};
