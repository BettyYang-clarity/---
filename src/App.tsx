import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Cloud,
  CloudUpload,
  Loader2,
  LogOut,
  Plus,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  ActiveTab,
  AICrossSystemAnalysis,
  AIStage1Summary,
  ClientInput,
  ClientProfile,
  HoroscopeScope,
  PdfExportConfig,
} from './types/holistic';
import { clientStorage, SEED_CLIENTS } from './services/clientStorage';
import {
  createFirestoreClient,
  deleteFirestoreClient,
  exportClientsToJsonFile,
  importClientsToFirestore,
  parseClientsBackupJson,
  subscribeUserClients,
  updateFirestoreClient,
} from './services/firestoreClientService';
import { useAuth } from './contexts/AuthContext';
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

function clientSignature(c: {
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
}): string {
  return `${c.name}|${c.gender}|${c.birthDate}|${c.birthTime}`;
}

function isUntouchedSeedClient(client: ClientProfile): boolean {
  const seed = SEED_CLIENTS.find((s) => s.id === client.id);
  if (!seed) return false;
  return (
    seed.name === client.name &&
    seed.gender === client.gender &&
    seed.birthDate === client.birthDate &&
    seed.birthTime === client.birthTime &&
    seed.notes === client.notes &&
    seed.tags.join('|') === client.tags.join('|')
  );
}

