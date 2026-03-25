const { Telegraf } = require("telegraf");
const Groq = require("groq-sdk");
const http = require("http");
const fs = require("fs");
const path = require("path");

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

const bot = new Telegraf(BOT_TOKEN);
const groq = new Groq({ apiKey: GROQ_API_KEY });

const CA = "0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16";

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Baby Siren bot is alive");
}).listen(PORT, () => console.log("HTTP server running on port " + PORT));

const SIREN_IMAGE = path.join(__dirname, "siren.jpg");

// Track image message IDs per chat to delete old ones
var sentImageMsgIds = {};

async function sendSirenImage(chatId, caption) {
  if (sentImageMsgIds[chatId] && sentImageMsgIds[chatId].length > 0) {
    for (var i = 0; i < sentImageMsgIds[chatId].length; i++) {
      try { await bot.telegram.deleteMessage(chatId, sentImageMsgIds[chatId][i]); } catch(e) {}
    }
    sentImageMsgIds[chatId] = [];
  }
  try {
    var sent;
    if (fs.existsSync(SIREN_IMAGE)) {
      sent = await bot.telegram.sendPhoto(chatId, { source: SIREN_IMAGE }, { caption: caption });
    } else {
      sent = await bot.telegram.sendMessage(chatId, caption);
    }
    if (!sentImageMsgIds[chatId]) sentImageMsgIds[chatId] = [];
    sentImageMsgIds[chatId].push(sent.message_id);
  } catch (err) {
    console.error("Image send error:", err.message);
  }
}

// CA captions — varied every time, plain address for tap-to-copy
var caCaptions = [
  "🔑 Official $BSiren CA:\n\n" + CA + "\n\nAlways verify before buying. One and only.",
  "📋 Here's the CA, fren:\n\n" + CA + "\n\nBNB Chain | 5% Buy / 5% Sell Tax | 4.4% Max Wallet",
  "🌊 $BSiren Contract Address:\n\n" + CA + "\n\nPaste on PancakeSwap and ape in. Simple.",
  "🧜‍♀️ Tap to copy the $BSiren CA:\n\n" + CA + "\n\nBNB Chain | Anti-whale | 1B supply",
  "💎 The only CA you need:\n\n" + CA + "\n\nBNB Chain — copy it, own it, hold it.",
  "📍 $BSiren lives here:\n\n" + CA + "\n\nVerify on DexScreener before you buy. Stay safe."
];

var lastCaCaptionIndex = -1;
function getCACaption() {
  var idx;
  do { idx = Math.floor(Math.random() * caCaptions.length); } while (idx === lastCaCaptionIndex);
  lastCaCaptionIndex = idx;
  return caCaptions[idx];
}

const SYSTEM_PROMPT = [
  "You are Baby Siren — the AI moderator of the $BSiren token community on BNB Chain (BSC).",
  "",
  "PERSONALITY:",
  "- Calm, confident, warm, genuinely bullish — never fake hype",
  "- Every reply feels completely different — vary words, structure, energy every time",
  "- Short questions get short punchy answers (1-3 lines)",
  "- Detailed questions get thorough answers (up to 6 lines)",
  "- Never robotic. Never a template. Never repeat yourself",
  "- Emojis natural and minimal — never right after or before the contract address on same line",
  "",
  "TOKEN FACTS — never change, never invent:",
  "- Name: Baby Siren | Ticker: $BSiren",
  "- Contract Address: " + CA,
  "- Blockchain: BNB Chain (BSC)",
  "- Total Supply: 1,000,000,000 (1 Billion)",
  "- Max Wallet: 4.4% = 44,000,000 tokens",
  "  This is ANTI-WHALE protection — stops any single wallet holding more than 44M tokens",
  "  Keeps the price fair and prevents whales dominating. It is a holding CAP, not a distribution.",
  "- Buy Tax: 5% | Sell Tax: 5%",
  "- Twitter/X: https://x.com/Baby_siren1",
  "- Chart: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
  "- Buy: https://pancakeswap.finance/swap?outputCurrency=" + CA,
  "",
  "ABOUT THE DEV:",
  "- Active and present — watching every chat and every chart candle",
  "- Committed to the project and the community",
  "- Express this differently every single time — never repeat the same phrasing",
  "",
  "HOW TO BUY (vary explanation each time):",
  "MetaMask or Trust Wallet → BNB Chain → get BNB → PancakeSwap → paste CA → 5-10% slippage → swap",
  "",
  "CA FORMAT RULE:",
  "When you need to show the contract address, always put it alone on its own line as plain text.",
  "No backticks. No emoji on same line. Just the raw address so users can tap to copy.",
  "",
  "REPLY LENGTH:",
  "- Simple short questions: 1-3 lines",
  "- Detailed questions needing explanation: up to 6 lines",
  "- Match depth of reply to depth of question",
  "",
  "WHEN TO REPLY — only when message is clearly about:",
  "- $BSiren, Baby Siren, the token, CA, contract",
  "- Buying, selling, swapping, PancakeSwap",
  "- Chart, price, market cap",
  "- The dev or team",
  "- Safety, rug concerns, legitimacy",
  "- Tokenomics: tax, max wallet, supply",
  "- The community or project",
  "- Someone directly asking the bot",
  "",
  "STAY SILENT — reply with exactly: IGNORE — when:",
  "- Community members chat casually with each other",
  "- Random feelings or reactions: gm, lol, nice, wow, ok, haha, random emojis",
  "- Message has zero connection to the token",
  "- You are not sure — when in doubt always IGNORE",
  "",
  "GOLDEN RULE: Never write the same reply twice. Always fresh. Always alive."
].join("\n");

