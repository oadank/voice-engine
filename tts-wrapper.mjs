#!/usr/bin/env node
/**
 * Voice Engine TTS Wrapper - 通用版
 * 4 合 1 自动回退 + 渠道感知转码
 * 
 * 用法: node tts-wrapper.mjs "要说的话"
 * 环境变量: TTS_CHANNEL, TTS_PROVIDER, TTS_SPEED
 * 配置来源: /root/.openclaw/openclaw.json → messages.tts.providers
 * 输出: 音频文件路径到 stdout
 */

import https from 'node:https';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tts as edgeTts } from './edge-tts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 读取 openclaw.json TTS 配置 ──
function loadConfig() {
  const configPath = '/root/.openclaw/openclaw.json';
  try {
    const raw = readFileSync(configPath, 'utf8');
    const cfg = JSON.parse(raw);
    const tts = cfg.messages?.tts || {};
    const providers = tts.providers || {};
    return {
      xiaomi: {
        apiKey: providers.openai?.apiKey || '',
        baseUrl: providers.openai?.baseUrl || 'https://api.xiaomimimo.com/v1',
        model: providers.openai?.model || 'mimo-v2.5-tts',
        voice: providers.openai?.voice || 'default_zh',
        speed: 1.2,
      },
      microsoft: {
        enabled: providers.microsoft?.enabled !== false,
        voice: providers.microsoft?.voice || 'zh-CN-XiaoxiaoNeural',
      },
      wangwang: {
        enabled: providers.wangwang?.enabled !== false,
        url: providers.wangwang?.url || 'https://tts.wangwangit.com/v1/audio/speech',
        voice: providers.wangwang?.voice || 'zh-CN-XiaoxiaoNeural',
        speed: providers.wangwang?.speed || 1.2,
      },
      ali: {
        enabled: providers.ali?.enabled !== false,
        apiKey: providers.ali?.apiKey || '',
        baseUrl: providers.ali?.baseUrl || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        voice: providers.ali?.voice || 'Cherry',
      },
    };
  } catch (e) {
    console.error(`[配置] 读取 openclaw.json 失败: ${e.message}`);
    return null;
  }
}

const CONFIG = loadConfig();
const TEMP_DIR = '/tmp/openclaw';
const FFMPEG = '/sherpa-onnx/bin/ffmpeg';

mkdirSync(TEMP_DIR, { recursive: true });

// ── HTTP 请求 ──
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, {
      method: options.method || 'POST',
      headers: options.headers || {},
      timeout: options.timeout || 60000,
    }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        return httpRequest(res.headers.location, options).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ── ffmpeg 转码 ──
function transcode(inputFile, outputFormat, outputFile) {
  const args = outputFormat === 'opus'
    ? [FFMPEG, '-i', inputFile, '-ar', '16000', '-ac', '1', '-c:a', 'libopus', '-b:a', '24k', '-application', 'voip', '-y', outputFile]
    : [FFMPEG, '-i', inputFile, '-ar', '16000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', '-y', outputFile];
  try {
    execSync(args.map(a => `'${a}'`).join(' '), { stdio: 'pipe', timeout: 30000 });
    return true;
  } catch (e) {
    console.error(`[转码] ${outputFormat} 失败: ${e.message}`);
    return false;
  }
}

// ── 小米 TTS（OpenAI 兼容 API）──
async function synthesizeXiaomi(text, outputFormat) {
  const cfg = CONFIG?.xiaomi;
  if (!cfg?.apiKey) { console.error('[TTS-小米] 无 API Key'); return null; }

  console.error('[TTS-小米] 开始合成');
  const payload = JSON.stringify({
    model: cfg.model,
    messages: [
      { role: 'user', content: '把下面的文字转成语音' },
      { role: 'assistant', content: text }
    ],
    max_tokens: 8192,
    speed: cfg.speed,
    voice: cfg.voice,
  });

  const res = await httpRequest(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: payload,
  });

  const result = JSON.parse(res.body.toString());
  const audioData = result.choices?.[0]?.message?.audio?.data;
  if (!audioData || audioData.length < 100) {
    console.error('[TTS-小米] 无法解析响应');
    return null;
  }

  const rawFile = join(TEMP_DIR, 'tts_xiaomi_raw.wav');
  writeFileSync(rawFile, Buffer.from(audioData, 'base64'));
  console.error(`[TTS-小米] WAV ${readFileSync(rawFile).length}b`);
  return finalizeOutput(rawFile, 'xiaomi', outputFormat);
}

// ── 微软 Edge TTS（Node.js 原生，DRM 令牌 + WebSocket）──
async function synthesizeMicrosoft(text, outputFormat) {
  const cfg = CONFIG?.microsoft;
  if (!cfg?.enabled) { console.error('[TTS-微软] 未启用'); return null; }

  console.error('[TTS-微软] 开始合成（Node.js 原生）');

  try {
    const audioBuffer = await edgeTts(text, cfg.voice);

    if (!audioBuffer || audioBuffer.length === 0) {
      console.error('[TTS-微软] 返回空音频');
      return null;
    }

    const rawFile = join(TEMP_DIR, 'tts_microsoft_raw.mp3');
    writeFileSync(rawFile, audioBuffer);
    console.error(`[TTS-微软] MP3 ${audioBuffer.length}b`);

    if (outputFormat === 'mp3') {
      const outFile = join(TEMP_DIR, 'tts_microsoft.mp3');
      renameSync(rawFile, outFile);
      return { path: outFile, format: 'mp3' };
    }
    return finalizeOutput(rawFile, 'microsoft', outputFormat);
  } catch (e) {
    console.error(`[TTS-微软] 失败: ${e.message}`);
    return null;
  }
}

