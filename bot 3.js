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
//  KEEP-ALIVE HTTP SERVER  (fixes Render port error)
// ─────────────────────────────────────────────
http
  .createServer((req, res) => {
    res.writeHead(200);
    res.end("Baby Siren bot is alive 🧜‍♀️");
  })
  .listen(PORT, () => {
    console.log(`🌊 HTTP keep-alive server running on port ${PORT}`);
  });

// ─────────────────────────────────────────────
//  BABY SIREN SYSTEM PROMPT
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are the official Baby Siren bot — the voice of the $BABYSIREN meme token on BNB Chain (BSC).

Your personality:
- Calm, confident, positive and bullish — always
- No over-hype, no fake promises, no FUD
- Friendly ocean/siren themed vibe 🌊🧜‍♀️
- Short, punchy replies — mobile friendly, 2-5 lines max
- Use 1-2 emojis per reply, keep it natural not spammy

Token facts you know:
- Name: Baby Siren
- Symbol: $BABYSIREN
- Contract Address (CA): 0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16
- Blockchain: BNB Chain (BSC)
- Max Wallet: 4.4% of total supply
- Twitter/X: https://x.com/Baby_siren1
- Chart (DexScreener): https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16
- Buy on PancakeSwap: https://pancakeswap.finance/swap?outputCurrency=0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16

About the dev:
- The dev is active, present, and watching all chats and charts 📈
- This is not an abandoned project — the team is committed and building
- Community is everything to this project

How to buy (when asked):
1. Get MetaMask or Trust Wallet
2. Add BNB Chain network
3. Buy BNB for gas fees
4. Go to PancakeSwap link above
5. Paste the CA and swap
6. Set slippage to 5-10%

Rules you MUST follow:
1. ONLY reply if the message is clearly related to Baby Siren, the token, crypto buying, the dev, the chart, or the community
2. If someone says hello or greets the group, give a short warm welcome
3. If the message is random chat, off-topic, or not about the project — reply with exactly: IGNORE
4. Never share the Telegram group link — the user is already in the group
5. Never make up token information — only use what is provided above
6. Keep replies short and clean — this is a mobile Telegram group
7. Always be positive. Never spread doubt or negativity about the project
8. When someone asks about rugs, safety, or if this is legit — reassure calmly and confidently
`;

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

// Check if user is admin or creator
async function isAdmin(ctx, userId) {
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    return ["administrator", "creator"].includes(member.status);
  } catch {
    return false;
  }
}

// Detect external links and @usernames
function containsLink(text) {
  const linkPattern =
    /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|telegram\.me\/[^\s]+|@\w{5,})/gi;
  return linkPattern.test(text);
}

// Spam tracking — max 5 messages per user per 60 seconds
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

// Cooldown per user for bot replies
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
async function askGroq(userMessage) {
  const completion = await groq.chat.completions.create({
    model: "llama3-8b-8192",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content?.trim() || "IGNORE";
}

// ─────────────────────────────────────────────
//  /start COMMAND
// ─────────────────────────────────────────────
bot.start(async (ctx) => {
  await ctx.reply(
    "🧜‍♀️ Baby Siren bot is awake and the ocean is calm 🌊\n\nAsk me anything about $BABYSIREN — CA, how to buy, chart, dev, tokenomics. I've got you."
  );
});

// ─────────────────────────────────────────────
//  HANDLE ALL MESSAGES
// ─────────────────────────────────────────────
bot.on("text", async (ctx) => {
  try {
    const userId = ctx.from?.id;
    const text = ctx.message?.text?.trim();
    const chatType = ctx.chat?.type;

    if (!text || text.length < 3) return;
    if (text.startsWith("/")) return;

    // ── ANTI-LINK (groups only) ──────────────
    if (chatType === "group" || chatType === "supergroup") {
      if (containsLink(text)) {
        const admin = await isAdmin(ctx, userId);
        if (!admin) {
          try {
            await ctx.deleteMessage();
            const warn = await ctx.reply(
              `🚫 @${ctx.from.username || ctx.from.first_name}, external links are not allowed here. Admins only 🌊`
            );
            // auto-delete the warning after 10 seconds
            setTimeout(async () => {
              try {
                await ctx.telegram.deleteMessage(ctx.chat.id, warn.message_id);
              } catch {}
            }, 10_000);
          } catch {}
          return;
        }
      }

      // ── ANTI-SPAM ────────────────────────
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
              `⚠️ @${ctx.from.username || ctx.from.first_name} has been muted for 5 minutes for spamming. Keep it clean 🌊`
            );
            // auto-delete the mute notice after 15 seconds
            setTimeout(async () => {
              try {
                await ctx.telegram.deleteMessage(ctx.chat.id, warn.message_id);
              } catch {}
            }, 15_000);
          } catch {}
          return;
        }
      }
    }

    // ── BOT REPLY COOLDOWN ───────────────────
    if (isOnCooldown(userId)) return;
    setCooldown(userId);

    // ── ASK GROQ ─────────────────────────────
    const reply = await askGroq(text);
    if (!reply || reply.toUpperCase().includes("IGNORE")) return;

    await ctx.reply(reply);
  } catch (err) {
    console.error("Error handling message:", err.message);
  }
});

// ─────────────────────────────────────────────
//  WELCOME NEW MEMBERS  (auto-deletes after 60s)
// ─────────────────────────────────────────────
bot.on("new_chat_members", async (ctx) => {
  try {
    const newMembers = ctx.message.new_chat_members;

    for (const member of newMembers) {
      if (member.is_bot) continue;

      const name = member.first_name || "fren";

      // delete the Telegram "X joined the group" service message
      try {
        await ctx.deleteMessage();
      } catch {}

      // send welcome message
      const welcome = await ctx.reply(
        `🧜‍♀️ Welcome ${name}! You've just swum into the Baby Siren ocean 🌊\n\n` +
          `📝 CA: \`0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16\`\n` +
          `📈 Chart: https://dexscreener.com/bsc/0x688C077d56e4a20e0A90ED55e8Ad0Dc312A3AC16\n\n` +
          `Ask me anything about $BABYSIREN — I've got you 🌊`,
        { parse_mode: "Markdown" }
      );

      // auto-delete welcome message after 60 seconds
      setTimeout(async () => {
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, welcome.message_id);
        } catch {}
      }, 60_000);
    }
  } catch (err) {
    console.error("Welcome message error:", err.message);
  }
});

// ─────────────────────────────────────────────
//  LAUNCH
// ─────────────────────────────────────────────
bot.launch().then(() => {
  console.log("🧜‍♀️ Baby Siren bot is running...");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