function buildWelcomePrompt(name) {
  return [
    "You are Baby Siren bot. New member " + name + " just joined the Baby Siren Telegram group.",
    "Write a short unique welcome (max 4 lines). Every welcome must feel completely different.",
    "Vary the opening, metaphor, energy, and structure every single time.",
    "Warm, genuine, bullish. No fake hype. Ticker is $BSiren.",
    "",
    "Always include naturally:",
    "- CA on its own plain line (no backticks, no emoji on same line): " + CA,
    "- Chart: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
    "",
    "Max 4 lines. Sound like a real community."
  ].join("\n");
}

var silenceAngles = [
  "The $BSiren group has been quiet. Send a short warm message (2-3 lines) celebrating holders and their patience. Genuine, not hype.",
  "Baby Siren is silent. Drop a unique 2-3 line message reminding holders why they are early. Fresh angle, no cliches.",
  "Stir the ocean. Short energetic but grounded $BSiren message about momentum or community strength. 2-3 lines.",
  "The tide is always moving. Short positive message about building and believing in $BSiren. 2-3 lines.",
  "Send 2-3 lines to the $BSiren community that sparks good energy. Celebrate holders or the journey.",
  "The $BSiren community deserves love. Warm 2-3 line message about why being early in something real matters.",
  "The siren calls. Motivational 2-3 lines for Baby Siren holders. Fresh, grounded, no cliches."
];

function buildSilencePrompt() {
  return silenceAngles[Math.floor(Math.random() * silenceAngles.length)];
}

async function isAdmin(ctx, userId) {
  try {
    var member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    return member.status === "administrator" || member.status === "creator";
  } catch(e) { return false; }
}

function containsLink(text) {
  return /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|telegram\.me\/[^\s]+|@\w{5,})/gi.test(text);
}

function isCARequest(text) {
  var t = text.toLowerCase().trim();
  return t === "ca" || t === "ca?" || t === "/ca" || t === "contract" ||
    (t.includes("contract") && t.includes("address")) ||
    t === "address" || t === "addy" || t === "token address";
}

var spamTracker = new Map();
function isSpamming(userId) {
  var now = Date.now();
  var record = spamTracker.get(userId) || { count: 0, since: now };
  if (now - record.since > 60000) { spamTracker.set(userId, { count: 1, since: now }); return false; }
  record.count += 1;
  spamTracker.set(userId, record);
  return record.count > 5;
}

var cooldowns = new Map();
function isOnCooldown(userId) { var l = cooldowns.get(userId); return l && Date.now() - l < 4000; }
function setCooldown(userId) { cooldowns.set(userId, Date.now()); }

async function askGroq(systemPrompt, userMessage) {
  var messages = userMessage
    ? [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }]
    : [{ role: "user", content: systemPrompt }];
  var completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: messages,
    max_tokens: 400,
    temperature: 1.0
  });
  var c = completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content;
  return c ? c.trim() : "IGNORE";
}

