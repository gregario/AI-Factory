# Testing -- Kotlin/Android

## Test Framework Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit tests | JUnit 5 + MockK | ViewModel, Repository, business logic |
| Compose UI tests | Compose Testing (`createComposeRule`) | Component behaviour, state rendering |
| Integration tests | Robolectric or AndroidX Test | Room DAOs, WorkManager, system interactions |
| End-to-end tests | Espresso + Compose Testing | Full user flows on device/emulator |

JUnit 5 is the default. Use the `android-junit5` Gradle plugin for Android instrumented test support.
MockK replaces Mockito -- it has first-class Kotlin support (coroutines, extension functions, sealed classes).

---

## When to Use Which Test Type

### Unit Tests (JVM, no Android framework)

**Use when:**
- Testing ViewModel state transitions and event handling
- Testing repository logic, mappers, validators
- Testing pure business logic and calculations
- Testing coroutine flows and suspend functions

**Trade-offs:**
- Fast (milliseconds), run on JVM without emulator
- Highest signal-to-noise ratio for logic bugs
- Cannot test Compose UI rendering or Android framework calls

### Compose UI Tests

**Use when:**
- Verifying a composable renders correct content for a given state
- Testing user interactions (clicks, scrolls, text input)
- Asserting accessibility semantics
- Validating state-driven UI changes

**Trade-offs:**
- Slower than JVM unit tests but faster than full E2E
- Can run on JVM with Robolectric or on device
- Test the composable in isolation, not the full screen

### Integration Tests

**Use when:**
- Testing Room DAOs against a real in-memory database
- Testing Retrofit API parsing with MockWebServer
- Testing WorkManager tasks
- Verifying Hilt dependency graphs

**Trade-offs:**
- Need Android framework (Robolectric or device)
- Higher confidence that components work together
- Slower feedback loop

### End-to-End Tests

**Use when:**
- Validating critical user journeys (onboarding, purchase, login)
- Testing navigation flows across multiple screens
- Regression testing before releases

**Trade-offs:**
- Slowest tests, need device or emulator
- Flaky if not carefully written (use idling resources)
- Reserve for critical paths only

---

## Test File Structure

**JVM unit test (ViewModel):**
```kotlin
@ExtendWith(CoroutineTestExtension::class)
class BreweryViewModelTest {

    private val repository: BreweryRepository = mockk()
    private lateinit var viewModel: BreweryViewModel

    @BeforeEach
    fun setup() {
        viewModel = BreweryViewModel(repository)
    }

    @Test
    fun `loading beers updates state with beer list`() = runTest {
        // Arrange
        val beers = listOf(Beer(id = "1", name = "Pale Ale"))
        coEvery { repository.getBeers() } returns Result.success(beers)

        // Act
        viewModel.onAction(BreweryAction.LoadBeers)

        // Assert
        val state = viewModel.state.value
        assertThat(state.beers).isEqualTo(beers)
        assertThat(state.isLoading).isFalse()
    }

    @Test
    fun `network failure sets error state`() = runTest {
        coEvery { repository.getBeers() } returns Result.failure(IOException("timeout"))

        viewModel.onAction(BreweryAction.LoadBeers)

        assertThat(viewModel.state.value.error).isEqualTo("timeout")
    }
}
```

**Compose UI test:**
```kotlin
class BeerCardTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `displays beer name and ABV`() {
        val beer = Beer(name = "IPA", abv = 6.5)

        composeTestRule.setContent {
            AppTheme {
                BeerCard(beer = beer, onTap = {})
            }
        }

        composeTestRule.onNodeWithText("IPA").assertIsDisplayed()
        composeTestRule.onNodeWithText("6.5% ABV").assertIsDisplayed()
    }

    @Test
    fun `tap invokes callback`() {
        var tapped = false

        composeTestRule.setContent {
            AppTheme {
                BeerCard(beer = testBeer(), onTap = { tapped = true })
            }
        }

        composeTestRule.onNodeWithText("Test Beer").performClick()
        assertThat(tapped).isTrue()
    }
}
```

**Room DAO integration test:**
```kotlin
@RunWith(AndroidJUnit4::class)
class BeerDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var dao: BeerDao

    @Before
    fun setup() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java,
        ).build()
        dao = db.beerDao()
    }

    @After
    fun teardown() {
        db.close()
    }

    @Test
    fun insertAndRetrieveBeer() = runTest {
        val beer = BeerEntity(id = "1", name = "Stout", abv = 5.0)
        dao.insert(beer)

        val result = dao.getById("1")
        assertThat(result).isEqualTo(beer)
    }
}
```

---

## Test Isolation

**Each test is independent.** Never rely on state from a previous test.

**Use `runTest` for coroutine tests.** It auto-advances virtual time and catches
leaked coroutines.

