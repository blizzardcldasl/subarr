const { fetchWithRetry, runCommand } = require('./utils');

/* Notes:
  This is the most sensitive part of our application - running processes or calling webhooks could expose secrets, allow attackers to invoke malicious processes, etc.
  - Soon after adding this feature, we should probably implement an API key for making changes to the application
  - We should implement a timeout on webhook calls & process invocation
*/

async function runPostProcessor(type, target, data, videoInfo) {
  const processorLabel = `${type}:${target}`;
  if (type === 'webhook') {
    let { method = 'POST', headers = {}, body } = JSON.parse(data);

    target = replaceVariables(target, videoInfo, true);
    body = replaceVariables(body, videoInfo);
    console.log(`[PostProcessor] webhook -> ${target} method=${method} (${processorLabel})`);

    const response = await fetchWithRetry(target, {
      method,
      headers,
      body: body ? body /* Coming from the post processor UI, body will already be stringified, so we can just send as-is */ : undefined,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text);
    }

    return text;
  }
  else if (type === 'process') {
    let { args } = JSON.parse(data);

    args = replaceVariables(args, videoInfo);
    console.log(`[PostProcessor] process -> ${target} (${processorLabel})`);

    return await runCommand(target, args); // Currently we're awaiting the process. This can be good for testing the postprocessor, but we might not want it when running it
  }
  else {
    throw new Error(`Unknown processor type: ${type}`);
  }
}

function sanitizeFilename(s) {
  if (s == null || s === '')
    return 'untitled';
  let out = String(s)
    .replace(/[\\/:*?"<>|'\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  if (out.length > 120)
    out = out.slice(0, 120).trim();
  return out || 'untitled';
}

function toPublishedDate(publishedAt) {
  if (!publishedAt)
    return 'unknown-date';
  const d = new Date(publishedAt);
  if (Number.isNaN(d.getTime()))
    return 'unknown-date';
  return d.toISOString().slice(0, 10);
}

function replaceVariables(text, videoInfo, urlsafe = false) {
  const example = { // Some services (eg Discord) won't accept the webhook unless we provide example data for the variables
    video: {
      title: 'Example Video',
      video_id: 'dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      published_at: new Date().toISOString(),
    },
    playlist: {
      title: 'Example Playlist'
    }
  };

  const data = videoInfo || example;

  const replacements = {
    '[[video.title]]': data.video?.title,
    '[[video.thumbnail]]': data.video?.thumbnail,
    '[[video.video_id]]': data.video?.video_id,
    '[[video.published_at]]': data.video?.published_at,
    '[[playlist.title]]': data.playlist?.title,
    '[[playlist.title_fs]]': sanitizeFilename(data.playlist?.title),
    '[[video.title_fs]]': sanitizeFilename(data.video?.title),
    '[[video.published_date]]': toPublishedDate(data.video?.published_at),
  };

  /** Keys safe for filenames / shell paths (no JSON-style escaping). */
  const rawKeys = new Set([
    '[[playlist.title_fs]]',
    '[[video.title_fs]]',
    '[[video.published_date]]',
  ]);

  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    let replacement = value;
    if (urlsafe) {
      replacement = encodeURIComponent(value);
    }
    else if (rawKeys.has(key)) {
      replacement = value == null ? '' : String(value);
    }
    else {
      // Escape properly for JSON strings
      replacement = JSON.stringify(value).slice(1, -1); // slice removes surrounding quotes
    }
    result = result.replaceAll(key, replacement);
  }

  return result;
}


module.exports = { runPostProcessor };