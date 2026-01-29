
import React from 'react';
import { FavoriteVerse } from '../types';

interface LibraryProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: FavoriteVerse[];
  onSelectVerse: (ref: string, text: string, version: string) => void;
  onRemoveFavorite: (ref: string) => void;
}

const Library: React.FC<LibraryProps> = ({ 
  isOpen, 
  onClose, 
  favorites, 
  onSelectVerse, 
  onRemoveFavorite 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-start">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-paper-ink/10 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-[320px] h-full bg-paper-bg paper-texture shadow-2xl border-r border-paper-line flex flex-col animate-slide-in">
        <div className="p-6 border-b border-paper-line flex justify-between items-center">
          <h3 className="font-sans font-bold uppercase tracking-widest text-sm text-paper-accent">My Library</h3>
          <button onClick={onClose} className="p-2 hover:bg-paper-accent/10 rounded-full transition-colors">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {favorites.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
              <span className="material-symbols-outlined text-4xl mb-2">auto_stories</span>
              <p className="font-serif italic text-sm">Your library is empty. Save verses by tapping the star icon on the main screen.</p>
            </div>
          ) : (
            favorites.map((fav, idx) => (
              <div key={idx} className="relative group">
                <button 
                  onClick={() => onSelectVerse(fav.reference, fav.text, fav.version)}
                  className="w-full text-left bg-white/50 border border-paper-line rounded-xl p-4 shadow-sm hover:shadow-md hover:border-paper-accent/30 transition-all active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-sans font-bold text-[11px] uppercase tracking-wider text-paper-ink">
                      {fav.reference}
                    </span>
                    <span className="font-sans text-[9px] uppercase font-medium text-paper-accent/60">
                      {fav.version.split(' ').map(w => w[0]).join('')}
                    </span>
                  </div>
                  <p className="font-serif italic text-xs text-paper-accent line-clamp-2 leading-relaxed">
                    "{fav.text}"
                  </p>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemoveFavorite(fav.reference); }}
                  className="absolute -top-2 -right-2 size-6 bg-white border border-paper-line rounded-full flex items-center justify-center text-paper-accent/40 hover:text-red-500 hover:border-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-paper-line/20 border-t border-paper-line">
          <p className="font-sans text-[10px] text-center text-paper-accent/60 uppercase tracking-widest">
            {favorites.length} {favorites.length === 1 ? 'Verse' : 'Verses'} Saved
          </p>
        </div>
      </div>
    </div>
  );
};

export default Library;
