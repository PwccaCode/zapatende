import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MessageSquare, Phone, History, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';

// Import custom components
import { Settings } from '@/components/Settings';
import { CallMonitor } from '@/components/CallMonitor';
import { LiveTranscription } from '@/components/LiveTranscription';
import { CallHistory } from '@/components/CallHistory';
import { TransferControls } from '@/components/TransferControls';

type View = 'dashboard' | 'calls' | 'transcription' | 'history' | 'settings';

interface VoiceLoopState {
  state: string;
  stats: {
    totalTurns: number;
    successfulTranscriptions: number;
    failedTranscriptions: number;
    averageConfidence: number;
    totalDuration: number;
  };
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedCallId, setSelectedCallId] = useState<string | undefined>();
  const [voiceLoopState, setVoiceLoopState] = useState<VoiceLoopState | null>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    loadVoiceLoopState();
    
    // Subscribe to state changes
    const unsubscribe = window.electronAPI.voiceLoop.onStateChange((state) => {
      setIsListening(state === 'listening');
      loadVoiceLoopState();
    });

    return () => unsubscribe();
  }, []);

  const loadVoiceLoopState = async () => {
    try {
      const [stateResult, statsResult] = await Promise.all([
        window.electronAPI.voiceLoop.getState(),
        window.electronAPI.voiceLoop.getStats(),
      ]);

      if (stateResult.success && statsResult.success) {
        setVoiceLoopState({
          state: stateResult.state,
          stats: statsResult.stats,
        });
      }
    } catch (error) {
      console.error('Failed to load voice loop state:', error);
    }
  };

  const handleVoiceLoopAction = async (action: 'start' | 'pause' | 'resume' | 'reset') => {
    try {
      switch (action) {
        case 'start':
          await window.electronAPI.voiceLoop.start();
          break;
        case 'pause':
          await window.electronAPI.voiceLoop.pause();
          break;
        case 'resume':
          await window.electronAPI.voiceLoop.resume();
          break;
        case 'reset':
          await window.electronAPI.voiceLoop.reset();
          break;
      }
      loadVoiceLoopState();
    } catch (error) {
      console.error('Failed to execute voice loop action:', error);
    }
  };

  const getStateBadge = (state?: string) => {
    switch (state) {
      case 'listening':
        return <Badge className="bg-blue-500 animate-pulse">Listening</Badge>;
      case 'processing':
        return <Badge className="bg-purple-500">Processing</Badge>;
      case 'speaking':
        return <Badge className="bg-green-500">Speaking</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  const NavigationButton: React.FC<{ view: View; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
        currentView === view
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ZapAtende</h1>
                <p className="text-xs text-muted-foreground">WhatsApp AI Voice Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {voiceLoopState && (
                <div className="flex items-center gap-2">
                  {getStateBadge(voiceLoopState.state)}
                  <span className="text-sm text-muted-foreground">
                    {voiceLoopState.stats.totalTurns} turns
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {isListening ? (
                  <Button variant="outline" size="sm" onClick={() => handleVoiceLoopAction('pause')}>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleVoiceLoopAction('resume')}>
                    <Mic className="h-4 w-4 mr-2" />
                    {voiceLoopState?.state === 'idle' ? 'Start' : 'Resume'}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handleVoiceLoopAction('reset')}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-1">
            <NavigationButton view="dashboard" icon={<LayoutDashboard className="h-5 w-5" />} label="Dashboard" />
            <NavigationButton view="calls" icon={<Phone className="h-5 w-5" />} label="Active Calls" />
            <NavigationButton view="transcription" icon={<MessageSquare className="h-5 w-5" />} label="Transcription" />
            <NavigationButton view="history" icon={<History className="h-5 w-5" />} label="History" />
            <NavigationButton view="settings" icon={<SettingsIcon className="h-5 w-5" />} label="Settings" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-6">
        {currentView === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <LiveTranscription callId={selectedCallId} />
              <TransferControls />
            </div>
            <div className="space-y-6">
              <CallMonitor />
            </div>
          </div>
        )}

        {currentView === 'calls' && (
          <CallMonitor />
        )}

        {currentView === 'transcription' && (
          <LiveTranscription callId={selectedCallId} />
        )}

        {currentView === 'history' && (
          <CallHistory onSelectCall={setSelectedCallId} />
        )}

        {currentView === 'settings' && (
          <Settings />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>ZapAtende Voice Assistant v1.0.0</p>
            {voiceLoopState && (
              <p>
                Transcription success rate:{' '}
                <span className="font-semibold">
                  {voiceLoopState.stats.successfulTranscriptions > 0
                    ? `${((voiceLoopState.stats.successfulTranscriptions / (voiceLoopState.stats.successfulTranscriptions + voiceLoopState.stats.failedTranscriptions)) * 100).toFixed(0)}%`
                    : 'N/A'}
                </span>
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
