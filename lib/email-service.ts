// lib/email-service.ts
// Este serviço será responsável por disparar e-mails via Resend/SendGrid.
// Requer configuração de API Key no ambiente.

export async function sendNotificationEmail(to: string, subject: string, body: string) {
    console.log(`[EMAIL SIMULADO] Para: ${to}, Assunto: ${subject}`);
    // Implementação futura com Resend:
    /*
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
            from: 'Inventário <alerts@seu-dominio.com>',
            to: [to],
            subject: subject,
            html: body,
        }),
    });
    return res.json();
    */
    return { success: true };
}
