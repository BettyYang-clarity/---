# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Master Gate / Ownership Invariant**: Every client document at `/users/{userId}/clients/{clientId}` MUST belong to an existing `/users/{userId}` document, MUST have `ownerId == request.auth.uid`, and MUST only be accessed when `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **Strict Schema & Size Invariant**: No shadow fields are permitted on create (`hasAll` + `hasOnly`) or update (`affectedKeys().hasOnly(...)`). Every string field has an explicit `.size()` ceiling, `tags` is strictly bounded to `<= 10` items with element validation, and path IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars).
3. **Immutability & Temporal Integrity Invariant**: `uid`, `ownerId`, and `createdAt` cannot be modified after creation. `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
4. **Zero-Trust List Query Invariant**: `/users` cannot be listed (`allow list: if false`). `/users/{userId}/clients` list queries explicitly enforce `request.auth.uid == userId && resource.data.ownerId == request.auth.uid` without `get()`/`exists()` calls inside `allow list`.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)

1. **Unauthenticated Read**: `GET /users/alice/clients/c1` with `auth = null`.
2. **Unverified Email Write**: `CREATE /users/alice/clients/c1` where `auth.uid == "alice"` and `auth.token.email_verified == false`.
3. **Cross-User Read (PII Isolation)**: `GET /users/alice/clients/c1` where `auth.uid == "bob"`.
4. **Identity Spoofing on Create**: `CREATE /users/alice/clients/c1` with `{ ownerId: "bob", ... }` while `auth.uid == "alice"`.
5. **Shadow Field Injection**: `CREATE /users/alice/clients/c1` including `{ isAdmin: true, ...validFields }`.
6. **Orphaned Subcollection Write (Master Gate Bypass)**: `CREATE /users/alice/clients/c1` when `/users/alice` does not exist.
7. **ID Poisoning**: `CREATE /users/alice/clients/bad$id..with.spaces` (fails `isValidId`).
8. **String Size Exhaustion (Denial of Wallet)**: `CREATE /users/alice/clients/c1` with `notes` > 10,000 chars or `name` > 80 chars.
9. **Unbounded Array / Invalid Element**: `CREATE /users/alice/clients/c1` with `tags` having 11 elements or `tags: [12345]`.
10. **Immutable Field Tampering**: `UPDATE /users/alice/clients/c1` attempting to change `ownerId` or `createdAt`.
11. **Client-Forged Timestamp**: `CREATE /users/alice/clients/c1` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
12. **Blanket User Directory Scraping**: `LIST /users` as any signed-in user.

## 3. Red Team Audit Checklist

- Shadow Update Test: Blocked by `isValidClient(incoming())` (`hasOnly`) + `affectedKeys().hasOnly(...)`.
- Email Spoofing Test: Blocked because all writes and reads require `isVerifiedUser()` (`request.auth.token.email_verified == true`) and UID ownership (`request.auth.uid == userId`).
- PII Blanket Test: Blocked because `users/{userId}` and `users/{userId}/clients/{clientId}` restrict `get` strictly to `isVerifiedUser() && request.auth.uid == userId`.
- Query Trust Test: Blocked because `allow list` on `clients` evaluates `resource.data.ownerId == request.auth.uid`, and `/users` has `allow list: if false`.
- Value Poisoning Test: Blocked because `isValidClient(incoming())` wraps every `allow update` branch.
