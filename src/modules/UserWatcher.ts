import EventEmitter from 'events'
import winston from 'winston'
import { twitterApiLimiter } from '../Limiter'
import { TwitterApi } from '../apis/TwitterApi'
import { TWITTER_PUBLIC_AUTHORIZATION } from '../constants/twitter.constant'
import { AudioSpaceMetadataState } from '../enums/Twitter.enum'
import { logger as baseLogger } from '../logger'
import { Util } from '../utils/Util'
import { configManager } from './ConfigManager'
import { userManager } from './UserManager'
import { TwitterSpace } from '../model/twitter-space'
import { connectDb } from '../database'

export class UserWatcher extends EventEmitter {
  private logger: winston.Logger
  private cacheSpaceIds = new Set<string>()

  constructor(public username: string) {
    super()
    this.logger = baseLogger.child({ label: `[UserWatcher@${username}]` })
  }

  private get user() {
    return userManager.getUserByUsername(this.username)
  }

  private get headers() {
    return {
      authorization: TWITTER_PUBLIC_AUTHORIZATION,
      'x-guest-token': configManager.guestToken,
    }
  }

  public watch() {
    this.logger.info('Watching...')
    this.getSpaces()
  }

  private async getSpaces() {
    if (this.user.id) {
      try {
        await configManager.getGuestToken()
        await this.getUserTweets()
      } catch (error) {
        this.logger.error(`getSpaces: ${error.message}`)
      }
    }
    setTimeout(() => this.getSpaces(), Util.getUserRefreshInterval())
  }

  private async getUserTweets() {
    this.logger.debug('--> getUserTweets')
    const data = await twitterApiLimiter.schedule(() => TwitterApi.getUserTweets(this.user.id, this.headers))
    const instructions = data?.data?.user?.result?.timeline?.timeline?.instructions || []
    const instruction = instructions.find((v) => v?.type === 'TimelineAddEntries')
    const tweets: any[] = instruction?.entries
      ?.filter((v) => v?.content?.entryType === 'TimelineTimelineItem')
      ?.map((v) => v?.content?.itemContent?.tweet_results?.result)
      ?.filter((v) => v?.card) || []
    const spaceIds: string[] = [...new Set(
      tweets
        .map((tweet) => tweet?.card?.legacy?.binding_values?.find?.((v) => v?.key === 'id')?.value?.string_value)
        .filter((v) => v),
    )]
    await this.processSpaces(spaceIds)
    this.cleanCacheSpaceIds(spaceIds)
    const meta = {}
    if (spaceIds.length) {
      Object.assign(meta, { spaceIds })
    }
    this.logger.debug('<-- getUserTweets', meta)
  }

  private async processSpaces(spaceIds: string[]) {
    for (const id of spaceIds) {
      if (!this.cacheSpaceIds.has(id)) {
        try {
          const spaceData = await this.getAudioSpaceById(id)
          if (spaceData) {
            await TwitterSpace.save(spaceData)
          }
        } catch (error) {
          this.logger.error(`processSpaces: Error processing space ${id}: ${error.message}`)
        }
        this.cacheSpaceIds.add(id)
      }
    }
  }

  private async getAudioSpaceById(id: string): Promise<TwitterSpace | null> {
    try {
      this.logger.debug('--> getAudioSpaceById', { id })
      const data = await twitterApiLimiter.schedule(() => TwitterApi.getAudioSpaceById(id, this.headers))
      const audioSpace = data.data.audioSpace
      if (audioSpace && audioSpace.metadata.state === AudioSpaceMetadataState.RUNNING) {
        return TwitterEntityUtil.buildSpaceByAudioSpace(audioSpace)
      }
      return null
    } catch (error) {
      this.logger.error(`getAudioSpaceById: ${error.message}`, { id })
      return null
    }
  }

  private cleanCacheSpaceIds(keepIds: string[]) {
    Array.from(this.cacheSpaceIds).forEach((id) => {
      if (!keepIds.includes(id)) {
        this.cacheSpaceIds.delete(id)
      }
    })
  }
}
