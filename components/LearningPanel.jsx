import { useEffect, useMemo, useRef, useState } from 'react';
import { getAlignedTranslationLines } from '../utils/translationAlignment';

const STORAGE_KEY = 'translation_program_learning_cards_v1';
const STATUS_OPTIONS = ['new', 'reviewing', 'mastered'];
const LABELS = {
  currentCards: '\u5f53\u524d\u5b66\u4e60\u5361\u7247',
  saveAll: '\u5168\u90e8\u4fdd\u5b58',
  noCards: '\u4e0a\u4f20\u56fe\u7247\u6216\u5b8c\u6210\u4e00\u6b21\u8bed\u97f3\u8bc6\u522b\u540e\uff0c\u8fd9\u91cc\u4f1a\u81ea\u52a8\u751f\u6210\u53ef\u6536\u85cf\u7684\u5b66\u4e60\u5361\u7247\u3002',
  imageCards: '\u56fe\u50cf\u8bc6\u522b\u5361\u7247',
  speechCards: '\u8bed\u97f3\u8bc6\u522b\u5361\u7247',
  imageDescription: '\u9002\u5408\u83dc\u5355\u3001\u8def\u724c\u3001\u5546\u54c1\u6807\u7b7e\u7b49\u89c6\u89c9\u573a\u666f\u3002',
  speechDescription: '\u9002\u5408\u8bfe\u5802\u8868\u8fbe\u3001\u65e5\u5e38\u5bf9\u8bdd\u548c\u5373\u65f6\u53e3\u8bed\u7ec3\u4e60\u3002',
  notesOnSaveHint: '\u70b9\u51fb\u6536\u85cf\u540e\u518d\u751f\u6210\u62fc\u97f3\u548c\u5173\u952e\u8bcd\uff0c\u51cf\u5c11\u989d\u5916\u8bf7\u6c42\u3002',
  save: '\u6536\u85cf',
  saved: '\u5df2\u6536\u85cf',
  sourceImage: 'Image OCR / \u56fe\u50cf\u8bc6\u522b',
  sourceSpeech: 'Speech ASR / \u8bed\u97f3\u8bc6\u522b',
  speechInput: 'Speech input / \u8bed\u97f3\u8f93\u5165',
  savedDeck: '\u6536\u85cf\u5b66\u4e60\u5361\u7247',
  noSavedCards: '\u8fd8\u6ca1\u6709\u6536\u85cf\u5361\u7247\u3002\u4f60\u53ef\u4ee5\u628a\u56fe\u50cf\u8bc6\u522b\u7ed3\u679c\u548c\u8bed\u97f3\u8bc6\u522b\u7ed3\u679c\u4e00\u8d77\u6c89\u6dc0\u6210\u5b66\u4e60\u8bcd\u5361\u3002',
  total: '\u603b\u6570',
  newWord: '\u65b0\u8bcd',
  reviewing: '\u590d\u4e60\u4e2d',
  mastered: '\u5df2\u638c\u63e1',
  remove: '\u5220\u9664',
  translationUnavailable: 'Translation unavailable / \u6682\u65e0\u8bd1\u6587',
  pinyin: 'Pinyin / \u62fc\u97f3',
  keywords: 'Keywords / \u5173\u952e\u8bcd\u89e3\u91ca',
  loadingNotes: '\u6b63\u5728\u751f\u6210\u62fc\u97f3\u548c\u5173\u952e\u8bcd...',
  showEnglish: '\u663e\u793a\u82f1\u6587',
  hideEnglish: '\u9690\u85cf\u82f1\u6587',
  showPinyin: '\u663e\u793a\u62fc\u97f3',
  hidePinyin: '\u9690\u85cf\u62fc\u97f3',
  showKeywords: '\u663e\u793a\u5173\u952e\u8bcd\u89e3\u91ca',
  hideKeywords: '\u9690\u85cf\u5173\u952e\u8bcd\u89e3\u91ca',
  reviewMode: 'Review Mode / \u590d\u4e60\u6a21\u5f0f',
  reviewHint: '\u5148\u5c1d\u8bd5\u81ea\u5df1\u56de\u5fc6\u8bd1\u6587\u3001\u62fc\u97f3\u548c\u5173\u952e\u8bcd\uff0c\u518d\u9010\u4e2a\u6253\u5f00\u63d0\u793a\u3002',
};

