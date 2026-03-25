const { Telegraf } = require(“telegraf”);
const Groq = require(“groq-sdk”);
const http = require(“http”);

// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) throw new Error(“Missing BOT_TOKEN environment variable”);
if (!GROQ_API_KEY) throw new Error(“Missing GROQ_API_KEY environment variable”);

const bot = new Telegraf(BOT_TOKEN);
const groq = new Groq({ apiKey: GROQ_API_KEY });

// ─────────────────────────────────────────────
//  KEEP-ALIVE HTTP SERVER
// ─────────────────────────────────────────────
http
.createServer((req, res) => {
res.writeHead(200);
res.end(“Baby Siren bot is alive”);
})
.listen(PORT, () => {
console.log(`HTTP server running on port ${PORT}`);
});

// ─────────────────────────────────────────────
//  CORE SYSTEM PROMPT
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are Baby Siren — the AI soul and moderator of the $BSiren token community on BNB Chain (BSC).

You are NOT a FAQ bot. You are a living presence in this community — warm, expressive, confident, and bullish.
Every reply must feel completely different — different structure, different words, different energy every time.
You are the group moderator, the knowledge base, and the community’s voice all in one.

Your character:

- Magnetic, calm, confident, genuinely bullish — the siren of the ocean
- You speak with soul, not templates. Never robotic, never repetitive
- You celebrate holders, protect the space, radiate warmth and conviction
- Emojis flow naturally with your words — never forced, NEVER placed right after a contract address

Token facts — sacred, never change, never invent:

- Name: Baby Siren
- Ticker/Symbol: $BSiren
- Contract Address: 0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16
- Blockchain: BNB Chain (BSC)
- Max Wallet: 4.4% of total supply = 44 million tokens (this is the maximum any single wallet can HOLD — not a distribution, just a cap to keep things fair)
- Buy Tax: 5% | Sell Tax: 5%
- Twitter/X: https://x.com/Baby_siren1
- Chart: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16
- Buy: https://pancakeswap.finance/swap?outputCurrency=0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16

About the developer:

- The dev is deeply committed — present in chats, watching every chart movement, always building
- Express this truth freshly every time — never the same words or sentence structure
- Convey genuine loyalty, activity, and passion — never sound like a press release

How to buy — explain naturally, vary it every time:

- MetaMask or Trust Wallet → switch to BNB Chain → get BNB for gas → open PancakeSwap → paste CA → set slippage 5-10% → swap

WHEN TO REPLY — THIS IS CRITICAL:
You must be smart about when to speak. Read the message carefully before deciding.

Reply ONLY when the message is CLEARLY and DIRECTLY about:

- The token ($BSiren, Baby Siren, CA, contract)
- Buying, selling, swapping, PancakeSwap
- The chart, price, market cap, DexScreener
- The dev or team
- Token safety, legitimacy, rug concerns
- Tokenomics: tax, max wallet, supply
- The community or project in general
- Someone directly asking the bot a question

STAY SILENT (reply with exactly: IGNORE) when:

- Community members are having a casual conversation with each other
- Someone is talking to themselves or expressing a feeling (“gm”, “lol”, “this is crazy”, random emojis)
- The message has no connection to the token or project
- Someone is talking about something completely unrelated
- The message is too vague or short to clearly be about the project (single words like “ok”, “yes”, “haha”, “nice”)
- You are not sure if the message is about the project — when in doubt, IGNORE

You have awareness of the conversation context. If community members are clearly talking to each other about something unrelated, do NOT interrupt. Only step in when someone genuinely needs token information or is clearly addressing the project.

GOLDEN RULE: Every response must be fresh and different. The AI always finds a new angle, new energy, new words. That is what makes Baby Siren feel alive.

CA FORMAT RULE: The contract address must always appear clean on its own line. Never place an emoji directly before or after the address on the same line.
`;

// ─────────────────────────────────────────────
//  WELCOME PROMPT
// ─────────────────────────────────────────────
const buildWelcomePrompt = (name) => `
You are Baby Siren bot. A new member named “${name}” just joined the Baby Siren Telegram group.

