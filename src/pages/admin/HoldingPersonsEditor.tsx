import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

export function HoldingPersonsEditor() {
  const [persons, setPersons] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('holding_persons').single().then(({ data }) => {
      if (data?.holding_persons) setPersons(data.holding_persons as string[])
    })
  }, [])

  const save = async (updated: string[]) => {
    setSaving(true)
    const { error } = await supabase.from('settings').update({ holding_persons: updated }).eq('id', 1)
    if (error) toast.error(error.message)
    else toast.success('Holding persons updated')
    setSaving(false)
  }

  const addPerson = async () => {
    const name = newName.trim()
    if (!name || persons.includes(name)) return
    const updated = [...persons, name]
    setPersons(updated)
    setNewName('')
    await save(updated)
  }

  const removePerson = async (name: string) => {
    const updated = persons.filter(p => p !== name)
    setPersons(updated)
    await save(updated)
  }

  return (
    <div className="space-y-3">
      {/* Current persons */}
      {persons.length === 0 ? (
        <p className="text-sm text-stone-400 italic">No holding persons added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {persons.map(p => (
            <div key={p} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-1.5 text-sm font-medium">
              {p}
              <button onClick={() => removePerson(p)}
                className="text-amber-400 hover:text-red-500 transition-colors ml-1">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder="Add person name..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addPerson()}
          className="flex-1"
        />
        <Button onClick={addPerson} loading={saving} size="sm">
          <Plus size={15} className="mr-1" /> Add
        </Button>
      </div>
      <p className="text-xs text-stone-400">
        These names appear in the agent app when recording cash payments.
      </p>
    </div>
  )
}
