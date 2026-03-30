# Testing Anti-Patterns

Common testing mistakes that produce tests which pass but don't actually verify behavior.
The Test Writer, Code Writer, and Adversarial Reviewer should all watch for these.

## Anti-Pattern 1: Testing Mock Behavior Instead of Real Code

**Symptom**: Tests assert that mocks were called, but never assert on real outputs.

**Example (bad)**:
```typescript
test('should process order', () => {
  const mockDb = jest.fn();
  const mockEmail = jest.fn();
  processOrder({ db: mockDb, email: mockEmail }, order);
  expect(mockDb).toHaveBeenCalled();
  expect(mockEmail).toHaveBeenCalled();
});
```

**Problem**: If `processOrder` calls `db()` and `email()` but does nothing useful with them, this test passes. The test verifies the implementation's internal wiring, not its behavior.

**Fix**: Assert on observable outcomes — the return value, the state change, the side effect's content:
```typescript
test('should process order and return confirmation', () => {
  const result = processOrder(realDb, realEmail, order);
  expect(result.status).toBe('confirmed');
  expect(result.confirmationId).toBeDefined();
});
```

**Gate function**: Before writing a mock assertion, ask: "What would break in production if I removed this assertion?" If nothing — delete it.

---

## Anti-Pattern 2: Test-Only Methods in Production Code

**Symptom**: Production code has methods like `_reset()`, `_getInternalState()`, `destroy()` that only tests call.

**Example (bad)**:
```python
class Cache:
    def get(self, key): ...
    def set(self, key, value): ...
    def _reset_for_testing(self):  # Only used in tests!
        self._store = {}
```

**Problem**: Production code carries dead weight. Test infrastructure leaks into production. These methods become API surface that can't be removed.

**Fix**: Put test utilities in test files. Use setup/teardown. If you need to reset state, create a new instance:
```python
def test_cache_miss():
    cache = Cache()  # Fresh instance, no reset needed
    assert cache.get("missing") is None
```

**Gate function**: Before adding a method to production code, ask: "Would this method exist if there were no tests?" If not — it belongs in test utilities.

---

## Anti-Pattern 3: Mocking Without Understanding Side Effects

**Symptom**: Tests mock a dependency but the mock doesn't replicate critical side effects the real dependency has.

**Example (bad)**:
```typescript
test('should save user', () => {
  const mockRepo = { save: jest.fn().mockResolvedValue({ id: 1 }) };
  const result = await createUser(mockRepo, userData);
  expect(result.id).toBe(1);
});
```

**Problem**: The real `repo.save()` might throw on duplicate emails, set `createdAt` timestamps, trigger cascading saves, or validate constraints. The mock hides all of this. The test passes but the code breaks in production.

**Fix**: Use the real dependency when possible. When mocking is unavoidable, replicate known side effects:
```typescript
test('should reject duplicate email', async () => {
  await createUser(realRepo, userData);
  await expect(createUser(realRepo, userData)).rejects.toThrow('duplicate');
});
```

**Gate function**: Before creating a mock, list 3 side effects of the real dependency. If you can't — you don't understand it well enough to mock it safely.

---

## Anti-Pattern 4: Incomplete Mock Objects

**Symptom**: Mock objects only implement the fields/methods the test author thinks are needed, missing fields that downstream code accesses.

**Example (bad)**:
```typescript
const mockUser = { name: 'Test' };  // Missing: id, email, role, createdAt
const result = formatUserProfile(mockUser);
expect(result).toContain('Test');
```

**Problem**: `formatUserProfile` might access `user.email` or `user.role`. With a partial mock, it silently gets `undefined` and the test passes — but the output is wrong ("Test - undefined - undefined").

**Fix**: Use factory functions that create complete objects with overridable defaults:
```typescript
function makeUser(overrides = {}) {
  return { id: 1, name: 'Default', email: 'a@b.com', role: 'user', createdAt: new Date(), ...overrides };
}
const result = formatUserProfile(makeUser({ name: 'Test' }));
expect(result).toContain('Test');
expect(result).toContain('a@b.com');
```

**Gate function**: Before using a mock object, compare its keys against the real type/interface. If any field is missing — add it.

---

## Anti-Pattern 5: Integration Tests as an Afterthought

**Symptom**: Unit tests pass, but the system doesn't work because no one tested how components interact.

**Example (bad)**:
```
✓ UserService.create() works (mocked DB)
✓ EmailService.send() works (mocked SMTP)
✓ AuthService.login() works (mocked UserService)
→ Actual signup flow: broken (UserService returns format EmailService doesn't expect)
```

**Problem**: Each unit is tested in isolation with mocks. Nobody verified the real contract between components.

**Fix**: Write at least one integration test per user-facing flow that exercises the real dependency chain:
```typescript
test('full signup flow', async () => {
  const user = await signupUser(realDb, realEmail, { name: 'Test', email: 'a@b.com', password: 'pass123' });
  expect(user.id).toBeDefined();
  expect(emailInbox).toContainEqual(expect.objectContaining({ to: 'a@b.com', subject: /welcome/i }));
});
```

**Gate function**: Before claiming a feature is "done," ask: "Is there a test that exercises this feature end-to-end without mocks?" If not — write one.

---

## Summary: The Mock Decision Tree

Before introducing a mock, walk through this:

1. **Can I use the real thing?** → Use it. Real > mock, always.
2. **Is it too slow/flaky?** → Try an in-memory alternative (SQLite, fake SMTP server) before mocking.
3. **Is it an external service I don't control?** → Mock it, but replicate known behaviors (errors, latency, rate limits).
4. **Am I mocking more than 2 dependencies?** → Your design has too many dependencies. Refactor first.
5. **Am I only asserting on mock calls?** → You're testing wiring, not behavior. Add real assertions.
