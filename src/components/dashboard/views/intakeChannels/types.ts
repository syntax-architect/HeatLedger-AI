export interface PhonePairing {
  id: string;
  phone_number: string;
  plant_id: string;
  is_verified: boolean;
  is_opted_out: boolean;
  created_at: string;
}

export interface EmailConfig {
  inbound_email: string;
  is_active: boolean;
  allow_list: string[];
}

export interface IntakeLog {
  id: string;
  channel: 'WHATSAPP' | 'EMAIL';
  sender: string;
  message_type: string;
  status: 'PROCESSED' | 'UNPAIRED_SENDER';
  document_id?: string;
  reply_sent?: string;
  created_at: string;
}

export const INITIAL_PHONE_PAIRINGS: PhonePairing[] = [
  {
    id: 'pr_01',
    phone_number: '+91 98300 12345',
    plant_id: 'PLANT-KOL-01',
    is_verified: true,
    is_opted_out: false,
    created_at: '2026-11-10T08:30:00Z',
  },
  {
    id: 'pr_02',
    phone_number: '+91 98311 98765',
    plant_id: 'PLANT-DGP-02',
    is_verified: true,
    is_opted_out: false,
    created_at: '2026-11-14T11:20:00Z',
  },
];

export const INITIAL_EMAIL_CONFIG: EmailConfig = {
  inbound_email: 'mtc-inbound@plant-kolkata.heatledger.ai',
  is_active: true,
  allow_list: ['@tatasteel.com', '@sail.in', '@jsw.in', 'dispatch@jindalsteel.com'],
};

export const INITIAL_INTAKE_LOGS: IntakeLog[] = [
  {
    id: 'log_01',
    channel: 'WHATSAPP',
    sender: '+91 98300 12345',
    message_type: 'image/jpeg (Photo MTC)',
    status: 'PROCESSED',
    document_id: 'doc_wa_9918',
    reply_sent: 'MTC received & saved. Hash: sha256:d8a2... View at: https://app.heatledger.ai/doc/9918',
    created_at: '2026-11-20T10:14:00Z',
  },
  {
    id: 'log_02',
    channel: 'EMAIL',
    sender: 'dispatch@tatasteel.com',
    message_type: 'application/pdf (Direct Vector)',
    status: 'PROCESSED',
    document_id: 'doc_em_8812',
    reply_sent: 'Automated receipt acknowledgement dispatched to sender.',
    created_at: '2026-11-20T09:42:00Z',
  },
  {
    id: 'log_03',
    channel: 'WHATSAPP',
    sender: '+91 94330 99999',
    message_type: 'image/png',
    status: 'UNPAIRED_SENDER',
    reply_sent: 'Number not recognized. Generate a 6-digit pairing code in your HeatLedger dashboard.',
    created_at: '2026-11-19T16:05:00Z',
  },
];