function formatQuadrant(quadrant) {
  const labels = {
    'top-left': 'Upper Left',
    'top-right': 'Upper Right',
    'bottom-left': 'Lower Left',
    'bottom-right': 'Lower Right',
  };

  return labels[quadrant] || 'Unassigned';
}

function normalizeKeyword(keyword) {
  if (!keyword) return null;

  if (typeof keyword === 'string') {
    const text = keyword.trim();
    if (!text) return null;
    return { term: text, explanation: '' };
  }

  const term = String(keyword.term || '').trim();
  const explanation = String(keyword.explanation || '').trim();

  if (!term && !explanation) return null;

  return { term, explanation };
}

function normalizeCard(card) {
  return {
    ...card,
    pinyin: String(card.pinyin || '').trim(),
    keywords: Array.isArray(card.keywords) ? card.keywords.map(normalizeKeyword).filter(Boolean) : [],
  };
}

function buildCardId(sourceType, chinese, english) {
  return `${sourceType}__${String(chinese || '').trim()}__${String(english || '').trim()}`;
}

function buildFallbackEnglish(text) {
  return String(text || '').trim() || LABELS.translationUnavailable;
}

function getImageCards(result) {
  const sourceBlocks =
    result?.render_mode === 'full_translation' && result?.keyword_display_items?.length
      ? result.keyword_display_items.map((item, index) => ({
          ...item,
          text: item.term || item.text,
          displayIndex: item.displayIndex || index + 1,
          displayLabel: item.displayLabel || `Keyword ${index + 1}`,
        }))
      : result?.display_blocks?.length
        ? result.display_blocks
        : result?.text_blocks;
  if (!sourceBlocks?.length) return [];

  const translatedLines = String(result.translated_text || '')
    ? getAlignedTranslationLines(
        result?.render_mode === 'full_translation' && result?.keyword_display_items?.length
          ? result.keyword_display_items.map((item) => item.translation || '')
          : result.translation_lines?.length
            ? result.translation_lines
            : result.translated_text,
        sourceBlocks.length
      )
    : [];

  return sourceBlocks
    .map((block, index) => {
      const chinese = String(block.text || '').trim();
      const english = String(translatedLines[index] || '').trim();

      if (!chinese && !english) return null;

      return normalizeCard({
        id: buildCardId('image', chinese, english),
        displayIndex: index + 1,
        chinese,
        english: buildFallbackEnglish(english),
        quadrant: block.quadrant,
        locationLabel: block.displayLabel || '',
        sourceType: 'image',
        sourceLabel: LABELS.sourceImage,
      });
    })
    .filter(Boolean);
}

