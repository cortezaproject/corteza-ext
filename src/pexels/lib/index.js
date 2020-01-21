// Require Wrapper Library
import PexelsAPI from 'pexels-api-wrapper'

export default class PexelsClient {
  constructor (apiKey) {
    if (!apiKey) {
      throw new Error('Invalid API key')
    } else {
      this.api = new PexelsAPI(apiKey)
    }
  }

  /**
   * Convert photo to internal form
   * @param {String} id of the photo
   * @param {String} ulr to the photo on Pexels
   * @param {String} photographer that uploaded the photo
   * @param {Object} src links to photo in different sizes
   * @returns {Object} image object in internal form
   */
  convert ({ id, url, photographer, src }) {
    return {
      id,
      preview: {
        original: src.original,
        regular: src.medium,
        large: src.large,
        thumbnail: src.tiny,
      },
      // Author name and a link to the photo - used for credits
      author: {
        name: photographer,
        url: url,
      },
      origin: 'Pexels',
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
    return this.api.search(query, perPage, page)
      .then(({ photos }) => {
        return photos.map(this.convert)
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
    return this.api.getPhoto(photoID)
      .then(this.convert)
  }
}