function formatSyncError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('Quota exceeded')) {
    return 'Firebase 今日免費額度已達上限，系統將於明日重置。您可先點選左側「匯出備份」保留資料。';
  }
  if (
    raw.includes('permission-denied') ||
    raw.includes('Missing or insufficient permissions')
  ) {
    return '雲端資料庫權限驗證未通過，請嘗試重新登入 Google 帳號。';
  }
  if (/[\u4e00-\u9fff]/.test(raw) && !raw.startsWith('{')) {
    return raw;
  }
  return fallback;
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
  const {
    user,
    authReady,
    accountSynced,
    authBusy,
    authError,
    clearAuthError,
    signInWithGoogle,
    signOutUser,
  } = useAuth();

  const isCloudActive = Boolean(user && accountSynced);

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [localClientsSnapshot, setLocalClientsSnapshot] = useState<
    ClientProfile[]
  >([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [isMigratingLocal, setIsMigratingLocal] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

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
  const [currentCrossSystemAnalysis, setCurrentCrossSystemAnalysis] =
    useState<AICrossSystemAnalysis | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);

  const showTransientNotice = useCallback((msg: string) => {
    setSyncError(null);
    setSyncNotice(msg);
    window.setTimeout(() => {
      setSyncNotice((current) => (current === msg ? null : current));
    }, 4200);
  }, []);

  // Load clients from Firestore when signed in & account doc is ready; otherwise load from localStorage
  useEffect(() => {
    let active = true;

    if (!authReady) return;

    // Wait briefly for account anchor doc when user just signed in (unless authError occurred)
    if (user && !accountSynced && !authError) {
      setIsLoadingCloud(true);
      return;
    }

    if (user && accountSynced) {
      setIsLoadingCloud(true);
      setSyncError(null);

      // Inspect localStorage in background so we can offer 1-click migration of custom local clients
      void clientStorage.list().then((localList) => {
        if (active) setLocalClientsSnapshot(localList);
      });

      const unsubscribe = subscribeUserClients(
        user.uid,
        (cloudClients) => {
          if (!active) return;
          setClients(cloudClients);
          setIsLoadingCloud(false);
          setSelectedClientId((prev) => {
            if (prev && cloudClients.some((c) => c.id === prev)) return prev;
            return cloudClients[0]?.id ?? null;
          });
        },
        (err) => {
          if (!active) return;
          setIsLoadingCloud(false);
          setSyncError(
            formatSyncError(err, '雲端命主資料讀取失敗，請檢查網路連線或重新整理。')
          );
        }
      );

      return () => {
        active = false;
        unsubscribe();
      };
    }

    // Signed out (or cloud init failed) -> seamless local browser storage mode
    setIsLoadingCloud(false);
    void clientStorage.list().then((list) => {
      if (!active) return;
      setClients(list);
      setLocalClientsSnapshot(list);
      setSelectedClientId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    });

    return () => {
      active = false;
    };
  }, [authReady, user, accountSynced, authError]);

  // Custom local clients not yet present in the user's cloud Firestore database
  const localMigratableClients = useMemo(() => {
    if (!isCloudActive) return [];
    const cloudSigs = new Set(clients.map(clientSignature));
    return localClientsSnapshot.filter(
      (c) => !isUntouchedSeedClient(c) && !cloudSigs.has(clientSignature(c))
    );
  }, [isCloudActive, clients, localClientsSnapshot]);

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
    setSyncError(null);
    if (isCloudActive && user) {
      try {
        if (editingClient) {
          await updateFirestoreClient(user.uid, editingClient.id, input);
          setSelectedClientId(editingClient.id);
        } else {
          const newId = await createFirestoreClient(user.uid, input);
          setSelectedClientId(newId);
        }
        setEditingClient(null);
      } catch (err) {
        const msg = formatSyncError(err, '儲存至雲端資料庫失敗，請稍後再試。');
        setSyncError(msg);
        throw new Error(msg);
      }
      return;
    }

    if (editingClient) {
      const updated = await clientStorage.update(editingClient.id, input);
      const list = await clientStorage.list();
      setClients(list);
      setLocalClientsSnapshot(list);
      setSelectedClientId(updated.id);
    } else {
      const created = await clientStorage.create(input);
      const list = await clientStorage.list();
      setClients(list);
      setLocalClientsSnapshot(list);
      setSelectedClientId(created.id);
    }
    setEditingClient(null);
  };

  const handleDeleteClient = async (client: ClientProfile) => {
    setSyncError(null);
    if (isCloudActive && user) {
      try {
        await deleteFirestoreClient(user.uid, client.id);
      } catch (err) {
        setSyncError(formatSyncError(err, '刪除雲端命主資料失敗，請稍後再試。'));
      }
      return;
    }

    await clientStorage.remove(client.id);
    const list = await clientStorage.list();
    setClients(list);
    setLocalClientsSnapshot(list);
    if (selectedClientId === client.id) {
      setSelectedClientId(list[0]?.id ?? null);
    }
  };

  const handleSaveNotes = async (notes: string) => {
    if (!activeClient) return;
    setSyncError(null);
    if (isCloudActive && user) {
      try {
        await updateFirestoreClient(user.uid, activeClient.id, { notes });
      } catch (err) {
        setSyncError(formatSyncError(err, '同步筆記至雲端失敗，請稍後再試。'));
      }
      return;
    }

    await clientStorage.update(activeClient.id, { notes });
    const list = await clientStorage.list();
    setClients(list);
    setLocalClientsSnapshot(list);
  };

  const handleImportLocalToCloud = async () => {
    if (!isCloudActive || !user || localMigratableClients.length === 0) return;
    setIsMigratingLocal(true);
    setSyncError(null);
    try {
      const count = await importClientsToFirestore(
        user.uid,
        localMigratableClients.map((c) => ({
          name: c.name,
          gender: c.gender,
          birthDate: c.birthDate,
          birthTime: c.birthTime,
          tags: c.tags,
          notes: c.notes,
        })),
        clients
      );
      showTransientNotice(
        count > 0
          ? `已成功將 ${count} 筆本機命主匯入您的雲端資料庫。`
          : '本機命主資料皆已存在於雲端資料庫中。'
      );
    } catch (err) {
      setSyncError(
        formatSyncError(err, '匯入本機命主至雲端時發生異常，請稍後再試。')
      );
    } finally {
      setIsMigratingLocal(false);
    }
  };

  const handleSeedSampleClients = async () => {
    if (!isCloudActive || !user) return;
    setIsMigratingLocal(true);
    setSyncError(null);
    try {
      const count = await importClientsToFirestore(
        user.uid,
        SEED_CLIENTS.map((c) => ({
          name: c.name,
          gender: c.gender,
          birthDate: c.birthDate,
          birthTime: c.birthTime,
          tags: c.tags,
          notes: c.notes,
        })),
        clients
      );
      if (count > 0) {
        showTransientNotice(`已為您載入 ${count} 位範例命主至雲端資料庫。`);
      }
    } catch (err) {
      setSyncError(formatSyncError(err, '載入範例命主失敗，請稍後再試。'));
    } finally {
      setIsMigratingLocal(false);
    }
  };

  const handleExportBackupJson = () => {
    if (clients.length === 0) return;
    exportClientsToJsonFile(clients);
    showTransientNotice(`已匯出 ${clients.length} 筆命主資料 JSON 備份檔。`);
  };

  const handleImportBackupJson = async (file: File) => {
    setSyncError(null);
    try {
      const text = await file.text();
      const parsedInputs = parseClientsBackupJson(text);

      if (isCloudActive && user) {
        setIsMigratingLocal(true);
        const imported = await importClientsToFirestore(
          user.uid,
          parsedInputs,
          clients
        );
        showTransientNotice(
          imported > 0
            ? `已從備份檔匯入 ${imported} 筆新命主至雲端資料庫。`
            : '備份檔內的命主皆已存在，無須重複匯入。'
        );
      } else {
        const existingSigs = new Set(clients.map(clientSignature));
        let imported = 0;
        for (const item of parsedInputs) {
          const sig = clientSignature(item);
          if (existingSigs.has(sig)) continue;
          await clientStorage.create(item);
          existingSigs.add(sig);
          imported += 1;
        }
        const list = await clientStorage.list();
        setClients(list);
        setLocalClientsSnapshot(list);
        if (list.length > 0 && !selectedClientId) {
          setSelectedClientId(list[0].id);
        }
        showTransientNotice(
          imported > 0
            ? `已從備份檔匯入 ${imported} 筆命主至本機資料庫。`
            : '備份檔內的命主皆已存在，無須重複匯入。'
        );
      }
    } catch (err) {
      setSyncError(formatSyncError(err, '無法讀取備份檔，請確認檔案格式正確。'));
    } finally {
      setIsMigratingLocal(false);
    }
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

  const handleCrossSystemChange = useCallback(
    (analysis: AICrossSystemAnalysis | null) => {
      setCurrentCrossSystemAnalysis(analysis);
    },
    []
  );

  const handleExportPdf = async (config: PdfExportConfig) => {
    if (!activeClient || !charts || isExportingPdf) return;
    setIsExportingPdf(true);
    setPdfFeedback(null);

    try {
      const reportScope = config.reportScope;
      const reportPayload =
        reportScope === activeScope
          ? charts.payload
          : buildHolisticPayload(
              activeClient,
              charts.ziwei,
              charts.bazi,
              charts.tarot,
              targetDate,
              reportScope
            );

      let summaryForPdf =
        config.edition === 'handout' ? null : currentAISummary;
      // Fetch AI summary if checked: handout edition requests plain-language tone; consultant reuses cache if ready
      if (config.sections.aiSummary && !summaryForPdf) {
        try {
          const res = await fetch('/api/reading/summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chartSummary: reportPayload,
              operationMode:
                config.edition === 'handout' ? 'client' : 'consultant',
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.summary) {
            summaryForPdf = data.summary as AIStage1Summary;
            if (config.edition === 'consultant') {
              setCurrentAISummary(summaryForPdf);
            }
          }
        } catch {
          // Fall back to existing summary if available
          summaryForPdf = currentAISummary;
        }
      }

      let crossSystemForPdf = currentCrossSystemAnalysis;
      // Only fetch Cross-System synthesis if the user checked that chapter and it isn't cached yet
      if (config.sections.crossSystem && !crossSystemForPdf) {
        try {
          const res = await fetch('/api/reading/cross-system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chartSummary: reportPayload }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.analysis) {
            crossSystemForPdf = data.analysis as AICrossSystemAnalysis;
            setCurrentCrossSystemAnalysis(crossSystemForPdf);
          }
        } catch {
          // Proceed gracefully even if AI endpoint is unreachable
        }
      }

      await exportHolisticPdfReport({
        client: activeClient,
        ziwei: charts.ziwei,
        bazi: charts.bazi,
        tarot: charts.tarot,
        targetDate,
        activeScope: reportScope,
        edition: config.edition,
        aiSummary: summaryForPdf,
        crossSystemAnalysis: crossSystemForPdf,
        sections: config.sections,
      });

      const editionName =
        config.edition === 'handout' ? '交付閱讀版' : '專業完整版';
      const selectedCount = Object.values(config.sections).filter(Boolean).length;
      setPdfFeedback(
        `已成功匯出「${editionName}」PDF 報告（含 ${selectedCount} 個章節）`
      );
      window.setTimeout(() => setPdfFeedback(null), 3600);
    } catch (err) {
      console.error('PDF export error:', err);
      setPdfFeedback('匯出 PDF 時發生異常，請稍後再試');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const userShortLabel =
    user?.displayName || user?.email?.split('@')[0] || '雲端帳號';

  const sidebarSharedProps = {
    clients,
    selectedClientId: activeClient?.id ?? null,
    isCloudMode: isCloudActive,
    userEmail: user?.email ?? null,
    localMigratableCount: localMigratableClients.length,
    isMigratingLocal,
    onImportLocalToCloud: () => void handleImportLocalToCloud(),
    onExportJson: handleExportBackupJson,
    onImportJsonFile: (file: File) => void handleImportBackupJson(file),
    onSignInGoogle: () => void signInWithGoogle(),
    onSignOut: () => void signOutUser(),
    authBusy,
  };

  const activeBannerError = authError || syncError;

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

        {/* Zone 2: Clean Single-Line View Tabs (Desktop) */}
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

        {/* Zone 3: Cloud Sync + Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="flex items-center gap-1.5 rounded-md border border-[#D4CCB9] bg-white px-2.5 py-1.5 text-xs text-[#253A33]">
              <Cloud className="h-3.5 w-3.5 text-[#2B5B4C] shrink-0" />
              <span className="hidden max-w-[110px] truncate font-medium sm:inline">
                {userShortLabel}
              </span>
              <button
                type="button"
                disabled={authBusy}
                onClick={() => void signOutUser()}
                title="登出 Google 帳號"
                className="ml-0.5 inline-flex items-center gap-0.5 text-[11px] text-[#64736D] transition-colors hover:text-[#A63A2B] whitespace-nowrap shrink-0"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden sm:inline">登出</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={authBusy || !authReady}
              onClick={() => void signInWithGoogle()}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#D4CCB9] bg-white px-3 py-2 text-xs font-medium text-[#152924] transition-colors hover:bg-[#F1EDE4] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {authBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2B5B4C]" />
              ) : (
                <Cloud className="h-3.5 w-3.5 text-[#2B5B4C]" />
              )}
              <span>登入雲端同步</span>
            </button>
          )}

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
            {...sidebarSharedProps}
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
                {...sidebarSharedProps}
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

          {/* Dismissible Cloud Sync Notice / Error Bar */}
          {(activeBannerError || syncNotice) && (
            <div
              className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2 text-xs lg:px-8 ${
                activeBannerError
                  ? 'border-[#A63A2B]/25 bg-[#FDF4F3] text-[#8E2B1E]'
                  : 'border-[#2B5B4C]/25 bg-[#EFF6F2] text-[#1D4A3B]'
              }`}
            >
              <span>{activeBannerError || syncNotice}</span>
              <button
                type="button"
                aria-label="關閉提示"
                onClick={() => {
                  clearAuthError();
                  setSyncError(null);
                  setSyncNotice(null);
                }}
                className="rounded p-0.5 opacity-75 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Scrollable Active Full-Page Canvas */}
          <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-8">
            {isLoadingCloud ? (
              <div className="mx-auto mt-20 flex max-w-md flex-col items-center rounded-lg border border-[#DDD6C7] bg-white p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#2B5B4C]" />
                <h2 className="mt-3 font-serif text-base font-semibold text-[#152924]">
                  正在同步您的雲端命主資料庫…
                </h2>
                <p className="mt-1.5 text-xs text-[#5C6B66]">
                  連線至專屬加密空間，完成後將自動載入所有命盤與筆記。
                </p>
              </div>
            ) : !activeClient || !charts ? (
              <div className="mx-auto mt-14 max-w-lg rounded-lg border border-[#DDD6C7] bg-white p-8 text-center">
                <h2 className="font-serif text-lg font-semibold text-[#152924]">
                  {isCloudActive
                    ? '雲端命主資料庫已就緒'
                    : '尚未選擇或建立命主資料'}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#5C6B66]">
                  {isCloudActive
                    ? '您的專屬雲端帳號目前尚未建立任何命主。您可以直接新增第一位個案，或將原本存在此瀏覽器的命主一鍵匯入雲端，往後在任何裝置登入皆會即時同步。'
                    : '請於左側「命主資料庫」點選既有客戶，或點擊下方按鈕建立第一位命主，系統將自動同步排定紫微斗數、子平八字與生日塔羅密碼。'}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClient(null);
                      setIsModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#152924] px-4 py-2 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    建立第一位命主
                  </button>

                  {isCloudActive && localMigratableClients.length > 0 && (
                    <button
                      type="button"
                      disabled={isMigratingLocal}
                      onClick={() => void handleImportLocalToCloud()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#9A7B3E] px-4 py-2 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#B08F4C] disabled:opacity-60"
                    >
                      {isMigratingLocal ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CloudUpload className="h-3.5 w-3.5" />
                      )}
                      匯入本機 {localMigratableClients.length} 筆命主
                    </button>
                  )}

                  {isCloudActive && (
                    <button
                      type="button"
                      disabled={isMigratingLocal}
                      onClick={() => void handleSeedSampleClients()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#D4CCB9] bg-[#FAF8F3] px-4 py-2 text-xs font-medium text-[#152924] transition-colors hover:bg-[#EFEAE0] disabled:opacity-60"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#8C6830]" />
                      載入 2 位範例命主
                    </button>
                  )}
                </div>
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
                    aiSummary={currentAISummary}
                    crossSystemAnalysis={currentCrossSystemAnalysis}
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
                    onCrossSystemChange={handleCrossSystemChange}
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
        onSubmit={handleCreateOrUpdateClient}
      />
    </div>
  );
}
