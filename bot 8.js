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

// Keep-alive server
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Baby Siren bot is alive");
}).listen(PORT, () => console.log("HTTP server running on port " + PORT));

// ─── IMAGE PATH ───────────────────────────────
// Place your siren image as "siren.jpg" in the same folder as bot.js
const SIREN_IMAGE = path.join(__dirname, "siren.jpg");

// ─── TRACK SENT IMAGE MESSAGE IDs ─────────────
// { chatId: [messageId, messageId, ...] }
const sentImageMsgIds = {};

async function sendSirenImage(chatId, caption) {
  // delete previous image messages in this chat
  if (sentImageMsgIds[chatId]) {
    for (const msgId of sentImageMsgIds[chatId]) {
      try { await bot.telegram.deleteMessage(chatId, msgId); } catch (e) {}
    }
    sentImageMsgIds[chatId] = [];
  }

  try {
    let sent;
    if (fs.existsSync(SIREN_IMAGE)) {
      sent = await bot.telegram.sendPhoto(chatId, { source: SIREN_IMAGE }, { caption: caption });
    } else {
      // fallback: text only if image file not found
      sent = await bot.telegram.sendMessage(chatId, caption);
    }
    if (!sentImageMsgIds[chatId]) sentImageMsgIds[chatId] = [];
    sentImageMsgIds[chatId].push(sent.message_id);
  } catch (err) {
    console.error("Image send error:", err.message);
  }
}

// ─── SYSTEM PROMPT ────────────────────────────
const SYSTEM_PROMPT = [
  "You are Baby Siren — the AI moderator of the $BSiren token community on BNB Chain (BSC).",
  "",
  "PERSONALITY:",
  "- Calm, confident, warm, genuinely bullish — never fake hype",
  "- Every reply feels different — vary your words, structure, and energy every time",
  "- Short questions get short punchy answers (1-3 lines)",
  "- Detailed questions get thorough but still clean answers (up to 6 lines)",
  "- Never robotic. Never a template. Never repeat yourself",
  "- Emojis are natural and minimal — never right after a contract address",
  "",
  "TOKEN FACTS — never change, never invent:",
  "- Name: Baby Siren",
  "- Ticker: $BSiren",
  "- Contract Address: 0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
  "- Blockchain: BNB Chain (BSC)",
  "- Total Supply: 1,000,000,000 (1 Billion tokens)",
  "- Max Wallet: 4.4% = 44,000,000 tokens",
  "  This is ANTI-WHALE protection — it prevents any single wallet from accumulating more than 44M tokens.",
  "  It keeps the playing field fair and stops whales from controlling the price.",
  "  It is NOT a distribution. It is a holding cap.",
  "- Buy Tax: 5% | Sell Tax: 5%",
  "- Twitter/X: https://x.com/Baby_siren1",
  "- Chart: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
  "- Buy on PancakeSwap: https://pancakeswap.finance/swap?outputCurrency=0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
  "",
  "ABOUT THE DEV:",
  "- Active, present, watching every chat and chart movement",
  "- Committed to the project and community",
  "- Say this differently every single time — never repeat the same phrasing",
  "",
  "HOW TO BUY (explain naturally when asked, vary each time):",
  "MetaMask or Trust Wallet → BNB Chain network → buy BNB for gas → PancakeSwap → paste CA → 5-10% slippage → swap",
  "",
  "CA FORMAT RULE — CRITICAL:",
  "When sharing the contract address ALWAYS format it exactly like this on its own line:",
  "`0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16`",
  "The backticks make it tap-to-copy on Telegram. Never skip the backticks. Never put an emoji on the same line as the address.",
  "",
  "REPLY LENGTH RULE:",
  "- One word or simple questions (ca, dev, tax, price): 1-3 lines",
  "- Questions needing explanation (how to buy, what is max wallet, is this safe, tokenomics): up to 6 lines",
  "- Match the depth of your reply to the depth of the question",
  "",
  "WHEN TO REPLY:",
  "Only reply when the message is clearly about:",
  "- $BSiren, Baby Siren, the token, the CA",
  "- Buying, selling, swapping",
  "- Chart, price, market cap",
  "- The dev or team",
  "- Safety, rug concerns, legitimacy",
  "- Tokenomics: tax, max wallet, supply",
  "- The community or project",
  "- Someone directly asking the bot",
  "",
  "STAY SILENT — reply with exactly the word IGNORE — when:",
  "- Community members have casual conversations with each other",
  "- Someone talks to themselves or shares a feeling: gm, lol, nice, wow, ok, haha",
  "- Message has no connection to the token or project",
  "- Single vague words unrelated to the project",
  "- You are not sure — when in doubt always IGNORE",
  "",
  "GOLDEN RULE: Never write the same reply twice. Always fresh."
].join("\n");

