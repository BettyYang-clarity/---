import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ArrowUpRight } from 'lucide-react';
import {
  ClientProfile,
  HoroscopeScope,
  TenYearTrendPoint,
  TurningPointKind,
} from '../types/holistic';
import { calculateTenYearTrend } from '../engines/tenYearTrendEngine';

interface TenYearFortuneChartProps {
  client: ClientProfile;
  targetDate: string;
  onSelectTargetYear: (year: number, scope?: HoroscopeScope) => void;
}

type ChartViewMode = 'composite' | 'breakdown';

const TURNING_STYLE: Record<
  TurningPointKind,
  { color: string; textClass: string; bgTint: string; legend: string }
> = {
  decade_shift: {
    color: '#9A7B3E',
    textClass: 'text-[#8C6830]',
    bgTint: 'bg-[#FAF5E8]',
    legend: '大運／大限換軌',
  },
  peak: {
    color: '#1E6B4B',
    textClass: 'text-[#1E6B4B]',
    bgTint: 'bg-[#EFF7F3]',
    legend: '運勢高峰',
  },
  trough: {
    color: '#A63A2B',
    textClass: 'text-[#A63A2B]',
    bgTint: 'bg-[#FCF2F0]',
    legend: '築底考驗',
  },
  pivot: {
    color: '#B45309',
    textClass: 'text-[#B45309]',
    bgTint: 'bg-[#FDF6EC]',
    legend: '關鍵轉折',
  },
};

