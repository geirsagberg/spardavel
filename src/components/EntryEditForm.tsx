import { useState } from 'react'
import { CATEGORIES } from '~/lib/constants'
import { APP_CURRENCY } from '~/lib/formatting'
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
    <div className="rounded-lg bg-base-300 p-3 space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="form-control min-w-[100px] flex-1">
          <label className="label py-0.5">
            <span className="label-text text-xs">Amount</span>
          </label>
          <div className="join">
            <input
              type="number"
              placeholder="30"
              className="input input-bordered input-sm join-item w-full"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
            />
            <span className="btn btn-sm join-item no-animation pointer-events-none bg-base-content/10 border-base-300">
              {APP_CURRENCY}
            </span>
          </div>
        </div>

        <div className="form-control min-w-[100px] flex-2">
          <label className="label py-0.5">
            <span className="label-text text-xs">Description</span>
          </label>
          <input
            type="text"
            placeholder="Other"
            className="input input-bordered input-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-control min-w-[90px] flex-1">
          <label className="label py-0.5">
            <span className="label-text text-xs">Category</span>
          </label>
          <select
            className="select select-bordered select-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="form-control w-[128px]">
          <label className="label py-0.5">
            <span className="label-text text-xs">Date</span>
          </label>
          <input
            type="date"
            className="input input-bordered input-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <button
            className={`btn flex-1 whitespace-nowrap ${
              !isPurchase 
                ? 'bg-saved text-saved-content' 
                : 'btn-outline border-saved text-saved hover:bg-saved hover:text-saved-content'
            }`}
            onClick={() => setIsPurchase(false)}
          >
            💪 Skipped
          </button>
          <button
            className={`btn flex-1 whitespace-nowrap ${
              isPurchase 
                ? 'bg-spent text-spent-content' 
                : 'btn-outline border-spent text-spent hover:bg-spent hover:text-spent-content'
            }`}
            onClick={() => setIsPurchase(true)}
          >
            💸 Bought
          </button>
        </div>
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
