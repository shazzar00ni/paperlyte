#!/bin/bash

# This script will help identify which tests need fixing
echo "Tests that use vi.advanceTimersByTime followed by waitFor:"
grep -n "vi.advanceTimersByTime" src/hooks/useAutoSave.test.ts | head -20
