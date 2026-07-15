/**
 * PURPOSE: Serialize admin client exports for Excel-compatible CSV downloads.
 * SECURITY: Neutralizes formula-leading cells before RFC-style CSV escaping.
 * INPUT: Plain client row objects containing CLIENT_EXPORT_FIELDS.
 * OUTPUT: UTF-8 CSV text with a BOM and CRLF row separators.
 * SIDE EFFECTS: None.
 * FAILURE MODE: Values are stringified; nullish values become empty cells.
 */

export const CLIENT_EXPORT_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'email',
  'phone',
  'clientSource',
  'sessionBillingMode',
  'availableSessions',
  'fitnessGoal',
  'isActive',
  'createdAt',
  'updatedAt',
];

const SPREADSHEET_FORMULA_PREFIX = /^\s*[=+\-@]/u;
const CSV_META_CHARACTERS = /[",\n\r]/;
const UTF8_BOM = '\uFEFF';

const neutralizeSpreadsheetFormula = (text) =>
  SPREADSHEET_FORMULA_PREFIX.test(text) ? `'${text}` : text;

export const escapeCsvValue = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  const formulaSafeText = neutralizeSpreadsheetFormula(text);

  return CSV_META_CHARACTERS.test(formulaSafeText)
    ? `"${formulaSafeText.replace(/"/g, '""')}"`
    : formulaSafeText;
};

export const serializeClientsToCsv = (rows) => {
  const csvRows = [
    CLIENT_EXPORT_FIELDS.join(','),
    ...rows.map((row) => (
      CLIENT_EXPORT_FIELDS
        .map((field) => escapeCsvValue(row[field]))
        .join(',')
    )),
  ];

  return `${UTF8_BOM}${csvRows.join('\r\n')}`;
};
