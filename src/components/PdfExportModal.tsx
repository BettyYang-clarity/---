import React, { useEffect, useMemo, useState } from 'react';
import { Check, FileText, Loader2, Printer, X } from 'lucide-react';
import {
  AICrossSystemAnalysis,
  AIStage1Summary,
  BaziChartResult,
  ClientProfile,
  HoroscopeScope,
  PdfExportConfig,
  PdfExportSections,
  TarotChartResult,
  ZiweiChartResult,
} from '../types/holistic';
import { SCOPE_LABELS } from '../engines/holisticPayload';
import {
  buildScopeExecutiveDigest,
  DEFAULT_PDF_SECTIONS,
} from '../services/pdfReportGenerator';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientProfile;
  ziwei: ZiweiChartResult;
  bazi: BaziChartResult;
  tarot: TarotChartResult;
  targetDate: string;
  activeScope: HoroscopeScope;
  aiSummary: AIStage1Summary | null;
  crossSystemAnalysis: AICrossSystemAnalysis | null;
  isExporting: boolean;
  onConfirmExport: (config: PdfExportConfig) => Promise<void>;
}

const SCOPE_OPTIONS: Array<{ id: HoroscopeScope; label: string }> = [
  { id: 'origin', label: '本命' },
  { id: 'decadal', label: '大限・大運' },
  { id: 'yearly', label: '流年' },
  { id: 'monthly', label: '流月' },
  { id: 'daily', label: '流日' },
];

