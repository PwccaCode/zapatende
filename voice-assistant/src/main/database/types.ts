/**
 * Database entity types for the voice assistant
 */

export type CallStatus = 'active' | 'ended' | 'transferred';
export type MessageRole = 'caller' | 'ai' | 'human';

export interface Call {
  id: string;
  chat_id: string;
  contact_name?: string;
  phone_number?: string;
  started_at: Date;
  ended_at?: Date;
  duration_seconds?: number;
  status: CallStatus;
  end_reason?: string;
}

export interface Message {
  id: string;
  call_id: string;
  role: MessageRole;
  content: string;
  created_at: Date;
}

export interface Setting {
  key: string;
  value: string;
}

export interface TransferTemplate {
  id: string;
  name: string;
  message: string;
  is_default: boolean;
}

export interface CreateCallInput {
  id: string;
  chat_id: string;
  contact_name?: string;
  phone_number?: string;
  started_at?: Date;
}

export interface UpdateCallInput {
  ended_at?: Date;
  duration_seconds?: number;
  status?: CallStatus;
  end_reason?: string;
}

export interface CreateMessageInput {
  id: string;
  call_id: string;
  role: MessageRole;
  content: string;
  created_at?: Date;
}
