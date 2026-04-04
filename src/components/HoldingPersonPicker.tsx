import { CheckCircle } from 'lucide-react';

interface HoldingPersonPickerProps {
    persons: string[];
    value: string;
    onChange: (person: string) => void;
    label?: string;
}

export function HoldingPersonPicker({
    persons,
    value,
    onChange,
    label = 'Received By (optional)',
}: HoldingPersonPickerProps) {
    if (persons.length === 0) return null;

    return (
        <div>
            <label className='block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2'>
                {label}
            </label>
            <div className='flex flex-wrap gap-2'>
                {persons.map((person) => (
                    <button
                        key={person}
                        type='button'
                        onClick={() => onChange(value === person ? '' : person)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all
              ${
                  value === person
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
                    >
                        <span>{person}</span>
                        {value === person && (
                            <CheckCircle size={14} className='text-amber-600' />
                        )}
                    </button>
                ))}
                {value && (
                    <button
                        type='button'
                        onClick={() => onChange('')}
                        className='text-xs text-stone-400 hover:text-stone-600 px-2 self-center'
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}
