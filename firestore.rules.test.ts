/**
 * Security Rule Verification Suite for Holistic Life Map Workbench
 * Covers the 12 "Dirty Dozen" adversarial payloads defined in security_spec.md.
 * Run against Firebase Emulator with @firebase/rules-unit-testing when emulators are active.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; emailVerified: boolean } | null;
  parentExists?: boolean;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated client read',
    operation: 'get',
    path: '/users/user_alice/clients/client_1',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email create',
    operation: 'create',
    path: '/users/user_alice/clients/client_1',
    auth: { uid: 'user_alice', emailVerified: false },
    parentExists: true,
    payload: {
      ownerId: 'user_alice',
      name: '測試命主',
      gender: '男',
      birthDate: '1990-05-15',
      birthTime: '11:30',
      tags: ['VIP'],
      notes: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-user PII read',
    operation: 'get',
    path: '/users/user_alice/clients/client_1',
    auth: { uid: 'user_bob', emailVerified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Owner identity spoofing on create',
    operation: 'create',
    path: '/users/user_alice/clients/client_1',
    auth: { uid: 'user_alice', emailVerified: true },
    parentExists: true,
    payload: {
      ownerId: 'user_bob',
      name: '偽造命主',
      gender: '女',
      birthDate: '1990-05-15',
      birthTime: '11:30',
      tags: [],
      notes: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow field injection (isAdmin)',
    operation: 'create',
    path: '/users/user_alice/clients/client_1',
    auth: { uid: 'user_alice', emailVerified: true },
    parentExists: true,
    payload: {
      ownerId: 'user_alice',
      name: '影子欄位攻擊',
      gender: '男',
      birthDate: '1990-05-15',
      birthTime: '11:30',
      tags: [],
      notes: '',
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned subcollection write without parent user doc',
    operation: 'create',
    path: '/users/user_alice/clients/client_1',
    auth: { uid: 'user_alice', emailVerified: true },
    parentExists: false,
    payload: {
      ownerId: 'user_alice',
      name: '孤兒資料',
      gender: '男',
      birthDate: '1990-05-15',
      birthTime: '11:30',
      tags: [],
      notes: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Document ID poisoning',
    operation: 'create',
    path: '/users/user_alice/clients/invalid$id..space',
    auth: { uid: 'user_alice', emailVerified: true },
    parentExists: true,
    payload: {
      ownerId: 'user_alice',
      name: 'ID注入',
      gender: '男',
      birthDate: '1990-05-15',
      birthTime: '11:30',
      tags: [],
      notes: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Oversized notes string (>10000 chars)',
    operation: 'create',
    path: '/users/user_alice/clients/client_1',
    auth: { uid: 'user_alice', emailVerified: true },
    parentExists: true,
    payload: {
      ownerId: 'user_alice',
      name: '超長字串攻擊',
      gender: '女',
      birthDate: '1990-05-15',
      birthTime: '11:30',
      tags: [],
      notes: 'x'.repeat(10001),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unbounded tags array (>10 items) or invalid tag type',
    operation: 'create',
    path: '/users/user_alice/clients/client_1',
    auth: { uid: 'user_alice', emailVerified: true },
    parentExists: true,
    payload: {
      ownerId: 'user_alice',
      name: '陣列越界',
      gender: '男',
      birthDate: '1990-05-15',
      birthTime: '11:30',
      tags: Array.from({ length: 11 }, (_, i) => `tag_${i}`),
      notes: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable createdAt / ownerId modification on update',
    operation: 'update',
    path: '/users/user_alice/clients/client_1',
    auth: { uid: 'user_alice', emailVerified: true },
    payload: {
      ownerId: 'user_bob',
      createdAt: '2020-01-01T00:00:00.000Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Client-forged timestamp on create',
    operation: 'create',
    path: '/users/user_alice/clients/client_1',
    auth: { uid: 'user_alice', emailVerified: true },
    parentExists: true,
    payload: {
      ownerId: 'user_alice',
      name: '偽造時間戳',
      gender: '男',
      birthDate: '1990-05-15',
      birthTime: '11:30',
      tags: [],
      notes: '',
      createdAt: '1999-01-01T00:00:00.000Z',
      updatedAt: '1999-01-01T00:00:00.000Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Blanket users collection directory listing',
    operation: 'list',
    path: '/users',
    auth: { uid: 'user_alice', emailVerified: true },
    expected: 'PERMISSION_DENIED',
  },
];
