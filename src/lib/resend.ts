import { Resend } from 'resend';

// Initialize the Resend client with your API key
export const resend = new Resend(process.env.RESEND_API_KEY);