function splitSpeechIntoSegments(text) {
  const normalized = String(text || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return [];

  const sentenceParts = normalized
    .split(/[\u3002\uff01\uff1f!?;\uff1b]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return sentenceParts.length > 1 ? sentenceParts : [normalized];
}

function splitEnglishIntoSegments(text) {
  return String(text || '')
    .replace(/\r?\n/g, ' ')
    .split(/[.!?;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getSpeechCards(result) {
  if (!result?.original_text) return [];

  const chineseSegments = splitSpeechIntoSegments(result.original_text);
  const translationSource = result.translation_lines?.some((line) => String(line || '').trim())
    ? result.translation_lines
    : splitEnglishIntoSegments(result.translated_text);
  const englishSegments = getAlignedTranslationLines(translationSource, chineseSegments.length || 1);

  return chineseSegments.map((segment, index) =>
    normalizeCard({
      id: buildCardId('speech', segment, englishSegments[index]),
      displayIndex: index + 1,
      chinese: segment,
      english: buildFallbackEnglish(englishSegments[index]),
      quadrant: '',
      sourceType: 'speech',
      sourceLabel: LABELS.sourceSpeech,
    })
  );
}

function getStatusCount(cards, status) {
  return cards.filter((card) => card.status === status).length;
}

function renderLocation(card) {
  if (card.sourceType === 'speech') {
    return LABELS.speechInput;
  }

  if (card.locationLabel) {
    return card.locationLabel;
  }

  return formatQuadrant(card.quadrant);
}

function renderStatusLabel(status) {
  if (status === 'new') return `new / ${LABELS.newWord}`;
  if (status === 'reviewing') return `reviewing / ${LABELS.reviewing}`;
  return `mastered / ${LABELS.mastered}`;
}

function buildLearningNoteMap(cards) {
  return cards.reduce((accumulator, card) => {
    if (!card?.chinese) return accumulator;

    if (card.pinyin || (Array.isArray(card.keywords) && card.keywords.length > 0)) {
      accumulator[card.chinese] = {
        pinyin: String(card.pinyin || '').trim(),
        keywords: Array.isArray(card.keywords) ? card.keywords.map(normalizeKeyword).filter(Boolean) : [],
      };
    }

    return accumulator;
  }, {});
}

function mergeCardWithNote(card, note) {
  return normalizeCard({
    ...card,
    pinyin: note?.pinyin || card.pinyin || '',
    keywords: note?.keywords?.length ? note.keywords : card.keywords || [],
  });
}

function ToggleChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        borderRadius: '999px',
        padding: '7px 12px',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: '12px',
        backgroundColor: active ? '#0f766e' : '#e2e8f0',
        color: active ? '#ffffff' : '#334155',
      }}
    >
      {label}
    </button>
  );
}

function NoteSection({ card, loading, showPinyin, showKeywords }) {
  const hasPinyin = Boolean(card.pinyin);
  const hasKeywords = Array.isArray(card.keywords) && card.keywords.length > 0;

  if (!loading && (!showPinyin || !hasPinyin) && (!showKeywords || !hasKeywords)) return null;

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '12px',
        borderRadius: '14px',
        backgroundColor: '#fff9ec',
        border: '1px solid #f3dfb2',
      }}
    >
      {loading && !hasPinyin && !hasKeywords && (
        <div style={{ fontSize: '12px', color: '#9a6a2a', fontWeight: 700 }}>
          {LABELS.loadingNotes}
        </div>
      )}

      {showPinyin && hasPinyin && (
        <div style={{ marginBottom: hasKeywords ? '10px' : 0 }}>
          <div style={{ fontSize: '11px', color: '#a16207', fontWeight: 800 }}>{LABELS.pinyin}</div>
          <div style={{ marginTop: '4px', color: '#7c3f00', fontSize: '14px', lineHeight: '1.5' }}>{card.pinyin}</div>
        </div>
      )}

      {showKeywords && hasKeywords && (
        <div>
          <div style={{ fontSize: '11px', color: '#a16207', fontWeight: 800 }}>{LABELS.keywords}</div>
          <div style={{ marginTop: '6px', display: 'grid', gap: '8px' }}>
            {card.keywords.map((keyword, index) => (
              <div
                key={`${card.id}-keyword-${index}`}
                style={{
                  padding: '8px 10px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ecd7aa',
                }}
              >
                <div style={{ fontWeight: 800, color: '#7c3f00', fontSize: '13px' }}>{keyword.term}</div>
                {keyword.explanation && (
                  <div style={{ marginTop: '3px', color: '#6b7280', fontSize: '13px', lineHeight: '1.5' }}>
                    {keyword.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CurrentCardSection({
  title,
  subtitle,
  description,
  hint,
  cards,
  onToggleSave,
  isSaved,
  loadingNotesByText,
  showEnglish,
  showPinyin,
  showKeywords,
  reviewMode,
}) {
  if (!cards.length) return null;

  return (
    <div style={{ marginTop: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 800, color: '#7c3f00' }}>{title}</div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#a16207', fontWeight: 700 }}>{subtitle}</div>
          <div style={{ marginTop: '6px', color: '#8b5e34', lineHeight: '1.5', fontSize: '14px' }}>
            {description}
          </div>
          {hint && (
            <div style={{ marginTop: '6px', color: '#9a6a2a', lineHeight: '1.5', fontSize: '12px', fontWeight: 700 }}>
              {hint}
            </div>
          )}
        </div>
        <div
          style={{
            padding: '6px 10px',
            borderRadius: '999px',
            backgroundColor: '#fff3d6',
            color: '#8b5e34',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {cards.length} cards
        </div>
      </div>

      <div
        style={{
          marginTop: '14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        {cards.map((card) => (
          <article
            key={card.id}
            style={{
              backgroundColor: reviewMode ? '#fff8eb' : '#ffffff',
              border: reviewMode ? '1.5px solid #d97706' : '1px solid #f3d9aa',
              borderRadius: '18px',
              padding: '16px',
              boxShadow: reviewMode ? '0 12px 28px rgba(217, 119, 6, 0.12)' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ display: 'grid', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#8b5e34',
                    backgroundColor: '#fff3d6',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    width: 'fit-content',
                  }}
                >
                  {`#${card.displayIndex} - ${renderLocation(card)}`}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0f766e',
                    backgroundColor: '#ccfbf1',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    width: 'fit-content',
                  }}
                >
                  {card.sourceLabel}
                </span>
                {reviewMode && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#ffffff',
                      backgroundColor: '#b45309',
                      padding: '4px 8px',
                      borderRadius: '999px',
                      width: 'fit-content',
                    }}
                  >
                    {LABELS.reviewMode}
                  </span>
                )}
              </div>

              <button
                onClick={() => onToggleSave(card)}
                style={{
                  border: 'none',
                  backgroundColor: isSaved(card.id) ? '#14532d' : '#d97706',
                  color: '#ffffff',
                  borderRadius: '999px',
                  padding: '6px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isSaved(card.id) ? LABELS.saved : LABELS.save}
              </button>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div
                style={{
                  fontSize: reviewMode ? '26px' : '22px',
                  fontWeight: 800,
                  color: reviewMode ? '#7c2d12' : '#111827',
                  lineHeight: '1.35',
                  letterSpacing: reviewMode ? '0.3px' : 'normal',
                }}
              >
                {card.chinese}
              </div>
              {reviewMode && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff',
                    border: '1px dashed #f0b35f',
                    color: '#9a3412',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    fontWeight: 700,
                  }}
                >
                  {LABELS.reviewHint}
                </div>
              )}
              {showEnglish && (
                <div style={{ marginTop: '8px', fontSize: '14px', lineHeight: '1.6', color: '#475569' }}>
                  {card.english}
                </div>
              )}
            </div>

            <NoteSection
              card={card}
              loading={Boolean(loadingNotesByText[card.chinese])}
              showPinyin={showPinyin}
              showKeywords={showKeywords}
            />
          </article>
        ))}
      </div>
    </div>
  );
}

export default function LearningPanel({ imageResult, speechResult }) {
  const [savedCards, setSavedCards] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [learningNotesByText, setLearningNotesByText] = useState({});
  const [loadingNotesByText, setLoadingNotesByText] = useState({});
  const [showEnglish, setShowEnglish] = useState(true);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showKeywords, setShowKeywords] = useState(true);
  const mountedRef = useRef(true);
  const pendingTextsRef = useRef(new Set());

  const imageCards = useMemo(() => getImageCards(imageResult), [imageResult]);
  const speechCards = useMemo(() => getSpeechCards(speechResult), [speechResult]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalizedCards = parsed.map((card) => normalizeCard({
            sourceType: card.sourceType || 'image',
            sourceLabel: card.sourceLabel || (card.sourceType === 'speech' ? LABELS.sourceSpeech : LABELS.sourceImage),
            ...card,
          }));
          setSavedCards(normalizedCards);
          setLearningNotesByText((previous) => ({
            ...previous,
            ...buildLearningNoteMap(normalizedCards),
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load learning cards', error);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCards));
  }, [savedCards, hasLoaded]);

  const enrichCard = (card) => mergeCardWithNote(card, learningNotesByText[card.chinese]);

  const enrichedImageCards = useMemo(
    () => imageCards.map(enrichCard),
    [imageCards, learningNotesByText]
  );
  const enrichedSpeechCards = useMemo(
    () => speechCards.map(enrichCard),
    [speechCards, learningNotesByText]
  );
  const enrichedSavedCards = useMemo(
    () => savedCards.map(enrichCard),
    [savedCards, learningNotesByText]
  );
  const currentCards = useMemo(
    () => [...enrichedImageCards, ...enrichedSpeechCards],
    [enrichedImageCards, enrichedSpeechCards]
  );
  const reviewMode = !showEnglish && !showPinyin && !showKeywords;

  useEffect(() => {
    const noteCandidates = savedCards
      .map((card) => String(card.chinese || '').trim())
      .filter(Boolean);
    const uniqueTexts = [...new Set(noteCandidates)];
    const missingTexts = uniqueTexts.filter(
      (text) => !learningNotesByText[text] && !pendingTextsRef.current.has(text)
    );

    if (!missingTexts.length) return;
    missingTexts.forEach((text) => {
      pendingTextsRef.current.add(text);
    });

    setLoadingNotesByText((previous) => {
      const next = { ...previous };
      missingTexts.forEach((text) => {
        next[text] = true;
      });
      return next;
    });

    fetch('/api/generate-learning-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts: missingTexts }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!mountedRef.current || !data.success || !Array.isArray(data.notes)) return;

        const noteMap = data.notes.reduce((accumulator, note) => {
          const text = String(note.text || '').trim();
          if (!text) return accumulator;

          accumulator[text] = {
            pinyin: String(note.pinyin || '').trim(),
            keywords: Array.isArray(note.keywords) ? note.keywords.map(normalizeKeyword).filter(Boolean) : [],
          };
          return accumulator;
        }, {});

        missingTexts.forEach((text) => {
          if (!noteMap[text]) {
            noteMap[text] = {
              pinyin: '',
              keywords: [],
            };
          }
        });

        setLearningNotesByText((previous) => ({
          ...previous,
          ...noteMap,
        }));
      })
      .catch((error) => {
        console.error('Failed to generate learning notes', error);
        if (!mountedRef.current) return;

        const emptyNoteMap = missingTexts.reduce((accumulator, text) => {
          accumulator[text] = {
            pinyin: '',
            keywords: [],
          };
          return accumulator;
        }, {});

        setLearningNotesByText((previous) => ({
          ...previous,
          ...emptyNoteMap,
        }));
      })
      .finally(() => {
        missingTexts.forEach((text) => {
          pendingTextsRef.current.delete(text);
        });

        if (!mountedRef.current) return;

        setLoadingNotesByText((previous) => {
          const next = { ...previous };
          missingTexts.forEach((text) => {
            delete next[text];
          });
          return next;
        });
      });
  }, [savedCards, learningNotesByText]);

  useEffect(() => {
    if (!hasLoaded) return;

    setSavedCards((previousCards) => {
      let hasChanged = false;

      const nextCards = previousCards.map((card) => {
        const note = learningNotesByText[card.chinese];
        if (!note) return card;

        const nextCard = mergeCardWithNote(card, note);
        const keywordsChanged = JSON.stringify(nextCard.keywords) !== JSON.stringify(card.keywords || []);

        if (nextCard.pinyin !== card.pinyin || keywordsChanged) {
          hasChanged = true;
          return nextCard;
        }

        return card;
      });

      return hasChanged ? nextCards : previousCards;
    });
  }, [learningNotesByText, hasLoaded]);

  const isSaved = (cardId) => savedCards.some((card) => card.id === cardId);

  const toggleSaveCard = (card) => {
    const enrichedCard = enrichCard(card);

    setSavedCards((previousCards) => {
      const exists = previousCards.some((savedCard) => savedCard.id === enrichedCard.id);
      if (exists) {
        return previousCards.filter((savedCard) => savedCard.id !== enrichedCard.id);
      }

      return [
        {
          ...enrichedCard,
          status: 'new',
          savedAt: new Date().toISOString(),
        },
        ...previousCards,
      ];
    });
  };

  const saveAllCurrentCards = () => {
    if (!currentCards.length) return;

    setSavedCards((previousCards) => {
      const existingIds = new Set(previousCards.map((card) => card.id));
      const additions = currentCards
        .map(enrichCard)
        .filter((card) => !existingIds.has(card.id))
        .map((card) => ({
          ...card,
          status: 'new',
          savedAt: new Date().toISOString(),
        }));

      return additions.length ? [...additions, ...previousCards] : previousCards;
    });
  };

  const updateCardStatus = (cardId, status) => {
    setSavedCards((previousCards) =>
      previousCards.map((card) => (card.id === cardId ? { ...card, status } : card))
    );
  };

  const removeCard = (cardId) => {
    setSavedCards((previousCards) => previousCards.filter((card) => card.id !== cardId));
  };

  return (
    <section
      style={{
        marginTop: '28px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #fffdf7 0%, #fff7e8 100%)',
          border: '1px solid #f1d7a6',
          borderRadius: '22px',
          padding: '20px',
          boxShadow: '0 20px 40px rgba(148, 84, 24, 0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, color: '#7c3f00' }}>Current Learning Cards</h3>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#a16207', fontWeight: 700 }}>
              {LABELS.currentCards}
            </div>
            <p style={{ margin: '6px 0 0', color: '#8b5e34', lineHeight: '1.5' }}>
              Turn image OCR and speech recognition results into reusable study items for menus, signs,
              notices, and spoken Chinese.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <ToggleChip
              active={showEnglish}
              onClick={() => setShowEnglish((value) => !value)}
              label={showEnglish ? LABELS.hideEnglish : LABELS.showEnglish}
            />
            <ToggleChip
              active={showPinyin}
              onClick={() => setShowPinyin((value) => !value)}
              label={showPinyin ? LABELS.hidePinyin : LABELS.showPinyin}
            />
            <ToggleChip
              active={showKeywords}
              onClick={() => setShowKeywords((value) => !value)}
              label={showKeywords ? LABELS.hideKeywords : LABELS.showKeywords}
            />
            <button
              onClick={saveAllCurrentCards}
              disabled={!currentCards.length}
              style={{
                padding: '10px 14px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: currentCards.length ? '#d97706' : '#fcd9a4',
                color: currentCards.length ? '#ffffff' : '#9a6a2a',
                fontWeight: 700,
                cursor: currentCards.length ? 'pointer' : 'not-allowed',
                minWidth: '128px',
              }}
            >
              {LABELS.saveAll}
            </button>
          </div>
        </div>

        {!currentCards.length && (
          <div
            style={{
              marginTop: '18px',
              padding: '18px',
              borderRadius: '16px',
              backgroundColor: '#fffaf0',
              color: '#9a6a2a',
              border: '1px dashed #e8bb68',
            }}
          >
            {LABELS.noCards}
          </div>
        )}

        <CurrentCardSection
          title="Image Learning Cards"
          subtitle={LABELS.imageCards}
          description={LABELS.imageDescription}
          hint={LABELS.notesOnSaveHint}
          cards={enrichedImageCards}
          onToggleSave={toggleSaveCard}
          isSaved={isSaved}
          loadingNotesByText={loadingNotesByText}
          showEnglish={showEnglish}
          showPinyin={showPinyin}
          showKeywords={showKeywords}
          reviewMode={reviewMode}
        />

        <CurrentCardSection
          title="Speech Learning Cards"
          subtitle={LABELS.speechCards}
          description={LABELS.speechDescription}
          hint={LABELS.notesOnSaveHint}
          cards={enrichedSpeechCards}
          onToggleSave={toggleSaveCard}
          isSaved={isSaved}
          loadingNotesByText={loadingNotesByText}
          showEnglish={showEnglish}
          showPinyin={showPinyin}
          showKeywords={showKeywords}
          reviewMode={reviewMode}
        />
      </div>

      <div
        style={{
          background: 'linear-gradient(180deg, #f7fbff 0%, #eef6ff 100%)',
          border: '1px solid #cddff9',
          borderRadius: '22px',
          padding: '20px',
          boxShadow: '0 20px 40px rgba(37, 99, 235, 0.08)',
        }}
      >
        <div>
          <h3 style={{ margin: 0, color: '#0f3c79' }}>Saved Study Deck</h3>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>
            {LABELS.savedDeck}
          </div>
          <p style={{ margin: '6px 0 0', color: '#466690', lineHeight: '1.5' }}>
            Keep useful phrases after each scan or recording and track whether they are new, reviewing,
            or mastered.
          </p>
        </div>

        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '12px' }}>
            {`${LABELS.total} ${enrichedSavedCards.length}`}
          </span>
          <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#a16207', fontWeight: 700, fontSize: '12px' }}>
            {`${LABELS.newWord} ${getStatusCount(enrichedSavedCards, 'new')}`}
          </span>
          <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '12px' }}>
            {`${LABELS.reviewing} ${getStatusCount(enrichedSavedCards, 'reviewing')}`}
          </span>
          <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '12px' }}>
            {`${LABELS.mastered} ${getStatusCount(enrichedSavedCards, 'mastered')}`}
          </span>
        </div>

        {hasLoaded && enrichedSavedCards.length === 0 && (
          <div
            style={{
              marginTop: '18px',
              padding: '18px',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              color: '#5b7aa5',
              border: '1px dashed #b8cff5',
            }}
          >
            {LABELS.noSavedCards}
          </div>
        )}

        {enrichedSavedCards.length > 0 && (
          <div style={{ marginTop: '16px', display: 'grid', gap: '12px', maxHeight: '1120px', overflowY: 'auto', paddingRight: '4px' }}>
            {enrichedSavedCards.map((card) => (
              <article
                key={card.id}
                style={{
                  backgroundColor: reviewMode ? '#fefce8' : '#ffffff',
                  border: reviewMode ? '1.5px solid #ca8a04' : '1px solid #d9e7fb',
                  borderRadius: '16px',
                  padding: '14px',
                  boxShadow: reviewMode ? '0 12px 28px rgba(202, 138, 4, 0.10)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {`#${card.displayIndex}`}
                      </span>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          backgroundColor: card.sourceType === 'speech' ? '#dcfce7' : '#fef3c7',
                          color: card.sourceType === 'speech' ? '#166534' : '#a16207',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {card.sourceLabel}
                      </span>
                      {reviewMode && (
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '999px',
                            backgroundColor: '#854d0e',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 800,
                          }}
                        >
                          {LABELS.reviewMode}
                        </span>
                      )}
                      <div
                        style={{
                          fontSize: reviewMode ? '22px' : '19px',
                          fontWeight: 800,
                          color: reviewMode ? '#713f12' : '#0f172a',
                        }}
                      >
                        {card.chinese}
                      </div>
                    </div>
                    {reviewMode && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          backgroundColor: '#ffffff',
                          border: '1px dashed #eab308',
                          color: '#854d0e',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          fontWeight: 700,
                        }}
                      >
                        {LABELS.reviewHint}
                      </div>
                    )}
                    {showEnglish && (
                      <div style={{ marginTop: '6px', color: '#475569', lineHeight: '1.5', fontSize: '14px' }}>{card.english}</div>
                    )}
                    <NoteSection
                      card={card}
                      loading={Boolean(loadingNotesByText[card.chinese])}
                      showPinyin={showPinyin}
                      showKeywords={showKeywords}
                    />
                  </div>

                  <button
                    onClick={() => removeCard(card.id)}
                    style={{
                      border: 'none',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      borderRadius: '999px',
                      padding: '6px 10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {LABELS.remove}
                  </button>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span
                    style={{
                      padding: '5px 8px',
                      borderRadius: '999px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {renderLocation(card)}
                  </span>

                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      onClick={() => updateCardStatus(card.id, status)}
                      style={{
                        border: 'none',
                        borderRadius: '999px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '12px',
                        backgroundColor: card.status === status ? '#0f172a' : '#e2e8f0',
                        color: card.status === status ? '#ffffff' : '#334155',
                      }}
                    >
                      {renderStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