interface ChapterMeta {
  key: keyof PdfExportSections;
  title: string;
  description: string;
  estPages: number;
  statusNote?: string;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  client,
  ziwei,
  bazi,
  tarot,
  targetDate,
  activeScope,
  aiSummary,
  crossSystemAnalysis,
  isExporting,
  onConfirmExport,
}) => {
  const [reportScope, setReportScope] = useState<HoroscopeScope>(activeScope);
  const [sections, setSections] = useState<PdfExportSections>(() => ({
    ...DEFAULT_PDF_SECTIONS,
    consultantNotes: Boolean(client.notes.trim()),
  }));

  useEffect(() => {
    if (isOpen) {
      setReportScope(activeScope);
      setSections((prev) => ({
        ...prev,
        consultantNotes: Boolean(client.notes.trim()),
      }));
    }
  }, [isOpen, activeScope, client.notes]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isExporting, onClose]);

  const digest = useMemo(
    () =>
      buildScopeExecutiveDigest(ziwei, bazi, tarot, targetDate, reportScope),
    [ziwei, bazi, tarot, targetDate, reportScope]
  );

  const hasNotes = Boolean(client.notes.trim());

  const chapterDefs: ChapterMeta[] = useMemo(
    () => [
      {
        key: 'scopeFocus',
        title: `選定運限核心摘要（${SCOPE_LABELS[reportScope]}）`,
        description: '依上方所選運限聚焦該層級四化飛星與紫微／八字／塔羅三盤重點。',
        estPages: 0.4,
      },
      {
        key: 'chartRawData',
        title: '命盤原始數據（紫微・八字・塔羅）',
        description: '收錄勸學齋四化表、七大重點宮位、八字四柱藏干神煞與塔羅家族牌陣。',
        estPages: 2.2,
      },
      {
        key: 'tenYearTrend',
        title: '未來十年運程趨勢與關鍵轉折點圖表',
        description: '內嵌高解析十年波動折線圖，標示換大運、高峰、築底與關鍵轉折摘要。',
        estPages: 0.9,
      },
      {
        key: 'upcomingAlerts',
        title: '未來三個月重要節氣／運程通知',
        description: '依天文二十四節氣交節、月令沖合與生日塔羅換牌列出近 90 天波動期。',
        estPages: 0.8,
      },
      {
        key: 'aiSummary',
        title: 'AI 深度解盤總結（四大結構化大綱）',
        description: '人生地圖總評、流年事業／財運／感情／健康燈號、盲區資源與造命行動。',
        estPages: 1.4,
        statusNote: aiSummary ? '已就緒' : '匯出時自動載入',
      },
      {
        key: 'emotionalFlow',
        title: '流年情緒流向 × 命理運程雙軸圖表',
        description: '內嵌 12 個月雙軸心運曲線、生日換牌月標記、外順內耗提醒與護心建議。',
        estPages: 0.9,
      },
      {
        key: 'crossSystem',
        title: '跨體系合參分析（紫微主星 × 八字五行）',
        description: '收錄 AI 偵測之雙體系衝突張力點、互補增益點與命理調校建議。',
        estPages: 1.1,
        statusNote: crossSystemAnalysis ? '已就緒' : '匯出時自動偵測',
      },
      {
        key: 'consultantNotes',
        title: '諮詢師備忘筆記',
        description: hasNotes
          ? '收錄此命主檔案中填寫的諮詢觀察與追蹤紀錄。'
          : '此命主目前尚未填寫備忘筆記。',
        estPages: hasNotes ? 0.3 : 0,
        statusNote: hasNotes ? undefined : '目前空白',
      },
    ],
    [reportScope, aiSummary, crossSystemAnalysis, hasNotes]
  );

  const selectedChapters = useMemo(
    () =>
      chapterDefs.filter(
        (c) => sections[c.key] && !(c.key === 'consultantNotes' && !hasNotes)
      ),
    [chapterDefs, sections, hasNotes]
  );

  const estimatedPages = Math.max(
    1,
    Math.ceil(0.6 + selectedChapters.reduce((sum, c) => sum + c.estPages, 0))
  );

  if (!isOpen) return null;

  const toggleSection = (key: keyof PdfExportSections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const applyPreset = (preset: 'full' | 'concise' | 'empathy') => {
    if (preset === 'full') {
      setSections({
        scopeFocus: true,
        chartRawData: true,
        tenYearTrend: true,
        upcomingAlerts: true,
        aiSummary: true,
        emotionalFlow: true,
        crossSystem: true,
        consultantNotes: hasNotes,
      });
    } else if (preset === 'concise') {
      setSections({
        scopeFocus: true,
        chartRawData: false,
        tenYearTrend: true,
        upcomingAlerts: true,
        aiSummary: true,
        emotionalFlow: false,
        crossSystem: false,
        consultantNotes: hasNotes,
      });
    } else {
      // 心理同理版
      setSections({
        scopeFocus: true,
        chartRawData: false,
        tenYearTrend: false,
        upcomingAlerts: true,
        aiSummary: true,
        emotionalFlow: true,
        crossSystem: true,
        consultantNotes: hasNotes,
      });
    }
  };

  const safeScopeName = SCOPE_LABELS[reportScope].replace(/[\\/:*?"<>|・]/g, '');
  const previewFileName = `全息人生地圖_${client.name}_${safeScopeName}_${targetDate}.pdf`;

  const handleConfirm = async () => {
    if (selectedChapters.length === 0 || isExporting) return;
    await onConfirmExport({ reportScope, sections });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#152924]/55 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[#DDD6C7] bg-[#FAF8F3] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#DDD6C7] bg-white px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#8C6830]">
              <FileText className="h-4 w-4" />
              <span>客製化 A4 商用報告輸出</span>
            </div>
            <h2
              id="pdf-preview-modal-title"
              className="mt-0.5 font-serif text-xl font-bold text-[#152924]"
            >
              PDF 報告結構預覽 — {client.name}
            </h2>
            <p className="mt-0.5 text-xs text-[#64736D] tabular-nums">
              推演日期 {targetDate} · 可切換報告聚焦運限並自由勾選欲收錄的章節
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            aria-label="關閉預覽視窗"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#64736D] transition-colors hover:bg-[#EFEAE0] hover:text-[#152924] disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 1. Scope Selector + Live Core Summary Preview */}
          <section className="rounded-md border border-[#DDD6C7] bg-white p-4">
            <div className="flex flex-col justify-between gap-3 border-b border-[#ECE6DA] pb-3 sm:flex-row sm:items-center">
              <div>
                <div className="text-xs font-semibold text-[#152924]">
                  步驟 1：確認報告聚焦運限與核心摘要預覽
                </div>
                <div className="mt-0.5 text-[11.5px] text-[#6B7974]">
                  切換運限後，PDF 封面視角、四化高亮列與首章核心摘要將同步對應
                </div>
              </div>

              <div
                role="group"
                aria-label="選擇報告聚焦運限"
                className="flex items-center gap-0.5 self-start rounded-md border border-[#DDD6C7] bg-[#EFEBE2] p-0.5 sm:self-auto"
              >
                {SCOPE_OPTIONS.map((opt) => {
                  const active = reportScope === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReportScope(opt.id)}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#152924] text-[#FAF8F3]'
                          : 'text-[#4C5A55] hover:text-[#152924]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Scope Digest Preview */}
            <div className="mt-3.5 space-y-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-serif text-sm font-bold text-[#152924]">
                  {digest.headline}
                </span>
                <span className="text-[11.5px] font-medium text-[#8C6830]">
                  {digest.mutagenLabel}：{digest.mutagenLine}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs leading-relaxed text-[#354540] md:grid-cols-3">
                <div className="border-t border-[#EFEAE0] pt-2">
                  <span className="font-semibold text-[#152924]">紫微焦點：</span>
                  {digest.ziweiPoint}
                </div>
                <div className="border-t border-[#EFEAE0] pt-2">
                  <span className="font-semibold text-[#2B5B4C]">八字焦點：</span>
                  {digest.baziPoint}
                </div>
                <div className="border-t border-[#EFEAE0] pt-2">
                  <span className="font-semibold text-[#8C6830]">塔羅焦點：</span>
                  {digest.tarotPoint}
                </div>
              </div>

              {aiSummary && (
                <div className="border-t border-[#EFEAE0] pt-2.5 text-xs leading-relaxed text-[#43524D]">
                  <span className="font-semibold text-[#152924]">
                    AI 解盤大綱預覽：
                  </span>
                  {aiSummary.lifeMapOverview.headline} —{' '}
                  {aiSummary.currentFortuneAndPsyche.headline}
                </div>
              )}
            </div>
          </section>

          {/* 2. Two-Column: Chapter Checkboxes + Dynamic Report Outline */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left: Selectable Chapters */}
            <section className="lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[#152924]">
                  步驟 2：勾選欲包含的報告章節
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => applyPreset('full')}
                    className="text-[#2B5B4C] underline-offset-4 hover:text-[#152924] hover:underline"
                  >
                    完整全息版
                  </button>
                  <span className="text-[#D4CCB9]" aria-hidden="true">
                    /
                  </span>
                  <button
                    type="button"
                    onClick={() => applyPreset('concise')}
                    className="text-[#2B5B4C] underline-offset-4 hover:text-[#152924] hover:underline"
                  >
                    精簡諮詢版
                  </button>
                  <span className="text-[#D4CCB9]" aria-hidden="true">
                    /
                  </span>
                  <button
                    type="button"
                    onClick={() => applyPreset('empathy')}
                    className="text-[#2B5B4C] underline-offset-4 hover:text-[#152924] hover:underline"
                  >
                    深度心理同理版
                  </button>
                </div>
              </div>

              <div className="mt-2.5 divide-y divide-[#ECE6DA] rounded-md border border-[#DDD6C7] bg-white">
                {chapterDefs.map((ch) => {
                  const disabled = ch.key === 'consultantNotes' && !hasNotes;
                  const checked = sections[ch.key] && !disabled;
                  return (
                    <label
                      key={ch.key}
                      className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${
                        disabled
                          ? 'cursor-not-allowed opacity-50'
                          : checked
                            ? 'bg-[#FAF8F3]/75'
                            : 'hover:bg-[#FAF8F3]/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleSection(ch.key)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          checked
                            ? 'border-[#152924] bg-[#152924] text-[#FAF8F3]'
                            : 'border-[#C5BDAF] bg-white text-transparent'
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-[#152924]">
                            {ch.title}
                          </span>
                          {ch.statusNote && (
                            <span className="text-[11px] text-[#8C6830]">
                              {ch.statusNote}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#64736D]">
                          {ch.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Right: Live Structure Table of Contents Preview */}
            <aside className="lg:col-span-5">
              <div className="text-xs font-semibold text-[#152924]">
                即時目錄結構預覽
              </div>
              <div className="mt-2.5 rounded-md border border-[#DDD6C7] bg-white p-4">
                <div className="border-b border-[#ECE6DA] pb-3">
                  <div className="text-[11px] text-[#8C6830]">
                    A4 高解析繁體中文排版
                  </div>
                  <div className="mt-0.5 font-serif text-sm font-bold text-[#152924]">
                    {client.name}・全息命盤報告書
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[#64736D] tabular-nums">
                    預估約 {estimatedPages} 頁 · 已選 {selectedChapters.length}{' '}
                    個章節
                  </div>
                </div>

                {selectedChapters.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#A63A2B]">
                    請至少勾選一個章節以生成 PDF 報告。
                  </div>
                ) : (
                  <ol className="mt-3 space-y-2 text-xs">
                    <li className="flex items-baseline gap-2.5 text-[#52605B]">
                      <span className="font-mono text-[11px] text-[#8A948F] tabular-nums">
                        封面
                      </span>
                      <span>命主基本資料與四核心座標速覽</span>
                    </li>
                    {selectedChapters.map((ch, idx) => (
                      <li
                        key={ch.key}
                        className="flex items-baseline gap-2.5 text-[#1A2421]"
                      >
                        <span className="font-mono text-[11px] font-semibold text-[#8C6830] tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="leading-snug">{ch.title}</span>
                      </li>
                    ))}
                  </ol>
                )}

                <div className="mt-4 border-t border-[#ECE6DA] pt-3">
                  <div className="text-[11px] text-[#73807B]">輸出檔案名稱</div>
                  <div className="mt-0.5 break-all font-mono text-[11px] text-[#2F3E39]">
                    {previewFileName}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DDD6C7] bg-white px-6 py-3.5">
          <span className="text-xs text-[#64736D]">
            {isExporting
              ? '正在彙整選定章節並繪製高解析繁體中文 PDF，請稍候…'
              : '系統將依您勾選的結構自動重新編排章節序號與分頁'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="rounded-md border border-[#D4CCB9] bg-[#FAF8F3] px-4 py-2 text-xs font-medium text-[#152924] transition-colors hover:bg-[#EFEAE0] disabled:opacity-40 whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={selectedChapters.length === 0 || isExporting}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#152924] px-4 py-2 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B] disabled:opacity-50 whitespace-nowrap"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
              {isExporting ? '正在生成 PDF 報告…' : '確認匯出 PDF 報告'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
