import { useAutoAnimate } from '@formkit/auto-animate/react'
import confetti from 'canvas-confetti'
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

// Map categories to emoji icons
const CATEGORY_ICONS: Record<Category, string> = {
  'Alcohol': '🍺',
  'Candy': '🍬',
  'Drinks': '☕',
  'Food': '🍔',
  'Games': '🎮',
  'Snacks': '🍿',
  'Other': '📦',
}

export function QuickEntry() {
  const [animateRef] = useAutoAnimate({
    duration: 200,
    disrespectUserMotionPreference: true,
  })
  const addEvent = useAppStore((state) => state.addEvent)
  const events = useAppStore((state) => state.events)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('Other')
  const [date, setDate] = useState(getTodayString)
  const [isLoading, setIsLoading] = useState(false)
  const [showCustom, setShowCustom] = useState(false)

  // Get last 5 unique entries (avoiding duplicates and static presets)
  const dynamicPresets: Preset[] = (() => {
    const seen = new Set<string>()
    const presets: Preset[] = []
    
    // Create a set of static preset keys to filter them out
    const staticPresetKeys = new Set(
      PRESETS.map(p => `${p.description}-${p.amount}-${p.category}`)
    )
    
    // Sort events by date descending to get most recent first
    const sortedEvents = [...events]
      .filter(e => e.type === 'AVOIDED_PURCHASE' || e.type === 'PURCHASE')
      .sort((a, b) => b.date.localeCompare(a.date))
    
    for (const event of sortedEvents) {
      if (event.type !== 'AVOIDED_PURCHASE' && event.type !== 'PURCHASE') continue
      
      const key = `${event.description}-${event.amount}-${event.category}`
      
      // Skip if it's a static preset or already seen
      if (staticPresetKeys.has(key) || seen.has(key)) continue
      
      if (presets.length < 5) {
        seen.add(key)
        presets.push({
          description: event.description,
          amount: event.amount,
          category: event.category,
        })
      }
      
      if (presets.length >= 5) break
    }
    
    return presets
  })()

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
    // Toggle the custom form visibility
    setShowCustom(!showCustom)
    // Always clear fields when Custom button is clicked
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

      // Trigger confetti when purchase is avoided
      if (type === 'avoided') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      }

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

        <div ref={animateRef} className="space-y-4">
          {/* Preset Buttons */}
          <div className="space-y-3">
            {/* Dynamic presets from recent entries */}
            {dynamicPresets.length > 0 && (
              <div>
                <p className="label-text mb-2">Recent</p>
                <div className="flex flex-wrap gap-2">
                  {dynamicPresets.map((preset) => {
                    const isSelected = amount === preset.amount.toString() && description === preset.description
                    return (
                      <button
                        key={`${preset.description}-${preset.amount}-${preset.category}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-content shadow-sm'
                            : 'bg-base-100 hover:bg-base-300 text-base-content'
                        }`}
                        onClick={() => handlePresetClick(preset)}
                        disabled={isLoading}
                      >
                        <span>{CATEGORY_ICONS[preset.category]}</span>
                        <span className="font-medium">{preset.description}</span>
                        <span className="text-xs opacity-60">{preset.amount}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Static presets */}
            <div>
              <p className="label-text mb-2">Presets</p>
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
                
                {/* Custom button */}
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
          </div>

          {/* Custom Entry Form - shown when Custom is selected or a preset is modified */}
          {(showCustom || amount || description) && (
            <div key="entry-form" className="space-y-4">
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
                <div className="form-control w-[128px]">
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
                <div className="flex gap-2 flex-1 min-w-[200px]">
                  <button
                    className="btn bg-saved text-saved-content flex-1 whitespace-nowrap"
                    onClick={() => handleAddEvent('avoided')}
                    disabled={isLoading || !isFormValid}
                  >
                    {isLoading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      '💪 Skipped'
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
