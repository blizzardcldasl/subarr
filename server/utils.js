const fetch = require('node-fetch');
const { spawn } = require('node:child_process');
const parseArgs = require('string-argv').default;

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetch(url, options);
    }
    catch (err) {
      if (attempt === retries - 1)
        throw err;
      
      await new Promise(r => setTimeout(r, 1000)); // wait before retry
    }
  }
}

async function runCommand(command, args) {
  const started = Date.now();
  console.log(`Launching command '${command}' with args '${args}'`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, parseArgs(args));
    console.log(`[Process] Spawned pid=${child.pid ?? 'unknown'} command='${command}'`);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      // Todo: for yt-dlp (or youtube-dl) it would be nice if we could parse the output to get real-time download progress and return it to the UI
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      const elapsedMs = Date.now() - started;
      const stdoutTrimmed = stdout.trim();
      const stderrTrimmed = stderr.trim();
      const stdoutPreview = stdoutTrimmed.slice(-500);
      const stderrPreview = stderrTrimmed.slice(-500);
      if (code === 0) {
        console.log(`[Process] Completed pid=${child.pid ?? 'unknown'} exit=0 in ${elapsedMs}ms stdout_bytes=${stdout.length} stderr_bytes=${stderr.length}`);
        if (stdoutPreview) {
          console.log(`[Process] stdout tail:\n${stdoutPreview}`);
        }
        if (stderrPreview) {
          console.warn(`[Process] stderr tail:\n${stderrPreview}`);
        }
        resolve(stdout.trim());
      }
      else {
        console.error(`[Process] Failed pid=${child.pid ?? 'unknown'} exit=${code} in ${elapsedMs}ms stdout_bytes=${stdout.length} stderr_bytes=${stderr.length}`);
        if (stdoutPreview) {
          console.error(`[Process] stdout tail:\n${stdoutPreview}`);
        }
        if (stderrPreview) {
          console.error(`[Process] stderr tail:\n${stderrPreview}`);
        }
        reject(new Error(`Process exited with code ${code}:\n${stderrTrimmed || 'No stderr output'}`));
      }
    });

    child.on('error', err => {
      console.error(`[Process] Failed to start command '${command}': ${err.message}`);
      reject(new Error(`Failed to start process: ${err.message}`));
    });
  });
}


async function tryParseAdditionalChannelData(url) {
  const response = await fetch(url);
  const responseText = await response.text();
  const channelFeedMatches = [...responseText.matchAll(/https:\/\/www\.youtube\.com\/feeds\/videos\.xml\?channel_id=(UC|UU|PL|LL|FL)[\w-]{10,}/g)];

  const channelInfo = {};

  if (channelFeedMatches.length > 0 && channelFeedMatches[0][0]) {
    channelInfo.playlist_id = channelFeedMatches[0][0].match(/(UC|UU|PL|LL|FL)[\w-]{10,}/)[0].replace(/^UC/, 'UU');
  }

  // Also grep the channel thumbnail from the HTML source code (which could also be done for description, etc in the future)
  // Use the more specific "decoratedAvatarViewModel" pattern to target the channel's own header avatar,
  // avoiding false matches from collaborator/featured channel avatars elsewhere on the page.
  const channelThumbnailMatch = (
    /"decoratedAvatarViewModel":\{"avatar":\{"avatarViewModel":\{"image":\{"sources":(?<avatar_array>\[[^\]]+\])/.exec(responseText)
    ?? /"avatarViewModel":\{"image":\{"sources":(?<avatar_array>\[[^\]]+\])/.exec(responseText)
  );
  
  if (channelThumbnailMatch) {
    const avatarArray = JSON.parse(channelThumbnailMatch.groups.avatar_array);
    channelInfo.thumbnail = avatarArray.find(a => a.width === 160)?.url ?? avatarArray[0].url;
  }

  const channelBannerMatch = /"imageBannerViewModel":{"image":{"sources":(?<banner_array>\[[^\]]+\])/.exec(responseText);
  if (channelBannerMatch) {
    const bannerArray = JSON.parse(channelBannerMatch.groups.banner_array);
    channelInfo.banner = bannerArray.find(b => b.height === 424)?.url ?? bannerArray[0].url;
  }

  return channelInfo;
}

function getMeta() {
  return {
    versions: {
      subarr: 1.3,
      node: process.version,
    },
  };
}

module.exports = { fetchWithRetry, runCommand, tryParseAdditionalChannelData, getMeta }
