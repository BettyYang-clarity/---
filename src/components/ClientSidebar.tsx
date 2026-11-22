import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { ClientProfile } from '../types/holistic';

interface ClientSidebarProps {
  clients: ClientProfile[];
  selectedClientId: string | null;
  onSelectClient: (client: ClientProfile) => void;
  onAddClient: () => void;
  onEditClient: (client: ClientProfile) => void;
  onDeleteClient: (client: ClientProfile) => void;
  onCloseDrawer?: () => void;
}

export const ClientSidebar: React.FC<ClientSidebarProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  onAddClient,
  onEditClient,
  onDeleteClient,
  onCloseDrawer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('全部');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    clients.forEach((c) => c.tags.forEach((t) => tagSet.add(t)));
    return ['全部', ...Array.from(tagSet)];
  }, [clients]);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return clients.filter((c) => {
      const matchesName =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q);
      const matchesTag =
        selectedTag === '全部' || c.tags.includes(selectedTag);
      return matchesName && matchesTag;
    });
  }, [clients, searchQuery, selectedTag]);

  return (
    <aside className="flex h-full w-full flex-col bg-[#152924] text-[#EAE4D7]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
        <div>
          <h2 className="font-serif text-[15px] font-semibold tracking-wide text-[#F6F3EC]">
            命主資料庫
          </h2>
          <p className="mt-0.5 text-xs text-[#9BB0A8] tabular-nums">
            共 {clients.length} 位建檔個案
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAddClient}
            className="inline-flex items-center gap-1 rounded-md bg-[#9A7B3E] px-2.5 py-1.5 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#B08F4C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A861] whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            建檔
          </button>
          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              aria-label="關閉命主列表"
              className="rounded-md p-1.5 text-[#9BB0A8] transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Tag Filters */}
      <div className="border-b border-white/10 px-4 py-3 space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8CA39A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋姓名或筆記關鍵字…"
            className="w-full rounded-md border border-white/12 bg-[#1D362F] py-1.5 pl-8 pr-3 text-xs text-[#F6F3EC] placeholder-[#8CA39A] transition-colors focus:border-[#9A7B3E] focus:outline-none"
          />
        </div>

        {/* Interactive filter bar */}
        <div className="flex flex-wrap gap-1">
          {allTags.map((tag) => {
            const active = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#2B5B4C] text-[#FAF8F3]'
                    : 'text-[#A7BAB3] hover:bg-white/8 hover:text-[#F6F3EC]'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Client List */}
      <div className="dark-scroll flex-1 overflow-y-auto px-2.5 py-2.5">
        {filteredClients.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <p className="text-xs text-[#9BB0A8]">查無符合條件的命主紀錄</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('全部');
              }}
              className="mt-2.5 text-xs text-[#C9A861] underline-offset-4 hover:underline"
            >
              清除篩選條件
            </button>
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredClients.map((client) => {
              const isSelected = client.id === selectedClientId;
              const isConfirming = confirmDeleteId === client.id;

              return (
                <li
                  key={client.id}
                  className={`group rounded-md border transition-colors ${
                    isSelected
                      ? 'border-[#9A7B3E]/70 bg-[#213E36]'
                      : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onSelectClient(client);
                      onCloseDrawer?.();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectClient(client);
                        onCloseDrawer?.();
                      }
                    }}
                    className="cursor-pointer px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-[#C9A861]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate font-serif text-[14px] font-semibold text-[#FAF8F3]">
                            {client.name}
                          </span>
                          <span className="text-[11px] text-[#9BB0A8]">
                            {client.gender}
                          </span>
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-[#A8BCB4] tabular-nums">
                          {client.birthDate} · {client.birthTime}
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-0.5 opacity-80 transition-opacity group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onEditClient(client)}
                          title="編輯命主資料"
                          aria-label={`編輯 ${client.name}`}
                          className="rounded p-1 text-[#9BB0A8] transition-colors hover:bg-white/10 hover:text-[#FAF8F3]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDeleteId(isConfirming ? null : client.id)
                          }
                          title="刪除命主"
                          aria-label={`刪除 ${client.name}`}
                          className="rounded p-1 text-[#9BB0A8] transition-colors hover:bg-[#A63A2B]/30 hover:text-[#FCA5A5]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Clean unboxed text metadata for tags */}
                    {client.tags.length > 0 && (
                      <div className="mt-1.5 truncate text-[11px] text-[#C9A861]/90">
                        {client.tags.join(' · ')}
                      </div>
                    )}

                    {client.notes && (
                      <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[#95AAA2]">
                        {client.notes}
                      </p>
                    )}
                  </div>

                  {/* Inline Delete Confirmation (avoid window.confirm) */}
                  {isConfirming && (
                    <div
                      className="flex items-center justify-between border-t border-white/10 bg-[#1B1F1E] px-3 py-2 text-[11px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[#F3C6C0]">確定移除此建檔？</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded px-2 py-0.5 text-[#A7BAB3] hover:bg-white/10"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteClient(client);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded bg-[#A63A2B] px-2 py-0.5 font-medium text-white hover:bg-[#8E3023]"
                        >
                          確認刪除
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
};
