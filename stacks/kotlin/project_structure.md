# Project Structure -- Kotlin/Android

## Standard Android Project

```
project-name/
  app/
    src/
      main/
        java/com/example/projectname/
          MainActivity.kt               # Single Activity entry point
          App.kt                         # Application class (@HiltAndroidApp)
          di/                            # Hilt modules
            AppModule.kt                 # App-scoped bindings (singletons)
            NetworkModule.kt             # Retrofit, OkHttp
            DatabaseModule.kt            # Room database
          data/
            local/                       # Room database layer
              AppDatabase.kt             # @Database class
              dao/                       # DAO interfaces
              entity/                    # Room entities (DB table models)
            remote/                      # Network layer
              api/                       # Retrofit service interfaces
              dto/                       # Network DTOs (@Serializable)
            repository/                  # Repository implementations
          domain/
            model/                       # Domain models (pure Kotlin, no framework deps)
            repository/                  # Repository interfaces (contracts)
            usecase/                     # Use cases (optional, for complex business logic)
          ui/
            theme/                       # Material 3 theme definition
              Theme.kt
              Color.kt
              Type.kt
            navigation/                  # Navigation graph and routes
              NavGraph.kt
              Routes.kt
            screens/                     # Feature screens
              home/
                HomeScreen.kt            # @Composable screen
                HomeViewModel.kt         # Screen ViewModel
                HomeState.kt             # UI state + events + actions
              detail/
                DetailScreen.kt
                DetailViewModel.kt
                DetailState.kt
          util/                          # Extension functions, formatters, constants
        res/
          values/
            strings.xml                  # All user-facing strings (no hardcoded strings in code)
            themes.xml                   # System theme (status bar, splash) -- minimal
          drawable/                      # Vector drawables, icons
          mipmap/                        # Launcher icons
        AndroidManifest.xml
      androidTest/
        java/com/example/projectname/   # Instrumented tests (Espresso, Compose, Room)
      test/
        java/com/example/projectname/   # JVM unit tests (ViewModel, Repository, logic)
    build.gradle.kts                     # App module build script
    proguard-rules.pro                   # R8/ProGuard rules
  gradle/
    libs.versions.toml                   # Version catalog (single source for all dependencies)
    wrapper/
      gradle-wrapper.properties
  build.gradle.kts                       # Root build script (plugins only, no dependencies)
  settings.gradle.kts                    # Module declarations, plugin management
  .gitignore
  CLAUDE.md                             # Project-level instructions
```

---

## Key Conventions

### Single Activity Architecture

One `MainActivity` hosts the entire app. Navigation is handled by Navigation Compose.
No Fragments unless wrapping a legacy library that requires them.

```kotlin
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AppTheme {
                AppNavGraph()
            }
        }
    }
}
```

### Package by Feature, Not by Layer

Each screen gets its own package under `ui/screens/`. The package contains the screen
composable, its ViewModel, and its state/event/action definitions.

```
// Good -- feature-grouped
ui/screens/home/
  HomeScreen.kt
  HomeViewModel.kt
  HomeState.kt

// Bad -- layer-grouped
viewmodels/HomeViewModel.kt
screens/HomeScreen.kt
states/HomeState.kt
```

### Data Layer Structure

The data layer follows a clean separation:

- **`domain/model/`** -- Pure Kotlin data classes. No Room annotations, no serialization
  annotations. These are what the rest of the app works with.
- **`data/local/entity/`** -- Room `@Entity` classes. Map to database tables.
- **`data/remote/dto/`** -- Network `@Serializable` classes. Map to JSON responses.
- **`data/repository/`** -- Implementations that coordinate local and remote sources.
- **`domain/repository/`** -- Interfaces (contracts) that the domain and UI layers depend on.

**Mappers live in the data layer.** Each entity/DTO file includes extension functions to
convert to/from domain models:

```kotlin
// data/local/entity/BeerEntity.kt
@Entity(tableName = "beers")
data class BeerEntity(
    @PrimaryKey val id: String,
    val name: String,
    val abv: Double,
)

fun BeerEntity.toDomain() = Beer(id = id, name = name, abv = abv)
fun Beer.toEntity() = BeerEntity(id = id, name = name, abv = abv)
```

### Use Cases (Optional)

Use cases are optional. Add them when:
- Business logic involves multiple repositories
- Logic is reused across multiple ViewModels
- The operation is complex enough to warrant its own test

