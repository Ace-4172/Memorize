
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Verse, VerseWord, Difficulty, FavoriteVerse, InputMode } from './types';
import Settings from './components/Settings';
import Library from './components/Library';

const DEFAULT_VERSE_TEXT = "I can do all things through Christ who strengthens me.";
const DEFAULT_VERSE_REF = "Philippians 4:13";
const PERSISTENCE_KEYS = {
  FAVORITES: 'memorize_favorites',
  SETTINGS: 'memorize_settings',
  CURRENT_VERSE: 'memorize_current_verse',
  THEME: 'memorize_theme',
  DARK_MODE: 'memorize_dark_mode'
};

interface SavedSettings {
  difficulty: Difficulty;
  version: string;
  inputMode: InputMode;
}

interface SavedVerseState {
  reference: string;
  text: string;
  isMastered: boolean;
}

const App: React.FC = () => {
  // Load saved data for initial state
  const loadSavedFavorites = (): FavoriteVerse[] => {
    const saved = localStorage.getItem(PERSISTENCE_KEYS.FAVORITES);
    if (saved) {
      try {
        const parsed: any[] = JSON.parse(saved);
        // Migrate old favorites that don't have IDs
        return parsed.map(f => ({
          ...f,
          id: f.id || ((typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).substring(2)),
          label: f.label || f.reference // Migrate old favorites
        }));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
    return [];
  };

  const loadSavedSettings = (): SavedSettings => {
    const saved = localStorage.getItem(PERSISTENCE_KEYS.SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          difficulty: parsed.difficulty ?? Difficulty.MEDIUM,
          version: parsed.version ?? 'en-kjv',
          inputMode: parsed.inputMode ?? InputMode.REVEAL
        };
      } catch (e) { console.error("Failed to parse settings", e); }
    }
    return { difficulty: Difficulty.MEDIUM, version: 'en-kjv', inputMode: InputMode.REVEAL };
  };

  const loadSavedVerse = (): SavedVerseState | null => {
    const saved = localStorage.getItem(PERSISTENCE_KEYS.CURRENT_VERSE);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error("Failed to parse current verse", e); }
    }
    return null;
  };

  const [favorites, setFavorites] = useState<FavoriteVerse[]>(loadSavedFavorites);
  const settings = loadSavedSettings();
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.difficulty);
  const [version, setVersion] = useState<string>(settings.version);
  const [inputMode, setInputMode] = useState<InputMode>(settings.inputMode);

  const initialVerseState = loadSavedVerse();
  const [verse, setVerse] = useState<Verse | null>(null);
  const [isMastered, setIsMastered] = useState(initialVerseState?.isMastered ?? false);

  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem(PERSISTENCE_KEYS.DARK_MODE);
    return saved ? JSON.parse(saved) : false;
  });
  const [isShaking, setIsShaking] = useState(false);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(PERSISTENCE_KEYS.FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(PERSISTENCE_KEYS.SETTINGS, JSON.stringify({ difficulty, version, inputMode }));
  }, [difficulty, version, inputMode]);

  useEffect(() => {
    localStorage.setItem(PERSISTENCE_KEYS.DARK_MODE, JSON.stringify(isDarkMode));
    localStorage.setItem(PERSISTENCE_KEYS.THEME, isDarkMode ? 'dark' : 'light'); // Keep for backward compat
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (verse) {
      localStorage.setItem(PERSISTENCE_KEYS.CURRENT_VERSE, JSON.stringify({
        reference: verse.reference,
        text: verse.text,
        isMastered
      }));
    }
  }, [verse, isMastered]);

  const initializeVerse = useCallback((ref: string, text: string, diff: Difficulty, preserveMastery = false, label?: string) => {
    const rawWords = text.trim().split(/\s+/);
    const textWords: VerseWord[] = rawWords.map((word, index) => {
      const isVisibleByDefault = diff === Difficulty.EXTREME
        ? false
        : (index === 0 || (index === rawWords.length - 1 && rawWords.length > 3));

      const shouldBeHidden = diff === Difficulty.EXTREME
        ? true
        : (!isVisibleByDefault && (diff === Difficulty.NONE ? false : Math.random() < diff));

      return {
        text: word.replace(/[.,!?;:"]/g, '').toLowerCase(),
        displayText: word,
        isHidden: shouldBeHidden,
        isRevealed: false,
        showHint: false
      };
    });

    // Handle Reference Parts
    const refWords: VerseWord[] = [];
    // Robust regex to handle Book Name Chapter:Verse-End (e.g. "1 John 1:1-3")
    // Supports both hyphens (-) and en-dashes (–) common in Bible APIs
    const refRegex = /^(.*?)\s*(\d+):(\d+)(?:[\-\u2013\u2014](\d+))?/;
    const match = ref.trim().match(refRegex);

    if (match) {
      const [_, book, chapter, verseStart, verseEnd] = match;

      // Book words
      const toTitleCase = (str: string) => {
        return str.split(/\s+/).map(word => {
          if (/^\d+$/.test(word)) return word; // Keep numbers as is
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
      };

      const formattedBook = toTitleCase(book);
      const bookParts = formattedBook.split(/\s+/);

      bookParts.forEach((part, i) => {
        const isHard = diff === Difficulty.HARD || diff === Difficulty.EXTREME;
        const isHiddenRaw = diff === Difficulty.NONE ? false : isHard;
        refWords.push({
          text: part.toLowerCase(),
          displayText: part,
          isHidden: isHiddenRaw,
          isRevealed: diff === Difficulty.NONE,
          showHint: false,
          isReference: true
        });
        if (i < bookParts.length - 1) {
          refWords.push({ text: ' ', displayText: ' ', isHidden: false, isRevealed: true, showHint: false, isReference: true, isSymbol: true });
        }
      });

      // Space between book and chapter
      refWords.push({ text: ' ', displayText: ' ', isHidden: false, isRevealed: true, showHint: false, isReference: true, isSymbol: true });

      // Helper to add numbers digit by digit
      const addNumber = (num: string, isHidden: boolean) => {
        num.split('').forEach(digit => {
          refWords.push({
            text: digit,
            displayText: digit,
            isHidden: isHidden,
            isRevealed: diff === Difficulty.NONE || !isHidden,
            showHint: false,
            isReference: true
          });
        });
      };

      // Chapter
      const hideChapter = diff === Difficulty.MEDIUM || diff === Difficulty.HARD || diff === Difficulty.EXTREME;
      addNumber(chapter, diff === Difficulty.NONE ? false : hideChapter);

      // Colon
      refWords.push({ text: ':', displayText: ':', isHidden: false, isRevealed: true, showHint: false, isReference: true, isSymbol: true });

      // Verse Start
      addNumber(verseStart, diff === Difficulty.NONE ? false : true); // Always hidden for EASY and above

      if (verseEnd) {
        refWords.push({ text: '-', displayText: '-', isHidden: false, isRevealed: true, showHint: false, isReference: true, isSymbol: true });
        addNumber(verseEnd, diff === Difficulty.NONE ? false : true);
      }
    } else {
      // Fallback for custom reference names (e.g. if a verse was renamed in the library)
      const parts = ref.trim().split(/\s+/);
      parts.forEach((part, i) => {
        // Hide custom references if difficulty is MEDIUM or higher
        const isHidden = diff === Difficulty.MEDIUM || diff === Difficulty.HARD || diff === Difficulty.EXTREME;

        refWords.push({
          text: part.replace(/[.,!?;:"]/g, '').toLowerCase(),
          displayText: part,
          isHidden: diff === Difficulty.NONE ? false : isHidden,
          isRevealed: diff === Difficulty.NONE,
          showHint: false,
          isReference: true
        });
        if (i < parts.length - 1) {
          refWords.push({ text: ' ', displayText: ' ', isHidden: false, isRevealed: true, showHint: false, isReference: true, isSymbol: true });
        }
      });
    }

    const combinedWords = [...textWords, ...refWords];
    setVerse({ reference: ref, label, text, words: combinedWords });

    if (!preserveMastery) {
      const hasHiddenWords = combinedWords.some(w => w.isHidden);
      setIsMastered(!hasHiddenWords);
    }
  }, []);

  // Initial load logic
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const saved = loadSavedVerse();
    if (saved) {
      // Find matching favorite to get its label if it exists
      const fav = loadSavedFavorites().find(f => f.reference === saved.reference && f.text === saved.text);
      initializeVerse(saved.reference, saved.text, difficulty, true, fav?.label);
    } else {
      initializeVerse(DEFAULT_VERSE_REF, DEFAULT_VERSE_TEXT, difficulty);
    }
  }, [initializeVerse, difficulty]);

  // Handle difficulty changes after initial load
  const isFirstDifficultyChange = useRef(true);
  useEffect(() => {
    if (isFirstDifficultyChange.current) {
      isFirstDifficultyChange.current = false;
      return;
    }
    const currentRef = verse?.reference || DEFAULT_VERSE_REF;
    const currentText = verse?.text || DEFAULT_VERSE_TEXT;
    const currentLabel = verse?.label;
    initializeVerse(currentRef, currentText, difficulty, false, currentLabel);
  }, [difficulty]);

  const handleSelectFromLibrary = (ref: string, text: string, ver: string, label?: string) => {
    setVersion(ver);
    initializeVerse(ref, text, difficulty, false, label);
    setShowLibrary(false);
  };

  const handleRevealNext = useCallback(() => {
    if (!verse) return;

    if (isMastered) {
      initializeVerse(verse.reference, verse.text, difficulty, false, verse.label);
      return;
    }

    const firstHidden = verse.words.findIndex(w => w.isHidden && !w.isRevealed && !w.isSymbol);
    if (firstHidden === -1) {
      setIsMastered(true);
      return;
    }

    const newWords = [...verse.words];
    newWords[firstHidden] = { ...newWords[firstHidden], isRevealed: true };
    setVerse({ ...verse, words: newWords });

    const remainingHidden = newWords.findIndex(w => w.isHidden && !w.isRevealed && !w.isSymbol);
    if (remainingHidden === -1) {
      setIsMastered(true);
    }
  }, [verse, isMastered, difficulty, initializeVerse]);

  // Handle input for Typing Mode
  useEffect(() => {
    if (inputMode === InputMode.TYPE && !showSettings && !showLibrary && !isMastered) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [inputMode, showSettings, showLibrary, isMastered]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val || !verse || isMastered) return;

    const char = val.charAt(val.length - 1).toLowerCase();
    // Clear input to allow next character
    e.target.value = '';

    const firstHiddenIdx = verse.words.findIndex(w => w.isHidden && !w.isRevealed && !w.isSymbol);
    if (firstHiddenIdx === -1) return;

    const targetWord = verse.words[firstHiddenIdx];
    const firstChar = targetWord.text.charAt(0);

    if (char === firstChar) {
      handleRevealNext();
    } else {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
    }
  };

  const ensureFocus = () => {
    if (inputMode === InputMode.TYPE) {
      inputRef.current?.focus({ preventScroll: true });
    }
  };

  // Keep keyboard input for Desktop Typing Mode (supplemental)
  useEffect(() => {
    if (inputMode !== InputMode.TYPE || !verse || isMastered || showSettings || showLibrary) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional keys
      if (e.key.length !== 1) return;

      const firstHiddenIdx = verse.words.findIndex(w => w.isHidden && !w.isRevealed && !w.isSymbol);
      if (firstHiddenIdx === -1) return;

      const targetWord = verse.words[firstHiddenIdx];
      const typedChar = e.key.toLowerCase();
      const firstChar = targetWord.text.charAt(0);

      if (typedChar === firstChar) {
        handleRevealNext();
      } else {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputMode, verse, isMastered, showSettings, showLibrary, handleRevealNext]);

  const handleHint = () => {
    if (!verse) return;
    const firstHidden = verse.words.findIndex(w => w.isHidden && !w.isRevealed && !w.isSymbol);
    if (firstHidden === -1) return;

    const newWords = [...verse.words];
    newWords[firstHidden] = { ...newWords[firstHidden], showHint: true };
    setVerse({ ...verse, words: newWords });

    setTimeout(() => {
      setVerse(prev => {
        if (!prev) return null;
        const resetWords = [...prev.words];
        if (resetWords[firstHidden]) {
          resetWords[firstHidden] = { ...resetWords[firstHidden], showHint: false };
        }
        return { ...prev, words: resetWords };
      });
    }, 1500);
  };

  const handleMastered = () => {
    if (!verse) return;
    const revealedWords = verse.words.map(w => ({ ...w, isRevealed: true }));
    setVerse({ ...verse, words: revealedWords });
    setIsMastered(true);
  };

  const handleToggleFavorite = () => {
    if (!verse) return;
    const isFav = favorites.some(f => f.reference === verse.reference);
    if (isFav) {
      setFavorites(favorites.filter(f => f.reference !== verse.reference));
    } else {
      const newFav: FavoriteVerse = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).substring(2),
        reference: verse.reference,
        label: verse.reference, // Initial label matches reference
        text: verse.text,
        version: version,
        timestamp: Date.now()
      };
      setFavorites([newFav, ...favorites]);
    }
  };

  const handleReorderFavorites = (newFavorites: FavoriteVerse[]) => {
    setFavorites(newFavorites);
  };

  const handleRenameFavorite = (id: string, newLabel: string) => {
    setFavorites(favorites.map(f => f.id === id ? { ...f, label: newLabel } : f));
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites(favorites.filter(f => f.id !== id));
  };

  const totalWords = verse?.words.filter(w => !w.isSymbol).length || 0;
  const revealedCount = verse?.words.filter(w => (!w.isHidden || w.isRevealed) && !w.isSymbol).length || 0;
  const progressPercent = totalWords > 0 ? (revealedCount / totalWords) * 100 : 0;
  const isCurrentFavorite = verse ? favorites.some(f => f.reference === verse.reference) : false;

  const nextHiddenIdx = verse?.words.findIndex(w => w.isHidden && !w.isRevealed && !w.isSymbol);

  useEffect(() => {
    if (activeWordRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeWord = activeWordRef.current;

      const containerHeight = container.clientHeight;
      const wordTop = activeWord.offsetTop;
      const wordHeight = activeWord.offsetHeight;

      const targetOffset = containerHeight / 3.5; // Positions active word in upper-middle
      const targetScroll = wordTop - targetOffset;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }, [nextHiddenIdx, verse]);

  return (
    <div className="flex flex-col h-screen h-[100dvh] overflow-hidden">
      <header className="flex items-center p-4 pb-2 justify-between shrink-0 bg-paper-bg/80 backdrop-blur-sm z-20">
        <div className="flex size-10 shrink-0 items-center">
          <button
            onClick={() => setShowLibrary(true)}
            className="p-2 hover:bg-paper-accent/10 rounded-full transition-colors relative"
          >
            <span className="material-symbols-outlined text-2xl text-paper-accent">menu_book</span>
            {favorites.length > 0 && (
              <span className="absolute top-1 right-1 size-2 bg-paper-ink rounded-full" />
            )}
          </button>
        </div>
        <h2 className="text-paper-ink text-sm font-sans font-bold uppercase tracking-[0.2em] flex-1 text-center">Memorize</h2>
        <div className="flex w-10 items-center justify-end">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-paper-accent/10 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-2xl text-paper-accent">settings</span>
          </button>
        </div>
      </header>

      <div className={`max-w-md mx-auto w-full px-6 flex-1 flex flex-col overflow-y-auto no-scrollbar pb-48 pt-2 transition-transform duration-300 ${isShaking ? 'translate-x-1' : ''}`}>
        {/* Progress Section */}
        <div className="flex flex-col gap-2 mb-8 shrink-0">
          <div className="flex justify-between items-end">
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-paper-accent font-bold">Progress</span>
            <span className="font-handwriting text-2xl text-paper-accent leading-none">
              {revealedCount} / {totalWords}
            </span>
          </div>
          <div className="h-[1px] w-full bg-paper-line relative">
            <div
              className="absolute top-0 left-0 h-[2px] bg-paper-ink transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <main className="flex-1 flex flex-col items-center justify-center space-y-8 py-4">
          <div className="text-center fade-in relative group shrink-0">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 md:group-hover:opacity-100 transition-opacity hidden md:block">
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleFavorite(); }}
                className={`p-2 rounded-full transition-colors ${isCurrentFavorite ? 'text-amber-500' : 'text-paper-accent/30 hover:text-amber-500'}`}
              >
                <span className={`material-symbols-outlined text-2xl ${isCurrentFavorite ? 'fill-current' : ''}`}>
                  {isCurrentFavorite ? 'star' : 'star_outline'}
                </span>
              </button>
            </div>
            <p className="font-serif italic text-paper-accent text-lg flex items-center justify-center relative">
              {verse?.label || verse?.reference}
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleFavorite(); }}
                className={`transition-colors md:hidden absolute -right-10 p-2 ${isCurrentFavorite ? 'text-amber-500' : 'text-paper-accent/30'}`}
              >
                <span className={`material-symbols-outlined text-xl align-middle ${isCurrentFavorite ? 'fill-current' : ''}`}>
                  {isCurrentFavorite ? 'star' : 'star_outline'}
                </span>
              </button>
            </p>
            <div className="h-px w-8 bg-paper-accent/30 mx-auto mt-1"></div>
          </div>

          <div
            ref={scrollContainerRef}
            className="relative w-full text-center cursor-text overflow-y-auto h-[240px] md:h-[280px] no-scrollbar scroll-smooth [overflow-anchor:none]"
            onClick={ensureFocus}
            style={{
              maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)'
            }}
          >
            {inputMode === InputMode.TYPE && (
              <input
                ref={inputRef}
                type="text"
                className="fixed opacity-0 p-0 m-0 border-none w-0 h-0 pointer-events-none focus:outline-none caret-transparent text-transparent bg-transparent"
                onChange={handleInput}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                aria-hidden="true"
              />
            )}
            <div className="py-20">
              <h1 className="text-paper-ink text-[28px] md:text-[32px] leading-[1.6] font-serif transition-all px-2">
                {(() => {
                  let hasStartedRef = false;
                  return verse?.words.map((word, idx) => {
                    const isWordHidden = word.isHidden && !word.isRevealed;
                    const isActive = idx === nextHiddenIdx;
                    const isPast = nextHiddenIdx !== undefined && nextHiddenIdx !== -1 && idx < nextHiddenIdx;

                    const showDivider = word.isReference && !hasStartedRef;
                    if (showDivider) hasStartedRef = true;

                    if (word.isSymbol) {
                      return (
                        <span key={idx} className="opacity-40 text-[0.8em] align-middle font-sans px-[1px]">
                          {word.displayText}
                        </span>
                      );
                    }

                    return (
                      <React.Fragment key={idx}>
                        {showDivider && (
                          <span className="block h-[1px] w-12 bg-paper-accent/20 mx-auto my-6" />
                        )}
                        <span
                          ref={isActive ? activeWordRef : null}
                          className={`inline-block transition-all duration-500 ${isPast && inputMode === InputMode.TYPE ? 'opacity-20 translate-y-[-4px] scale-[0.98]' : 'opacity-100'} ${word.isReference ? 'font-serif italic text-[0.7em] opacity-80' : ''}`}
                        >
                          {isWordHidden ? (
                            <span className={`pencil-underline relative group cursor-default select-none ${isActive && inputMode === InputMode.TYPE ? 'after:!bg-paper-ink/40 after:!h-[4px]' : ''}`}>
                              {word.showHint ? (
                                <span className={`absolute inset-0 flex items-center justify-center text-paper-accent/50 italic fade-in font-handwriting ${word.isReference ? 'text-lg' : 'text-xl'}`}>
                                  {word.text.charAt(0)}
                                </span>
                              ) : null}
                              {word.displayText}
                            </span>
                          ) : (
                            <span className="fade-in inline-block font-medium">{word.displayText}</span>
                          )}
                        </span>
                        {!word.isReference && ' '}
                      </React.Fragment>
                    );
                  });
                })()}
              </h1>
            </div>
          </div>

          <div className="pt-4 shrink-0">
            <p className="font-sans text-[10px] uppercase tracking-widest text-paper-accent/50 text-center italic font-medium">
              {isMastered
                ? "Excellent progress!"
                : inputMode === InputMode.TYPE
                  ? "Type the first letter of the underlined word"
                  : "Say the verse aloud as you go"
              }
            </p>
          </div>
        </main>
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-10 pt-6 bg-gradient-to-t from-paper-bg via-paper-bg to-transparent z-10">
        <div className="max-w-md mx-auto">
          <div className="flex gap-4">
            <button
              onClick={handleHint}
              disabled={isMastered}
              className="flex-1 flex flex-col items-center justify-center rounded-2xl h-20 bg-paper-line/40 border border-paper-accent/10 text-paper-accent hover:bg-paper-line transition-all active:scale-95 disabled:opacity-30"
            >
              <span className="material-symbols-outlined mb-1">lightbulb</span>
              <span className="font-sans text-[10px] font-bold uppercase tracking-widest">Hint</span>
            </button>

            {inputMode === InputMode.REVEAL ? (
              <button
                onClick={handleRevealNext}
                className="flex-[2.5] flex flex-col items-center justify-center rounded-2xl h-20 bg-paper-ink text-paper-bg shadow-xl shadow-paper-ink/10 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined mb-1 text-2xl">
                  {isMastered ? "auto_stories" : "visibility"}
                </span>
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest">
                  {isMastered ? "Read Again" : "Reveal Next"}
                </span>
              </button>
            ) : (
              <div className="flex-[2.5] flex flex-col items-center justify-center rounded-2xl h-20 bg-paper-line/20 border border-paper-line text-paper-accent italic font-serif text-sm">
                {isMastered ? (
                  <button onClick={() => initializeVerse(verse!.reference, verse!.text, difficulty, false, verse!.label)} className="w-full h-full flex flex-col items-center justify-center uppercase font-sans font-bold text-[10px] tracking-widest text-paper-ink">
                    <span className="material-symbols-outlined mb-1 text-2xl">auto_stories</span>
                    Read Again
                  </button>
                ) : (
                  <span className="animate-pulse">Awaiting input...</span>
                )}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleMastered}
              disabled={isMastered}
              className="font-sans text-[11px] font-bold text-paper-accent uppercase tracking-[0.2em] hover:text-paper-ink transition-colors px-6 py-2 border border-transparent hover:border-paper-line rounded-full disabled:opacity-20"
            >
              I've got it
            </button>
          </div>
        </div>
      </div>

      <Library
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        favorites={favorites}
        onSelectVerse={handleSelectFromLibrary}
        onRemoveFavorite={handleRemoveFavorite}
        onReorderFavorites={handleReorderFavorites}
        onRenameFavorite={handleRenameFavorite}
      />

      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onUpdateVerse={(ref, text) => initializeVerse(ref, text, difficulty)}
        currentDifficulty={difficulty}
        onUpdateDifficulty={(diff) => setDifficulty(diff)}
        currentVersion={version}
        onUpdateVersion={(v) => setVersion(v)}
        inputMode={inputMode}
        onUpdateInputMode={setInputMode}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    </div>
  );
};

export default App;