```kotlin
@Test
fun `debounced search emits after delay`() = runTest {
    viewModel.onSearchQuery("pale")
    advanceTimeBy(300) // skip debounce delay
    assertThat(viewModel.state.value.results).isNotEmpty()
}
```

**Reset mocks in `@BeforeEach`, not `@AfterEach`.** This ensures clean state even if a test
throws.

**Use `TestDispatcher` for coroutine control.**
```kotlin
class CoroutineTestExtension : BeforeEachCallback, AfterEachCallback {
    private val testDispatcher = StandardTestDispatcher()

    override fun beforeEach(context: ExtensionContext) {
        Dispatchers.setMain(testDispatcher)
    }

    override fun afterEach(context: ExtensionContext) {
        Dispatchers.resetMain()
    }
}
```

---

## Assertions

**Assert behaviour, not implementation.**
```kotlin
// Good -- tests the result
assertThat(state.beers).hasSize(3)
assertThat(state.isLoading).isFalse()

// Bad -- tests internal implementation details
verify(exactly = 1) { repository.getBeers() }
```

**One logical assertion per test.** Multiple assertions on the same result object are fine.
Assertions on unrelated behaviour should be separate tests.

**Test error paths explicitly.**
```kotlin
@Test
fun `invalid input returns validation error`() {
    val result = validator.validate("")
    assertThat(result).isInstanceOf(ValidationResult.Error::class.java)
    assertThat((result as ValidationResult.Error).message).isEqualTo("Required")
}
```

---

## What to Test

### Always test
- ViewModel state transitions for all actions
- Error states (network failure, empty data, invalid input)
- Mapper/converter logic (DTO to domain, domain to UI)
- Room DAO queries (insert, query, update, delete, complex queries)
- Navigation events (correct destination, correct arguments)
- Edge cases (empty lists, null fields, boundary values)

### Skip testing
- Compose layout details (exact padding, color values) -- too brittle
- Hilt module wiring -- the compiler checks this
- Android framework internals (Activity lifecycle plumbing)
- Trivial data class properties
- Third-party library behaviour (Retrofit, Room internals)

---

## Mocking Guidelines

**Default: prefer fakes over mocks for repositories.**

Fakes are simpler, more readable, and don't drift from the real implementation:
```kotlin
class FakeBreweryRepository : BreweryRepository {
    private val beers = mutableListOf<Beer>()

    fun addBeer(beer: Beer) { beers.add(beer) }

    override suspend fun getBeers(): Result<List<Beer>> = Result.success(beers.toList())
}
```

**Use MockK when fakes are impractical:**
- External APIs with many methods
- Verifying side effects (analytics, logging)
- Simulating specific failure modes

**MockK essentials:**
```kotlin
// Suspend function mocking
coEvery { api.fetchBeers() } returns listOf(testBeer())

// Verify a call happened
coVerify { analytics.trackEvent("beer_viewed", any()) }

// Relaxed mock (returns defaults for unconfigured calls)
val logger: Logger = mockk(relaxed = true)
```

**Never mock the thing you're testing.** If you're mocking Room to test a DAO, you're
testing nothing.

---

## Test Naming

Use backtick-quoted descriptive names that read as sentences:
```kotlin
// Good
@Test fun `empty search query clears results`()
@Test fun `network timeout shows retry button`()
@Test fun `deleting last beer shows empty state`()

// Bad
@Test fun test1()
@Test fun testLoadBeers()
@Test fun shouldWork()
```

---

## Test Dependencies (libs.versions.toml)

```toml
[versions]
junit5 = "5.10.2"
mockk = "1.13.10"
truth = "1.4.2"
turbine = "1.1.0"
coroutines-test = "1.8.1"

[libraries]
junit5-api = { module = "org.junit.jupiter:junit-jupiter-api", version.ref = "junit5" }
junit5-engine = { module = "org.junit.jupiter:junit-jupiter-engine", version.ref = "junit5" }
mockk = { module = "io.mockk:mockk", version.ref = "mockk" }
truth = { module = "com.google.truth:truth", version.ref = "truth" }
turbine = { module = "app.cash.turbine:turbine", version.ref = "turbine" }
coroutines-test = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-test", version.ref = "coroutines-test" }
```

Use [Turbine](https://github.com/cashapp/turbine) for testing `Flow` emissions:
```kotlin
@Test
fun `beer list updates on refresh`() = runTest {
    viewModel.state.test {
        assertThat(awaitItem().beers).isEmpty() // initial
        viewModel.onAction(BreweryAction.LoadBeers)
        assertThat(awaitItem().isLoading).isTrue()
        assertThat(awaitItem().beers).hasSize(3)
    }
}
```