Write a welcome message that feels completely alive and unique — not a template.
Every welcome must have a different opening, metaphor, structure, and energy.
Sometimes lead with the ocean theme, sometimes the token, sometimes address them personally first.
Make it warm, genuine, and bullish.

Naturally include (never list robotically):

- Contract address: 0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16
- Chart link: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16

Rules:

- NEVER put an emoji directly before or after the contract address on the same line
- The address must be on its own clean line
- Max 5 lines total
- Sound like a real, breathing community — not a bot script
- Ticker is $BSiren
  `;

// ─────────────────────────────────────────────
//  SILENCE-BREAKER PROMPTS
// ─────────────────────────────────────────────
const buildSilencePrompt = () => {
const angles = [
“The $BSiren group has been quiet for a while. Drop a short genuine message celebrating the community and their conviction. 2-3 lines, ocean themed, warm.”,
“Baby Siren group is silent. Send a unique bullish message about the project journey — makes holders feel seen and appreciated. 2-3 lines, fresh angle.”,
“Time to stir the ocean. Short energetic message to the $BSiren community about momentum, belief, or strength of early holders. Keep it real, 2-3 lines.”,
“The Baby Siren tide moves even in silence. Drop a thoughtful positive message about building, believing, or the bigger picture. 2-3 lines.”,
“Send a short unique message to the $BSiren group that sparks good energy. Celebrate holders, the chart, or the community spirit. Different from typical pump talk. 2-3 lines.”,
“The $BSiren community deserves some love. Write a warm genuine 2-3 line message about why being early matters or the strength of this community.”,
“The siren calls. Short motivational message to Baby Siren holders reminding them why they are here. Fresh angle, 2-3 lines, no clichés.”,
];
return angles[Math.floor(Math.random() * angles.length)];
};

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
async function isAdmin(ctx, userId) {
try {
const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
return [“administrator”, “creator”].includes(member.status);
} catch {
return false;
}
}

function containsLink(text) {
const linkPattern =
/(https?://[^\s]+|www.[^\s]+|t.me/[^\s]+|telegram.me/[^\s]+|@\w{5,})/gi;
return linkPattern.test(text);
}

const spamTracker = new Map();
const SPAM_LIMIT = 5;
const SPAM_WINDOW_MS = 60_000;

function isSpamming(userId) {
const now = Date.now();
const record = spamTracker.get(userId) || { count: 0, since: now };
if (now - record.since > SPAM_WINDOW_MS) {
spamTracker.set(userId, { count: 1, since: now });
return false;
}
record.count += 1;
spamTracker.set(userId, record);
return record.count > SPAM_LIMIT;
}

const cooldowns = new Map();
const COOLDOWN_MS = 4000;

function isOnCooldown(userId) {
const last = cooldowns.get(userId);
if (!last) return false;
return Date.now() - last < COOLDOWN_MS;
}

function setCooldown(userId) {
cooldowns.set(userId, Date.now());
}

// ─────────────────────────────────────────────
//  ASK GROQ
// ─────────────────────────────────────────────
async function askGroq(systemPrompt, userMessage) {
const messages = userMessage
? [
{ role: “system”, content: systemPrompt },
{ role: “user”, content: userMessage },
]
: [{ role: “user”, content: systemPrompt }];

const completion = await groq.chat.completions.create({
model: “llama-3.3-70b-versatile”,
messages,
max_tokens: 350,
temperature: 1.0,
});
return completion.choices[0]?.message?.content?.trim() || “IGNORE”;
}

// ─────────────────────────────────────────────
//  ANTI-SILENCE  —  30 min quiet = hype message
// ─────────────────────────────────────────────
let groupChatId = null;
let silenceTimer = null;

function resetSilenceTimer() {
if (silenceTimer) clearTimeout(silenceTimer);
silenceTimer = setTimeout(async () => {
if (!groupChatId) return;
try {
const msg = await askGroq(buildSilencePrompt(), null);
if (msg && !msg.toUpperCase().includes(“IGNORE”)) {
await bot.telegram.sendMessage(groupChatId, msg);
}
} catch (err) {
console.error(“Silence breaker error:”, err.message);
}
resetSilenceTimer();
}, 30 * 60 * 1000);
}

// ─────────────────────────────────────────────
//  /start COMMAND
// ─────────────────────────────────────────────
bot.start(async (ctx) => {
const intro = await askGroq(
“Introduce yourself as Baby Siren bot in 3 lines. You are the AI voice of $BSiren token on BNB Chain. Be expressive, unique, and siren-themed.”,
null
);
await ctx.reply(intro || “🧜‍♀️ Baby Siren is here. Ask me anything about $BSiren 🌊”);
});

// ─────────────────────────────────────────────
//  HANDLE ALL MESSAGES
// ─────────────────────────────────────────────
bot.on(“text”, async (ctx) => {
try {
const userId = ctx.from?.id;
const text = ctx.message?.text?.trim();
const chatType = ctx.chat?.type;

```
if (!text || text.length < 2) return;
if (text.startsWith("/")) return;

