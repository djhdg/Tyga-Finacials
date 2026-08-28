import { Composio } from '@composio/core';

let client;

export function getComposio() {
  if (!process.env.COMPOSIO_API_KEY) {
    throw new Error('COMPOSIO_API_KEY is not configured on the server');
  }

  client ??= new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
  return client;
}

export function composioConfigured() {
  return Boolean(process.env.COMPOSIO_API_KEY);
}
