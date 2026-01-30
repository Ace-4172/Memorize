
import React, { useState } from 'react';
import { suggestVerses } from '../services/geminiService';
import { fetchVerseFromApi, BIBLE_VERSIONS } from '../services/bibleService';
import { Difficulty, FavoriteVerse, InputMode } from '../types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateVerse: (ref: string, text: string) => void;
  currentDifficulty: Difficulty;
  onUpdateDifficulty: (diff: Difficulty) => void;
  currentVersion: string;
  onUpdateVersion: (version: string) => void;
  inputMode: InputMode;
  onUpdateInputMode: (mode: InputMode) => void;
}

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  onUpdateVerse,
  currentDifficulty,
  onUpdateDifficulty,
  currentVersion,
  onUpdateVersion,
  inputMode,
  onUpdateInputMode
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ reference: string; text: string }[]>([]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVerseFromApi(currentVersion, query);
      onUpdateVerse(data.reference, data.text);
      onClose();
    } catch (err: any) {
      console.error("Failed to fetch verse:", err);
      setError(err.message || "Failed to find verse. Try 'John 3:16'.");
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await suggestVerses();
      setSuggestions(data);
    } catch (err) {
      console.error("Failed to suggest:", err);
    } finally {
      setLoading(false);
    }
  };

  const mainOptions = [
    { label: 'None', value: Difficulty.NONE, desc: 'Full Text' },
    { label: 'Easy', value: Difficulty.EASY, desc: '20%' },
    { label: 'Med', value: Difficulty.MEDIUM, desc: '50%' },
  ];

  const advancedOptions = [
    { label: 'Hard', value: Difficulty.HARD, desc: '80%' },
    { label: 'Max', value: Difficulty.EXTREME, desc: 'All' },
  ];

  const renderOption = (opt: any) => (
    <button
      key={opt.label}
      type="button"
      onClick={() => onUpdateDifficulty(opt.value)}
      className={`flex-1 flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-300 ${currentDifficulty === opt.value
        ? 'bg-paper-ink text-paper-bg shadow-md scale-[1.02]'
        : 'text-paper-accent hover:bg-paper-accent/5'
        }`}
    >
      <span className="font-sans text-[10px] font-bold uppercase tracking-tight">{opt.label}</span>
      <span className={`text-[8px] font-medium opacity-60 ${currentDifficulty === opt.value ? 'text-paper-bg' : ''}`}>
        {opt.desc}
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper-ink/20 backdrop-blur-sm transition-opacity">
      <div className="bg-paper-bg paper-texture w-full max-w-md rounded-3xl shadow-2xl p-6 border border-paper-accent/20 flex flex-col gap-6 max-h-[85vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center border-b border-paper-line pb-4">
          <h3 className="font-sans font-bold uppercase tracking-widest text-sm text-paper-accent">Configuration</h3>
          <button onClick={onClose} className="p-2 hover:bg-paper-accent/10 rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-paper-accent">Memorization Level</label>
          <div className="flex flex-col gap-2">
            <div className="flex p-1 bg-paper-line/30 rounded-2xl gap-1">
              {mainOptions.map(renderOption)}
            </div>
            <div className="flex p-1 bg-paper-line/30 rounded-2xl gap-1 w-2/3 mx-auto">
              {advancedOptions.map(renderOption)}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-paper-accent">Interaction Mode</label>
          <div className="flex p-1 bg-paper-line/30 rounded-2xl gap-1">
            <button
              onClick={() => onUpdateInputMode(InputMode.REVEAL)}
              className={`flex-1 py-2 rounded-xl transition-all ${inputMode === InputMode.REVEAL ? 'bg-paper-ink text-paper-bg shadow-sm' : 'text-paper-accent hover:bg-paper-accent/5'}`}
            >
              <span className="font-sans text-[10px] font-bold uppercase tracking-widest">Reveal Tap</span>
            </button>
            <button
              onClick={() => onUpdateInputMode(InputMode.TYPE)}
              className={`flex-1 py-2 rounded-xl transition-all ${inputMode === InputMode.TYPE ? 'bg-paper-ink text-paper-bg shadow-sm' : 'text-paper-accent hover:bg-paper-accent/5'}`}
            >
              <span className="font-sans text-[10px] font-bold uppercase tracking-widest">Type First Letter</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-paper-accent">Translation</label>
          <select
            value={currentVersion}
            onChange={(e) => onUpdateVersion(e.target.value)}
            className="w-full bg-paper-line/30 border-paper-accent/20 rounded-xl px-4 py-3 font-serif italic text-paper-ink focus:ring-paper-accent/30 focus:border-paper-accent/30 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238b7e6a%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat"
          >
            {BIBLE_VERSIONS.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-paper-accent">Find New Verse</label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. John 3:16"
              className="w-full bg-paper-line/30 border-paper-accent/20 rounded-xl px-4 py-3 font-serif italic text-paper-ink placeholder:text-paper-accent/40 focus:ring-paper-accent/30 focus:border-paper-accent/30"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-paper-ink text-paper-bg p-2 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center w-10 h-10"
            >
              {loading ? <span className="material-symbols-outlined animate-spin text-xl">refresh</span> : <span className="material-symbols-outlined text-xl">search</span>}
            </button>
          </div>
          {error && <p className="text-[10px] text-red-500 font-sans italic text-center">{error}</p>}
        </form>

        {/* <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-paper-accent">Quick Suggestions</h4>
            <button onClick={loadSuggestions} className="text-xs text-paper-accent hover:text-paper-ink font-sans underline decoration-paper-accent/30 underline-offset-4">Refresh</button>
          </div>
          <div className="flex flex-col gap-2">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => { onUpdateVerse(s.reference, s.text); onClose(); }}
                className="text-left p-3 rounded-xl border border-paper-accent/10 hover:bg-paper-accent/10 transition-colors group"
              >
                <div className="font-sans font-bold text-xs uppercase tracking-tight group-hover:text-paper-ink">{s.reference}</div>
                <div className="font-serif italic text-sm text-paper-accent truncate">{s.text}</div>
              </button>
            ))}
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default Settings;
