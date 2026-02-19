import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { MessageSquare, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'caller' | 'ai' | 'human';
  content: string;
  timestamp: Date;
  confidence?: number;
}

interface LiveTranscriptionProps {
  className?: string;
  callId?: string;
}

export const LiveTranscription: React.FC<LiveTranscriptionProps> = ({ className, callId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (callId) {
      loadMessages(callId);
    }
  }, [callId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for real-time transcription events
  useEffect(() => {
    const unsubscribeTranscription = window.electronAPI.voiceLoop.onTranscription((data) => {
      const newMessage: Message = {
        id: `caller-${Date.now()}`,
        role: 'caller',
        content: data.text,
        timestamp: new Date(),
        confidence: data.confidence,
      };
      setMessages(prev => [...prev, newMessage]);
      setIsListening(false);
    });

    const unsubscribeAIResponse = window.electronAPI.voiceLoop.onAIResponse((data) => {
      const newMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: data.text,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
    });

    return () => {
      unsubscribeTranscription();
      unsubscribeAIResponse();
    };
  }, []);

  const loadMessages = async (callId: string) => {
    try {
      const result = await window.electronAPI.messages.getForCall(callId);
      if (result.success) {
        setMessages(result.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.created_at),
        })));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'caller':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'ai':
        return <Bot className="h-4 w-4 text-green-500" />;
      case 'human':
        return <User className="h-4 w-4 text-orange-500" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'caller':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Caller</Badge>;
      case 'ai':
        return <Badge className="bg-green-500">AI Assistant</Badge>;
      case 'human':
        return <Badge variant="outline" className="text-orange-600 border-orange-200">Human</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Live Transcription</h2>
        </div>
        <div className="flex items-center gap-2">
          {isListening && (
            <Badge className="bg-blue-500 animate-pulse">
              Listening...
            </Badge>
          )}
        </div>
      </div>

      <Card className="h-[500px] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Conversation</CardTitle>
          <CardDescription>
            {callId ? `Call: ${callId}` : 'Real-time transcription'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start a conversation to see transcripts here</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'ai' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${
                    message.role === 'ai' ? '' : 'flex-row-reverse'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 p-2 rounded-full ${
                      message.role === 'ai'
                        ? 'bg-green-100'
                        : 'bg-blue-100'
                    }`}
                  >
                    {getRoleIcon(message.role)}
                  </div>
                  <div
                    className={`flex flex-col ${
                      message.role === 'ai' ? '' : 'items-end'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getRoleBadge(message.role)}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        message.role === 'ai'
                          ? 'bg-muted'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.confidence !== undefined && (
                      <span className="text-xs text-muted-foreground mt-1">
                        Confidence: {(message.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isListening && (
            <div className="flex gap-3 justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="flex-shrink-0 p-2 rounded-full bg-blue-100">
                  <User className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex flex-col">
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>
    </div>
  );
};
