import * as core from '@actions/core'
import { TelegramClient } from '@mtcute/node'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const apiId: string = core.getInput('api-id')
    const apiHash: string = core.getInput('api-hash')
    const botToken: string = core.getInput('bot-token')
    const tg = new TelegramClient({
      apiId: parseInt(apiId, 10),
      apiHash: apiHash,
      storage: 'bot-data/session'
    })

    const user = await tg.start({ botToken: botToken })

    core.debug(`Logged in as ${user.username} (${user.id})`)

    const chatId: string = core.getInput('chat-id')
    const files = core.getMultilineInput('files')

    await tg.sendMediaGroup(chatId, files)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
