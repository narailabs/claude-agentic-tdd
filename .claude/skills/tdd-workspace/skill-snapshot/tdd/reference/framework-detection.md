# Framework Detection

Auto-detect the project's test framework, runner, and conventions.

## Detection Priority

1. `.tdd.config.json` explicit config (highest priority)
2. Project CLAUDE.md `## TDD Configuration` section
3. Auto-detection from project files
4. Ask user (fallback)

## Auto-Detection Rules

Run these checks via Bash. Stop at the first match.

### JavaScript / TypeScript

Check `package.json` for dependencies and devDependencies:

```bash
# Read package.json if it exists
cat package.json 2>/dev/null
```

| Dependency | Framework | Test Command | File Pattern |
|-----------|-----------|-------------|-------------|
| `vitest` | Vitest | `npx vitest run` | `**/*.test.{ts,tsx,js,jsx}` or `**/*.spec.{ts,tsx,js,jsx}` |
| `jest` | Jest | `npx jest` | `**/*.test.{ts,tsx,js,jsx}` or `**/__tests__/**` |
| `mocha` | Mocha | `npx mocha` | `test/**/*.{js,ts}` |
| `@playwright/test` | Playwright | `npx playwright test` | `**/*.spec.{ts,js}` |
| `ava` | AVA | `npx ava` | `**/*.test.{ts,js}` |

Also check for `scripts.test` in package.json — if defined, prefer it as the test command.

Determine TypeScript vs JavaScript: check for `tsconfig.json` or `.ts` files.

### Python

| File/Config | Framework | Test Command | File Pattern |
|------------|-----------|-------------|-------------|
| `pyproject.toml` with `[tool.pytest]` | pytest | `python -m pytest` | `test_*.py` or `*_test.py` |
| `pytest.ini` | pytest | `python -m pytest` | `test_*.py` or `*_test.py` |
| `setup.cfg` with `[tool:pytest]` | pytest | `python -m pytest` | `test_*.py` or `*_test.py` |
| `tox.ini` with `[pytest]` | pytest | `python -m pytest` | `test_*.py` or `*_test.py` |
| No pytest config but Python files exist | unittest | `python -m unittest discover` | `test_*.py` |

### Go

| File | Framework | Test Command | File Pattern |
|------|-----------|-------------|-------------|
| `go.mod` | go test | `go test ./...` | `*_test.go` |

### Rust

| File | Framework | Test Command | File Pattern |
|------|-----------|-------------|-------------|
| `Cargo.toml` | cargo test | `cargo test` | Tests inline in source or `tests/` dir |

### Java / Kotlin

| File | Framework | Test Command | File Pattern |
|------|-----------|-------------|-------------|
| `build.gradle` or `build.gradle.kts` | JUnit (Gradle) | `./gradlew test` | `src/test/**/*Test.java` |
| `pom.xml` | JUnit (Maven) | `mvn test` | `src/test/**/*Test.java` |

### Ruby

| File | Framework | Test Command | File Pattern |
|------|-----------|-------------|-------------|
| `Gemfile` with `rspec` | RSpec | `bundle exec rspec` | `spec/**/*_spec.rb` |
| `Gemfile` with `minitest` | Minitest | `ruby -Itest test/**/*_test.rb` | `test/**/*_test.rb` |

### Elixir

| File | Framework | Test Command | File Pattern |
|------|-----------|-------------|-------------|
| `mix.exs` | ExUnit | `mix test` | `test/**/*_test.exs` |

### PHP

| File | Framework | Test Command | File Pattern |
|------|-----------|-------------|-------------|
| `phpunit.xml` or `phpunit.xml.dist` | PHPUnit | `./vendor/bin/phpunit` | `tests/**/*Test.php` |

### C# / .NET

| File | Framework | Test Command | File Pattern |
|------|-----------|-------------|-------------|
| `*.csproj` with `xunit` or `nunit` | xUnit/NUnit | `dotnet test` | `**/*Tests.cs` |

## Test Directory Detection

If the framework is detected but test directory isn't configured:

1. Look for existing test files matching the file pattern
2. Infer the test directory from found files
3. If no test files exist, use language-standard defaults:
   - JS/TS: `src/__tests__/` or `tests/`
   - Python: `tests/`
   - Go: alongside source files
   - Rust: `tests/` or inline
   - Java: `src/test/java/`

## Output

Store detection result as:

```
framework:
  language: "typescript"
  testRunner: "vitest"
  testCommand: "npx vitest run"
  testFilePattern: "**/*.test.ts"
  sourceDir: "src/"
  testDir: "src/__tests__/"
```
