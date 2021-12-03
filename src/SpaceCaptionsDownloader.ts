import axios from 'axios'
import fs from 'fs'
import winston from 'winston'
import { logger as baseLogger } from './logger'

export class SpaceCaptionsDownloader {
  private readonly API_URL = 'https://prod-chatman-ancillary-ap-northeast-1.pscp.tv/chatapi/v1/history'

  private logger: winston.Logger

  private count = 0
  private cursor = ''

  constructor(
    private spaceId: string,
    private accessToken: string,
    private file?: string,
  ) {
    this.logger = baseLogger.child({ label: `[SpaceCaptionsDownloader@${spaceId}]` })
    this.file = this.file || `${Date.now()}.jsonl`
  }

  public async download() {
    try {
      this.logger.info(`Downloading captions to ${this.file}`)
      fs.writeFileSync(this.file, '')
      do {
        this.count += 1
        this.logger.info(`Downloading part ${this.count}`)
        // eslint-disable-next-line no-await-in-loop
        const history = await this.getChatHistory()
        const messages = Array.from(history.messages)
        messages.forEach((message) => {
          const payload = `${JSON.stringify(message)}\n`
          fs.appendFileSync(this.file, payload)
        })
        this.cursor = history.cursor
      } while (this.cursor)
    } catch (error) {
      this.logger.error(error.message)
    }
  }

  private async getChatHistory() {
    const { data } = await axios.post(this.API_URL, {
      room: this.spaceId,
      access_token: this.accessToken,
      cursor: this.cursor,
    })
    return data
  }
}
