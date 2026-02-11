// Require the necessary discord.js classes
import { ButtonStyle, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalBuilder, ButtonBuilder, Client, Events, GatewayIntentBits } from 'discord.js'
import dotenv from 'dotenv';
import keccak256 from 'keccak256'
import { sendMessage, userActionWebhook } from './slack';

dotenv.config()

// Create a new client instance
const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.MessageContent,
] });

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, (c: any) => {
	console.log(`Ready! Logged in as ${c.user.tag}`);

  // Replace 'YOUR_CHANNEL_ID' with the actual channel ID
  const channelId = process.env.CHANNEL_ID

  const channel = client.channels.cache.get(channelId)

  const confirm = new ButtonBuilder()
    .setCustomId('faucet-claim')
    .setLabel('Claim')
    .setStyle(ButtonStyle.Primary)

  const row: any = new ActionRowBuilder()
	  .addComponents(confirm);

  if (channel && channel.isTextBased()) {
    channel.send({ 
      content: `>>> Claim Testnet Token
You can receive Testnet Tokens once a week:
ETH: 0.05
USDC: 60,000
WETH: 30
WBTC: 2
      `, 
      components: [row] 
    })
  }
})

client.on('interactionCreate', async (interaction: any) => {
  try {
    if (interaction && !interaction.customId) return
    
    const userId = interaction && interaction?.member?.user?.id
    const username = interaction && interaction?.member?.user?.displayName
  
    const { customId } = interaction;
  
    if (customId === 'faucet-claim') {
      // Handle the button click event here
  
      const modal: any = new ModalBuilder()
        .setCustomId('wallet-address-modal')
        .setTitle('Faucet')
  
      // Create the text input components
      const walletAddressInput = new TextInputBuilder()
        .setCustomId('wallet-address')
        .setLabel("Wallet Address")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Wallet address")
        .setMinLength(40 + 2)
        .setMaxLength(40 + 2)
        .setRequired(true)
  
      const firstActionRow: any = new ActionRowBuilder().addComponents(walletAddressInput);
  
      modal.addComponents(firstActionRow);
      
      // Show the modal to the user
      await interaction.showModal(modal)
    }

    if (customId == 'wallet-address-modal') {
      await interaction.deferReply({ ephemeral: true })

      const walletAddress = interaction.fields.getTextInputValue('wallet-address')

      const userIdHash = "0x" + keccak256(userId).toString('hex')

      const result = await fetch(`${process.env.FAUCET_API_URL}?address=${walletAddress}&userIdHash=${userIdHash}`).then((res) => res.json())

      const tx = result?.tx

      if (tx && tx.status) {
        await interaction.editReply({ 
          content: `
:point_right: It’s time to trade on Moby Testnet!
(https://testnet.app.moby.trade/)

:point_right: for smol Whale - MOBR3 Trading Guide
(https://medium.com/p/c8b5071ccb04)
          `, ephemeral: true 
        })

        await sendMessage(userActionWebhook, `:ivan-happy: User ${username} (${userId}) (userIdHash: ${userIdHash}), address ${walletAddress} claimed Testnet Tokens! ${tx?.hash}`)
      } else {

        const nextFaucetAvailableTimestamp = Number(await fetch(`${process.env.FAUCET_LEFT_TIMEAPI_URL}?method=getNextFaucetAvailableTime&address=${walletAddress}&userIdHash=${userIdHash}`).then((res) => res.json()))

        console.log(process.env.FAUCET_LEFT_TIMEAPI_URL, 'process.env.FAUCET_LEFT_TIMEAPI_URL')
        console.log(walletAddress, 'walletAddress')
        console.log(userIdHash, 'userIdHash')

        console.log(nextFaucetAvailableTimestamp, 'nextFaucetAvailableTimestamp')

        const year = new Date(nextFaucetAvailableTimestamp).getFullYear()
        const month = String(new Date(nextFaucetAvailableTimestamp).getMonth() + 1).padStart(2, '0')
        const day = String(new Date(nextFaucetAvailableTimestamp).getDate()).padStart(2, '0')
        const hh = String(new Date(nextFaucetAvailableTimestamp).getHours()).padStart(2, '0')
        const mm = String(new Date(nextFaucetAvailableTimestamp).getMinutes()).padStart(2, '0')
        const ss = String(new Date(nextFaucetAvailableTimestamp).getSeconds()).padStart(2, '0')

        const dateString = `${year}.${month}.${day} (${hh}:${mm}) (UTC+0)`

        await sendMessage(userActionWebhook, `:heo_ala: User ${username} (${userId}) You have failed to claim Testnet tokens. Testnet tokens are re-claimable after one week since your latest claim date. Please try claiming more after ${dateString}`)

        await interaction.editReply({ 
          content: `You have failed to claim Testnet tokens. Testnet tokens are re-claimable after one week since your latest claim date. Please try claiming more after ${dateString}`, 
          ephemeral: true 
        })
      }
    }
  } catch (e) {
    console.log(e, '*e**')
  }
})

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);