import { useState, useMemo } from "react";
import { useMembers, usePayments, useExpenses } from "@/hooks/useData";
import { useRentalIncome } from "@/hooks/useFeatures";
import { PageHeader, Card, StatCard, Badge, Spinner } from "@/components/ui";
import {
  formatCurrency,
  formatMonth,
  formatDate,
  getMonthsInYear,
} from "@/lib/utils";
import { BarChart3, Users, Calendar, Download } from "lucide-react";

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { members, loading: mLoading } = useMembers();
  const { payments, loading: pLoading } = usePayments();
  const { expenses, loading: eLoading } = useExpenses();
  const { loading: rLoading } = useRentalIncome();

  const monthsInYear = useMemo(
    () => getMonthsInYear(selectedYear),
    [selectedYear],
  );

  // Grouping by actual payment transaction date (YYYY-MM)
  const monthlyStats = useMemo(() => {
    return monthsInYear.map((monthKey) => {
      const mPayments = payments.filter((p) => {
        const date = p.payment_date || p.created_at?.split("T")[0];
        return date && date.startsWith(monthKey);
      });

      const mExpenses = expenses.filter((e) => {
        const date = e.expense_date || e.created_at?.split("T")[0];
        return date && date.startsWith(monthKey);
      });

      const collected = mPayments.reduce(
        (s, p) => s + Number(p.amount || 0),
        0,
      );
      const expenseTotal = mExpenses.reduce(
        (s, e) => s + Number(e.amount || 0),
        0,
      );
      const paidMembersCount = new Set(mPayments.map((p) => p.member_id)).size;

      return {
        monthKey,
        collected,
        expenses: expenseTotal,
        balance: collected - expenseTotal,
        paidCount: paidMembersCount,
        paymentCount: mPayments.length,
      };
    });
  }, [monthsInYear, payments, expenses]);

  // Yearly Aggregates
  const yearCollected = monthlyStats.reduce((s, m) => s + m.collected, 0);
  const yearExpenses = monthlyStats.reduce((s, m) => s + m.expenses, 0);
  const netBalance = yearCollected - yearExpenses;
  const avgMonthly = Math.round(yearCollected / 12);

  const activeMembers = members.filter((m) => m.status === "active");
  const loading = mLoading || pLoading || eLoading || rLoading;

  // Export Simple CSV
  const exportCSV = () => {
    const headerText =
      "Member ID,Name,Mobile,Monthly Due,Current Arrears,Advance,Year Total Paid\n";
    const rowsText = activeMembers
      .map((m) => {
        const memberTotalPaid = payments
          .filter((p) => {
            const date = p.payment_date || p.created_at?.split("T")[0];
            return (
              p.member_id === m.id && date?.startsWith(String(selectedYear))
            );
          })
          .reduce((s, p) => s + Number(p.amount || 0), 0);

        return `"${m.id}","${m.name}","${m.mobile}",${m.monthly_amount},${m.opening_balance || 0},${m.advance_balance || 0},${memberTotalPaid}`;
      })
      .join("\n");

    const blob = new Blob([headerText + rowsText], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Society_Report_${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        subtitle="Annual performance, monthly ledger & member dues analysis"
        action={
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {[
                currentYear - 2,
                currentYear - 1,
                currentYear,
                currentYear + 1,
              ].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg hover:bg-stone-50 font-medium text-stone-700"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        }
      />

      {/* Annual Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Year Collected"
          value={loading ? "..." : formatCurrency(yearCollected)}
          sub={`across all active collections`}
          valueClass="text-emerald-700"
        />
        <StatCard
          label="Year Expenses"
          value={loading ? "..." : formatCurrency(yearExpenses)}
          sub="total outgoing"
          valueClass="text-red-700"
        />
        <StatCard
          label="Net Balance"
          value={loading ? "..." : formatCurrency(netBalance)}
          sub={netBalance >= 0 ? "Surplus" : "Deficit"}
          valueClass={netBalance >= 0 ? "text-green-700" : "text-red-700"}
        />
        <StatCard
          label="Avg Monthly Collection"
          value={loading ? "..." : formatCurrency(avgMonthly)}
          sub="monthly average"
          valueClass="text-stone-800"
        />
      </div>

      {/* Monthly Financial Breakdown */}
      <Card padding={false}>
        <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-stone-800">
              Monthly Summary ({selectedYear})
            </h2>
          </div>
          <span className="text-xs text-stone-400">
            Based on transaction dates
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left">Month</th>
                <th className="px-4 py-3 text-left">Collected</th>
                <th className="px-4 py-3 text-left">Expenses</th>
                <th className="px-4 py-3 text-left">Balance</th>
                <th className="px-4 py-3 text-left">Members Paid</th>
                <th className="px-4 py-3 text-left">Total Receipts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {monthlyStats.map((row) => (
                <tr
                  key={row.monthKey}
                  className="hover:bg-stone-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-stone-800">
                    {formatMonth(row.monthKey, "en")}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">
                    {formatCurrency(row.collected)}
                  </td>
                  <td className="px-4 py-3 text-red-600">
                    {formatCurrency(row.expenses)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <span
                      className={
                        row.balance >= 0 ? "text-green-700" : "text-red-700"
                      }
                    >
                      {formatCurrency(row.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {row.paidCount} / {activeMembers.length}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {row.paymentCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Comprehensive Member-wise Ledger */}
      <Card padding={false}>
        <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-stone-800">
              Member Ledger & Status ({selectedYear})
            </h2>
          </div>
          <span className="text-xs text-stone-500">
            Shows live active arrears & paid amounts
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500">
              <tr>
                <th className="px-3 py-3 text-left">Member</th>
                <th className="px-3 py-3 text-left">Rate</th>
                <th className="px-3 py-3 text-left">Outstanding Arrears</th>
                {monthsInYear.map((m) => (
                  <th key={m} className="px-2 py-3 text-center">
                    {formatMonth(m, "en").slice(0, 3)}
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Total Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {activeMembers.map((m) => {
                // All payments of this member in the selected year
                const memberPayments = payments.filter((p) => {
                  const date = p.payment_date || p.created_at?.split("T")[0];
                  return (
                    p.member_id === m.id &&
                    date?.startsWith(String(selectedYear))
                  );
                });

                const memberTotalPaid = memberPayments.reduce(
                  (s, p) => s + Number(p.amount || 0),
                  0,
                );

                return (
                  <tr
                    key={m.id}
                    className="hover:bg-stone-50 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-medium text-stone-900">
                      <div>{m.name}</div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {m.id}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-stone-600 font-medium">
                      {formatCurrency(m.monthly_amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      {m.opening_balance > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          Due: {formatCurrency(m.opening_balance)}
                        </span>
                      ) : (m.advance_balance || 0) > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">
                          Adv: +{formatCurrency(m.advance_balance)}
                        </span>
                      ) : (
                        <span className="text-stone-400 font-medium">Nil</span>
                      )}
                    </td>

                    {/* Month-wise Paid Status */}
                    {monthsInYear.map((monthKey) => {
                      const monthPaid = memberPayments
                        .filter((p) => {
                          const date =
                            p.payment_date || p.created_at?.split("T")[0];
                          return date?.startsWith(monthKey);
                        })
                        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

                      return (
                        <td key={monthKey} className="px-2 py-2.5 text-center">
                          {monthPaid > 0 ? (
                            <span
                              title={`Paid: ₹${monthPaid}`}
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800"
                            >
                              ₹{monthPaid}
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3 py-2.5 text-right font-bold text-emerald-700 text-sm">
                      {formatCurrency(memberTotalPaid)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
