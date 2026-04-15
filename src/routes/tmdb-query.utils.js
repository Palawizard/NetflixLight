const { createApiError } = require("../utils/api-error");

/**
 * parses an optional page query param - throws 400 if present but out of the 1-500 range
 */
function parseTmdbPage(pageValue) {
  if (pageValue === undefined) {
    return undefined;
  }

  const parsedPage = Number.parseInt(pageValue, 10);

  if (!Number.isInteger(parsedPage) || parsedPage <= 0 || parsedPage > 500) {
    throw createApiError(
      400,
      "INVALID_PAGE",
      "page must be an integer between 1 and 500"
    );
  }

  return parsedPage;
}

/**
 * parses an optional string query param - returns undefined if absent, throws 400 if present but empty
 */
function parseOptionalTmdbString(queryValue, fieldName) {
  if (queryValue === undefined) {
    return undefined;
  }

  if (typeof queryValue !== "string") {
    throw createApiError(
      400,
      "INVALID_QUERY_PARAM",
      `${fieldName} must be a string`
    );
  }

  const trimmedValue = queryValue.trim();

  if (!trimmedValue) {
    throw createApiError(
      400,
      "INVALID_QUERY_PARAM",
      `${fieldName} cannot be empty`
    );
  }

  return trimmedValue;
}

/**
 * parses a required string query param - throws 400 if absent or empty
 */
function parseRequiredTmdbString(queryValue, fieldName) {
  if (typeof queryValue !== "string") {
    throw createApiError(
      400,
      "MISSING_QUERY_PARAM",
      `${fieldName} is required`
    );
  }

  const trimmedValue = queryValue.trim();

  if (!trimmedValue) {
    throw createApiError(
      400,
      "INVALID_QUERY_PARAM",
      `${fieldName} cannot be empty`
    );
  }

  return trimmedValue;
}

/**
 * parses a required positive integer query param - throws 400 if absent, non-numeric, or <= 0
 */
function parseRequiredPositiveInt(queryValue, fieldName) {
  const asString = parseRequiredTmdbString(queryValue, fieldName);
  const parsedValue = Number.parseInt(asString, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw createApiError(
      400,
      "INVALID_QUERY_PARAM",
      `${fieldName} must be a positive integer`
    );
  }

  return parsedValue;
}

module.exports = {
  parseTmdbPage,
  parseOptionalTmdbString,
  parseRequiredTmdbString,
  parseRequiredPositiveInt,
};
