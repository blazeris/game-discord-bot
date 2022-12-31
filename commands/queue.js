const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('see the music queue'),
	async execute(interaction) {
		const embed = new EmbedBuilder()
            .setColor(0xa8a8a8)
            .setTitle("No music :(")

        let songsInQueue = 0;
        let queue = interaction.client.distube.getQueue(interaction.guildId);
        if(queue) {
            songsInQueue = queue.songs.length;
            if(songsInQueue > 0){
                embed.setTitle(queue.songs[0].name)
                    .setAuthor({name: 'Now playing...'})
                    .setDescription(`Author: ${queue.songs[0].uploader.name}\t\t\tDuration: ${new Date(queue.songs[0].duration * 1000).toISOString().slice(11, 19)}s`)
                    .setURL(queue.songs[0].url)
                    .setThumbnail(queue.songs[0].thumbnail);
                for(let i = 1; i < songsInQueue; i++){
                    embed.addFields({name: queue.songs[i].name, 
                                    value: `Author: ${queue.songs[i].uploader.name}\t\t\tDuration: ${new Date(queue.songs[i].duration * 1000).toISOString().slice(11, 19)}`});
                }
            }
        }
            
        embed.setFooter({text:`Songs in queue: ${songsInQueue}`});

        interaction.channel.send({embeds: [embed]});
	},
};