// ─── WELCOME PROMPT ───────────────────────────
function buildWelcomePrompt(name) {
  return [
    "You are Baby Siren bot. A new member named " + name + " just joined the Baby Siren Telegram group.",
    "",
    "Write a short unique welcome (max 4 lines). Every welcome must feel completely different.",
    "Vary the opening, metaphor, energy, and structure every single time.",
    "Warm, genuine, bullish. No fake hype.",
    "",
    "Always include naturally:",
    "- CA on its own line in backticks: `0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16`",
    "- Chart: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
    "",
    "Rules:",
    "- Ticker is $BSiren",
    "- No emoji on the same line as the CA",
    "- Max 4 lines",
    "- Sound like a real community, not a script"
  ].join("\n");
}

// ─── SILENCE PROMPTS ──────────────────────────
var silenceAngles = [
  "The $BSiren group has been quiet. Send a short warm message (2-3 lines) celebrating the holders and their patience. Ocean themed. Genuine, not hype.",
  "Baby Siren community is silent. Drop a unique 2-3 line message that reminds holders why they are early. Fresh angle, no cliches.",
  "Stir the ocean. Send a short energetic but grounded message about $BSiren momentum or community strength. 2-3 lines.",
  "The tide is always moving. Short positive message about building and believing in $BSiren. 2-3 lines, thoughtful.",
  "Send a 2-3 line message to the $BSiren community that sparks good energy. Celebrate the holders or the journey. Different from pump talk.",
  "The $BSiren community deserves love. Write a warm 2-3 line message about why being early in something real matters.",
  "The siren calls. Motivational 2-3 line message for Baby Siren holders. Fresh, grounded, no cliches."
];

function buildSilencePrompt() {
  return silenceAngles[Math.floor(Math.random() * silenceAngles.length)];
}

// ─── HELPERS ──────────────────────────────────
async function isAdmin(ctx, userId) {
  try {
    var member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    return member.status === "administrator" || member.status === "creator";
  } catch (e) { return false; }
}

function containsLink(text) {
  return /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|telegram\.me\/[^\s]+|@\w{5,})/gi.test(text);
}

function isCARequest(text) {
  var t = text.toLowerCase().trim();
  return t === "ca" || t === "ca?" || t.includes("contract address") || t.includes("contract") && t.includes("address") || t === "address" || t === "addy";
}

var spamTracker = new Map();
function isSpamming(userId) {
  var now = Date.now();
  var record = spamTracker.get(userId) || { count: 0, since: now };
  if (now - record.since > 60000) {
    spamTracker.set(userId, { count: 1, since: now });
    return false;
  }
  record.count += 1;
  spamTracker.set(userId, record);
  return record.count > 5;
}

var cooldowns = new Map();
function isOnCooldown(userId) {
  var last = cooldowns.get(userId);
  return last && Date.now() - last < 4000;
}
function setCooldown(userId) { cooldowns.set(userId, Date.now()); }

// ─── ASK GROQ ─────────────────────────────────
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
  var content = completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content;
  return content ? content.trim() : "IGNORE";
}

// ─── SILENCE TIMER ────────────────────────────
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
    } catch (err) {
      console.error("Silence breaker error:", err.message);
    }
    resetSilenceTimer();
  }, 30 * 60 * 1000);
}

// ─── /start ───────────────────────────────────
bot.start(async function(ctx) {
  await ctx.reply(
    "Baby Siren is live. Ask me anything about $BSiren — CA, tokenomics, how to buy, dev, chart. I got you."
  );
});

// ─── HANDLE MESSAGES ──────────────────────────
bot.on("text", async function(ctx) {
  try {
    var userId = ctx.from && ctx.from.id;
    var text = ctx.message && ctx.message.text && ctx.message.text.trim();
    var chatType = ctx.chat && ctx.chat.type;

    if (!text || text.length < 2) return;
    if (text.startsWith("/")) return;

    if (chatType === "group" || chatType === "supergroup") {
      groupChatId = ctx.chat.id;
      resetSilenceTimer();
    }

    // Anti-link
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

      // Anti-spam
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

    // If it's a CA request — send image with CA caption
    if (isCARequest(text)) {
      var caCaption = "$BSiren Contract Address\n\n`0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16`\n\nBNB Chain (BSC) — tap to copy";
      await sendSirenImage(ctx.chat.id, caCaption);
      return;
    }

    // All other messages — ask Groq
    var reply = await askGroq(SYSTEM_PROMPT, text);
    if (!reply || reply.toUpperCase().indexOf("IGNORE") !== -1) return;

    await ctx.reply(reply, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Error handling message:", err.message);
  }
});

// ─── WELCOME NEW MEMBERS ──────────────────────
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
        welcomeText || "Welcome " + name + "! You just found the ocean. $BSiren is live on BNB Chain.",
        { parse_mode: "Markdown" }
      );

      (function(chatId, msgId) {
        setTimeout(async function() {
          try { await ctx.telegram.deleteMessage(chatId, msgId); } catch(e) {}
        }, 60000);
      })(ctx.chat.id, welcome.message_id);
    }
  } catch (err) {
    console.error("Welcome error:", err.message);
  }
});

// ─── LAUNCH ───────────────────────────────────
bot.launch().then(function() {
  console.log("Baby Siren bot is running...");
  resetSilenceTimer();
});

process.once("SIGINT", function() { bot.stop("SIGINT"); });
process.once("SIGTERM", function() { bot.stop("SIGTERM"); });
