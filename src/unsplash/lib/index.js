// Require Wrapper Library
import Unsplash, { toJson } from 'unsplash-js'
// Wrapper uses fetch
import fetch from 'node-fetch'
global.fetch = fetch

export default class UnsplashClient {
  constructor (accessKey, secret) {
    if (!accessKey) {
      throw new Error('Invalid API access key')
    } else if (!secret) {
      throw new Error('Invalid API secret')
    } else {
      this.api = new Unsplash({
        accessKey,
        secret,
        timeout: 500,
      })
    }
  }

  /**
   * Convert photo to internal form
   * @param {String} id ID of the photo
   * @param {Object} ulrs tied to the photo
   * @param {Object} user that uploaded the photo
   * @returns {Object} image object in internal form
   */
  convert ({ id, urls, user }) {
    return {
      id,
      preview: {
        original: urls.raw,
        regular: urls.regular,
        large: urls.full,
        thumbnail: urls.thumb,
      },
      // Author name and a link to the profile - used for credits
      author: {
        name: user.name,
        url: user.links.html,
      },
      origin: 'Unsplash',
    }
  }

  /**
   * Search API for photos
   * @param {String} query Search term
   * @param {Number} perPage Specifies the number of items per page (Defaults to 10)
   * @param {Number} page Specifies the page being requested (Defaults to 1)
   * @returns {Promise}
   */
  async search ({ query = '', perPage = 10, page = 1 }) {
    if (!query) {
      throw new Error('Parameter query is empty')
    }
    return this.api.search.photos(query, page, perPage)
      .then(toJson)
      .then(({ results }) => {
        return results.map(this.convert)
      })
  }

  /**
   * Get photo by ID
   * @param {String} photoID ID of the required photo
   * @returns {Promise}
   */
  async getPhotoByID (photoID) {
    if (!photoID) {
      throw new Error('Parameter photoID is empty')
    }
    return this.api.photos.getPhoto(photoID)
      .then(toJson)
      .then(this.convert)
  }
}
