import * as core from '@actions/core'
import { glob } from 'glob'
import * as fs from 'node:fs'
import * as path from 'node:path'
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
    const patterns = core.getMultilineInput('files')

    // Resolve glob patterns into actual file paths
    const filePaths = (
      await Promise.all(
        patterns.map((pattern) => glob(pattern, { nodir: true }))
      )
    ).flat()

    if (filePaths.length === 0) {
      core.warning('No files matched the provided patterns.')
      return
    }

    // Build media group
    const media = filePaths.map((filePath) => {
      const fileBuffer = fs.readFileSync(filePath)
      const fileName = path.basename(filePath)

      return {
        type: 'document' as const,
        file: fileBuffer,
        fileName
      }
    })

    await tg.sendMediaGroup(chatId, media)

    core.info(`Sent ${media.length} files.`)

    tg.logOut()
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
