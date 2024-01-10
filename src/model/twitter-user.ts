import { connectDb } from '../database' // Adjust the path as necessary

export class TwitterUser {
  id: string
  createdAt?: number
  updatedAt?: number

  username: string
  name?: string
  protected?: boolean
  verified?: boolean
  verifiedType?: string
  location?: string
  description?: string
  profileImageUrl?: string
  profileBannerUrl?: string

  static async save(user: TwitterUser): Promise<void> {
    const connection = await connectDb()
    try {
      const query = `
        INSERT INTO twitter_users (id, createdAt, updatedAt, username, name, protected, verified, verifiedType, location, description, profileImageUrl, profileBannerUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          updatedAt = VALUES(updatedAt),
          name = VALUES(name),
          protected = VALUES(protected),
          verified = VALUES(verified),
          verifiedType = VALUES(verifiedType),
          location = VALUES(location),
          description = VALUES(description),
          profileImageUrl = VALUES(profileImageUrl),
          profileBannerUrl = VALUES(profileBannerUrl)
      `
      const values = [
        user.id, user.createdAt, user.updatedAt, user.username, user.name, user.protected, user.verified, user.verifiedType, user.location, user.description, user.profileImageUrl, user.profileBannerUrl
      ]
      await connection.execute(query, values)
    } catch (error) {
      throw error
    } finally {
      await connection.end()
    }
  }
}
