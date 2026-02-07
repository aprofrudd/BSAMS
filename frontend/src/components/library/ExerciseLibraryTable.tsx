'use client';

import { useState, useEffect, useCallback } from 'react';
import { exerciseLibraryApi } from '@/lib/api';
import { ExerciseLibraryFormModal } from './ExerciseLibraryFormModal';
import type { ExerciseLibraryItem } from '@/lib/types';

const EXERCISE_CATEGORIES = ['All', 'Strength', 'Plyometric', 'Conditioning', 'Other'];

export function ExerciseLibraryTable() {
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseLibraryItem | null>(null);

  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const options: { search?: string; category?: string } = {};
      if (searchQuery) options.search = searchQuery;
      if (categoryFilter !== 'All') options.category = categoryFilter;
      const data = await exerciseLibraryApi.list(options);
      setExercises(data);
    } catch (err) {
      setError('Failed to load exercises');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this exercise from your library?')) return;
    try {
      await exerciseLibraryApi.delete(id);
      setExercises((prev) => prev.filter((ex) => ex.id !== id));
    } catch (err) {
      console.error('Failed to delete exercise:', err);
    }
  }

  return (
    <div>
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input flex-1 text-sm"
        />
        <div className="flex gap-1">
          {EXERCISE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-accent text-[#090A3D]'
                  : 'bg-secondary-muted/30 text-white/60 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Add Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEditingExercise(null); setShowForm(true); }}
          className="px-3 py-1.5 rounded text-sm font-medium bg-accent text-[#090A3D] hover:bg-accent/80 transition-colors"
        >
          + Add Exercise
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm py-4 text-center">{error}</p>
      ) : exercises.length === 0 ? (
        <p className="text-white/60 text-sm py-8 text-center">
          {searchQuery || categoryFilter !== 'All'
            ? 'No exercises match your search'
            : 'No exercises in your library yet. Add your first exercise to get started.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/60 border-b border-secondary-muted">
                <th className="text-left py-2 px-2">Exercise</th>
                <th className="text-left py-2 px-2">Category</th>
                <th className="text-right py-2 px-2">Reps</th>
                <th className="text-right py-2 px-2">Weight</th>
                <th className="text-left py-2 px-2">Tempo</th>
                <th className="text-right py-2 px-2">Rest</th>
                <th className="text-left py-2 px-2">Notes</th>
                <th className="text-right py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((ex) => (
                <tr
                  key={ex.id}
                  className="border-b border-secondary-muted/50 hover:bg-secondary-muted/20 transition-colors"
                >
                  <td className="py-2 px-2 font-medium">{ex.exercise_name}</td>
                  <td className="py-2 px-2 text-white/60">{ex.exercise_category || '-'}</td>
                  <td className="py-2 px-2 text-right">{ex.default_reps ?? '-'}</td>
                  <td className="py-2 px-2 text-right">
                    {ex.default_weight_kg != null ? `${ex.default_weight_kg} kg` : '-'}
                  </td>
                  <td className="py-2 px-2 text-white/60">{ex.default_tempo || '-'}</td>
                  <td className="py-2 px-2 text-right">
                    {ex.default_rest_seconds != null ? `${ex.default_rest_seconds}s` : '-'}
                  </td>
                  <td className="py-2 px-2 text-white/60 max-w-[200px] truncate">
                    {ex.notes || '-'}
                  </td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => { setEditingExercise(ex); setShowForm(true); }}
                      className="text-white/60 hover:text-accent text-xs mr-2 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ex.id)}
                      className="text-white/60 hover:text-red-400 text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ExerciseLibraryFormModal
          existingExercise={editingExercise}
          onClose={() => { setShowForm(false); setEditingExercise(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditingExercise(null);
            loadExercises();
          }}
        />
      )}
    </div>
  );
}