```kotlin
class GetBeerWithReviewsUseCase @Inject constructor(
    private val beerRepository: BeerRepository,
    private val reviewRepository: ReviewRepository,
) {
    suspend operator fun invoke(beerId: String): BeerWithReviews {
        val beer = beerRepository.getById(beerId) ?: throw BeerNotFound(beerId)
        val reviews = reviewRepository.getForBeer(beerId)
        return BeerWithReviews(beer, reviews)
    }
}
```

Skip use cases when the ViewModel simply calls one repository method -- the extra layer
adds indirection without value.

---

## Navigation

**Define routes as a sealed interface:**
```kotlin
sealed interface Route {
    @Serializable data object Home : Route
    @Serializable data class Detail(val beerId: String) : Route
    @Serializable data object Settings : Route
}
```

**NavGraph wires routes to screens:**
```kotlin
@Composable
fun AppNavGraph(navController: NavHostController = rememberNavController()) {
    NavHost(navController = navController, startDestination = Route.Home) {
        composable<Route.Home> {
            val viewModel: HomeViewModel = hiltViewModel()
            val state by viewModel.state.collectAsStateWithLifecycle()
            HomeScreen(
                state = state,
                onAction = viewModel::onAction,
                onNavigateToDetail = { navController.navigate(Route.Detail(it)) },
            )
        }
        composable<Route.Detail> {
            val viewModel: DetailViewModel = hiltViewModel()
            val state by viewModel.state.collectAsStateWithLifecycle()
            DetailScreen(state = state, onBack = { navController.popBackStack() })
        }
    }
}
```

---

## Hilt Module Organization

```kotlin
// di/AppModule.kt -- app-scoped singletons
@Module
@InstallIn(SingletonComponent::class)
abstract class AppModule {
    @Binds
    abstract fun bindBeerRepository(impl: BeerRepositoryImpl): BeerRepository
}

// di/NetworkModule.kt -- Retrofit, OkHttp
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideRetrofit(): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.BASE_URL)
        .addConverterFactory(Json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Provides
    @Singleton
    fun provideApi(retrofit: Retrofit): BeerApi = retrofit.create()
}

// di/DatabaseModule.kt -- Room
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun provideBeerDao(db: AppDatabase): BeerDao = db.beerDao()
}
```

---

## Gradle Configuration

### Version Catalog (gradle/libs.versions.toml)

All dependency versions live here. No version strings in build.gradle.kts files.

```toml
[versions]
kotlin = "2.0.21"
agp = "8.7.3"
compose-bom = "2024.12.01"
hilt = "2.53.1"
room = "2.6.1"
retrofit = "2.11.0"
coroutines = "1.8.1"

[libraries]
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "compose-bom" }
compose-material3 = { module = "androidx.compose.material3:material3" }
compose-ui-tooling = { module = "androidx.compose.ui:ui-tooling" }
hilt-android = { module = "com.google.dagger:hilt-android", version.ref = "hilt" }
hilt-compiler = { module = "com.google.dagger:hilt-android-compiler", version.ref = "hilt" }
room-runtime = { module = "androidx.room:room-runtime", version.ref = "room" }
room-ktx = { module = "androidx.room:room-ktx", version.ref = "room" }
room-compiler = { module = "androidx.room:room-compiler", version.ref = "room" }
retrofit = { module = "com.squareup.retrofit2:retrofit", version.ref = "retrofit" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp = { id = "com.google.devtools.ksp", version = "2.0.21-1.0.28" }
```

### App build.gradle.kts

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.example.projectname"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.projectname"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.material3)
    debugImplementation(libs.compose.ui.tooling)

    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    // Room
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    // Retrofit
    implementation(libs.retrofit)

    // Testing -- see testing.md
}
```

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | PascalCase matching primary class | `BreweryViewModel.kt` |
| Packages | lowercase, no underscores | `com.example.brewery.data.local` |
| Composables | PascalCase | `BeerCard.kt`, `HomeScreen.kt` |
| Test files | Same name + `Test` suffix | `BreweryViewModelTest.kt` |
| Resource files | snake_case | `ic_beer.xml`, `bg_card.xml` |
| String resources | snake_case with prefix | `home_title`, `error_network` |
| Gradle files | `build.gradle.kts` | -- |

### Multi-Module Projects

For apps that grow beyond a single module, split by feature:

```
project-name/
  app/                     # Shell module (MainActivity, NavGraph, Hilt setup)
  feature/
    home/                  # Feature module
    detail/
  core/
    data/                  # Shared data layer
    domain/                # Shared domain models
    ui/                    # Shared UI components, theme
```

Start single-module. Extract modules only when build times or team boundaries demand it.
Premature modularization adds complexity without benefit.
