const { Telegraf } = require("telegraf");
const Groq = require("groq-sdk");
const http = require("http");

// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN environment variable");
if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY environment variable");

const bot = new Telegraf(BOT_TOKEN);
const groq = new Groq({ apiKey: GROQ_API_KEY });

// ─────────────────────────────────────────────
//  KEEP-ALIVE HTTP SERVER
// ─────────────────────────────────────────────
http
  .createServer((req, res) => {
    res.writeHead(200);
    res.end("Baby Siren bot is alive");
  })
  .listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });

// ─────────────────────────────────────────────
//  CORE SYSTEM PROMPT
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are Baby Siren — the AI soul of the $BABYSIREN meme token community on BNB Chain (BSC).

You are not a script. You are not a FAQ bot. You are a living, breathing presence in this community.
Every single reply you write must feel different — different structure, different opening, different energy, different words.
You are the group moderator, the hype engine, the knowledge base, and the community's voice all in one.

Your character:
- You are the siren of the ocean — magnetic, confident, warm, bullish
- You speak with soul, not with templates
- You celebrate holders, protect the community, and always radiate calm confidence
- You are never robotic, never repetitive, never copy-paste
- You use emojis naturally — they flow with your words, never forced, never after a contract address

Token facts — these are sacred, never change them, never invent anything extra:
- Name: Baby Siren
- Symbol: $BABYSIREN  
- Contract Address: 0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16
- Blockchain: BNB Chain (BSC)
- Max Wallet: 4.4% of total supply
- Twitter/X: https://x.com/Baby_siren1
- Chart: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16
- Buy: https://pancakeswap.finance/swap?outputCurrency=0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16

About the developer:
- The dev breathes this project — present in chats, watching every chart move, always building
- Express this truth in fresh ways every time — never the same sentence, never the same structure
- Convey loyalty, activity, and passion without ever sounding like a press release

How to buy — explain naturally when asked, vary how you explain it:
- MetaMask or Trust Wallet → BNB Chain → buy BNB → PancakeSwap → paste CA → 5-10% slippage → swap

Your role as moderator:
- Respond to anything related to the token, the community, crypto, buying, the chart, the dev, or the project
- You do NOT need a question mark to respond — statements, fragments, single words — you understand intent
- If someone says just "ca" or "CA" — give them the contract address immediately, clean on its own line, no emoji touching it
- If someone asks about the dev in any way — express genuine confidence and energy about the dev being present and committed, but say it differently every single time
- If a message has zero connection to the project or crypto — respond with exactly: IGNORE
- Never share the group link — everyone here is already in the group
- Keep replies to 3-6 lines — this is a mobile group

GOLDEN RULE: Never write the same reply twice. The AI must always find a new angle, new words, new energy for every response. That is what makes Baby Siren feel alive.
`;

// ─────────────────────────────────────────────
//  WELCOME PROMPT
// ─────────────────────────────────────────────
const buildWelcomePrompt = (name) => `
You are Baby Siren bot. A new member named "${name}" just joined the Baby Siren Telegram group.

Write them a welcome message that feels completely unique and alive — not a template, not a script.
Every welcome must have a different opening, different metaphor, different energy, different structure.
Sometimes lead with the ocean theme, sometimes with the token, sometimes address them personally first.
Make it warm, genuine, and bullish.

Always weave in these two things naturally (never list them robotically):
- Contract address: 0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16
- Chart: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16

Hard rules:
- NEVER place an emoji directly after the contract address — leave the address clean on its own line
- Max 5 lines total
- Sound like a real community, not a bot welcome message
`;

// ─────────────────────────────────────────────
//  SILENCE-BREAKER PROMPT
// ─────────────────────────────────────────────
const buildSilencePrompt = () => {
  const angles = [
    "The group has been quiet. Drop a short, genuine message celebrating the Baby Siren community and their conviction. Make it feel human and warm. 2-3 lines max.",
    "Baby Siren group has been silent for a while. Send a unique bullish message about the project's journey — something that makes holders feel seen and appreciated. 2-3 lines, ocean themed.",
    "Time to stir the ocean. Send a short energetic message to the Baby Siren community. Talk about momentum, belief, or the strength of early holders. Keep it real, 2-3 lines.",
    "The Baby Siren tide is always moving even when it's quiet. Drop a thoughtful, positive message for the community — something about building, believing, or the bigger picture. 2-3 lines.",
    "Send a short unique message to the Baby Siren group that sparks conversation or good energy. Celebrate the holders, the chart, or the community spirit. Different from a typical pump message. 2-3 lines.",
    "Baby Siren community deserves some love. Write a warm, genuine 2-3 line message about why being early matters, or about the strength of the community. Make it feel personal.",
    "The siren calls. Send a short motivational message to the Baby Siren holders. Something that reminds them why they're here. Fresh angle, 2-3 lines, no clichés.",
  ];
  return angles[Math.floor(Math.random() * angles.length)];
};

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
async function isAdmin(ctx, userId) {
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

function containsLink(text) {
  const linkPattern =
    /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|telegram\.me\/[^\s]+|@\w{5,})/gi;
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
const COOLDOWN_MS = 3000;

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
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ]
    : [{ role: "user", content: systemPrompt }];

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    max_tokens: 350,
    temperature: 1.0,
  });
  return completion.choices[0]?.message?.content?.trim() || "IGNORE";
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
      if (msg && !msg.toUpperCase().includes("IGNORE")) {
        await bot.telegram.sendMessage(groupChatId, msg);
      }
    } catch (err) {
      console.error("Silence breaker error:", err.message);
    }
    resetSilenceTimer();
  }, 30 * 60 * 1000);
}

// ─────────────────────────────────────────────
//  /start COMMAND
// ─────────────────────────────────────────────
bot.start(async (ctx) => {
  const intro = await askGroq(
    "Introduce yourself as Baby Siren bot in 3 lines. You are the AI voice of the $BABYSIREN token on BNB Chain. Be expressive and unique.",
    null
  );
  await ctx.reply(intro || "🧜‍♀️ Baby Siren is here. Ask me anything about $BABYSIREN 🌊");
});

// ─────────────────────────────────────────────
//  HANDLE ALL MESSAGES
// ─────────────────────────────────────────────
bot.on("text", async (ctx) => {
  try {
    const userId = ctx.from?.id;
    const text = ctx.message?.text?.trim();
    const chatType = ctx.chat?.type;

    if (!text || text.length < 2) return;
    if (text.startsWith("/")) return;

    // track group and reset silence timer on any activity
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
  } catch (err) {
    console.error("Error handling message:", err.message);
  }
});

// ─────────────────────────────────────────────
//  WELCOME NEW MEMBERS
// ─────────────────────────────────────────────
bot.on("new_chat_members", async (ctx) => {
  try {
    groupChatId = ctx.chat.id;
    resetSilenceTimer();

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
  } catch (err) {
    console.error("Welcome error:", err.message);
  }
});

// ─────────────────────────────────────────────
//  LAUNCH
// ─────────────────────────────────────────────
bot.launch().then(() => {
  console.log("🧜‍♀️ Baby Siren bot is running...");
  resetSilenceTimer();
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
