"use client"

import type { PointerEvent } from "react"

import { AxisBottom, AxisLeft } from "@visx/axis"
import { localPoint } from "@visx/event"
import { GridRows } from "@visx/grid"
import { Group } from "@visx/group"
import { ParentSize } from "@visx/responsive"
import { scaleLinear } from "@visx/scale"
import { AreaClosed, LinePath } from "@visx/shape"
import { TooltipWithBounds, useTooltip } from "@visx/tooltip"

import { formatCount } from "./format"

export interface AnalyticsTrendChartDatum {
  timestamp: string
  label: string
  axisLabel: string
  primaryValue: number
  secondaryValue: number
}

interface AnalyticsTrendChartProps {
  data: AnalyticsTrendChartDatum[]
  locale: string
  chartId: string
  accessibleTitle: string
  accessibleDescription: string
  primaryLabel: string
  secondaryLabel: string
}

interface TrendChartCanvasProps extends AnalyticsTrendChartProps {
  width: number
  height: number
}

const chartMargin = {
  top: 24,
  right: 16,
  bottom: 38,
  left: 48,
}

function getSafeValue(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function getNiceStep(value: number) {
  if (value <= 0) {
    return 1
  }

  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10

  return multiplier * magnitude
}

function getYAxis(maxValue: number, intervalCount: number) {
  const step = Math.max(1, getNiceStep(maxValue / intervalCount))
  const axisMax = Math.max(step, Math.ceil(maxValue / step) * step)
  const ticks = Array.from(
    { length: Math.round(axisMax / step) + 1 },
    (_, index) => index * step,
  )

  return {
    domainMax: axisMax * 1.1,
    ticks,
  }
}

function getLabelIndices(length: number, maximumLabels: number) {
  if (length <= maximumLabels) {
    return Array.from({ length }, (_, index) => index)
  }

  const lastIndex = length - 1
  const intervals = Math.max(1, maximumLabels - 1)

  return Array.from(
    new Set(
      Array.from({ length: intervals + 1 }, (_, index) =>
        Math.round((index / intervals) * lastIndex),
      ),
    ),
  )
}

function TrendChartCanvas({
  data,
  locale,
  chartId,
  accessibleTitle,
  accessibleDescription,
  primaryLabel,
  secondaryLabel,
  width,
  height,
}: TrendChartCanvasProps) {
  const {
    tooltipData,
    tooltipLeft,
    tooltipOpen,
    tooltipTop,
    hideTooltip,
    showTooltip,
  } = useTooltip<AnalyticsTrendChartDatum>()
  const innerWidth = Math.max(0, width - chartMargin.left - chartMargin.right)
  const innerHeight = Math.max(0, height - chartMargin.top - chartMargin.bottom)
  const maximumValue = Math.max(
    1,
    ...data.flatMap((point) => [
      getSafeValue(point.primaryValue),
      getSafeValue(point.secondaryValue),
    ]),
  )
  const yAxis = getYAxis(maximumValue, innerHeight >= 240 ? 4 : 3)
  const xDomain = data.length === 1 ? [-1, 1] : [0, data.length - 1]
  const xScale = scaleLinear<number>({
    domain: xDomain,
    range: [0, innerWidth],
  })
  const yScale = scaleLinear<number>({
    domain: [0, yAxis.domainMax],
    range: [innerHeight, 0],
    clamp: true,
  })
  const maximumLabels = Math.max(2, Math.floor(innerWidth / 120) + 1)
  const labelIndices = getLabelIndices(data.length, maximumLabels)
  const activeIndex = tooltipData
    ? data.findIndex((point) => point.timestamp === tooltipData.timestamp)
    : -1

  function getX(index: number) {
    return xScale(index)
  }

  function showPoint(index: number) {
    const point = data[index]
    if (!point) {
      return
    }

    const x = getX(index)
    const primaryY = yScale(getSafeValue(point.primaryValue))
    const secondaryY = yScale(getSafeValue(point.secondaryValue))

    showTooltip({
      tooltipData: point,
      tooltipLeft: chartMargin.left + x,
      tooltipTop: chartMargin.top + Math.min(primaryY, secondaryY),
    })
  }

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const point = localPoint(event)
    if (!point || innerWidth <= 0) {
      return
    }

    const rawIndex = xScale.invert(point.x - chartMargin.left)
    const index = Math.max(0, Math.min(data.length - 1, Math.round(rawIndex)))
    if (index === activeIndex) {
      return
    }

    showPoint(index)
  }

  if (innerWidth <= 0 || innerHeight <= 0) {
    return null
  }

  return (
    <div className="relative h-full w-full">
      <svg
        width={width}
        height={height}
        role="img"
        aria-labelledby={`${chartId}-title ${chartId}-description`}
        className="block overflow-visible"
      >
        <title id={`${chartId}-title`}>{accessibleTitle}</title>
        <desc id={`${chartId}-description`}>{accessibleDescription}</desc>

        <Group left={chartMargin.left} top={chartMargin.top}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            tickValues={yAxis.ticks}
            stroke="var(--line)"
            strokeWidth={1}
            shapeRendering="crispEdges"
            pointerEvents="none"
          />

          <AreaClosed
            data={data}
            x={(_, index) => getX(index)}
            y={(point) => yScale(getSafeValue(point.primaryValue))}
            yScale={yScale}
            fill="var(--accent)"
            fillOpacity={0.1}
            stroke="transparent"
          />

          <LinePath
            data={data}
            x={(_, index) => getX(index)}
            y={(point) => yScale(getSafeValue(point.secondaryValue))}
            fill="transparent"
            stroke="var(--line-strong)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <LinePath
            data={data}
            x={(_, index) => getX(index)}
            y={(point) => yScale(getSafeValue(point.primaryValue))}
            fill="transparent"
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <AxisLeft
            scale={yScale}
            tickValues={yAxis.ticks}
            hideAxisLine
            hideTicks
            tickFormat={(value) => formatCount(Number(value), locale)}
            tickLabelProps={() => ({
              fill: "var(--muted)",
              fontSize: 11,
              textAnchor: "end",
              dx: -8,
              dy: "0.33em",
            })}
          />

          <AxisBottom
            top={innerHeight}
            scale={xScale}
            tickValues={labelIndices}
            hideAxisLine
            hideTicks
            tickFormat={(value) => data[Math.round(Number(value))]?.axisLabel ?? ""}
            tickLabelProps={(_, index) => ({
              fill: "var(--muted)",
              fontSize: 11,
              textAnchor:
                labelIndices.length === 1
                  ? "middle"
                  : index === 0
                    ? "start"
                    : index === labelIndices.length - 1
                      ? "end"
                      : "middle",
              dy: 12,
            })}
          />

          {activeIndex >= 0 && tooltipData ? (
            <g aria-hidden="true" pointerEvents="none">
              <line
                x1={getX(activeIndex)}
                x2={getX(activeIndex)}
                y1={0}
                y2={innerHeight}
                stroke="var(--line-strong)"
                strokeWidth={1}
              />
              <circle
                cx={getX(activeIndex)}
                cy={yScale(getSafeValue(tooltipData.secondaryValue))}
                r={4}
                fill="var(--panel)"
                stroke="var(--line-strong)"
                strokeWidth={2}
              />
              <circle
                cx={getX(activeIndex)}
                cy={yScale(getSafeValue(tooltipData.primaryValue))}
                r={4}
                fill="var(--panel)"
                stroke="var(--accent)"
                strokeWidth={2}
              />
            </g>
          ) : null}

          <rect
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerMove}
            onPointerLeave={hideTooltip}
          />
        </Group>
      </svg>

      {tooltipOpen && tooltipData ? (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            position: "absolute",
            backgroundColor: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "0.5rem",
            boxShadow: "none",
            color: "var(--ink)",
            fontSize: "0.75rem",
            lineHeight: "1.25rem",
            padding: "0.5rem 0.75rem",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <p className="font-semibold">{tooltipData.label}</p>
          <dl className="mt-2 grid min-w-40 gap-1.5">
            <div className="flex items-center justify-between gap-5">
              <dt className="inline-flex items-center gap-2 text-muted">
                <span className="h-2 w-2 rounded-full bg-accent" />
                {primaryLabel}
              </dt>
              <dd className="font-semibold tabular-nums">
                {formatCount(tooltipData.primaryValue, locale)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-5">
              <dt className="inline-flex items-center gap-2 text-muted">
                <span className="h-2 w-2 rounded-full bg-line-strong" />
                {secondaryLabel}
              </dt>
              <dd className="font-semibold tabular-nums">
                {formatCount(tooltipData.secondaryValue, locale)}
              </dd>
            </div>
          </dl>
        </TooltipWithBounds>
      ) : null}
    </div>
  )
}

export function AnalyticsTrendChart(props: AnalyticsTrendChartProps) {
  return (
    <div className="h-72 min-w-[40rem] w-full sm:h-80">
      <ParentSize debounceTime={50}>
        {({ width, height }) => (
          <TrendChartCanvas {...props} width={width} height={height} />
        )}
      </ParentSize>
    </div>
  )
}
