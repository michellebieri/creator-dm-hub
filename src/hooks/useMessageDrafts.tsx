import { useState, useEffect, useCallback } from 'react';

const DRAFT_KEY_PREFIX = 'message_draft_';
const AUTOSAVE_DELAY = 1000; // 1 second

interface Draft {
  content: string;
  timestamp: number;
}

export const useMessageDrafts = (conversationId: string | null, userId: string | null) => {
  const [draft, setDraft] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const getDraftKey = useCallback(() => {
    if (!conversationId || !userId) return null;
    return `${DRAFT_KEY_PREFIX}${userId}_${conversationId}`;
  }, [conversationId, userId]);

  // Load draft when conversation changes
  useEffect(() => {
    const key = getDraftKey();
    if (!key) return;

    try {
      const savedDraft = localStorage.getItem(key);
      if (savedDraft) {
        const parsed: Draft = JSON.parse(savedDraft);
        // Only load drafts less than 7 days old
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (parsed.timestamp > sevenDaysAgo) {
          setDraft(parsed.content);
          setLastSaved(parsed.timestamp);
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [getDraftKey]);

  // Auto-save draft
  useEffect(() => {
    const key = getDraftKey();
    if (!key || !draft) return;

    const timeoutId = setTimeout(() => {
      try {
        const draftData: Draft = {
          content: draft,
          timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(draftData));
        setLastSaved(Date.now());
      } catch (error) {
        console.error('Error saving draft:', error);
      }
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [draft, getDraftKey]);

  const saveDraft = useCallback((content: string) => {
    setDraft(content);
  }, []);

  const clearDraft = useCallback(() => {
    const key = getDraftKey();
    if (key) {
      localStorage.removeItem(key);
      setDraft('');
      setLastSaved(null);
    }
  }, [getDraftKey]);

  const clearAllDrafts = useCallback(() => {
    if (!userId) return;
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`${DRAFT_KEY_PREFIX}${userId}_`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing drafts:', error);
    }
  }, [userId]);

  return {
    draft,
    saveDraft,
    clearDraft,
    clearAllDrafts,
    lastSaved,
    hasDraft: draft.length > 0,
  };
};
