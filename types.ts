
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
  contactData?: {
    fullName: string;
    phoneNumber?: string;
    email?: string;
    company?: string;
    address?: string;
  };
}

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isListening: boolean;
  color?: string;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}