import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Phone, PhoneOff, Volume2, VolumeX, User, Clock } from 'lucide-react';

interface ActiveCall {
  id: string;
  chatId: string;
  contactName?: string;
  phoneNumber?: string;
  startedAt: Date;
  duration: number;
  status: 'active' | 'ended' | 'transferred';
}

interface CallMonitorProps {
  className?: string;
}

export const CallMonitor: React.FC<CallMonitorProps> = ({ className }) => {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<ActiveCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveCalls();
    const interval = setInterval(loadActiveCalls, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveCalls = async () => {
    try {
      const result = await window.electronAPI.calls.getActive();
      if (result.success) {
        setActiveCalls(result.calls.map((call: any) => ({
          ...call,
          startedAt: new Date(call.started_at),
        })));
        if (!selectedCall && result.calls.length > 0) {
          setSelectedCall(result.calls[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load active calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const endCall = async (callId: string) => {
    try {
      await window.electronAPI.calls.update(callId, {
        status: 'ended',
        endedAt: new Date(),
      });
      loadActiveCalls();
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      case 'transferred':
        return <Badge variant="outline">Transferred</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading calls...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Phone className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Active Calls</h2>
        </div>
        <Badge variant="outline">{activeCalls.length} active</Badge>
      </div>

      {activeCalls.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PhoneOff className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No active calls</p>
              <p className="text-sm">Incoming calls will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeCalls.map((call) => (
            <Card
              key={call.id}
              className={`transition-all ${
                selectedCall?.id === call.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedCall(call)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {call.contactName || call.phoneNumber || 'Unknown'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(call.duration)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(call.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Chat ID: {call.chatId}</p>
                    {call.phoneNumber && <p>Phone: {call.phoneNumber}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsMuted(!isMuted)}
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => endCall(call.id)}
                      title="End call"
                    >
                      <PhoneOff className="h-4 w-4" />
                    </Button>
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
