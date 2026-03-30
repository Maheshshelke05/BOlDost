import { auth } from '../firebase';
import { toast } from 'sonner';

export enum ErrorType {
  AUTH = 'auth',
  FIRESTORE = 'firestore',
  GEMINI = 'gemini',
  SPEECH = 'speech',
  NETWORK = 'network',
  UNKNOWN = 'unknown',
}

import { OperationType } from '../types';

export interface AppError {
  type: ErrorType;
  message: string;
  originalError: any;
  userFeedback: string;
  context?: any;
}

export const handleError = (error: any, type: ErrorType, context?: any): AppError => {
  let userFeedback = 'Something went wrong. Please try again.';
  let message = error instanceof Error ? error.message : String(error);

  switch (type) {
    case ErrorType.AUTH:
      if (message.includes('auth/popup-closed-by-user')) {
        userFeedback = 'Login was cancelled. Please try again if you want to sign in.';
      } else if (message.includes('auth/network-request-failed')) {
        userFeedback = 'Network error. Please check your internet connection.';
      } else {
        userFeedback = 'Failed to sign in. Please try again.';
      }
      break;

    case ErrorType.FIRESTORE:
      if (message.includes('permission-denied')) {
        userFeedback = 'You don\'t have permission to perform this action.';
      } else if (message.includes('quota-exceeded')) {
        userFeedback = 'Daily limit reached. Please try again tomorrow.';
      } else {
        userFeedback = 'Failed to save or load data. Please check your connection.';
      }
      break;

    case ErrorType.GEMINI:
      if (message.includes('SAFETY')) {
        userFeedback = 'I can\'t respond to that. Let\'s talk about something else!';
      } else if (message.includes('quota')) {
        userFeedback = 'I\'m a bit busy right now. Let\'s try again in a minute.';
      } else {
        userFeedback = 'I\'m having trouble thinking right now. Can we try again?';
      }
      break;

    case ErrorType.SPEECH:
      if (message.includes('not-allowed')) {
        userFeedback = 'Microphone access was denied. Please enable it in your settings.';
      } else if (message.includes('no-speech')) {
        userFeedback = 'I didn\'t hear anything. Could you try speaking again?';
      } else if (message.includes('network')) {
        userFeedback = 'Speech recognition network error. Please check your connection.';
      } else {
        userFeedback = 'Speech recognition failed. Please try again.';
      }
      break;

    case ErrorType.NETWORK:
      userFeedback = 'Network error. Please check your internet connection.';
      break;
  }

  const appError: AppError = {
    type,
    message,
    originalError: error,
    userFeedback,
    context: {
      ...context,
      userId: auth.currentUser?.uid,
      timestamp: new Date().toISOString(),
    },
  };

  console.error(`[AppError][${type}]`, JSON.stringify(appError, null, 2));
  
  toast.error(userFeedback, {
    description: type === ErrorType.UNKNOWN ? message : undefined,
  });
  
  return appError;
};
