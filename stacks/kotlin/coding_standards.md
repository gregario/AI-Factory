# Coding Standards -- Kotlin/Android

## Naming

```kotlin
// Variables and functions: camelCase
val currentBalance = 500.0
fun calculateRevenue(qualityScore: Int): Double { ... }

// Classes, objects, interfaces: PascalCase
class BreweryRepository
data class BeerStyle(val id: String, val name: String)
interface AuthRepository

// Constants: UPPER_SNAKE_CASE (top-level or companion object)
const val MAX_RETRIES = 3
const val DEFAULT_TIMEOUT_MS = 5_000L

// Packages: lowercase, no underscores
package com.example.brewery.data.local

// Files: PascalCase matching the primary class
// BreweryViewModel.kt, BeerStyleDao.kt

// Composables: PascalCase (they act like UI components)
@Composable
fun BreweryDashboard(state: DashboardState, onEvent: (DashboardEvent) -> Unit) { ... }

// State and Event classes: suffixed with State/Event
data class DashboardState(val beers: List<Beer> = emptyList(), val isLoading: Boolean = false)
sealed interface DashboardEvent {
    data class SelectBeer(val id: String) : DashboardEvent
    data object Refresh : DashboardEvent
}
```

---

## Null Safety

**Embrace Kotlin's null safety. Never fight it.**

```kotlin
// Good -- explicit nullability
fun findBeer(id: String): Beer?

// Bad -- platform types leaking (suppress nothing, fix the type)
fun findBeer(id: String): Beer! // <-- never leave platform types unresolved

// Good -- safe calls and elvis
val name = beer?.name ?: "Unknown"

// Bad -- non-null assertion unless you can prove it's safe
val name = beer!!.name // crashes at runtime if null
```

**Use `!!` only when a null value genuinely represents a programming error** (e.g., after a
`check()` or when the contract guarantees non-null). Add a comment explaining why.

**Prefer `requireNotNull()` or `checkNotNull()` over `!!`.**
They throw `IllegalArgumentException`/`IllegalStateException` with a message.

```kotlin
val user = requireNotNull(getUser(id)) { "User $id must exist at this point" }
```

---

## Data Classes and Sealed Types

**Use data classes for state and DTOs.**
```kotlin
// UI state
data class ProfileState(
    val user: User? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
)

// Network DTO
@Serializable
data class BeerResponse(
    val id: String,
    val name: String,
    val abv: Double,
)
```

**Use sealed interfaces for closed type hierarchies.**
```kotlin
// Good -- exhaustive when expressions
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Error(val exception: Throwable) : Result<Nothing>
    data object Loading : Result<Nothing>
}

// Good -- navigation events, one-shot signals
sealed interface NavigationEvent {
    data class GoToDetail(val id: String) : NavigationEvent
    data object GoBack : NavigationEvent
}
```

**Prefer `sealed interface` over `sealed class`** unless you need shared state in the base.

---

## ViewModel Pattern

**ViewModels own the state. Composables observe it.**

```kotlin
@HiltViewModel
class BreweryViewModel @Inject constructor(
    private val repository: BreweryRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(BreweryState())
    val state: StateFlow<BreweryState> = _state.asStateFlow()

    // One-shot events (navigation, snackbars) use SharedFlow
    private val _events = MutableSharedFlow<BreweryEvent>()
    val events: SharedFlow<BreweryEvent> = _events.asSharedFlow()

    fun onAction(action: BreweryAction) {
        when (action) {
            is BreweryAction.LoadBeers -> loadBeers()
            is BreweryAction.SelectBeer -> selectBeer(action.id)
        }
    }

    private fun loadBeers() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            repository.getBeers()
                .onSuccess { beers -> _state.update { it.copy(beers = beers, isLoading = false) } }
                .onFailure { e -> _state.update { it.copy(error = e.message, isLoading = false) } }
        }
    }
}
```

**Never pass ViewModel to composables.** Pass state and a lambda for events:
```kotlin
// Good
@Composable
fun BreweryScreen(state: BreweryState, onAction: (BreweryAction) -> Unit)

// Bad -- tight coupling, untestable previews
@Composable
fun BreweryScreen(viewModel: BreweryViewModel)
```

---

## Coroutines

