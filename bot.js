const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const Groq = require('groq-sdk');

// ========== AYARLAR ==========
const CONFIG = {
  host: 'wafflesonne.com',     // Serverin IP-si
  port: 25565,                  // Port (default 25565)
  username: 'models',           // Botun adı
  version: '1.20.1',
  owner: 'VenomSlicer',         // Sənin oyun adın
  groqApiKey: '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' // Yeni Groq key-i bura
};
// ==============================

const groq = new Groq({ apiKey: CONFIG.groqApiKey });

let mode = 'afk'; // afk | follow | stay
let stayPosition = null;

const bot = mineflayer.createBot({
  host: CONFIG.host,
  port: CONFIG.port,
  username: CONFIG.username,
  version: CONFIG.version
});

bot.loadPlugin(pathfinder);

bot.once('spawn', () => {
  console.log('Bot qoşuldu!');
  const defaultMove = new Movements(bot);
  bot.pathfinder.setMovements(defaultMove);
});

// ========== MESAJ SİSTEMİ ==========
bot.on('chat', async (username, message) => {
  if (username === bot.username) return;

  const msg = message.toLowerCase().trim();

  // Yalnız owner komanda verə bilər
  if (username === CONFIG.owner) {
    
    // DAL İMCA GƏL
    if (msg === 'dalımca gəl' || msg === 'dalimca gel' || msg === 'follow') {
      mode = 'follow';
      bot.chat('Dalınca gəlirəm! 🏃');
      followOwner();
      return;
    }

    // BURDA DUR
    if (msg === 'burda dur' || msg === 'burda dayan' || msg === 'stay') {
      mode = 'stay';
      stayPosition = bot.entity.position.clone();
      bot.pathfinder.stop();
      bot.chat('Burada dururam! ✋');
      return;
    }

    // YANIMA GƏL
    if (msg === 'yanıma gəl' || msg === 'yanima gel' || msg === 'come') {
      const owner = bot.players[CONFIG.owner];
      if (owner && owner.entity) {
        mode = 'follow';
        bot.chat('Yanına gəlirəm! 🏃');
        followOwner();
      } else {
        // TP at
        bot.chat('/tpa ' + CONFIG.owner);
        bot.chat('Uzaqdayam, TP atdım! 📍');
      }
      return;
    }

    // AFK MOD
    if (msg === 'afk' || msg === 'dur') {
      mode = 'afk';
      bot.pathfinder.stop();
      bot.chat('AFK moduna keçdim! 💤');
      return;
    }
  }

  // AI cavab - hamıya cavab verir (owner da daxil)
  if (username !== bot.username) {
    try {
      const response = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `Sən Minecraft-da bir botsun. Adın ${CONFIG.username}. Sahibin ${CONFIG.owner}-dir. Qısa, casual Azərbaycan dilində cavab ver. Minecraft oyunçusu kimi danış.`
          },
          {
            role: 'user',
            content: `${username} dedi: ${message}`
          }
        ],
        max_tokens: 100
      });
      
      const reply = response.choices[0]?.message?.content?.trim();
      if (reply) {
        bot.chat(reply);
      }
    } catch (err) {
      console.log('AI xətası:', err.message);
    }
  }
});

// ========== FOLLOW FUNKSİYASI ==========
function followOwner() {
  const followInterval = setInterval(() => {
    if (mode !== 'follow') {
      clearInterval(followInterval);
      return;
    }

    const owner = bot.players[CONFIG.owner];
    if (!owner || !owner.entity) {
      // Owner görünmür, TP at
      bot.chat('/tpa ' + CONFIG.owner);
      clearInterval(followInterval);
      return;
    }

    const { GoalFollow } = goals;
    bot.pathfinder.setGoal(new GoalFollow(owner.entity, 2), true);
  }, 1000);
}

// ========== STAY - Pozisiyona qayıt ==========
setInterval(() => {
  if (mode === 'stay' && stayPosition) {
    const pos = bot.entity.position;
    const dist = pos.distanceTo(stayPosition);
    if (dist > 3) {
      const { GoalBlock } = goals;
      bot.pathfinder.setGoal(
        new GoalBlock(stayPosition.x, stayPosition.y, stayPosition.z)
      );
    }
  }
}, 2000);

// ========== TP QƏBUL ET ==========
bot.on('chat', (username, message) => {
  if (message.includes('has requested') || message.includes('teleport')) {
    setTimeout(() => bot.chat('/tpaccept'), 500);
  }
});

// Bəzi serverlərdə ayrı format
bot.on('message', (jsonMsg) => {
  const text = jsonMsg.toString();
  if (text.includes('tpa') && text.includes(CONFIG.owner)) {
    setTimeout(() => bot.chat('/tpaccept'), 500);
  }
});

// ========== RECONNECT ==========
bot.on('end', () => {
  console.log('Bağlantı kəsildi, 5 saniyə sonra yenidən qoşulur...');
  setTimeout(() => {
    require('./bot.js'); // Yenidən başlat
  }, 5000);
});

bot.on('error', (err) => {
  console.log('Xəta:', err.message);
});

console.log('Bot başladı...');
