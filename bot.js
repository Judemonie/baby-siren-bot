const { Telegraf } = require("telegraf");
const Groq = require("groq-sdk");

// ─────────────────────────────────────────────
//  CONFIG  (set these as environment variables)
// ─────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN environment variable");
if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY environment variable");

const bot = new Telegraf(BOT_TOKEN);
const groq = new Groq({ apiKey: GROQ_API_KEY });

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
//  RATE LIMITING  (prevent spam / API abuse)
// ─────────────────────────────────────────────
const cooldowns = new Map();
const COOLDOWN_MS = 3000; // 3 seconds per user

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

    // ignore empty or very short messages
    if (!text || text.length < 3) return;

    // ignore bot commands other than /start
    if (text.startsWith("/")) return;

    // rate limit check
    if (isOnCooldown(userId)) return;
    setCooldown(userId);

    // ask Groq
    const reply = await askGroq(text);

    // if Groq says ignore, stay silent
    if (!reply || reply.toUpperCase().includes("IGNORE")) return;

    await ctx.reply(reply);
  } catch (err) {
    console.error("Error handling message:", err.message);
    // stay silent on errors — don't spam the group with error messages
  }
});

// ─────────────────────────────────────────────
//  LAUNCH
// ─────────────────────────────────────────────
bot.launch().then(() => {
  console.log("🧜‍♀️ Baby Siren bot is running...");
});

// graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
