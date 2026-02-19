import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { History, Phone, Clock, Calendar, Search } from 'lucide-react';

interface CallHistoryItem {
  id: string;
  chatId: string;
  contactName?: string;
  phoneNumber?: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  status: 'active' | 'ended' | 'transferred';
  messageCount?: number;
}

interface CallHistoryProps {
  className?: string;
  onSelectCall?: (callId: string) => void;
}

export const CallHistory: React.FC<CallHistoryProps> = ({ className, onSelectCall }) => {
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCallHistory();
  }, []);

  const loadCallHistory = async () => {
    try {
      const result = await window.electronAPI.calls.getRecent(50);
      if (result.success) {
        setCalls(result.calls.map((call: any) => ({
          ...call,
          startedAt: new Date(call.started_at),
          endedAt: call.ended_at ? new Date(call.ended_at) : undefined,
        })));
      }
    } catch (error) {
      console.error('Failed to load call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      case 'transferred':
        return <Badge variant="outline" className="border-orange-200 text-orange-600">Transferred</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredCalls = calls.filter(call => {
    const query = searchQuery.toLowerCase();
    return (
      call.contactName?.toLowerCase().includes(query) ||
      call.phoneNumber?.includes(query) ||
      call.chatId.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading call history...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Call History</h2>
        </div>
        <Badge variant="outline">{calls.length} calls</Badge>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search calls by name, phone, or chat ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background"
          />
        </div>
      </div>

      {filteredCalls.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {searchQuery ? 'No matching calls found' : 'No call history yet'}
              </p>
              <p className="text-sm">
                {searchQuery ? 'Try a different search term' : 'Completed calls will appear here'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCalls.map((call) => (
            <Card
              key={call.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelectCall?.(call.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">
                          {call.contactName || call.phoneNumber || 'Unknown'}
                        </h3>
                        {getStatusBadge(call.status)}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(call.startedAt)}</span>
                          <Clock className="h-3 w-3 ml-2" />
                          <span>{formatTime(call.startedAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>Duration: {formatDuration(call.duration)}</span>
                        </div>
                        {call.messageCount !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs">
                              {call.messageCount} message{call.messageCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