export const TenYearFortuneChart: React.FC<TenYearFortuneChartProps> = ({
  client,
  targetDate,
  onSelectTargetYear,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lastAnimatedKeyRef = useRef<string>('');
  const [chartWidth, setChartWidth] = useState<number>(860);
  const [viewMode, setViewMode] = useState<ChartViewMode>('composite');
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  const activeTargetYear = Number(targetDate.split('-')[0]);

  const trend = useMemo(
    () => calculateTenYearTrend(client, targetDate),
    [client, targetDate]
  );

  // Selected year defaults to current target year
  const [selectedYear, setSelectedYear] = useState<number>(activeTargetYear);

  useEffect(() => {
    setSelectedYear(activeTargetYear);
  }, [client.id, activeTargetYear]);

  const focusedPoint: TenYearTrendPoint = useMemo(() => {
    const lookupYear = hoveredYear ?? selectedYear;
    return (
      trend.points.find((p) => p.year === lookupYear) ??
      trend.points[0]
    );
  }, [trend.points, hoveredYear, selectedYear]);

  // Responsive container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const next = Math.max(320, Math.floor(el.getBoundingClientRect().width));
      setChartWidth(next);
    };

    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // D3.js SVG Rendering
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || trend.points.length === 0) return;

    const width = chartWidth;
    const height = width < 560 ? 270 : 300;
    const margin = {
      top: 40,
      right: width < 560 ? 22 : 34,
      bottom: 46,
      left: width < 560 ? 36 : 44,
    };
    const innerW = Math.max(200, width - margin.left - margin.right);
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height);

    const defs = svg.append('defs');

    // Area gradient under the primary composite curve
    const gradId = `holistic-trend-area-${client.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', gradId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#2B5B4C')
      .attr('stop-opacity', 0.16);
    areaGrad
      .append('stop')
      .attr('offset', '75%')
      .attr('stop-color', '#9A7B3E')
      .attr('stop-opacity', 0.04);
    areaGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#FAF8F3')
      .attr('stop-opacity', 0);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain([trend.startYear, trend.endYear])
      .range([0, innerW]);

    const yScale = d3.scaleLinear().domain([20, 100]).range([innerH, 0]);

    // Horizontal hairline gridlines
    const yTicks = [20, 40, 60, 80, 100];
    g.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(yTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', (d) => (d === 60 ? '#CFC7B5' : '#EFEAE0'))
      .attr('stroke-width', (d) => (d === 60 ? 1.1 : 1))
      .attr('stroke-dasharray', (d) => (d === 60 ? '4,4' : 'none'));

    // Baseline equilibrium subtle label at 60
    g.append('text')
      .attr('x', innerW - 2)
      .attr('y', yScale(60) - 5)
      .attr('text-anchor', 'end')
      .attr('fill', '#8A948F')
      .attr('font-size', '10px')
      .text('平穩基準 60');

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(yTicks)
      .tickSize(0)
      .tickPadding(10);

    const yAxisG = g.append('g').call(yAxis);
    yAxisG.select('.domain').remove();
    yAxisG
      .selectAll('text')
      .attr('fill', '#73807B')
      .attr('font-size', '10.5px')
      .style('font-family', 'var(--font-mono), ui-monospace, monospace');

    // X Axis (Year + GanZhi sublabel)
    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .selectAll('g')
      .data(trend.points)
      .join('g')
      .attr('transform', (d) => `translate(${xScale(d.year)},0)`);

    xAxisG
      .append('line')
      .attr('y1', 0)
      .attr('y2', 5)
      .attr('stroke', '#D8D0BF');

    xAxisG
      .append('text')
      .attr('y', 19)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.year === activeTargetYear ? '#152924' : '#52605B'))
      .attr('font-weight', (d) => (d.year === activeTargetYear ? '700' : '500'))
      .attr('font-size', width < 560 ? '10px' : '11px')
      .style('font-family', 'var(--font-mono), ui-monospace, monospace')
      .text((d) => String(d.year));

    xAxisG
      .append('text')
      .attr('y', 34)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.turningPoint ? '#8C6830' : '#8A948F'))
      .attr('font-size', width < 560 ? '9.5px' : '10.5px')
      .text((d) => d.ganZhi);

    // Subtle baseline x axis line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', innerH)
      .attr('y2', innerH)
      .attr('stroke', '#DDD6C7');

    // Decade-shift vertical milestone lines
    const decadeShifts = trend.points.filter(
      (p) => p.turningPoint?.kind === 'decade_shift'
    );
    g.selectAll('line.decade-shift-rule')
      .data(decadeShifts)
      .join('line')
      .attr('class', 'decade-shift-rule')
      .attr('x1', (d) => xScale(d.year))
      .attr('x2', (d) => xScale(d.year))
      .attr('y1', -8)
      .attr('y2', innerH)
      .attr('stroke', '#C9A861')
      .attr('stroke-width', 1.25)
      .attr('stroke-dasharray', '3,3');

    // Focused/Hovered vertical crosshair guide
    const activeYearForGuide = hoveredYear ?? selectedYear;
    if (
      activeYearForGuide >= trend.startYear &&
      activeYearForGuide <= trend.endYear
    ) {
      g.append('line')
        .attr('x1', xScale(activeYearForGuide))
        .attr('x2', xScale(activeYearForGuide))
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', '#2B5B4C')
        .attr('stroke-opacity', 0.28)
        .attr('stroke-width', 1.2);
    }

    // Area generator
    const areaGen = d3
      .area<TenYearTrendPoint>()
      .x((d) => xScale(d.year))
      .y0(innerH)
      .y1((d) => yScale(d.compositeScore))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(trend.points)
      .attr('fill', `url(#${gradId})`)
      .attr('d', areaGen);

    // Optional 3-system breakdown curves
    if (viewMode === 'breakdown') {
      const subSeries: Array<{
        key: 'ziweiScore' | 'baziScore' | 'tarotScore';
        color: string;
        dash: string;
      }> = [
        { key: 'ziweiScore', color: '#2B5B4C', dash: '5,3' },
        { key: 'baziScore', color: '#9A7B3E', dash: '2,3' },
        { key: 'tarotScore', color: '#7D4E7A', dash: '7,3,2,3' },
      ];

      subSeries.forEach((s) => {
        const subLine = d3
          .line<TenYearTrendPoint>()
          .x((d) => xScale(d.year))
          .y((d) => yScale(d[s.key]))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(trend.points)
          .attr('fill', 'none')
          .attr('stroke', s.color)
          .attr('stroke-width', 1.45)
          .attr('stroke-opacity', 0.78)
          .attr('stroke-dasharray', s.dash)
          .attr('d', subLine);
      });
    }

    // Primary Holistic Composite Line
    const lineGen = d3
      .line<TenYearTrendPoint>()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.compositeScore))
      .curve(d3.curveMonotoneX);

    const primaryPath = g
      .append('path')
      .datum(trend.points)
      .attr('fill', 'none')
      .attr('stroke', '#152924')
      .attr('stroke-width', 2.4)
      .attr('stroke-linecap', 'round')
      .attr('d', lineGen);

    // Subtle stroke draw animation ONLY on client/window/mode change (never on hover)
    const animationKey = `${client.id}|${trend.startYear}|${viewMode}`;
    const shouldAnimate = lastAnimatedKeyRef.current !== animationKey;
    lastAnimatedKeyRef.current = animationKey;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (shouldAnimate && !prefersReduced) {
      const pathEl = primaryPath.node();
      const totalLength = pathEl?.getTotalLength() ?? 0;
      if (pathEl && totalLength > 0 && typeof pathEl.animate === 'function') {
        pathEl.setAttribute('stroke-dasharray', `${totalLength} ${totalLength}`);
        const anim = pathEl.animate(
          [
            { strokeDashoffset: totalLength },
            { strokeDashoffset: 0 },
          ],
          { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
        anim.onfinish = () => {
          pathEl.setAttribute('stroke-dasharray', 'none');
        };
      }
    }

    // Data nodes & Turning Point Markers
    const nodeGroups = g
      .selectAll('g.data-node')
      .data(trend.points)
      .join('g')
      .attr('class', 'data-node')
      .attr('transform', (d) => `translate(${xScale(d.year)},${yScale(d.compositeScore)})`);

    nodeGroups.each(function (d, idx) {
      const node = d3.select(this);
      const isFocused = d.year === activeYearForGuide;
      const tp = d.turningPoint;

      if (tp) {
        const style = TURNING_STYLE[tp.kind];

        // Outer halo ring for focused turning point
        if (isFocused) {
          node
            .append('circle')
            .attr('r', 11)
            .attr('fill', style.color)
            .attr('fill-opacity', 0.14);
        }

        if (tp.kind === 'decade_shift') {
          // Diamond milestone marker for Decade/Decadal Shift
          node
            .append('path')
            .attr('d', d3.symbol().type(d3.symbolDiamond).size(isFocused ? 115 : 88)())
            .attr('fill', style.color)
            .attr('stroke', '#FFFFFF')
            .attr('stroke-width', 1.8);
        } else {
          // Double-ring node for Peak / Trough / Pivot
          node
            .append('circle')
            .attr('r', isFocused ? 7 : 5.8)
            .attr('fill', '#FFFFFF')
            .attr('stroke', style.color)
            .attr('stroke-width', 2.4);

          node
            .append('circle')
            .attr('r', 2.4)
            .attr('fill', style.color);
        }

        // Non-overlapping callout label placement
        const yPos = yScale(d.compositeScore);
        const preferBelow =
          tp.kind === 'trough' ||
          yPos < 28 ||
          (idx > 0 &&
            trend.points[idx - 1].turningPoint !== null &&
            trend.points[idx - 1].turningPoint?.kind !== 'trough' &&
            Math.abs(yScale(trend.points[idx - 1].compositeScore) - yPos) < 28);

        const labelY = preferBelow ? 22 : -14;
        const textAnchor =
          idx === 0 ? 'start' : idx === trend.points.length - 1 ? 'end' : 'middle';
        const labelDx = idx === 0 ? -4 : idx === trend.points.length - 1 ? 4 : 0;

        node
          .append('text')
          .attr('x', labelDx)
          .attr('y', labelY)
          .attr('text-anchor', textAnchor)
          .attr('fill', style.color)
          .attr('font-size', width < 560 ? '9.5px' : '10.5px')
          .attr('font-weight', '600')
          .text(`${tp.shortTag} ${d.compositeScore}`);
      } else {
        // Regular year node
        if (isFocused) {
          node
            .append('circle')
            .attr('r', 8.5)
            .attr('fill', '#152924')
            .attr('fill-opacity', 0.12);
        }
        node
          .append('circle')
          .attr('r', isFocused ? 5 : 3.6)
          .attr('fill', isFocused ? '#152924' : '#FAF8F3')
          .attr('stroke', '#152924')
          .attr('stroke-width', 1.8);

        if (isFocused) {
          node
            .append('text')
            .attr('y', yScale(d.compositeScore) < 26 ? 20 : -12)
            .attr('text-anchor', 'middle')
            .attr('fill', '#152924')
            .attr('font-size', '10.5px')
            .attr('font-weight', '600')
            .style('font-family', 'var(--font-mono), ui-monospace, monospace')
            .text(String(d.compositeScore));
        }
      }
    });

    // Full-height invisible interactive columns per year for smooth hover & click
    const colWidth = innerW / Math.max(1, trend.points.length - 1);
    g.selectAll('rect.hit-col')
      .data(trend.points)
      .join('rect')
      .attr('class', 'hit-col')
      .attr('x', (d, idx) =>
        idx === 0 ? -margin.left * 0.4 : xScale(d.year) - colWidth / 2
      )
      .attr('y', -12)
      .attr('width', (d, idx) =>
        idx === 0 || idx === trend.points.length - 1
          ? colWidth / 2 + margin.left * 0.4
          : colWidth
      )
      .attr('height', innerH + 46)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        setHoveredYear(d.year);
      })
      .on('click', (_event, d) => {
        setSelectedYear(d.year);
      });

    svg.on('mouseleave', () => {
      setHoveredYear(null);
    });
  }, [
    chartWidth,
    client.id,
    trend,
    viewMode,
    hoveredYear,
    selectedYear,
    activeTargetYear,
  ]);

  const focusedTpStyle = focusedPoint.turningPoint
    ? TURNING_STYLE[focusedPoint.turningPoint.kind]
    : null;

  return (
    <section
      aria-label="未來十年全息運勢趨勢圖"
      className="rounded-lg border border-[#DDD6C7] bg-white p-5"
    >
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#ECE6DA] pb-3.5 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-serif text-base font-semibold text-[#152924]">
            未來十年運程趨勢與關鍵轉折點（{trend.startYear}–{trend.endYear}）
          </h2>
          <p className="mt-0.5 text-xs text-[#6B7974] tabular-nums">
            整合紫微流年四化・八字歲運長生神煞・塔羅個人流年牌 · 十年均勢{' '}
            <span className="font-mono font-medium text-[#152924]">
              {trend.averageScore}
            </span>{' '}
            · 高峰{' '}
            <span className="font-mono font-medium text-[#1E6B4B]">
              {trend.peakPoint.year} ({trend.peakPoint.compositeScore})
            </span>{' '}
            · 築底{' '}
            <span className="font-mono font-medium text-[#A63A2B]">
              {trend.troughPoint.year} ({trend.troughPoint.compositeScore})
            </span>
          </p>
        </div>

        {/* Mode Segmented Control */}
        <div
          role="group"
          aria-label="趨勢圖顯示模式"
          className="flex items-center gap-0.5 self-start rounded-md border border-[#DDD6C7] bg-[#EFEBE2] p-0.5 sm:self-auto"
        >
          <button
            type="button"
            onClick={() => setViewMode('composite')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'composite'
                ? 'bg-[#152924] text-[#FAF8F3]'
                : 'text-[#4C5A55] hover:text-[#152924]'
            }`}
          >
            綜合運勢曲線
          </button>
          <button
            type="button"
            onClick={() => setViewMode('breakdown')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'breakdown'
                ? 'bg-[#152924] text-[#FAF8F3]'
                : 'text-[#4C5A55] hover:text-[#152924]'
            }`}
          >
            三盤拆解對照
          </button>
        </div>
      </div>

      {/* Inline Legend Strip (Clean Typographic Symbols, Zero Pills) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 text-[11.5px] text-[#5C6B66]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-[2px] w-4 bg-[#152924]" />
            全息綜合指數
          </span>
          {viewMode === 'breakdown' && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0 w-4 border-t-[1.5px] border-dashed border-[#2B5B4C]" />
                紫微流年
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0 w-4 border-t-[1.5px] border-dotted border-[#9A7B3E]" />
                八字歲運
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0 w-4 border-t-[1.5px] border-dashed border-[#7D4E7A]" />
                塔羅流年
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 text-[#8C6830]">
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
              <polygon points="5,0.5 9.5,5 5,9.5 0.5,5" fill="#9A7B3E" />
            </svg>
            大運／大限換軌
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#1E6B4B]">
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
              <circle cx="5" cy="5" r="3.5" fill="#fff" stroke="#1E6B4B" strokeWidth="2" />
            </svg>
            運勢高峰
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#A63A2B]">
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
              <circle cx="5" cy="5" r="3.5" fill="#fff" stroke="#A63A2B" strokeWidth="2" />
            </svg>
            築底考驗
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#B45309]">
            <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
              <circle cx="5" cy="5" r="3.5" fill="#fff" stroke="#B45309" strokeWidth="2" />
            </svg>
            關鍵轉折
          </span>
        </div>
      </div>

      {/* D3 SVG Canvas */}
      <div ref={containerRef} className="relative mt-2 w-full overflow-hidden">
        <svg
          ref={svgRef}
          role="img"
          aria-label={`${client.name} ${trend.startYear}至${trend.endYear}年全息運勢波動折線圖`}
          className="block w-full select-none"
        />
      </div>

      {/* Focused Year Live Inspector Strip (Hairline Divider, No Nested Card Border) */}
      <div className="mt-3 border-t border-[#ECE6DA] pt-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-base font-bold text-[#152924] tabular-nums">
              {focusedPoint.year} 年（{focusedPoint.ganZhi}）
            </span>
            <span className="text-xs text-[#64736D] tabular-nums">
              約 {focusedPoint.age} 歲 · 綜合運勢指數{' '}
              <strong className="font-mono text-[#152924]">
                {focusedPoint.compositeScore}
              </strong>
              {focusedPoint.deltaFromPrev !== null && (
                <span
                  className={`ml-1 font-mono ${
                    focusedPoint.deltaFromPrev > 0
                      ? 'text-[#1E6B4B]'
                      : focusedPoint.deltaFromPrev < 0
                        ? 'text-[#A63A2B]'
                        : 'text-[#64736D]'
                  }`}
                >
                  ({focusedPoint.deltaFromPrev > 0 ? '+' : ''}
                  {focusedPoint.deltaFromPrev})
                </span>
              )}
            </span>
            {focusedPoint.turningPoint && focusedTpStyle && (
              <span
                className={`text-xs font-semibold ${focusedTpStyle.textClass}`}
              >
                — {focusedPoint.turningPoint.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 font-mono text-[11px] text-[#5C6B66] tabular-nums">
              <span>紫微 {focusedPoint.ziweiScore}</span>
              <span aria-hidden="true">·</span>
              <span>八字 {focusedPoint.baziScore}</span>
              <span aria-hidden="true">·</span>
              <span>塔羅 {focusedPoint.tarotScore}</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectTargetYear(focusedPoint.year, 'yearly')}
              disabled={focusedPoint.year === activeTargetYear}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] disabled:text-[#9AA5A0] whitespace-nowrap shrink-0"
            >
              {focusedPoint.year === activeTargetYear
                ? '目前排盤年份'
                : `跳轉 ${focusedPoint.year} 年排盤`}
              {focusedPoint.year !== activeTargetYear && (
                <ArrowUpRight className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {focusedPoint.turningPoint && (
          <p className="mt-1.5 text-xs leading-relaxed text-[#43524D]">
            <span className="font-semibold text-[#152924]">轉折解讀：</span>
            {focusedPoint.turningPoint.reason}
          </p>
        )}

        {/* 3-System Detail Breakdown for Focused Year */}
        <div className="mt-2.5 grid grid-cols-1 gap-3 text-xs leading-relaxed text-[#43524D] md:grid-cols-3">
          <div>
            <span className="font-semibold text-[#152924]">紫微流年：</span>
            命宮落本命「{focusedPoint.ziweiYearlyPalaceName}」（
            {focusedPoint.ziweiYearlyMajorStars.join('・')}）；大限{' '}
            {focusedPoint.ziweiDecadalRange[0]}–{focusedPoint.ziweiDecadalRange[1]}歲（
            {focusedPoint.ziweiDecadalGanZhi}）；{focusedPoint.ziweiYearlyMutagenSummary}
          </div>
          <div>
            <span className="font-semibold text-[#2B5B4C]">八字歲運：</span>
            流年「{focusedPoint.ganZhi}」{focusedPoint.baziYearTenStar}・
            {focusedPoint.baziYearTerrain}
            {focusedPoint.baziDecadeGanZhi
              ? `（大運 ${focusedPoint.baziDecadeGanZhi}）`
              : ''}
            {focusedPoint.baziBranchRelation
              ? ` · ${focusedPoint.baziBranchRelation}`
              : ''}
            {focusedPoint.baziAuspiciousStars.length > 0
              ? ` · 吉神：${focusedPoint.baziAuspiciousStars.join('、')}`
              : ''}
            {focusedPoint.baziCautionStars.length > 0
              ? ` · 留意：${focusedPoint.baziCautionStars.join('、')}`
              : ''}
          </div>
          <div>
            <span className="font-semibold text-[#8C6830]">塔羅流年：</span>
            {focusedPoint.tarotYearCardDisplayNumber} 號「
            {focusedPoint.tarotYearCardName}」
            {focusedPoint.tarotRootCardName
              ? `（輔助根數：${focusedPoint.tarotRootCardName}）`
              : ''}
            {focusedPoint.tarotShadowActivated
              ? ' · 觸發本命陰影導師牌'
              : focusedPoint.tarotConstellationResonance
                ? ' · 與本命家族共振'
                : ''}
          </div>
        </div>
      </div>

      {/* Key Turning Points Quick Index */}
      {trend.turningPoints.length > 0 && (
        <div className="mt-4 border-t border-[#ECE6DA] pt-3.5">
          <div className="text-[11.5px] font-medium text-[#73807B]">
            未來十年關鍵轉折節點（點擊切換檢視）
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {trend.turningPoints.map((pt) => {
              const tp = pt.turningPoint!;
              const st = TURNING_STYLE[tp.kind];
              const isSelected = pt.year === focusedPoint.year;
              return (
                <button
                  key={pt.year}
                  type="button"
                  onClick={() => setSelectedYear(pt.year)}
                  className={`flex flex-col items-start rounded-md border px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? 'border-[#152924] bg-[#FAF8F3]'
                      : 'border-[#ECE6DA] bg-white hover:border-[#CFC7B5] hover:bg-[#FAF8F3]/60'
                  }`}
                >
                  <div className="flex w-full items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#152924] tabular-nums">
                      {pt.year} {pt.ganZhi}
                    </span>
                    <span className={`text-[11px] font-semibold ${st.textClass}`}>
                      {tp.shortTag} · {pt.compositeScore}
                    </span>
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-[#5C6B66]">
                    {tp.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
