import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, Users } from 'lucide-react';
import {
  ActiveTab,
  AIStage1Summary,
  ClientInput,
  ClientProfile,
  HoroscopeScope,
} from './types/holistic';
import { clientStorage } from './services/clientStorage';
import { exportHolisticPdfReport } from './services/pdfReportGenerator';
import { calculateZiweiChart } from './engines/ziweiEngine';
import { calculateBaziChart } from './engines/baziEngine';
import { calculateTarotChart } from './engines/tarotEngine';
import { buildHolisticPayload } from './engines/holisticPayload';
import { ClientSidebar } from './components/ClientSidebar';
import { ClientModal } from './components/ClientModal';
import { OverviewTab } from './components/OverviewTab';
import { ZiweiTab } from './components/ZiweiTab';
import { BaziTab } from './components/BaziTab';
import { TarotTab } from './components/TarotTab';
import { AIReadingPanel } from './components/AIReadingPanel';

function getTodayYMD(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const VIEW_TABS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'overview', label: '全息地圖總覽' },
  { id: 'ziwei', label: '紫微斗數' },
  { id: 'bazi', label: '八字命盤' },
  { id: 'tarot', label: '塔羅人生密碼' },
  { id: 'ai', label: 'AI 深度解盤' },
];

const HOROSCOPE_SCOPES: Array<{ id: HoroscopeScope; label: string }> = [
  { id: 'origin', label: '本命' },
  { id: 'decadal', label: '大限・大運' },
  { id: 'yearly', label: '流年' },
  { id: 'monthly', label: '流月' },
  { id: 'daily', label: '流日' },
];

