import { Button } from '@/components/ui/button';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useMessageBookmarks } from '@/hooks/useMessageBookmarks';

interface MessageBookmarkButtonProps {
  messageId: string;
  userId: string;
}

export const MessageBookmarkButton = ({ messageId, userId }: MessageBookmarkButtonProps) => {
  const { isBookmarked, addBookmark, removeBookmark } = useMessageBookmarks(userId);
  const bookmarked = isBookmarked(messageId);

  const handleToggle = async () => {
    if (bookmarked) {
      await removeBookmark(messageId);
    } else {
      await addBookmark(messageId);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={handleToggle}
    >
      {bookmarked ? (
        <>
          <BookmarkCheck className="h-3 w-3 mr-1 fill-current" />
          Bookmarked
        </>
      ) : (
        <>
          <Bookmark className="h-3 w-3 mr-1" />
          Bookmark
        </>
      )}
    </Button>
  );
};
