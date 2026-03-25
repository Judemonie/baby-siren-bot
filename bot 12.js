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

// Keep-alive server
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
}).listen(PORT, () => console.log("HTTP server running on port " + PORT));

const SIREN_IMAGE = path.join(__dirname, "siren.jpg");

// Track sent image message IDs per chat to delete old ones
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
      sent = await bot.telegram.sendPhoto(
        chatId,
        { source: SIREN_IMAGE },
        { caption: caption, parse_mode: "HTML" }
      );
    } else {
      sent = await bot.telegram.sendMessage(chatId, caption, { parse_mode: "HTML" });
    }
    if (!sentImageMsgIds[chatId]) sentImageMsgIds[chatId] = [];
    sentImageMsgIds[chatId].push(sent.message_id);
  } catch (err) {
    console.error("Image send error:", err.message);
  }
}

// CA captions — varied each time, address in <code> tag for tap-to-copy
// Plus inline CopyTextButton for one-tap copy everywhere
var caCaptions = [
  "🔑 Official <b>$BSiren</b> CA:\n\n<code>" + CA + "</code>\n\nBNB Chain | 5% Buy / 5% Sell | Always verify before buying",
  "📋 Here's the CA, fren:\n\n<code>" + CA + "</code>\n\nBNB Chain | Anti-whale | 1B supply",
  "🌊 <b>$BSiren</b> Contract Address:\n\n<code>" + CA + "</code>\n\nPaste on PancakeSwap and ape in. Simple.",
  "🧜‍♀️ Tap to copy the <b>$BSiren</b> CA:\n\n<code>" + CA + "</code>\n\nBNB Chain | 5/5 Tax | 44M max wallet",
  "💎 The only CA you need:\n\n<code>" + CA + "</code>\n\nBNB Chain — copy it, own it, hold it.",
  "📍 <b>$BSiren</b> lives here:\n\n<code>" + CA + "</code>\n\nVerify on DexScreener. Stay safe fren."
];

var lastCaCaptionIndex = -1;
function getCACaption() {
  var idx;
  do { idx = Math.floor(Math.random() * caCaptions.length); } while (idx === lastCaCaptionIndex && caCaptions.length > 1);
  lastCaCaptionIndex = idx;
  return caCaptions[idx];
}

// Inline keyboard with CopyTextButton — works on Telegram mobile & desktop
function getCopyKeyboard() {
  return {
    inline_keyboard: [[
      { text: "📋 Copy CA", copy_text: { text: CA } }
    ]]
  };
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
  "- Minimal emojis — never place any emoji right before or after the contract address",
  "",
  "TOKEN FACTS — never change, never invent:",
  "- Name: Baby Siren | Ticker: $BSiren",
  "- Contract Address: " + CA,
  "- Blockchain: BNB Chain (BSC)",
  "- Total Supply: 1,000,000,000 (1 Billion tokens)",
  "- Max Wallet: 4.4% = 44,000,000 tokens",
  "  ANTI-WHALE protection — no single wallet can hold more than 44M tokens",
  "  Keeps price fair, stops whales dominating. It is a holding CAP not a distribution.",
  "- Buy Tax: 5% | Sell Tax: 5%",
  "- Twitter/X: https://x.com/Baby_siren1",
  "- Chart: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
  "- Buy: https://pancakeswap.finance/swap?outputCurrency=" + CA,
  "",
  "ABOUT THE DEV:",
  "- Active and present — watching every chat and every chart candle",
  "- Committed to the project and community",
  "- Say this differently every single time — never the same phrasing",
  "",
  "HOW TO BUY (vary explanation each time):",
  "MetaMask or Trust Wallet → BNB Chain → get BNB → PancakeSwap → paste CA → 5-10% slippage → swap",
  "",
  "REPLY LENGTH:",
  "- Simple short questions: 1-3 lines",
  "- Detailed questions needing explanation: up to 6 lines",
  "- Match the depth of your reply to the depth of the question",
  "",
  "SOCIALS — when anyone asks for X, Twitter, socials, links, or community:",
  "- X (Twitter): https://x.com/Baby_siren1",
  "- Telegram: https://t.me/Baby_siren",
  "Share both when asked for socials. Share just X when asked for X or Twitter specifically.",
  "",
  "WHEN TO REPLY — only when message is clearly about:",
  "- $BSiren, Baby Siren, the token, CA, contract",
  "- Buying, selling, swapping, PancakeSwap",
  "- Chart, price, market cap",
  "- The dev or team",
  "- Safety, rug concerns, legitimacy",
  "- Max wallet or tax questions",
  "- Socials, X, Twitter, links, community",
  "- Someone directly asking the bot",
  "",
  "STAY SILENT — reply with exactly: IGNORE — when:",
  "- Community members chat casually with each other",
  "- Random feelings or reactions: gm, lol, nice, wow, ok, haha, random emojis",
  "- Questions about tokenomics, roadmap, whitepaper, staking, NFTs — ignore all of these",
  "- Message has zero connection to the token or project",
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
    "Do NOT include the contract address — the bot handles that separately.",
    "Max 4 lines. Sound like a real community not a script."
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

function isXRequest(text) {
  var t = text.toLowerCase().trim();
  return t === "x" || t === "/x" || t === "twitter" || t === "/twitter";
}

function isSocialsRequest(text) {
  var t = text.toLowerCase().trim();
  return t === "socials" || t === "/socials" || t === "links" || t === "/links" ||
    t.includes("social") || t.includes("where to follow") || t.includes("all links") ||
    t.includes("telegram link");
}

var socialsReplies = [
  "\ud83c\udf0a <b>$BSiren Official Links</b>\n\n\ud83d\udc26 <a href=\"https://x.com/Baby_siren1\">Twitter/X</a>\n\ud83d\udcac <a href=\"https://t.me/Baby_siren\">Telegram Group</a>\n\ud83d\udcc8 <a href=\"https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16\">Chart</a>\n\ud83e\udd5e <a href=\"https://pancakeswap.finance/swap?outputCurrency=0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16\">Buy on PancakeSwap</a>\n\nAlways verify links before connecting your wallet",
  "\ud83e\udddc\u200d\u2640\ufe0f <b>Find $BSiren Here</b>\n\n\ud83d\udc26 <a href=\"https://x.com/Baby_siren1\">Twitter/X</a>\n\ud83d\udcac <a href=\"https://t.me/Baby_siren\">Telegram Group</a>\n\ud83d\udcc8 <a href=\"https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16\">DexScreener Chart</a>\n\ud83e\udd5e <a href=\"https://pancakeswap.finance/swap?outputCurrency=0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16\">Buy on PancakeSwap</a>\n\nStay safe. Only use official links",
  "\ud83d\udd17 <b>All $BSiren Links</b>\n\n\ud83d\udc26 <a href=\"https://x.com/Baby_siren1\">Twitter/X</a>\n\ud83d\udcac <a href=\"https://t.me/Baby_siren\">Telegram Group</a>\n\ud83d\udcc8 <a href=\"https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16\">Chart</a>\n\ud83e\udd5e <a href=\"https://pancakeswap.finance/swap?outputCurrency=0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16\">Buy</a>\n\nBookmark these. Official links only",
  "\ud83d\udc8e <b>$BSiren Official Links</b>\n\n\ud83d\udc26 <a href=\"https://x.com/Baby_siren1\">X (Twitter)</a>\n\ud83d\udcac <a href=\"https://t.me/Baby_siren\">Telegram Community</a>\n\ud83d\udcc8 <a href=\"https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16\">Live Chart</a>\n\ud83e\udd5e <a href=\"https://pancakeswap.finance/swap?outputCurrency=0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16\">Swap on PancakeSwap</a>"
];

var lastSocialsIndex = -1;
function getSocialsReply() {
  var idx;
  do { idx = Math.floor(Math.random() * socialsReplies.length); } while (idx === lastSocialsIndex && socialsReplies.length > 1);
  lastSocialsIndex = idx;
  return socialsReplies[idx];
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
  await ctx.reply("Baby Siren is live. Ask me anything about $BSiren — CA, how to buy, dev, chart, socials.");
});

