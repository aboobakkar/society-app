import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Member, Payment } from '@/types';

/**
 * Utility to merge Tailwind CSS classes safely without style conflicts
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format a number to Indian Rupee currency format (e.g. ₹500, ₹1,200)
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

/**
 * Returns current month in 'YYYY-MM' format
 */
export function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Payments.month is traditionally scoped to the previous calendar month
 * e.g., in October, the regular collection is for September.
 */
export function getCollectionMonth(): string {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Formats a YYYY-MM string to readable English or Malayalam month names
 */
export function formatMonth(monthStr: string, lang: 'en' | 'ml' = 'en'): string {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
    const [year, month] = monthStr.split('-');
    const monthIndex = parseInt(month, 10) - 1;

    const enMonths = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const mlMonths = [
        'ജനുവരി', 'ഫെബ്രുവരി', 'മാർച്ച്', 'ഏപ്രിൽ', 'മെയ്', 'ജൂൺ',
        'ജൂലൈ', 'ഓഗസ്റ്റ്', 'സെപ്റ്റംബർ', 'ഒക്ടോബർ', 'നവംബർ', 'ഡിസംബർ'
    ];

    if (lang === 'ml') {
        return `${mlMonths[monthIndex] || month} ${year}`;
    }
    return `${enMonths[monthIndex] || month} ${year}`;
}

/**
 * Format ISO date or date string to readable format (e.g. 15 Oct 2026)
 */
export function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

/**
 * Returns all 12 months for a given year in 'YYYY-MM' format (e.g. '2026-01', '2026-02', ...)
 */
export function getMonthsInYear(year: number | string): string[] {
    const y = String(year);
    return Array.from({ length: 12 }, (_, i) => {
        const m = String(i + 1).padStart(2, '0');
        return `${y}-${m}`;
    });
}

/**
 * Checks whether a given 'YYYY-MM' is either in the past or the current calendar month
 */
export function isPastOrCurrentMonth(monthStr: string): boolean {
    if (!monthStr) return false;
    const current = getCurrentMonth();
    return monthStr <= current;
}

/**
 * Generates an array of 'YYYY-MM' string options starting from startYear up to current year
 */
export function getMonthOptions(startYear = 2023): string[] {
    const options: string[] = [];
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1;

    for (let y = startYear; y <= currentYear; y++) {
        const maxMonth = y === currentYear ? currentMonthNum : 12;
        for (let m = 1; m <= maxMonth; m++) {
            options.push(`${y}-${String(m).padStart(2, '0')}`);
        }
    }
    return options;
}

/**
 * Dynamic Ledger calculation for individual member:
 * Balance = Opening Due + (Months Accrued * Monthly Amount) - Total Payments - Waived Amount
 */
export function calculateMemberBalance(member: Member, payments: Payment[]) {
    const openingDue = Number(member.opening_due ?? member.opening_balance ?? 0);
    const monthlyAmount = Number(member.monthly_amount || 0);
    const waived = Number(member.waived_amount || 0);

    const joinedDate = member.joined_date
        ? new Date(member.joined_date)
        : member.created_at
        ? new Date(member.created_at)
        : new Date();

    const now = new Date();

    // Months difference up to the previous completed month
    const monthsAccrued = Math.max(
        0,
        (now.getFullYear() - joinedDate.getFullYear()) * 12 + (now.getMonth() - joinedDate.getMonth())
    );

    const totalExpected = openingDue + (monthsAccrued * monthlyAmount) - waived;

    const totalPaid = payments
        .filter((p) => p.member_id === member.id && (p.payment_type ?? 'monthly') === 'monthly')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const balance = totalExpected - totalPaid;

    return {
        totalExpected,
        totalPaid,
        currentDue: balance > 0 ? balance : 0,
        advanceBalance: balance < 0 ? Math.abs(balance) : 0,
    };
}