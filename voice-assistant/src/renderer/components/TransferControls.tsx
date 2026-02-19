import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, Users, RotateCcw, MessageSquare, X } from 'lucide-react';

interface TakeoverState {
  isActive: boolean;
  trigger?: string;
  reason?: string;
  triggeredAt?: number;
  triggerCount: number;
}

interface TransferControlsProps {
  className?: string;
}

export const TransferControls: React.FC<TransferControlsProps> = ({ className }) => {
  const [takeoverState, setTakeoverState] = useState<TakeoverState>({
    isActive: false,
    triggerCount: 0,
  });
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTakeoverState();
    const interval = setInterval(loadTakeoverState, 2000);
    return () => clearInterval(interval);
  }, []);

  // Listen for takeover events
  useEffect(() => {
    const unsubscribe = window.electronAPI.voiceLoop.onHumanTakeover((data) => {
      setTakeoverState(prev => ({
        ...prev,
        isActive: true,
        trigger: data.trigger,
        reason: data.reason,
        triggeredAt: Date.now(),
        triggerCount: prev.triggerCount + 1,
      }));
    });

    return () => unsubscribe();
  }, []);

  const loadTakeoverState = async () => {
    try {
      const result = await window.electronAPI.voiceLoop.getTakeoverState();
      if (result.success) {
        setTakeoverState(result.takeoverState);
      }
    } catch (error) {
      console.error('Failed to load takeover state:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerTakeover = async (trigger: string, reason: string) => {
    try {
      await window.electronAPI.voiceLoop.triggerTakeover(trigger, reason);
      loadTakeoverState();
    } catch (error) {
      console.error('Failed to trigger takeover:', error);
    }
  };

  const cancelTakeover = async () => {
    try {
      await window.electronAPI.voiceLoop.cancelTakeover(customReason || 'Manual cancellation');
      setCustomReason('');
      loadTakeoverState();
    } catch (error) {
      console.error('Failed to cancel takeover:', error);
    }
  };

  const getTriggerLabel = (trigger?: string) => {
    switch (trigger) {
      case 'manual':
        return 'Manual Trigger';
      case 'keyword':
        return 'Keyword Detected';
      case 'ai_detected':
        return 'AI Detected';
      case 'failed_attempts':
        return 'Failed Attempts';
      case 'user_request':
        return 'User Request';
      default:
        return trigger || 'Unknown';
    }
  };

  const getTriggerBadge = (trigger?: string) => {
    switch (trigger) {
      case 'manual':
        return <Badge variant="outline" className="border-blue-200 text-blue-600">Manual</Badge>;
      case 'keyword':
        return <Badge variant="outline" className="border-green-200 text-green-600">Keyword</Badge>;
      case 'ai_detected':
        return <Badge variant="outline" className="border-purple-200 text-purple-600">AI Detected</Badge>;
      case 'failed_attempts':
        return <Badge variant="outline" className="border-red-200 text-red-600">Failed Attempts</Badge>;
      case 'user_request':
        return <Badge variant="outline" className="border-orange-200 text-orange-600">User Request</Badge>;
      default:
        return <Badge variant="secondary">{trigger || 'Unknown'}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading controls...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Human Takeover</h2>
        </div>
        {takeoverState.triggerCount > 0 && (
          <Badge variant="outline">
            {takeoverState.triggerCount} takeover{takeoverState.triggerCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {!takeoverState.isActive ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI is Active</CardTitle>
            <CardDescription>
              The voice assistant is currently handling the conversation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">AI Assistant Active</span>
              </div>
              <p className="text-sm text-green-700">
                The AI is listening and responding to the caller. Everything is working normally.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Manual Transfer Options</h3>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  className="justify-start text-left"
                  onClick={() => triggerTakeover('manual', 'Manual transfer initiated')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Transfer to Human Agent
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left"
                  onClick={() => triggerTakeover('manual', 'Emergency transfer')}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Emergency Transfer
                </Button>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Automatic triggers:</strong> Keyword detection, low confidence, max turns, or consecutive failures will automatically trigger human takeover.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg text-orange-700">
                  Human Takeover Active
                </CardTitle>
                <CardDescription>
                  AI has been paused and a human is needed
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getTriggerBadge(takeoverState.trigger)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-800 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">{getTriggerLabel(takeoverState.trigger)}</span>
              </div>
              <p className="text-sm text-orange-700">
                {takeoverState.reason || 'Human takeover has been triggered'}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Transfer Actions</h3>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    // Send transfer message to caller
                    console.log('Sending transfer message...');
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Transfer Message
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // Connect to human agent
                    console.log('Connecting to human agent...');
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Connect to Human Agent
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Transfer Reason (optional)</label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter reason for transfer..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-[80px]"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={cancelTakeover}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Resume AI
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  console.log('Ending call...');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                End Call
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
