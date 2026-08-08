import { SESClient, SendEmailCommand, type SendEmailCommandInput } from '@aws-sdk/client-ses';
import 'server-only';

let sesClient: SESClient | null = null;

function getClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({
      region: process.env.AWS_REGION ?? 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? ''
      }
    });
  }
  return sesClient;
}

export function isSesConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION &&
      process.env.AWS_SES_FROM_EMAIL
  );
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ messageId?: string; error?: string }> {
  if (!isSesConfigured()) {
    return { error: 'AWS SES is not configured' };
  }

  const toList = Array.isArray(opts.to) ? opts.to : [opts.to];

  const input: SendEmailCommandInput = {
    Source: opts.from ?? process.env.AWS_SES_FROM_EMAIL,
    Destination: { ToAddresses: toList },
    Message: {
      Subject: { Data: opts.subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: opts.html, Charset: 'UTF-8' },
        ...(opts.text ? { Text: { Data: opts.text, Charset: 'UTF-8' } } : {})
      }
    }
  };
  if (opts.replyTo) input.ReplyToAddresses = [opts.replyTo];

  try {
    const res = await getClient().send(new SendEmailCommand(input));
    return { messageId: res.MessageId };
  } catch (err) {
    console.error('[email] SES send failed', err);
    return { error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

export const emailLayout = (title: string, bodyHtml: string): string => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">
    <div style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px">
      <strong style="font-size:18px">Export OS</strong>
    </div>
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${bodyHtml}
    <p style="margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px">
      You are receiving this email from the Export OS platform.
    </p>
  </div>
`;