var groupChatId = null;
var silenceTimer = null;

function resetSilenceTimer() {
  if (silenceTimer) clearTimeout(silenceTimer);
  silenceTimer = setTimeout(async function() {
    if (!groupChatId) return;
    try {
      var caption = await askGroq(buildSilencePrompt(), null);
      if (caption && caption.toUpperCase().indexOf("IGNORE") === -1) {
        await sendSirenImage(groupChatId, caption);
      }
    } catch (err) { console.error("Silence breaker error:", err.message); }
    resetSilenceTimer();
  }, 30 * 60 * 1000);
}

bot.start(async function(ctx) {
  await ctx.reply("Baby Siren is live. Ask me anything about $BSiren — CA, how to buy, dev, chart, tokenomics.");
});

bot.on("text", async function(ctx) {
  try {
    var userId = ctx.from && ctx.from.id;
    var text = ctx.message && ctx.message.text && ctx.message.text.trim();
    var chatType = ctx.chat && ctx.chat.type;

    if (!text || text.length < 2) return;
    if (text.startsWith("/") && !isCARequest(text)) return;

    if (chatType === "group" || chatType === "supergroup") {
      groupChatId = ctx.chat.id;
      resetSilenceTimer();
    }

    if (chatType === "group" || chatType === "supergroup") {
      if (containsLink(text)) {
        var admin = await isAdmin(ctx, userId);
        if (!admin) {
          try {
            await ctx.deleteMessage();
            var warn = await ctx.reply("@" + (ctx.from.username || ctx.from.first_name) + " — links are for admins only. Keep the ocean clean");
            setTimeout(async function() { try { await ctx.telegram.deleteMessage(ctx.chat.id, warn.message_id); } catch(e) {} }, 10000);
          } catch(e) {}
          return;
        }
      }
      if (isSpamming(userId)) {
        var adminCheck = await isAdmin(ctx, userId);
        if (!adminCheck) {
          try {
            await ctx.deleteMessage();
            await ctx.telegram.restrictChatMember(ctx.chat.id, userId, {
              permissions: { can_send_messages: false },
              until_date: Math.floor(Date.now() / 1000) + 300
            });
            var warnSpam = await ctx.reply("@" + (ctx.from.username || ctx.from.first_name) + " — muted for 5 minutes. Slow down");
            setTimeout(async function() { try { await ctx.telegram.deleteMessage(ctx.chat.id, warnSpam.message_id); } catch(e) {} }, 15000);
          } catch(e) {}
          return;
        }
      }
    }

    if (isOnCooldown(userId)) return;
    setCooldown(userId);

    // CA request — send image with varied caption
    if (isCARequest(text)) {
      await sendSirenImage(ctx.chat.id, getCACaption());
      return;
    }

    var reply = await askGroq(SYSTEM_PROMPT, text);
    if (!reply || reply.toUpperCase().indexOf("IGNORE") !== -1) return;
    await ctx.reply(reply);
  } catch (err) { console.error("Error:", err.message); }
});

bot.on("new_chat_members", async function(ctx) {
  try {
    groupChatId = ctx.chat.id;
    resetSilenceTimer();
    var members = ctx.message.new_chat_members;
    for (var i = 0; i < members.length; i++) {
      var member = members[i];
      if (member.is_bot) continue;
      var name = member.first_name || "fren";
      try { await ctx.deleteMessage(); } catch(e) {}
      var welcomeText = await askGroq(buildWelcomePrompt(name), null);
      var welcome = await ctx.reply(welcomeText || "Welcome " + name + "! You just found the ocean. $BSiren is live.", { parse_mode: "Markdown" });
      (function(chatId, msgId) {
        setTimeout(async function() { try { await ctx.telegram.deleteMessage(chatId, msgId); } catch(e) {} }, 60000);
      })(ctx.chat.id, welcome.message_id);
    }
  } catch (err) { console.error("Welcome error:", err.message); }
});

bot.launch().then(function() {
  console.log("Baby Siren bot is running...");
  resetSilenceTimer();
});

process.once("SIGINT", function() { bot.stop("SIGINT"); });
process.once("SIGTERM", function() { bot.stop("SIGTERM"); });
