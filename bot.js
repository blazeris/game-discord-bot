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

// load login details for global usage
client.dbLogin = require('./oracledb.json');
client.debugMode = true;
client.enabledModules = ['distube', 'riot', 'tiktok'];


// =============================================================
// DYNAMIC CUSTOM MODULE HANDLING
// =============================================================
// get paths of all modules that are enabled
const modulePath = path.join(__dirname, 'bot_modules');
let modules = [];
for(let moduleName of fs.readdirSync(modulePath)){
  if(client.enabledModules.includes(moduleName)){
    modules.push(path.join(modulePath, moduleName));
  }
}

// =============================================================
// DYNAMIC COMMAND HANDLING
// =============================================================
client.commands = new Discord.Collection();

// full paths of default available commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
var commandsFullPaths = commandFiles.map((file) => path.join(commandsPath, file));

// full paths of module specific commands
for(let moduleFullPath of modules){
  let moduleCommandsPath = path.join(moduleFullPath, 'commands');
  let moduleCommandFiles = fs.readdirSync(moduleCommandsPath).filter(file => file.endsWith('.js'));
  commandsFullPaths = commandsFullPaths.concat(moduleCommandFiles.map((file) => path.join(moduleCommandsPath, file)));
}

// loading all commands
for (const filePath of commandsFullPaths) {
	let command = require(filePath);
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	}
}
if(client.debugMode)
  console.log(client.commands.map((command) => command.data.name));

// =============================================================
// BOT OPERATION
// =============================================================
oracleQuery(`SELECT * FROM api_keys`).then(res => {
  // load api keys from database
  client.apiKeys = {};
  for(let apiKey of res.rows){
    client.apiKeys[apiKey[0]] = apiKey[1];
  }

  console.log("Global config loaded.");
  logDebug(client, 'Auth: ' + client.apiKeys['discord']);

  // Completely loads the modules
  for(let modulePath of modules){
    let moduleFullPath = path.join(modulePath, 'module.js');
    let module = require(moduleFullPath);
    module.load(client);
  }
  logDebug(client, 'Loaded modules: ' + client.enabledModules);

  // READY
  client.on("ready", () => {
    log('Bot connected!');
    client.user.setPresence({
      activities: [{name: 'Doing a little trolling'}],
      status: 'online'
    });
  });


  // =============================================================
  // COMMAND EXECUTION
  // =============================================================
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
    if(message.author.bot)
      return;

    //halloween tricks
    let halloweenTrickChance = 0.05;
    if(Math.random() < halloweenTrickChance){
      logDebug(client, `Deleted message by ${message.author.username}: ${message.content}`);
      return message.delete();
    }
    if(Math.random() < halloweenTrickChance){
      logDebug(client, `Sent gorilla to ${message.author.username}`);
      message.author.send('https://media.tenor.com/nYo6kovOGrMAAAAC/gorilla-shower.gif').catch(console.error);
    }
    else if(Math.random() < halloweenTrickChance){
      message.member.timeout(30 * 1000, 'Halloween tricked')
      .then(logDebug(client, `Timed out ${message.author.username}`))
      .catch(console.error);
    }
    else if(Math.random() < halloweenTrickChance){
      let nickname = message.member.nickname;
      if(message.member.nickname != 'Big Fool'){
        message.member.setNickname('Big Fool', 'Halloween tricked').then(member => {
          logDebug(client, `Changed the nickname of ${member.user.username}`);
          setTimeout(() => {member.setNickname(nickname, 'Return to orignal from trick').catch(console.error)}, 1000 * 60);
        })
        .catch(console.error);
      }
    }
  });

  // BOT LOGIN
  try {
    client.login(client.apiKeys['discord']);
  } catch (error) {
    console.log(error);
  }
});