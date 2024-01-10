import { SpaceState } from '../enums/Twitter.enum'
import { TwitterUser } from './twitter-user'
import { connectDb } from '../database' // Adjust the path as necessary

export class TwitterSpace {
  id: string
  createdAt?: number
  updatedAt?: number

  creatorId: string
  state: SpaceState
  isTicketed?: boolean
  scheduledStart?: number
  startedAt?: number
  endedAt?: number
  lang?: string
  title?: string

  hostIds?: string[]
  speakerIds?: string[]
  listenerIds?: string[]

  participantCount?: number
  totalLiveListeners?: number
  totalReplayWatched?: number

  isAvailableForReplay?: boolean
  isAvailableForClipping?: boolean

  narrowCastSpaceType?: number

  playlistUrl?: string
  playlistActive?: boolean

  creator?: TwitterUser
  hosts?: TwitterUser[]
  speakers?: TwitterUser[]
  listeners?: TwitterUser[]

  static async save(space: TwitterSpace): Promise<void> {
    const connection = await connectDb()
    await connection.beginTransaction()

    try {
      const query = `
        INSERT INTO twitter_spaces (id, createdAt, updatedAt, creatorId, state, isTicketed, scheduledStart, startedAt, endedAt, lang, title, participantCount, totalLiveListeners, totalReplayWatched, isAvailableForReplay, isAvailableForClipping, narrowCastSpaceType, playlistUrl, playlistActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          updatedAt = VALUES(updatedAt),
          state = VALUES(state),
          isTicketed = VALUES(isTicketed),
          scheduledStart = VALUES(scheduledStart),
          startedAt = VALUES(startedAt),
          endedAt = VALUES(endedAt),
          lang = VALUES(lang),
          title = VALUES(title),
          participantCount = VALUES(participantCount),
          totalLiveListeners = VALUES(totalLiveListeners),
          totalReplayWatched = VALUES(totalReplayWatched),
          isAvailableForReplay = VALUES(isAvailableForReplay),
          isAvailableForClipping = VALUES(isAvailableForClipping),
          narrowCastSpaceType = VALUES(narrowCastSpaceType),
          playlistUrl = VALUES(playlistUrl),
          playlistActive = VALUES(playlistActive)
      `
      const values = [
        space.id, space.createdAt, space.updatedAt, space.creatorId, space.state, space.isTicketed, space.scheduledStart, space.startedAt, space.endedAt, space.lang, space.title, space.participantCount, space.totalLiveListeners, space.totalReplayWatched, space.isAvailableForReplay, space.isAvailableForClipping, space.narrowCastSpaceType, space.playlistUrl, space.playlistActive
      ]
      await connection.execute(query, values)

      // Update relationships
      await this.updateSpaceRelationships(connection, space.id, 'space_hosts', space.hostIds)
      await this.updateSpaceRelationships(connection, space.id, 'space_speakers', space.speakerIds)
      await this.updateSpaceRelationships(connection, space.id, 'space_listeners', space.listenerIds)

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      await connection.end()
    }
  }

  private static async updateSpaceRelationships(connection: any, spaceId: string, tableName: string, userIds: string[]): Promise<void> {
    await connection.execute(`DELETE FROM ${tableName} WHERE space_id = ?`, [spaceId])
    for (const userId of userIds) {
      await connection.execute(`INSERT INTO ${tableName} (space_id, user_id) VALUES (?, ?)`, [spaceId, userId])
    }
  }
}
