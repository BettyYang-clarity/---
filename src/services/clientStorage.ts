import { ClientInput, ClientProfile } from '../types/holistic';

/**
 * Storage abstraction interface for Client CRM.
 * Designed so the v1 localStorage implementation can be swapped seamlessly
 * for Cloud Firestore or Supabase without touching UI components.
 */
export interface IClientStorageService {
  list(): Promise<ClientProfile[]>;
  getById(id: string): Promise<ClientProfile | null>;
  create(input: ClientInput): Promise<ClientProfile>;
  update(id: string, patch: Partial<ClientInput>): Promise<ClientProfile>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = 'holistic_life_map_clients_v1';

const SEED_CLIENTS: ClientProfile[] = [
  {
    id: 'seed-lin-qingyan',
    name: '林青硯',
    gender: '男',
    birthDate: '1990-05-15',
    birthTime: '11:30',
    tags: ['VIP', '高階職涯諮詢'],
    notes:
      '建築設計合夥人。庚年出生（勸學齋庚干四化：太陽祿、武曲權、太陰科、天同忌）。今年關注獨立工作室擴張與合夥分工，以及個人長遠財務配置節奏。',
    createdAt: '2026-09-12T09:00:00.000Z',
    updatedAt: '2026-11-18T14:20:00.000Z',
  },
  {
    id: 'seed-su-yingtong',
    name: '蘇映彤',
    gender: '女',
    birthDate: '1985-10-22',
    birthTime: '20:15',
    tags: ['諮詢個案', '關係與轉職'],
    notes:
      '品牌策略總監，預計明年評估跨產業轉型。過去兩年投入大量心力於團隊重整，希望從全息地圖檢視大運轉換節點、內在疲勞盲點與情感支持系統。',
    createdAt: '2026-10-03T11:30:00.000Z',
    updatedAt: '2026-11-20T10:10:00.000Z',
  },
];

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readRawClients(): ClientProfile[] {
  if (typeof window === 'undefined') return [...SEED_CLIENTS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CLIENTS));
      return [...SEED_CLIENTS];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CLIENTS));
      return [...SEED_CLIENTS];
    }
    return parsed as ClientProfile[];
  } catch {
    return [...SEED_CLIENTS];
  }
}

function writeRawClients(clients: ClientProfile[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export class LocalStorageClientService implements IClientStorageService {
  async list(): Promise<ClientProfile[]> {
    const items = readRawClients();
    return items.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getById(id: string): Promise<ClientProfile | null> {
    const items = readRawClients();
    return items.find((c) => c.id === id) ?? null;
  }

  async create(input: ClientInput): Promise<ClientProfile> {
    const items = readRawClients();
    const now = new Date().toISOString();
    const created: ClientProfile = {
      id: generateId(),
      name: input.name.trim(),
      gender: input.gender,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      tags: input.tags.map((t) => t.trim()).filter(Boolean),
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
    writeRawClients([created, ...items]);
    return created;
  }

  async update(id: string, patch: Partial<ClientInput>): Promise<ClientProfile> {
    const items = readRawClients();
    const idx = items.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error('找不到指定的命主資料');
    }
    const existing = items[idx];
    const updated: ClientProfile = {
      ...existing,
      ...patch,
      name: patch.name !== undefined ? patch.name.trim() : existing.name,
      tags:
        patch.tags !== undefined
          ? patch.tags.map((t) => t.trim()).filter(Boolean)
          : existing.tags,
      updatedAt: new Date().toISOString(),
    };
    const next = [...items];
    next[idx] = updated;
    writeRawClients(next);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const items = readRawClients();
    const filtered = items.filter((c) => c.id !== id);
    writeRawClients(filtered);
  }
}

export const clientStorage: IClientStorageService = new LocalStorageClientService();

export const PRESET_TAGS = ['VIP', '家人', '諮詢個案', '高階職涯諮詢', '關係與轉職', '年度複盤'];
