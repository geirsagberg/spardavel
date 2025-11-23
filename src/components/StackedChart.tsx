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
import { useAppStore } from '~/store/appStore'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

type ECOption = echarts.ComposeOption<
  LineSeriesOption | TooltipComponentOption | GridComponentOption
>

export function StackedChart() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const metrics = useAppStore((state) => state.metrics)
  const theme = useAppStore((state) => state.theme)
  const [autoScale, setAutoScale] = useState(() => {
    const stored = localStorage.getItem('chartAutoScale')
    return stored === null ? true : stored === 'true'
  })

  const handleAutoScaleChange = (checked: boolean) => {
    setAutoScale(checked)
    localStorage.setItem('chartAutoScale', String(checked))
  }

  useEffect(() => {
    if (!chartRef.current) return

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current)
    }

    const chart = chartInstanceRef.current
    const monthlyHistory = metrics.monthlyHistory

    // Generate last 6 months including current month
    const now = new Date()
    const last6MonthDates = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      }
    })

    // Map history data to the last 6 months, filling in zeros for missing months
    const last6Months = last6MonthDates.map(({ key }) => {
      const found = monthlyHistory.find((m) => m.periodStart.startsWith(key))
      if (found) return found
      // Return empty period for missing months
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

    const categories = last6Months.map((period) => {
      const [year, month, day] = period.periodStart.split('-').map(Number)
      const date = new Date(year!, month! - 1, day!)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    })

    const totalSaved = last6Months.map((period, idx) => {
      const previousMonths = monthlyHistory.slice(
        0,
        monthlyHistory.length - 6 + idx,
      )
      const cumulativeSaved = previousMonths.reduce(
        (sum, p) => sum + p.avoidedTotal,
        0,
      )
      return cumulativeSaved + period.avoidedTotal
    })

    const totalInterest = last6Months.map((period, idx) => {
      const previousMonths = monthlyHistory.slice(
        0,
        monthlyHistory.length - 6 + idx,
      )
      const cumulativeInterest = previousMonths.reduce(
        (sum, p) => sum + p.appliedInterestOnAvoided,
        0,
      )
      return cumulativeInterest + period.appliedInterestOnAvoided
    })

    const totalSpent = last6Months.map((period, idx) => {
      const previousMonths = monthlyHistory.slice(
        0,
        monthlyHistory.length - 6 + idx,
      )
      const cumulativeSpent = previousMonths.reduce(
        (sum, p) => sum + p.purchasesTotal,
        0,
      )
      return cumulativeSpent + period.purchasesTotal
    })

    const totalMissedInterest = last6Months.map((period, idx) => {
      const previousMonths = monthlyHistory.slice(
        0,
        monthlyHistory.length - 6 + idx,
      )
      const cumulativeCost = previousMonths.reduce(
        (sum, p) => sum + p.appliedInterestOnSpent,
        0,
      )
      return cumulativeCost + period.appliedInterestOnSpent
    })

    // Get computed colors from CSS variables (DaisyUI 5)
    const computedStyle = getComputedStyle(document.documentElement)
    const baseContent = computedStyle
      .getPropertyValue('--color-base-content')
      .trim()
    const textColor = baseContent
    const textColorMuted = baseContent.replace(')', ' / 0.6)')
    const lineColor = baseContent.replace(')', ' / 0.2)')
    const gridColor = baseContent.replace(')', ' / 0.1)')

    // Get semantic colors
    const savedColor = computedStyle.getPropertyValue('--color-saved').trim()
    const earnedColor = computedStyle.getPropertyValue('--color-earned').trim()
    const spentColor = computedStyle.getPropertyValue('--color-spent').trim()
    const missedColor = computedStyle.getPropertyValue('--color-missed').trim()

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
          formatter: (value: string) => {
            const [month, year] = value.split(' ')
            return `{month|${month}}\n{year|${year}}`
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
  }, [metrics, theme, autoScale])

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
        chartInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative">
      <div ref={chartRef} className="w-full h-64 bg-base-200 rounded-lg p-4" />
      <div className="absolute bottom-5 left-6 z-10">
        <label className="flex items-center gap-1.5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
          <input
            type="checkbox"
            checked={autoScale}
            onChange={(e) => handleAutoScaleChange(e.target.checked)}
            className="checkbox checkbox-xs border-base-content/20"
          />
          <span className="text-[10px] text-base-content/80">Scaled</span>
        </label>
      </div>
    </div>
  )
}
