import * as core from '@actions/core'
import { glob } from 'glob'
import * as path from 'node:path'
import { InputMediaDocument, MemoryStorage, TelegramClient } from '@mtcute/node'
import { NodeCryptoProvider } from '@mtcute/node/utils.js'
import { initSync, SIMD_AVAILABLE } from '@mtcute/wasm'
import mtcuteWasm from '@mtcute/wasm/mtcute.wasm'
import mtcuteWasmSimd from '@mtcute/wasm/mtcute-simd.wasm'

class ActionsCryptoProvider extends NodeCryptoProvider {
  async initialize() {
    initSync(SIMD_AVAILABLE ? await mtcuteWasmSimd() : await mtcuteWasm())
  }
}

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
      storage: new MemoryStorage(),
      crypto: new ActionsCryptoProvider()
    })

    const user = await tg.start({ botToken: botToken })

    core.debug(`Logged in as ${user.username} (${user.id})`)

    const chatId: string = core.getInput('chat-id')
    const patterns = core.getMultilineInput('files')

    // Resolve glob patterns into actual file paths
    const filePaths = (
      await Promise.all(
        patterns.map((pattern) =>
          glob(pattern, { nodir: true, absolute: true })
        )
      )
    )
      .flat()
      .sort((a, b) =>
        path.basename(a).localeCompare(path.basename(b), undefined, {
          numeric: true
        })
      )

    if (filePaths.length === 0) {
      core.warning('No files matched the provided patterns.')
      return
    }

    // Build media group
    const media = filePaths.map((filePath) => {
      const fileName = path.basename(filePath)

      return {
        type: 'document' as const,
        file: 'file:' + filePath,
        fileName
      } as InputMediaDocument
    })

    await tg.sendMediaGroup(chatId, media, {
      progressCallback(index, uploaded, total) {
        core.info(
          `Uploading file ${index + 1}/${media.length}: ${uploaded}/${total} bytes uploaded.`
        )
      }
    })

    core.info(`Sent ${media.length} files.`)

    try {
      await tg.logOut()
      await tg.destroy()
    } catch (error) {
      core.warning(
        `Error during logout/destroy: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
