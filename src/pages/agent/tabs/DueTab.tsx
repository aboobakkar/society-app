import { useState, useMemo } from "react";
import { useMembers, usePayments } from "@/hooks/useData";
import { Member } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { PaymentSheet } from "../components/PaymentSheet";
import { AlertCircle, ChevronRight, Search } from "lucide-react";

export function DueTab() {
  const { members, loading: mLoading } = useMembers();
  const { payments } = usePayments();
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Filter active members who actually have pending dues (opening_balance > 0)
  // and sort them with HIGHEST DUE FIRST
  const dueMembers = useMemo(() => {
    return members
      .filter(
        (m) => m.status === "active" && Number(m.opening_balance || 0) > 0,
      )
      .sort(
        (a, b) =>
          Number(b.opening_balance || 0) - Number(a.opening_balance || 0),
      );
  }, [members]);

  // Search filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dueMembers;
    return dueMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.name_ml || "").includes(q) ||
        m.mobile.includes(q) ||
        m.id.toLowerCase().includes(q),
    );
  }, [dueMembers, search]);

  const totalOutstanding = useMemo(() => {
    return dueMembers.reduce(
      (sum, m) => sum + Number(m.opening_balance || 0),
      0,
    );
  }, [dueMembers]);

  const handleSelect = (member: Member) => {
    setSelectedMember(member);
    setSheetOpen(true);
  };

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-24">
      {/* Header Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-amber-600" size={18} />
            <h2 className="text-sm font-bold text-amber-900">
              Outstanding Member Dues
            </h2>
          </div>
          <span className="text-xs font-semibold bg-amber-200/60 text-amber-800 px-2 py-0.5 rounded-full">
            {dueMembers.length} pending
          </span>
        </div>
        <p className="text-xs text-amber-700 mt-1">
          Sorted by highest pending dues first
        </p>
        <div className="mt-3 pt-2 border-t border-amber-200/60 flex justify-between items-center text-xs">
          <span className="text-amber-800 font-medium">
            Total Dues to Collect:
          </span>
          <span className="text-base font-bold text-amber-900">
            {formatCurrency(totalOutstanding)}
          </span>
        </div>
      </div>

      {/* Search Box */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search due members by name, ID..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Due Members List */}
      {mLoading ? (
        <div className="text-center py-10 text-xs text-stone-400">
          Loading dues...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-stone-100">
          <p className="text-stone-400 text-sm">
            {search
              ? "No matching due members"
              : "🎉 No pending dues recorded!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((m) => (
            <div
              key={m.id}
              onClick={() => handleSelect(m)}
              className="bg-white p-3.5 rounded-2xl border border-stone-200/70 hover:border-amber-300 transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {m.name[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900 leading-tight">
                    {m.name}
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {m.id} · {m.mobile}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                    Rate: ₹{m.monthly_amount}/mo
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="inline-block text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                    {formatCurrency(m.opening_balance)} due
                  </span>
                </div>
                <ChevronRight size={16} className="text-stone-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Sheet */}
      {selectedMember && (
        <PaymentSheet
          member={selectedMember}
          open={sheetOpen}
          onClose={() => {
            setSheetOpen(false);
            setSelectedMember(null);
          }}
          onSuccess={() => {
            setSheetOpen(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
}

export default DueTab;
