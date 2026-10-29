// /api/admin/*: Website Manager API (login, logout, content, upload, save).
import { getStore } from '@netlify/blobs';
import { handleAdmin } from '../lib/cms.mjs';
import { createAuth } from '../lib/auth.mjs';
import { defaults } from '../lib/defaults.mjs';

export default async (req, context) =>
  handleAdmin(req, {
    contentStore: getStore({ name: 'site-content', consistency: 'strong' }),
    mediaStore: getStore({ name: 'site-media', consistency: 'strong' }),
    auth: createAuth({ store: getStore({ name: 'site-auth', consistency: 'strong' }), env: process.env }),
    ip: context.ip,
    defaults,
  });

export const config = { path: '/api/admin/*' };
