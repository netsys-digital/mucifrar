import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';

export type PlaylistTomEvent = {
  itemId: string;
  cifraId: string;
  cifraSlug: string;
  semitones: number;
};

const bus = new EventEmitter();
bus.setMaxListeners(0);

export function publishPlaylistTom(playlistId: string, event: PlaylistTomEvent) {
  bus.emit(playlistId, event);
}

export function pipePlaylistEvents(req: Request, res: Response, playlistId: string) {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  res.write('retry: 1500\n\n');

  const onEvent = (event: PlaylistTomEvent) => {
    res.write(`event: tom\ndata: ${JSON.stringify(event)}\n\n`);
  };

  bus.on(playlistId, onEvent);

  const ping = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  const close = () => {
    clearInterval(ping);
    bus.off(playlistId, onEvent);
  };

  req.on('close', close);
  res.on('error', close);
}
