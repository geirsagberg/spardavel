import { useState } from 'react'
import { CATEGORIES } from '~/lib/constants'
import {
  createAvoidedPurchaseEvent,
  createPurchaseEvent,
} from '~/lib/eventUtils'
import { APP_CURRENCY, getTodayString } from '~/lib/formatting'
import { useAppStore } from '~/store/appStore'
import type { Category } from '~/types/events'

type Preset = {
  description: string
  amount: number
  category: Category
}

const PRESETS: (Preset & { emoji: string })[] = [
  { emoji: '☕', description: 'Coffee', amount: 40, category: 'Drinks' },
  { emoji: '🍬', description: 'Candy', amount: 25, category: 'Candy' },
  { emoji: '🍺', description: 'Beer', amount: 30, category: 'Alcohol' },
  { emoji: '🍿', description: 'Snack', amount: 20, category: 'Snacks' },
  { emoji: '🍔', description: 'Food', amount: 50, category: 'Food' },
]

export function QuickEntry() {
  const addEvent = useAppStore((state) => state.addEvent)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('Other')
  const [date, setDate] = useState(getTodayString)
  const [isLoading, setIsLoading] = useState(false)
  const [showCustom, setShowCustom] = useState(false)

  const handlePresetClick = (preset: Preset) => {
    const isSelected = amount === preset.amount.toString() && description === preset.description
    if (isSelected) {
      setAmount('')
      setDescription('')
      setCategory('Other')
    } else {
      setAmount(preset.amount.toString())
      setDescription(preset.description)
      setCategory(preset.category)
    }
    setShowCustom(false)
  }

  const handleCustomClick = () => {
    setShowCustom(true)
    setAmount('')
    setDescription('')
    setCategory('Other')
  }

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

      // Use the date directly (YYYY-MM-DD format)
      const event =
        type === 'purchase'
          ? createPurchaseEvent(numAmount, category, description, date)
          : createAvoidedPurchaseEvent(numAmount, category, description, date)

      addEvent(event)

      // Reset form
      setAmount('')
      setDescription('')
      setCategory('Other')
      setDate(getTodayString())
      setShowCustom(false)
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = amount && description

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title">Quick Entry</h2>

        <div className="space-y-4">
          {/* Preset Buttons */}
          <div>
            <p className="label-text mb-2">Select a preset or custom:</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const isSelected = amount === preset.amount.toString() && description === preset.description
                return (
                  <button
                    key={preset.description}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-content shadow-sm'
                        : 'bg-base-100 hover:bg-base-300 text-base-content'
                    }`}
                    onClick={() => handlePresetClick(preset)}
                    disabled={isLoading}
                  >
                    <span>{preset.emoji}</span>
                    <span className="font-medium">{preset.description}</span>
                    <span className="text-xs opacity-60">{preset.amount}</span>
                  </button>
                )
              })}
              <button
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                  showCustom
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'bg-base-100 hover:bg-base-300 text-base-content'
                }`}
                onClick={handleCustomClick}
                disabled={isLoading}
              >
                <span>✏️</span>
                <span className="font-medium">Custom</span>
              </button>
            </div>
          </div>

          {/* Custom Entry Form - shown when Custom is selected or a preset is modified */}
          {(showCustom || isFormValid) && (
            <>
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
                      disabled={isLoading}
                    />
                    <span className="btn btn-sm join-item no-animation pointer-events-none bg-base-300 border-base-300">
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons row with date */}
              <div className="flex flex-wrap gap-2 items-end">
                <div className="form-control w-[110px]">
                  <label className="label py-0.5">
                    <span className="label-text text-xs">Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <button
                  className="btn bg-saved text-saved-content flex-1 whitespace-nowrap"
                  onClick={() => handleAddEvent('avoided')}
                  disabled={isLoading || !isFormValid}
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    '✓ Skipped'
                  )}
                </button>
                <button
                  className="btn bg-spent text-spent-content flex-1 whitespace-nowrap"
                  onClick={() => handleAddEvent('purchase')}
                  disabled={isLoading || !isFormValid}
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    '💸 Bought'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
