const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription('shuffle current queue'),
	async execute(interaction) {
        let queue = interaction.client.distube.getQueue(interaction.guildId);
        if( !queue ||
            queue.songs.length <= 0)
                return interaction.channel.send("You'd need a song playing to shuffle.");
        queue.shuffle();
        interaction.channel.send("Shuffled the queue.");
	},
};

