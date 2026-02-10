'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconLoader2 } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';

interface Voice {
  id: string;
  name: string;
  provider: 'elevenlabs' | 'openai';
  gender?: string;
}

interface VoiceSelection {
  provider: string;
  voiceId: string;
  name: string;
}

interface VoiceSelectorProps {
  value: { provider: string; voiceId: string } | null;
  onChange: (voice: VoiceSelection) => void;
}

export const VoiceSelector = ({ value, onChange }: VoiceSelectorProps) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/ai/voices');
        if (!response.ok) {
          throw new Error('Failed to fetch voices');
        }
        const data = await response.json();
        setVoices(data.voices || []);

        if (!value && data.voices && data.voices.length > 0) {
          const defaultVoice =
            data.voices.find((v: Voice) => v.provider === 'elevenlabs') ||
            data.voices[0];
          onChange({
            provider: defaultVoice.provider,
            voiceId: defaultVoice.id,
            name: defaultVoice.name,
          });
        }
      } catch (err) {
        console.error('Failed to fetch voices:', err);
        setError('Failed to load voices');
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, []);

  const filteredVoices = voices.filter((voice) =>
    voice.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const elevenlabsVoices = filteredVoices.filter(
    (v) => v.provider === 'elevenlabs'
  );
  const openaiVoices = filteredVoices.filter((v) => v.provider === 'openai');

  const handleValueChange = (voiceKey: string) => {
    const [provider, voiceId] = voiceKey.split(':');
    const voice = voices.find(
      (v) => v.provider === provider && v.id === voiceId
    );
    if (voice) {
      onChange({
        provider: voice.provider,
        voiceId: voice.id,
        name: voice.name,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <IconLoader2 className="size-4 animate-spin" />
        <span>Loading voices...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  const selectedValue = value
    ? `${value.provider}:${value.voiceId}`
    : undefined;
  const selectedVoice = voices.find(
    (v) => v.provider === value?.provider && v.id === value?.voiceId
  );

  return (
    <div className="flex flex-col gap-2">
      <Select value={selectedValue} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full" size="sm">
          <SelectValue placeholder="Select a voice">
            {selectedVoice && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {selectedVoice.provider === 'elevenlabs'
                    ? 'ElevenLabs'
                    : 'OpenAI'}
                </span>
                <span>{selectedVoice.name}</span>
                {selectedVoice.gender && (
                  <span className="text-muted-foreground text-xs">
                    ({selectedVoice.gender})
                  </span>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 pb-1">
            <Input
              placeholder="Search voices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {elevenlabsVoices.length > 0 && (
            <SelectGroup>
              <SelectLabel>ElevenLabs</SelectLabel>
              {elevenlabsVoices.map((voice) => (
                <SelectItem
                  key={`${voice.provider}:${voice.id}`}
                  value={`${voice.provider}:${voice.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{voice.name}</span>
                    {voice.gender && (
                      <span className="text-muted-foreground text-xs">
                        ({voice.gender})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {openaiVoices.length > 0 && (
            <SelectGroup>
              <SelectLabel>OpenAI</SelectLabel>
              {openaiVoices.map((voice) => (
                <SelectItem
                  key={`${voice.provider}:${voice.id}`}
                  value={`${voice.provider}:${voice.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{voice.name}</span>
                    {voice.gender && (
                      <span className="text-muted-foreground text-xs">
                        ({voice.gender})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {filteredVoices.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No voices found
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
