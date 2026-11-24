import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ClientInput, ClientProfile } from '../types/holistic';
import { db, handleFirestoreError, OperationType } from '../firebase';

// ============================================================================
// Validation Constants Synchronized Verbatim with firebase-blueprint.json
// ============================================================================
export const BLUEPRINT_LIMITS = {
  MAX_DISPLAY_NAME_LENGTH: 100,
  MAX_NAME_LENGTH: 80,
  MAX_NOTES_LENGTH: 10000,
  MAX_TAGS_COUNT: 10,
  MAX_TAG_LENGTH: 32,
  DATE_PATTERN: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  TIME_PATTERN: /^[0-9]{2}:[0-9]{2}$/,
  ID_PATTERN: /^[a-zA-Z0-9_-]{1,128}$/,
} as const;

function generateSafeDocId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const id = `cli_${Date.now()}_${rand}`;
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
}

export function sanitizeClientInput(input: ClientInput): ClientInput {
  const cleanName = (input.name ?? '')
    .trim()
    .slice(0, BLUEPRINT_LIMITS.MAX_NAME_LENGTH);
  if (!cleanName) {
    throw new Error('請輸入命主姓名');
  }
  const cleanGender = input.gender === '女' ? '女' : '男';
  const cleanBirthDate = BLUEPRINT_LIMITS.DATE_PATTERN.test(input.birthDate)
    ? input.birthDate
    : '1990-05-15';
  const cleanBirthTime = BLUEPRINT_LIMITS.TIME_PATTERN.test(input.birthTime)
    ? input.birthTime
    : '12:00';
  const cleanTags = (Array.isArray(input.tags) ? input.tags : [])
    .map((t) => (typeof t === 'string' ? t.trim().slice(0, BLUEPRINT_LIMITS.MAX_TAG_LENGTH) : ''))
    .filter(Boolean)
    .slice(0, BLUEPRINT_LIMITS.MAX_TAGS_COUNT);
  const cleanNotes = (typeof input.notes === 'string' ? input.notes : '').slice(
    0,
    BLUEPRINT_LIMITS.MAX_NOTES_LENGTH
  );

  return {
    name: cleanName,
    gender: cleanGender,
    birthDate: cleanBirthDate,
    birthTime: cleanBirthTime,
    tags: cleanTags,
    notes: cleanNotes,
  };
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

export async function ensureUserAccountDoc(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const displayName = (user.displayName || user.email?.split('@')[0] || '諮詢師')
    .trim()
    .slice(0, BLUEPRINT_LIMITS.MAX_DISPLAY_NAME_LENGTH);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeUserClients(
  userId: string,
  onData: (clients: ClientProfile[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colPath = `users/${userId}/clients`;
  const q = query(
    collection(db, 'users', userId, 'clients'),
    where('ownerId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ClientProfile[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: typeof data.name === 'string' ? data.name : '未命名命主',
          gender: data.gender === '女' ? '女' : '男',
          birthDate:
            typeof data.birthDate === 'string' ? data.birthDate : '1990-05-15',
          birthTime:
            typeof data.birthTime === 'string' ? data.birthTime : '12:00',
          tags: Array.isArray(data.tags)
            ? data.tags.filter((t): t is string => typeof t === 'string')
            : [],
          notes: typeof data.notes === 'string' ? data.notes : '',
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        };
      });

      list.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createFirestoreClient(
  userId: string,
  input: ClientInput
): Promise<string> {
  const safe = sanitizeClientInput(input);
  const clientId = generateSafeDocId();
  const docPath = `users/${userId}/clients/${clientId}`;

  try {
    await setDoc(doc(db, 'users', userId, 'clients', clientId), {
      ownerId: userId,
      name: safe.name,
      gender: safe.gender,
      birthDate: safe.birthDate,
      birthTime: safe.birthTime,
      tags: safe.tags,
      notes: safe.notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return clientId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateFirestoreClient(
  userId: string,
  clientId: string,
  patch: Partial<ClientInput>
): Promise<void> {
  if (!BLUEPRINT_LIMITS.ID_PATTERN.test(clientId)) {
    throw new Error('無效的命主文件識別碼');
  }
  const docPath = `users/${userId}/clients/${clientId}`;
  const docRef = doc(db, 'users', userId, 'clients', clientId);

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (patch.name !== undefined) {
    const cleanName = patch.name
      .trim()
      .slice(0, BLUEPRINT_LIMITS.MAX_NAME_LENGTH);
    if (!cleanName) throw new Error('命主姓名不可為空白');
    payload.name = cleanName;
  }
  if (patch.gender !== undefined) {
    payload.gender = patch.gender === '女' ? '女' : '男';
  }
  if (patch.birthDate !== undefined) {
    if (!BLUEPRINT_LIMITS.DATE_PATTERN.test(patch.birthDate)) {
      throw new Error('出生日期格式須為 YYYY-MM-DD');
    }
    payload.birthDate = patch.birthDate;
  }
  if (patch.birthTime !== undefined) {
    if (!BLUEPRINT_LIMITS.TIME_PATTERN.test(patch.birthTime)) {
      throw new Error('出生時間格式須為 HH:mm');
    }
    payload.birthTime = patch.birthTime;
  }
  if (patch.tags !== undefined) {
    payload.tags = patch.tags
      .map((t) => t.trim().slice(0, BLUEPRINT_LIMITS.MAX_TAG_LENGTH))
      .filter(Boolean)
      .slice(0, BLUEPRINT_LIMITS.MAX_TAGS_COUNT);
  }
  if (patch.notes !== undefined) {
    payload.notes = patch.notes.slice(0, BLUEPRINT_LIMITS.MAX_NOTES_LENGTH);
  }

  try {
    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteFirestoreClient(
  userId: string,
  clientId: string
): Promise<void> {
  if (!BLUEPRINT_LIMITS.ID_PATTERN.test(clientId)) {
    throw new Error('無效的命主文件識別碼');
  }
  const docPath = `users/${userId}/clients/${clientId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'clients', clientId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function importClientsToFirestore(
  userId: string,
  candidates: ClientInput[],
  existingClients: ClientProfile[]
): Promise<number> {
  const existingSignatures = new Set(
    existingClients.map(
      (c) => `${c.name}|${c.gender}|${c.birthDate}|${c.birthTime}`
    )
  );

  let imported = 0;
  for (const item of candidates) {
    const safe = sanitizeClientInput(item);
    const sig = `${safe.name}|${safe.gender}|${safe.birthDate}|${safe.birthTime}`;
    if (existingSignatures.has(sig)) continue;
    await createFirestoreClient(userId, safe);
    existingSignatures.add(sig);
    imported += 1;
  }
  return imported;
}

export function exportClientsToJsonFile(clients: ClientProfile[]): void {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    clients: clients.map((c) => ({
      name: c.name,
      gender: c.gender,
      birthDate: c.birthDate,
      birthTime: c.birthTime,
      tags: c.tags,
      notes: c.notes,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `全息人生地圖_命主備份_${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseClientsBackupJson(jsonText: string): ClientInput[] {
  const parsed = JSON.parse(jsonText);
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.clients)
      ? parsed.clients
      : null;
  if (!list) {
    throw new Error('備份檔案格式不正確，請選擇由本系統匯出的 JSON 備份檔。');
  }
  const valid: ClientInput[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.name !== 'string' || !r.name.trim()) continue;
    valid.push(
      sanitizeClientInput({
        name: r.name,
        gender: r.gender === '女' ? '女' : '男',
        birthDate:
          typeof r.birthDate === 'string' ? r.birthDate : '1990-05-15',
        birthTime: typeof r.birthTime === 'string' ? r.birthTime : '12:00',
        tags: Array.isArray(r.tags)
          ? r.tags.filter((t): t is string => typeof t === 'string')
          : [],
        notes: typeof r.notes === 'string' ? r.notes : '',
      })
    );
  }
  if (valid.length === 0) {
    throw new Error('備份檔案中未找到有效的命主資料。');
  }
  return valid;
}
