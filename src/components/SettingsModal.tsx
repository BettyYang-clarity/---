import React, { useEffect } from 'react';
import { Briefcase, Check, SlidersHorizontal, UserRound, X } from 'lucide-react';
import { OperationMode } from '../types/holistic';

interface SettingsModalProps {
  isOpen: boolean;
  operationMode: OperationMode;
  onChangeMode: (mode: OperationMode) => void;
  onClose: () => void;
}

const CAPABILITY_ROWS: Array<{
  dimension: string;
  consultant: string;
  client: string;
}> = [
  {
    dimension: '左側多客戶 CRM 資料庫',
    consultant: '完整顯示・支援建檔與切換',
    client: '隱藏（保護其他個案隱私）',
  },
  {
    dimension: '命理引擎原始排盤分頁',
    consultant: '顯示紫微十二宮・八字四柱神煞・塔羅全盤',
    client: '隱藏原始引擎與術語表格',
  },
  {
    dimension: '內部諮詢師備忘筆記',
    consultant: '可編輯儲存並選擇收錄至 PDF',
    client: '完全隱藏（不顯示亦不匯出）',
  },
  {
    dimension: 'AI 解盤風格與深度追問',
    consultant: '專業深度剖析＋站內追問室＋跨體系合參',
    client: '一次性精簡重點報告＋一鍵複製 Prompt 帶回個人 AI 深問（不耗站內追問額度）',
  },
  {
    dimension: '運勢趨勢與 PDF 報告',
    consultant: '全 8 大章節自由勾選（含原始數據）',
    client: '聚焦運勢曲線、節氣提醒與白話策略報告',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  operationMode,
  onChangeMode,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isClientMode = operationMode === 'client';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#152924]/55 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[#DDD6C7] bg-[#FAF8F3] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#DDD6C7] bg-white px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#8C6830]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>工作台設定與商用場景配置</span>
            </div>
            <h2
              id="settings-modal-title"
              className="mt-0.5 font-serif text-xl font-bold text-[#152924]"
            >
              操作模式設定
            </h2>
            <p className="mt-0.5 text-xs text-[#64736D]">
              依據現場解盤、螢幕共享或平板交給客戶自助瀏覽等情境，即時切換介面呈現與 AI 口吻
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉設定視窗"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#64736D] transition-colors hover:bg-[#EFEAE0] hover:text-[#152924]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Primary Toggle Switch Bar */}
          <section className="rounded-md border border-[#DDD6C7] bg-white p-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="text-sm font-semibold text-[#152924]">
                  操作模式切換開關
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-[#5D6B66]">
                  目前為「
                  <span className="font-semibold text-[#152924]">
                    {isClientMode ? '客戶自助模式' : '專業諮詢師模式'}
                  </span>
                  」，切換後設定會自動保存於此裝置。
                </p>
              </div>

              {/* Accessible Toggle Switch */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-medium transition-colors ${
                    !isClientMode ? 'text-[#152924]' : 'text-[#84918C]'
                  }`}
                >
                  專業諮詢師
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isClientMode}
                  aria-label="切換專業諮詢師模式與客戶自助模式"
                  onClick={() =>
                    onChangeMode(isClientMode ? 'consultant' : 'client')
                  }
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-md border transition-colors focus:outline-none ${
                    isClientMode
                      ? 'border-[#2B5B4C] bg-[#2B5B4C]'
                      : 'border-[#152924] bg-[#152924]'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded bg-[#FAF8F3] shadow transition-transform ${
                      isClientMode ? 'translate-x-6.5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span
                  className={`text-xs font-medium transition-colors ${
                    isClientMode ? 'text-[#2B5B4C]' : 'text-[#84918C]'
                  }`}
                >
                  客戶自助
                </span>
              </div>
            </div>

            {/* Two Direct Mode Selection Cards */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onChangeMode('consultant')}
                className={`flex flex-col rounded-md border p-4 text-left transition-colors ${
                  !isClientMode
                    ? 'border-[#152924] bg-[#FAF8F3]'
                    : 'border-[#E5DEC9] bg-white hover:border-[#C5BDAF]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-serif text-sm font-bold text-[#152924]">
                    <Briefcase className="h-4 w-4 text-[#8C6830]" />
                    專業諮詢師模式
                  </span>
                  {!isClientMode && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E6B4B]">
                      <Check className="h-3.5 w-3.5" />
                      使用中
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#4C5A55]">
                  保留完整命主 CRM、紫微十二宮、八字四柱神煞、塔羅原型算式、跨體系合參、內部備忘筆記與全章節商用 PDF 匯出。
                </p>
              </button>

              <button
                type="button"
                onClick={() => onChangeMode('client')}
                className={`flex flex-col rounded-md border p-4 text-left transition-colors ${
                  isClientMode
                    ? 'border-[#2B5B4C] bg-[#F3F8F5]'
                    : 'border-[#E5DEC9] bg-white hover:border-[#C5BDAF]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-serif text-sm font-bold text-[#152924]">
                    <UserRound className="h-4 w-4 text-[#2B5B4C]" />
                    客戶自助模式
                  </span>
                  {isClientMode && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E6B4B]">
                      <Check className="h-3.5 w-3.5" />
                      使用中
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#4C5A55]">
                  隱藏命理引擎原始數據、其他客戶名單與私人備忘筆記；僅提供一次精簡直白的基礎運勢報告，並附一鍵複製專屬 Prompt 讓客戶帶回個人 AI 深問，不消耗站內追問額度。
                </p>
              </button>
            </div>
          </section>

          {/* Transparent Capability Matrix */}
          <section className="rounded-md border border-[#DDD6C7] bg-white overflow-hidden">
            <div className="border-b border-[#ECE6DA] bg-[#FAF8F3] px-4 py-2.5 text-xs font-semibold text-[#152924]">
              兩種模式功能與隱私顯示對照
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#ECE6DA] text-[11px] text-[#6B7974]">
                    <th className="px-4 py-2.5 font-medium">功能項目</th>
                    <th className="px-4 py-2.5 font-medium text-[#152924]">
                      專業諮詢師模式
                    </th>
                    <th className="px-4 py-2.5 font-medium text-[#2B5B4C]">
                      客戶自助模式
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE0] text-[#354540]">
                  {CAPABILITY_ROWS.map((row) => (
                    <tr key={row.dimension}>
                      <td className="px-4 py-2.5 font-medium text-[#152924] whitespace-nowrap">
                        {row.dimension}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${
                          !isClientMode ? 'bg-[#FAF8F3]/80 font-medium text-[#152924]' : ''
                        }`}
                      >
                        {row.consultant}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${
                          isClientMode ? 'bg-[#F3F8F5] font-medium text-[#1E6B4B]' : ''
                        }`}
                      >
                        {row.client}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#DDD6C7] bg-white px-6 py-3.5">
          <span className="text-[11.5px] text-[#64736D]">
            隨時可點擊頂部「設定」按鈕切回{isClientMode ? '專業諮詢師模式' : '客戶自助模式'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#152924] px-5 py-2 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B]"
          >
            完成設定
          </button>
        </div>
      </div>
    </div>
  );
};
