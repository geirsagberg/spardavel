import { useState } from 'react'
import type { Category } from '~/types/events'
import { createPurchaseEvent, createAvoidedPurchaseEvent } from '~/lib/eventUtils'
import { useAppStore } from '~/store/appStore'

const CATEGORIES: Category[] = ['Alcohol', 'Candy', 'Snacks', 'Food', 'Drinks', 'Games', 'Other']

export function QuickEntry() {
  const addEvent = useAppStore((state) => state.addEvent)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('Other')
  const [isLoading, setIsLoading] = useState(false)

  const handleAddEvent = async (type: 'purchase' | 'avoided') => {
    if (!amount || !description) {
      return
    }

    setIsLoading(true)
    try {
      const numAmount = parseFloat(amount)
      if (numAmount <= 0) {
        return
      }

      const event =
        type === 'purchase'
          ? createPurchaseEvent(numAmount, category, description)
          : createAvoidedPurchaseEvent(numAmount, category, description)

      addEvent(event)

      // Reset form
      setAmount('')
      setDescription('')
      setCategory('Other')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title">Quick Entry</h2>

        <div className="space-y-4">
          {/* Amount Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Amount (kr)</span>
            </label>
            <input
              type="number"
              placeholder="e.g., 30"
              className="input input-bordered"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              disabled={isLoading}
            />
          </div>

          {/* Description Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Beer, Coffee"
              className="input input-bordered"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Category Dropdown */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Category</span>
            </label>
            <select
              className="select select-bordered"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              disabled={isLoading}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="card-actions justify-end gap-2 pt-4">
            <button
              className="btn btn-sm btn-success"
              onClick={() => handleAddEvent('avoided')}
              disabled={isLoading || !amount || !description}
            >
              {isLoading ? <span className="loading loading-spinner loading-xs"></span> : '✓'}
              Avoided
            </button>
            <button
              className="btn btn-sm btn-error"
              onClick={() => handleAddEvent('purchase')}
              disabled={isLoading || !amount || !description}
            >
              {isLoading ? <span className="loading loading-spinner loading-xs"></span> : '✗'}
              Spent
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
