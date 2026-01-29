
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

  // Simple regex to parse "Book Chapter:Verse" or "Number Book Chapter:Verse"
  const regex = /^(\d?\s?[a-zA-Z\s]+)\s(\d+):(\d+)$/;
  const match = reference.trim().match(regex);

  if (!match) {
    throw new Error("Invalid format. Please use 'Book Chapter:Verse' (e.g. John 3:16)");
  }

  let book = match[1].trim().toLowerCase().replace(/\s+/g, '-');
  const chapter = match[2];
  const verse = match[3];

  const url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${version}/books/${book}/chapters/${chapter}/verses/${verse}.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Verse not found. Check your reference and version.`);
  }

  const data = await response.json();
  return {
    reference: `${match[1]} ${chapter}:${verse}`,
    text: data.text.trim()
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
      text: passages[0].trim()
    };
  } else {
    throw new Error('Passage not found');
  }
}
