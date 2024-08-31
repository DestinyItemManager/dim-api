/**
 * Hack to make 'slugify' import work with "type": "module".
 */
import slugify from 'slugify';

export default slugify as unknown as ((
  string: string,
  options?:
    | {
        replacement?: string;
        remove?: RegExp;
        lower?: boolean;
        strict?: boolean;
        locale?: string;
        trim?: boolean;
      }
    | string,
) => string) & {
  extend: (args: Record<string, any>) => void;
};
