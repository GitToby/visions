# Testing Best Practices for AI/Backend Agents

## **Principles of Effective Testing**

### **Isolation**

- **Do**: Use fixtures provided in `conftest.py` to create fresh, isolated test environments.
  ```python
  @pytest.fixture
  async def mock_db_session():
      engine = create_async_engine("sqlite+aiosqlite://")
      async with engine.begin() as conn:
          await conn.run_sync(get_metadata().create_all)
      yield async_session_factory()
  ```
- **Don't**: Reuse state between tests. Avoid global variables or shared database connections.

### **Determinism**

- **Do**: Mock external services (e.g., APIs, AI models) to ensure tests are fast and repeatable. Again, use fixtures provided in `conftest.py`.
  ```python
  @pytest.fixture(autouse=True)
  def mock_ai(monkeypatch: MonkeyPatch):
      mock_agent = MagicMock()
      mock_agent.run = AsyncMock(return_value="mocked_response")
      monkeypatch.setattr(ai_service, "agent", mock_agent)
  ```
- **Don’t**: Rely on real external services in unit tests.

### **Clarity**

- **Do**: Name tests to describe behavior, not implementation.
  - ✅ `test_create_job_deducts_user_balance`
  - ❌ `test_create_many`
- **Don’t**: Use vague names like `test1` or `test_edge_case`.

### **Arrange-Act-Assert (AAA)**

- **Arrange**: Set up preconditions.
- **Act**: Execute the code under test.
- **Assert**: Verify outcomes. Use settings if test may be dynamic.

  ```python
  def test_user_balance_deduction():
      # Arrange
      initial_balance = 10
      user = User(balance=initial_balance)
      job_data = [GenerationJobCreate(style="Japandi")]

      # Act
      await generation_service.create_many(db, data=job_data, caller=user)

      # Assert
      assert user.balance == initial_balance = SETTINGS._generation_cost  
  ```

### **Positive vs. Negative Testing**

- **Positive**: Test expected success paths.
  ```python
  def test_get_job_returns_job_if_exists():
      job = await create_test_job()
      result = await generation_service.get(db, job.id)
      assert result is not None
  ```
- **Negative**: Test error handling.
  ```python
  def test_get_job_raises_404_if_not_found():
      with pytest.raises(HTTPException) as exc:
          await generation_service.get_or_404(db, uuid.uuid4())
      assert exc.value.status_code == 404
  ```

### **Over-Mocking**

- **Don't**: Mock everything. Test real database logic with the in-memory DB `conftest:mock_db_session`.
- **Do**: Only mock external services (e.g., Supabase, AI APIs); use global fixtures provided in `conftest.py`.

### **Ignoring Edge Cases**

- **Don’t**: Only test happy paths.
- **Do**: Test:
  - Invalid inputs (e.g., negative balance, empty strings).
  - Concurrent operations (e.g., two users creating jobs simultaneously).
  - Permission boundaries (e.g., user accessing another user’s jobs).

### **Parameterized Tests**

- Where needed, use `pytest.mark.parametrize` to test multiple similar scenarios in the code path.

```python
@pytest.mark.parametrize("style,expected_error", [
    ("Japandi", None),
    ("InvalidStyle", "Unknown style"),
])
def test_job_creation_validates_style(style, expected_error):
    job = GenerationJobCreate(style=style)
    if expected_error:
        with pytest.raises(ValueError):
            await generation_service.create(db, job)
    else:
        result = await generation_service.create(db, job)
        assert result.style == style
```

### **Integration Testing**

- Test full API endpoints with `TestClient`. Do this in tests named `test_api__*`:
  ```python
  def test_create_job_endpoint():
      client = TestClient(app)
      response = client.post("/jobs", json={"style": "Japandi"})
      assert response.status_code == 201
  ```

## **Example: Good vs. Bad Tests**

### **✅ Good Test**

```python
@pytest.mark.asyncio
async def test_create_job_fails_if_user_has_insufficient_balance():
    # Arrange
    user = User(balance=0)
    job_data = [GenerationJobCreate(style="Japandi")]

    # Act & Assert
    with pytest.raises(HTTPException) as exc:
        await generation_service.create_many(db, data=job_data, caller=user)
    assert "Insufficient balance" in exc.value.detail
```

### **❌ Bad Test**

```python
def test_create_job():
    user = User(balance=10)
    job = GenerationJobCreate(style="Japandi")
    result = await generation_service.create(db, job, user)
    assert result is not None  # Too vague!
```

## **Final Checklist**

- [ ] Are tests isolated?
- [ ] Are external services mocked?
- [ ] Are edge cases covered?
- [ ] Are test names descriptive? 
- [ ] Are parameters typed?
- [ ] Is the AAA pattern followed?
- [ ] Are there both positive and negative tests?
- [ ] Have you used the conftest fixtures or made your own?

**Key Takeaway**: Write tests that are **fast, isolated, repeatable, self-validating, and timely** (FIRST principles).
