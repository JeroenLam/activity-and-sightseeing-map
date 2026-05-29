#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/../backend"
echo "=== Black ===" && black --check .
echo "=== isort ===" && isort --check .
echo "=== Ruff ===" && ruff check .
echo "=== Mypy ===" && mypy app
echo "=== Bandit ===" && bandit -r app -c pyproject.toml
echo "=== Tests ===" && pytest --cov=app --cov-fail-under=80
echo "All checks passed!"
