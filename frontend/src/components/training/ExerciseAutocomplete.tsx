'use client';

import { useState, useEffect, useRef } from 'react';
import { exerciseLibraryApi } from '@/lib/api';
import type { ExerciseLibraryItem } from '@/lib/types';

interface ExerciseAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (exercise: ExerciseLibraryItem) => void;
  placeholder?: string;
  className?: string;
}

export function ExerciseAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'e.g. Back Squat',
  className = '',
}: ExerciseAutocompleteProps) {
  const [library, setLibrary] = useState<ExerciseLibraryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load library on first focus
  async function loadLibrary() {
    if (loaded) return;
    try {
      const data = await exerciseLibraryApi.list();
      setLibrary(data);
      setLoaded(true);
    } catch {
      // Silently fail — autocomplete is optional
    }
  }

  // Filter library by current input
  const filtered = library.filter((item) =>
    item.exercise_name.toLowerCase().includes(value.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  function handleSelect(item: ExerciseLibraryItem) {
    onChange(item.exercise_name);
    onSelect(item);
    setShowDropdown(false);
    setHighlightIndex(-1);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => {
          loadLibrary();
          if (value) setShowDropdown(true);
        }}
        onKeyDown={handleKeyDown}
        className={`input w-full text-sm ${className}`}
        placeholder={placeholder}
        required
        autoComplete="off"
      />

      {showDropdown && value && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-primary-dark border border-secondary-muted rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                index === highlightIndex
                  ? 'bg-accent/20 text-white'
                  : 'text-white/80 hover:bg-white/5'
              }`}
            >
              <span className="font-medium">{item.exercise_name}</span>
              {item.exercise_category && (
                <span className="text-white/40 ml-2 text-xs">{item.exercise_category}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
