
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Verse, VerseWord, Difficulty, FavoriteVerse, InputMode } from './types';
import Settings from './components/Settings';
import Library from './components/Library';

const DEFAULT_VERSE_TEXT = "I can do all things through Christ who strengthens me.";
const DEFAULT_VERSE_REF = "Philippians 4:13";
const FAVORITES_KEY = 'memorize_favorites';

const App: React.FC = () => {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [version, setVersion] = useState<string>('en-kjv');
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.REVEAL);
  const [isMastered, setIsMastered] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteVerse[]>([]);
  
  // Track shaking for incorrect input
  const [isShaking, setIsShaking] = useState(false);

  // Load favorites from local storage
  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  // Save favorites to local storage
  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const initializeVerse = useCallback((ref: string, text: string, diff: Difficulty) => {
    const rawWords = text.trim().split(/\s+/);
    const words: VerseWord[] = rawWords.map((word, index) => {
      const isVisibleByDefault = diff === Difficulty.EXTREME 
        ? false 
        : (index === 0 || (index === rawWords.length - 1 && rawWords.length > 3));
      
      const shouldBeHidden = diff === Difficulty.EXTREME 
        ? true 
        : (!isVisibleByDefault && (diff === Difficulty.NONE ? false : Math.random() < diff));
      
      return {
        text: word.replace(/[.,!?;:"]/g, '').toLowerCase(), // clean text for matching
        displayText: word,
        isHidden: shouldBeHidden,
        isRevealed: false,
        showHint: false
      };
    });

    setVerse({ reference: ref, text, words });
    const hasHiddenWords = words.some(w => w.isHidden);
    setIsMastered(!hasHiddenWords);
  }, []);

  useEffect(() => {
    const currentRef = verse?.reference || DEFAULT_VERSE_REF;
    const currentText = verse?.text || DEFAULT_VERSE_TEXT;
    initializeVerse(currentRef, currentText, difficulty);
  }, [difficulty]);

  const handleSelectFromLibrary = (ref: string, text: string, ver: string) => {
    setVersion(ver);
    initializeVerse(ref, text, difficulty);
    setShowLibrary(false);
  };

  const handleRevealNext = useCallback(() => {
    if (!verse) return;
    
    if (isMastered) {
      initializeVerse(verse.reference, verse.text, difficulty);
      return;
    }

    const firstHidden = verse.words.findIndex(w => w.isHidden && !w.isRevealed);
    if (firstHidden === -1) {
      setIsMastered(true);
      return;
    }

    const newWords = [...verse.words];
    newWords[firstHidden] = { ...newWords[firstHidden], isRevealed: true };
    setVerse({ ...verse, words: newWords });

    const remainingHidden = newWords.findIndex(w => w.isHidden && !w.isRevealed);
    if (remainingHidden === -1) {
      setIsMastered(true);
    }
  }, [verse, isMastered, difficulty, initializeVerse]);

  // Handle keyboard input for Typing Mode
  useEffect(() => {
    if (inputMode !== InputMode.TYPE || !verse || isMastered || showSettings || showLibrary) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional keys
      if (e.key.length !== 1) return;

      const firstHiddenIdx = verse.words.findIndex(w => w.isHidden && !w.isRevealed);
      if (firstHiddenIdx === -1) return;

      const targetWord = verse.words[firstHiddenIdx];
      const typedChar = e.key.toLowerCase();
      const firstChar = targetWord.text.charAt(0);

      if (typedChar === firstChar) {
        handleRevealNext();
      } else {
        // Optional: shake effect on mistake
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputMode, verse, isMastered, showSettings, showLibrary, handleRevealNext]);

  const handleHint = () => {
    if (!verse) return;
    const firstHidden = verse.words.findIndex(w => w.isHidden && !w.isRevealed);
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
        reference: verse.reference,
        text: verse.text,
        version: version,
        timestamp: Date.now()
      };
      setFavorites([newFav, ...favorites]);
    }
  };

  const handleRemoveFavorite = (ref: string) => {
    setFavorites(favorites.filter(f => f.reference !== ref));
  };

  const totalWords = verse?.words.length || 0;
  const revealedCount = verse?.words.filter(w => !w.isHidden || w.isRevealed).length || 0;
  const progressPercent = totalWords > 0 ? (revealedCount / totalWords) * 100 : 0;
  const isCurrentFavorite = verse ? favorites.some(f => f.reference === verse.reference) : false;

  const nextHiddenIdx = verse?.words.findIndex(w => w.isHidden && !w.isRevealed);

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
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                onClick={handleToggleFavorite}
                className={`p-2 rounded-full transition-colors ${isCurrentFavorite ? 'text-amber-500' : 'text-paper-accent/30 hover:text-amber-500'}`}
               >
                <span className={`material-symbols-outlined text-2xl ${isCurrentFavorite ? 'fill-current' : ''}`}>
                  {isCurrentFavorite ? 'star' : 'star_outline'}
                </span>
               </button>
            </div>
            <p className="font-serif italic text-paper-accent text-lg flex items-center justify-center gap-2">
              {verse?.reference}
              <button 
                onClick={handleToggleFavorite}
                className={`transition-colors lg:hidden ${isCurrentFavorite ? 'text-amber-500' : 'text-paper-accent/30'}`}
              >
                <span className={`material-symbols-outlined text-xl align-middle ${isCurrentFavorite ? 'fill-current' : ''}`}>
                  {isCurrentFavorite ? 'star' : 'star_outline'}
                </span>
              </button>
            </p>
            <div className="h-px w-8 bg-paper-accent/30 mx-auto mt-1"></div>
          </div>

          <div className="relative w-full text-center">
            <h1 className="text-paper-ink text-[28px] md:text-[32px] leading-[1.6] font-serif transition-all px-2">
              {verse?.words.map((word, idx) => {
                const isWordHidden = word.isHidden && !word.isRevealed;
                const isNextToType = inputMode === InputMode.TYPE && idx === nextHiddenIdx;
                
                return (
                  <React.Fragment key={idx}>
                    {isWordHidden ? (
                      <span className={`pencil-underline relative group cursor-default select-none ${isNextToType ? 'after:!bg-paper-ink/40 after:!h-[4px]' : ''}`}>
                        {word.showHint ? (
                          <span className="absolute inset-0 flex items-center justify-center text-paper-accent/50 italic text-xl fade-in font-handwriting">
                            {word.text.charAt(0)}
                          </span>
                        ) : null}
                        {word.displayText}
                      </span>
                    ) : (
                      <span className="fade-in inline-block font-medium">{word.displayText}</span>
                    )}
                    {' '}
                  </React.Fragment>
                );
              })}
            </h1>
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
                  <button onClick={() => initializeVerse(verse!.reference, verse!.text, difficulty)} className="w-full h-full flex flex-col items-center justify-center uppercase font-sans font-bold text-[10px] tracking-widest text-paper-ink">
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
      />
    </div>
  );
};

export default App;