**Use structured concurrency. Always scope coroutines.**
```kotlin
// Good -- scoped to ViewModel lifecycle
viewModelScope.launch {
    val beers = repository.getBeers()
    _state.update { it.copy(beers = beers) }
}

// Bad -- GlobalScope leaks coroutines
GlobalScope.launch { ... }
```

**Inject dispatchers for testability.**
```kotlin
class BreweryRepository @Inject constructor(
    private val api: BreweryApi,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher,
) {
    suspend fun getBeers(): List<Beer> = withContext(ioDispatcher) {
        api.fetchBeers()
    }
}
```

**Use `Flow` for streams, `suspend` for one-shot operations.**
```kotlin
// Stream -- Room, DataStore, WebSocket
fun observeBeers(): Flow<List<Beer>>

// One-shot -- network call, single DB query
suspend fun getBeerById(id: String): Beer?
```

**Cancel-safe. Never catch `CancellationException`.**
```kotlin
// Bad -- swallows cancellation
try {
    delay(1000)
} catch (e: Exception) { // catches CancellationException too
    log(e)
}

// Good -- rethrow or use specific types
try {
    api.fetchBeers()
} catch (e: IOException) {
    Result.failure(e)
}
```

---

## Compose UI

**State hoisting. Composables should be stateless where possible.**
```kotlin
// Good -- state hoisted, easy to preview and test
@Composable
fun BeerCard(
    beer: Beer,
    onTap: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(onClick = onTap, modifier = modifier) {
        Text(beer.name)
        Text("${beer.abv}% ABV")
    }
}

// Bad -- internal state that should be lifted
@Composable
fun BeerCard(beer: Beer) {
    var expanded by remember { mutableStateOf(false) } // lift this if parent needs it
    ...
}
```

**Always accept a `modifier` parameter (default `Modifier`)** on public composables.
This lets callers control padding, size, and alignment.

**Use `@Preview` for every public composable.**
```kotlin
@Preview(showBackground = true)
@Composable
private fun BeerCardPreview() {
    AppTheme {
        BeerCard(
            beer = Beer(name = "Pale Ale", abv = 5.4),
            onTap = {},
        )
    }
}
```

**Material 3 tokens over hardcoded values.**
```kotlin
// Good
Text(text = title, style = MaterialTheme.typography.headlineMedium)
Surface(color = MaterialTheme.colorScheme.surface) { ... }

// Bad
Text(text = title, fontSize = 24.sp, fontWeight = FontWeight.Bold)
Surface(color = Color(0xFFF5F5F5)) { ... }
```

---

## Error Handling

**Use `Result<T>` or sealed types for expected failures.**
```kotlin
// Repository returns Result
suspend fun getBeers(): Result<List<Beer>> = runCatching {
    api.fetchBeers().map { it.toDomain() }
}

// Or a custom sealed type for richer error info
sealed interface DataResult<out T> {
    data class Success<T>(val data: T) : DataResult<T>
    data class NetworkError(val code: Int, val message: String) : DataResult<Nothing>
    data class LocalError(val cause: Throwable) : DataResult<Nothing>
}
```

**Throw exceptions only for programming errors** (precondition violations, illegal state).
Expected failures (network down, invalid user input) should return error values.

**Log errors with context.**
```kotlin
// Good
Timber.e(exception, "Failed to load beer id=$beerId")

// Bad
Timber.e("Error")
```

---

## Code Style

**Prefer `val` over `var`. Immutability by default.**

**Use expression bodies for short functions.**
```kotlin
fun Beer.displayName(): String = "$name ($abv% ABV)"
```

**Keep functions short.** If a function exceeds ~40 lines, extract helpers.
If it has more than 4 parameters, use a data class or builder.

**Early returns over deep nesting.**
```kotlin
// Good
fun validate(input: String): ValidationResult {
    if (input.isBlank()) return ValidationResult.Error("Required")
    if (input.length < 3) return ValidationResult.Error("Too short")
    return ValidationResult.Valid
}
```

**Trailing commas everywhere.** Kotlin supports them, and they make diffs cleaner.

**Use scope functions judiciously.**
- `let` -- null checks: `beer?.let { displayBeer(it) }`
- `apply` -- object configuration: `OkHttpClient.Builder().apply { ... }.build()`
- `also` -- side effects: `result.also { Timber.d("Got $it") }`
- Avoid chaining three or more scope functions -- it becomes unreadable.
