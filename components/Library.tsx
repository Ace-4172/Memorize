import React, { useState, useMemo, memo } from 'react';
import { FavoriteVerse } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  TouchSensor,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';

interface LibraryProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: FavoriteVerse[];
  onSelectVerse: (ref: string, text: string, version: string, label?: string) => void;
  onRemoveFavorite: (id: string) => void;
  onReorderFavorites: (newFavorites: FavoriteVerse[]) => void;
  onRenameFavorite: (id: string, newReference: string) => void;
}

interface SortableItemProps {
  fav: FavoriteVerse;
  onSelect: () => void;
  onRemove: () => void;
  onRename: (newName: string) => void;
  isOverlay?: boolean;
}

const VerseItem: React.FC<SortableItemProps & { attributes?: any, listeners?: any, isDragging?: boolean }> = ({
  fav, onSelect, onRemove, onRename, attributes, listeners, isDragging, isOverlay
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(fav.label || fav.reference);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editValue.trim()) {
      onRename(editValue.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className={`relative flex items-center gap-2 group ${isDragging ? 'opacity-30' : ''} ${isOverlay ? 'z-50' : ''}`}>
      {/* Drag Handle */}
      <div
        {...(attributes || {})}
        {...(listeners || {})}
        className="cursor-grab active:cursor-grabbing p-2 text-paper-accent/30 hover:text-paper-accent transition-colors select-none touch-none"
      >
        <span className="material-symbols-outlined text-xl">drag_indicator</span>
      </div>

      <div className={`flex-1 relative ${isDragging ? 'select-none' : ''}`}>
        {isEditing ? (
          <form onSubmit={handleRenameSubmit} className="w-full">
            <input
              autoFocus
              className="w-full bg-paper-bg border border-paper-accent/30 rounded-xl p-4 shadow-inner font-sans font-bold text-[11px] uppercase tracking-wider text-paper-ink focus:outline-none focus:border-paper-accent"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleRenameSubmit}
            />
          </form>
        ) : (
          <button
            onClick={onSelect}
            className={`w-full text-left bg-paper-bg border border-paper-line rounded-xl p-4 shadow-sm hover:shadow-md hover:border-paper-accent/30 transition-all active:scale-[0.98] select-none ${isOverlay ? 'shadow-xl border-paper-accent/40' : ''}`}
          >
            <div className="flex justify-between items-start mb-2 pointer-events-none">
              <span className="font-sans font-bold text-[11px] uppercase tracking-wider text-paper-ink">
                {fav.label || fav.reference}
              </span>
              <span className="font-sans text-[9px] uppercase font-medium text-paper-accent/60">
                {fav.version.split(' ').map(w => w[0]).join('')}
              </span>
            </div>
            <p className="font-serif italic text-xs text-paper-accent line-clamp-2 leading-relaxed pointer-events-none">
              "{fav.text}"
            </p>
          </button>
        )}

        {/* Edit Button */}
        {!isEditing && !isOverlay && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="absolute top-2 right-8 size-6 bg-paper-bg border border-paper-line rounded-full flex items-center justify-center text-paper-accent/40 hover:text-paper-ink shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
        )}

        {/* Remove Button */}
        {!isOverlay && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-2 -right-2 size-6 bg-paper-bg border border-paper-line rounded-full flex items-center justify-center text-paper-accent/40 hover:text-red-500 hover:border-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>
    </div>
  );
};

const SortableItem = memo(({ fav, onSelect, onRemove, onRename }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fav.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <VerseItem
        fav={fav}
        onSelect={onSelect}
        onRemove={onRemove}
        onRename={onRename}
        attributes={attributes}
        listeners={listeners}
        isDragging={isDragging}
      />
    </div>
  );
});

const Library: React.FC<LibraryProps> = ({
  isOpen,
  onClose,
  favorites,
  onSelectVerse,
  onRemoveFavorite,
  onReorderFavorites,
  onRenameFavorite
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeFavorite = useMemo(
    () => favorites.find((f) => f.id === activeId),
    [favorites, activeId]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = favorites.findIndex((f) => f.id === active.id);
      const newIndex = favorites.findIndex((f) => f.id === over.id);
      onReorderFavorites(arrayMove(favorites, oldIndex, newIndex));
    }
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

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

        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {favorites.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
              <span className="material-symbols-outlined text-4xl mb-2">auto_stories</span>
              <p className="font-serif italic text-sm">Your library is empty. Save verses by tapping the star icon on the main screen.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            >
              <SortableContext
                items={favorites.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 gap-3">
                  {favorites.map((fav) => (
                    <SortableItem
                      key={fav.id}
                      fav={fav}
                      onSelect={() => onSelectVerse(fav.reference, fav.text, fav.version, fav.label)}
                      onRemove={() => onRemoveFavorite(fav.id)}
                      onRename={(newName) => onRenameFavorite(fav.id, newName)}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                  styles: {
                    active: {
                      opacity: '0.4',
                    },
                  },
                }),
              }}>
                {activeFavorite ? (
                  <VerseItem
                    fav={activeFavorite}
                    onSelect={() => { }}
                    onRemove={() => { }}
                    onRename={() => { }}
                    isOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
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
