import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { PRESET_TAGS } from '../services/clientStorage';
import { BLUEPRINT_LIMITS } from '../services/firestoreClientService';
import { ClientInput, ClientProfile, GenderType } from '../types/holistic';

interface ClientModalProps {
  isOpen: boolean;
  editingClient: ClientProfile | null;
  onClose: () => void;
  onSubmit: (data: ClientInput) => Promise<void> | void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  editingClient,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<GenderType>('男');
  const [birthDate, setBirthDate] = useState('1990-01-01');
  const [birthTime, setBirthTime] = useState('12:00');
  const [tags, setTags] = useState<string[]>(['諮詢個案']);
  const [customTag, setCustomTag] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingClient) {
      setName(editingClient.name);
      setGender(editingClient.gender);
      setBirthDate(editingClient.birthDate);
      setBirthTime(editingClient.birthTime);
      setTags(editingClient.tags.slice(0, BLUEPRINT_LIMITS.MAX_TAGS_COUNT));
      setNotes(editingClient.notes.slice(0, BLUEPRINT_LIMITS.MAX_NOTES_LENGTH));
    } else {
      setName('');
      setGender('男');
      setBirthDate('1992-06-15');
      setBirthTime('10:30');
      setTags(['諮詢個案']);
      setNotes('');
    }
    setCustomTag('');
    setErrorMsg('');
    setIsSaving(false);
  }, [isOpen, editingClient]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setErrorMsg('');
    setTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      if (prev.length >= BLUEPRINT_LIMITS.MAX_TAGS_COUNT) {
        setErrorMsg(`分類標籤最多可選 ${BLUEPRINT_LIMITS.MAX_TAGS_COUNT} 個。`);
        return prev;
      }
      return [...prev, tag];
    });
  };

  const handleAddCustomTag = () => {
    const trimmed = customTag.trim();
    if (!trimmed) return;
    if (trimmed.length > BLUEPRINT_LIMITS.MAX_TAG_LENGTH) {
      setErrorMsg(`單一標籤長度不可超過 ${BLUEPRINT_LIMITS.MAX_TAG_LENGTH} 字。`);
      return;
    }
    if (!tags.includes(trimmed)) {
      if (tags.length >= BLUEPRINT_LIMITS.MAX_TAGS_COUNT) {
        setErrorMsg(`分類標籤最多可設 ${BLUEPRINT_LIMITS.MAX_TAGS_COUNT} 個。`);
        return;
      }
      setTags((prev) => [...prev, trimmed]);
    }
    setErrorMsg('');
    setCustomTag('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('請填寫命主姓名。');
      return;
    }
    if (trimmedName.length > BLUEPRINT_LIMITS.MAX_NAME_LENGTH) {
      setErrorMsg(`命主姓名不可超過 ${BLUEPRINT_LIMITS.MAX_NAME_LENGTH} 字。`);
      return;
    }
    if (!BLUEPRINT_LIMITS.DATE_PATTERN.test(birthDate)) {
      setErrorMsg('請選擇有效的國曆出生日期。');
      return;
    }
    if (!BLUEPRINT_LIMITS.TIME_PATTERN.test(birthTime)) {
      setErrorMsg('請選擇有效的出生時分。');
      return;
    }
    if (notes.length > BLUEPRINT_LIMITS.MAX_NOTES_LENGTH) {
      setErrorMsg(`諮詢筆記長度不可超過 ${BLUEPRINT_LIMITS.MAX_NOTES_LENGTH} 字。`);
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      await onSubmit({
        name: trimmedName,
        gender,
        birthDate,
        birthTime,
        tags: tags.slice(0, BLUEPRINT_LIMITS.MAX_TAGS_COUNT),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error && err.message
          ? err.message
          : '儲存命主資料失敗，請稍後再試。'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const allAvailableTags = Array.from(new Set([...PRESET_TAGS, ...tags]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#152924]/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-modal-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-[#DDD6C7] bg-[#FAF8F3] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#DDD6C7] px-6 py-4">
          <h2
            id="client-modal-title"
            className="font-serif text-lg font-semibold text-[#152924]"
          >
            {editingClient ? '編輯命主檔案' : '新增命主建檔'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="關閉視窗"
            className="rounded p-1.5 text-[#5D6B66] transition-colors hover:bg-[#EAE4D7] hover:text-[#152924] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-5">
          {errorMsg && (
            <div className="rounded border border-[#A63A2B]/30 bg-[#A63A2B]/8 px-3 py-2 text-xs text-[#A63A2B]">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <div className="mb-1.5 flex items-baseline justify-between">
                <label className="block text-xs font-medium text-[#3F4D48]">
                  命主姓名
                </label>
                <span className="font-mono text-[10.5px] text-[#7D8A85] tabular-nums">
                  {name.length}/{BLUEPRINT_LIMITS.MAX_NAME_LENGTH}
                </span>
              </div>
              <input
                type="text"
                value={name}
                maxLength={BLUEPRINT_LIMITS.MAX_NAME_LENGTH}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：陳致遠"
                className="w-full rounded-md border border-[#D4CCB9] bg-white px-3 py-2 text-sm text-[#1A2421] focus:border-[#2B5B4C] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#3F4D48]">
                生理性別
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-[#D4CCB9] bg-white p-1">
                {(['男', '女'] as GenderType[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`rounded py-1.5 text-xs font-medium transition-colors ${
                      gender === g
                        ? 'bg-[#152924] text-[#FAF8F3]'
                        : 'text-[#52605B] hover:bg-[#F3EFE6]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#3F4D48]">
                國曆出生年月日
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                min="1900-01-01"
                max="2100-12-31"
                className="w-full rounded-md border border-[#D4CCB9] bg-white px-3 py-2 font-mono text-sm text-[#1A2421] tabular-nums focus:border-[#2B5B4C] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#3F4D48]">
                出生時分（24 小時制）
              </label>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="w-full rounded-md border border-[#D4CCB9] bg-white px-3 py-2 font-mono text-sm text-[#1A2421] tabular-nums focus:border-[#2B5B4C] focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label className="block text-xs font-medium text-[#3F4D48]">
                分類標籤
              </label>
              <span className="font-mono text-[10.5px] text-[#7D8A85] tabular-nums">
                {tags.length}/{BLUEPRINT_LIMITS.MAX_TAGS_COUNT}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allAvailableTags.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#2B5B4C] bg-[#2B5B4C] text-[#FAF8F3]'
                        : 'border-[#D4CCB9] bg-white text-[#4A5853] hover:border-[#2B5B4C]/50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={customTag}
                maxLength={BLUEPRINT_LIMITS.MAX_TAG_LENGTH}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="輸入自訂標籤後按新增…"
                className="flex-1 rounded-md border border-[#D4CCB9] bg-white px-3 py-1.5 text-xs text-[#1A2421] focus:border-[#2B5B4C] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="rounded-md border border-[#D4CCB9] bg-[#EFECE3] px-3 py-1.5 text-xs font-medium text-[#2A3934] transition-colors hover:bg-[#E5E0D3]"
              >
                新增標籤
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label className="block text-xs font-medium text-[#3F4D48]">
                諮詢筆記與背景紀錄
              </label>
              <span className="font-mono text-[10.5px] text-[#7D8A85] tabular-nums">
                {notes.length}/{BLUEPRINT_LIMITS.MAX_NOTES_LENGTH}
              </span>
            </div>
            <textarea
              rows={3}
              value={notes}
              maxLength={BLUEPRINT_LIMITS.MAX_NOTES_LENGTH}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="記錄命主背景、諮詢核心訴求、過往重要年份事件…"
              className="w-full rounded-md border border-[#D4CCB9] bg-white px-3 py-2 text-sm leading-relaxed text-[#1A2421] focus:border-[#2B5B4C] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-[#E6DFD1] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md border border-[#D4CCB9] bg-white px-4 py-2 text-xs font-medium text-[#3F4D48] transition-colors hover:bg-[#F1EDE4] disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#152924] px-5 py-2 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B] disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingClient ? '儲存變更並排盤' : '建立命主並排盤'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
