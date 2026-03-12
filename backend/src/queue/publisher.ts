import { connect, StringCodec, type NatsConnection, type JetStreamClient } from 'nats';
import { config } from '../config.js';
import type { FrameMessage, BatchFrameMessage } from '../types/index.js';

const sc = StringCodec();

let nc: NatsConnection | null = null;
let js: JetStreamClient | null = null;

export async function connectNats(): Promise<void> {
  nc = await connect({ servers: config.NATS_URL });
  js = nc.jetstream();

  const jsm = await nc.jetstreamManager();
  await jsm.streams.add({
    name: 'FRAMES',
    subjects: ['frames.process', 'frames.batch'],
  }).catch(async (err: unknown) => {
    const errMsg = String(err);
    if (errMsg.includes('stream name already in use')) {
      // Update existing stream to include new subject
      await jsm.streams.update('FRAMES', {
        subjects: ['frames.process', 'frames.batch'],
      });
    } else {
      throw err;
    }
  });

  console.log('[NATS] Connected to', config.NATS_URL);
}

export async function publishFrame(message: FrameMessage): Promise<void> {
  if (!js) throw new Error('NATS not connected');
  await js.publish('frames.process', sc.encode(JSON.stringify(message)));
}

export async function publishBatchFrame(message: BatchFrameMessage): Promise<void> {
  if (!js) throw new Error('NATS not connected');
  await js.publish('frames.batch', sc.encode(JSON.stringify(message)));
}

export async function closeNats(): Promise<void> {
  if (nc) await nc.drain();
}
