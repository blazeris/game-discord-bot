/*
Discord bot created for funsies.
https://discord.com/oauth2/authorize?client_id=617027534042693664&scope=bot
*/

// =============================================================
// EXTERNAL FILES
// =============================================================
const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");
const {log, logDebug} = require('./utils/log');
const {oracleQuery} = require('./utils/oracle');

// =============================================================
// CLIENT INITIALIZATION
// =============================================================
const client = new Discord.Client({
  intents:[
    Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMessages,
		Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildVoiceStates
]
});

client.commands = new Discord.Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
    if(client.debugMode)
      console.log(client.commands);
	}
}

// =============================================================
// BOT OPERATION
// =============================================================

// INITIALIZE DATABASE
console.log("Database intialized.");

oracleQuery(`SELECT * FROM api_keys`).then(res => {
  // load api keys from database
  client.apiKeys = {};
  for(let apiKey of res.rows){
    client.apiKeys[apiKey[0]] = apiKey[1];
  }
  
  client.debugMode = true;
  client.enabledModules = [];
  client.messageListeners = [];

  console.log("Global config loaded.");
  logDebug(client, 'Auth: ' + client.apiKeys['discord']);

  // READY
  client.on("ready", () => {
    log('Bot connected!');
    client.user.setPresence({
      activities: [{name: 'Doing a little trolling'}],
      status: 'online'
    });

    // DISTUBE MODULE
    //const distubeModule = require("./bot_modules/distube_module.js");
    //distubeModule.load(client, distubeConfig);

    // TikTok Embed MODULE
    const tiktokModule = require("./bot_modules/tiktok_module.js");
    tiktokModule.load(client);

    // RIOT tracker module
    //const riotModule = require("./bot_modules/riot/riot_module.js");
    //riotModule.load(client);

    logDebug(client, "Modules loaded: " + client.enabledModules.toString());
  });


  // COMMAND HANDLER
  client.on(Discord.Events.InteractionCreate, async interaction => {
    // read the message
    if (!interaction.isChatInputCommand())
      return;

    
    // check for existing command
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
  
    // try executing command
    try {
      let commandString = interaction.commandName;
      if(interaction.options.getSubcommand(false) != null)
        commandString += " " + interaction.options.getSubcommand();
      if(interaction.options.data.length){
        for(index in interaction.options.data[0].options){
          let option = interaction.options.data[0].options[index];
          commandString += ` ${option.name}:${option.value}`;
        }
      }
      logDebug(client, `EXECUTING COMMAND: ${interaction.user.username} => ${commandString}`);
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
    }
  });

  // MESSAGE CONTENT READER
  client.on(Discord.Events.MessageCreate, async message => {  
    for(key in client.messageListeners){
      client.messageListeners[key](message);
    }
  });

  // BOT LOGIN
  try {
    client.login(client.apiKeys['discord']);
  } catch (error) {
    console.log(error);
  }
});