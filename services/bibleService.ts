
const ESV_API_KEY = (import.meta as any).env?.VITE_ESV_API_KEY || "";
const ESV_API_URL = 'https://api.esv.org/v3/passage/text/';

export const BIBLE_VERSIONS = [
  { id: 'en-kjv', name: 'King James Version (KJV)' },
  { id: 'esv', name: 'English Standard Version (ESV)' },
  { id: 'en-asv', name: 'American Standard Version (ASV)' },
  { id: 'en-web', name: 'World English Bible (WEB)' },
  { id: 'en-bbe', name: 'Bible in Basic English (BBE)' },
  { id: 'en-drc', name: 'Douay-Rheims (DRC)' },
];

export const fetchVerseFromApi = async (version: string, reference: string) => {
  if (version === 'esv') {
    return fetchEsvVerse(reference);
  }

  // Simple regex to parse "Book Chapter:Verse" or "Number Book Chapter:Verse" or range
  // Supports hyphen, en-dash, and em-dash
  const regex = /^(.*?)\s*(\d+):(\d+)(?:[\-\u2013\u2014](\d+))?$/;
  const match = reference.trim().match(regex);

  if (!match) {
    throw new Error("Invalid format. Please use 'Book Chapter:Verse' (e.g. John 3:16) or 'Book Chapter:V1-V2'");
  }

  const bookName = match[1].trim();
  const book = bookName.toLowerCase().replace(/\s+/g, '-');
  const chapter = match[2];
  const verseStart = parseInt(match[3]);
  const verseEnd = match[4] ? parseInt(match[4]) : verseStart;

  // Fetch the whole chapter to extract a range of verses
  const url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${version}/books/${book}/chapters/${chapter}.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Verse not found. Check your reference and version.`);
  }

  const data = await response.json();
  const verses = data.data;

  if (!verses || !Array.isArray(verses)) {
    throw new Error("Failed to parse verses from API.");
  }

  // Filter verses in range and deduplicate
  const seenVerses = new Set<string>();
  const rangeVerses = verses.reduce((acc: any[], v: any) => {
    const vNum = parseInt(v.verse);
    if (vNum >= verseStart && vNum <= verseEnd && !seenVerses.has(v.verse)) {
      seenVerses.add(v.verse);
      acc.push(v);
    }
    return acc;
  }, []);

  if (rangeVerses.length === 0) {
    throw new Error("Specified verse range not found in this chapter.");
  }

  const combinedText = rangeVerses
    .map((v: any) => v.text.trim())
    .join(' ')
    .replace(/[¶§]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    reference: match[4] ? `${bookName} ${chapter}:${verseStart}-${verseEnd}` : `${bookName} ${chapter}:${verseStart}`,
    text: combinedText
  };
};

async function fetchEsvVerse(passage: string) {
  const params = new URLSearchParams({
    'q': passage,
    'include-headings': 'false',
    'include-footnotes': 'false',
    'include-verse-numbers': 'false',
    'include-short-copyright': 'false',
    'include-passage-references': 'false'
  });

  const response = await fetch(`${ESV_API_URL}?${params.toString()}`, {
    headers: {
      'Authorization': `Token ${ESV_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error("ESV API request failed. Check reference format.");
  }

  const data = await response.json();
  const passages = data.passages;

  if (passages && passages.length > 0) {
    return {
      reference: data.query, // ESV API returns the formatted query back
      text: passages[0].replace(/[¶§]/g, '').replace(/\s+/g, ' ').trim()
    };
  } else {
    throw new Error('Passage not found');
  }
}
