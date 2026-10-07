import { Member } from '@/types';
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils';

export interface ReceiptData {
    member: Member;
    amount: number;
    method: string;
    month?: string;
    societyName?: string;
}

export function generateWhatsAppReceipt({
    member,
    amount,
    method,
    month,
    societyName = 'മസ്ജിദുൽ ഹിദായ',
}: ReceiptData): string {
    const todayFormatted = formatDate(new Date().toISOString());
    const remainingDues = Math.max(0, (member.opening_balance || 0) - amount);
    const paidMonthFormatted = month ? formatMonth(month, 'ml') : '';

    return `*${societyName} - പേയ്‌മെന്റ് രസീത്* 🧾
--------------------------------
പ്രിയ *${member.name}* (${member.id}),
നിങ്ങളുടെ വരിസംഖ്യ തുക വിജയകരമായി ലഭിച്ചിരിക്കുന്നു.

💵 അടച്ച തുക: *${formatCurrency(amount)}*
${paidMonthFormatted ? `🗓️ മാസം: *${paidMonthFormatted}*\n` : ''}📅 തീയതി: ${todayFormatted}
💳 രീതി: ${method.toUpperCase()}
${
    remainingDues > 0
        ? `📌 ബാക്കി കുടിശ്ശിക: *${formatCurrency(remainingDues)}*`
        : '✅ കുടിശ്ശികകൾ ഒന്നുമില്ല'
}
--------------------------------
നന്ദി! സൊസൈറ്റി കമ്മിറ്റി.`;
}