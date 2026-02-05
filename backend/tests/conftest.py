"""Shared test configuration."""

import os

# Set DEV_MODE=true for all tests so the auth bypass is used
# This must happen before any app imports
os.environ.setdefault("DEV_MODE", "true")