bot.on("text", async function(ctx) {
  try {
    var userId = ctx.from && ctx.from.id;
    var text = ctx.message && ctx.message.text && ctx.message.text.trim();
    var chatType = ctx.chat && ctx.chat.type;

    if (!text || text.length < 2) return;
    if (text.startsWith("/") && !isCARequest(text) && !isSocialsRequest(text) && !isXRequest(text)) return;

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
            var warn = await ctx.reply(
              "@" + (ctx.from.username || ctx.from.first_name) + " — links are for admins only. Keep the ocean clean"
            );
            setTimeout(async function() {
              try { await ctx.telegram.deleteMessage(ctx.chat.id, warn.message_id); } catch(e) {}
            }, 10000);
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
            var warnSpam = await ctx.reply(
              "@" + (ctx.from.username || ctx.from.first_name) + " — muted for 5 minutes. Slow down"
            );
            setTimeout(async function() {
              try { await ctx.telegram.deleteMessage(ctx.chat.id, warnSpam.message_id); } catch(e) {}
            }, 15000);
          } catch(e) {}
          return;
        }
      }
    }

    if (isOnCooldown(userId)) return;
    setCooldown(userId);

    // X request — send siren image with X link
    if (isXRequest(text)) {
      var xCaption = "\ud83d\udc26 Follow <b>$BSiren</b> on X\n\nhttps://x.com/Baby_siren1\n\nStay updated. The siren is active \ud83c\udf0a";
      await sendSirenImage(ctx.chat.id, xCaption);
      return;
    }

    // Socials request — all links
    if (isSocialsRequest(text)) {
      await ctx.reply(getSocialsReply(), { parse_mode: "HTML" });
      return;
    }

    if (isCARequest(text)) {
      if (fs.existsSync(SIREN_IMAGE)) {
        // delete old image messages first
        if (sentImageMsgIds[ctx.chat.id] && sentImageMsgIds[ctx.chat.id].length > 0) {
          for (var d = 0; d < sentImageMsgIds[ctx.chat.id].length; d++) {
            try { await ctx.telegram.deleteMessage(ctx.chat.id, sentImageMsgIds[ctx.chat.id][d]); } catch(e) {}
          }
          sentImageMsgIds[ctx.chat.id] = [];
        }
        var sent = await ctx.telegram.sendPhoto(
          ctx.chat.id,
          { source: SIREN_IMAGE },
          {
            caption: getCACaption(),
            parse_mode: "HTML",
            reply_markup: getCopyKeyboard()
          }
        );
        if (!sentImageMsgIds[ctx.chat.id]) sentImageMsgIds[ctx.chat.id] = [];
        sentImageMsgIds[ctx.chat.id].push(sent.message_id);
      } else {
        await ctx.reply(getCACaption(), {
          parse_mode: "HTML",
          reply_markup: getCopyKeyboard()
        });
      }
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
      var welcome = await ctx.reply(
        welcomeText || "Welcome " + name + "! You just found the ocean. $BSiren is live on BNB Chain."
      );
      (function(chatId, msgId) {
        setTimeout(async function() {
          try { await ctx.telegram.deleteMessage(chatId, msgId); } catch(e) {}
        }, 60000);
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
