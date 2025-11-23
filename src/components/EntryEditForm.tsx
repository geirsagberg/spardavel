import { useState } from 'react'
import { CATEGORIES } from '~/lib/constants'
import type { Category, PurchaseEvent, AvoidedPurchaseEvent } from '~/types/events'

type EntryEditFormProps = {
  event: PurchaseEvent | AvoidedPurchaseEvent
  onSave: (id: string, updates: {
    type: 'PURCHASE' | 'AVOIDED_PURCHASE'
    amount: number
    description: string
    category: Category
    date: string
  }) => void
  onCancel: () => void
}

export function EntryEditForm({ event, onSave, onCancel }: EntryEditFormProps) {
  const [amount, setAmount] = useState(event.amount.toString())
  const [description, setDescription] = useState(event.description)
  const [category, setCategory] = useState<Category>(event.category)
  const [date, setDate] = useState(event.date)
  const [isPurchase, setIsPurchase] = useState(event.type === 'PURCHASE')

  const handleSave = () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return
    if (!description.trim()) return

    onSave(event.id, {
      type: isPurchase ? 'PURCHASE' : 'AVOIDED_PURCHASE',
      amount: numAmount,
      description: description.trim(),
      category,
      date,
    })
  }

  return (
    <div className="rounded-lg bg-base-300 p-3 space-y-3">
      <div className="flex gap-2">
        <button
          className={`btn btn-sm flex-1 ${isPurchase ? 'bg-spent text-spent-content' : 'btn-outline'}`}
          onClick={() => setIsPurchase(true)}
        >
          Spent
        </button>
        <button
          className={`btn btn-sm flex-1 ${!isPurchase ? 'bg-saved text-saved-content' : 'btn-outline'}`}
          onClick={() => setIsPurchase(false)}
        >
          Avoided
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          className="input input-bordered input-sm w-24"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          min="0"
          step="1"
        />
        <input
          type="text"
          className="input input-bordered input-sm flex-1"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />
      </div>
      <div className="flex gap-2">
        <select
          className="select select-bordered select-sm flex-1"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input input-bordered input-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn btn-sm btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-sm btn-primary" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  )
}
