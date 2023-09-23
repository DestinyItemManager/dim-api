/**
 * Hack to make 'slugify' import work with "type": "module".
 */
import slugify from 'slugify';

export default slugify as unknown as typeof slugify.default;
