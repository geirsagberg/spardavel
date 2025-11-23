import { LineChart, type LineSeriesOption } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
  type TooltipComponentOption,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '~/lib/formatting'
import { calculatePendingInterestUpToDate } from '~/lib/interestCalculation'
import { useAppStore } from '~/store/appStore'

type TimeRange = '1w' | '1mo' | '6mo'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

type ECOption = echarts.ComposeOption<
  LineSeriesOption | TooltipComponentOption | GridComponentOption
>

export function StackedChart() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const metrics = useAppStore((state) => state.metrics)
  const events = useAppStore((state) => state.events)
  const defaultInterestRate = useAppStore((state) => state.defaultInterestRate)
  const theme = useAppStore((state) => state.theme)
  const [autoScale, setAutoScale] = useState(() => {
    const stored = localStorage.getItem('chartAutoScale')
    return stored === null ? true : stored === 'true'
  })
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const stored = localStorage.getItem('chartTimeRange')
    return (stored as TimeRange) || '6mo'
  })
  const [cssReady, setCssReady] = useState(false)

  // Wait for CSS variables to be computed after theme changes
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCssReady(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const handleAutoScaleChange = (checked: boolean) => {
    setAutoScale(checked)
    localStorage.setItem('chartAutoScale', String(checked))
  }

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range)
    localStorage.setItem('chartTimeRange', range)
  }

  useEffect(() => {
    if (!chartRef.current || !cssReady) return

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current)
    }

    const chart = chartInstanceRef.current
    const monthlyHistory = metrics.monthlyHistory

    // Generate date range and data based on selected time range
    const now = new Date()

    let categories: string[] = []
    let totalSaved: number[] = []
    let totalInterest: number[] = []
    let totalSpent: number[] = []
    let totalMissedInterest: number[] = []

    if (timeRange === '6mo') {
      // Monthly data for 6 months
      const last6MonthDates = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return {
          year: date.getFullYear(),
          month: date.getMonth(),
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        }
      })

      const last6Months = last6MonthDates.map(({ key }) => {
        const found = monthlyHistory.find((m) => m.periodStart.startsWith(key))
        if (found) return found
        const parts = key.split('-')
        const year = parseInt(parts[0]!)
        const month = parseInt(parts[1]!)
        return {
          periodStart: `${key}-01`,
          periodEnd: `${key}-${new Date(year, month, 0).getDate()}`,
          purchasesCount: 0,
          purchasesTotal: 0,
          purchasesByCategory: {},
          avoidedCount: 0,
          avoidedTotal: 0,
          avoidedByCategory: {},
          pendingInterestOnAvoided: 0,
          pendingInterestOnSpent: 0,
          appliedInterestOnAvoided: 0,
          appliedInterestOnSpent: 0,
        }
      })

      categories = last6Months.map((period) => {
        const [year, month, day] = period.periodStart.split('-').map(Number)
        const date = new Date(year!, month! - 1, day!)
        return date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        })
      })

      // Check if current month is in the displayed range
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const currentMonthIndex = last6MonthDates.findIndex((d) => d.key === currentMonthKey)

      totalSaved = last6Months.map((period, idx) => {
        const previousMonths = monthlyHistory.slice(0, monthlyHistory.length - 6 + idx)
        const cumulativeSaved = previousMonths.reduce((sum, p) => sum + p.avoidedTotal, 0)
        return cumulativeSaved + period.avoidedTotal
      })

      totalInterest = last6Months.map((period, idx) => {
        const previousMonths = monthlyHistory.slice(0, monthlyHistory.length - 6 + idx)
        const cumulativeInterest = previousMonths.reduce((sum, p) => sum + p.appliedInterestOnAvoided, 0)
        let periodInterest = period.appliedInterestOnAvoided

        // Add pending interest to current month
        if (idx === currentMonthIndex) {
          periodInterest += period.pendingInterestOnAvoided
        }

        return cumulativeInterest + periodInterest
      })

      totalSpent = last6Months.map((period, idx) => {
        const previousMonths = monthlyHistory.slice(0, monthlyHistory.length - 6 + idx)
        const cumulativeSpent = previousMonths.reduce((sum, p) => sum + p.purchasesTotal, 0)
        return cumulativeSpent + period.purchasesTotal
      })

      totalMissedInterest = last6Months.map((period, idx) => {
        const previousMonths = monthlyHistory.slice(0, monthlyHistory.length - 6 + idx)
        const cumulativeCost = previousMonths.reduce((sum, p) => sum + p.appliedInterestOnSpent, 0)
        let periodMissed = period.appliedInterestOnSpent

        // Add pending missed interest to current month
        if (idx === currentMonthIndex) {
          periodMissed += period.pendingInterestOnSpent
        }

        return cumulativeCost + periodMissed
      })
    } else {
      // Daily data for 1 week or 1 month
      const daysCount = timeRange === '1w' ? 7 : 30
      const dates: string[] = []

      for (let i = daysCount - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        // Format directly to avoid timezone issues from toISOString()
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        dates.push(dateStr)
      }

      categories = dates.map((dateStr, idx) => {
        const [year, month, day] = dateStr.split('-').map(Number)
        const date = new Date(year!, month! - 1, day!)
        const label = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
        // For 1mo, only show label for last date and every 7 days back
        if (timeRange === '1mo') {
          const isLastDate = idx === dates.length - 1
          const daysFromEnd = dates.length - 1 - idx
          if (isLastDate || daysFromEnd % 7 === 0) {
            return label
          }
          return ''
        }
        return label
      })

      // Calculate cumulative values for each day
      totalSaved = dates.map((dateStr) => {
        return events
          .filter((e) => e.type === 'AVOIDED_PURCHASE' && e.date <= dateStr)
          .reduce((sum, e) => sum + (e.type === 'AVOIDED_PURCHASE' ? e.amount : 0), 0)
      })

      totalSpent = dates.map((dateStr) => {
        return events
          .filter((e) => e.type === 'PURCHASE' && e.date <= dateStr)
          .reduce((sum, e) => sum + (e.type === 'PURCHASE' ? e.amount : 0), 0)
      })

      // Calculate interest (applied + pending) for each day
      totalInterest = dates.map((dateStr) => {
        // Applied interest from completed months
        const appliedInterest = events
          .filter((e) => e.type === 'INTEREST_APPLICATION' && e.date <= dateStr)
          .reduce((sum, e) => sum + (e.type === 'INTEREST_APPLICATION' ? e.pendingOnAvoided : 0), 0)

        // Add pending interest calculated up to this date
        const { pendingOnAvoided } = calculatePendingInterestUpToDate(events, dateStr, defaultInterestRate)
        return appliedInterest + pendingOnAvoided
      })

      totalMissedInterest = dates.map((dateStr) => {
        // Applied missed interest from completed months
        const appliedMissed = events
          .filter((e) => e.type === 'INTEREST_APPLICATION' && e.date <= dateStr)
          .reduce((sum, e) => sum + (e.type === 'INTEREST_APPLICATION' ? e.pendingOnSpent : 0), 0)

        // Add pending missed interest calculated up to this date
        const { pendingOnSpent } = calculatePendingInterestUpToDate(events, dateStr, defaultInterestRate)
        return appliedMissed + pendingOnSpent
      })
    }

    // Get computed colors from CSS variables (DaisyUI 5)
    const computedStyle = getComputedStyle(document.documentElement)
    const baseContent =
      computedStyle.getPropertyValue('--color-base-content').trim() ||
      'oklch(21% 0.006 285.885)' // fallback for light theme
    const textColorMuted = baseContent.replace(')', ' / 0.6)')
    const lineColor = baseContent.replace(')', ' / 0.2)')
    const gridColor = baseContent.replace(')', ' / 0.1)')

    // Get semantic colors with fallbacks
    const savedColor =
      computedStyle.getPropertyValue('--color-saved').trim() ||
      'oklch(0.5 0.17 145)'
    const earnedColor =
      computedStyle.getPropertyValue('--color-earned').trim() ||
      'oklch(0.5 0.08 145)'
    const spentColor =
      computedStyle.getPropertyValue('--color-spent').trim() ||
      'oklch(0.5 0.15 300)'
    const missedColor =
      computedStyle.getPropertyValue('--color-missed').trim() ||
      'oklch(0.5 0.08 300)'

    const option: ECOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return ''
          const month = params[0]?.axisValue || ''
          let result = `<div style="font-weight: bold; margin-bottom: 4px;">${month}</div>`
          params.forEach((param: any) => {
            result += `
              <div style="display: flex; justify-content: space-between; gap: 16px;">
                <span>
                  <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${param.color}; margin-right: 5px;"></span>
                  ${param.seriesName}
                </span>
                <span style="font-weight: bold;">${formatCurrency(param.value)}</span>
              </div>
            `
          })
          return result
        },
      },

      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          interval: 0,
          color: textColorMuted,
          rotate: timeRange === '1w' || timeRange === '1mo' ? 30 : 0,
          formatter: (value: string) => {
            if (!value) return ''
            if (timeRange === '6mo') {
              const [month, year] = value.split(' ')
              return `{month|${month}}\n{year|${year}}`
            }
            // Daily format: "Nov 23"
            return value
          },
          rich: {
            month: {
              fontSize: 12,
              lineHeight: 16,
            },
            year: {
              fontSize: 10,
              lineHeight: 14,
            },
          },
        },
        axisLine: {
          lineStyle: {
            color: lineColor,
          },
        },
      },
      yAxis: {
        type: 'value',
        scale: autoScale,
        axisLabel: {
          color: textColorMuted,
          formatter: (value: number) => formatCurrency(value),
        },
        splitLine: {
          lineStyle: {
            color: gridColor,
          },
        },
        axisLine: {
          lineStyle: {
            color: lineColor,
          },
        },
      },
      series: [
        {
          name: 'Total Saved',
          type: 'line',
          stack: 'Total',
          data: totalSaved,
          showSymbol: false,
          areaStyle: {},
          itemStyle: {
            color: savedColor,
          },
          emphasis: {
            focus: 'series',
          },
        },
        {
          name: 'Total Interest',
          type: 'line',
          stack: 'Total',
          data: totalInterest,
          showSymbol: false,
          areaStyle: {},
          itemStyle: {
            color: earnedColor,
          },
          emphasis: {
            focus: 'series',
          },
        },
        {
          name: 'Total Spent',
          type: 'line',
          stack: 'Total',
          data: totalSpent,
          showSymbol: false,
          areaStyle: {},
          itemStyle: {
            color: spentColor,
          },
          emphasis: {
            focus: 'series',
          },
        },
        {
          name: 'Total Missed Interest',
          type: 'line',
          stack: 'Total',
          data: totalMissedInterest,
          showSymbol: false,
          areaStyle: {},
          itemStyle: {
            color: missedColor,
          },
          emphasis: {
            focus: 'series',
          },
        },
      ],
    }

    chart.setOption(option)

    const handleResize = () => {
      chart.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [metrics, events, defaultInterestRate, theme, autoScale, timeRange, cssReady])

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
        chartInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="bg-base-200 rounded-lg">
      <div ref={chartRef} className="w-full h-64 p-4" />
      <div className="flex items-center justify-between px-4 pb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScale}
            onChange={(e) => handleAutoScaleChange(e.target.checked)}
            className="checkbox checkbox-sm"
          />
          <span className="label-text">Scaled</span>
        </label>
        <div className="join">
          <button
            type="button"
            className={`join-item btn btn-xs ${timeRange === '1w' ? 'btn-active' : ''}`}
            onClick={() => handleTimeRangeChange('1w')}
          >
            1w
          </button>
          <button
            type="button"
            className={`join-item btn btn-xs ${timeRange === '1mo' ? 'btn-active' : ''}`}
            onClick={() => handleTimeRangeChange('1mo')}
          >
            1mo
          </button>
          <button
            type="button"
            className={`join-item btn btn-xs ${timeRange === '6mo' ? 'btn-active' : ''}`}
            onClick={() => handleTimeRangeChange('6mo')}
          >
            6mo
          </button>
        </div>
      </div>
    </div>
  )
}