// ── 万旺 TTS ──
async function synthesizeWangwang(text, outputFormat) {
  const cfg = CONFIG?.wangwang;
  if (!cfg?.enabled || !cfg?.url) { console.error('[TTS-万旺] 未启用'); return null; }

  console.error('[TTS-万旺] 开始合成');
  const res = await httpRequest(cfg.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text, voice: cfg.voice, speed: cfg.speed, pitch: '0', style: 'general' }),
    timeout: 30000,
  });

  if (res.status !== 200 || res.body.length === 0) {
    console.error(`[TTS-万旺] HTTP ${res.status}`);
    return null;
  }

  const rawFile = join(TEMP_DIR, 'tts_wangwang_raw.mp3');
  writeFileSync(rawFile, res.body);
  console.error(`[TTS-万旺] MP3 ${res.body.length}b`);

  if (outputFormat === 'mp3') {
    const outFile = join(TEMP_DIR, 'tts_wangwang.mp3');
    renameSync(rawFile, outFile);
    return { path: outFile, format: 'mp3' };
  }
  return finalizeOutput(rawFile, 'wangwang', outputFormat);
}

// ── 阿里 TTS ──
async function synthesizeAli(text, outputFormat) {
  const cfg = CONFIG?.ali;
  if (!cfg?.enabled || !cfg?.apiKey) { console.error('[TTS-阿里] 未启用'); return null; }

  console.error('[TTS-阿里] 开始合成');
  const res = await httpRequest(cfg.baseUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen3-tts-flash', input: { text }, parameters: { voice: cfg.voice, format: 'wav', language_type: 'zh' } }),
    timeout: 60000,
  });

  if (res.status !== 200) {
    console.error(`[TTS-阿里] HTTP ${res.status}`);
    return null;
  }

  const result = JSON.parse(res.body.toString());
  const audioUrl = result.output?.audio?.url;
  if (!audioUrl) { console.error('[TTS-阿里] 无音频 URL'); return null; }

  const audioRes = await httpRequest(audioUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 120000 });
  const rawFile = join(TEMP_DIR, 'tts_ali_raw.wav');
  writeFileSync(rawFile, audioRes.body);
  console.error(`[TTS-阿里] WAV ${audioRes.body.length}b`);
  return finalizeOutput(rawFile, 'ali', outputFormat);
}

// ── 统一输出处理 ──
function finalizeOutput(rawFile, provider, outputFormat) {
  if (!existsSync(rawFile) || readFileSync(rawFile).length === 0) return null;
  const names = { xiaomi: '小米TTS', microsoft: '微软TTS', wangwang: '万旺TTS', ali: '阿里TTS' };
  const outFile = join(TEMP_DIR, `${names[provider] || provider}.${outputFormat}`);
  if (transcode(rawFile, outputFormat, outFile)) {
    console.error(`[TTS] ${provider} -> ${outputFormat.toUpperCase()} ${readFileSync(outFile).length}b`);
    return { path: outFile, format: outputFormat };
  }
  return null;
}

// ── 主逻辑 ──
async function main() {
  const text = process.argv[2];
  if (!text) { console.error('用法: node tts-wrapper.mjs "要说的话"'); process.exit(1); }

  const channel = process.env.TTS_CHANNEL || 'feishu';
  const provider = (process.env.TTS_PROVIDER || 'auto').toLowerCase();

  const channelFormats = {
    feishu: 'opus', telegram: 'opus', whatsapp: 'opus',
    weixin: 'mp3', wx: 'mp3',
    qq: 'opus', discord: 'opus', signal: 'opus',
    line: 'opus', bluebubbles: 'mp3', msteams: 'opus',
    slack: 'opus', matrix: 'opus', mattermost: 'opus',
    nextcloud: 'opus', nostr: 'opus', irc: 'opus',
  };
  // 默认 opus，微信/BlueBubbles 用 mp3
  const outputFormat = channelFormats[channel] || 'opus';

  const providerMap = {
    xiaomi: 'xiaomi', xiaomimimo: 'xiaomi', mimo: 'xiaomi',
    microsoft: 'microsoft', edge: 'microsoft', edgetts: 'microsoft',
    wangwang: 'wangwang', wangwangit: 'wangwang',
    ali: 'ali', aliyun: 'ali', alibaba: 'ali', dashscope: 'ali',
  };

  const providers = provider === 'auto'
    ? ['xiaomi', 'microsoft', 'wangwang', 'ali']
    : [providerMap[provider] || provider];

  const fns = { xiaomi: synthesizeXiaomi, microsoft: synthesizeMicrosoft, wangwang: synthesizeWangwang, ali: synthesizeAli };

  console.error(`[TTS] channel=${channel}, provider=${provider}, format=${outputFormat}`);

  for (const p of providers) {
    const fn = fns[p];
    if (!fn) continue;
    try {
      const result = await fn(text, outputFormat);
      if (result) {
        console.error(`[TTS] 命中: ${p} -> ${result.format}`);
        console.log(result.path);
        process.exit(0);
      }
    } catch (e) {
      console.error(`[TTS] ${p} 失败: ${e.message}`);
    }
  }

  console.error('[TTS] 全部失败');
  process.exit(1);
}

main().catch(e => { console.error(`[TTS] 致命: ${e.message}`); process.exit(1); });
