# Common Pitfalls -- Kotlin/Android

This file documents mistakes that appear repeatedly in Kotlin/Android projects.
Read this when debugging unexpected behaviour or reviewing code.

It starts lean and grows from experience. When you hit a gotcha, add it here.

---

## Pitfall 1: Collecting Flows in Compose Without Lifecycle Awareness

**What it looks like:**
```kotlin
@Composable
fun HomeScreen(viewModel: HomeViewModel) {
    val state by viewModel.state.collectAsState() // no lifecycle awareness
}
```

**Why it breaks:**
`collectAsState()` keeps collecting even when the app is in the background. This wastes
resources and can cause crashes if the flow triggers UI updates while the Activity is stopped.

**Fix:**
Use `collectAsStateWithLifecycle()` from the `lifecycle-runtime-compose` artifact:
```kotlin
val state by viewModel.state.collectAsStateWithLifecycle()
```

---

## Pitfall 2: Blocking the Main Thread with Room

**What it looks like:**
```kotlin
@Dao
interface BeerDao {
    @Query("SELECT * FROM beers")
    fun getAll(): List<BeerEntity> // not suspend, not Flow
}

// Called from a ViewModel without switching dispatchers
val beers = dao.getAll() // blocks main thread
```

**Why it breaks:**
Room throws `IllegalStateException` if you access the database on the main thread (unless
you explicitly allow it, which you should never do). Even if it didn't throw, blocking the
main thread causes jank and ANRs.

**Fix:**
Make DAO methods `suspend` or return `Flow`:
```kotlin
@Dao
interface BeerDao {
    @Query("SELECT * FROM beers")
    suspend fun getAll(): List<BeerEntity>

    @Query("SELECT * FROM beers")
    fun observeAll(): Flow<List<BeerEntity>>
}
```

---

## Pitfall 3: Forgetting `@HiltViewModel` or `@Inject`

**What it looks like:**
```kotlin
class BreweryViewModel(
    private val repository: BreweryRepository,
) : ViewModel() { ... }
```

**Why it breaks:**
Without `@HiltViewModel` and `@Inject constructor`, Hilt cannot create the ViewModel.
You get a runtime crash: `Cannot create an instance of BreweryViewModel`.

**Fix:**
```kotlin
@HiltViewModel
class BreweryViewModel @Inject constructor(
    private val repository: BreweryRepository,
) : ViewModel() { ... }
```

Also ensure the Activity/Fragment is annotated with `@AndroidEntryPoint`.

---

## Pitfall 4: Recomposition Traps -- Unstable Parameters

**What it looks like:**
```kotlin
@Composable
fun BeerList(beers: List<Beer>, onTap: (Beer) -> Unit) {
    LazyColumn {
        items(beers) { beer ->
            BeerCard(beer = beer, onTap = { onTap(beer) }) // lambda recreated every recomposition
        }
    }
}
```

**Why it breaks:**
The lambda `{ onTap(beer) }` creates a new object on every recomposition, causing `BeerCard`
to recompose even when `beer` hasn't changed. With large lists this causes visible jank.

**Fix:**
Use `remember` or a stable key:
```kotlin
items(beers, key = { it.id }) { beer ->
    BeerCard(
        beer = beer,
        onTap = remember(beer.id) { { onTap(beer) } },
    )
}
```

Also ensure domain models are data classes or annotated with `@Stable`/`@Immutable`
so the Compose compiler can skip recomposition.

---

## Pitfall 5: Leaking ViewModelScope Coroutines

**What it looks like:**
```kotlin
fun startPolling() {
    viewModelScope.launch {
        while (true) {
            fetchLatest()
            delay(30_000)
        }
    }
}
```

**Why it breaks:**
This is actually fine -- `viewModelScope` cancels when the ViewModel is cleared.
The real pitfall is launching coroutines outside of a managed scope:

```kotlin
// Bad -- leaked coroutine, never cancelled
CoroutineScope(Dispatchers.IO).launch {
    while (true) { fetchLatest(); delay(30_000) }
}
```

**Fix:**
Always use a managed scope: `viewModelScope`, `lifecycleScope`, or an injected scope that
is cancelled during cleanup.

