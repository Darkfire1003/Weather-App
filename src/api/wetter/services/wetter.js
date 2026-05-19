'use strict';

/**
 * wetter service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::wetter.wetter');