export default function App() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [targetDate, setTargetDate] = useState<string>(() => getTodayYMD());
  const [activeScope, setActiveScope] = useState<HoroscopeScope>('yearly');

  // Modal, CRM Drawer & PDF Export State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [crmDrawerOpen, setCrmDrawerOpen] = useState(false);
  const [currentAISummary, setCurrentAISummary] =
    useState<AIStage1Summary | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);

  // Load initial clients from Storage Service
  useEffect(() => {
    void (async () => {
      const list = await clientStorage.list();
      setClients(list);
      if (list.length > 0) {
        setSelectedClientId(list[0].id);
      }
    })();
  }, []);

  const activeClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? clients[0] ?? null,
    [clients, selectedClientId]
  );

  // Compute all three engines deterministically using iztro, tyme4ts, and Mary K. Greer math
  const charts = useMemo(() => {
    if (!activeClient) return null;
    try {
      const ziwei = calculateZiweiChart(
        activeClient.birthDate,
        activeClient.birthTime,
        activeClient.gender,
        targetDate
      );
      const bazi = calculateBaziChart(
        activeClient.birthDate,
        activeClient.birthTime,
        activeClient.gender,
        targetDate
      );
      const tarot = calculateTarotChart(activeClient.birthDate, targetDate);
      const payload = buildHolisticPayload(
        activeClient,
        ziwei,
        bazi,
        tarot,
        targetDate,
        activeScope
      );
      return { ziwei, bazi, tarot, payload };
    } catch (err) {
      console.error('Chart calculation error:', err);
      return null;
    }
  }, [activeClient, targetDate, activeScope]);

  const handleCreateOrUpdateClient = async (input: ClientInput) => {
    if (editingClient) {
      const updated = await clientStorage.update(editingClient.id, input);
      const list = await clientStorage.list();
      setClients(list);
      setSelectedClientId(updated.id);
    } else {
      const created = await clientStorage.create(input);
      const list = await clientStorage.list();
      setClients(list);
      setSelectedClientId(created.id);
    }
    setEditingClient(null);
  };

  const handleDeleteClient = async (client: ClientProfile) => {
    await clientStorage.remove(client.id);
    const list = await clientStorage.list();
    setClients(list);
    if (selectedClientId === client.id) {
      setSelectedClientId(list[0]?.id ?? null);
    }
  };

  const handleSaveNotes = async (notes: string) => {
    if (!activeClient) return;
    await clientStorage.update(activeClient.id, { notes });
    const list = await clientStorage.list();
    setClients(list);
  };

  const handleSelectTargetYear = (
    year: number,
    nextScope: HoroscopeScope = 'yearly'
  ) => {
    const [, month = '06', day = '15'] = targetDate.split('-');
    const maxDay = new Date(year, Number(month), 0).getDate();
    const safeDay = String(Math.min(Number(day), maxDay)).padStart(2, '0');
    setTargetDate(`${year}-${month}-${safeDay}`);
    setActiveScope(nextScope);
  };

  const handleSelectTargetDate = (
    dateStr: string,
    nextScope: HoroscopeScope = 'monthly'
  ) => {
    setTargetDate(dateStr);
    setActiveScope(nextScope);
  };

  const handleJumpToDecadalAge = (startAge: number) => {
    if (!activeClient) return;
    const birthYear = Number(activeClient.birthDate.split('-')[0]);
    const targetYear = Math.max(birthYear, birthYear + startAge - 1);
    handleSelectTargetYear(targetYear, 'decadal');
  };

  const handleSelectTarotCycleYear = (cycleYear: number) => {
    if (!activeClient) return;
    const [, bMonth, bDay] = activeClient.birthDate.split('-');
    const maxDay = new Date(cycleYear, Number(bMonth), 0).getDate();
    const safeDay = String(Math.min(Number(bDay), maxDay)).padStart(2, '0');
    setTargetDate(`${cycleYear}-${bMonth}-${safeDay}`);
    setActiveScope('yearly');
  };

  const aiCacheKey = activeClient
    ? `${activeClient.id}|${activeClient.birthDate}|${activeClient.birthTime}|${activeClient.gender}|${targetDate}`
    : '';

  const handleSummaryChange = useCallback(
    (summary: AIStage1Summary | null) => {
      setCurrentAISummary(summary);
    },
    []
  );

  const handleExportPdf = async () => {
    if (!activeClient || !charts || isExportingPdf) return;
    setIsExportingPdf(true);
    setPdfFeedback(null);

    try {
      let summaryForPdf = currentAISummary;
      // If Stage 1 AI summary isn't loaded yet, try fetching it once before building the PDF
      if (!summaryForPdf) {
        try {
          const res = await fetch('/api/reading/summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chartSummary: charts.payload }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.summary) {
            summaryForPdf = data.summary as AIStage1Summary;
            setCurrentAISummary(summaryForPdf);
          }
        } catch {
          // Proceed with complete chart data even if AI endpoint is unreachable
        }
      }

      await exportHolisticPdfReport({
        client: activeClient,
        ziwei: charts.ziwei,
        bazi: charts.bazi,
        tarot: charts.tarot,
        targetDate,
        activeScope,
        aiSummary: summaryForPdf,
      });

      setPdfFeedback('已成功匯出專業 PDF 報告');
      window.setTimeout(() => setPdfFeedback(null), 3200);
    } catch (err) {
      console.error('PDF export error:', err);
      setPdfFeedback('匯出 PDF 時發生異常，請稍後再試');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F6F3EC] text-[#1A2421]">
      {/* Top Bar — Clean 3-Zone Contract */}
      <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#DDD6C7] bg-[#FAF8F3] px-4 lg:gap-8 lg:px-6">
        {/* Zone 1: Single-line Brand Title (+ mobile CRM trigger) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setCrmDrawerOpen(true)}
            aria-label="開啟命主資料庫"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#D4CCB9] bg-white text-[#152924] lg:hidden"
          >
            <Users className="h-4 w-4" />
          </button>
          <span className="font-serif text-base font-bold tracking-wide text-[#152924] whitespace-nowrap shrink-0 sm:text-[17px]">
            全息人生地圖工作台
          </span>
        </div>

        {/* Zone 2: 5 Clean Single-Line View Tabs (Desktop) */}
        <nav
          aria-label="命盤與解盤視圖切換"
          className="hidden items-center gap-6 md:flex"
        >
          {VIEW_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-[#152924] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2B5B4C]'
                    : 'text-[#5D6B66] hover:text-[#152924]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingClient(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#152924] px-3.5 py-2 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B] whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            新增命主
          </button>
        </div>
      </header>

      {/* Mobile View Tab Bar (< md) */}
      <nav
        aria-label="行動版視圖切換"
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[#DDD6C7] bg-white px-2 md:hidden"
      >
        {VIEW_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-[#2B5B4C] text-[#152924]'
                  : 'border-transparent text-[#64736D]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Workspace Body: Left CRM Sidebar + Full-Width Main Viewport */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Left Sidebar — Desktop */}
        <div className="hidden w-[268px] shrink-0 lg:block">
          <ClientSidebar
            clients={clients}
            selectedClientId={activeClient?.id ?? null}
            onSelectClient={(c) => setSelectedClientId(c.id)}
            onAddClient={() => {
              setEditingClient(null);
              setIsModalOpen(true);
            }}
            onEditClient={(c) => {
              setEditingClient(c);
              setIsModalOpen(true);
            }}
            onDeleteClient={(c) => void handleDeleteClient(c)}
          />
        </div>

        {/* Left Sidebar — Mobile/Tablet Slide-Over Drawer */}
        {crmDrawerOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="fixed inset-0 bg-[#152924]/50 backdrop-blur-[1px]"
              onClick={() => setCrmDrawerOpen(false)}
            />
            <div className="relative z-10 h-full w-72 max-w-[85vw] shadow-2xl">
              <ClientSidebar
                clients={clients}
                selectedClientId={activeClient?.id ?? null}
                onSelectClient={(c) => setSelectedClientId(c.id)}
                onAddClient={() => {
                  setCrmDrawerOpen(false);
                  setEditingClient(null);
                  setIsModalOpen(true);
                }}
                onEditClient={(c) => {
                  setCrmDrawerOpen(false);
                  setEditingClient(c);
                  setIsModalOpen(true);
                }}
                onDeleteClient={(c) => void handleDeleteClient(c)}
                onCloseDrawer={() => setCrmDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Full-Width Main Viewport */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Shared Horoscope Timeline Bar */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#DDD6C7] bg-[#FAF8F3]/95 px-4 py-2.5 lg:px-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4A5853] whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 text-[#8C6830]" />
                <span>目標查詢日期</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => {
                  if (e.target.value) setTargetDate(e.target.value);
                }}
                className="rounded border border-[#D4CCB9] bg-white px-2.5 py-1 font-mono text-xs text-[#152924] tabular-nums focus:border-[#2B5B4C] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setTargetDate(getTodayYMD())}
                className="text-xs text-[#2B5B4C] underline-offset-4 hover:underline whitespace-nowrap shrink-0"
              >
                回到今日
              </button>
            </div>

            {/* Scope Segmented Control */}
            <div
              role="group"
              aria-label="運限層級切換"
              className="flex items-center gap-0.5 rounded-md border border-[#DDD6C7] bg-[#EFEBE2] p-0.5"
            >
              {HOROSCOPE_SCOPES.map((scope) => {
                const isActive = activeScope === scope.id;
                return (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => setActiveScope(scope.id)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#152924] text-[#FAF8F3]'
                        : 'text-[#4C5A55] hover:text-[#152924]'
                    }`}
                  >
                    {scope.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Active Full-Page Canvas */}
          <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-8">
            {!activeClient || !charts ? (
              <div className="mx-auto mt-16 max-w-md rounded-lg border border-[#DDD6C7] bg-white p-8 text-center">
                <h2 className="font-serif text-lg font-semibold text-[#152924]">
                  尚未選擇或建立命主資料
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#5C6B66]">
                  請於左側「命主資料庫」點選既有客戶，或點擊下方按鈕建立第一位命主，系統將自動同步排定紫微斗數、子平八字與生日塔羅密碼。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingClient(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#152924] px-4 py-2 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  建立第一位命主
                </button>
              </div>
            ) : (
              <div className="mx-auto max-w-[1180px]">
                {activeTab === 'overview' && (
                  <OverviewTab
                    client={activeClient}
                    ziwei={charts.ziwei}
                    bazi={charts.bazi}
                    tarot={charts.tarot}
                    targetDate={targetDate}
                    activeScope={activeScope}
                    onNavigateTab={setActiveTab}
                    onSelectTargetYear={handleSelectTargetYear}
                    onSelectTargetDate={handleSelectTargetDate}
                    onSaveNotes={(notes) => void handleSaveNotes(notes)}
                    onExportPdf={handleExportPdf}
                    isExportingPdf={isExportingPdf}
                    pdfFeedback={pdfFeedback}
                  />
                )}
                {activeTab === 'ziwei' && (
                  <ZiweiTab
                    client={activeClient}
                    ziwei={charts.ziwei}
                    activeScope={activeScope}
                    onJumpToDecadalAge={handleJumpToDecadalAge}
                  />
                )}
                {activeTab === 'bazi' && (
                  <BaziTab
                    client={activeClient}
                    bazi={charts.bazi}
                    targetDate={targetDate}
                    activeScope={activeScope}
                    onSelectScope={setActiveScope}
                    onSelectTargetYear={handleSelectTargetYear}
                  />
                )}
                {activeTab === 'tarot' && (
                  <TarotTab
                    client={activeClient}
                    tarot={charts.tarot}
                    activeScope={activeScope}
                    onSelectCycleYear={handleSelectTarotCycleYear}
                  />
                )}
                {/* Keep AIReadingPanel mounted so summary pre-loads cleanly and chat history never resets across tab switches */}
                <div className={activeTab === 'ai' ? 'block' : 'hidden'}>
                  <AIReadingPanel
                    cacheKey={aiCacheKey}
                    client={activeClient}
                    targetDate={targetDate}
                    payload={charts.payload}
                    isActiveTab={activeTab === 'ai'}
                    onSummaryChange={handleSummaryChange}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add / Edit Client Modal */}
      <ClientModal
        isOpen={isModalOpen}
        editingClient={editingClient}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        onSubmit={(data) => void handleCreateOrUpdateClient(data)}
      />
    </div>
  );
}
