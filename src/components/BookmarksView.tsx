import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Trash2, Edit2, MessageSquare, Search } from 'lucide-react';
import { useMessageBookmarks } from '@/hooks/useMessageBookmarks';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface BookmarksViewProps {
  userId: string;
}

export const BookmarksView = ({ userId }: BookmarksViewProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null);
  const { bookmarks, loading, removeBookmark, updateBookmarkNote } = useMessageBookmarks(userId);
  const navigate = useNavigate();

  const filteredBookmarks = bookmarks.filter(bookmark => {
    const searchLower = searchQuery.toLowerCase();
    return (
      bookmark.message.content.toLowerCase().includes(searchLower) ||
      bookmark.note?.toLowerCase().includes(searchLower) ||
      bookmark.message.sender.display_name.toLowerCase().includes(searchLower)
    );
  });

  const handleGoToMessage = (bookmark: any) => {
    const otherUserId = bookmark.message.conversation.creator_id === userId
      ? bookmark.message.conversation.customer_id
      : bookmark.message.conversation.creator_id;
    
    setOpen(false);
    navigate(`/messages?creator=${otherUserId}`);
  };

  const handleSaveNote = async () => {
    if (!editingNote) return;
    
    const success = await updateBookmarkNote(editingNote.id, editingNote.note);
    if (success) {
      setEditingNote(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bookmark className="h-4 w-4 mr-2" />
          Bookmarks
          {bookmarks.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {bookmarks.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bookmarked Messages</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Bookmarks List */}
          <ScrollArea className="max-h-[500px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading bookmarks...
              </div>
            ) : filteredBookmarks.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No bookmarks found' : 'No bookmarks yet'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? 'Try adjusting your search' : 'Bookmark important messages to find them quickly'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookmarks.map((bookmark) => (
                  <Card
                    key={bookmark.id}
                    className="p-4 hover:bg-accent transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Message Header */}
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={bookmark.message.sender.avatar_url || undefined} />
                          <AvatarFallback>
                            {bookmark.message.sender.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">
                              {bookmark.message.sender.display_name}
                            </p>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleGoToMessage(bookmark)}
                                title="Go to message"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeBookmark(bookmark.message_id)}
                                title="Remove bookmark"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {bookmark.message.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(bookmark.message.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {/* Note Section */}
                      {editingNote?.id === bookmark.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingNote.note}
                            onChange={(e) => setEditingNote({ ...editingNote, note: e.target.value })}
                            placeholder="Add a note about this message..."
                            className="min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveNote}>
                              Save Note
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingNote(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : bookmark.note ? (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-muted-foreground flex-1">
                              {bookmark.note}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingNote({ id: bookmark.id, note: bookmark.note || '' })}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setEditingNote({ id: bookmark.id, note: '' })}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Add Note
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
