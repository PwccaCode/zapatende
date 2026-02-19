import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Settings as SettingsIcon, RefreshCw } from 'lucide-react';

interface SettingsProps {
  className?: string;
}

export const Settings: React.FC<SettingsProps> = ({ className }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.settings.getAll();
      if (result.success) {
        setSettings(result.settings);
      }
    } catch (error) {
      showMessage('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      setSaving(true);
      const result = await window.electronAPI.settings.set(key, value);
      if (result.success) {
        setSettings(prev => ({ ...prev, [key]: value }));
        showMessage('success', 'Setting saved successfully');
      } else {
        showMessage('error', 'Failed to save setting');
      }
    } catch (error) {
      showMessage('error', 'Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const settingGroups = [
    {
      title: 'AI Provider',
      description: 'Configure AI model provider',
      settings: [
        { key: 'ai.provider', label: 'AI Provider', type: 'select', options: ['openai', 'anthropic', 'ollama'] },
        { key: 'ai.openai.apiKey', label: 'OpenAI API Key', type: 'password' },
        { key: 'ai.openai.model', label: 'OpenAI Model', type: 'text', placeholder: 'gpt-4' },
        { key: 'ai.anthropic.apiKey', label: 'Anthropic API Key', type: 'password' },
        { key: 'ai.anthropic.model', label: 'Anthropic Model', type: 'text', placeholder: 'claude-3-opus-20240229' },
        { key: 'ai.ollama.baseUrl', label: 'Ollama Base URL', type: 'text', placeholder: 'http://localhost:11434' },
        { key: 'ai.ollama.model', label: 'Ollama Model', type: 'text', placeholder: 'llama2' },
      ],
    },
    {
      title: 'Speech-to-Text',
      description: 'Configure STT provider',
      settings: [
        { key: 'stt.provider', label: 'STT Provider', type: 'select', options: ['whisper'] },
        { key: 'stt.whisper.modelPath', label: 'Whisper Model Path', type: 'text' },
        { key: 'stt.whisper.language', label: 'Language', type: 'text', placeholder: 'pt' },
      ],
    },
    {
      title: 'Text-to-Speech',
      description: 'Configure TTS provider',
      settings: [
        { key: 'tts.provider', label: 'TTS Provider', type: 'select', options: ['openai', 'elevenlabs', 'local'] },
        { key: 'tts.openai.apiKey', label: 'OpenAI API Key', type: 'password' },
        { key: 'tts.openai.voice', label: 'OpenAI Voice', type: 'select', options: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        { key: 'tts.elevenlabs.apiKey', label: 'ElevenLabs API Key', type: 'password' },
        { key: 'tts.elevenlabs.voiceId', label: 'ElevenLabs Voice ID', type: 'text' },
      ],
    },
    {
      title: 'Voice Loop',
      description: 'Configure voice assistant behavior',
      settings: [
        { key: 'voiceLoop.silenceThresholdMs', label: 'Silence Threshold (ms)', type: 'number', defaultValue: '1500' },
        { key: 'voiceLoop.maxTurns', label: 'Max Turns', type: 'number', defaultValue: '10' },
        { key: 'voiceLoop.minConfidence', label: 'Min Confidence (0-1)', type: 'number', step: '0.1', defaultValue: '0.5' },
      ],
    },
    {
      title: 'WhatsApp',
      description: 'Configure WhatsApp integration',
      settings: [
        { key: 'whatsapp.session', label: 'Session Name', type: 'text', defaultValue: 'default' },
        { key: 'whatsapp.autoAnswer', label: 'Auto Answer Calls', type: 'select', options: ['true', 'false'] },
      ],
    },
  ];

  const renderSettingInput = (setting: any) => {
    const value = settings[setting.key] || setting.defaultValue || '';

    switch (setting.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => saveSetting(setting.key, e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
          >
            {setting.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case 'password':
        return (
          <Input
            type="password"
            value={value}
            onChange={(e) => saveSetting(setting.key, e.target.value)}
            placeholder={setting.placeholder}
            disabled={saving}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => saveSetting(setting.key, e.target.value)}
            step={setting.step || '1'}
            disabled={saving}
          />
        );
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => saveSetting(setting.key, e.target.value)}
            placeholder={setting.placeholder}
            disabled={saving}
          />
        );
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Settings</h2>
        </div>
        <Button variant="outline" onClick={loadSettings} disabled={loading || saving}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-md ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {settingGroups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.settings.map((setting) => (
                <div key={setting.key} className="space-y-2">
                  <label className="text-sm font-medium">{setting.label}</label>
                  {renderSettingInput(setting)}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
