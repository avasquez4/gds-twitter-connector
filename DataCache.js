/**
 * Constructor for DataCache.
 * More info on caching: https://developers.google.com/apps-script/reference/cache/cache
 *
 * @param {object} cacheService - GDS caching service
 * @param {Date} startDate - beggining of GDS request interval
 * @param {Date} endDate - end of GDS request interval
 *
 * @return {object} DataCache.
 */
function DataCache(cacheService, startDate, endDate) {
  this.service = cacheService;
  this.cacheKey = this.buildCacheKey(startDate, endDate);

  return this;
}

/** @const - 6 hours, Google's max */
DataCache.REQUEST_CACHING_TIME = 21600;

/**
 * Builds a cache key for given GDS request
 *
 * @return {String} cache key
 */
DataCache.prototype.buildCacheKey = function(startDate, endDate) {
  return startDate + '_' + endDate;
};

/**
 * Gets stored value
 *
 * @return {String}
 */
DataCache.prototype.get = function() {
  return  this.service.get(this.cacheKey);
};

/**
 * Stores value in cache.
 *
 * @param {String} key - cache key
 * @param {String} value
 */
DataCache.prototype.set = function(value) {
  this.service.put(this.cacheKey, value);
};