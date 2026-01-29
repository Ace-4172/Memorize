
export interface VerseWord {
  text: string;
  displayText: string;
  isHidden: boolean;
  isRevealed: boolean;
  showHint: boolean;
}

export interface Verse {
  reference: string;
  text: string;
  words: VerseWord[];
}

export interface FavoriteVerse {
  reference: string;
  text: string;
  version: string;
  timestamp: number;
}

export enum Difficulty {
  NONE = 0.0,
  EASY = 0.2,
  MEDIUM = 0.5,
  HARD = 0.8,
  EXTREME = 1.0
}

export enum InputMode {
  REVEAL = 'REVEAL',
  TYPE = 'TYPE'
}
