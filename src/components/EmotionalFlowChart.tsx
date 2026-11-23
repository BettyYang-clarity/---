import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ArrowRight, HeartHandshake } from 'lucide-react';
import {
  ClientProfile,
  EmotionalResonanceKind,
  MonthlyEmotionalFlowPoint,
} from '../types/holistic';
import { calculateEmotionalFlow } from '../engines/emotionalFlowEngine';

interface EmotionalFlowChartProps {
  client: ClientProfile;
  targetDate: string;
  onAskFollowUp?: (question: string, topicTag?: string) => void;
  chatLoading?: boolean;
  hideTechnicalCoords?: boolean;
}

type DualAxisMode = 'dual' | 'gap';

const RESONANCE_COLOR: Record<EmotionalResonanceKind, string> = {
  aligned_high: 'text-[#1E6B4B]',
  outer_high_inner_low: 'text-[#9D4A54]',
  outer_low_inner_calm: 'text-[#244E70]',
  both_gentle: 'text-[#8C6830]',
  steady_flow: 'text-[#4C5A55]',
};

export const EmotionalFlowChart: React.FC<EmotionalFlowChartProps> = ({
  client,
  targetDate,
  onAskFollowUp,
  chatLoading = false,
  hideTechnicalCoords = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lastAnimKeyRef = useRef<string>('');
  const [chartWidth, setChartWidth] = useState<number>(860);
  const [mode, setMode] = useState<DualAxisMode>('dual');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const flow = useMemo(
    () => calculateEmotionalFlow(client, targetDate),
    [client, targetDate]
  );

  const [selectedMonth, setSelectedMonth] = useState<number>(flow.targetMonth);

  useEffect(() => {
    setSelectedMonth(flow.targetMonth);
  }, [client.id, flow.year, flow.targetMonth]);

  const focusedPoint: MonthlyEmotionalFlowPoint = useMemo(() => {
    const m = hoveredMonth ?? selectedMonth;
    return flow.points.find((p) => p.month === m) ?? flow.points[0];
  }, [flow.points, hoveredMonth, selectedMonth]);

  // Responsive container width
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

  // D3.js Dual-Axis SVG Rendering
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || flow.points.length === 0) return;

    const width = chartWidth;
    const height = width < 560 ? 275 : 305;
    const margin = {
      top: 38,
      right: width < 560 ? 44 : 56,
      bottom: 44,
      left: width < 560 ? 42 : 52,
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
    const safeId = client.id.replace(/[^a-zA-Z0-9_-]/g, '');

    // Dual-tone vertical gradient for Emotional Flow wave (above 0 warm rose-gold, below 0 soft mist-plum)
    const emoGradId = `emo-wave-grad-${safeId}`;
    const emoGrad = defs
      .append('linearGradient')
      .attr('id', emoGradId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    emoGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#B56B70')
      .attr('stop-opacity', 0.2);
    emoGrad
      .append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#C9A861')
      .attr('stop-opacity', 0.04);
    emoGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#7A4E73')
      .attr('stop-opacity', 0.16);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([1, 12]).range([0, innerW]);

    // Left Axis: Outer Destiny Fortune (0..100)
    const yLeft = d3.scaleLinear().domain([15, 100]).range([innerH, 0]);

    // Right Axis: Inner Emotional Flow (-50..+50), aligned so 0 sits near 58 on left axis
    const yRight = d3.scaleLinear().domain([-50, 50]).range([innerH, 0]);

    // Horizontal hairline gridlines synced with Right Axis equilibrium (-50, -25, 0, +25, +50)
    const rightTicks = [-50, -25, 0, 25, 50];
    g.append('g')
      .selectAll('line')
      .data(rightTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => yRight(d))
      .attr('y2', (d) => yRight(d))
      .attr('stroke', (d) => (d === 0 ? '#CFC7B5' : '#EFEAE0'))
      .attr('stroke-width', (d) => (d === 0 ? 1.15 : 1))
      .attr('stroke-dasharray', (d) => (d === 0 ? '4,4' : 'none'));

    // Left Y-Axis (外在運程)
    const leftTicks = [20, 40, 60, 80, 100];
    const leftAxisG = g
      .append('g')
      .call(d3.axisLeft(yLeft).tickValues(leftTicks).tickSize(0).tickPadding(10));
    leftAxisG.select('.domain').remove();
    leftAxisG
      .selectAll('text')
      .attr('fill', '#2B5B4C')
      .attr('font-size', '10px')
      .style('font-family', 'var(--font-mono), ui-monospace, monospace');

    // Left Axis Title
    g.append('text')
      .attr('x', -6)
      .attr('y', -16)
      .attr('text-anchor', 'start')
      .attr('fill', '#152924')
      .attr('font-size', '10.5px')
      .attr('font-weight', '600')
      .text('左軸：外在運程 (0–100)');

    // Right Y-Axis (內在情緒心流)
    const rightAxisG = g
      .append('g')
      .attr('transform', `translate(${innerW},0)`)
      .call(
        d3
          .axisRight(yRight)
          .tickValues(rightTicks)
          .tickSize(0)
          .tickPadding(10)
          .tickFormat((v) => {
            const n = Number(v);
            return n > 0 ? `+${n}` : String(n);
          })
      );
    rightAxisG.select('.domain').remove();
    rightAxisG
      .selectAll('text')
      .attr('fill', '#9D4A54')
      .attr('font-size', '10px')
      .style('font-family', 'var(--font-mono), ui-monospace, monospace');

    // Right Axis Title
    g.append('text')
      .attr('x', innerW + 6)
      .attr('y', -16)
      .attr('text-anchor', 'end')
      .attr('fill', '#9D4A54')
      .attr('font-size', '10.5px')
      .attr('font-weight', '600')
      .text('右軸：內在情緒心流 (-50~+50)');

    // X Axis (1月–12月 + 流月干支)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', innerH)
      .attr('y2', innerH)
      .attr('stroke', '#DDD6C7');

    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .selectAll('g')
      .data(flow.points)
      .join('g')
      .attr('transform', (d) => `translate(${xScale(d.month)},0)`);

    xAxisG
      .append('line')
      .attr('y1', 0)
      .attr('y2', 5)
      .attr('stroke', '#D8D0BF');

    xAxisG
      .append('text')
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) =>
        d.isTargetMonth ? '#152924' : d.isBirthdaySwitchMonth ? '#8C6830' : '#52605B'
      )
      .attr('font-weight', (d) =>
        d.isTargetMonth || d.isBirthdaySwitchMonth ? '700' : '500'
      )
      .attr('font-size', width < 560 ? '9.5px' : '11px')
      .text((d) => d.monthLabel);

    xAxisG
      .append('text')
      .attr('y', 33)
      .attr('text-anchor', 'middle')
      .attr('fill', '#8A948F')
      .attr('font-size', width < 560 ? '9px' : '10px')
      .text((d) => d.baziMonthGanZhi);

    // Birthday Tarot Archetype Switch Milestone Vertical Line
    const switchPt = flow.points.find((p) => p.isBirthdaySwitchMonth);
    if (switchPt) {
      const sx = xScale(switchPt.month);
      g.append('line')
        .attr('x1', sx)
        .attr('x2', sx)
        .attr('y1', -2)
        .attr('y2', innerH)
        .attr('stroke', '#C9A861')
        .attr('stroke-width', 1.25)
        .attr('stroke-dasharray', '3,3');

      g.append('text')
        .attr('x', sx)
        .attr('y', -6)
        .attr(
          'text-anchor',
          switchPt.month <= 2 ? 'start' : switchPt.month >= 11 ? 'end' : 'middle'
        )
        .attr('fill', '#8C6830')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text(`生日換牌：${flow.postBirthdayCardName}`);
    }

    // Active/Hovered Vertical Crosshair
    const activeMonth = hoveredMonth ?? selectedMonth;
    g.append('line')
      .attr('x1', xScale(activeMonth))
      .attr('x2', xScale(activeMonth))
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#152924')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 1.2);

    // Optional Gap Highlight Mode: vertical tension bars between outer fortune & inner emotional flow
    if (mode === 'gap') {
      g.selectAll('line.empathy-gap-bar')
        .data(flow.points)
        .join('line')
        .attr('class', 'empathy-gap-bar')
        .attr('x1', (d) => xScale(d.month))
        .attr('x2', (d) => xScale(d.month))
        .attr('y1', (d) => yLeft(d.fortuneScore))
        .attr('y2', (d) => yRight(d.emotionalScore))
        .attr('stroke', (d) =>
          d.resonanceKind === 'outer_high_inner_low'
            ? '#B54B57'
            : d.resonanceKind === 'outer_low_inner_calm'
              ? '#244E70'
              : '#C9A861'
        )
        .attr('stroke-width', (d) =>
          d.resonanceKind === 'outer_high_inner_low' ? 4 : 2.2
        )
        .attr('stroke-opacity', (d) =>
          d.resonanceKind === 'outer_high_inner_low' ? 0.32 : 0.18
        )
        .attr('stroke-linecap', 'round');
    }

    // Emotional Flow Ribbon Area (relative to 0 equilibrium line)
    const emoAreaGen = d3
      .area<MonthlyEmotionalFlowPoint>()
      .x((d) => xScale(d.month))
      .y0(yRight(0))
      .y1((d) => yRight(d.emotionalScore))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(flow.points)
      .attr('fill', `url(#${emoGradId})`)
      .attr('d', emoAreaGen);

    // Curve 1 (Left Axis): Outer Destiny Fortune Line (Deep Ink Green)
    const fortuneLineGen = d3
      .line<MonthlyEmotionalFlowPoint>()
      .x((d) => xScale(d.month))
      .y((d) => yLeft(d.fortuneScore))
      .curve(d3.curveMonotoneX);

    const fortunePath = g
      .append('path')
      .datum(flow.points)
      .attr('fill', 'none')
      .attr('stroke', '#152924')
      .attr('stroke-width', 2.2)
      .attr('stroke-linecap', 'round')
      .attr('d', fortuneLineGen);

    // Curve 2 (Right Axis): Inner Emotional Flow Line (Warm Rose-Plum)
    const emoLineGen = d3
      .line<MonthlyEmotionalFlowPoint>()
      .x((d) => xScale(d.month))
      .y((d) => yRight(d.emotionalScore))
      .curve(d3.curveMonotoneX);

    const emoPath = g
      .append('path')
      .datum(flow.points)
      .attr('fill', 'none')
      .attr('stroke', '#9D4A54')
      .attr('stroke-width', 2.2)
      .attr('stroke-dasharray', '6,3')
      .attr('stroke-linecap', 'round')
      .attr('d', emoLineGen);

    // Subtle entrance animation only when client/year/mode changes
    const animKey = `${client.id}|${flow.year}|${mode}`;
    const shouldAnimate = lastAnimKeyRef.current !== animKey;
    lastAnimKeyRef.current = animKey;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (shouldAnimate && !prefersReduced) {
      [fortunePath, emoPath].forEach((p, idx) => {
        const len = p.node()?.getTotalLength() ?? 0;
        if (len > 0) {
          p.attr('stroke-dasharray', `${len} ${len}`)
            .attr('stroke-dashoffset', len)
            .transition()
            .duration(440)
            .ease(d3.easeCubicOut)
            .attr('stroke-dashoffset', 0)
            .on('end', () => {
              p.attr('stroke-dasharray', idx === 1 ? '6,3' : 'none');
            });
        }
      });
    }

    // Nodes on Both Curves
    flow.points.forEach((d) => {
      const cx = xScale(d.month);
      const isFocused = d.month === activeMonth;
      const isBurnout = d.resonanceKind === 'outer_high_inner_low';

      // Outer Fortune Node (Left Axis)
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', yLeft(d.fortuneScore))
        .attr('r', isFocused ? 5.2 : 3.2)
        .attr('fill', isFocused ? '#152924' : '#FFFFFF')
        .attr('stroke', '#152924')
        .attr('stroke-width', 1.8);

      // Inner Emotion Node (Right Axis)
      if (isBurnout || isFocused) {
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', yRight(d.emotionalScore))
          .attr('r', isFocused ? 9.5 : 7.5)
          .attr('fill', '#9D4A54')
          .attr('fill-opacity', isFocused ? 0.16 : 0.1);
      }

      g.append('circle')
        .attr('cx', cx)
        .attr('cy', yRight(d.emotionalScore))
        .attr('r', isFocused ? 5.2 : isBurnout ? 4.4 : 3.2)
        .attr('fill', isFocused || isBurnout ? '#9D4A54' : '#FFFFFF')
        .attr('stroke', '#9D4A54')
        .attr('stroke-width', 1.8);

      // Quiet label on burnout care month
      if (isBurnout && !isFocused) {
        g.append('text')
          .attr('x', cx)
          .attr('y', yRight(d.emotionalScore) + 17)
          .attr('text-anchor', 'middle')
          .attr('fill', '#9D4A54')
          .attr('font-size', '9.5px')
          .attr('font-weight', '600')
          .text('宜喘息');
      }
    });

    // Full-height invisible hit columns for instant hover & click
    const colW = innerW / 11;
    g.selectAll('rect.month-hit')
      .data(flow.points)
      .join('rect')
      .attr('class', 'month-hit')
      .attr('x', (d, idx) => (idx === 0 ? -16 : xScale(d.month) - colW / 2))
      .attr('y', -10)
      .attr('width', (_d, idx) =>
        idx === 0 || idx === 11 ? colW / 2 + 16 : colW
      )
      .attr('height', innerH + 44)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseenter', (_ev, d) => {
        setHoveredMonth(d.month);
      })
      .on('click', (_ev, d) => {
        setSelectedMonth(d.month);
      });

    svg.on('mouseleave', () => {
      setHoveredMonth(null);
    });
  }, [chartWidth, client.id, flow, mode, hoveredMonth, selectedMonth]);

  return (
    <section
      aria-label="流年情緒流向與運程雙軸分析圖"
      className="rounded-lg border border-[#DDD6C7] bg-white"
    >
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#ECE6DA] px-6 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="inline-flex items-center gap-2 font-serif text-base font-semibold text-[#152924]">
            <HeartHandshake className="h-4 w-4 text-[#9D4A54]" />
            流年情緒流向 × 命理運程雙軸圖譜（{flow.year} 年）
          </h2>
          <p className="mt-0.5 text-xs text-[#6B7974] tabular-nums">
            {hideTechnicalCoords
              ? `對照 ${flow.year} 年各月外在運勢強弱與內在心理負荷，標記容易「外順內耗」的關鍵月份`
              : `結合 Mary K. Greer 塔羅流年原型（${flow.preBirthdayCardName}${
                  flow.preBirthdayCardName !== flow.postBirthdayCardName
                    ? ` → ${flow.birthMonth}月生日轉「${flow.postBirthdayCardName}」`
                    : ''
                }）、紫微流月福德宮與八字月令心理節律`}
          </p>
        </div>

        {/* Mode Segmented Control */}
        <div
          role="group"
          aria-label="情緒流向檢視模式"
          className="flex items-center gap-0.5 self-start rounded-md border border-[#DDD6C7] bg-[#EFEBE2] p-0.5 sm:self-auto"
        >
          <button
            type="button"
            onClick={() => setMode('dual')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'dual'
                ? 'bg-[#152924] text-[#FAF8F3]'
                : 'text-[#4C5A55] hover:text-[#152924]'
            }`}
          >
            雙軸心運對照
          </button>
          <button
            type="button"
            onClick={() => setMode('gap')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'gap'
                ? 'bg-[#152924] text-[#FAF8F3]'
                : 'text-[#4C5A55] hover:text-[#152924]'
            }`}
          >
            標示心運落差帶
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Clean Legend & Year Emotional Pulse Metrics (Zero Pills) */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-[11.5px] text-[#5C6B66]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-[#152924]">
              <span className="inline-block h-[2px] w-4 bg-[#152924]" />
              外在命理運程（左軸）
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#9D4A54]">
              <span className="inline-block h-0 w-4 border-t-[2px] border-dashed border-[#9D4A54]" />
              內在情緒心流（右軸）
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#8C6830]">
              <span className="inline-block h-3 w-0 border-l-[1.5px] border-dashed border-[#C9A861]" />
              生日塔羅換牌月
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
            <span>
              心境最澄明：
              <strong className="font-mono text-[#1E6B4B]">
                {flow.highestEmotionMonth.monthLabel} (
                {flow.highestEmotionMonth.emotionalScore > 0 ? '+' : ''}
                {flow.highestEmotionMonth.emotionalScore})
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              最需控管內耗：
              <strong className="font-mono text-[#9D4A54]">
                {flow.mostCareNeededMonth.monthLabel} (
                {flow.mostCareNeededMonth.emotionalScore > 0 ? '+' : ''}
                {flow.mostCareNeededMonth.emotionalScore})
              </strong>
            </span>
            {flow.burnoutRiskMonths.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#9D4A54]">
                  外順內耗提醒：
                  {flow.burnoutRiskMonths.map((m) => m.monthLabel).join('、')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* D3 Dual-Axis Chart Container */}
        <div ref={containerRef} className="mt-2 w-full overflow-hidden">
          <svg
            ref={svgRef}
            role="img"
            aria-label={`${client.name} ${flow.year}年情緒流向與命理運程雙軸圖表`}
            className="block w-full select-none"
          />
        </div>

        {/* Empathetic Monthly Deep Inspector (Clean Hairline Divider) */}
        <div className="mt-3 border-t border-[#ECE6DA] pt-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-serif text-base font-bold text-[#152924]">
                {flow.year} 年 {focusedPoint.monthLabel}（{focusedPoint.baziMonthGanZhi}
                月）
              </span>
              <span className="text-xs text-[#64736D] tabular-nums">
                外在運程{' '}
                <strong className="font-mono text-[#152924]">
                  {focusedPoint.fortuneScore}
                </strong>{' '}
                · 內在心流{' '}
                <strong className="font-mono text-[#9D4A54]">
                  {focusedPoint.emotionalScore > 0 ? '+' : ''}
                  {focusedPoint.emotionalScore}
                </strong>{' '}
                （{focusedPoint.emotionToneLabel}）
              </span>
              <span
                className={`text-xs font-semibold ${
                  RESONANCE_COLOR[focusedPoint.resonanceKind]
                }`}
              >
                — {focusedPoint.resonanceLabel}
              </span>
            </div>

            {onAskFollowUp && (
              <button
                type="button"
                disabled={chatLoading}
                onClick={() =>
                  onAskFollowUp(
                    `請以具同理心與心理諮詢的角度，深入解析命主在 ${flow.year} 年 ${focusedPoint.monthLabel}（${focusedPoint.baziMonthGanZhi}月，八字月令${focusedPoint.baziMonthTenStar}、流月福德宮落「${focusedPoint.ziweiMentalPalaceName}」、塔羅流年原型「${focusedPoint.tarotCardName}」），外在運程 ${focusedPoint.fortuneScore} 分與內在情緒心流 ${
                      focusedPoint.emotionalScore > 0
                        ? `+${focusedPoint.emotionalScore}`
                        : focusedPoint.emotionalScore
                    }（${focusedPoint.resonanceLabel}）之間的心境拉扯，並給出具體的心理調適與行動建議？`,
                    `心流深探：${focusedPoint.monthLabel}`
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                針對此月心境送入追問室
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Factual 3-System Coordinates for Focused Month (Consultant Mode Only) */}
          {!hideTechnicalCoords && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5C6B66]">
              <span>
                塔羅原型：{focusedPoint.tarotCardDisplayNumber} 號「
                {focusedPoint.tarotCardName}」（
                {focusedPoint.tarotKeywords.slice(0, 2).join('・')}）
              </span>
              <span aria-hidden="true">·</span>
              <span>
                紫微流月：命宮落「{focusedPoint.ziweiMonthPalaceName}」／福德落「
                {focusedPoint.ziweiMentalPalaceName}」／化忌「
                {focusedPoint.ziweiMonthMutagenJi}」
              </span>
              <span aria-hidden="true">·</span>
              <span>
                八字月令：{focusedPoint.baziMonthTenStar}・
                {focusedPoint.baziMonthTerrain}
              </span>
            </div>
          )}

          {/* Reflection & Practical Adjustment */}
          <div className="mt-3 grid grid-cols-1 gap-4 rounded-md border border-[#ECE6DA] bg-[#FAF8F3] p-4 md:grid-cols-2">
            <div>
              <div className="text-[11.5px] font-semibold text-[#9D4A54]">
                {hideTechnicalCoords ? '當月狀態觀察' : '同理心覺察解讀'}
              </div>
              <p className="mt-1 text-xs leading-[1.75] text-[#2F3E39]">
                {focusedPoint.empathyNote}
              </p>
            </div>
            <div className="border-t border-[#E8E1D3] pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
              <div className="text-[11.5px] font-semibold text-[#2B5B4C]">
                本月狀態調整建議
              </div>
              <p className="mt-1 text-xs leading-[1.75] text-[#2F3E39]">
                {focusedPoint.selfCareTip}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
