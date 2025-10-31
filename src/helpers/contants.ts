//
export const versionNo = 'v_1';
export const DB_STATES = {
  '0': 'disconnected',
  '1': 'connected',
  '2': 'connecting',
  '3': 'disconnecting',
  '99': 'uninitialized',
};
export const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d\S]{8,}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DOMAIN_REGEX = /^(?:[-A-Za-z0-9]+\.)+[A-Za-z]{2,}$/;
export const URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s?#\/]+)*(?:\?[^\s#]+)?$/;

export enum DatabaseErrors {
  DUPLICATE = '23505',
  INUSE = '23503',
}
