# Analytics Test Suite Makefile

.PHONY: test-analytics test-analytics-clean test-analytics-full help

# Default target
help:
	@echo "Analytics Test Suite Commands:"
	@echo "  test-analytics        - Run analytics tests (assumes Supabase is running)"
	@echo "  test-analytics-clean  - Reset database and run analytics tests"
	@echo "  test-analytics-full   - Start Supabase, reset DB, run tests, and stop Supabase"
	@echo "  help                 - Show this help message"

# Run analytics tests (assumes Supabase is already running)
test-analytics:
	@echo "Running analytics test suite..."
	npm run test:analytics

# Reset database and run analytics tests
test-analytics-clean:
	@echo "Resetting database and running analytics tests..."
	supabase db reset --no-browser --force
	npm run test:analytics

# Full test cycle: start Supabase, run tests, stop Supabase
test-analytics-full:
	@echo "Starting full analytics test cycle..."
	supabase start --ignore-health-check
	@echo "Waiting for Supabase to be ready..."
	@sleep 5
	supabase db reset --no-browser --force
	npm run test:analytics
	@echo "Analytics tests completed. Stopping Supabase..."
	supabase stop

# Continuous testing (watch mode)
test-analytics-watch:
	@echo "Running analytics tests in watch mode..."
	npm run test:analytics -- --watch

# Run tests with UI
test-analytics-ui:
	@echo "Running analytics tests with UI..."
	npm run test:analytics:ui