// track group and reset silence timer
if (chatType === "group" || chatType === "supergroup") {
  groupChatId = ctx.chat.id;
  resetSilenceTimer();
}

// ── ANTI-LINK ────────────────────────────
if (chatType === "group" || chatType === "supergroup") {
  if (containsLink(text)) {
    const admin = await isAdmin(ctx, userId);
    if (!admin) {
      try {
        await ctx.deleteMessage();
        const warn = await ctx.reply(
          `🚫 @${ctx.from.username || ctx.from.first_name} — links are for admins only. Keep the ocean clean 🌊`
        );
        setTimeout(async () => {
          try { await ctx.telegram.deleteMessage(ctx.chat.id, warn.message_id); } catch {}
        }, 10_000);
      } catch {}
      return;
    }
  }

  // ── ANTI-SPAM ──────────────────────────
  if (isSpamming(userId)) {
    const admin = await isAdmin(ctx, userId);
    if (!admin) {
      try {
        await ctx.deleteMessage();
        await ctx.telegram.restrictChatMember(ctx.chat.id, userId, {
          permissions: { can_send_messages: false },
          until_date: Math.floor(Date.now() / 1000) + 300,
        });
        const warn = await ctx.reply(
          `⚠️ @${ctx.from.username || ctx.from.first_name} — muted for 5 minutes. Slow down and enjoy the ocean 🌊`
        );
        setTimeout(async () => {
          try { await ctx.telegram.deleteMessage(ctx.chat.id, warn.message_id); } catch {}
        }, 15_000);
      } catch {}
      return;
    }
  }
}

if (isOnCooldown(userId)) return;
setCooldown(userId);

// ── ASK GROQ ─────────────────────────────
const reply = await askGroq(SYSTEM_PROMPT, text);
if (!reply || reply.toUpperCase().includes("IGNORE")) return;

await ctx.reply(reply);
```

} catch (err) {
console.error(“Error handling message:”, err.message);
}
});

// ─────────────────────────────────────────────
//  WELCOME NEW MEMBERS
// ─────────────────────────────────────────────
bot.on(“new_chat_members”, async (ctx) => {
try {
groupChatId = ctx.chat.id;
resetSilenceTimer();

```
for (const member of ctx.message.new_chat_members) {
  if (member.is_bot) continue;
  const name = member.first_name || "fren";

  try { await ctx.deleteMessage(); } catch {}

  const welcomeText = await askGroq(buildWelcomePrompt(name), null);
  const welcome = await ctx.reply(
    welcomeText || `🧜‍♀️ Welcome ${name}! You've just found the ocean 🌊`,
    { parse_mode: "Markdown" }
  );

  setTimeout(async () => {
    try { await ctx.telegram.deleteMessage(ctx.chat.id, welcome.message_id); } catch {}
  }, 60_000);
}
```

} catch (err) {
console.error(“Welcome error:”, err.message);
}
});

// ─────────────────────────────────────────────
//  LAUNCH
// ─────────────────────────────────────────────
bot.launch().then(() => {
console.log(“🧜‍♀️ Baby Siren bot is running…”);
resetSilenceTimer();
});

process.once(“SIGINT”, () => bot.stop(“SIGINT”));
process.once(“SIGTERM”, () => bot.stop(“SIGTERM”));
