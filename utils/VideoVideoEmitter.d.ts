// only for types
import { EventEmitter } from 'events';
import ytdl from 'ytdl-core';

interface VideoEvents {
    progress: [ytdl.videoInfo, number, number];
    finish: [boolean, message?];
    start: [ytdl.videoInfo];
}

// this idea was totally not stolen from discord.js Client
export default class VideoEventEmitter extends EventEmitter {
    public on<K extends keyof VideoEvents>(event: K, listener: (...args: VideoEvents[K]) => void): this;
    public on<S extends string | symbol>(
      event: Exclude<S, keyof VideoEvents>,
      listener: (...args: any[]) => void,
    ): this;

    public once<K extends keyof VideoEvents>(event: K, listener: (...args: VideoEvents[K]) => void): this;
    public once<S extends string | symbol>(
      event: Exclude<S, keyof VideoEvents>,
      listener: (...args: any[]) => void,
    ): this;

    public emit<K extends keyof VideoEvents>(event: K, ...args: VideoEvents[K]): boolean;
    public emit<S extends string | symbol>(event: Exclude<S, keyof VideoEvents>, ...args: any[]): boolean;
}