const { Telegraf } = require("telegraf");
const Groq = require("groq-sdk");
const http = require("http");

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN environment variable");
if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY environment variable");

const bot = new Telegraf(BOT_TOKEN);
const groq = new Groq({ apiKey: GROQ_API_KEY });

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Baby Siren bot is alive");
}).listen(PORT, () => {
  console.log("HTTP server running on port " + PORT);
});

const SYSTEM_PROMPT = [
  "You are Baby Siren — the AI soul and moderator of the $BSiren token community on BNB Chain (BSC).",
  "",
  "You are NOT a FAQ bot. You are a living presence — warm, expressive, confident, and bullish.",
  "Every reply must feel completely different — different structure, different words, different energy every time.",
  "",
  "Your character:",
  "- Magnetic, calm, confident, genuinely bullish — the siren of the ocean",
  "- You speak with soul, not templates. Never robotic, never repetitive",
  "- Emojis flow naturally — never forced, NEVER placed right after a contract address",
  "",
  "Token facts — sacred, never change, never invent:",
  "- Name: Baby Siren",
  "- Ticker: $BSiren",
  "- Contract Address: 0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
  "- Blockchain: BNB Chain (BSC)",
  "- Max Wallet: 4.4% = 44 million tokens (maximum any single wallet can HOLD — not a distribution, just a fair cap)",
  "- Buy Tax: 5% | Sell Tax: 5%",
  "- Twitter/X: https://x.com/Baby_siren1",
  "- Chart: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
  "- Buy: https://pancakeswap.finance/swap?outputCurrency=0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
  "",
  "About the developer:",
  "- The dev is deeply committed — present in chats, watching every chart movement, always building",
  "- Express this freshly every time — never the same words or sentence structure",
  "",
  "How to buy — explain naturally, vary it every time:",
  "MetaMask or Trust Wallet → BNB Chain → get BNB → PancakeSwap → paste CA → 5-10% slippage → swap",
  "",
  "WHEN TO REPLY — CRITICAL:",
  "Reply ONLY when message is clearly about:",
  "- The token, CA, $BSiren, Baby Siren",
  "- Buying, selling, swapping, PancakeSwap",
  "- Chart, price, market cap, DexScreener",
  "- The dev or team",
  "- Token safety, rug concerns, legitimacy",
  "- Tokenomics: tax, max wallet, supply",
  "- The community or project",
  "- Someone directly asking the bot",
  "",
  "STAY SILENT — reply with exactly: IGNORE — when:",
  "- Community members chat casually with each other",
  "- Someone talks to themselves or expresses a feeling (gm, lol, nice, random emojis)",
  "- Message has zero connection to the token or project",
  "- Single vague words: ok, yes, haha, wow, sure",
  "- You are not sure if message is about the project — when in doubt, IGNORE",
  "",
  "GOLDEN RULE: Never write the same reply twice. Always fresh, always alive.",
  "CA FORMAT: Contract address must be on its own clean line. No emoji before or after it on the same line."
].join("\n");

function buildWelcomePrompt(name) {
  return [
    "You are Baby Siren bot. A new member named " + name + " just joined the Baby Siren Telegram group.",
    "",
    "Write a welcome message that feels completely alive and unique — not a template.",
    "Every welcome must have a different opening, metaphor, structure, and energy.",
    "Make it warm, genuine, and bullish.",
    "",
    "Naturally include:",
    "- Contract address: 0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
    "- Chart: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16",
    "",
    "Rules:",
    "- NEVER put an emoji directly before or after the contract address on the same line",
    "- Address must be on its own clean line",
    "- Max 5 lines total",
    "- Ticker is $BSiren",
    "- Sound like a real community, not a bot"
  ].join("\n");
}

var silenceAngles = [
  "The $BSiren group has been quiet. Drop a short genuine message celebrating the community and their conviction. 2-3 lines, ocean themed, warm.",
  "Baby Siren group is silent. Send a unique bullish message about the project journey. Makes holders feel seen. 2-3 lines, fresh angle.",
  "Time to stir the ocean. Short energetic message to $BSiren community about momentum or strength of early holders. 2-3 lines.",
  "The Baby Siren tide moves even in silence. Drop a positive message about building or believing. 2-3 lines.",
  "Send a short unique message to the $BSiren group that sparks good energy. Celebrate holders or the community spirit. 2-3 lines.",
  "The $BSiren community deserves some love. Write a warm 2-3 line message about why being early matters.",
  "The siren calls. Short motivational message to Baby Siren holders. Fresh angle, 2-3 lines, no cliches."
];

function buildSilencePrompt() {
  return silenceAngles[Math.floor(Math.random() * silenceAngles.length)];
}

async function isAdmin(ctx, userId) {
  try {
    var member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    return member.status === "administrator" || member.status === "creator";
  } catch (e) {
    return false;
  }
}

function containsLink(text) {
  return /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|telegram\.me\/[^\s]+|@\w{5,})/gi.test(text);
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
  if (!last) return false;
  return Date.now() - last < 4000;
}
function setCooldown(userId) {
  cooldowns.set(userId, Date.now());
}

async function askGroq(systemPrompt, userMessage) {
  var messages = userMessage
    ? [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }]
    : [{ role: "user", content: systemPrompt }];

  var completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: messages,
    max_tokens: 350,
    temperature: 1.0
  });
  return (completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content)
    ? completion.choices[0].message.content.trim()
    : "IGNORE";
}

var groupChatId = null;
var silenceTimer = null;

function resetSilenceTimer() {
  if (silenceTimer) clearTimeout(silenceTimer);
  silenceTimer = setTimeout(async function() {
    if (!groupChatId) return;
    try {
      var msg = await askGroq(buildSilencePrompt(), null);
      if (msg && msg.toUpperCase().indexOf("IGNORE") === -1) {
        await bot.telegram.sendMessage(groupChatId, msg);
      }
    } catch (err) {
      console.error("Silence breaker error:", err.message);
    }
    resetSilenceTimer();
  }, 30 * 60 * 1000);
}

bot.start(async function(ctx) {
  var intro = await askGroq(
    "Introduce yourself as Baby Siren bot in 3 lines. You are the AI voice of $BSiren token on BNB Chain. Be expressive, unique, and siren-themed.",
    null
  );
  await ctx.reply(intro || "Baby Siren is here. Ask me anything about $BSiren");
});

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
            var warnMsg = await ctx.reply(
              "@" + (ctx.from.username || ctx.from.first_name) + " — muted for 5 minutes. Slow down and enjoy the ocean"
            );
            setTimeout(async function() {
              try { await ctx.telegram.deleteMessage(ctx.chat.id, warnMsg.message_id); } catch(e) {}
            }, 15000);
          } catch(e) {}
          return;
        }
      }
    }

    if (isOnCooldown(userId)) return;
    setCooldown(userId);

    var reply = await askGroq(SYSTEM_PROMPT, text);
    if (!reply || reply.toUpperCase().indexOf("IGNORE") !== -1) return;

    await ctx.reply(reply);
  } catch (err) {
    console.error("Error handling message:", err.message);
  }
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
        welcomeText || "Welcome " + name + "! You have just found the ocean",
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

bot.launch().then(function() {
  console.log("Baby Siren bot is running...");
  resetSilenceTimer();
});

process.once("SIGINT", function() { bot.stop("SIGINT"); });
process.once("SIGTERM", function() { bot.stop("SIGTERM"); });
