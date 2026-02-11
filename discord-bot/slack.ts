import { IncomingWebhook } from '@slack/webhook'
import dotenv from 'dotenv';

dotenv.config()

// Read a url from the environment variables
const url = process.env.SLACK_USER_ACTION_WEBHOOK_URL

// Initialize
export const userActionWebhook = new IncomingWebhook(url);

// Send the notification
export const sendMessage = async (webhook, text) => {
  await webhook.send({
    text,
  })
}