---

## Pitfall 6: Room Migration Failures

**What it looks like:**
```
java.lang.IllegalStateException: Room cannot verify the data integrity.
Looks like you've changed schema but forgot to update the version number.
```

**Why it breaks:**
You added a column or table to Room entities but didn't bump the database version
or provide a migration.

**Fix:**
For development: use `.fallbackToDestructiveMigration()` (wipes the DB on schema change).
For production: write explicit migrations:
```kotlin
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE beers ADD COLUMN rating REAL NOT NULL DEFAULT 0.0")
    }
}

Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
    .addMigrations(MIGRATION_1_2)
    .build()
```

Test migrations with `MigrationTestHelper`.

---

## Pitfall 7: Hardcoded Strings in Composables

**What it looks like:**
```kotlin
Text("No beers found")
Button(onClick = onRetry) { Text("Retry") }
```

**Why it breaks:**
Hardcoded strings cannot be translated, violate accessibility best practices, and make
it impossible to maintain consistent copy across the app.

**Fix:**
Use string resources:
```kotlin
Text(stringResource(R.string.home_empty_state))
Button(onClick = onRetry) { Text(stringResource(R.string.common_retry)) }
```

Exception: developer-facing strings (logs, error messages not shown to users) are fine
as hardcoded strings.

---

## Pitfall 8: Not Using `keys` in `LazyColumn`

**What it looks like:**
```kotlin
LazyColumn {
    items(beers) { beer ->
        BeerCard(beer)
    }
}
```

**Why it breaks:**
Without stable keys, `LazyColumn` uses positional indices. When the list changes (items
added, removed, or reordered), Compose cannot match old and new items correctly. This causes:
- Incorrect animations
- State loss in items (e.g., expanded/collapsed state)
- Unnecessary recompositions

**Fix:**
Provide a unique, stable key:
```kotlin
LazyColumn {
    items(beers, key = { it.id }) { beer ->
        BeerCard(beer)
    }
}
```

---

## Pitfall 9: ProGuard/R8 Stripping Serialization Classes

**What it looks like:**
App works in debug but crashes in release with:
```
kotlinx.serialization.SerializationException: Serializer for class BeerResponse is not found
```

**Why it breaks:**
R8 strips classes it thinks are unused. Serialization relies on generated serializers that
R8 cannot trace statically.

**Fix:**
Add ProGuard rules for kotlinx.serialization:
```proguard
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keep,includedescriptorclasses class com.example.**$$serializer { *; }
-keepclassmembers class com.example.** {
    *** Companion;
}
```

Also applies to Retrofit interfaces and Room entities -- ensure they're kept.

---

## Pitfall 10: Forgetting `@AndroidEntryPoint` in the Activity Chain

**What it looks like:**
```
java.lang.IllegalStateException: Hilt Fragments must be attached to an @AndroidEntryPoint Activity.
```

**Why it breaks:**
Hilt requires every Activity that hosts injected components to be annotated with
`@AndroidEntryPoint`. If you forget it on `MainActivity`, every ViewModel injection crashes.

**Fix:**
```kotlin
@AndroidEntryPoint
class MainActivity : ComponentActivity() { ... }
```

This also applies to `Application`:
```kotlin
@HiltAndroidApp
class App : Application()
```

---

## Checklist Before Committing Code

- [ ] All strings shown to users come from `strings.xml`
- [ ] All DAO methods are `suspend` or return `Flow`
- [ ] All ViewModels have `@HiltViewModel` and `@Inject constructor`
- [ ] All flows collected in Compose use `collectAsStateWithLifecycle()`
- [ ] `LazyColumn`/`LazyRow` items have stable `key` parameters
- [ ] No `GlobalScope` or unmanaged `CoroutineScope`
- [ ] No `!!` without a comment justifying why it's safe
- [ ] Release build tested with R8 (serialization, reflection, Retrofit survive minification)
- [ ] Room version bumped and migration added if schema changed
- [ ] All tests pass (`./gradlew test` for JVM, `./gradlew connectedAndroidTest` for device)
